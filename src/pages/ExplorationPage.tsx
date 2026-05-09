import { useCallback, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { getCoursePack } from '../course-packs';
import { getFurtherExplorationAreas, saveFurtherExplorationArea, deleteFurtherExplorationArea } from '../utils/storage';
import { useDebouncedAutosave, autosavePillText } from '../hooks/useDebouncedAutosave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { FurtherExplorationArea, Resource } from '../schemas/types';

export default function ExplorationPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? getCoursePack(courseId) : null;
  
  const [areas, setAreas] = useState<FurtherExplorationArea[]>(() =>
    courseId ? getFurtherExplorationAreas(courseId) : []
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingArea = useMemo(
    () => areas.find((a) => a.id === editingId) ?? null,
    [areas, editingId],
  );

  const canSaveArea = useCallback(
    (a: FurtherExplorationArea | null) => Boolean(a && a.title.trim()),
    [],
  );
  const persistArea = useCallback((a: FurtherExplorationArea | null) => {
    if (!a) return;
    saveFurtherExplorationArea(a);
  }, []);

  const { status, lastSavedAt, errorMessage, flush } = useDebouncedAutosave({
    value: editingArea,
    canSave: canSaveArea,
    save: persistArea,
    enabled: Boolean(editingArea),
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

  const minRequired = course.requirements.minimumFurtherExplorationAreas || 3;
  const meetsRequirement = areas.length >= minRequired;

  const addArea = () => {
    const newArea: FurtherExplorationArea = {
      id: uuidv4(),
      courseId: course.id,
      title: '',
      description: '',
      relatedSectionIds: [],
      relatedTags: [],
      resources: [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAreas([...areas, newArea]);
    setEditingId(newArea.id);
  };

  const updateArea = (areaId: string, updates: Partial<FurtherExplorationArea>) => {
    setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, ...updates } : a)));
  };

  const saveArea = () => {
    void flush();
    setEditingId(null);
  };

  const removeArea = (areaId: string) => {
    if (!confirm('Are you sure you want to delete this exploration area?')) return;
    deleteFurtherExplorationArea(areaId);
    setAreas(areas.filter((a) => a.id !== areaId));
    if (editingId === areaId) setEditingId(null);
  };

  const addResourceToArea = (areaId: string) => {
    const area = areas.find((a) => a.id === areaId);
    if (!area) return;

    const newResource: Resource = {
      id: uuidv4(),
      title: '',
      type: 'article',
      addedAt: new Date().toISOString(),
    };

    updateArea(areaId, { resources: [...area.resources, newResource] });
  };

  const updateResourceInArea = (areaId: string, resourceId: string, updates: Partial<Resource>) => {
    const area = areas.find((a) => a.id === areaId);
    if (!area) return;

    const resources = area.resources.map((r) => (r.id === resourceId ? { ...r, ...updates } : r));
    updateArea(areaId, { resources });
  };

  const removeResourceFromArea = (areaId: string, resourceId: string) => {
    const area = areas.find((a) => a.id === areaId);
    if (!area) return;

    updateArea(areaId, { resources: area.resources.filter((r) => r.id !== resourceId) });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
          {course.code}
        </span>
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight mt-1">
          Further Exploration
        </h1>
        <p className="text-ink-muted dark:text-dark-ink-muted mt-2">
          Track topics you want to explore beyond the course requirements.
        </p>
      </header>

      {/* Requirement Status */}
      <section className={`mb-8 p-4 border-2 ${meetsRequirement ? 'border-ink dark:border-dark-ink' : 'border-outline dark:border-dark-outline'}`}>
        <div className="flex justify-between items-center">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
              Requirement
            </span>
            <p className="text-ink dark:text-dark-ink">
              Minimum {minRequired} exploration areas
            </p>
          </div>
          <div className="text-right">
            <span className={`font-mono text-2xl font-bold ${meetsRequirement ? 'text-ink dark:text-dark-ink' : 'text-outline dark:text-dark-outline'}`}>
              {areas.length}/{minRequired}
            </span>
            {meetsRequirement && (
              <span className="block font-mono text-xs text-ink-muted dark:text-dark-ink-muted">✓ Met</span>
            )}
          </div>
        </div>
      </section>

      {/* Add Button */}
      <div className="mb-6">
        <button
          onClick={addArea}
          className="px-6 py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider"
        >
          + Add Exploration Area
        </button>
      </div>

      {/* Areas List */}
      {areas.length === 0 ? (
        <div className="border-2 border-dashed border-outline dark:border-dark-outline p-12 text-center">
          <p className="text-ink-muted dark:text-dark-ink-muted mb-4">
            No exploration areas yet. Add topics you want to explore further.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {areas.map((area) => {
            const isEditing = editingId === area.id;

            return (
              <div key={area.id} className="border border-ink dark:border-dark-ink p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={area.title}
                      onChange={(e) => updateArea(area.id, { title: e.target.value })}
                      placeholder="Exploration area title..."
                      className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink font-editorial text-xl"
                    />
                    <textarea
                      value={area.description}
                      onChange={(e) => updateArea(area.id, { description: e.target.value })}
                      placeholder="Why are you interested in this topic? What do you want to learn?"
                      rows={3}
                      className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
                    />

                    {/* Related Sections */}
                    <div>
                      <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
                        Related {course.sectionLabel}s
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {course.sections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => {
                              const ids = area.relatedSectionIds.includes(section.id)
                                ? area.relatedSectionIds.filter((id) => id !== section.id)
                                : [...area.relatedSectionIds, section.id];
                              updateArea(area.id, { relatedSectionIds: ids });
                            }}
                            className={`px-3 py-1 border text-xs font-mono ${
                              area.relatedSectionIds.includes(section.id)
                                ? 'bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface border-ink dark:border-dark-ink'
                                : 'border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted'
                            }`}
                          >
                            {course.sectionLabel} {section.number}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <textarea
                      value={area.notes}
                      onChange={(e) => updateArea(area.id, { notes: e.target.value })}
                      placeholder="Additional notes, ideas, questions..."
                      rows={3}
                      className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
                    />

                    {/* Resources */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                          Resources
                        </label>
                        <button
                          onClick={() => addResourceToArea(area.id)}
                          className="font-mono text-xs px-2 py-1 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container"
                        >
                          + Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {area.resources.map((resource) => (
                          <div key={resource.id} className="flex gap-2">
                            <input
                              type="text"
                              value={resource.title}
                              onChange={(e) => updateResourceInArea(area.id, resource.id, { title: e.target.value })}
                              placeholder="Resource title"
                              className="flex-1 p-2 border border-outline dark:border-dark-outline bg-transparent text-ink dark:text-dark-ink text-sm"
                            />
                            <input
                              type="url"
                              value={resource.url || ''}
                              onChange={(e) => updateResourceInArea(area.id, resource.id, { url: e.target.value })}
                              placeholder="URL"
                              className="flex-1 p-2 border border-outline dark:border-dark-outline bg-transparent text-ink dark:text-dark-ink text-sm"
                            />
                            <button
                              onClick={() => removeResourceFromArea(area.id, resource.id)}
                              className="px-2 text-error hover:bg-error-container"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-4 items-center">
                      <button
                        onClick={saveArea}
                        className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm"
                      >
                        Save & Close
                      </button>
                      <button
                        onClick={() => removeArea(area.id)}
                        className="px-4 py-2 border border-error text-error hover:bg-error hover:text-white font-mono text-sm"
                      >
                        Delete
                      </button>
                      {editingId === area.id && (
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
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-editorial text-xl font-medium text-ink dark:text-dark-ink">
                        {area.title || 'Untitled Area'}
                      </h3>
                      <button
                        onClick={() => setEditingId(area.id)}
                        className="font-mono text-xs px-3 py-1 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container"
                      >
                        Edit
                      </button>
                    </div>
                    {area.description && (
                      <p className="text-ink-muted dark:text-dark-ink-muted mb-4">
                        {area.description}
                      </p>
                    )}
                    {area.relatedSectionIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {area.relatedSectionIds.map((sectionId) => {
                          const section = course.sections.find((s) => s.id === sectionId);
                          return section ? (
                            <span key={sectionId} className="font-mono text-xs px-2 py-1 bg-surface-container-high dark:bg-dark-surface-container text-ink-muted dark:text-dark-ink-muted">
                              {course.sectionLabel} {section.number}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    {area.resources.length > 0 && (
                      <div className="text-sm text-ink-muted dark:text-dark-ink-muted">
                        {area.resources.length} resource{area.resources.length !== 1 ? 's' : ''} added
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
