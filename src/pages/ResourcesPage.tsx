import { useParams, Link } from 'react-router-dom';
import { getCoursePack } from '../course-packs';
import { getEntries } from '../utils/storage';
import type { Resource } from '../schemas/types';

export default function ResourcesPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? getCoursePack(courseId) : null;
  const entries = courseId ? getEntries(courseId) : [];

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-editorial text-2xl text-ink dark:text-dark-ink mb-4">Course not found</h1>
        <Link to="/" className="text-ink-muted dark:text-dark-ink-muted hover:underline">← Back to Home</Link>
      </div>
    );
  }

  const allResources: Array<Resource & { entryId: string; entryTitle: string; sectionId: string }> = [];
  entries.forEach((entry) => {
    entry.resources.forEach((resource) => {
      allResources.push({
        ...resource,
        entryId: entry.id,
        entryTitle: entry.title || 'Untitled Entry',
        sectionId: entry.sectionId,
      });
    });
  });

  const resourcesByType = allResources.reduce((acc, resource) => {
    if (!acc[resource.type]) acc[resource.type] = [];
    acc[resource.type].push(resource);
    return acc;
  }, {} as Record<string, typeof allResources>);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
          {course.code}
        </span>
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight mt-1">
          Resources
        </h1>
        <p className="text-ink-muted dark:text-dark-ink-muted mt-2">
          {allResources.length} resources across {entries.length} entries
        </p>
      </header>

      {allResources.length === 0 ? (
        <div className="border-2 border-dashed border-outline dark:border-dark-outline p-12 text-center">
          <p className="text-ink-muted dark:text-dark-ink-muted mb-4">
            No resources added yet. Add resources to your journal entries.
          </p>
          <Link
            to={`/course/${courseId}`}
            className="inline-block px-6 py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider"
          >
            Go to Course Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(resourcesByType).map(([type, resources]) => (
            <section key={type}>
              <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
                {type}s ({resources.length})
              </h2>
              <div className="grid gap-3">
                {resources.map((resource) => {
                  const section = course.sections.find((s) => s.id === resource.sectionId);
                  return (
                    <div
                      key={`${resource.entryId}-${resource.id}`}
                      className="border border-ink dark:border-dark-ink p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-ink dark:text-dark-ink">
                            {resource.title || 'Untitled Resource'}
                          </h3>
                          {resource.url && (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted hover:underline break-all"
                            >
                              {resource.url}
                            </a>
                          )}
                          {resource.citation && (
                            <p className="text-sm text-ink-muted dark:text-dark-ink-muted mt-2 italic">
                              {resource.citation}
                            </p>
                          )}
                          {resource.notes && (
                            <p className="text-sm text-ink-muted dark:text-dark-ink-muted mt-2">
                              {resource.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <Link
                            to={`/course/${courseId}/entry/${resource.entryId}`}
                            className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
                          >
                            {course.sectionLabel} {section?.number}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
