import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { getCoursePack } from '../course-packs';
import {
  getSources,
  saveSource,
  deleteSource,
  getSettings,
  StorageError,
} from '../utils/storage';
import {
  deleteAttachment,
  getAttachmentObjectUrl,
  isAttachmentsAvailable,
  putAttachment,
} from '../utils/attachments';
import { buildCitationFromInputs, suggestCitationTemplate } from '../utils/citations';
import { fetchUrlMetadata } from '../utils/metadata';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { CourseSource, SourceQuote, ResourceType } from '../schemas/types';

type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

type ViewMode = 'list' | 'detail' | 'add' | 'search';

export default function SourcesPage() {
  const { courseId, sectionId } = useParams<{ courseId: string; sectionId?: string }>();
  const course = courseId ? getCoursePack(courseId) : null;
  const [sources, setSources] = useState<CourseSource[]>(() => 
    getSources(courseId, sectionId)
  );
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSource, setSelectedSource] = useState<CourseSource | null>(null);
  const [filterSection, setFilterSection] = useState<string>(sectionId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-editorial text-2xl text-ink dark:text-dark-ink mb-4">Course not found</h1>
        <Link to="/" className="text-ink-muted dark:text-dark-ink-muted hover:underline">← Back to Home</Link>
      </div>
    );
  }

  const refreshSources = () => {
    const sectionFilter = filterSection === 'all' ? undefined : filterSection;
    setSources(getSources(courseId, sectionFilter));
  };

  const filteredSources = sources.filter((s) => {
    if (filterStatus !== 'all' && s.readingStatus !== filterStatus) return false;
    return true;
  });

  const assignedSources = filteredSources.filter((s) => s.isAssigned);
  const supplementarySources = filteredSources.filter((s) => s.isSupplementary);

  const createNewSource = (isAssigned: boolean) => {
    const now = new Date().toISOString();
    const newSource: CourseSource = {
      id: uuidv4(),
      courseId: courseId!,
      sectionId: filterSection === 'all' ? course.sections[0]?.id || '' : filterSection,
      title: '',
      type: 'article',
      isAssigned,
      isSupplementary: !isAssigned,
      readingStatus: 'unread',
      notes: '',
      keyQuotes: [],
      keyTerms: [],
      questions: '',
      connections: '',
      tags: [],
      addedAt: now,
      updatedAt: now,
    };
    setSelectedSource(newSource);
    setViewMode('add');
  };

  const handleSaveSource = (source: CourseSource) => {
    saveSource(source);
    refreshSources();
    setSelectedSource(null);
    setViewMode('list');
  };

  const handleDeleteSource = (sourceId: string) => {
    if (confirm('Delete this source and all notes?')) {
      deleteSource(sourceId);
      refreshSources();
      setSelectedSource(null);
      setViewMode('list');
    }
  };

  const openSourceDetail = (source: CourseSource) => {
    setSelectedSource(source);
    setViewMode('detail');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface';
      case 'in-progress': return 'bg-surface-container dark:bg-dark-surface-container border-2 border-ink dark:border-dark-ink';
      default: return 'border border-outline dark:border-dark-outline';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
          {course.code}
        </span>
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight mt-1">
          Sources & Readings
        </h1>
        <p className="text-ink-muted dark:text-dark-ink-muted mt-2">
          Manage assigned readings and supplementary sources. Add notes, quotes, and questions to inform your reflections.
        </p>
      </header>

      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-4 mb-8 items-center justify-between">
        <div className="flex gap-4 items-center">
          <select
            value={filterSection}
            onChange={(e) => {
              setFilterSection(e.target.value);
              const sectionFilter = e.target.value === 'all' ? undefined : e.target.value;
              setSources(getSources(courseId, sectionFilter));
            }}
            className="px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink font-mono text-sm"
          >
            <option value="all">All {course.sectionLabel}s</option>
            {course.sections.map((section) => (
              <option key={section.id} value={section.id}>
                {course.sectionLabel} {section.number}: {section.title}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink font-mono text-sm"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => createNewSource(true)}
            className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink font-mono text-sm uppercase tracking-wider hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
          >
            + Assigned Reading
          </button>
          <button
            onClick={() => createNewSource(false)}
            className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink font-mono text-sm uppercase tracking-wider hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
          >
            + Supplementary
          </button>
          <button
            onClick={() => setViewMode('search')}
            className="px-4 py-2 border border-outline dark:border-dark-outline text-ink dark:text-dark-ink font-mono text-sm uppercase tracking-wider hover:border-ink dark:hover:border-dark-ink"
          >
            Search Sources
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-8">
          {/* Assigned Readings */}
          <section>
            <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
              Assigned Readings ({assignedSources.length})
            </h2>
            {assignedSources.length === 0 ? (
              <div className="p-6 border border-dashed border-outline dark:border-dark-outline text-center">
                <p className="text-ink-muted dark:text-dark-ink-muted">No assigned readings added yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignedSources.map((source) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    course={course}
                    onClick={() => openSourceDetail(source)}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Supplementary Sources */}
          <section>
            <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
              Supplementary Sources ({supplementarySources.length})
            </h2>
            {supplementarySources.length === 0 ? (
              <div className="p-6 border border-dashed border-outline dark:border-dark-outline text-center">
                <p className="text-ink-muted dark:text-dark-ink-muted">No supplementary sources added yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {supplementarySources.map((source) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    course={course}
                    onClick={() => openSourceDetail(source)}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Detail/Edit View */}
      {(viewMode === 'detail' || viewMode === 'add') && selectedSource && (
        <SourceEditor
          source={selectedSource}
          course={course}
          onSave={handleSaveSource}
          onDelete={handleDeleteSource}
          onCancel={() => {
            // Re-read storage so any autosaved edits show up in the list
            // immediately, without having to reload the page.
            refreshSources();
            setSelectedSource(null);
            setViewMode('list');
          }}
          isNew={viewMode === 'add'}
        />
      )}

      {/* Search View */}
      {viewMode === 'search' && (
        <SourceSearch
          courseId={courseId!}
          course={course}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onAddSource={(source) => {
            saveSource(source);
            refreshSources();
          }}
          onClose={() => setViewMode('list')}
        />
      )}
    </div>
  );
}

// Source Card Component
function SourceCard({
  source,
  course,
  onClick,
  getStatusColor,
}: {
  source: CourseSource;
  course: ReturnType<typeof getCoursePack>;
  onClick: () => void;
  getStatusColor: (status: string) => string;
}) {
  const section = course?.sections.find((s) => s.id === source.sectionId);
  const notesPreview = source.notes.slice(0, 100);
  const quoteCount = source.keyQuotes.length;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 border border-ink dark:border-dark-ink hover:bg-surface-container dark:hover:bg-dark-surface-container transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className={`px-2 py-1 text-xs font-mono uppercase ${getStatusColor(source.readingStatus)}`}>
          {source.readingStatus.replace('-', ' ')}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-ink dark:text-dark-ink truncate">
            {source.title || 'Untitled Source'}
          </h3>
          {source.authors && (
            <p className="text-sm text-ink-muted dark:text-dark-ink-muted">
              {source.authors}
            </p>
          )}
          <div className="flex gap-4 mt-2 text-xs text-ink-muted dark:text-dark-ink-muted font-mono">
            <span>{source.type}</span>
            {section && <span>{course?.sectionLabel} {section.number}</span>}
            {source.sourceOrigin === 'syllabus' && <span>Syllabus</span>}
            {source.uploadRequired && !source.attachmentName && <span className="text-error">Upload needed</span>}
            {source.attachmentName && <span>File: {source.attachmentName}</span>}
            {(source.usedInEntryIds?.length || 0) > 0 && <span>Used in entry</span>}
            {quoteCount > 0 && <span>{quoteCount} quote{quoteCount !== 1 ? 's' : ''}</span>}
            {notesPreview && <span className="truncate max-w-xs">{notesPreview}...</span>}
          </div>
        </div>
        <span className="text-ink-muted dark:text-dark-ink-muted">→</span>
      </div>
    </button>
  );
}

// Source Editor Component
function SourceEditor({
  source,
  course,
  onSave,
  onDelete,
  onCancel,
  isNew,
}: {
  source: CourseSource;
  course: ReturnType<typeof getCoursePack>;
  onSave: (source: CourseSource) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const [editedSource, setEditedSource] = useState<CourseSource>(source);
  const [newQuote, setNewQuote] = useState({ text: '', page: '', note: '' });
  const [citationYear, setCitationYear] = useState('');
  const [citationSource, setCitationSource] = useState('');
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [addMode, setAddMode] = useState<'url' | 'paste'>('url');

  // Autosave state. New sources don't autosave until the title is set, since
  // the row's identity is the title for now and the user might still be
  // pasting metadata. Existing sources autosave aggressively.
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>(isNew ? 'idle' : 'saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(isNew ? null : new Date(source.updatedAt));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);

  const dirtyRef = useRef(false);
  const editedRef = useRef<CourseSource>(source);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const autosaveDelayMs = useMemo(() => {
    const fromSettings = getSettings().autoSaveInterval;
    return Math.max(800, Math.min(fromSettings || 2000, 60000));
  }, []);

  useEffect(() => {
    editedRef.current = editedSource;
  }, [editedSource]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Resolve a preview URL for attachments living in IndexedDB. We use a
  // setState-in-effect for the legacy data-URL fallback because the source
  // value is async-loaded and we must reflect it after fetch resolves.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    let revokeUrl: string | null = null;

    if (editedSource.attachmentRef) {
      getAttachmentObjectUrl(editedSource.attachmentRef)
        .then((url) => {
          if (cancelled) {
            if (url) URL.revokeObjectURL(url);
            return;
          }
          if (url) {
            revokeUrl = url;
            setAttachmentPreviewUrl(url);
          }
        })
        .catch(() => {
          // non-fatal; the editor can still display the file name
        });
    } else if (editedSource.attachmentDataUrl) {
      setAttachmentPreviewUrl(editedSource.attachmentDataUrl);
    } else {
      setAttachmentPreviewUrl(null);
    }

    return () => {
      cancelled = true;
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [editedSource.attachmentRef, editedSource.attachmentDataUrl]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const flushSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const current = editedRef.current;
    if (!current.title.trim()) {
      // Don't autosave a placeholder row; the user is still typing the title.
      return;
    }
    setAutosaveStatus('saving');
    setErrorMessage(null);
    try {
      saveSource(current);
      dirtyRef.current = false;
      if (!isMountedRef.current) return;
      setLastSavedAt(new Date());
      setAutosaveStatus('saved');
    } catch (err) {
      if (!isMountedRef.current) return;
      setAutosaveStatus('error');
      if (err instanceof StorageError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Save failed for an unknown reason.');
      }
    }
  }, []);

  // Schedule a debounced autosave whenever editedSource is dirty. The
  // setState-in-effect calls below are intentional: this effect implements
  // the canonical debounced-save lifecycle (mirrors EntryPage) and the rule
  // is too strict for that pattern.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (!editedSource.title.trim()) {
      setAutosaveStatus('idle');
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setAutosaveStatus('pending');
    timerRef.current = setTimeout(flushSave, autosaveDelayMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [editedSource, autosaveDelayMs, flushSave]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Flush on unmount and on tab close.
  useEffect(() => {
    const handler = () => {
      if (dirtyRef.current) flushSave();
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      if (dirtyRef.current) flushSave();
    };
  }, [flushSave]);

  useKeyboardShortcuts({ save: flushSave });

  const updateField = <K extends keyof CourseSource>(field: K, value: CourseSource[K]) => {
    dirtyRef.current = true;
    setEditedSource((current) => ({ ...current, [field]: value }));
  };

  const addQuote = () => {
    if (!newQuote.text.trim()) return;
    const quote: SourceQuote = {
      id: uuidv4(),
      text: newQuote.text,
      page: newQuote.page || undefined,
      note: newQuote.note || undefined,
    };
    updateField('keyQuotes', [...editedSource.keyQuotes, quote]);
    setNewQuote({ text: '', page: '', note: '' });
  };

  const removeQuote = (quoteId: string) => {
    updateField('keyQuotes', editedSource.keyQuotes.filter((q) => q.id !== quoteId));
  };

  const handleAttachmentUpload = async (file?: File) => {
    if (!file) return;
    if (!isAttachmentsAvailable()) {
      setAutosaveStatus('error');
      setErrorMessage('Attachments require IndexedDB, which is not available in this browser.');
      return;
    }

    try {
      // Replace any prior attachment so we don't leak orphan blobs.
      if (editedSource.attachmentRef) {
        try {
          await deleteAttachment(editedSource.attachmentRef);
        } catch {
          // best-effort
        }
      }
      const id = await putAttachment({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: file,
      });
      dirtyRef.current = true;
      setEditedSource((current) => ({
        ...current,
        attachmentRef: id,
        attachmentName: file.name,
        attachmentMimeType: file.type || current.attachmentMimeType,
        attachmentDataUrl: undefined,
        uploadRequired: false,
      }));
    } catch (err) {
      setAutosaveStatus('error');
      setErrorMessage(
        err instanceof Error
          ? `Could not save attachment: ${err.message}`
          : 'Could not save attachment.',
      );
    }
  };

  const handleAttachmentRemove = async () => {
    if (editedSource.attachmentRef) {
      try {
        await deleteAttachment(editedSource.attachmentRef);
      } catch {
        // best-effort
      }
    }
    dirtyRef.current = true;
    setEditedSource((current) => ({
      ...current,
      attachmentRef: undefined,
      attachmentName: undefined,
      attachmentMimeType: undefined,
      attachmentDataUrl: undefined,
      uploadRequired: !current.url,
    }));
  };

  const handleCancel = () => {
    if (dirtyRef.current && !isNew) {
      flushSave();
    }
    onCancel();
  };

  const handleFetchMetadata = async (url: string) => {
    if (!url.trim()) return;
    
    setIsFetchingMetadata(true);
    try {
      const metadata = await fetchUrlMetadata(url);
      
      // Update fields with fetched data (only if empty)
      if (metadata.title && !editedSource.title) {
        updateField('title', metadata.title);
      }
      if (metadata.authors && !editedSource.authors) {
        updateField('authors', metadata.authors);
      }
      if (metadata.type) {
        updateField('type', metadata.type);
      }
      if (metadata.siteName) {
        setCitationSource(metadata.siteName);
      }
      if (metadata.publishedDate) {
        const year = metadata.publishedDate.match(/\d{4}/)?.[0];
        if (year) setCitationYear(year);
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const resourceTypes: ResourceType[] = ['article', 'book', 'video', 'podcast', 'website', 'document', 'other'];

  const statusPillText = (() => {
    switch (autosaveStatus) {
      case 'idle':
        return isNew ? 'Add a title to start autosave' : 'Autosave armed';
      case 'pending':
        return 'Unsaved changes…';
      case 'saving':
        return 'Saving…';
      case 'saved':
        return lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : 'Saved';
      case 'error':
        return errorMessage || 'Save failed — try Save Now';
    }
  })();

  const statusPillClass = (() => {
    switch (autosaveStatus) {
      case 'pending':
        return 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink';
      case 'saving':
        return 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink animate-pulse';
      case 'saved':
        return 'border-ink dark:border-dark-ink bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface';
      case 'error':
        return 'border-error text-error';
      default:
        return 'border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted';
    }
  })();

  return (
    <div className="border-2 border-ink dark:border-dark-ink">
      {/* Header */}
      <div className="p-4 border-b border-ink dark:border-dark-ink flex flex-wrap gap-3 justify-between items-center">
        <h2 className="font-editorial text-xl font-medium text-ink dark:text-dark-ink">
          {isNew ? 'Add New Source' : 'Edit Source'}
        </h2>
        <div className="flex items-center gap-3">
          <span
            role="status"
            aria-live="polite"
            className={`px-2 py-1 font-mono text-xs uppercase tracking-wider border ${statusPillClass}`}
          >
            {statusPillText}
          </span>
          <button
            onClick={handleCancel}
            className="text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
            aria-label="Close source editor"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Add Mode Toggle (only for new sources) */}
      {isNew && (
        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => setAddMode('url')}
            className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider border ${
              addMode === 'url'
                ? 'bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface border-ink dark:border-dark-ink'
                : 'border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted hover:border-ink dark:hover:border-dark-ink'
            }`}
          >
            From URL
          </button>
          <button
            onClick={() => setAddMode('paste')}
            className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider border ${
              addMode === 'paste'
                ? 'bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface border-ink dark:border-dark-ink'
                : 'border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted hover:border-ink dark:hover:border-dark-ink'
            }`}
          >
            Paste Notes
          </button>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
              Title *
            </label>
            <input
              type="text"
              value={editedSource.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
              placeholder="Source title"
            />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
              Authors
            </label>
            <input
              type="text"
              value={editedSource.authors || ''}
              onChange={(e) => updateField('authors', e.target.value)}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
              placeholder="Author names"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
              Type
            </label>
            <select
              value={editedSource.type}
              onChange={(e) => updateField('type', e.target.value as ResourceType)}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
            >
              {resourceTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
              {course?.sectionLabel}
            </label>
            <select
              value={editedSource.sectionId}
              onChange={(e) => updateField('sectionId', e.target.value)}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
            >
              {course?.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {course.sectionLabel} {section.number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
              Reading Status
            </label>
            <select
              value={editedSource.readingStatus}
              onChange={(e) => updateField('readingStatus', e.target.value as CourseSource['readingStatus'])}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
            >
              <option value="unread">Unread</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* URL with Auto-fetch (URL mode) or Paste Notes area */}
        {addMode === 'url' || !isNew ? (
          <>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                  URL
                </label>
                {isNew && (
                  <button
                    type="button"
                    onClick={() => handleFetchMetadata(editedSource.url || '')}
                    disabled={!editedSource.url || isFetchingMetadata}
                    className="font-mono text-xs px-2 py-1 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface disabled:opacity-50"
                  >
                    {isFetchingMetadata ? 'Fetching...' : 'Auto-fill from URL'}
                  </button>
                )}
              </div>
              <input
                type="url"
                value={editedSource.url || ''}
                onChange={(e) => updateField('url', e.target.value)}
                onBlur={(e) => {
                  if (isNew && e.target.value && !editedSource.title) {
                    handleFetchMetadata(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
                placeholder="Paste URL here — metadata will auto-fill"
              />
              {isNew && (
                <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-1">
                  Paste a URL and we'll try to auto-fill title, author, and type
                </p>
              )}
            </div>

            <div className="p-4 border border-outline dark:border-dark-outline bg-surface-container dark:bg-dark-surface-container">
              <div className="flex justify-between items-start gap-4 mb-3">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-1">
                    Source file or hard copy
                  </label>
                  <p className="text-sm text-ink-muted dark:text-dark-ink-muted">
                    Attach a local PDF, image, or document when the syllabus lists a source without a usable link.
                  </p>
                </div>
                {editedSource.uploadRequired && !editedSource.attachmentName && (
                  <span className="font-mono text-xs px-2 py-1 border border-error text-error whitespace-nowrap">
                    Upload needed
                  </span>
                )}
              </div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
                onChange={(event) => void handleAttachmentUpload(event.target.files?.[0])}
                className="block w-full text-sm text-ink dark:text-dark-ink"
              />
              {editedSource.attachmentName && (
                <div className="mt-3 flex items-center justify-between gap-3 font-mono text-xs">
                  <span className="text-ink dark:text-dark-ink">
                    Attached: {editedSource.attachmentName}
                    {attachmentPreviewUrl && (
                      <>
                        {' '}
                        (
                        <a
                          href={attachmentPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          open
                        </a>
                        )
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleAttachmentRemove()}
                    className="text-error hover:underline"
                  >
                    Remove file
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 border-2 border-dashed border-outline dark:border-dark-outline bg-surface-container dark:bg-dark-surface-container">
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
              Paste Your Existing Notes
            </label>
            <textarea
              value={editedSource.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
              placeholder="Paste your notes here. You can include:
- Summary of the source
- Key quotes (we'll help you format them later)
- Questions and connections
- Any other thoughts..."
            />
            <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-2">
              Just paste what you have — you can organize it into quotes, questions, etc. later
            </p>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
              Citation (APA 7th)
            </label>
            <button
              type="button"
              onClick={() => {
                const template = editedSource.url ? suggestCitationTemplate(editedSource.url) : {};

                const citation = buildCitationFromInputs({
                  authors: editedSource.authors || '',
                  year: citationYear || new Date().getFullYear().toString(),
                  title: editedSource.title,
                  source: citationSource || template.siteName || '',
                  url: editedSource.url,
                  type: editedSource.type as 'article' | 'book' | 'website' | 'video' | 'other',
                });
                updateField('citation', citation);
              }}
              className="font-mono text-xs px-2 py-1 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
            >
              Generate APA
            </button>
          </div>
          
          {/* Citation helper fields */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="text"
              value={citationYear}
              onChange={(e) => setCitationYear(e.target.value)}
              placeholder="Year (e.g., 2024)"
              className="px-2 py-1 border border-outline dark:border-dark-outline bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink text-sm"
            />
            <input
              type="text"
              value={citationSource}
              onChange={(e) => setCitationSource(e.target.value)}
              placeholder="Journal/Website name"
              className="px-2 py-1 border border-outline dark:border-dark-outline bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink text-sm"
            />
          </div>
          
          <textarea
            value={editedSource.citation || ''}
            onChange={(e) => updateField('citation', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink font-mono text-sm"
            placeholder="Full citation... (click Generate APA or type manually)"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
            Notes & Summary
          </label>
          <textarea
            value={editedSource.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
            placeholder="Your notes, summary, key points..."
          />
        </div>

        {/* Key Quotes */}
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
            Key Quotes ({editedSource.keyQuotes.length})
          </label>
          
          {editedSource.keyQuotes.map((quote) => (
            <div key={quote.id} className="mb-3 p-3 border border-outline dark:border-dark-outline">
              <p className="text-ink dark:text-dark-ink italic">"{quote.text}"</p>
              {quote.page && <p className="text-xs text-ink-muted dark:text-dark-ink-muted mt-1">p. {quote.page}</p>}
              {quote.note && <p className="text-sm text-ink-muted dark:text-dark-ink-muted mt-1">Note: {quote.note}</p>}
              <button
                onClick={() => removeQuote(quote.id)}
                className="text-xs text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink mt-2"
              >
                Remove
              </button>
            </div>
          ))}

          <div className="p-3 border border-dashed border-outline dark:border-dark-outline space-y-2">
            <textarea
              value={newQuote.text}
              onChange={(e) => setNewQuote({ ...newQuote, text: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-outline dark:border-dark-outline bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink text-sm"
              placeholder="Quote text..."
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={newQuote.page}
                onChange={(e) => setNewQuote({ ...newQuote, page: e.target.value })}
                className="w-20 px-2 py-1 border border-outline dark:border-dark-outline bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink text-sm"
                placeholder="Page"
              />
              <input
                type="text"
                value={newQuote.note}
                onChange={(e) => setNewQuote({ ...newQuote, note: e.target.value })}
                className="flex-1 px-2 py-1 border border-outline dark:border-dark-outline bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink text-sm"
                placeholder="Your note about this quote..."
              />
              <button
                onClick={addQuote}
                className="px-3 py-1 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink text-sm hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
              >
                Add Quote
              </button>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
            Questions Raised
          </label>
          <textarea
            value={editedSource.questions}
            onChange={(e) => updateField('questions', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
            placeholder="Questions this source raises for you..."
          />
        </div>

        {/* Connections */}
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
            Connections to Other Sources/Ideas
          </label>
          <textarea
            value={editedSource.connections}
            onChange={(e) => updateField('connections', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
            placeholder="How does this connect to other readings or course concepts?"
          />
        </div>

        {/* Key Terms */}
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
            Key Terms (comma-separated)
          </label>
          <input
            type="text"
            value={editedSource.keyTerms.join(', ')}
            onChange={(e) => updateField('keyTerms', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
            className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
            placeholder="SAMR, UDL, cognitive load..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-ink dark:border-dark-ink flex justify-between">
        {!isNew && (
          <button
            onClick={() => onDelete(editedSource.id)}
            className="px-4 py-2 text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink font-mono text-sm"
          >
            Delete Source
          </button>
        )}
        <div className="flex gap-2 ml-auto items-center">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-outline dark:border-dark-outline text-ink dark:text-dark-ink font-mono text-sm"
          >
            {isNew ? 'Cancel' : 'Done'}
          </button>
          <button
            onClick={() => {
              flushSave();
              onSave(editedRef.current);
            }}
            disabled={!editedSource.title.trim()}
            className="px-4 py-2 bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface font-mono text-sm uppercase tracking-wider disabled:opacity-50"
            title="Save and close (Cmd/Ctrl+S saves without closing)"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Source Search Component
function SourceSearch({
  courseId,
  course,
  searchQuery,
  setSearchQuery,
  onAddSource,
  onClose,
}: {
  courseId: string;
  course: ReturnType<typeof getCoursePack>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onAddSource: (source: CourseSource) => void;
  onClose: () => void;
}) {
  const [selectedDb, setSelectedDb] = useState('google-scholar');

  const databases = [
    { id: 'google-scholar', name: 'Google Scholar', url: 'https://scholar.google.com/scholar?q=' },
    { id: 'eric', name: 'ERIC', url: 'https://eric.ed.gov/?q=' },
    { id: 'jstor', name: 'JSTOR', url: 'https://www.jstor.org/action/doBasicSearch?Query=' },
    { id: 'pubmed', name: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=' },
    { id: 'semantic-scholar', name: 'Semantic Scholar', url: 'https://www.semanticscholar.org/search?q=' },
  ];

  const buildSearchUrl = () => {
    const db = databases.find((d) => d.id === selectedDb);
    if (!db || !searchQuery.trim()) return '';
    return db.url + encodeURIComponent(searchQuery);
  };

  const addFromSearch = () => {
    const now = new Date().toISOString();
    const newSource: CourseSource = {
      id: uuidv4(),
      courseId,
      sectionId: course?.sections[0]?.id || '',
      title: searchQuery,
      type: 'article',
      isAssigned: false,
      isSupplementary: true,
      readingStatus: 'unread',
      notes: `Found via ${databases.find((d) => d.id === selectedDb)?.name || 'search'}`,
      keyQuotes: [],
      keyTerms: [],
      questions: '',
      connections: '',
      tags: ['supplementary'],
      addedAt: now,
      updatedAt: now,
    };
    onAddSource(newSource);
  };

  return (
    <div className="border-2 border-ink dark:border-dark-ink">
      <div className="p-4 border-b border-ink dark:border-dark-ink flex justify-between items-center">
        <h2 className="font-editorial text-xl font-medium text-ink dark:text-dark-ink">
          Search for Supplementary Sources
        </h2>
        <button
          onClick={onClose}
          className="text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
        >
          ✕ Close
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
            Search Query
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
            placeholder="Enter search terms..."
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
            Database
          </label>
          <div className="flex flex-wrap gap-2">
            {databases.map((db) => (
              <button
                key={db.id}
                onClick={() => setSelectedDb(db.id)}
                className={`px-3 py-2 border font-mono text-sm ${
                  selectedDb === db.id
                    ? 'bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface border-ink dark:border-dark-ink'
                    : 'border-outline dark:border-dark-outline text-ink dark:text-dark-ink hover:border-ink dark:hover:border-dark-ink'
                }`}
              >
                {db.name}
              </button>
            ))}
          </div>
        </div>

        {searchQuery.trim() && (
          <div className="flex gap-4">
            <a
              href={buildSearchUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface font-mono text-sm uppercase tracking-wider"
            >
              Search {databases.find((d) => d.id === selectedDb)?.name} →
            </a>
            <button
              onClick={addFromSearch}
              className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink font-mono text-sm uppercase tracking-wider hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
            >
              Add as Placeholder Source
            </button>
          </div>
        )}

        <div className="p-4 bg-surface-container dark:bg-dark-surface-container">
          <p className="text-sm text-ink-muted dark:text-dark-ink-muted">
            <strong>Tip:</strong> Search for sources in the external database, then come back and add them with full details. 
            You can add a placeholder now and fill in the citation and notes later.
          </p>
        </div>
      </div>
    </div>
  );
}
