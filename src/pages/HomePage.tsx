import { Link } from 'react-router-dom';
import { coursePacks } from '../course-packs';
import { getEntries } from '../utils/storage';
import { calculateCourseProgress } from '../utils/progress';

export default function HomePage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-12">
        <h1 className="font-editorial text-5xl font-semibold text-ink dark:text-dark-ink leading-tight mb-4">
          Course Journal Kit
        </h1>
        <p className="text-lg text-ink-muted dark:text-dark-ink-muted max-w-2xl">
          A structured space to document insights, analyze challenges, pose questions, 
          track growth over time, and connect course concepts to real-world professional practice.
        </p>
      </header>

      {/* Course Cards */}
      <section>
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Your Courses
        </h2>
        
        <div className="grid gap-6">
          {coursePacks.map((course) => {
            const entries = getEntries(course.id);
            const progress = calculateCourseProgress(course, entries);
            
            return (
              <Link
                key={course.id}
                to={`/course/${course.id}`}
                className="block border-2 border-ink dark:border-dark-ink p-6 hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface transition-colors group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider opacity-60">
                      {course.code}
                    </span>
                    <h3 className="font-editorial text-2xl font-medium mt-1">
                      {course.title}
                    </h3>
                    {course.term && (
                      <span className="font-mono text-xs mt-2 block opacity-60">
                        {course.term}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-3xl font-bold">
                      {progress.overallCompletion}%
                    </div>
                    <div className="font-mono text-xs uppercase tracking-wider opacity-60">
                      Complete
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 border border-current mb-4">
                  <div
                    className="h-full bg-current transition-all"
                    style={{ width: `${progress.overallCompletion}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 font-mono text-xs">
                  <div>
                    <div className="text-lg font-bold">{progress.entriesCount}</div>
                    <div className="uppercase tracking-wider opacity-60">Entries</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{progress.sectionsWithEntries}/{progress.totalSections}</div>
                    <div className="uppercase tracking-wider opacity-60">{course.sectionLabel}s</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{progress.publishedCount}</div>
                    <div className="uppercase tracking-wider opacity-60">Published</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {coursePacks.length === 0 && (
          <div className="border-2 border-dashed border-outline dark:border-dark-outline p-12 text-center">
            <p className="text-ink-muted dark:text-dark-ink-muted mb-4">
              No courses yet. Create your first course pack to get started.
            </p>
            <Link
              to="/builder"
              className="inline-block px-6 py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider"
            >
              Create Course Pack
            </Link>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="mt-12 pt-8 border-t border-outline dark:border-dark-outline">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Quick Actions
        </h2>
        <div className="flex gap-4 flex-wrap">
          <Link
            to="/builder"
            className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm"
          >
            Course Builder
          </Link>
          <Link
            to="/settings"
            className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm"
          >
            Settings
          </Link>
        </div>
      </section>
    </div>
  );
}
