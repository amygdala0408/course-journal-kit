import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getSettings,
  saveSettings,
  clearAllData,
  downloadBackupFile,
  hasDownloadedBackupThisSession,
  getStorageDiagnostics,
  StorageError,
} from '../utils/storage';
import { estimateAttachmentsBytes } from '../utils/attachments';
import { isSyncConfigured } from '../utils/supabaseClient';
import { subscribeSync } from '../utils/sync';
import type { UserSettings } from '../schemas/types';

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(getSettings);
  const [saved, setSaved] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'working' }
    | { kind: 'done'; filename: string }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const [diagnostics, setDiagnostics] = useState(() => getStorageDiagnostics());
  const [attachmentBytes, setAttachmentBytes] = useState<number | null>(null);
  const [syncLine, setSyncLine] = useState<string>(
    isSyncConfigured() ? 'Checking…' : 'Disabled (no Supabase configured).',
  );

  useEffect(() => {
    estimateAttachmentsBytes()
      .then(setAttachmentBytes)
      .catch(() => setAttachmentBytes(null));
  }, []);

  useEffect(() => {
    return subscribeSync((status) => {
      switch (status.kind) {
        case 'disabled':
          setSyncLine('Disabled (no Supabase configured).');
          break;
        case 'signed-out':
          setSyncLine('Signed out — local-only.');
          break;
        case 'idle':
          setSyncLine(
            status.lastSyncAt
              ? `Synced at ${status.lastSyncAt.toLocaleTimeString()}`
              : 'Connected.',
          );
          break;
        case 'syncing':
          setSyncLine('Syncing…');
          break;
        case 'error':
          setSyncLine(`Error: ${status.message}`);
          break;
      }
    });
  }, []);

  const refreshDiagnostics = () => setDiagnostics(getStorageDiagnostics());

  const handleSave = () => {
    try {
      saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refreshDiagnostics();
    } catch (err) {
      const msg =
        err instanceof StorageError ? err.message : 'Could not save settings.';
      alert(msg);
    }
  };

  const handleDownloadBackup = async () => {
    setDownloadStatus({ kind: 'working' });
    try {
      const { filename } = await downloadBackupFile();
      setDownloadStatus({ kind: 'done', filename });
    } catch (err) {
      setDownloadStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Backup download failed.',
      });
    }
  };

  const handleClearData = () => {
    if (!hasDownloadedBackupThisSession()) {
      alert(
        'Please download a backup first (Data Backup section above). This action cannot be undone.',
      );
      return;
    }
    const code = window.prompt(
      'This will delete every entry, source, exploration area, review card, and synthesis on this device. To confirm, type DELETE in capital letters.',
    );
    if (code !== 'DELETE') {
      if (code !== null) alert('Confirmation text did not match. Nothing was deleted.');
      return;
    }
    clearAllData();
    window.location.reload();
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight">
          Settings
        </h1>
        <p className="text-ink-muted dark:text-dark-ink-muted mt-2">
          Configure your Course Journal Kit preferences.
        </p>
      </header>

      <div className="space-y-8">
        {/* Student Name */}
        <section className="p-6 border border-ink dark:border-dark-ink">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Profile
          </h2>
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Student Name
            </label>
            <input
              type="text"
              value={settings.studentName}
              onChange={(e) => setSettings({ ...settings, studentName: e.target.value })}
              placeholder="Your name (appears on public journal)"
              className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
            />
            <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-2">
              This name will appear on your public journal view.
            </p>
          </div>
        </section>

        {/* Appearance */}
        <section className="p-6 border border-ink dark:border-dark-ink">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Appearance
          </h2>
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Dark Mode
            </label>
            <div className="flex gap-2">
              {(['system', 'light', 'dark'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSettings({ ...settings, darkMode: mode })}
                  className={`px-4 py-2 border font-mono text-sm capitalize ${
                    settings.darkMode === mode
                      ? 'bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface border-ink dark:border-dark-ink'
                      : 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Auto-save */}
        <section className="p-6 border border-ink dark:border-dark-ink">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Auto-save
          </h2>
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Autosave debounce (seconds)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={Math.max(1, Math.round(settings.autoSaveInterval / 1000))}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoSaveInterval: Math.min(60, Math.max(1, parseInt(e.target.value) || 2)) * 1000,
                })
              }
              className="w-32 p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
            />
            <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-2">
              How long to wait after your last keystroke before writing to local storage. Smaller
              values (1–3 s) feel snappier; larger values reduce write churn. Saves also trigger on
              <kbd className="px-1 mx-1 border border-outline dark:border-dark-outline">⌘/Ctrl + S</kbd>
              and when you leave the page.
            </p>
          </div>
        </section>

        {/* Default Tags */}
        <section className="p-6 border border-ink dark:border-dark-ink">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Default Tags
          </h2>
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={settings.defaultTags.join(', ')}
              onChange={(e) => setSettings({ ...settings, defaultTags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
              placeholder="e.g., reflection, edtech, practice"
              className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
            />
            <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-2">
              These are auto-applied to every <strong>new</strong> entry, alongside the course code
              and section number. Existing entries are not affected. Spaces become hyphens.
            </p>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="px-6 py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider"
          >
            Save Settings
          </button>
          {saved && (
            <span className="font-mono text-sm text-ink dark:text-dark-ink">✓ Saved</span>
          )}
        </div>

        {/* Data Backup */}
        <section className="p-6 border border-ink dark:border-dark-ink">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Data Backup
          </h2>
          <p className="text-sm text-ink-muted dark:text-dark-ink-muted mb-4">
            Download a self-contained JSON file of every entry, source, attachment,
            exploration area, review card, synthesis, and custom course pack. Keep
            it somewhere outside your browser (cloud drive, USB, email to yourself)
            so a browser reset can't take it down.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void handleDownloadBackup()}
              disabled={downloadStatus.kind === 'working'}
              className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider disabled:opacity-50"
            >
              {downloadStatus.kind === 'working' ? 'Preparing…' : 'Download backup'}
            </button>
            {downloadStatus.kind === 'done' && (
              <span className="font-mono text-xs text-ink dark:text-dark-ink">
                ✓ {downloadStatus.filename}
              </span>
            )}
            {downloadStatus.kind === 'error' && (
              <span className="font-mono text-xs text-error">{downloadStatus.message}</span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 font-mono text-xs">
            <div className="text-ink-muted dark:text-dark-ink-muted">Schema version</div>
            <div className="text-ink dark:text-dark-ink">v{diagnostics.schemaVersion}</div>

            <div className="text-ink-muted dark:text-dark-ink-muted">Live data size</div>
            <div className="text-ink dark:text-dark-ink">{formatBytes(diagnostics.liveBytes)}</div>

            <div className="text-ink-muted dark:text-dark-ink-muted">Auto backup size</div>
            <div className="text-ink dark:text-dark-ink">{formatBytes(diagnostics.backupBytes)}</div>

            <div className="text-ink-muted dark:text-dark-ink-muted">Previous auto backup</div>
            <div className="text-ink dark:text-dark-ink">
              {formatBytes(diagnostics.prevBackupBytes)}
            </div>

            <div className="text-ink-muted dark:text-dark-ink-muted">Last auto backup at</div>
            <div className="text-ink dark:text-dark-ink">
              {diagnostics.lastBackupAt ? diagnostics.lastBackupAt.toLocaleString() : '—'}
            </div>

            <div className="text-ink-muted dark:text-dark-ink-muted">Attachment storage</div>
            <div className="text-ink dark:text-dark-ink">
              {attachmentBytes === null ? '—' : formatBytes(attachmentBytes)}
            </div>
          </div>
        </section>

        {/* Cloud Sync (optional) */}
        <section className="p-6 border border-ink dark:border-dark-ink">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Cloud Sync (Optional)
          </h2>
          <p className="text-sm text-ink-muted dark:text-dark-ink-muted mb-3">
            Status: <span className="font-mono">{syncLine}</span>
          </p>
          <p className="text-sm text-ink-muted dark:text-dark-ink-muted mb-4">
            Course Journal Kit always works offline using your local browser
            storage. Cross-device sync via Supabase is opt-in and requires a
            small one-time setup.
          </p>
          <Link
            to="/account"
            className="inline-block px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider"
          >
            {isSyncConfigured() ? 'Manage account' : 'Set up sync'}
          </Link>
        </section>

        {/* Danger Zone */}
        <section className="p-6 border-2 border-error">
          <h2 className="font-mono text-xs uppercase tracking-wider text-error mb-4">
            Danger Zone
          </h2>
          <p className="text-sm text-ink-muted dark:text-dark-ink-muted mb-4">
            Clear all journal data from this browser. This action cannot be undone.
            You must download a backup in this session before clearing, and then
            type <code className="font-mono">DELETE</code> to confirm.
          </p>
          <button
            onClick={handleClearData}
            className="px-4 py-2 border-2 border-error text-error hover:bg-error hover:text-white font-mono text-sm uppercase tracking-wider"
          >
            Clear All Data
          </button>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="p-6 border border-outline dark:border-dark-outline bg-surface-container dark:bg-dark-surface-container">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Keyboard Shortcuts
          </h2>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            <div className="text-ink-muted dark:text-dark-ink-muted">Save entry</div>
            <div className="text-ink dark:text-dark-ink">⌘/Ctrl + S</div>
            <div className="text-ink-muted dark:text-dark-ink-muted">Toggle sidebar</div>
            <div className="text-ink dark:text-dark-ink">⌘/Ctrl + B</div>
            <div className="text-ink-muted dark:text-dark-ink-muted">Next section</div>
            <div className="text-ink dark:text-dark-ink">⌘/Ctrl + →</div>
            <div className="text-ink-muted dark:text-dark-ink-muted">Previous section</div>
            <div className="text-ink dark:text-dark-ink">⌘/Ctrl + ←</div>
          </div>
        </section>

        {/* Back Link */}
        <div className="pt-4">
          <Link
            to="/"
            className="font-mono text-sm text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
