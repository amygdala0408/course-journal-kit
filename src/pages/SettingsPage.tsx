import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSettings, saveSettings, clearAllData } from '../utils/storage';
import type { UserSettings } from '../schemas/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(getSettings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear ALL journal data? This cannot be undone.')) {
      if (confirm('This will delete all entries, exploration areas, review cards, and syntheses. Are you absolutely sure?')) {
        clearAllData();
        window.location.reload();
      }
    }
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

        {/* Danger Zone */}
        <section className="p-6 border-2 border-error">
          <h2 className="font-mono text-xs uppercase tracking-wider text-error mb-4">
            Danger Zone
          </h2>
          <p className="text-sm text-ink-muted dark:text-dark-ink-muted mb-4">
            Clear all journal data from localStorage. This action cannot be undone.
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
