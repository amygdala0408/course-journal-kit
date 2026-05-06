import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { getCoursePack } from '../course-packs';
import { getEntry, saveEntry, deleteEntry, getSources, saveSource } from '../utils/storage';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { JournalEntry, Resource, CourseSource, Artifact, ArtifactType } from '../schemas/types';

const emptyEntry = (courseId: string, sectionId: string): JournalEntry => ({
  id: uuidv4(),
  courseId,
  sectionId,
  title: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notes: '',
  summary: '',
  keyConcepts: '',
  reflection: '',
  personalConnection: '',
  professionalApplication: '',
  questions: '',
  ethicalEquityConsiderations: '',
  keyTakeaways: '',
  selectedLenses: [],
  resources: [],
  artifacts: [],
  tags: [],
  confidenceRating: undefined,
  aiUseDisclosure: '',
  published: false,
});

export default function EntryPage() {
  const { courseId, entryId } = useParams<{ courseId: string; entryId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const course = courseId ? getCoursePack(courseId) : null;
  const sectionIdFromUrl = searchParams.get('section') || '';
  
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [sectionSources, setSectionSources] = useState<CourseSource[]>([]);
  const [showQuickAddSource, setShowQuickAddSource] = useState(false);
  const [showArtifactModal, setShowArtifactModal] = useState(false);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);

  useEffect(() => {
    if (!courseId) return;
    
    if (entryId && entryId !== 'new') {
      const existing = getEntry(entryId);
      if (existing) {
        setEntry(existing);
        setSectionSources(getSources(courseId, existing.sectionId));
      } else {
        navigate(`/course/${courseId}`);
      }
    } else {
      const sectionId = sectionIdFromUrl || course?.sections[0]?.id || '';
      setEntry(emptyEntry(courseId, sectionId));
      setSectionSources(getSources(courseId, sectionId));
    }
  }, [courseId, entryId, sectionIdFromUrl, course, navigate]);

  // Update sources when section changes
  useEffect(() => {
    if (entry && courseId) {
      setSectionSources(getSources(courseId, entry.sectionId));
    }
  }, [entry?.sectionId, courseId]);

  const handleSave = useCallback(() => {
    if (!entry) return;
    
    setSaving(true);
    saveEntry(entry);
    setLastSaved(new Date());
    setSaving(false);
  }, [entry]);

  useKeyboardShortcuts({
    save: handleSave,
  });

  const handleDelete = () => {
    if (!entry || !confirm('Are you sure you want to delete this entry?')) return;
    deleteEntry(entry.id);
    navigate(`/course/${courseId}/section/${entry.sectionId}`);
  };

  const updateField = (field: keyof JournalEntry, value: unknown) => {
    if (!entry) return;
    setEntry({ ...entry, [field]: value, updatedAt: new Date().toISOString() });
  };

  const addTag = () => {
    if (!entry || !tagInput.trim()) return;
    const newTag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!entry.tags.includes(newTag)) {
      updateField('tags', [...entry.tags, newTag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    if (!entry) return;
    updateField('tags', entry.tags.filter((t) => t !== tag));
  };

  const toggleLens = (lensId: string) => {
    if (!entry) return;
    const lenses = entry.selectedLenses.includes(lensId)
      ? entry.selectedLenses.filter((l) => l !== lensId)
      : [...entry.selectedLenses, lensId];
    updateField('selectedLenses', lenses);
  };

  const addResource = () => {
    if (!entry) return;
    const newResource: Resource = {
      id: uuidv4(),
      title: '',
      type: 'article',
      addedAt: new Date().toISOString(),
    };
    updateField('resources', [...entry.resources, newResource]);
  };

  const updateResource = (resourceId: string, updates: Partial<Resource>) => {
    if (!entry) return;
    const resources = entry.resources.map((r) =>
      r.id === resourceId ? { ...r, ...updates } : r
    );
    updateField('resources', resources);
  };

  const removeResource = (resourceId: string) => {
    if (!entry) return;
    updateField('resources', entry.resources.filter((r) => r.id !== resourceId));
  };

  if (!course || !entry) {
    return (
      <div className="p-8 text-center">
        <p className="text-ink-muted dark:text-dark-ink-muted">Loading...</p>
      </div>
    );
  }

  const section = course.sections.find((s) => s.id === entry.sectionId);

  return (
    <div className="flex h-full">
      {/* Main Editor */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link
            to={`/course/${courseId}/section/${entry.sectionId}`}
            className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
          >
            ← {course.sectionLabel} {section?.number}: {section?.title}
          </Link>
        </nav>

        {/* Title */}
        <input
          type="text"
          value={entry.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Entry title..."
          className="w-full font-editorial text-4xl font-semibold text-ink dark:text-dark-ink bg-transparent border-none outline-none placeholder:text-outline dark:placeholder:text-dark-outline mb-8"
        />

        {/* Section Selector */}
        <div className="mb-8">
          <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
            {course.sectionLabel}
          </label>
          <select
            value={entry.sectionId}
            onChange={(e) => updateField('sectionId', e.target.value)}
            className="w-full max-w-md p-3 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
          >
            {course.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {course.sectionLabel} {s.number}: {s.title}
              </option>
            ))}
          </select>
        </div>

        {/* Content Fields */}
        <div className="space-y-8 max-w-3xl">
          <TextAreaField
            label="Notes"
            value={entry.notes}
            onChange={(v) => updateField('notes', v)}
            placeholder="Your raw notes, observations, and initial thoughts..."
            rows={6}
          />

          <TextAreaField
            label="Summary"
            value={entry.summary}
            onChange={(v) => updateField('summary', v)}
            placeholder="A brief summary of the key points..."
            rows={3}
          />

          <TextAreaField
            label="Key Concepts"
            value={entry.keyConcepts}
            onChange={(v) => updateField('keyConcepts', v)}
            placeholder="Important concepts, terms, and ideas..."
            rows={4}
          />

          <TextAreaField
            label="Reflection"
            value={entry.reflection}
            onChange={(v) => updateField('reflection', v)}
            placeholder="Your deeper thoughts and analysis..."
            rows={6}
          />

          <TextAreaField
            label="Personal Connection"
            value={entry.personalConnection}
            onChange={(v) => updateField('personalConnection', v)}
            placeholder="How does this connect to your personal experience?"
            rows={4}
          />

          <TextAreaField
            label="Professional Application"
            value={entry.professionalApplication}
            onChange={(v) => updateField('professionalApplication', v)}
            placeholder="How will you apply this in your professional practice?"
            rows={4}
          />

          <TextAreaField
            label="Questions"
            value={entry.questions}
            onChange={(v) => updateField('questions', v)}
            placeholder="Questions that arose, problems of practice, areas for further inquiry..."
            rows={4}
          />

          <TextAreaField
            label="Ethical & Equity Considerations"
            value={entry.ethicalEquityConsiderations}
            onChange={(v) => updateField('ethicalEquityConsiderations', v)}
            placeholder="Ethical issues, equity concerns, accessibility considerations..."
            rows={4}
          />

          <TextAreaField
            label="Key Takeaways"
            value={entry.keyTakeaways}
            onChange={(v) => updateField('keyTakeaways', v)}
            placeholder="The most important things to remember..."
            rows={4}
          />

          <TextAreaField
            label="AI Use Disclosure"
            value={entry.aiUseDisclosure || ''}
            onChange={(v) => updateField('aiUseDisclosure', v)}
            placeholder="How did you use AI tools in this entry? (e.g., 'Used ChatGPT to find sources')"
            rows={2}
          />

          {/* Resources */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                Resources ({entry.resources.length})
              </label>
              <button
                onClick={addResource}
                className="font-mono text-xs px-3 py-1 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
              >
                + Add Resource
              </button>
            </div>
            <div className="space-y-3">
              {entry.resources.map((resource) => (
                <div key={resource.id} className="border border-outline dark:border-dark-outline p-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={resource.title}
                      onChange={(e) => updateResource(resource.id, { title: e.target.value })}
                      placeholder="Resource title"
                      className="p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
                    />
                    <select
                      value={resource.type}
                      onChange={(e) => updateResource(resource.id, { type: e.target.value as Resource['type'] })}
                      className="p-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
                    >
                      <option value="article">Article</option>
                      <option value="book">Book</option>
                      <option value="video">Video</option>
                      <option value="podcast">Podcast</option>
                      <option value="website">Website</option>
                      <option value="tool">Tool</option>
                      <option value="document">Document</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <input
                    type="url"
                    value={resource.url || ''}
                    onChange={(e) => updateResource(resource.id, { url: e.target.value })}
                    placeholder="URL (optional)"
                    className="w-full p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink mb-3"
                  />
                  <input
                    type="text"
                    value={resource.citation || ''}
                    onChange={(e) => updateResource(resource.id, { citation: e.target.value })}
                    placeholder="Citation (optional)"
                    className="w-full p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink mb-3"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeResource(resource.id)}
                      className="font-mono text-xs text-error hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Artifacts / Visual Evidence */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                Artifacts & Visuals ({entry.artifacts?.length || 0})
              </label>
              <button
                onClick={() => {
                  setEditingArtifact(null);
                  setShowArtifactModal(true);
                }}
                className="font-mono text-xs px-3 py-1 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
              >
                + Add Artifact
              </button>
            </div>
            
            {/* Artifact Gallery */}
            {entry.artifacts && entry.artifacts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {entry.artifacts.map((artifact) => (
                  <ArtifactCard
                    key={artifact.id}
                    artifact={artifact}
                    onEdit={() => {
                      setEditingArtifact(artifact);
                      setShowArtifactModal(true);
                    }}
                    onDelete={() => {
                      updateField('artifacts', entry.artifacts.filter(a => a.id !== artifact.id));
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-outline dark:border-dark-outline p-8 text-center">
                <p className="text-ink-muted dark:text-dark-ink-muted text-sm mb-2">
                  No artifacts yet
                </p>
                <p className="text-ink-muted dark:text-dark-ink-muted text-xs">
                  Add images, infographics, diagrams, or embedded tools to showcase your learning
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sources Panel */}
      {showSourcesPanel && (
        <aside className="w-80 border-l border-ink dark:border-dark-ink overflow-y-auto bg-surface dark:bg-dark-surface">
          <div className="p-4 border-b border-ink dark:border-dark-ink flex justify-between items-center sticky top-0 bg-surface dark:bg-dark-surface">
            <h3 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
              Sources for {course.sectionLabel} {section?.number}
            </h3>
            <button
              onClick={() => setShowSourcesPanel(false)}
              className="text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
            >
              ✕
            </button>
          </div>
          
          {sectionSources.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-ink-muted dark:text-dark-ink-muted text-sm mb-4">
                No sources added for this {course.sectionLabel.toLowerCase()} yet.
              </p>
              <Link
                to={`/course/${courseId}/section/${entry.sectionId}/sources`}
                className="font-mono text-xs px-3 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
              >
                Add Sources
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-outline dark:divide-dark-outline">
              {sectionSources.map((source) => (
                <SourcePanelCard
                  key={source.id}
                  source={source}
                  onInsertNote={(text) => {
                    updateField('notes', entry.notes + (entry.notes ? '\n\n' : '') + text);
                  }}
                  onInsertQuote={(quote) => {
                    const quoteText = `"${quote.text}"${quote.page ? ` (p. ${quote.page})` : ''} — ${source.title}`;
                    updateField('notes', entry.notes + (entry.notes ? '\n\n' : '') + quoteText);
                  }}
                />
              ))}
            </div>
          )}
          
          <div className="p-4 border-t border-outline dark:border-dark-outline space-y-2">
            <button
              onClick={() => setShowQuickAddSource(true)}
              className="w-full py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-xs uppercase tracking-wider"
            >
              + Quick Add Source
            </button>
            <Link
              to={`/course/${courseId}/section/${entry.sectionId}/sources`}
              className="block text-center font-mono text-xs text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
            >
              Manage All Sources →
            </Link>
          </div>
        </aside>
      )}

      {/* Quick Add Source Modal */}
      {showQuickAddSource && (
        <QuickAddSourceModal
          courseId={courseId!}
          sectionId={entry.sectionId}
          onSave={(newSource) => {
            saveSource(newSource);
            setSectionSources(getSources(courseId, entry.sectionId));
            setShowQuickAddSource(false);
          }}
          onCancel={() => setShowQuickAddSource(false)}
        />
      )}

      {/* Artifact Modal */}
      {showArtifactModal && (
        <ArtifactModal
          artifact={editingArtifact}
          onSave={(artifact) => {
            const currentArtifacts = entry.artifacts || [];
            if (editingArtifact) {
              // Update existing
              updateField('artifacts', currentArtifacts.map(a => a.id === artifact.id ? artifact : a));
            } else {
              // Add new
              updateField('artifacts', [...currentArtifacts, artifact]);
            }
            setShowArtifactModal(false);
            setEditingArtifact(null);
          }}
          onCancel={() => {
            setShowArtifactModal(false);
            setEditingArtifact(null);
          }}
        />
      )}

      {/* Sidebar */}
      <aside className="w-72 border-l border-ink dark:border-dark-ink p-6 overflow-y-auto bg-surface-container dark:bg-dark-surface-container">
        {/* Sources Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowSourcesPanel(!showSourcesPanel)}
            className={`w-full py-3 border font-mono text-sm uppercase tracking-wider ${
              showSourcesPanel 
                ? 'bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface border-ink dark:border-dark-ink'
                : 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container dark:hover:bg-dark-surface-container'
            }`}
          >
            {showSourcesPanel ? 'Hide Sources' : `Sources (${sectionSources.length})`}
          </button>
        </div>

        {/* Draft from Sources */}
        {sectionSources.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => {
                const completedSources = sectionSources.filter(s => s.readingStatus === 'completed');
                if (completedSources.length === 0) {
                  alert('Mark at least one source as "completed" to draft from sources.');
                  return;
                }
                
                let draft = `## Sources Summary for ${course.sectionLabel} ${section?.number}\n\n`;
                
                completedSources.forEach((source, i) => {
                  draft += `### ${i + 1}. ${source.title}\n`;
                  if (source.authors) draft += `*${source.authors}*\n\n`;
                  
                  if (source.notes) {
                    draft += `**Key Points:**\n${source.notes}\n\n`;
                  }
                  
                  if (source.keyQuotes.length > 0) {
                    draft += `**Notable Quotes:**\n`;
                    source.keyQuotes.forEach(q => {
                      draft += `> "${q.text}"${q.page ? ` (p. ${q.page})` : ''}\n`;
                      if (q.note) draft += `> *Note: ${q.note}*\n`;
                      draft += '\n';
                    });
                  }
                  
                  if (source.questions) {
                    draft += `**Questions:**\n${source.questions}\n\n`;
                  }
                  
                  if (source.connections) {
                    draft += `**Connections:**\n${source.connections}\n\n`;
                  }
                  
                  draft += '---\n\n';
                });
                
                draft += `## My Reflection\n\n[Your synthesis and reflection here...]\n`;
                
                if (entry.notes && !confirm('This will replace your current notes. Continue?')) {
                  return;
                }
                
                updateField('notes', draft);
              }}
              className="w-full py-2 border border-outline dark:border-dark-outline text-ink dark:text-dark-ink hover:border-ink dark:hover:border-dark-ink font-mono text-xs uppercase tracking-wider"
            >
              Draft from Sources
            </button>
            <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-1 text-center">
              Compile notes from completed sources
            </p>
          </div>
        )}

        {/* Save Status */}
        <div className="mb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
          {lastSaved && (
            <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-2 text-center">
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Publish Toggle */}
        <div className="mb-6 p-4 border border-ink dark:border-dark-ink">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={entry.published}
              onChange={(e) => updateField('published', e.target.checked)}
              className="w-5 h-5 border-2 border-ink dark:border-dark-ink"
            />
            <span className="font-mono text-sm text-ink dark:text-dark-ink">
              Published
            </span>
          </label>
          <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-2">
            Published entries appear in your public journal.
          </p>
        </div>

        {/* Confidence Rating */}
        <div className="mb-6">
          <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
            Confidence Rating
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => updateField('confidenceRating', rating)}
                className={`w-10 h-10 border text-sm font-mono ${
                  entry.confidenceRating === rating
                    ? 'bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface border-ink dark:border-dark-ink'
                    : 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="Add tag..."
              className="flex-1 p-2 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink text-sm"
            />
            <button
              onClick={addTag}
              className="px-3 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 font-mono text-xs px-2 py-1 bg-surface-container-high dark:bg-dark-surface-container text-ink dark:text-dark-ink"
              >
                #{tag}
                <button onClick={() => removeTag(tag)} className="hover:text-error">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Reflection Lenses */}
        <div className="mb-6">
          <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
            Reflection Lenses
          </label>
          <div className="space-y-2">
            {course.reflectionLenses.map((lens) => (
              <label
                key={lens.id}
                className="flex items-start gap-2 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={entry.selectedLenses.includes(lens.id)}
                  onChange={() => toggleLens(lens.id)}
                  className="mt-1 w-4 h-4 border border-ink dark:border-dark-ink"
                />
                <span className="text-ink dark:text-dark-ink">{lens.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Delete */}
        {entryId && entryId !== 'new' && (
          <button
            onClick={handleDelete}
            className="w-full py-2 border border-error text-error hover:bg-error hover:text-white font-mono text-xs uppercase tracking-wider"
          >
            Delete Entry
          </button>
        )}
      </aside>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full p-4 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink placeholder:text-outline dark:placeholder:text-dark-outline resize-y"
      />
    </div>
  );
}

function SourcePanelCard({
  source,
  onInsertNote,
  onInsertQuote,
}: {
  source: CourseSource;
  onInsertNote: (text: string) => void;
  onInsertQuote: (quote: { text: string; page?: string }) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-medium text-ink dark:text-dark-ink text-sm">
              {source.title}
            </h4>
            {source.authors && (
              <p className="text-xs text-ink-muted dark:text-dark-ink-muted">
                {source.authors}
              </p>
            )}
          </div>
          <span className={`text-xs px-1.5 py-0.5 border ${
            source.readingStatus === 'completed' 
              ? 'bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface border-ink dark:border-dark-ink' 
              : 'border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted'
          }`}>
            {source.readingStatus === 'completed' ? '✓' : source.readingStatus === 'in-progress' ? '◐' : '○'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Notes */}
          {source.notes && (
            <div className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">Notes</span>
                <button
                  onClick={() => onInsertNote(source.notes)}
                  className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
                >
                  Insert ↓
                </button>
              </div>
              <p className="text-ink-muted dark:text-dark-ink-muted text-xs line-clamp-3">
                {source.notes}
              </p>
            </div>
          )}

          {/* Key Quotes */}
          {source.keyQuotes.length > 0 && (
            <div>
              <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase block mb-1">
                Quotes ({source.keyQuotes.length})
              </span>
              <div className="space-y-2">
                {source.keyQuotes.map((quote) => (
                  <div key={quote.id} className="text-xs border-l-2 border-outline dark:border-dark-outline pl-2">
                    <p className="text-ink-muted dark:text-dark-ink-muted italic line-clamp-2">
                      "{quote.text}"
                    </p>
                    <button
                      onClick={() => onInsertQuote(quote)}
                      className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink mt-1"
                    >
                      Insert quote ↓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions */}
          {source.questions && (
            <div className="text-sm">
              <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase block mb-1">Questions</span>
              <p className="text-ink-muted dark:text-dark-ink-muted text-xs line-clamp-2">
                {source.questions}
              </p>
            </div>
          )}

          {/* Key Terms */}
          {source.keyTerms.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {source.keyTerms.map((term, i) => (
                <span key={i} className="font-mono text-xs px-1.5 py-0.5 bg-surface-container dark:bg-dark-surface-container text-ink-muted dark:text-dark-ink-muted">
                  {term}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickAddSourceModal({
  courseId,
  sectionId,
  onSave,
  onCancel,
}: {
  courseId: string;
  sectionId: string;
  onSave: (source: CourseSource) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isAssigned, setIsAssigned] = useState(false);

  const handleSave = () => {
    if (!title.trim()) return;
    
    const now = new Date().toISOString();
    const newSource: CourseSource = {
      id: uuidv4(),
      courseId,
      sectionId,
      title: title.trim(),
      authors: authors.trim() || undefined,
      url: url.trim() || undefined,
      type: 'article',
      isAssigned,
      isSupplementary: !isAssigned,
      readingStatus: 'unread',
      notes: notes.trim(),
      keyQuotes: [],
      keyTerms: [],
      questions: '',
      connections: '',
      tags: [],
      addedAt: now,
      updatedAt: now,
    };
    
    onSave(newSource);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface dark:bg-dark-surface border-2 border-ink dark:border-dark-ink w-full max-w-md mx-4">
        <div className="p-4 border-b border-ink dark:border-dark-ink flex justify-between items-center">
          <h3 className="font-editorial text-lg font-medium text-ink dark:text-dark-ink">
            Quick Add Source
          </h3>
          <button
            onClick={onCancel}
            className="text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
              placeholder="Source title"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-1">
              Authors
            </label>
            <input
              type="text"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
              placeholder="Author names"
            />
          </div>
          
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-1">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
              placeholder="https://..."
            />
          </div>
          
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-1">
              Quick Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
              placeholder="Initial thoughts, why this source is relevant..."
            />
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAssigned}
              onChange={(e) => setIsAssigned(e.target.checked)}
              className="w-4 h-4 border border-ink dark:border-dark-ink"
            />
            <span className="text-sm text-ink dark:text-dark-ink">
              This is an assigned reading
            </span>
          </label>
        </div>
        
        <div className="p-4 border-t border-outline dark:border-dark-outline flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted hover:border-ink dark:hover:border-dark-ink hover:text-ink dark:hover:text-dark-ink font-mono text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm disabled:opacity-50"
          >
            Add Source
          </button>
        </div>
      </div>
    </div>
  );
}

function ArtifactCard({
  artifact,
  onEdit,
  onDelete,
}: {
  artifact: Artifact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isEmbed = artifact.type === 'embed' || artifact.type === 'tool';
  const isImage = artifact.type === 'image' || artifact.type === 'infographic' || artifact.type === 'diagram';
  
  return (
    <div className="border border-outline dark:border-dark-outline overflow-hidden group">
      {/* Preview */}
      <div className="aspect-video bg-surface-container dark:bg-dark-surface-container relative overflow-hidden">
        {isImage ? (
          <img
            src={artifact.url}
            alt={artifact.altText || artifact.title}
            className="w-full h-full object-cover"
          />
        ) : isEmbed ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <span className="text-3xl mb-2 block">🔗</span>
              <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">
                {artifact.type}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl">📄</span>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink font-mono text-xs"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 bg-error text-white font-mono text-xs"
          >
            Delete
          </button>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h4 className="font-medium text-sm text-ink dark:text-dark-ink truncate">
          {artifact.title}
        </h4>
        {artifact.caption && (
          <p className="text-xs text-ink-muted dark:text-dark-ink-muted mt-1 line-clamp-2">
            {artifact.caption}
          </p>
        )}
        <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase mt-2 block">
          {artifact.type}
        </span>
      </div>
    </div>
  );
}

function ArtifactModal({
  artifact,
  onSave,
  onCancel,
}: {
  artifact: Artifact | null;
  onSave: (artifact: Artifact) => void;
  onCancel: () => void;
}) {
  const isNew = !artifact;
  const [title, setTitle] = useState(artifact?.title || '');
  const [type, setType] = useState<ArtifactType>(artifact?.type || 'image');
  const [url, setUrl] = useState(artifact?.url || '');
  const [altText, setAltText] = useState(artifact?.altText || '');
  const [caption, setCaption] = useState(artifact?.caption || '');
  const [reflection, setReflection] = useState(artifact?.reflection || '');
  const [imagePreview, setImagePreview] = useState<string | null>(artifact?.url || null);

  const artifactTypes: { value: ArtifactType; label: string; description: string }[] = [
    { value: 'image', label: 'Image', description: 'Photo or screenshot' },
    { value: 'infographic', label: 'Infographic', description: 'Visual data representation' },
    { value: 'diagram', label: 'Diagram', description: 'Flowchart, concept map, etc.' },
    { value: 'embed', label: 'Embed', description: 'External content (CodePen, Observable, etc.)' },
    { value: 'tool', label: 'Tool', description: 'Interactive tool you created' },
    { value: 'video', label: 'Video', description: 'Video content' },
    { value: 'other', label: 'Other', description: 'Other visual artifact' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUrl(dataUrl);
      setImagePreview(dataUrl);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!title.trim() || !url.trim()) return;
    
    const newArtifact: Artifact = {
      id: artifact?.id || uuidv4(),
      type,
      title: title.trim(),
      url,
      altText: altText.trim() || undefined,
      caption: caption.trim() || undefined,
      reflection: reflection.trim() || undefined,
      tags: [],
      createdAt: artifact?.createdAt || new Date().toISOString(),
    };
    
    onSave(newArtifact);
  };

  const isImageType = type === 'image' || type === 'infographic' || type === 'diagram';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface dark:bg-dark-surface border-2 border-ink dark:border-dark-ink w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-ink dark:border-dark-ink flex justify-between items-center">
          <h2 className="font-editorial text-xl font-medium text-ink dark:text-dark-ink">
            {isNew ? 'Add Artifact' : 'Edit Artifact'}
          </h2>
          <button
            onClick={onCancel}
            className="text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
              Artifact Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {artifactTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`p-2 border text-left ${
                    type === t.value
                      ? 'border-ink dark:border-dark-ink bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface'
                      : 'border-outline dark:border-dark-outline text-ink dark:text-dark-ink hover:border-ink dark:hover:border-dark-ink'
                  }`}
                >
                  <span className="font-mono text-xs block">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Title */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
              placeholder="What is this artifact?"
            />
          </div>
          
          {/* URL or File Upload */}
          {isImageType ? (
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
                Image
              </label>
              <div className="space-y-3">
                {/* File Upload */}
                <div className="border-2 border-dashed border-outline dark:border-dark-outline p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="artifact-file-upload"
                  />
                  <label
                    htmlFor="artifact-file-upload"
                    className="cursor-pointer"
                  >
                    <span className="text-2xl block mb-2">📁</span>
                    <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">
                      Click to upload or drag & drop
                    </span>
                  </label>
                </div>
                
                {/* Or URL */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-outline dark:bg-dark-outline" />
                  <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">or</span>
                  <div className="flex-1 h-px bg-outline dark:bg-dark-outline" />
                </div>
                
                <input
                  type="url"
                  value={url.startsWith('data:') ? '' : url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setImagePreview(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
                  placeholder="Paste image URL"
                />
                
                {/* Preview */}
                {imagePreview && (
                  <div className="border border-outline dark:border-dark-outline p-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-48 mx-auto"
                      onError={() => setImagePreview(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
                Embed URL *
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
                placeholder="https://codepen.io/... or embed URL"
              />
              <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-1">
                Paste the embed URL from CodePen, Observable, Figma, etc.
              </p>
            </div>
          )}
          
          {/* Alt Text (for images) */}
          {isImageType && (
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
                Alt Text (for accessibility)
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
                placeholder="Describe the image for screen readers"
              />
            </div>
          )}
          
          {/* Caption */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
              Caption
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
              placeholder="Brief caption shown below the artifact"
            />
          </div>
          
          {/* Reflection */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
              Reflection (optional)
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
              placeholder="What does this artifact demonstrate about your learning?"
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-outline dark:border-dark-outline flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted hover:border-ink dark:hover:border-dark-ink hover:text-ink dark:hover:text-dark-ink font-mono text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !url.trim()}
            className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm disabled:opacity-50"
          >
            {isNew ? 'Add Artifact' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
