// localStorage utilities for Course Journal Kit

import type {
  CoursePack,
  JournalData,
  JournalEntry,
  FurtherExplorationArea,
  ReviewCard,
  FinalSynthesis,
  UserSettings,
  PublishedJournal,
  CourseSource,
} from '../schemas/types';
import {
  blobToDataUrl,
  dataUrlToBlob,
  getAttachment,
  isAttachmentsAvailable,
  putAttachment,
} from './attachments';

const STORAGE_KEYS = {
  JOURNAL_DATA: 'course-journal-kit-data',
  JOURNAL_BACKUP: 'course-journal-kit-data:backup',
  JOURNAL_BACKUP_PREV: 'course-journal-kit-data:backup-prev',
  LAST_BACKUP_AT: 'course-journal-kit-data:last-backup-at',
  SETTINGS: 'course-journal-kit-settings',
} as const;

// Bump whenever JournalData shape changes in a way migration must handle.
export const CURRENT_SCHEMA_VERSION = 2;

// ============================================
// TYPED STORAGE ERROR + EVENT BUS
// ============================================

export type StorageErrorKind =
  | 'quota'
  | 'unavailable'
  | 'parse'
  | 'serialize'
  | 'unknown';

export class StorageError extends Error {
  kind: StorageErrorKind;
  cause?: unknown;
  constructor(kind: StorageErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.kind = kind;
    this.cause = cause;
  }
}

type StorageEvent =
  | { type: 'saved'; at: Date }
  | { type: 'error'; error: StorageError };

type Listener = (event: StorageEvent) => void;
const listeners = new Set<Listener>();

export function subscribeStorage(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: StorageEvent) {
  listeners.forEach((l) => {
    try {
      l(event);
    } catch (err) {
      console.error('Storage listener threw:', err);
    }
  });
}

function classifyError(err: unknown): StorageError {
  if (err instanceof StorageError) return err;
  if (err instanceof DOMException) {
    if (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22
    ) {
      return new StorageError(
        'quota',
        'Local storage is full. Remove an attached file or export a backup, then try again.',
        err,
      );
    }
  }
  if (err instanceof Error) {
    return new StorageError('unknown', err.message, err);
  }
  return new StorageError('unknown', 'Unknown storage error.', err);
}

// ============================================
// DEFAULT DATA
// ============================================

const defaultSettings: UserSettings = {
  studentName: '',
  darkMode: 'system',
  autoSaveInterval: 2000, // ms; debounce window between last keystroke and write
  defaultTags: [],
};

const defaultJournalData: JournalData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  entries: [],
  furtherExplorationAreas: [],
  reviewCards: [],
  syntheses: [],
  sources: [],
  customCoursePacks: [],
  settings: defaultSettings,
};

function createId(prefix: string): string {
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${randomId}`;
}

// ============================================
// LOAD / SAVE
// ============================================

function normalizeShape(parsed: Partial<JournalData> | null | undefined): JournalData {
  const safe = parsed ?? {};
  return {
    schemaVersion: safe.schemaVersion ?? 1,
    entries: safe.entries || [],
    furtherExplorationAreas: safe.furtherExplorationAreas || [],
    reviewCards: safe.reviewCards || [],
    syntheses: safe.syntheses || [],
    sources: safe.sources || [],
    customCoursePacks: safe.customCoursePacks || [],
    settings: { ...defaultSettings, ...(safe.settings ?? {}) },
  };
}

function tryParseFromKey(key: string): JournalData | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return normalizeShape(JSON.parse(raw) as Partial<JournalData>);
  } catch {
    return null;
  }
}

export function loadJournalData(): JournalData {
  if (typeof localStorage === 'undefined') return defaultJournalData;

  const live = tryParseFromKey(STORAGE_KEYS.JOURNAL_DATA);
  if (live) return live;

  // The live blob was missing or unparseable. Try the rolling backups in
  // order so we can self-heal from a corrupted single write.
  const backup = tryParseFromKey(STORAGE_KEYS.JOURNAL_BACKUP);
  if (backup) {
    emit({
      type: 'error',
      error: new StorageError(
        'parse',
        'Live data was unreadable; recovered from the most recent backup.',
      ),
    });
    return backup;
  }

  const prev = tryParseFromKey(STORAGE_KEYS.JOURNAL_BACKUP_PREV);
  if (prev) {
    emit({
      type: 'error',
      error: new StorageError(
        'parse',
        'Live data and primary backup were unreadable; recovered from the previous backup.',
      ),
    });
    return prev;
  }

  return defaultJournalData;
}

// Backup rotation: every Nth save promotes the current snapshot to :backup
// and the old :backup to :backup-prev. We also rotate at most every 60s so a
// burst of edits doesn't churn the backups.
const BACKUP_MIN_INTERVAL_MS = 60_000;

function maybeRotateBackup(serialized: string) {
  if (typeof localStorage === 'undefined') return;
  const lastAtRaw = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_AT);
  const lastAt = lastAtRaw ? Date.parse(lastAtRaw) : 0;
  if (Number.isFinite(lastAt) && Date.now() - lastAt < BACKUP_MIN_INTERVAL_MS) {
    return;
  }
  try {
    const currentBackup = localStorage.getItem(STORAGE_KEYS.JOURNAL_BACKUP);
    if (currentBackup) {
      localStorage.setItem(STORAGE_KEYS.JOURNAL_BACKUP_PREV, currentBackup);
    }
    localStorage.setItem(STORAGE_KEYS.JOURNAL_BACKUP, serialized);
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_AT, new Date().toISOString());
  } catch (err) {
    // Backup rotation is best-effort. If the quota is full we'd rather drop
    // the backup than block the live write; the live write itself runs
    // independently below.
    console.warn('Backup rotation failed (non-fatal):', err);
  }
}

export function saveJournalData(data: JournalData): void {
  if (typeof localStorage === 'undefined') {
    const error = new StorageError('unavailable', 'localStorage is not available.');
    emit({ type: 'error', error });
    throw error;
  }

  let serialized: string;
  try {
    serialized = JSON.stringify({
      ...data,
      schemaVersion: data.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    });
  } catch (err) {
    const error = new StorageError(
      'serialize',
      'Could not serialize journal data.',
      err,
    );
    emit({ type: 'error', error });
    throw error;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.JOURNAL_DATA, serialized);
  } catch (err) {
    const error = classifyError(err);
    emit({ type: 'error', error });
    throw error;
  }

  maybeRotateBackup(serialized);
  emit({ type: 'saved', at: new Date() });
}

export function getLastBackupAt(): Date | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_AT);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

export function getStorageDiagnostics(): {
  liveBytes: number;
  backupBytes: number;
  prevBackupBytes: number;
  lastBackupAt: Date | null;
  schemaVersion: number;
} {
  if (typeof localStorage === 'undefined') {
    return {
      liveBytes: 0,
      backupBytes: 0,
      prevBackupBytes: 0,
      lastBackupAt: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
  }
  const sizeOf = (key: string) => (localStorage.getItem(key) || '').length;
  const data = loadJournalData();
  return {
    liveBytes: sizeOf(STORAGE_KEYS.JOURNAL_DATA),
    backupBytes: sizeOf(STORAGE_KEYS.JOURNAL_BACKUP),
    prevBackupBytes: sizeOf(STORAGE_KEYS.JOURNAL_BACKUP_PREV),
    lastBackupAt: getLastBackupAt(),
    schemaVersion: data.schemaVersion ?? 1,
  };
}

// ============================================
// MIGRATIONS
// ============================================

let migrationInFlight: Promise<void> | null = null;

export function runMigrations(): Promise<void> {
  if (migrationInFlight) return migrationInFlight;
  migrationInFlight = (async () => {
    try {
      if (typeof localStorage === 'undefined') return;
      const data = loadJournalData();
      const current = data.schemaVersion ?? 1;
      if (current >= CURRENT_SCHEMA_VERSION) return;

      if (current < 2) {
        await migrateAttachmentsToIndexedDb(data);
      }

      data.schemaVersion = CURRENT_SCHEMA_VERSION;
      try {
        saveJournalData(data);
      } catch (err) {
        console.error('Migration save failed:', err);
      }
    } finally {
      migrationInFlight = null;
    }
  })();
  return migrationInFlight;
}

async function migrateAttachmentsToIndexedDb(data: JournalData): Promise<void> {
  if (!isAttachmentsAvailable()) return;
  if (!data.sources || data.sources.length === 0) return;

  for (const source of data.sources) {
    const inlineUrl = source.attachmentDataUrl;
    if (!inlineUrl) continue;
    if (source.attachmentRef) {
      // Already migrated; just clear the legacy field.
      delete source.attachmentDataUrl;
      continue;
    }
    try {
      const blob = dataUrlToBlob(inlineUrl);
      const id = await putAttachment({
        name: source.attachmentName ?? 'attachment',
        mimeType: source.attachmentMimeType ?? blob.type ?? 'application/octet-stream',
        data: blob,
      });
      source.attachmentRef = id;
      delete source.attachmentDataUrl;
    } catch (err) {
      console.warn('Failed to migrate attachment for source', source.id, err);
      // Leave the inline copy in place so the user doesn't lose the file.
    }
  }
}

// ============================================
// CUSTOM COURSE PACKS
// ============================================

export function getCustomCoursePacks(): CoursePack[] {
  return loadJournalData().customCoursePacks || [];
}

export function getCustomCoursePack(courseId: string): CoursePack | undefined {
  return getCustomCoursePacks().find((course) => course.id === courseId);
}

export function saveCustomCoursePack(coursePack: CoursePack): void {
  const data = loadJournalData();
  const existingIndex = data.customCoursePacks.findIndex((course) => course.id === coursePack.id);

  if (existingIndex >= 0) {
    data.customCoursePacks[existingIndex] = coursePack;
  } else {
    data.customCoursePacks.push(coursePack);
  }

  saveJournalData(data);
}

export function deleteCustomCoursePack(courseId: string): void {
  const data = loadJournalData();
  data.customCoursePacks = data.customCoursePacks.filter((course) => course.id !== courseId);
  saveJournalData(data);
}

export function seedSourcesFromCoursePack(coursePack: CoursePack): number {
  const data = loadJournalData();
  if (!data.sources) data.sources = [];

  const existingKeys = new Set(
    data.sources
      .filter((source) => source.courseId === coursePack.id)
      .map((source) => source.syllabusSourceId || `${source.sectionId}:${source.title.toLowerCase()}`)
  );

  let createdCount = 0;
  const now = new Date().toISOString();

  coursePack.sections.forEach((section) => {
    section.requiredSources?.forEach((sourceSeed) => {
      const sourceKey = sourceSeed.id || `${section.id}:${sourceSeed.title.toLowerCase()}`;
      if (existingKeys.has(sourceKey)) return;

      data.sources.push({
        id: createId('source'),
        courseId: coursePack.id,
        sectionId: section.id,
        syllabusSourceId: sourceSeed.id,
        title: sourceSeed.title,
        authors: sourceSeed.authors,
        url: sourceSeed.url,
        type: sourceSeed.type || 'article',
        citation: sourceSeed.citation,
        sourceOrigin: 'syllabus',
        required: sourceSeed.required ?? true,
        uploadRequired: sourceSeed.uploadRequired ?? !sourceSeed.url,
        usedInEntryIds: [],
        isAssigned: sourceSeed.required ?? true,
        isSupplementary: !(sourceSeed.required ?? true),
        readingStatus: 'unread',
        notes: sourceSeed.notes || '',
        keyQuotes: [],
        keyTerms: [],
        questions: '',
        connections: '',
        tags: ['syllabus'],
        addedAt: now,
        updatedAt: now,
      });
      existingKeys.add(sourceKey);
      createdCount += 1;
    });
  });

  saveJournalData(data);
  return createdCount;
}

export function installCustomCoursePack(coursePack: CoursePack): number {
  saveCustomCoursePack(coursePack);
  return seedSourcesFromCoursePack(coursePack);
}

// ============================================
// ENTRIES
// ============================================

export function getEntries(courseId?: string): JournalEntry[] {
  const data = loadJournalData();
  if (courseId) {
    return data.entries.filter((e) => e.courseId === courseId);
  }
  return data.entries;
}

export function getEntry(entryId: string): JournalEntry | undefined {
  const data = loadJournalData();
  return data.entries.find((e) => e.id === entryId);
}

export function saveEntry(entry: JournalEntry): void {
  const data = loadJournalData();
  const index = data.entries.findIndex((e) => e.id === entry.id);
  
  if (index >= 0) {
    data.entries[index] = { ...entry, updatedAt: new Date().toISOString() };
  } else {
    data.entries.push(entry);
  }
  
  saveJournalData(data);
}

export function deleteEntry(entryId: string): void {
  const data = loadJournalData();
  data.entries = data.entries.filter((e) => e.id !== entryId);
  saveJournalData(data);
}

// ============================================
// FURTHER EXPLORATION
// ============================================

export function getFurtherExplorationAreas(courseId?: string): FurtherExplorationArea[] {
  const data = loadJournalData();
  if (courseId) {
    return data.furtherExplorationAreas.filter((a) => a.courseId === courseId);
  }
  return data.furtherExplorationAreas;
}

export function saveFurtherExplorationArea(area: FurtherExplorationArea): void {
  const data = loadJournalData();
  const index = data.furtherExplorationAreas.findIndex((a) => a.id === area.id);
  
  if (index >= 0) {
    data.furtherExplorationAreas[index] = { ...area, updatedAt: new Date().toISOString() };
  } else {
    data.furtherExplorationAreas.push(area);
  }
  
  saveJournalData(data);
}

export function deleteFurtherExplorationArea(areaId: string): void {
  const data = loadJournalData();
  data.furtherExplorationAreas = data.furtherExplorationAreas.filter((a) => a.id !== areaId);
  saveJournalData(data);
}

// ============================================
// REVIEW CARDS
// ============================================

export function getReviewCards(courseId?: string): ReviewCard[] {
  const data = loadJournalData();
  if (courseId) {
    return data.reviewCards.filter((c) => c.courseId === courseId);
  }
  return data.reviewCards;
}

export function saveReviewCard(card: ReviewCard): void {
  const data = loadJournalData();
  const index = data.reviewCards.findIndex((c) => c.id === card.id);
  
  if (index >= 0) {
    data.reviewCards[index] = card;
  } else {
    data.reviewCards.push(card);
  }
  
  saveJournalData(data);
}

export function deleteReviewCard(cardId: string): void {
  const data = loadJournalData();
  data.reviewCards = data.reviewCards.filter((c) => c.id !== cardId);
  saveJournalData(data);
}

// ============================================
// SYNTHESES
// ============================================

export function getSyntheses(courseId?: string): FinalSynthesis[] {
  const data = loadJournalData();
  if (courseId) {
    return data.syntheses.filter((s) => s.courseId === courseId);
  }
  return data.syntheses;
}

export function saveSynthesis(synthesis: FinalSynthesis): void {
  const data = loadJournalData();
  const index = data.syntheses.findIndex((s) => s.id === synthesis.id);
  
  if (index >= 0) {
    data.syntheses[index] = { ...synthesis, updatedAt: new Date().toISOString() };
  } else {
    data.syntheses.push(synthesis);
  }
  
  saveJournalData(data);
}

export function deleteSynthesis(synthesisId: string): void {
  const data = loadJournalData();
  data.syntheses = data.syntheses.filter((s) => s.id !== synthesisId);
  saveJournalData(data);
}

// ============================================
// SETTINGS
// ============================================

export function getSettings(): UserSettings {
  const data = loadJournalData();
  return data.settings;
}

export function saveSettings(settings: Partial<UserSettings>): void {
  const data = loadJournalData();
  data.settings = { ...data.settings, ...settings };
  saveJournalData(data);
}

// ============================================
// EXPORT / IMPORT
// ============================================

// Sync export. Returns the journal JSON without attachment binaries inlined;
// IndexedDB blobs are referenced by `attachmentRef` only. Use this for quick
// exports where size matters or the destination has its own attachment store.
export function exportJournalData(): string {
  const data = loadJournalData();
  return JSON.stringify(data, null, 2);
}

// Full export. Inlines IndexedDB attachment blobs back into the JSON as
// `attachmentDataUrl`, so the resulting file is self-contained and can be
// re-imported on a different browser/device. The legacy `attachmentRef` is
// preserved so a re-import on the same device skips re-storing.
export async function exportJournalDataWithAttachments(): Promise<string> {
  const data = loadJournalData();
  const sources = await Promise.all(
    (data.sources || []).map(async (source) => {
      if (!source.attachmentRef) return source;
      try {
        const blob = await getAttachment(source.attachmentRef);
        if (!blob) return source;
        const dataUrl = await blobToDataUrl(blob.data);
        return {
          ...source,
          attachmentDataUrl: dataUrl,
          attachmentMimeType: source.attachmentMimeType ?? blob.mimeType,
          attachmentName: source.attachmentName ?? blob.name,
        };
      } catch (err) {
        console.warn('Failed to inline attachment for export:', source.id, err);
        return source;
      }
    })
  );
  return JSON.stringify({ ...data, sources }, null, 2);
}

export type ImportMode = 'merge' | 'replace';

export type ImportResult = {
  success: boolean;
  mode: ImportMode;
  added: {
    entries: number;
    sources: number;
    explorationAreas: number;
    reviewCards: number;
    syntheses: number;
    customCoursePacks: number;
  };
  updated: {
    entries: number;
    sources: number;
    explorationAreas: number;
    reviewCards: number;
    syntheses: number;
    customCoursePacks: number;
  };
  error?: string;
};

const emptyCounters = (): ImportResult['added'] => ({
  entries: 0,
  sources: 0,
  explorationAreas: 0,
  reviewCards: 0,
  syntheses: 0,
  customCoursePacks: 0,
});

type IdentifiableCollection<T extends { id: string }> = T[];

function mergeCollection<T extends { id: string }>(
  existing: IdentifiableCollection<T>,
  incoming: IdentifiableCollection<T> | undefined,
  preferIncoming: (incoming: T, existing: T) => T = (next) => next
): { result: T[]; added: number; updated: number } {
  if (!incoming || incoming.length === 0) {
    return { result: existing, added: 0, updated: 0 };
  }

  const byId = new Map(existing.map((item) => [item.id, item]));
  let added = 0;
  let updated = 0;

  incoming.forEach((item) => {
    if (!item || typeof item.id !== 'string') return;
    if (byId.has(item.id)) {
      byId.set(item.id, preferIncoming(item, byId.get(item.id) as T));
      updated += 1;
    } else {
      byId.set(item.id, item);
      added += 1;
    }
  });

  return { result: Array.from(byId.values()), added, updated };
}

function pickNewerByUpdatedAt<T extends { id: string; updatedAt?: string }>(
  next: T,
  current: T
): T {
  const nextDate = next.updatedAt ? Date.parse(next.updatedAt) : 0;
  const currentDate = current.updatedAt ? Date.parse(current.updatedAt) : 0;
  return nextDate >= currentDate ? next : current;
}

export function importJournalData(jsonString: string, mode: ImportMode = 'merge'): ImportResult {
  const result: ImportResult = {
    success: false,
    mode,
    added: emptyCounters(),
    updated: emptyCounters(),
  };

  let parsed: Partial<JournalData>;
  try {
    parsed = JSON.parse(jsonString) as Partial<JournalData>;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Could not parse JSON.';
    return result;
  }

  if (!parsed.entries || !Array.isArray(parsed.entries)) {
    result.error = 'Invalid backup: expected an "entries" array.';
    return result;
  }

  if (mode === 'replace') {
    const replaced: JournalData = {
      ...defaultJournalData,
      ...parsed,
      schemaVersion: 1, // force the migration runner to relocate attachments
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    } as JournalData;
    saveJournalData(replaced);
    void runMigrations(); // heal any inline attachments in the imported data

    result.success = true;
    result.added = {
      entries: parsed.entries.length,
      sources: parsed.sources?.length ?? 0,
      explorationAreas: parsed.furtherExplorationAreas?.length ?? 0,
      reviewCards: parsed.reviewCards?.length ?? 0,
      syntheses: parsed.syntheses?.length ?? 0,
      customCoursePacks: parsed.customCoursePacks?.length ?? 0,
    };
    return result;
  }

  const current = loadJournalData();

  const entries = mergeCollection(current.entries, parsed.entries, pickNewerByUpdatedAt);
  const sources = mergeCollection(current.sources, parsed.sources, pickNewerByUpdatedAt);
  const explorationAreas = mergeCollection(
    current.furtherExplorationAreas,
    parsed.furtherExplorationAreas,
    pickNewerByUpdatedAt
  );
  const reviewCards = mergeCollection(current.reviewCards, parsed.reviewCards);
  const syntheses = mergeCollection(current.syntheses, parsed.syntheses, pickNewerByUpdatedAt);
  const customCoursePacks = mergeCollection(current.customCoursePacks, parsed.customCoursePacks);

  const mergedSettings: UserSettings = {
    ...current.settings,
    ...(parsed.settings ?? {}),
    defaultTags: Array.from(
      new Set([...(current.settings.defaultTags ?? []), ...(parsed.settings?.defaultTags ?? [])])
    ),
  };

  saveJournalData({
    entries: entries.result,
    sources: sources.result,
    furtherExplorationAreas: explorationAreas.result,
    reviewCards: reviewCards.result,
    syntheses: syntheses.result,
    customCoursePacks: customCoursePacks.result,
    settings: mergedSettings,
  });

  result.success = true;
  result.added = {
    entries: entries.added,
    sources: sources.added,
    explorationAreas: explorationAreas.added,
    reviewCards: reviewCards.added,
    syntheses: syntheses.added,
    customCoursePacks: customCoursePacks.added,
  };
  result.updated = {
    entries: entries.updated,
    sources: sources.updated,
    explorationAreas: explorationAreas.updated,
    reviewCards: reviewCards.updated,
    syntheses: syntheses.updated,
    customCoursePacks: customCoursePacks.updated,
  };
  return result;
}

export function exportPublishedJournal(courseId: string, studentName: string): PublishedJournal {
  const data = loadJournalData();
  
  return {
    courseId,
    studentName,
    publishedAt: new Date().toISOString(),
    entries: data.entries.filter((e) => e.courseId === courseId && e.published),
    furtherExplorationAreas: data.furtherExplorationAreas.filter((a) => a.courseId === courseId),
    finalSynthesis: data.syntheses.find((s) => s.courseId === courseId),
  };
}

// ============================================
// DEFAULT TAGS (entry creation helper)
// ============================================

function slugifyTag(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

/**
 * Default tags applied to a brand-new journal entry.
 *
 * Combines (in order, deduped):
 * 1. user's `settings.defaultTags`
 * 2. course code or course id (e.g. `med-584`)
 * 3. section number (e.g. `module-1`)
 * 4. matching topic id if a section has a guiding topic
 *
 * The list is kept short (max 6) so the user can add their own.
 */
export function getDefaultTagsForNewEntry(options: {
  course: { id: string; code?: string; sectionLabel: string };
  sectionId?: string;
  sectionNumber?: number;
  topicId?: string;
}): string[] {
  const { course, sectionId, sectionNumber, topicId } = options;
  const settings = getSettings();
  const tags: string[] = [];

  (settings.defaultTags ?? []).forEach((tag) => {
    const cleaned = slugifyTag(tag);
    if (cleaned) tags.push(cleaned);
  });

  const courseTag = slugifyTag(course.code || course.id);
  if (courseTag) tags.push(courseTag);

  if (sectionNumber !== undefined) {
    const sectionTag = slugifyTag(`${course.sectionLabel}-${sectionNumber}`);
    if (sectionTag) tags.push(sectionTag);
  } else if (sectionId) {
    const sectionTag = slugifyTag(sectionId);
    if (sectionTag) tags.push(sectionTag);
  }

  if (topicId) {
    const topicTag = slugifyTag(topicId);
    if (topicTag) tags.push(topicTag);
  }

  return Array.from(new Set(tags)).slice(0, 6);
}

// ============================================
// CLEAR DATA
// ============================================

export function clearAllData(options: { keepBackups?: boolean } = {}): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.JOURNAL_DATA);
  if (!options.keepBackups) {
    localStorage.removeItem(STORAGE_KEYS.JOURNAL_BACKUP);
    localStorage.removeItem(STORAGE_KEYS.JOURNAL_BACKUP_PREV);
    localStorage.removeItem(STORAGE_KEYS.LAST_BACKUP_AT);
  }
}

// Triggers a browser download of the current journal as a timestamped JSON
// file with attachment binaries inlined. Use this for true offline backups.
export async function downloadBackupFile(): Promise<{ filename: string }> {
  const json = await exportJournalDataWithAttachments();
  const stamp = new Date()
    .toISOString()
    .replace(/[:]/g, '-')
    .replace(/\.\d+Z$/, 'Z');
  const filename = `course-journal-kit-backup-${stamp}.json`;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  try {
    sessionStorage.setItem('course-journal-kit:backup-downloaded-at', new Date().toISOString());
  } catch {
    // sessionStorage can be unavailable in private modes; non-fatal.
  }
  return { filename };
}

export function hasDownloadedBackupThisSession(): boolean {
  try {
    return Boolean(sessionStorage.getItem('course-journal-kit:backup-downloaded-at'));
  } catch {
    return false;
  }
}

export function clearCourseData(courseId: string): void {
  const data = loadJournalData();
  
  data.entries = data.entries.filter((e) => e.courseId !== courseId);
  data.furtherExplorationAreas = data.furtherExplorationAreas.filter((a) => a.courseId !== courseId);
  data.reviewCards = data.reviewCards.filter((c) => c.courseId !== courseId);
  data.syntheses = data.syntheses.filter((s) => s.courseId !== courseId);
  data.sources = data.sources.filter((s) => s.courseId !== courseId);
  
  saveJournalData(data);
}

// ============================================
// SOURCES
// ============================================

export function getSources(courseId?: string, sectionId?: string): CourseSource[] {
  const data = loadJournalData();
  let sources = data.sources || [];
  
  if (courseId) {
    sources = sources.filter((s) => s.courseId === courseId);
  }
  if (sectionId) {
    sources = sources.filter((s) => s.sectionId === sectionId);
  }
  
  return sources;
}

export function getSource(sourceId: string): CourseSource | undefined {
  const data = loadJournalData();
  return (data.sources || []).find((s) => s.id === sourceId);
}

export function saveSource(source: CourseSource): void {
  const data = loadJournalData();
  if (!data.sources) data.sources = [];
  
  const index = data.sources.findIndex((s) => s.id === source.id);
  
  if (index >= 0) {
    data.sources[index] = { ...source, updatedAt: new Date().toISOString() };
  } else {
    data.sources.push(source);
  }
  
  saveJournalData(data);
}

export function deleteSource(sourceId: string): void {
  const data = loadJournalData();
  data.sources = (data.sources || []).filter((s) => s.id !== sourceId);
  saveJournalData(data);
}
