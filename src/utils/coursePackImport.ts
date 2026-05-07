/**
 * CoursePack importer
 * -------------------
 * Accepts whatever an external AI chat produced (markdown fenced JSON,
 * raw JSON, slightly-prose-padded JSON), parses it, validates the shape
 * against `CoursePack`, and normalizes IDs / defaults so the result
 * is safe to install.
 *
 * Two-pass approach:
 *   1. extractCoursePackJson()  → string | null   (find the JSON)
 *   2. importCoursePack()       → result object   (parse + validate)
 *
 * The result is intentionally shaped so the UI can show a useful
 * preview ("8 sections, 24 sources, 11 outcomes") plus warnings
 * before the user commits to installing.
 */
import type {
  CoursePack,
  CourseSection,
  CourseSourceSeed,
  CourseTopic,
  CourseOutcome,
  ReflectionLens,
  Rubric,
  RubricCheck,
  Assignment,
  ResourceType,
} from '../schemas/types';

export type CoursePackImportSummary = {
  sectionCount: number;
  sourceCount: number;
  outcomeCount: number;
  lensCount: number;
  topicCount: number;
  assignmentCount: number;
  uploadNeededCount: number;
};

export type CoursePackImportResult =
  | {
      ok: true;
      coursePack: CoursePack;
      summary: CoursePackImportSummary;
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    };

const RESOURCE_TYPES: readonly ResourceType[] = [
  'article',
  'book',
  'video',
  'podcast',
  'website',
  'tool',
  'image',
  'document',
  'other',
];

const ASSIGNMENT_TYPES = ['reflection', 'discussion', 'project', 'quiz', 'other'] as const;

function slugify(value: string, max = 32): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max) || 'item';
}

/**
 * Pull the first plausible JSON object out of `input`. Handles:
 *   - raw JSON
 *   - ```json fenced blocks ```
 *   - ``` fenced blocks (no language tag) ```
 *   - prose preceded/followed by a JSON object
 */
export function extractCoursePackJson(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fenceMatch = trimmed.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  if (trimmed.startsWith('{')) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asResourceType(value: unknown, fallback: ResourceType = 'article'): ResourceType {
  if (typeof value === 'string') {
    const lower = value.toLowerCase() as ResourceType;
    if ((RESOURCE_TYPES as readonly string[]).includes(lower)) return lower;
  }
  return fallback;
}

function asAssignmentType(value: unknown): Assignment['type'] {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if ((ASSIGNMENT_TYPES as readonly string[]).includes(lower)) {
      return lower as Assignment['type'];
    }
  }
  return 'other';
}

function normalizeOutcomes(raw: unknown): CourseOutcome[] {
  return asArray(raw)
    .map((entry, index) => {
      if (!isObject(entry)) return null;
      const text = asString(entry.text) ?? asString(entry.description) ?? asString(entry.label);
      if (!text) return null;
      const label = asString(entry.label) ?? `LO${index + 1}`;
      const id = asString(entry.id) ?? `lo-${index + 1}`;
      return { id, label, text };
    })
    .filter((value): value is CourseOutcome => value !== null);
}

function normalizeTopics(raw: unknown, sectionId: string): CourseTopic[] {
  return asArray(raw)
    .map((entry, index): CourseTopic | null => {
      if (!isObject(entry)) return null;
      const title = asString(entry.title);
      if (!title) return null;
      const id = asString(entry.id) ?? `${sectionId}-topic-${index + 1}`;
      const guidingQuestions = Array.isArray(entry.guidingQuestions)
        ? entry.guidingQuestions.filter((q): q is string => typeof q === 'string')
        : undefined;
      return {
        id,
        title,
        required: typeof entry.required === 'boolean' ? entry.required : false,
        guidingQuestions,
      };
    })
    .filter((value): value is CourseTopic => value !== null);
}

function normalizeSources(raw: unknown, sectionId: string): {
  sources: CourseSourceSeed[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const sources = asArray(raw)
    .map((entry, index): CourseSourceSeed | null => {
      if (!isObject(entry)) return null;
      const title = asString(entry.title);
      if (!title) {
        warnings.push(`Skipped a source in "${sectionId}" because it had no title.`);
        return null;
      }
      const url = asString(entry.url);
      const explicitUpload = typeof entry.uploadRequired === 'boolean' ? entry.uploadRequired : undefined;
      return {
        id: asString(entry.id) ?? `${sectionId}-source-${index + 1}`,
        title,
        authors: asString(entry.authors),
        url,
        type: asResourceType(entry.type),
        citation: asString(entry.citation),
        required: typeof entry.required === 'boolean' ? entry.required : true,
        uploadRequired: explicitUpload ?? !url,
        notes: asString(entry.notes),
      };
    })
    .filter((value): value is CourseSourceSeed => value !== null);

  return { sources, warnings };
}

function normalizeAssignments(raw: unknown, sectionId: string): Assignment[] {
  return asArray(raw)
    .map((entry, index): Assignment | null => {
      if (!isObject(entry)) return null;
      const title = asString(entry.title);
      if (!title) return null;
      return {
        id: asString(entry.id) ?? `${sectionId}-assign-${index + 1}`,
        title,
        description: asString(entry.description),
        dueDate: asString(entry.dueDate),
        type: asAssignmentType(entry.type),
      };
    })
    .filter((value): value is Assignment => value !== null);
}

function normalizeSections(raw: unknown, sectionLabel: string): {
  sections: CourseSection[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const labelSlug = slugify(sectionLabel.toLowerCase(), 16);

  const seenIds = new Set<string>();
  const sections = asArray(raw)
    .map((entry, index): CourseSection | null => {
      if (!isObject(entry)) return null;
      const title = asString(entry.title) ?? `${sectionLabel} ${index + 1}`;
      const number = typeof entry.number === 'number' ? entry.number : index + 1;
      let id = asString(entry.id) ?? `${labelSlug}-${number}`;

      if (seenIds.has(id)) {
        const original = id;
        let suffix = 2;
        while (seenIds.has(`${original}-${suffix}`)) suffix += 1;
        id = `${original}-${suffix}`;
        warnings.push(
          `Duplicate section id "${original}" was renamed to "${id}". Check that the AI didn\u2019t collapse two real sections into one.`,
        );
      }
      seenIds.add(id);

      const { sources, warnings: sourceWarnings } = normalizeSources(entry.requiredSources, id);
      warnings.push(...sourceWarnings);

      return {
        id,
        number,
        title,
        description: asString(entry.description),
        topics: normalizeTopics(entry.topics, id),
        requiredSources: sources,
        outcomes: Array.isArray(entry.outcomes)
          ? entry.outcomes.filter((o): o is string => typeof o === 'string')
          : undefined,
        assignments: normalizeAssignments(entry.assignments, id),
        keyFrameworks: Array.isArray(entry.keyFrameworks)
          ? entry.keyFrameworks.filter((k): k is string => typeof k === 'string')
          : [],
        dueDate: asString(entry.dueDate),
      };
    })
    .filter((value): value is CourseSection => value !== null);

  return { sections, warnings };
}

function normalizeLenses(raw: unknown): ReflectionLens[] {
  const fromInput = asArray(raw)
    .map((entry, index): ReflectionLens | null => {
      if (!isObject(entry)) return null;
      const label = asString(entry.label);
      if (!label) return null;
      const id = asString(entry.id) ?? `lens-${slugify(label, 24)}-${index + 1}`;
      return {
        id,
        label,
        description: asString(entry.description),
        promptHint: asString(entry.promptHint),
      };
    })
    .filter((value): value is ReflectionLens => value !== null);

  if (fromInput.length > 0) return fromInput;

  return [
    {
      id: 'conceptual-understanding',
      label: 'Conceptual Understanding',
      description: 'What ideas, theories, and frameworks matter most?',
    },
    {
      id: 'professional-practice',
      label: 'Professional Practice',
      description: 'How does this apply to real work or teaching practice?',
    },
    {
      id: 'ethical-equity',
      label: 'Ethics & Equity',
      description: 'Who benefits, who is excluded, and what responsibilities follow?',
    },
  ];
}

function normalizeRubrics(raw: unknown): Rubric[] {
  const fromInput = asArray(raw)
    .map((entry, index): Rubric | null => {
      if (!isObject(entry)) return null;
      const title = asString(entry.title) ?? 'Journal Readiness';
      const id = asString(entry.id) ?? `rubric-${slugify(title, 16)}-${index + 1}`;
      const checks = asArray(entry.checks)
        .map((check, checkIndex): RubricCheck | null => {
          if (!isObject(check)) return null;
          const label = asString(check.label);
          if (!label) return null;
          return {
            id: asString(check.id) ?? `${id}-check-${checkIndex + 1}`,
            label,
            description: asString(check.description) ?? '',
            points: typeof check.points === 'number' ? check.points : 5,
          };
        })
        .filter((value): value is RubricCheck => value !== null);

      const totalPoints =
        typeof entry.totalPoints === 'number'
          ? entry.totalPoints
          : checks.reduce((sum, c) => sum + (c.points || 0), 0) || 25;

      return { id, title, totalPoints, checks };
    })
    .filter((value): value is Rubric => value !== null);

  if (fromInput.length > 0 && fromInput.some((r) => r.checks.length > 0)) {
    return fromInput;
  }

  return [
    {
      id: 'journal-readiness',
      title: 'Journal Readiness',
      totalPoints: 25,
      checks: [
        {
          id: 'sources-noted',
          label: 'Sources Noted',
          description: 'Required sources include notes, quotes, or questions before drafting.',
          points: 5,
        },
        {
          id: 'reflection-depth',
          label: 'Reflection Depth',
          description: 'Entries move beyond summary into interpretation and professional meaning.',
          points: 5,
        },
        {
          id: 'connections',
          label: 'Connections',
          description: 'Entries connect readings, course outcomes, and practice.',
          points: 5,
        },
        {
          id: 'equity-ethics',
          label: 'Equity & Ethics',
          description: 'Entries address equity, access, ethics, or learner impact where relevant.',
          points: 5,
        },
        {
          id: 'publication-ready',
          label: 'Publication Ready',
          description: 'Entries are complete, polished, cited, and ready for the public journal.',
          points: 5,
        },
      ],
    },
  ];
}

function normalizeRequirements(raw: unknown): CoursePack['requirements'] {
  const safe = isObject(raw) ? raw : {};
  return {
    publicLinkRequired:
      typeof safe.publicLinkRequired === 'boolean' ? safe.publicLinkRequired : true,
    minimumFurtherExplorationAreas:
      typeof safe.minimumFurtherExplorationAreas === 'number'
        ? safe.minimumFurtherExplorationAreas
        : 3,
    requiresFinalSynthesis:
      typeof safe.requiresFinalSynthesis === 'boolean' ? safe.requiresFinalSynthesis : true,
    requiresResources:
      typeof safe.requiresResources === 'boolean' ? safe.requiresResources : true,
    requiresMedia:
      typeof safe.requiresMedia === 'boolean' ? safe.requiresMedia : false,
  };
}

const VALID_SECTION_LABELS = ['Module', 'Week', 'Unit', 'Chapter', 'Session', 'Theme'] as const;

function normalizeSectionLabel(value: unknown): CoursePack['sectionLabel'] {
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    const matched = VALID_SECTION_LABELS.find(
      (label) => label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (matched) return matched;
    return trimmed;
  }
  return 'Module';
}

/**
 * Parse + validate + normalize. Returns an explicit success/failure
 * result so callers can render concrete issues without throwing.
 */
export function importCoursePack(rawInput: string): CoursePackImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawInput || !rawInput.trim()) {
    return {
      ok: false,
      errors: ['No content to import. Paste the AI\u2019s reply or upload a .md/.json file first.'],
      warnings,
    };
  }

  const jsonText = extractCoursePackJson(rawInput);
  if (!jsonText) {
    return {
      ok: false,
      errors: [
        'Could not find a JSON object in the input. Make sure the AI\u2019s reply contains a fenced ```json block or a single JSON object.',
      ],
      warnings,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown JSON parse error';
    return {
      ok: false,
      errors: [`The JSON is invalid: ${message}`],
      warnings,
    };
  }

  if (!isObject(parsed)) {
    return {
      ok: false,
      errors: ['Expected a JSON object at the top level.'],
      warnings,
    };
  }

  const title = asString(parsed.title);
  if (!title) errors.push('Missing required field: "title".');

  const sectionLabel = normalizeSectionLabel(parsed.sectionLabel);
  const { sections, warnings: sectionWarnings } = normalizeSections(parsed.sections, sectionLabel);
  warnings.push(...sectionWarnings);

  if (sections.length === 0) {
    errors.push(
      'No sections were found. The "sections" array must contain at least one section with a title.',
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  const code = asString(parsed.code);
  const id =
    asString(parsed.id) ??
    (code ? slugify(code) : slugify(title ?? `course-${Date.now()}`));

  const outcomes = normalizeOutcomes(parsed.outcomes);
  const reflectionLenses = normalizeLenses(parsed.reflectionLenses);
  const rubrics = normalizeRubrics(parsed.rubrics);
  const requirements = normalizeRequirements(parsed.requirements);

  if (sections.length > 30) {
    warnings.push(
      `Found ${sections.length} sections, which is unusually high. Double-check the AI didn\u2019t treat in-text "${sectionLabel} N" references as new sections.`,
    );
  }

  const sourceCount = sections.reduce((sum, s) => sum + (s.requiredSources?.length ?? 0), 0);
  const uploadNeededCount = sections.reduce(
    (sum, s) => sum + (s.requiredSources?.filter((r) => r.uploadRequired).length ?? 0),
    0,
  );
  const topicCount = sections.reduce((sum, s) => sum + s.topics.length, 0);
  const assignmentCount = sections.reduce((sum, s) => sum + (s.assignments?.length ?? 0), 0);

  if (sourceCount === 0) {
    warnings.push(
      'No required sources were detected. Sources can be added by hand later, but the syllabus probably had readings the AI missed.',
    );
  }

  const coursePack: CoursePack = {
    id,
    title: title ?? 'Imported Course',
    code,
    term: asString(parsed.term),
    description: asString(parsed.description),
    sectionLabel,
    requirements,
    outcomes,
    sections,
    rubrics,
    reflectionLenses,
  };

  return {
    ok: true,
    coursePack,
    summary: {
      sectionCount: sections.length,
      sourceCount,
      outcomeCount: outcomes.length,
      lensCount: reflectionLenses.length,
      topicCount,
      assignmentCount,
      uploadNeededCount,
    },
    warnings,
  };
}
