import type { CoursePack } from '../schemas/types';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Normalize a CoursePack so it's safe to write to storage:
 *  - guarantees a stable `id` (falls back to slugified code/title/timestamp)
 *  - guarantees a `title` (falls back to "Untitled Course")
 *  - guarantees every section/source has an id, type, required flag, and
 *    uploadRequired flag computed from whether a URL exists.
 *
 * Used by both the manual Course Builder and the syllabus import panel,
 * so both entry points install identically shaped packs.
 */
export function prepareCourseForInstall(course: CoursePack): CoursePack {
  const id =
    course.id ||
    course.code?.toLowerCase().replace(/\s+/g, '-') ||
    slugify(course.title) ||
    `course-${Date.now()}`;

  return {
    ...course,
    id,
    title: course.title || 'Untitled Course',
    sections: course.sections.map((section, index) => ({
      ...section,
      number: section.number || index + 1,
      requiredSources: (section.requiredSources || []).map((source, sourceIndex) => ({
        ...source,
        id:
          source.id ||
          `${section.id || `section-${index + 1}`}-source-${sourceIndex + 1}`,
        type: source.type || 'article',
        required: source.required ?? true,
        uploadRequired: source.uploadRequired ?? !source.url,
      })),
    })),
  };
}
