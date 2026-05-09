// Optional cloud sync layer.
//
// Local storage is the source of truth. This module pushes the local journal
// to Supabase after every save and pulls remote rows on app init / login,
// merging by `pickNewerByUpdatedAt`. If Supabase is not configured or the
// user is signed out, every helper here is a silent no-op.

import { getSupabase, isSyncConfigured } from './supabaseClient';
import {
  loadJournalData,
  saveJournalData,
  subscribeStorage,
} from './storage';
import type {
  CoursePack,
  CourseSource,
  FinalSynthesis,
  FurtherExplorationArea,
  JournalData,
  JournalEntry,
  PublishedJournal,
  ReviewCard,
} from '../schemas/types';

type SyncStatus =
  | { kind: 'disabled' }
  | { kind: 'signed-out' }
  | { kind: 'idle'; lastSyncAt: Date | null }
  | { kind: 'syncing' }
  | { kind: 'error'; message: string };

type Listener = (status: SyncStatus) => void;
const listeners = new Set<Listener>();
let currentStatus: SyncStatus = isSyncConfigured()
  ? { kind: 'signed-out' }
  : { kind: 'disabled' };

function emit(next: SyncStatus) {
  currentStatus = next;
  listeners.forEach((l) => {
    try {
      l(next);
    } catch (err) {
      console.error('sync listener threw:', err);
    }
  });
}

export function subscribeSync(l: Listener): () => void {
  listeners.add(l);
  l(currentStatus);
  return () => listeners.delete(l);
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function pickNewer<T extends { id: string; updatedAt?: string }>(a: T, b: T): T {
  const aMs = a.updatedAt ? Date.parse(a.updatedAt) : 0;
  const bMs = b.updatedAt ? Date.parse(b.updatedAt) : 0;
  return aMs >= bMs ? a : b;
}

function mergeById<T extends { id: string; updatedAt?: string }>(
  local: T[],
  remote: T[],
): T[] {
  const map = new Map<string, T>();
  local.forEach((row) => map.set(row.id, row));
  remote.forEach((row) => {
    const existing = map.get(row.id);
    map.set(row.id, existing ? pickNewer(row, existing) : row);
  });
  return Array.from(map.values());
}

type RemoteRow<T> = {
  id: string;
  data: T;
  updated_at: string;
  deleted: boolean;
};

async function pullTable<T extends { id: string }>(
  table: string,
): Promise<T[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from(table)
    .select('id, data, updated_at, deleted')
    .eq('deleted', false);
  if (error) throw error;
  return ((data ?? []) as RemoteRow<T>[]).map((r) => r.data);
}

async function pushTable<T extends { id: string; courseId?: string; updatedAt?: string }>(
  table: string,
  rows: T[],
): Promise<void> {
  const sb = getSupabase();
  if (!sb || rows.length === 0) return;
  const session = (await sb.auth.getSession()).data.session;
  if (!session) return;

  const payload = rows.map((row) => ({
    id: row.id,
    owner_id: session.user.id,
    course_id: (row as { courseId?: string }).courseId ?? '',
    data: row,
    client_updated_at: row.updatedAt ?? new Date().toISOString(),
    deleted: false,
  }));
  const { error } = await sb.from(table).upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

async function pushCoursePacks(packs: CoursePack[]): Promise<void> {
  const sb = getSupabase();
  if (!sb || packs.length === 0) return;
  const session = (await sb.auth.getSession()).data.session;
  if (!session) return;
  const payload = packs.map((pack) => ({
    id: pack.id,
    owner_id: session.user.id,
    data: pack,
    client_updated_at: new Date().toISOString(),
    deleted: false,
  }));
  const { error } = await sb.from('course_packs').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export async function pullFromCloud(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const session = (await sb.auth.getSession()).data.session;
  if (!session) {
    emit({ kind: 'signed-out' });
    return;
  }

  emit({ kind: 'syncing' });
  try {
    const [
      remoteEntries,
      remoteSources,
      remoteExploration,
      remoteReview,
      remoteSyntheses,
      remotePacksRows,
    ] = await Promise.all([
      pullTable<JournalEntry>('entries'),
      pullTable<CourseSource>('sources'),
      pullTable<FurtherExplorationArea>('exploration_areas'),
      pullTable<ReviewCard>('review_cards'),
      pullTable<FinalSynthesis>('syntheses'),
      sb
        .from('course_packs')
        .select('id, data, updated_at, deleted')
        .eq('deleted', false),
    ]);

    if (remotePacksRows.error) throw remotePacksRows.error;
    const remotePacks: CoursePack[] = ((remotePacksRows.data ?? []) as RemoteRow<CoursePack>[]).map(
      (r) => r.data,
    );

    const local = loadJournalData();
    const next: JournalData = {
      ...local,
      entries: mergeById(local.entries, remoteEntries),
      sources: mergeById(local.sources, remoteSources),
      furtherExplorationAreas: mergeById(local.furtherExplorationAreas, remoteExploration),
      // ReviewCard has no updatedAt; remote rows simply replace by id.
      reviewCards: mergeByIdSimple(local.reviewCards, remoteReview),
      syntheses: mergeById(local.syntheses, remoteSyntheses),
      customCoursePacks: mergeByIdSimple(local.customCoursePacks, remotePacks),
    };
    saveJournalData(next);
    emit({ kind: 'idle', lastSyncAt: new Date() });
  } catch (err) {
    emit({
      kind: 'error',
      message: err instanceof Error ? err.message : 'Cloud pull failed.',
    });
  }
}

function mergeByIdSimple<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  local.forEach((row) => map.set(row.id, row));
  remote.forEach((row) => {
    if (!map.has(row.id)) map.set(row.id, row);
  });
  return Array.from(map.values());
}

export async function pushToCloud(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const session = (await sb.auth.getSession()).data.session;
  if (!session) {
    emit({ kind: 'signed-out' });
    return;
  }

  emit({ kind: 'syncing' });
  try {
    const local = loadJournalData();
    await Promise.all([
      pushTable('entries', local.entries),
      pushTable('sources', local.sources),
      pushTable('exploration_areas', local.furtherExplorationAreas),
      pushTable('review_cards', local.reviewCards),
      pushTable('syntheses', local.syntheses),
      pushCoursePacks(local.customCoursePacks),
    ]);
    emit({ kind: 'idle', lastSyncAt: new Date() });
  } catch (err) {
    emit({
      kind: 'error',
      message: err instanceof Error ? err.message : 'Cloud push failed.',
    });
  }
}

// ------------------------------------------------------------------
// Auto-sync wiring
// ------------------------------------------------------------------

let pushTimer: ReturnType<typeof setTimeout> | null = null;
const PUSH_DEBOUNCE_MS = 2500;

function schedulePush() {
  if (!isSyncConfigured()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushToCloud();
  }, PUSH_DEBOUNCE_MS);
}

let installed = false;
export function installSyncListeners() {
  if (installed) return;
  installed = true;
  if (!isSyncConfigured()) return;

  // Push on every successful local save (debounced).
  subscribeStorage((event) => {
    if (event.type === 'saved') schedulePush();
  });

  // Auth state: pull on sign-in, mark signed-out on sign-out.
  const sb = getSupabase();
  if (sb) {
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        emit({ kind: 'idle', lastSyncAt: null });
        void pullFromCloud();
      } else {
        emit({ kind: 'signed-out' });
      }
    });
    sb.auth.onAuthStateChange((event, session) => {
      if (session) {
        emit({ kind: 'idle', lastSyncAt: null });
        if (event === 'SIGNED_IN') void pullFromCloud();
      } else {
        emit({ kind: 'signed-out' });
      }
    });
  }
}

// ------------------------------------------------------------------
// Public share snapshots
// ------------------------------------------------------------------

export async function publishShareSnapshot(snapshot: PublishedJournal): Promise<{
  shareId: string;
  url: string;
}> {
  const sb = getSupabase();
  if (!sb) throw new Error('Cloud sync is not configured.');
  const session = (await sb.auth.getSession()).data.session;
  if (!session) throw new Error('Sign in before publishing a share link.');

  const shareId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const { error } = await sb.from('public_journals').insert({
    share_id: shareId,
    course_id: snapshot.courseId,
    owner_id: session.user.id,
    data: snapshot,
    published_at: snapshot.publishedAt,
  });
  if (error) throw error;

  const url = `${window.location.origin}/share/${shareId}`;
  return { shareId, url };
}

export async function fetchShareSnapshot(
  shareId: string,
): Promise<PublishedJournal | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('public_journals')
    .select('data')
    .eq('share_id', shareId)
    .maybeSingle();
  if (error) {
    console.warn('fetchShareSnapshot:', error.message);
    return null;
  }
  return (data?.data as PublishedJournal | undefined) ?? null;
}
