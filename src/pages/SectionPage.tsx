import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCoursePack } from '../course-packs';
import { getEntries, getSources } from '../utils/storage';
import { calculateEntryProgress } from '../utils/progress';
import WeeklyWorkflowWizard from '../components/WeeklyWorkflowWizard';

export default function SectionPage() {
  const { courseId, sectionId } = useParams<{ courseId: string; sectionId: string }>();
  const course = courseId ? getCoursePack(courseId) : null;
  const section = course?.sections.find((s) => s.id === sectionId);
  const entries = courseId ? getEntries(courseId).filter((e) => e.sectionId === sectionId) : [];
  const sources = courseId && sectionId ? getSources(courseId, sectionId) : [];
  const [showWorkflowWizard, setShowWorkflowWizard] = useState(false);

  if (!course || !section) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-editorial text-2xl text-ink dark:text-dark-ink mb-4">Section not found</h1>
        <Link to={courseId ? `/course/${courseId}` : '/'} className="text-ink-muted dark:text-dark-ink-muted hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  const weeklyPrompt = course.weeklyPrompts?.find((wp) => wp.sectionId === sectionId);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link to={`/course/${courseId}`} className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink">
          ← {course.title}
        </Link>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
              {course.sectionLabel} {section.number}
            </span>
            <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight mt-1">
              {section.title}
            </h1>
          </div>
          <button
            onClick={() => setShowWorkflowWizard(true)}
            className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider"
          >
            Weekly Workflow
          </button>
        </div>
        {section.description && (
          <p className="text-ink-muted dark:text-dark-ink-muted mt-4 max-w-2xl">
            {section.description}
          </p>
        )}
      </header>

      {/* Weekly Prompt */}
      {weeklyPrompt && (
        <section className="mb-8 p-6 border-2 border-ink dark:border-dark-ink bg-surface-container dark:bg-dark-surface-container">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
            Weekly Reflection Prompt
          </h2>
          <p className="font-editorial text-xl text-ink dark:text-dark-ink italic">
            "{weeklyPrompt.prompt}"
          </p>
        </section>
      )}

      {/* Topics */}
      {section.topics.length > 0 && (
        <section className="mb-8">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {section.topics.map((topic) => (
              <span
                key={topic.id}
                className={`font-mono text-xs px-3 py-1.5 border ${
                  topic.required
                    ? 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink'
                    : 'border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted'
                }`}
              >
                {topic.title}
                {topic.required && <span className="ml-1 opacity-60">*</span>}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Key Frameworks */}
      {section.keyFrameworks && section.keyFrameworks.length > 0 && (
        <section className="mb-8">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Key Frameworks
          </h2>
          <div className="flex flex-wrap gap-2">
            {section.keyFrameworks.map((fw) => (
              <span
                key={fw}
                className="font-mono text-xs px-3 py-1.5 bg-surface-container-high dark:bg-dark-surface-container text-ink dark:text-dark-ink"
              >
                {fw}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Reading Checklist */}
      <section className="mb-8 p-6 border border-ink dark:border-dark-ink">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
            Reading Checklist
          </h2>
          <Link
            to={`/course/${courseId}/section/${sectionId}/sources`}
            className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
          >
            Manage Sources →
          </Link>
        </div>
        
        {sources.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-ink-muted dark:text-dark-ink-muted text-sm mb-3">
              No sources added for this {course.sectionLabel.toLowerCase()} yet.
            </p>
            <Link
              to={`/course/${courseId}/section/${sectionId}/sources`}
              className="inline-block px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-xs uppercase tracking-wider"
            >
              + Add Sources
            </Link>
          </div>
        ) : (
          <>
            {/* Progress summary */}
            <div className="flex gap-6 mb-4 pb-4 border-b border-outline dark:border-dark-outline">
              <div>
                <div className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
                  {sources.filter(s => s.readingStatus === 'completed').length}/{sources.length}
                </div>
                <div className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">Completed</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
                  {sources.filter(s => s.readingStatus === 'in-progress').length}
                </div>
                <div className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">In Progress</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
                  {sources.reduce((acc, s) => acc + s.keyQuotes.length, 0)}
                </div>
                <div className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">Quotes Saved</div>
              </div>
            </div>
            
            {/* Source list */}
            <div className="space-y-2">
              {sources.map((source) => (
                <Link
                  key={source.id}
                  to={`/course/${courseId}/section/${sectionId}/sources`}
                  className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-dark-surface-container -mx-2 rounded"
                >
                  <span className={`w-5 h-5 flex items-center justify-center border text-xs ${
                    source.readingStatus === 'completed'
                      ? 'bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface border-ink dark:border-dark-ink'
                      : source.readingStatus === 'in-progress'
                      ? 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink'
                      : 'border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted'
                  }`}>
                    {source.readingStatus === 'completed' ? '✓' : source.readingStatus === 'in-progress' ? '◐' : ''}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${
                      source.readingStatus === 'completed' 
                        ? 'text-ink-muted dark:text-dark-ink-muted line-through' 
                        : 'text-ink dark:text-dark-ink'
                    }`}>
                      {source.title}
                    </p>
                  </div>
                  {source.isAssigned && (
                    <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">Required</span>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Entries */}
      <section className="mt-12 pt-8 border-t border-outline dark:border-dark-outline">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
            Journal Entries ({entries.length})
          </h2>
          <Link
            to={`/course/${courseId}/entry/new?section=${sectionId}`}
            className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider"
          >
            + New Entry
          </Link>
        </div>

        {entries.length === 0 ? (
          <div className="border-2 border-dashed border-outline dark:border-dark-outline p-12 text-center">
            <p className="text-ink-muted dark:text-dark-ink-muted mb-4">
              No entries for this {course.sectionLabel.toLowerCase()} yet.
            </p>
            <Link
              to={`/course/${courseId}/entry/new?section=${sectionId}`}
              className="inline-block px-6 py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider"
            >
              Create Your First Entry
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {entries.map((entry) => {
              const progress = calculateEntryProgress(entry);
              
              return (
                <Link
                  key={entry.id}
                  to={`/course/${courseId}/entry/${entry.id}`}
                  className="block border border-ink dark:border-dark-ink p-5 hover:border-2 hover:-m-px transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                        {entry.published && (
                          <span className="font-mono text-xs px-2 py-0.5 bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface">
                            Published
                          </span>
                        )}
                        {entry.tags.length > 0 && (
                          <div className="flex gap-1">
                            {entry.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <h3 className="font-editorial text-lg font-medium text-ink dark:text-dark-ink">
                        {entry.title || 'Untitled Entry'}
                      </h3>
                      {entry.summary && (
                        <p className="text-sm text-ink-muted dark:text-dark-ink-muted mt-2 line-clamp-2">
                          {entry.summary}
                        </p>
                      )}
                    </div>
                    
                    {/* Progress */}
                    <div className="text-right ml-4">
                      <div className="font-mono text-xl font-bold text-ink dark:text-dark-ink">
                        {progress.completionPercentage}%
                      </div>
                      <div className="w-12 h-1 border border-ink dark:border-dark-ink mt-2">
                        <div
                          className="h-full bg-ink dark:bg-dark-ink"
                          style={{ width: `${progress.completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Weekly Workflow Wizard */}
      {showWorkflowWizard && (
        <WeeklyWorkflowWizard
          course={course}
          sectionId={sectionId!}
          sources={sources}
          hasEntry={entries.length > 0}
          onClose={() => setShowWorkflowWizard(false)}
        />
      )}
    </div>
  );
}
