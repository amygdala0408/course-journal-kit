import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { downloadJSON } from '../utils/export';
import { installCustomCoursePack } from '../utils/storage';
import type { CoursePack, CourseSection, CourseTopic, CourseOutcome, ReflectionLens, RubricCheck, CourseSourceSeed, ResourceType } from '../schemas/types';
import { v4 as uuidv4 } from 'uuid';

const emptyCourse: CoursePack = {
  id: '',
  title: '',
  code: '',
  term: '',
  description: '',
  sectionLabel: 'Module',
  requirements: {
    publicLinkRequired: true,
    minimumFurtherExplorationAreas: 3,
    requiresFinalSynthesis: true,
    requiresResources: false,
    requiresMedia: false,
  },
  outcomes: [],
  sections: [],
  rubrics: [{ id: 'default', title: 'Journal Completeness', totalPoints: 25, checks: [] }],
  reflectionLenses: [],
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function extractUrl(value: string): string | undefined {
  return value.match(/https?:\/\/[^\s)]+/i)?.[0];
}

function inferResourceType(value: string): ResourceType {
  const lower = value.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('video')) return 'video';
  if (lower.includes('podcast')) return 'podcast';
  if (lower.includes('.pdf') || lower.includes('slides') || lower.includes('handout')) return 'document';
  if (lower.includes('book') || lower.includes('chapter')) return 'book';
  if (lower.includes('article') || lower.includes('journal') || lower.includes('doi.org')) return 'article';
  return 'website';
}

function cleanSourceTitle(value: string): string {
  return value
    .replace(/^[-*•\d.)\s]+/, '')
    .replace(/https?:\/\/[^\s)]+/i, '')
    .replace(/\b(required reading|reading|source|resource|article|chapter)\b\s*:?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeSourceLine(line: string): boolean {
  const lower = line.toLowerCase();
  return Boolean(
    extractUrl(line) ||
      lower.includes('reading') ||
      lower.includes('article') ||
      lower.includes('chapter') ||
      lower.includes('book') ||
      lower.includes('pdf') ||
      lower.includes('slides') ||
      lower.includes('doi.org')
  );
}

function looksLikeOutcomeLine(line: string): boolean {
  return /\b(outcome|objective|students will|learners will|you will|lo\d)\b/i.test(line);
}

function parseSyllabusToCoursePack(text: string): CoursePack {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const firstMeaningfulLine = lines.find((line) => !/^(syllabus|course schedule)$/i.test(line)) || 'Imported Course';
  const codeMatch = text.match(/\b[A-Z]{2,5}\s?\d{3,4}[A-Z]?\b/);
  const sectionLabel = /\bweek\s+\d+/i.test(text) ? 'Week' : 'Module';
  const title = firstMeaningfulLine.length > 6 ? firstMeaningfulLine : codeMatch?.[0] || 'Imported Course';
  const courseId = slugify(codeMatch?.[0] || title) || `course-${Date.now()}`;

  const sections: CourseSection[] = [];
  const outcomes: CourseOutcome[] = [];
  let currentSection: CourseSection | null = null;
  let sourceCounter = 1;

  const ensureSection = (titleValue: string, number?: number) => {
    const sectionNumber = number || sections.length + 1;
    const section: CourseSection = {
      id: `${sectionLabel.toLowerCase()}-${sectionNumber}`,
      number: sectionNumber,
      title: titleValue || `${sectionLabel} ${sectionNumber}`,
      description: '',
      topics: [],
      requiredSources: [],
      keyFrameworks: [],
    };
    sections.push(section);
    currentSection = section;
  };

  lines.forEach((line) => {
    const sectionMatch = line.match(/^(module|week|unit|chapter|session)\s+(\d+)\s*[:\-–]?\s*(.*)$/i);
    if (sectionMatch) {
      ensureSection(sectionMatch[3]?.trim() || `${sectionMatch[1]} ${sectionMatch[2]}`, Number(sectionMatch[2]));
      return;
    }

    const numberedScheduleMatch = line.match(/^(\d{1,2})[.)]\s+(.{8,})$/);
    if (!currentSection && numberedScheduleMatch) {
      ensureSection(numberedScheduleMatch[2], Number(numberedScheduleMatch[1]));
      return;
    }

    if (looksLikeOutcomeLine(line) && outcomes.length < 12) {
      outcomes.push({
        id: `lo${outcomes.length + 1}`,
        label: `LO${outcomes.length + 1}`,
        text: line.replace(/^[-*•\d.)\s]+/, ''),
      });
    }

    if (!currentSection && sections.length === 0 && looksLikeSourceLine(line)) {
      ensureSection(`${sectionLabel} 1`, 1);
    }

    if (currentSection && looksLikeSourceLine(line)) {
      const url = extractUrl(line);
      const titleValue = cleanSourceTitle(line) || `Source ${sourceCounter}`;
      const source: CourseSourceSeed = {
        id: `syllabus-source-${sourceCounter}`,
        title: titleValue,
        url,
        type: inferResourceType(line),
        required: true,
        uploadRequired: !url,
        notes: url ? 'Imported from syllabus link.' : 'Imported from syllabus. Add a link or upload the hard copy.',
      };
      currentSection.requiredSources = [...(currentSection.requiredSources || []), source];
      sourceCounter += 1;
      return;
    }

    if (currentSection && currentSection.topics.length < 8 && line.length < 120 && !/^(required|readings?|assignments?|due|schedule)$/i.test(line)) {
      currentSection.topics.push({
        id: `topic-${uuidv4().slice(0, 8)}`,
        title: line.replace(/^[-*•\d.)\s]+/, ''),
        required: false,
      });
    }
  });

  if (sections.length === 0) {
    ensureSection(`${sectionLabel} 1`, 1);
  }

  return {
    ...emptyCourse,
    id: courseId,
    title,
    code: codeMatch?.[0] || '',
    sectionLabel,
    outcomes,
    sections,
    reflectionLenses: [
      { id: 'conceptual-understanding', label: 'Conceptual Understanding', description: 'What ideas, theories, and frameworks matter most?' },
      { id: 'professional-practice', label: 'Professional Practice', description: 'How does this apply to real work or teaching practice?' },
      { id: 'ethical-equity', label: 'Ethics & Equity', description: 'Who benefits, who is excluded, and what responsibilities follow?' },
    ],
    rubrics: [{
      id: 'syllabus-readiness',
      title: 'Journal Readiness',
      totalPoints: 25,
      checks: [
        { id: 'sources-noted', label: 'Sources Noted', description: 'Required sources include notes, quotes, or questions before drafting.', points: 5 },
        { id: 'reflection-depth', label: 'Reflection Depth', description: 'Entries move beyond summary into interpretation and professional meaning.', points: 5 },
        { id: 'connections', label: 'Connections', description: 'Entries connect readings, course outcomes, and practice.', points: 5 },
        { id: 'equity-ethics', label: 'Equity & Ethics', description: 'Entries address equity, access, ethics, or learner impact where relevant.', points: 5 },
        { id: 'publication-ready', label: 'Publication Ready', description: 'Entries are complete, polished, cited, and ready for the public journal.', points: 5 },
      ],
    }],
  };
}

function prepareCourseForInstall(course: CoursePack): CoursePack {
  const id = course.id || course.code?.toLowerCase().replace(/\s+/g, '-') || slugify(course.title) || `course-${Date.now()}`;

  return {
    ...course,
    id,
    title: course.title || 'Untitled Course',
    sections: course.sections.map((section, index) => ({
      ...section,
      number: section.number || index + 1,
      requiredSources: (section.requiredSources || []).map((source, sourceIndex) => ({
        ...source,
        id: source.id || `${section.id || `section-${index + 1}`}-source-${sourceIndex + 1}`,
        type: source.type || 'article',
        required: source.required ?? true,
        uploadRequired: source.uploadRequired ?? !source.url,
      })),
    })),
  };
}

export default function CourseBuilderPage() {
  const navigate = useNavigate();
  const [course, setCourse] = useState<CoursePack>(emptyCourse);
  const [importText, setImportText] = useState('');
  const [syllabusText, setSyllabusText] = useState('');
  const [installMessage, setInstallMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'syllabus' | 'sections' | 'outcomes' | 'lenses' | 'rubric' | 'import'>('basic');

  const updateCourse = (updates: Partial<CoursePack>) => {
    setCourse({ ...course, ...updates });
  };

  const addSection = () => {
    const newSection: CourseSection = {
      id: `section-${uuidv4().slice(0, 8)}`,
      number: course.sections.length + 1,
      title: '',
      description: '',
      topics: [],
      requiredSources: [],
      keyFrameworks: [],
    };
    updateCourse({ sections: [...course.sections, newSection] });
  };

  const updateSection = (sectionId: string, updates: Partial<CourseSection>) => {
    const sections = course.sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s));
    updateCourse({ sections });
  };

  const removeSection = (sectionId: string) => {
    updateCourse({ sections: course.sections.filter((s) => s.id !== sectionId) });
  };

  const addTopic = (sectionId: string) => {
    const section = course.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const newTopic: CourseTopic = {
      id: `topic-${uuidv4().slice(0, 8)}`,
      title: '',
      required: false,
    };
    updateSection(sectionId, { topics: [...section.topics, newTopic] });
  };

  const updateTopic = (sectionId: string, topicId: string, updates: Partial<CourseTopic>) => {
    const section = course.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const topics = section.topics.map((t) => (t.id === topicId ? { ...t, ...updates } : t));
    updateSection(sectionId, { topics });
  };

  const removeTopic = (sectionId: string, topicId: string) => {
    const section = course.sections.find((s) => s.id === sectionId);
    if (!section) return;

    updateSection(sectionId, { topics: section.topics.filter((t) => t.id !== topicId) });
  };

  const addOutcome = () => {
    const newOutcome: CourseOutcome = {
      id: `lo${course.outcomes.length + 1}`,
      label: `LO${course.outcomes.length + 1}`,
      text: '',
    };
    updateCourse({ outcomes: [...course.outcomes, newOutcome] });
  };

  const updateOutcome = (outcomeId: string, updates: Partial<CourseOutcome>) => {
    const outcomes = course.outcomes.map((o) => (o.id === outcomeId ? { ...o, ...updates } : o));
    updateCourse({ outcomes });
  };

  const removeOutcome = (outcomeId: string) => {
    updateCourse({ outcomes: course.outcomes.filter((o) => o.id !== outcomeId) });
  };

  const addLens = () => {
    const newLens: ReflectionLens = {
      id: `lens-${uuidv4().slice(0, 8)}`,
      label: '',
      description: '',
    };
    updateCourse({ reflectionLenses: [...course.reflectionLenses, newLens] });
  };

  const updateLens = (lensId: string, updates: Partial<ReflectionLens>) => {
    const lenses = course.reflectionLenses.map((l) => (l.id === lensId ? { ...l, ...updates } : l));
    updateCourse({ reflectionLenses: lenses });
  };

  const removeLens = (lensId: string) => {
    updateCourse({ reflectionLenses: course.reflectionLenses.filter((l) => l.id !== lensId) });
  };

  const addRubricCheck = () => {
    const rubric = course.rubrics[0];
    const newCheck: RubricCheck = {
      id: `check-${uuidv4().slice(0, 8)}`,
      label: '',
      description: '',
      points: 5,
    };
    updateCourse({
      rubrics: [{ ...rubric, checks: [...rubric.checks, newCheck] }],
    });
  };

  const updateRubricCheck = (checkId: string, updates: Partial<RubricCheck>) => {
    const rubric = course.rubrics[0];
    const checks = rubric.checks.map((c) => (c.id === checkId ? { ...c, ...updates } : c));
    updateCourse({ rubrics: [{ ...rubric, checks }] });
  };

  const removeRubricCheck = (checkId: string) => {
    const rubric = course.rubrics[0];
    updateCourse({
      rubrics: [{ ...rubric, checks: rubric.checks.filter((c) => c.id !== checkId) }],
    });
  };

  const handleExport = () => {
    const exportCourse = {
      ...course,
      id: course.id || course.code?.toLowerCase().replace(/\s+/g, '-') || `course-${Date.now()}`,
    };
    downloadJSON(exportCourse, `${exportCourse.id}-course-pack`);
  };

  const handleInstall = () => {
    const installableCourse = prepareCourseForInstall(course);
    const sourceCount = installCustomCoursePack(installableCourse);
    setCourse(installableCourse);
    setInstallMessage(`Installed ${installableCourse.title} with ${sourceCount} syllabus source${sourceCount === 1 ? '' : 's'}.`);
    navigate(`/course/${installableCourse.id}`);
  };

  const handleSyllabusFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    setSyllabusText(text);
  };

  const handleParseSyllabus = () => {
    if (!syllabusText.trim()) return;
    setCourse(parseSyllabusToCoursePack(syllabusText));
    setInstallMessage('');
    setActiveTab('sections');
  };

  const handleImport = () => {
    try {
      const imported = JSON.parse(importText) as CoursePack;
      setCourse(imported);
      setActiveTab('basic');
      setImportText('');
    } catch {
      alert('Invalid JSON. Please check the format.');
    }
  };

  const schemaInstructions = `Convert the syllabus below into a CoursePack JSON object.

Rules:
- Do not write reflections for me.
- Extract course title, course code, outcomes, modules/weeks/units, topics, assignments, rubrics, due dates if available, and final synthesis requirements.
- Use a generic structure so the course can be loaded into a reusable reflection journal app.
- Include reflection lenses appropriate to this course.
- Include rubric readiness checks.
- Use this section label: [Module/Week/Unit/etc.]
- Return valid JSON only.

Schema:
{
  "id": "string",
  "title": "string",
  "code": "string (optional)",
  "term": "string (optional)",
  "description": "string (optional)",
  "sectionLabel": "Module | Week | Unit | Chapter | Session | Theme",
  "requirements": {
    "publicLinkRequired": boolean,
    "minimumFurtherExplorationAreas": number,
    "requiresFinalSynthesis": boolean
  },
  "outcomes": [{ "id": "string", "label": "string", "text": "string" }],
  "sections": [{
    "id": "string",
    "number": number,
    "title": "string",
    "description": "string (optional)",
    "topics": [{ "id": "string", "title": "string", "required": boolean }],
    "requiredSources": [{ "id": "string", "title": "string", "url": "string (optional)", "type": "article|book|video|podcast|website|document|other", "required": true, "uploadRequired": boolean }],
    "keyFrameworks": ["string"]
  }],
  "reflectionLenses": [{ "id": "string", "label": "string", "description": "string" }],
  "rubrics": [{ "id": "string", "title": "string", "checks": [{ "id": "string", "label": "string", "description": "string" }] }]
}

Syllabus:
[PASTE SYLLABUS HERE]`;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight">
          Course Builder
        </h1>
        <p className="text-ink-muted dark:text-dark-ink-muted mt-2">
          Create or edit course packs without writing code.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {(['basic', 'syllabus', 'sections', 'outcomes', 'lenses', 'rubric', 'import'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border font-mono text-sm capitalize ${
              activeTab === tab
                ? 'bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface border-ink dark:border-dark-ink'
                : 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Basic Info */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
                Course Title *
              </label>
              <input
                type="text"
                value={course.title}
                onChange={(e) => updateCourse({ title: e.target.value })}
                className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
              />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
                Course Code
              </label>
              <input
                type="text"
                value={course.code}
                onChange={(e) => updateCourse({ code: e.target.value })}
                placeholder="e.g., MED 584"
                className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
                Term
              </label>
              <input
                type="text"
                value={course.term}
                onChange={(e) => updateCourse({ term: e.target.value })}
                placeholder="e.g., Spring 2026"
                className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
              />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
                Section Label
              </label>
              <select
                value={course.sectionLabel}
                onChange={(e) => updateCourse({ sectionLabel: e.target.value })}
                className="w-full p-3 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
              >
                <option value="Module">Module</option>
                <option value="Week">Week</option>
                <option value="Unit">Unit</option>
                <option value="Chapter">Chapter</option>
                <option value="Session">Session</option>
                <option value="Theme">Theme</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Description
            </label>
            <textarea
              value={course.description}
              onChange={(e) => updateCourse({ description: e.target.value })}
              rows={3}
              className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
            />
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Requirements
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={course.requirements.publicLinkRequired}
                  onChange={(e) => updateCourse({ requirements: { ...course.requirements, publicLinkRequired: e.target.checked } })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-ink dark:text-dark-ink">Public link required</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={course.requirements.requiresFinalSynthesis}
                  onChange={(e) => updateCourse({ requirements: { ...course.requirements, requiresFinalSynthesis: e.target.checked } })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-ink dark:text-dark-ink">Requires final synthesis</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink dark:text-dark-ink">Minimum exploration areas:</span>
                <input
                  type="number"
                  min="0"
                  value={course.requirements.minimumFurtherExplorationAreas || 0}
                  onChange={(e) => updateCourse({ requirements: { ...course.requirements, minimumFurtherExplorationAreas: parseInt(e.target.value) || 0 } })}
                  className="w-16 p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Syllabus Import */}
      {activeTab === 'syllabus' && (
        <div className="space-y-6">
          <div className="p-4 bg-surface-container dark:bg-dark-surface-container border border-outline dark:border-dark-outline">
            <h2 className="font-mono text-sm text-ink dark:text-dark-ink mb-2">
              Upload or paste a syllabus
            </h2>
            <p className="text-sm text-ink-muted dark:text-dark-ink-muted">
              This creates a draft course structure and turns detected readings, links, chapters, PDFs, and slide decks into module sources. Review the draft before installing it.
            </p>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Text syllabus file
            </label>
            <input
              type="file"
              accept=".txt,.md,.csv"
              onChange={(event) => handleSyllabusFile(event.target.files?.[0])}
              className="block w-full p-3 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink"
            />
            <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-2">
              For PDFs or scans, copy/paste the text below for now. Hard-copy readings will be marked as upload needed.
            </p>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Syllabus text
            </label>
            <textarea
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              rows={16}
              placeholder="Paste syllabus schedule, readings, assignments, and rubric details here..."
              className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink font-mono text-sm"
            />
          </div>

          <button
            onClick={handleParseSyllabus}
            disabled={!syllabusText.trim()}
            className="px-6 py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider disabled:opacity-50"
          >
            Generate Guided Course Draft
          </button>
        </div>
      )}

      {/* Sections */}
      {activeTab === 'sections' && (
        <div className="space-y-6">
          <button
            onClick={addSection}
            className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm"
          >
            + Add {course.sectionLabel}
          </button>

          {course.sections.map((section, index) => (
            <div key={section.id} className="border border-ink dark:border-dark-ink p-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-mono text-sm text-ink dark:text-dark-ink">
                  {course.sectionLabel} {index + 1}
                </h3>
                <button onClick={() => removeSection(section.id)} className="text-error text-sm">Remove</button>
              </div>
              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                placeholder="Section title"
                className="w-full p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink mb-2"
              />
              <textarea
                value={section.description || ''}
                onChange={(e) => updateSection(section.id, { description: e.target.value })}
                placeholder="Description (optional)"
                rows={2}
                className="w-full p-2 border border-outline dark:border-dark-outline bg-transparent text-ink dark:text-dark-ink mb-4"
              />

              <div className="ml-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">Topics</span>
                  <button onClick={() => addTopic(section.id)} className="font-mono text-xs text-ink dark:text-dark-ink">+ Add</button>
                </div>
                {section.topics.map((topic) => (
                  <div key={topic.id} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={topic.title}
                      onChange={(e) => updateTopic(section.id, topic.id, { title: e.target.value })}
                      placeholder="Topic title"
                      className="flex-1 p-2 border border-outline dark:border-dark-outline bg-transparent text-ink dark:text-dark-ink text-sm"
                    />
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={topic.required}
                        onChange={(e) => updateTopic(section.id, topic.id, { required: e.target.checked })}
                      />
                      <span className="text-xs">Req</span>
                    </label>
                    <button onClick={() => removeTopic(section.id, topic.id)} className="text-error text-sm">×</button>
                  </div>
                ))}
              </div>

              {(section.requiredSources?.length || 0) > 0 && (
                <div className="ml-4 mt-4 pt-4 border-t border-outline dark:border-dark-outline">
                  <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted block mb-2">
                    Syllabus Sources ({section.requiredSources?.length || 0})
                  </span>
                  <div className="space-y-2">
                    {section.requiredSources?.map((source) => (
                      <div key={source.id} className="flex items-start justify-between gap-3 p-2 border border-outline dark:border-dark-outline">
                        <div>
                          <p className="text-sm text-ink dark:text-dark-ink">{source.title}</p>
                          <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">
                            {source.url ? 'Link found' : 'Upload/link needed'} · {source.type}
                          </p>
                        </div>
                        {source.uploadRequired && (
                          <span className="font-mono text-xs px-2 py-1 border border-error text-error">
                            Needs file
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Outcomes */}
      {activeTab === 'outcomes' && (
        <div className="space-y-4">
          <button onClick={addOutcome} className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm">
            + Add Outcome
          </button>
          {course.outcomes.map((outcome) => (
            <div key={outcome.id} className="flex gap-2">
              <input
                type="text"
                value={outcome.label}
                onChange={(e) => updateOutcome(outcome.id, { label: e.target.value })}
                placeholder="LO1"
                className="w-20 p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
              />
              <input
                type="text"
                value={outcome.text}
                onChange={(e) => updateOutcome(outcome.id, { text: e.target.value })}
                placeholder="Outcome description"
                className="flex-1 p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
              />
              <button onClick={() => removeOutcome(outcome.id)} className="text-error">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Lenses */}
      {activeTab === 'lenses' && (
        <div className="space-y-4">
          <button onClick={addLens} className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm">
            + Add Reflection Lens
          </button>
          {course.reflectionLenses.map((lens) => (
            <div key={lens.id} className="border border-outline dark:border-dark-outline p-4">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={lens.label}
                  onChange={(e) => updateLens(lens.id, { label: e.target.value })}
                  placeholder="Lens label"
                  className="flex-1 p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
                />
                <button onClick={() => removeLens(lens.id)} className="text-error">×</button>
              </div>
              <input
                type="text"
                value={lens.description || ''}
                onChange={(e) => updateLens(lens.id, { description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full p-2 border border-outline dark:border-dark-outline bg-transparent text-ink dark:text-dark-ink text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {/* Rubric */}
      {activeTab === 'rubric' && (
        <div className="space-y-4">
          <button onClick={addRubricCheck} className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm">
            + Add Rubric Check
          </button>
          {course.rubrics[0]?.checks.map((check) => (
            <div key={check.id} className="flex gap-2">
              <input
                type="text"
                value={check.label}
                onChange={(e) => updateRubricCheck(check.id, { label: e.target.value })}
                placeholder="Check label"
                className="w-48 p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
              />
              <input
                type="text"
                value={check.description}
                onChange={(e) => updateRubricCheck(check.id, { description: e.target.value })}
                placeholder="Description"
                className="flex-1 p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
              />
              <button onClick={() => removeRubricCheck(check.id)} className="text-error">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Import */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="p-4 bg-surface-container dark:bg-dark-surface-container border border-outline dark:border-dark-outline">
            <h3 className="font-mono text-sm text-ink dark:text-dark-ink mb-2">AI Conversion Instructions</h3>
            <p className="text-sm text-ink-muted dark:text-dark-ink-muted mb-4">
              Copy the prompt below, paste your syllabus, and use ChatGPT or another AI to generate a CoursePack JSON.
            </p>
            <textarea
              readOnly
              value={schemaInstructions}
              rows={10}
              className="w-full p-3 border border-outline dark:border-dark-outline bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink font-mono text-xs"
            />
            <button
              onClick={() => navigator.clipboard.writeText(schemaInstructions)}
              className="mt-2 px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm"
            >
              Copy Instructions
            </button>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Paste CoursePack JSON
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON here..."
              rows={10}
              className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink font-mono text-sm"
            />
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="mt-2 px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm disabled:opacity-50"
            >
              Import JSON
            </button>
          </div>
        </div>
      )}

      {/* Export */}
      <div className="mt-12 pt-8 border-t border-outline dark:border-dark-outline flex gap-4 flex-wrap items-center">
        <button
          onClick={handleInstall}
          disabled={!course.title}
          className="px-6 py-3 border-2 border-ink dark:border-dark-ink bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface hover:bg-transparent hover:text-ink dark:hover:bg-transparent dark:hover:text-dark-ink font-mono text-sm uppercase tracking-wider disabled:opacity-50"
        >
          Install Course & Seed Sources
        </button>
        <button
          onClick={handleExport}
          disabled={!course.title}
          className="px-6 py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider disabled:opacity-50"
        >
          Export CoursePack JSON
        </button>
        <Link
          to="/"
          className="px-6 py-3 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm"
        >
          Back to Home
        </Link>
        {installMessage && (
          <span className="font-mono text-sm text-ink dark:text-dark-ink">{installMessage}</span>
        )}
      </div>
    </div>
  );
}
