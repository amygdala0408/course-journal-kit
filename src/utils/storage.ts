// localStorage utilities for Course Journal Kit

import type {
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
  autoSaveInterval: 30000,
  defaultTags: [],
};

const defaultJournalData: JournalData = {
  entries: [],
  furtherExplorationAreas: [],
  reviewCards: [],
  syntheses: [],
  sources: [],
  settings: defaultSettings,
};

// ============================================
// LOAD / SAVE
// ============================================

export function loadJournalData(): JournalData {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.JOURNAL_DATA);
    if (!stored) return defaultJournalData;
    
    const parsed = JSON.parse(stored) as JournalData;
    return {
      ...defaultJournalData,
      ...parsed,
      settings: { ...defaultSettings, ...parsed.settings },
    };
  } catch (error) {
    console.error('Failed to load journal data:', error);
    return defaultJournalData;
  }
}

export function saveJournalData(data: JournalData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.JOURNAL_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save journal data:', error);
  }
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

export function importJournalData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString) as JournalData;
    
    // Validate structure
    if (!parsed.entries || !Array.isArray(parsed.entries)) {
      throw new Error('Invalid data structure: missing entries array');
    }
    
    saveJournalData({
      ...defaultJournalData,
      ...parsed,
      settings: { ...defaultSettings, ...parsed.settings },
    });
    
    return true;
  } catch (error) {
    console.error('Failed to import journal data:', error);
    return false;
  }
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
// CLEAR DATA
// ============================================

export function clearAllData(): void {
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
