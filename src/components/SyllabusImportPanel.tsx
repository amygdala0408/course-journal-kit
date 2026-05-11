import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  importCoursePack,
  type CoursePackImportResult,
  type CoursePackImportSummary,
} from '../utils/coursePackImport';
import { prepareCourseForInstall } from '../utils/prepareCourseForInstall';
import { installCustomCoursePack } from '../utils/storage';
import { SYLLABUS_TO_COURSE_PACK_PROMPT } from '../data/prompts';
import type { CoursePack } from '../schemas/types';

type SyllabusImportPanelProps = {
  /**
   * When true, renders a tighter layout suitable for embedding on the home
   * page: the prompt textarea starts collapsed behind a "Show prompt" toggle
   * and the intro copy is trimmed. The full validate + install flow still
   * works the same.
   */
  compact?: boolean;
};

type ImportPreview = {
  coursePack: CoursePack;
  summary: CoursePackImportSummary;
  warnings: string[];
};

export default function SyllabusImportPanel({ compact = false }: SyllabusImportPanelProps) {
  const navigate = useNavigate();
  const promptText = useMemo(() => SYLLABUS_TO_COURSE_PACK_PROMPT.body, []);

  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<CoursePackImportResult | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [promptCopyState, setPromptCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [promptExpanded, setPromptExpanded] = useState(!compact);
  const [installMessage, setInstallMessage] = useState('');

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

  const handleInstallFromImport = () => {
    if (!importPreview) return;
    const installable = prepareCourseForInstall(importPreview.coursePack);
    const sourceCount = installCustomCoursePack(installable);
    setInstallMessage(
      `Installed ${installable.title} with ${sourceCount} syllabus source${sourceCount === 1 ? '' : 's'}.`,
    );
    navigate(`/course/${installable.id}`);
  };

  return (
    <div className={compact ? 'space-y-6' : 'space-y-8'}>
      {!compact && (
        <div className="p-4 bg-surface-container dark:bg-dark-surface-container border border-outline dark:border-dark-outline">
          <h2 className="font-editorial text-2xl font-semibold text-ink dark:text-dark-ink mb-2">
            Build a course from a syllabus, with help from an AI you trust
          </h2>
          <p className="text-sm text-ink-muted dark:text-dark-ink-muted">
            Syllabi are messy. Instead of guessing, copy the vetted prompt below into Claude,
            ChatGPT, or Perplexity along with your syllabus. The AI returns a strict CoursePack
            JSON. Paste it here and Course Journal Kit validates and installs it.
          </p>
        </div>
      )}

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

        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button
            onClick={handleCopyPrompt}
            className="px-4 py-2 border-2 border-ink dark:border-dark-ink bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface hover:bg-transparent hover:text-ink dark:hover:bg-transparent dark:hover:text-dark-ink font-mono text-sm uppercase tracking-wider"
          >
            Copy prompt
          </button>
          {compact && (
            <button
              onClick={() => setPromptExpanded((value) => !value)}
              className="px-3 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-xs uppercase tracking-wider"
              aria-expanded={promptExpanded}
            >
              {promptExpanded ? 'Hide prompt' : 'Show prompt'}
            </button>
          )}
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

        {promptExpanded && (
          <textarea
            readOnly
            value={promptText}
            rows={compact ? 8 : 12}
            className="w-full p-3 border border-outline dark:border-dark-outline bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink font-mono text-xs"
            aria-label="Syllabus to CoursePack prompt"
          />
        )}
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
          onChange={(event) => {
            setImportText(event.target.value);
            if (importResult) setImportResult(null);
            if (importPreview) setImportPreview(null);
          }}
          placeholder={'```json\n{\n  "title": "...",\n  "sections": [ ... ]\n}\n```'}
          rows={compact ? 8 : 14}
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

        {importResult && !importResult.ok && (
          <div className="mt-6 border-2 border-error p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-error mb-2">Errors</p>
            <ul className="text-sm text-ink dark:text-dark-ink space-y-1">
              {importResult.errors.map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
            </ul>
            <p className="text-xs text-ink-muted dark:text-dark-ink-muted mt-3">
              Tip: ask the AI to &ldquo;regenerate, output ONLY a fenced ```json block, no
              prose.&rdquo;
            </p>
          </div>
        )}

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
                {importPreview.coursePack.sections.map((section) => (
                  <li key={section.id}>
                    <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mr-2">
                      {importPreview.coursePack.sectionLabel} {section.number}
                    </span>
                    {section.title}
                    <span className="text-ink-muted dark:text-dark-ink-muted text-xs ml-2">
                      · {section.requiredSources?.length ?? 0} sources
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
                  {importPreview.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3 items-center">
              <button
                onClick={handleInstallFromImport}
                className="px-6 py-3 border-2 border-ink dark:border-dark-ink bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface hover:bg-transparent hover:text-ink dark:hover:bg-transparent dark:hover:text-dark-ink font-mono text-sm uppercase tracking-wider"
              >
                Install Course
              </button>
              {installMessage && (
                <span className="font-mono text-xs text-ink dark:text-dark-ink">
                  {installMessage}
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
