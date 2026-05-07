import { Link, useParams } from 'react-router-dom';
import { getCoursePack, getCoursePacks } from '../course-packs';
import { getEntries, getFurtherExplorationAreas, getSyntheses, getSettings } from '../utils/storage';

export default function PublicPage() {
  const { courseId, shareId } = useParams<{ courseId?: string; shareId?: string }>();
  // The /share/:shareId route is reserved for future signed-share links. For now,
  // we treat the share id as a courseId so existing links keep working and any
  // future hashing/decoding can hook in here.
  const resolvedCourseId = courseId || shareId;
  const course = resolvedCourseId
    ? getCoursePack(resolvedCourseId) || getCoursePacks().find((c) => c.id === resolvedCourseId)
    : null;
  const allEntries = course ? getEntries(course.id) : [];
  const entries = allEntries.filter((e) => e.published);
  const explorationAreas = course ? getFurtherExplorationAreas(course.id) : [];
  const syntheses = course ? getSyntheses(course.id) : [];
  const settings = getSettings();

  if (!course) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="font-editorial text-2xl text-ink mb-4">Journal not found</h1>
          <p className="text-ink-muted mb-6">
            This link may be for a course that hasn't been installed yet, or the course id is wrong.
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 border border-ink text-ink hover:bg-ink hover:text-inverse-on-surface font-mono text-sm uppercase tracking-wider"
          >
            Open Course Journal Kit
          </Link>
        </div>
      </div>
    );
  }

  const synthesis = syntheses[0];

  return (
    <div className="min-h-screen bg-surface text-ink print:bg-white">
      {/* Print Styles */}
      <style>{`
        @media print {
          body { font-size: 12pt; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          a { text-decoration: none; color: inherit; }
        }
      `}</style>

      {/* Header */}
      <header className="border-b-2 border-ink p-8 print:p-4">
        <div className="max-w-4xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            {course.code} • {course.term}
          </span>
          <h1 className="font-editorial text-4xl font-semibold leading-tight mt-2 print:text-3xl">
            {course.title}
          </h1>
          <p className="font-editorial text-xl text-ink-muted mt-2">
            Reflection Journal
          </p>
          {settings.studentName && (
            <p className="font-mono text-sm mt-4">
              <strong>Student:</strong> {settings.studentName}
            </p>
          )}
          <p className="font-mono text-xs text-ink-muted mt-2">
            Generated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-outline p-4 no-print sticky top-0 bg-surface z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2">
            {course.sections.map((section) => {
              const sectionEntries = entries.filter((e) => e.sectionId === section.id);
              return (
                <a
                  key={section.id}
                  href={`#section-${section.id}`}
                  className={`px-3 py-1 border text-sm font-mono ${
                    sectionEntries.length > 0
                      ? 'border-ink text-ink hover:bg-ink hover:text-inverse-on-surface'
                      : 'border-outline text-ink-muted'
                  }`}
                >
                  {course.sectionLabel} {section.number}
                </a>
              );
            })}
            {explorationAreas.length > 0 && (
              <a href="#exploration" className="px-3 py-1 border border-ink text-ink text-sm font-mono hover:bg-ink hover:text-inverse-on-surface">
                Exploration
              </a>
            )}
            {synthesis && (
              <a href="#synthesis" className="px-3 py-1 border border-ink text-ink text-sm font-mono hover:bg-ink hover:text-inverse-on-surface">
                Synthesis
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-8 print:p-4">
        {entries.length === 0 ? (
          <div className="border-2 border-dashed border-outline p-12 text-center my-12 max-w-2xl mx-auto">
            <h2 className="font-editorial text-2xl text-ink mb-3">Nothing published yet</h2>
            <p className="text-ink-muted mb-6">
              This journal exists but no entries have been marked as <strong>published</strong>. Open the
              entry you want to share, toggle <em>Published</em> in the sidebar, and the entry will
              appear here automatically.
            </p>
            <div className="flex justify-center gap-3 flex-wrap no-print">
              <Link
                to={`/course/${course.id}`}
                className="inline-block px-4 py-2 border border-ink text-ink hover:bg-ink hover:text-inverse-on-surface font-mono text-sm uppercase tracking-wider"
              >
                Open course in editor
              </Link>
              <Link
                to={`/course/${course.id}/export`}
                className="inline-block px-4 py-2 border border-outline text-ink-muted hover:border-ink hover:text-ink font-mono text-sm uppercase tracking-wider"
              >
                Manage share link
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Sections */}
            {course.sections.map((section) => {
              const sectionEntries = entries.filter((e) => e.sectionId === section.id);
              if (sectionEntries.length === 0) return null;

              return (
                <section key={section.id} id={`section-${section.id}`} className="mb-16 page-break">
                  <div className="border-b-2 border-ink pb-4 mb-8">
                    <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                      {course.sectionLabel} {section.number}
                    </span>
                    <h2 className="font-editorial text-3xl font-medium mt-1">
                      {section.title}
                    </h2>
                  </div>

                  {sectionEntries.map((entry) => (
                    <article key={entry.id} className="mb-12 pb-8 border-b border-outline last:border-0">
                      <header className="mb-6">
                        <h3 className="font-editorial text-2xl font-medium">
                          {entry.title || 'Untitled Entry'}
                        </h3>
                        <div className="flex flex-wrap gap-4 mt-2 font-mono text-xs text-ink-muted">
                          <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                          {entry.confidenceRating && (
                            <span>Confidence: {entry.confidenceRating}/5</span>
                          )}
                          {entry.tags.length > 0 && (
                            <span>{entry.tags.map((t) => `#${t}`).join(' ')}</span>
                          )}
                        </div>
                      </header>

                      <div className="space-y-6">
                        {entry.summary && (
                          <div>
                            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Summary</h4>
                            <p className="whitespace-pre-wrap">{entry.summary}</p>
                          </div>
                        )}

                        {entry.keyConcepts && (
                          <div>
                            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Key Concepts</h4>
                            <p className="whitespace-pre-wrap">{entry.keyConcepts}</p>
                          </div>
                        )}

                        {entry.reflection && (
                          <div>
                            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Reflection</h4>
                            <p className="whitespace-pre-wrap">{entry.reflection}</p>
                          </div>
                        )}

                        {entry.professionalApplication && (
                          <div>
                            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Professional Application</h4>
                            <p className="whitespace-pre-wrap">{entry.professionalApplication}</p>
                          </div>
                        )}

                        {entry.questions && (
                          <div>
                            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Questions</h4>
                            <p className="whitespace-pre-wrap">{entry.questions}</p>
                          </div>
                        )}

                        {entry.ethicalEquityConsiderations && (
                          <div>
                            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Ethical & Equity Considerations</h4>
                            <p className="whitespace-pre-wrap">{entry.ethicalEquityConsiderations}</p>
                          </div>
                        )}

                        {entry.keyTakeaways && (
                          <div>
                            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Key Takeaways</h4>
                            <p className="whitespace-pre-wrap">{entry.keyTakeaways}</p>
                          </div>
                        )}

                        {/* Artifacts Gallery */}
                        {entry.artifacts && entry.artifacts.length > 0 && (
                          <div>
                            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-4">Artifacts & Visual Evidence</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {entry.artifacts.map((artifact) => (
                                <figure key={artifact.id} className="border border-outline overflow-hidden">
                                  {/* Artifact Display */}
                                  {(artifact.type === 'image' || artifact.type === 'infographic' || artifact.type === 'diagram') ? (
                                    <img
                                      src={artifact.url}
                                      alt={artifact.altText || artifact.title}
                                      className="w-full h-auto"
                                    />
                                  ) : (artifact.type === 'embed' || artifact.type === 'tool') ? (
                                    <div className="aspect-video">
                                      <iframe
                                        src={artifact.url}
                                        title={artifact.title}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    </div>
                                  ) : artifact.type === 'video' ? (
                                    <div className="aspect-video">
                                      <iframe
                                        src={artifact.url}
                                        title={artifact.title}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    </div>
                                  ) : (
                                    <div className="aspect-video bg-surface-container flex items-center justify-center">
                                      <a href={artifact.url} target="_blank" rel="noopener noreferrer" className="text-center p-4">
                                        <span className="text-3xl block mb-2">📄</span>
                                        <span className="font-mono text-xs text-ink-muted">View {artifact.type}</span>
                                      </a>
                                    </div>
                                  )}
                                  
                                  {/* Caption & Reflection */}
                                  <figcaption className="p-4 bg-surface-container">
                                    <h5 className="font-medium text-sm">{artifact.title}</h5>
                                    {artifact.caption && (
                                      <p className="text-sm text-ink-muted mt-1">{artifact.caption}</p>
                                    )}
                                    {artifact.reflection && (
                                      <p className="text-sm mt-2 pt-2 border-t border-outline italic">
                                        {artifact.reflection}
                                      </p>
                                    )}
                                    <span className="font-mono text-xs text-ink-muted uppercase mt-2 block">
                                      {artifact.type}
                                    </span>
                                  </figcaption>
                                </figure>
                              ))}
                            </div>
                          </div>
                        )}

                        {entry.resources.length > 0 && (
                          <div>
                            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Resources</h4>
                            <ul className="space-y-2">
                              {entry.resources.map((resource) => (
                                <li key={resource.id} className="text-sm">
                                  <strong>{resource.title}</strong>
                                  {resource.url && (
                                    <span className="text-ink-muted"> — <a href={resource.url} target="_blank" rel="noopener noreferrer" className="underline">{resource.url}</a></span>
                                  )}
                                  {resource.citation && (
                                    <p className="text-ink-muted italic mt-1">{resource.citation}</p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {entry.selectedLenses.length > 0 && (
                          <div>
                            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Reflection Lenses</h4>
                            <div className="flex flex-wrap gap-2">
                              {entry.selectedLenses.map((lensId) => {
                                const lens = course.reflectionLenses.find((l) => l.id === lensId);
                                return lens ? (
                                  <span key={lensId} className="font-mono text-xs px-2 py-1 bg-surface-container">
                                    {lens.label}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}

                        {entry.aiUseDisclosure && (
                          <div className="p-4 bg-surface-container border border-outline">
                            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">AI Use Disclosure</h4>
                            <p className="text-sm">{entry.aiUseDisclosure}</p>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </section>
              );
            })}

            {/* Further Exploration */}
            {explorationAreas.length > 0 && (
              <section id="exploration" className="mb-16 page-break">
                <div className="border-b-2 border-ink pb-4 mb-8">
                  <h2 className="font-editorial text-3xl font-medium">
                    Further Exploration Areas
                  </h2>
                </div>
                <div className="space-y-8">
                  {explorationAreas.map((area) => (
                    <div key={area.id} className="border border-outline p-6">
                      <h3 className="font-editorial text-xl font-medium mb-2">{area.title}</h3>
                      {area.description && <p className="text-ink-muted mb-4">{area.description}</p>}
                      {area.notes && <p className="mb-4">{area.notes}</p>}
                      {area.resources.length > 0 && (
                        <div>
                          <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Resources</h4>
                          <ul className="space-y-1 text-sm">
                            {area.resources.map((r) => (
                              <li key={r.id}>
                                {r.title}
                                {r.url && <span className="text-ink-muted"> — <a href={r.url} className="underline">{r.url}</a></span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Final Synthesis */}
            {synthesis && (
              <section id="synthesis" className="page-break">
                <div className="border-b-2 border-ink pb-4 mb-8">
                  <h2 className="font-editorial text-3xl font-medium">
                    {synthesis.title || 'Final Synthesis'}
                  </h2>
                </div>
                
                {synthesis.introduction && (
                  <div className="mb-8">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Introduction</h3>
                    <p className="whitespace-pre-wrap">{synthesis.introduction}</p>
                  </div>
                )}

                {synthesis.themeNotes.map((theme) => (
                  <div key={theme.id} className="mb-8">
                    <h3 className="font-editorial text-xl font-medium mb-2">{theme.title}</h3>
                    <p className="whitespace-pre-wrap">{theme.notes}</p>
                  </div>
                ))}

                {synthesis.conclusion && (
                  <div className="mb-8">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-2">Conclusion</h3>
                    <p className="whitespace-pre-wrap">{synthesis.conclusion}</p>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-outline p-8 text-center print:p-4">
        <p className="font-mono text-xs text-ink-muted">
          Created with Course Journal Kit
        </p>
      </footer>
    </div>
  );
}
