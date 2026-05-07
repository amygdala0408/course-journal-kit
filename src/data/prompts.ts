/**
 * Prompt Bank
 * -----------
 * Vetted prompts you copy into an external AI chat (Claude, ChatGPT,
 * Perplexity, etc.) so the AI does the heavy structural work. Each
 * prompt is designed so its OUTPUT can be pasted directly back into
 * Course Journal Kit and validated against a strict schema.
 *
 * Adding a new prompt? Keep these conventions:
 *   - The prompt instructs the AI to output ONE fenced JSON block,
 *     and nothing else — that lets us extract it deterministically.
 *   - The schema in the prompt mirrors a TypeScript type that lives
 *     somewhere in `src/schemas/types.ts`.
 *   - The prompt explicitly forbids the AI from writing on the
 *     student's behalf (academic-integrity guardrail).
 */

export type PromptBankItem = {
  id: string;
  title: string;
  summary: string;
  recommendedTools: string[];
  body: string;
};

const SYLLABUS_TO_COURSE_PACK_BODY = `You are converting an academic syllabus into a strict JSON object that
will be loaded into Course Journal Kit, a reusable reflection journal
app. You are NOT writing reflections, summaries, or assignments on
behalf of the student. Your only job is structure extraction.

# Output rules (read carefully)

- Output ONE Markdown fenced JSON block (\`\`\`json … \`\`\`) and NOTHING ELSE.
  No prose before, no explanation after.
- The JSON must parse with \`JSON.parse()\`. No comments, no trailing commas.
- Every \`id\` is kebab-case ASCII, ≤ 32 chars (e.g. \`module-1\`, \`lo-3\`,
  \`udl-framework\`).
- Use the section label that the syllabus actually uses: if it says
  "Week", use Week; if "Module", Module; "Unit", Unit; "Chapter", etc.
  Default to Module only if unclear.

# CRITICAL: distinguish section *headers* from in-text references

Syllabi often mention a module/week inside a description, an
assignment title, or a reading list:

  - "For Module 3, complete the following readings"
  - "See discussion in Module 1"
  - "Assignment due before Module 4"
  - "Module 2 Discussion: post 250 words…"

These are REFERENCES, not section definitions. ONLY create a section
when you see a structural header in a course schedule, table of
contents, or weekly outline, like:

  Module 1: Foundations of Equity
  Week 5 — Designing Inclusive Assessments
  Unit III: Ethical Considerations
  Chapter 2. Universal Design for Learning

When in doubt, count: most courses have 5–16 sections. If you've
extracted 30 sections you've over-counted; collapse references back
into their parent section.

# Schema

\`\`\`json
{
  "id": "kebab-case-slug-of-course-code-or-title",
  "title": "Full course title",
  "code": "e.g. EDU 410",
  "term": "e.g. Fall 2026",
  "description": "1–2 sentence description of the course's focus.",
  "sectionLabel": "Module | Week | Unit | Chapter | Session | Theme",

  "requirements": {
    "publicLinkRequired": true,
    "minimumFurtherExplorationAreas": 3,
    "requiresFinalSynthesis": true,
    "requiresResources": true,
    "requiresMedia": false
  },

  "outcomes": [
    { "id": "lo-1", "label": "LO1", "text": "..." }
  ],

  "sections": [
    {
      "id": "module-1",
      "number": 1,
      "title": "Section title (e.g. Foundations of Equity)",
      "description": "1–2 sentence summary of this section's focus.",
      "topics": [
        { "id": "topic-equity-frameworks", "title": "...", "required": false }
      ],
      "keyFrameworks": ["UDL", "TPACK"],
      "requiredSources": [
        {
          "id": "module-1-source-1",
          "title": "Author, A. (Year). Article title.",
          "authors": "Author, A.",
          "url": "https://… (omit the field entirely if not in the syllabus)",
          "type": "article",
          "citation": "Optional full citation",
          "required": true,
          "uploadRequired": false
        }
      ],
      "outcomes": ["lo-1", "lo-3"],
      "assignments": [
        {
          "id": "assign-1",
          "title": "Reflection journal entry",
          "type": "reflection",
          "dueDate": "2026-09-15"
        }
      ]
    }
  ],

  "reflectionLenses": [
    {
      "id": "conceptual-understanding",
      "label": "Conceptual Understanding",
      "description": "What ideas, theories, and frameworks matter most?"
    }
  ],

  "rubrics": [
    {
      "id": "journal-readiness",
      "title": "Journal Readiness",
      "totalPoints": 25,
      "checks": [
        {
          "id": "sources-noted",
          "label": "Sources Noted",
          "description": "Required sources include notes, quotes, or questions before drafting.",
          "points": 5
        }
      ]
    }
  ]
}
\`\`\`

# Filling rules

- \`outcomes\`: every learning outcome the syllabus lists. ID them
  \`lo-1\`, \`lo-2\`, etc. Don't invent outcomes that aren't there.
- \`sections.requiredSources\`: every required reading/video/podcast/PDF
  attached to that section.
  - \`type\`: one of \`article\`, \`book\`, \`video\`, \`podcast\`, \`website\`,
    \`tool\`, \`image\`, \`document\`, \`other\`.
  - If the syllabus shows a hard-copy reading or PDF without a public
    link: set \`uploadRequired: true\` and OMIT the \`url\` field.
  - Don't list optional/supplementary readings here unless the
    syllabus explicitly says they are required.
- \`sections.topics\`: 2–6 short topic titles per section if the
  syllabus suggests them (e.g. lecture topics, sub-themes). Optional —
  use \`[]\` if not applicable.
- \`keyFrameworks\`: 2–6 acronyms or framework names (e.g. UDL, NETP,
  TPACK).
- \`reflectionLenses\`: 3–6 lenses appropriate to the discipline. If the
  syllabus offers no guidance, use this safe default:
    - Conceptual Understanding
    - Professional Practice
    - Ethical & Equity Considerations
- \`rubrics\`: produce ONE rubric named "Journal Readiness" with 5
  checks of 5 points each totaling 25, unless the syllabus describes a
  reflection / journal rubric explicitly.
- \`assignments\` and \`dueDate\`: only include if the syllabus is
  explicit. Use ISO 8601 dates (\`"2026-09-15"\`).

# Defaults (use ONLY when the syllabus is silent)

\`requirements\`: \`publicLinkRequired: true\`,
\`minimumFurtherExplorationAreas: 3\`, \`requiresFinalSynthesis: true\`,
\`requiresResources: true\`, \`requiresMedia: false\`.

# Now do it

The syllabus is below. Convert it.

---

Syllabus:
[PASTE YOUR SYLLABUS HERE]
`;

export const SYLLABUS_TO_COURSE_PACK_PROMPT: PromptBankItem = {
  id: 'syllabus-to-course-pack',
  title: 'Convert syllabus → CoursePack JSON',
  summary:
    'Turns a raw syllabus into a strict CoursePack JSON the importer can install. Tells the AI not to confuse "Module N" references with section headers.',
  recommendedTools: ['Claude', 'ChatGPT', 'Perplexity'],
  body: SYLLABUS_TO_COURSE_PACK_BODY,
};

export const PROMPT_BANK: PromptBankItem[] = [SYLLABUS_TO_COURSE_PACK_PROMPT];
