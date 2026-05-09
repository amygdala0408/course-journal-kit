import { useCallback, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { getCoursePack } from '../course-packs';
import { getEntries, getSyntheses, saveSynthesis } from '../utils/storage';
import { useDebouncedAutosave, autosavePillText } from '../hooks/useDebouncedAutosave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { FinalSynthesis, SynthesisTheme } from '../schemas/types';

export default function SynthesisPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? getCoursePack(courseId) : null;
  const entries = courseId ? getEntries(courseId) : [];
  const existingSyntheses = courseId ? getSyntheses(courseId) : [];

  const [synthesis, setSynthesis] = useState<FinalSynthesis>(() => {
    if (existingSyntheses.length > 0) {
      return existingSyntheses[0];
    }
    return {
      id: uuidv4(),
      courseId: courseId || '',
      title: 'Final Synthesis',
      introduction: '',
      selectedEntryIds: [],
      themeNotes: [],
      conclusion: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Always persist with the URL's courseId so renaming or re-routing doesn't
  // strand a synthesis on a stale id.
  const effectiveSynthesis: FinalSynthesis = courseId && synthesis.courseId !== courseId
    ? { ...synthesis, courseId }
    : synthesis;

  const canSave = useCallback(
    (s: FinalSynthesis) => Boolean(s.courseId) && Boolean(s.title.trim()),
    [],
  );
  const persist = useCallback((s: FinalSynthesis) => {
    saveSynthesis(s);
  }, []);

  const { status, lastSavedAt, errorMessage, flush } = useDebouncedAutosave({
    value: effectiveSynthesis,
    canSave,
    save: persist,
  });

  useKeyboardShortcuts({ save: () => void flush() });

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-editorial text-2xl text-ink dark:text-dark-ink mb-4">Course not found</h1>
        <Link to="/" className="text-ink-muted dark:text-dark-ink-muted hover:underline">← Back to Home</Link>
      </div>
    );
  }

  const handleSave = () => {
    void flush();
  };

  const toggleEntrySelection = (entryId: string) => {
    const ids = synthesis.selectedEntryIds.includes(entryId)
      ? synthesis.selectedEntryIds.filter((id) => id !== entryId)
      : [...synthesis.selectedEntryIds, entryId];
    setSynthesis({ ...synthesis, selectedEntryIds: ids });
  };

  const addTheme = () => {
    const newTheme: SynthesisTheme = {
      id: uuidv4(),
      title: '',
      entryIds: [],
      notes: '',
      order: synthesis.themeNotes.length,
    };
    setSynthesis({ ...synthesis, themeNotes: [...synthesis.themeNotes, newTheme] });
  };

  const updateTheme = (themeId: string, updates: Partial<SynthesisTheme>) => {
    const themes = synthesis.themeNotes.map((t) => (t.id === themeId ? { ...t, ...updates } : t));
    setSynthesis({ ...synthesis, themeNotes: themes });
  };

  const removeTheme = (themeId: string) => {
    setSynthesis({ ...synthesis, themeNotes: synthesis.themeNotes.filter((t) => t.id !== themeId) });
  };

  const selectedEntries = entries.filter((e) => synthesis.selectedEntryIds.includes(e.id));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
          {course.code}
        </span>
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight mt-1">
          Final Synthesis
        </h1>
        <p className="text-ink-muted dark:text-dark-ink-muted mt-2">
          Bring together your reflections into a cohesive synthesis.
        </p>
      </header>

      {/* Save Button + autosave status */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="px-6 py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider disabled:opacity-50"
        >
          Save Now
        </button>
        <span
          role="status"
          aria-live="polite"
          className={`px-2 py-1 font-mono text-xs uppercase tracking-wider border ${
            status === 'error'
              ? 'border-error text-error'
              : status === 'saved'
              ? 'border-ink dark:border-dark-ink bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface'
              : status === 'saving'
              ? 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink animate-pulse'
              : 'border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted'
          }`}
        >
          {autosavePillText(status, lastSavedAt, errorMessage)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Entry Selection */}
        <div className="col-span-1">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Select Entries ({synthesis.selectedEntryIds.length})
          </h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {course.sections.map((section) => {
              const sectionEntries = entries.filter((e) => e.sectionId === section.id);
              if (sectionEntries.length === 0) return null;

              return (
                <div key={section.id} className="mb-4">
                  <h3 className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mb-2">
                    {course.sectionLabel} {section.number}
                  </h3>
                  {sectionEntries.map((entry) => (
                    <label
                      key={entry.id}
                      className={`flex items-start gap-2 p-2 cursor-pointer border mb-1 ${
                        synthesis.selectedEntryIds.includes(entry.id)
                          ? 'border-ink dark:border-dark-ink bg-surface-container dark:bg-dark-surface-container'
                          : 'border-outline dark:border-dark-outline'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={synthesis.selectedEntryIds.includes(entry.id)}
                        onChange={() => toggleEntrySelection(entry.id)}
                        className="mt-1 w-4 h-4 border border-ink dark:border-dark-ink"
                      />
                      <span className="text-sm text-ink dark:text-dark-ink">
                        {entry.title || 'Untitled'}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Synthesis Content */}
        <div className="col-span-2 space-y-6">
          {/* Title */}
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Title
            </label>
            <input
              type="text"
              value={synthesis.title}
              onChange={(e) => setSynthesis({ ...synthesis, title: e.target.value })}
              className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink font-editorial text-xl"
            />
          </div>

          {/* Introduction */}
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Introduction
            </label>
            <textarea
              value={synthesis.introduction}
              onChange={(e) => setSynthesis({ ...synthesis, introduction: e.target.value })}
              placeholder="Set the stage for your synthesis. What are the main themes you'll explore?"
              rows={4}
              className="w-full p-4 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
            />
          </div>

          {/* Themes */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                Themes ({synthesis.themeNotes.length})
              </label>
              <button
                onClick={addTheme}
                className="font-mono text-xs px-3 py-1 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container"
              >
                + Add Theme
              </button>
            </div>

            <div className="space-y-4">
              {synthesis.themeNotes.map((theme, index) => (
                <div key={theme.id} className="border border-ink dark:border-dark-ink p-4">
                  <div className="flex justify-between items-start mb-3">
                    <input
                      type="text"
                      value={theme.title}
                      onChange={(e) => updateTheme(theme.id, { title: e.target.value })}
                      placeholder={`Theme ${index + 1} title...`}
                      className="flex-1 p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink font-medium"
                    />
                    <button
                      onClick={() => removeTheme(theme.id)}
                      className="ml-2 px-2 py-1 text-error hover:bg-error-container font-mono text-xs"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Entry excerpts for this theme */}
                  <div className="mb-3">
                    <label className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted block mb-2">
                      Link entries to this theme:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntries.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => {
                            const ids = theme.entryIds.includes(entry.id)
                              ? theme.entryIds.filter((id) => id !== entry.id)
                              : [...theme.entryIds, entry.id];
                            updateTheme(theme.id, { entryIds: ids });
                          }}
                          className={`px-2 py-1 text-xs font-mono border ${
                            theme.entryIds.includes(entry.id)
                              ? 'bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface border-ink dark:border-dark-ink'
                              : 'border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted'
                          }`}
                        >
                          {entry.title || 'Untitled'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={theme.notes}
                    onChange={(e) => updateTheme(theme.id, { notes: e.target.value })}
                    placeholder="Your synthesis notes for this theme..."
                    rows={4}
                    className="w-full p-3 border border-outline dark:border-dark-outline bg-transparent text-ink dark:text-dark-ink"
                  />
                </div>
              ))}

              {synthesis.themeNotes.length === 0 && (
                <div className="border-2 border-dashed border-outline dark:border-dark-outline p-8 text-center">
                  <p className="text-ink-muted dark:text-dark-ink-muted">
                    Add themes to organize your synthesis.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Conclusion */}
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
              Conclusion
            </label>
            <textarea
              value={synthesis.conclusion}
              onChange={(e) => setSynthesis({ ...synthesis, conclusion: e.target.value })}
              placeholder="Wrap up your synthesis. What are your key insights? How will you apply what you've learned?"
              rows={4}
              className="w-full p-4 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
