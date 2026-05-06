import { Link, useParams } from 'react-router-dom';
import { getCoursePack } from '../course-packs';
import { getEntries } from '../utils/storage';
import { calculateSectionProgress } from '../utils/progress';

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? getCoursePack(courseId) : null;
  const entries = courseId ? getEntries(courseId) : [];

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-editorial text-2xl text-ink dark:text-dark-ink mb-4">Course not found</h1>
        <Link to="/" className="text-ink-muted dark:text-dark-ink-muted hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
          {course.code}
        </span>
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight mt-1">
          {course.title}
        </h1>
        {course.description && (
          <p className="text-ink-muted dark:text-dark-ink-muted mt-4 max-w-2xl">
            {course.description}
          </p>
        )}
      </header>

      {/* Weekly Prompt (if available) */}
      {course.weeklyPrompts && course.weeklyPrompts.length > 0 && (
        <section className="mb-8 p-6 border-2 border-ink dark:border-dark-ink bg-surface-container dark:bg-dark-surface-container">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
            Weekly Reflection Prompt
          </h2>
          <p className="font-editorial text-xl text-ink dark:text-dark-ink italic">
            "{course.weeklyPrompts[0].prompt}"
          </p>
        </section>
      )}

      {/* Section Cards */}
      <section>
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          {course.sectionLabel}s
        </h2>
        
        <div className="grid gap-4">
          {course.sections.map((section) => {
            const progress = calculateSectionProgress(section.id, entries);
            
            return (
              <Link
                key={section.id}
                to={`/course/${courseId}/section/${section.id}`}
                className="block border border-ink dark:border-dark-ink p-5 hover:border-2 hover:-m-px transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                        {course.sectionLabel} {section.number}
                      </span>
                      {progress.totalEntries > 0 && (
                        <span className="font-mono text-xs px-2 py-0.5 border border-ink dark:border-dark-ink">
                          {progress.totalEntries} {progress.totalEntries === 1 ? 'entry' : 'entries'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-editorial text-xl font-medium text-ink dark:text-dark-ink">
                      {section.title}
                    </h3>
                    {section.description && (
                      <p className="text-sm text-ink-muted dark:text-dark-ink-muted mt-2">
                        {section.description}
                      </p>
                    )}
                    {section.keyFrameworks && section.keyFrameworks.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {section.keyFrameworks.slice(0, 4).map((fw) => (
                          <span
                            key={fw}
                            className="font-mono text-xs px-2 py-1 bg-surface-container-high dark:bg-dark-surface-container text-ink-muted dark:text-dark-ink-muted"
                          >
                            {fw}
                          </span>
                        ))}
                        {section.keyFrameworks.length > 4 && (
                          <span className="font-mono text-xs px-2 py-1 text-ink-muted dark:text-dark-ink-muted">
                            +{section.keyFrameworks.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Progress */}
                  <div className="text-right ml-4">
                    <div className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
                      {progress.averageCompletion}%
                    </div>
                    <div className="w-16 h-1 border border-ink dark:border-dark-ink mt-2">
                      <div
                        className="h-full bg-ink dark:bg-dark-ink"
                        style={{ width: `${progress.averageCompletion}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Course Outcomes */}
      <section className="mt-12 pt-8 border-t border-outline dark:border-dark-outline">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Learning Outcomes
        </h2>
        <div className="grid gap-3">
          {course.outcomes.map((outcome) => (
            <div key={outcome.id} className="flex gap-3 text-sm">
              <span className="font-mono text-xs font-bold text-ink dark:text-dark-ink shrink-0">
                {outcome.label}
              </span>
              <span className="text-ink-muted dark:text-dark-ink-muted">
                {outcome.text}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
