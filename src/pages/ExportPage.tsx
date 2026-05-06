import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCoursePack } from '../course-packs';
import { getEntries, getFurtherExplorationAreas, getSyntheses, getSettings, exportJournalData, importJournalData, exportPublishedJournal } from '../utils/storage';
import { journalToMarkdown, downloadMarkdown, downloadJSON, printToPDF } from '../utils/export';

export default function ExportPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? getCoursePack(courseId) : null;
  const entries = courseId ? getEntries(courseId) : [];
  const explorationAreas = courseId ? getFurtherExplorationAreas(courseId) : [];
  const syntheses = courseId ? getSyntheses(courseId) : [];
  const settings = getSettings();

  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState('');

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

  const handleExportJSON = () => {
    const data = exportJournalData();
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
    
    const success = importJournalData(importText);
    setImportStatus(success ? 'success' : 'error');
    
    if (success) {
      setImportText('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const generateShareUrl = () => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/public/${course.id}`;
    setShareUrl(url);
    navigator.clipboard.writeText(url);
  };

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
          Generate a shareable link to your public journal. Only published entries will be visible.
        </p>
        <div className="flex gap-3">
          <button
            onClick={generateShareUrl}
            className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm"
          >
            Generate & Copy Link
          </button>
          <Link
            to={`/public/${course.id}`}
            target="_blank"
            className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm"
          >
            Preview Public View →
          </Link>
        </div>
        {shareUrl && (
          <div className="mt-4 p-3 bg-surface-container dark:bg-dark-surface-container">
            <p className="font-mono text-sm text-ink dark:text-dark-ink break-all">{shareUrl}</p>
            <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-1">Link copied to clipboard!</p>
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
              onClick={handleExportJSON}
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
          Paste a previously exported JSON backup to restore your data. This will merge with existing data.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste JSON backup here..."
          rows={6}
          className="w-full p-4 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink font-mono text-sm mb-4"
        />
        <div className="flex items-center gap-4">
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm disabled:opacity-50"
          >
            Import Data
          </button>
          {importStatus === 'success' && (
            <span className="font-mono text-sm text-ink dark:text-dark-ink">✓ Import successful! Reloading...</span>
          )}
          {importStatus === 'error' && (
            <span className="font-mono text-sm text-error">✗ Import failed. Check JSON format.</span>
          )}
        </div>
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
