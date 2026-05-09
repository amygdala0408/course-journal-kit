import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCoursePack } from '../course-packs';
import {
  getEntries,
  getFurtherExplorationAreas,
  getSyntheses,
  getSettings,
  exportJournalDataWithAttachments,
  importJournalData,
  exportPublishedJournal,
} from '../utils/storage';
import { isSyncConfigured } from '../utils/supabaseClient';
import { publishShareSnapshot } from '../utils/sync';
import type { ImportMode, ImportResult } from '../utils/storage';
import { journalToMarkdown, downloadMarkdown, downloadJSON, printToPDF } from '../utils/export';

export default function ExportPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? getCoursePack(courseId) : null;
  const entries = courseId ? getEntries(courseId) : [];
  const explorationAreas = courseId ? getFurtherExplorationAreas(courseId) : [];
  const syntheses = courseId ? getSyntheses(courseId) : [];
  const settings = getSettings();

  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [snapshotState, setSnapshotState] = useState<
    | { kind: 'idle' }
    | { kind: 'publishing' }
    | { kind: 'done'; url: string }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-editorial text-2xl text-ink dark:text-dark-ink mb-4">Course not found</h1>
        <Link to="/" className="text-ink-muted dark:text-dark-ink-muted hover:underline">← Back to Home</Link>
      </div>
    );
  }

  const publishedEntries = entries.filter((e) => e.published);
  const synthesis = syntheses[0];

  const handleExportJSON = async () => {
    const data = await exportJournalDataWithAttachments();
    downloadJSON(JSON.parse(data), `course-journal-kit-backup-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPublishedJSON = () => {
    const published = exportPublishedJournal(course.id, settings.studentName);
    downloadJSON(published, `${course.id}-published-journal-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportMarkdown = () => {
    const md = journalToMarkdown(course, publishedEntries, explorationAreas, synthesis, settings.studentName);
    downloadMarkdown(md, `${course.id}-journal-${new Date().toISOString().split('T')[0]}`);
  };

  const handleImport = () => {
    if (!importText.trim()) return;

    if (
      importMode === 'replace' &&
      !confirm(
        'Replace will overwrite ALL local journal data with the contents of this backup. Existing entries that are not in the backup will be deleted. Continue?'
      )
    ) {
      return;
    }

    const result = importJournalData(importText, importMode);
    setImportResult(result);

    if (result.success) {
      setImportText('');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  const generateShareUrl = async () => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/public/${course.id}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error('Could not copy share link:', error);
    }
  };

  const handlePublishSnapshot = async () => {
    setSnapshotState({ kind: 'publishing' });
    try {
      const snapshot = exportPublishedJournal(course.id, settings.studentName);
      const { url } = await publishShareSnapshot(snapshot);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // copying is best-effort
      }
      setSnapshotState({ kind: 'done', url });
    } catch (err) {
      setSnapshotState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not publish snapshot.',
      });
    }
  };

  const totalAdded = importResult
    ? Object.values(importResult.added).reduce((a, b) => a + b, 0)
    : 0;
  const totalUpdated = importResult
    ? Object.values(importResult.updated).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
          {course.code}
        </span>
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight mt-1">
          Export & Share
        </h1>
        <p className="text-ink-muted dark:text-dark-ink-muted mt-2">
          Export your journal data, share your public journal, or import a backup.
        </p>
      </header>

      {/* Stats */}
      <section className="mb-8 p-6 border-2 border-ink dark:border-dark-ink">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Journal Summary
        </h2>
        <div className="grid grid-cols-4 gap-4 font-mono">
          <div>
            <div className="text-2xl font-bold text-ink dark:text-dark-ink">{entries.length}</div>
            <div className="text-xs text-ink-muted dark:text-dark-ink-muted uppercase">Total Entries</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink dark:text-dark-ink">{publishedEntries.length}</div>
            <div className="text-xs text-ink-muted dark:text-dark-ink-muted uppercase">Published</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink dark:text-dark-ink">{explorationAreas.length}</div>
            <div className="text-xs text-ink-muted dark:text-dark-ink-muted uppercase">Exploration Areas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink dark:text-dark-ink">{synthesis ? 'Yes' : 'No'}</div>
            <div className="text-xs text-ink-muted dark:text-dark-ink-muted uppercase">Synthesis</div>
          </div>
        </div>
      </section>

      {/* Share */}
      <section className="mb-8 p-6 border border-ink dark:border-dark-ink">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Share Public Journal
        </h2>
        <p className="text-sm text-ink-muted dark:text-dark-ink-muted mb-4">
          The link below opens a clean, read-only view of your <strong>published</strong> entries plus
          your further-exploration areas and final synthesis. Drafts stay private. Only people you
          send the link to can find it.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={generateShareUrl}
            className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm"
          >
            {copyStatus === 'copied' ? 'Link copied ✓' : 'Copy Public Link'}
          </button>
          <Link
            to={`/public/${course.id}`}
            target="_blank"
            className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm"
          >
            Preview Public View →
          </Link>
          {isSyncConfigured() && (
            <button
              onClick={() => void handlePublishSnapshot()}
              disabled={snapshotState.kind === 'publishing'}
              className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm disabled:opacity-50"
              title="Push a snapshot of your published entries to Supabase and get a /share/:id URL that works on any device."
            >
              {snapshotState.kind === 'publishing' ? 'Publishing…' : 'Publish snapshot'}
            </button>
          )}
        </div>
        {snapshotState.kind === 'done' && (
          <div className="mt-3 p-3 bg-surface-container dark:bg-dark-surface-container">
            <p className="font-mono text-xs text-ink dark:text-dark-ink break-all">
              ✓ Cross-device share URL (copied):{' '}
              <a href={snapshotState.url} className="underline">
                {snapshotState.url}
              </a>
            </p>
          </div>
        )}
        {snapshotState.kind === 'error' && (
          <p className="mt-3 font-mono text-xs text-error">{snapshotState.message}</p>
        )}
        {shareUrl && (
          <div className="mt-4 p-3 bg-surface-container dark:bg-dark-surface-container">
            <p className="font-mono text-sm text-ink dark:text-dark-ink break-all">{shareUrl}</p>
            <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-1">
              {publishedEntries.length === 0
                ? 'Heads up: you have no published entries yet, so this page will look empty until you publish at least one.'
                : `Showing ${publishedEntries.length} published entr${publishedEntries.length === 1 ? 'y' : 'ies'}.`}
            </p>
          </div>
        )}
      </section>

      {/* Export Options */}
      <section className="mb-8 p-6 border border-ink dark:border-dark-ink">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Export Options
        </h2>
        <div className="grid gap-4">
          <div className="flex justify-between items-center p-4 border border-outline dark:border-dark-outline">
            <div>
              <h3 className="font-medium text-ink dark:text-dark-ink">Full Backup (JSON)</h3>
              <p className="text-sm text-ink-muted dark:text-dark-ink-muted">All entries, settings, and data</p>
            </div>
            <button
              onClick={() => void handleExportJSON()}
              className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm"
            >
              Download
            </button>
          </div>

          <div className="flex justify-between items-center p-4 border border-outline dark:border-dark-outline">
            <div>
              <h3 className="font-medium text-ink dark:text-dark-ink">Published Journal (JSON)</h3>
              <p className="text-sm text-ink-muted dark:text-dark-ink-muted">Only published entries for deployment</p>
            </div>
            <button
              onClick={handleExportPublishedJSON}
              className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm"
            >
              Download
            </button>
          </div>

          <div className="flex justify-between items-center p-4 border border-outline dark:border-dark-outline">
            <div>
              <h3 className="font-medium text-ink dark:text-dark-ink">Markdown Export</h3>
              <p className="text-sm text-ink-muted dark:text-dark-ink-muted">Published journal as readable Markdown</p>
            </div>
            <button
              onClick={handleExportMarkdown}
              className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm"
            >
              Download
            </button>
          </div>

          <div className="flex justify-between items-center p-4 border border-outline dark:border-dark-outline">
            <div>
              <h3 className="font-medium text-ink dark:text-dark-ink">PDF Export</h3>
              <p className="text-sm text-ink-muted dark:text-dark-ink-muted">Print public view to PDF</p>
            </div>
            <button
              onClick={() => {
                window.open(`/public/${course.id}`, '_blank');
                setTimeout(printToPDF, 1000);
              }}
              className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm"
            >
              Open & Print
            </button>
          </div>
        </div>
      </section>

      {/* Import */}
      <section className="mb-8 p-6 border border-ink dark:border-dark-ink">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Import Backup
        </h2>
        <p className="text-sm text-ink-muted dark:text-dark-ink-muted mb-4">
          Paste a previously exported JSON backup to restore your data. Choose how to combine it with what you have today.
        </p>

        <fieldset className="mb-4 space-y-2">
          <legend className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-1">
            Import mode
          </legend>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="import-mode"
              value="merge"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
              className="mt-1"
            />
            <span className="text-sm text-ink dark:text-dark-ink">
              <strong>Merge</strong>{' '}
              <span className="text-ink-muted dark:text-dark-ink-muted">
                — keep my current data and add anything new. Items with the same id keep the more
                recently updated copy. Default tags from both sides are combined.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="import-mode"
              value="replace"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
              className="mt-1"
            />
            <span className="text-sm text-ink dark:text-dark-ink">
              <strong>Replace</strong>{' '}
              <span className="text-ink-muted dark:text-dark-ink-muted">
                — wipe my current local data and use the backup as the new source of truth. Only
                use this when restoring on a fresh machine or after intentional data loss.
              </span>
            </span>
          </label>
        </fieldset>

        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste JSON backup here..."
          rows={6}
          className="w-full p-4 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink font-mono text-sm mb-4"
        />
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm disabled:opacity-50"
          >
            {importMode === 'merge' ? 'Merge Backup' : 'Replace With Backup'}
          </button>
          {importResult?.success && (
            <span className="font-mono text-sm text-ink dark:text-dark-ink">
              ✓ {importResult.mode === 'replace'
                ? `Replaced data with ${totalAdded} record${totalAdded === 1 ? '' : 's'}.`
                : `Added ${totalAdded}, updated ${totalUpdated}.`}{' '}
              Reloading…
            </span>
          )}
          {importResult && !importResult.success && (
            <span className="font-mono text-sm text-error">
              ✗ {importResult.error || 'Import failed. Check JSON format.'}
            </span>
          )}
        </div>
        {importResult?.success && importResult.mode === 'merge' && (
          <details className="mt-4 font-mono text-xs text-ink-muted dark:text-dark-ink-muted">
            <summary className="cursor-pointer">Merge breakdown</summary>
            <ul className="mt-2 space-y-1">
              <li>Entries: +{importResult.added.entries} new, {importResult.updated.entries} updated</li>
              <li>Sources: +{importResult.added.sources} new, {importResult.updated.sources} updated</li>
              <li>Exploration areas: +{importResult.added.explorationAreas} new, {importResult.updated.explorationAreas} updated</li>
              <li>Review cards: +{importResult.added.reviewCards} new, {importResult.updated.reviewCards} updated</li>
              <li>Syntheses: +{importResult.added.syntheses} new, {importResult.updated.syntheses} updated</li>
              <li>Course packs: +{importResult.added.customCoursePacks} new, {importResult.updated.customCoursePacks} updated</li>
            </ul>
          </details>
        )}
      </section>

      {/* Deployment Instructions */}
      <section className="p-6 border border-outline dark:border-dark-outline bg-surface-container dark:bg-dark-surface-container">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Static Deployment Instructions
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-ink-muted dark:text-dark-ink-muted">
          <li>Export your published journal as JSON using the button above</li>
          <li>Copy the JSON content</li>
          <li>Paste it into <code className="bg-surface-container-high dark:bg-dark-surface px-1">src/data/published-journals/{course.id}-journal.ts</code></li>
          <li>Commit and redeploy your site</li>
          <li>Your public journal will be available at <code className="bg-surface-container-high dark:bg-dark-surface px-1">/public/{course.id}</code></li>
        </ol>
      </section>
    </div>
  );
}
