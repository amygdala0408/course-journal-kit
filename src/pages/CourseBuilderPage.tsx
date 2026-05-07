import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { downloadJSON } from '../utils/export';
import { installCustomCoursePack } from '../utils/storage';
import {
  importCoursePack,
  type CoursePackImportResult,
  type CoursePackImportSummary,
} from '../utils/coursePackImport';
import { SYLLABUS_TO_COURSE_PACK_PROMPT } from '../data/prompts';
import type {
  CoursePack,
  CourseSection,
  CourseTopic,
  CourseOutcome,
  ReflectionLens,
  RubricCheck,
} from '../schemas/types';
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
  const [importResult, setImportResult] = useState<CoursePackImportResult | null>(null);
  const [importPreview, setImportPreview] = useState<{
    coursePack: CoursePack;
    summary: CoursePackImportSummary;
    warnings: string[];
  } | null>(null);
  const [promptCopyState, setPromptCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [installMessage, setInstallMessage] = useState('');
  const [activeTab, setActiveTab] = useState<
    'basic' | 'sections' | 'outcomes' | 'lenses' | 'rubric' | 'import'
  >('basic');

  const promptText = useMemo(() => SYLLABUS_TO_COURSE_PACK_PROMPT.body, []);

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

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    setImportResult(null);
    setImportPreview(null);
  };

  const handleValidateImport = () => {
    const result = importCoursePack(importText);
    setImportResult(result);
    if (result.ok) {
      setImportPreview({
        coursePack: result.coursePack,
        summary: result.summary,
        warnings: result.warnings,
      });
    } else {
      setImportPreview(null);
    }
  };

  const handleAdoptImport = () => {
    if (!importPreview) return;
    setCourse(importPreview.coursePack);
    setInstallMessage('');
    setActiveTab('sections');
  };

  const handleInstallFromImport = () => {
    if (!importPreview) return;
    const installable = prepareCourseForInstall(importPreview.coursePack);
    const sourceCount = installCustomCoursePack(installable);
    setCourse(installable);
    setInstallMessage(
      `Installed ${installable.title} with ${sourceCount} syllabus source${sourceCount === 1 ? '' : 's'}.`,
    );
    navigate(`/course/${installable.id}`);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setPromptCopyState('copied');
      window.setTimeout(() => setPromptCopyState('idle'), 1800);
    } catch {
      setPromptCopyState('error');
      window.setTimeout(() => setPromptCopyState('idle'), 2400);
    }
  };

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
        {(
          [
            { id: 'basic', label: 'Basic' },
            { id: 'sections', label: 'Sections' },
            { id: 'outcomes', label: 'Outcomes' },
            { id: 'lenses', label: 'Lenses' },
            { id: 'rubric', label: 'Rubric' },
            { id: 'import', label: 'Import from AI' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border font-mono text-sm ${
              activeTab === tab.id
                ? 'bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface border-ink dark:border-dark-ink'
                : 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink'
            }`}
          >
            {tab.label}
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

      {/* Import from AI */}
      {activeTab === 'import' && (
        <div className="space-y-8">
          <div className="p-4 bg-surface-container dark:bg-dark-surface-container border border-outline dark:border-dark-outline">
            <h2 className="font-editorial text-2xl font-semibold text-ink dark:text-dark-ink mb-2">
              Build a course from a syllabus, with help from an AI you trust
            </h2>
            <p className="text-sm text-ink-muted dark:text-dark-ink-muted">
              Syllabi are messy. Instead of guessing, copy the vetted prompt below
              into Claude, ChatGPT, or Perplexity along with your syllabus. The AI
              returns a strict CoursePack JSON. Paste it here and Course Journal Kit
              validates and installs it.
            </p>
          </div>

          {/* Step 1 — copy prompt */}
          <section className="border border-ink dark:border-dark-ink p-6">
            <header className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-1">
                  Step 1
                </p>
                <h3 className="font-editorial text-xl font-semibold text-ink dark:text-dark-ink">
                  Copy the syllabus → CoursePack prompt
                </h3>
              </div>
              <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">
                Recommended: {SYLLABUS_TO_COURSE_PACK_PROMPT.recommendedTools.join(' · ')}
              </span>
            </header>
            <p className="text-sm text-ink-muted dark:text-dark-ink-muted mb-4">
              {SYLLABUS_TO_COURSE_PACK_PROMPT.summary}
            </p>
            <textarea
              readOnly
              value={promptText}
              rows={12}
              className="w-full p-3 border border-outline dark:border-dark-outline bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink font-mono text-xs"
              aria-label="Syllabus to CoursePack prompt"
            />
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleCopyPrompt}
                className="px-4 py-2 border-2 border-ink dark:border-dark-ink bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface hover:bg-transparent hover:text-ink dark:hover:bg-transparent dark:hover:text-dark-ink font-mono text-sm uppercase tracking-wider"
              >
                Copy prompt
              </button>
              {promptCopyState === 'copied' && (
                <span className="font-mono text-xs text-ink dark:text-dark-ink">
                  Copied — paste it into your AI chat, then attach or paste your syllabus.
                </span>
              )}
              {promptCopyState === 'error' && (
                <span className="font-mono text-xs text-error">
                  Couldn&rsquo;t copy automatically. Select all and copy manually.
                </span>
              )}
            </div>
          </section>

          {/* Step 2 — paste reply */}
          <section className="border border-ink dark:border-dark-ink p-6">
            <header className="mb-4">
              <p className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-1">
                Step 2
              </p>
              <h3 className="font-editorial text-xl font-semibold text-ink dark:text-dark-ink">
                Paste the AI&rsquo;s reply
              </h3>
              <p className="text-sm text-ink-muted dark:text-dark-ink-muted mt-2">
                Paste the entire reply or upload the saved <code>.md</code>/<code>.json</code> file.
                The validator strips markdown wrapping and only installs once the structure looks safe.
              </p>
            </header>

            <div className="mb-4">
              <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
                Upload AI reply (optional)
              </label>
              <input
                type="file"
                accept=".md,.markdown,.json,.txt"
                onChange={(event) => handleImportFile(event.target.files?.[0])}
                className="block w-full p-3 border border-outline dark:border-dark-outline bg-transparent text-ink dark:text-dark-ink"
              />
            </div>

            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Or paste the reply
            </label>
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                if (importResult) setImportResult(null);
                if (importPreview) setImportPreview(null);
              }}
              placeholder={'```json\n{\n  "title": "...",\n  "sections": [ ... ]\n}\n```'}
              rows={14}
              className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink font-mono text-sm"
            />
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleValidateImport}
                disabled={!importText.trim()}
                className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider disabled:opacity-50"
              >
                Validate & Preview
              </button>
              {importResult && !importResult.ok && (
                <span className="font-mono text-xs text-error">
                  Validation failed — see details below.
                </span>
              )}
            </div>

            {/* Errors */}
            {importResult && !importResult.ok && (
              <div className="mt-6 border-2 border-error p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-error mb-2">
                  Errors
                </p>
                <ul className="text-sm text-ink dark:text-dark-ink space-y-1">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
                <p className="text-xs text-ink-muted dark:text-dark-ink-muted mt-3">
                  Tip: ask the AI to &ldquo;regenerate, output ONLY a fenced ```json block, no prose.&rdquo;
                </p>
              </div>
            )}

            {/* Preview + warnings + install */}
            {importPreview && (
              <div className="mt-6 border-2 border-ink dark:border-dark-ink p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
                  Preview
                </p>
                <h4 className="font-editorial text-lg font-semibold text-ink dark:text-dark-ink">
                  {importPreview.coursePack.title}
                  {importPreview.coursePack.code && (
                    <span className="font-mono text-sm text-ink-muted dark:text-dark-ink-muted ml-2">
                      {importPreview.coursePack.code}
                    </span>
                  )}
                </h4>
                {importPreview.coursePack.description && (
                  <p className="text-sm text-ink-muted dark:text-dark-ink-muted mt-1">
                    {importPreview.coursePack.description}
                  </p>
                )}

                <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="border border-outline dark:border-dark-outline p-2">
                    <dt className="uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                      {importPreview.coursePack.sectionLabel}s
                    </dt>
                    <dd className="text-ink dark:text-dark-ink text-base">
                      {importPreview.summary.sectionCount}
                    </dd>
                  </div>
                  <div className="border border-outline dark:border-dark-outline p-2">
                    <dt className="uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                      Required sources
                    </dt>
                    <dd className="text-ink dark:text-dark-ink text-base">
                      {importPreview.summary.sourceCount}
                      {importPreview.summary.uploadNeededCount > 0 && (
                        <span className="text-ink-muted dark:text-dark-ink-muted text-xs ml-1">
                          ({importPreview.summary.uploadNeededCount} need uploads)
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="border border-outline dark:border-dark-outline p-2">
                    <dt className="uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                      Outcomes
                    </dt>
                    <dd className="text-ink dark:text-dark-ink text-base">
                      {importPreview.summary.outcomeCount}
                    </dd>
                  </div>
                  <div className="border border-outline dark:border-dark-outline p-2">
                    <dt className="uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                      Topics
                    </dt>
                    <dd className="text-ink dark:text-dark-ink text-base">
                      {importPreview.summary.topicCount}
                    </dd>
                  </div>
                  <div className="border border-outline dark:border-dark-outline p-2">
                    <dt className="uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                      Reflection lenses
                    </dt>
                    <dd className="text-ink dark:text-dark-ink text-base">
                      {importPreview.summary.lensCount}
                    </dd>
                  </div>
                  <div className="border border-outline dark:border-dark-outline p-2">
                    <dt className="uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                      Assignments
                    </dt>
                    <dd className="text-ink dark:text-dark-ink text-base">
                      {importPreview.summary.assignmentCount}
                    </dd>
                  </div>
                </dl>

                <details className="mt-4">
                  <summary className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted cursor-pointer">
                    Section list ({importPreview.summary.sectionCount})
                  </summary>
                  <ol className="mt-2 space-y-1 text-sm text-ink dark:text-dark-ink list-decimal pl-5">
                    {importPreview.coursePack.sections.map((s) => (
                      <li key={s.id}>
                        <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mr-2">
                          {importPreview.coursePack.sectionLabel} {s.number}
                        </span>
                        {s.title}
                        <span className="text-ink-muted dark:text-dark-ink-muted text-xs ml-2">
                          · {s.requiredSources?.length ?? 0} sources
                        </span>
                      </li>
                    ))}
                  </ol>
                </details>

                {importPreview.warnings.length > 0 && (
                  <div className="mt-4 border border-outline dark:border-dark-outline p-3">
                    <p className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
                      Warnings ({importPreview.warnings.length})
                    </p>
                    <ul className="text-sm text-ink dark:text-dark-ink space-y-1">
                      {importPreview.warnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={handleInstallFromImport}
                    className="px-6 py-3 border-2 border-ink dark:border-dark-ink bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface hover:bg-transparent hover:text-ink dark:hover:bg-transparent dark:hover:text-dark-ink font-mono text-sm uppercase tracking-wider"
                  >
                    Install Course
                  </button>
                  <button
                    onClick={handleAdoptImport}
                    className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm"
                  >
                    Edit before installing
                  </button>
                </div>
              </div>
            )}
          </section>
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
