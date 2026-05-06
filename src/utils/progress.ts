// Progress calculation utilities

import type {
  JournalEntry,
  EntryProgress,
  SectionProgress,
  CoursePack,
} from '../schemas/types';

export function calculateEntryProgress(entry: JournalEntry): EntryProgress {
  const hasNotes = entry.notes.trim().length > 0;
  const hasSummary = entry.summary.trim().length > 0;
  const hasReflection = entry.reflection.trim().length > 0;
  const hasQuestions = entry.questions.trim().length > 0;
  const hasKeyTakeaways = entry.keyTakeaways.trim().length > 0;
  const hasProfessionalApplication = entry.professionalApplication.trim().length > 0;
  const hasResources = entry.resources.length > 0;

  const fields = [
    hasNotes,
    hasSummary,
    hasReflection,
    hasQuestions,
    hasKeyTakeaways,
    hasProfessionalApplication,
    hasResources,
  ];

  const completedCount = fields.filter(Boolean).length;
  const completionPercentage = Math.round((completedCount / fields.length) * 100);

  return {
    hasNotes,
    hasSummary,
    hasReflection,
    hasQuestions,
    hasKeyTakeaways,
    hasProfessionalApplication,
    hasResources,
    completionPercentage,
  };
}

export function calculateSectionProgress(
  sectionId: string,
  entries: JournalEntry[]
): SectionProgress {
  const sectionEntries = entries.filter((e) => e.sectionId === sectionId);
  const publishedEntries = sectionEntries.filter((e) => e.published);

  if (sectionEntries.length === 0) {
    return {
      sectionId,
      totalEntries: 0,
      publishedEntries: 0,
      averageCompletion: 0,
    };
  }

  const completionSum = sectionEntries.reduce((sum, entry) => {
    const progress = calculateEntryProgress(entry);
    return sum + progress.completionPercentage;
  }, 0);

  return {
    sectionId,
    totalEntries: sectionEntries.length,
    publishedEntries: publishedEntries.length,
    averageCompletion: Math.round(completionSum / sectionEntries.length),
  };
}

export function calculateCourseProgress(
  coursePack: CoursePack,
  entries: JournalEntry[]
): {
  sectionsWithEntries: number;
  totalSections: number;
  overallCompletion: number;
  entriesCount: number;
  publishedCount: number;
} {
  const courseEntries = entries.filter((e) => e.courseId === coursePack.id);
  const sectionsWithEntries = new Set(courseEntries.map((e) => e.sectionId)).size;
  const publishedCount = courseEntries.filter((e) => e.published).length;

  if (courseEntries.length === 0) {
    return {
      sectionsWithEntries: 0,
      totalSections: coursePack.sections.length,
      overallCompletion: 0,
      entriesCount: 0,
      publishedCount: 0,
    };
  }

  const completionSum = courseEntries.reduce((sum, entry) => {
    const progress = calculateEntryProgress(entry);
    return sum + progress.completionPercentage;
  }, 0);

  return {
    sectionsWithEntries,
    totalSections: coursePack.sections.length,
    overallCompletion: Math.round(completionSum / courseEntries.length),
    entriesCount: courseEntries.length,
    publishedCount,
  };
}
