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

const STORAGE_KEYS = {
  JOURNAL_DATA: 'course-journal-kit-data',
  SETTINGS: 'course-journal-kit-settings',
} as const;

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

export function loadJournalData(): JournalData {
  try {
    if (typeof localStorage === 'undefined') return defaultJournalData;
    const stored = localStorage.getItem(STORAGE_KEYS.JOURNAL_DATA);
    if (!stored) return defaultJournalData;
    
    const parsed = JSON.parse(stored) as JournalData;
    return {
      ...defaultJournalData,
      ...parsed,
      entries: parsed.entries || [],
      furtherExplorationAreas: parsed.furtherExplorationAreas || [],
      reviewCards: parsed.reviewCards || [],
      syntheses: parsed.syntheses || [],
      sources: parsed.sources || [],
      customCoursePacks: parsed.customCoursePacks || [],
      settings: { ...defaultSettings, ...parsed.settings },
    };
  } catch (error) {
    console.error('Failed to load journal data:', error);
    return defaultJournalData;
  }
}

export function saveJournalData(data: JournalData): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.JOURNAL_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save journal data:', error);
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

export function exportJournalData(): string {
  const data = loadJournalData();
  return JSON.stringify(data, null, 2);
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
    saveJournalData({
      ...defaultJournalData,
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    } as JournalData);

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

export function clearAllData(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.JOURNAL_DATA);
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
