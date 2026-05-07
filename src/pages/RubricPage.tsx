import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCoursePack } from '../course-packs';
import { getEntries, getFurtherExplorationAreas, getSyntheses } from '../utils/storage';

export default function RubricPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? getCoursePack(courseId) : null;
  const entries = courseId ? getEntries(courseId) : [];
  const explorationAreas = courseId ? getFurtherExplorationAreas(courseId) : [];
  const syntheses = courseId ? getSyntheses(courseId) : [];
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-editorial text-2xl text-ink dark:text-dark-ink mb-4">Course not found</h1>
        <Link to="/" className="text-ink-muted dark:text-dark-ink-muted hover:underline">← Back to Home</Link>
      </div>
    );
  }

  const checkResults = evaluateRubricChecks(course, entries, explorationAreas, syntheses);

  const toggleExpanded = (checkId: string) => {
    const newExpanded = new Set(expandedChecks);
    if (newExpanded.has(checkId)) {
      newExpanded.delete(checkId);
    } else {
      newExpanded.add(checkId);
    }
    setExpandedChecks(newExpanded);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
          {course.code}
        </span>
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight mt-1">
          Grading Rubrics
        </h1>
        <p className="text-ink-muted dark:text-dark-ink-muted mt-2">
          Track your progress against the official course rubrics.
        </p>
      </header>

      {/* Rubrics */}
      {course.rubrics.map((rubric) => {
        const rubricResults = checkResults.filter((r) => 
          rubric.checks.some((c) => c.id === r.checkId)
        );
        const earnedPoints = rubricResults.reduce((sum, r) => sum + r.earnedPoints, 0);
        const percentage = Math.round((earnedPoints / rubric.totalPoints) * 100);

        return (
          <section key={rubric.id} className="mb-12">
            {/* Rubric Header */}
            <div className="border-2 border-ink dark:border-dark-ink p-6 mb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-editorial text-2xl font-medium text-ink dark:text-dark-ink">
                    {rubric.title}
                  </h2>
                  <p className="font-mono text-sm text-ink-muted dark:text-dark-ink-muted mt-1">
                    {rubric.checks.length} criteria • {rubric.totalPoints} total points
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-3xl font-bold text-ink dark:text-dark-ink">
                    {earnedPoints}/{rubric.totalPoints}
                  </div>
                  <div className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">
                    points estimated
                  </div>
                </div>
              </div>
              <div className="h-3 border border-ink dark:border-dark-ink">
                <div
                  className="h-full bg-ink dark:bg-dark-ink transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Rubric Criteria */}
            <div className="space-y-4">
              {rubric.checks.map((check) => {
                const result = checkResults.find((r) => r.checkId === check.id);
                const isExpanded = expandedChecks.has(check.id);
                const hasLevels = check.levels && check.levels.length > 0;

                return (
                  <div
                    key={check.id}
                    className="border border-ink dark:border-dark-ink"
                  >
                    {/* Criterion Header */}
                    <button
                      onClick={() => hasLevels && toggleExpanded(check.id)}
                      className={`w-full p-4 text-left flex items-start gap-4 ${hasLevels ? 'cursor-pointer hover:bg-surface-container dark:hover:bg-dark-surface-container' : ''}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-ink dark:text-dark-ink">
                            {check.label}
                          </h3>
                          <span className="font-mono text-xs px-2 py-0.5 border border-ink dark:border-dark-ink">
                            {check.points} pts
                          </span>
                        </div>
                        <p className="text-sm text-ink-muted dark:text-dark-ink-muted mt-1">
                          {check.description}
                        </p>
                        {result?.details && (
                          <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-2 bg-surface-container dark:bg-dark-surface-container px-2 py-1 inline-block">
                            Status: {result.details}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-mono text-xl font-bold ${result?.earnedPoints === check.points ? 'text-ink dark:text-dark-ink' : 'text-ink-muted dark:text-dark-ink-muted'}`}>
                          {result?.earnedPoints || 0}/{check.points}
                        </div>
                        {hasLevels && (
                          <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">
                            {isExpanded ? '▲ collapse' : '▼ expand'}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Expanded Levels */}
                    {isExpanded && hasLevels && (
                      <div className="border-t border-outline dark:border-dark-outline p-4 bg-surface-container dark:bg-dark-surface-container">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-outline dark:border-dark-outline">
                              <th className="text-left font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted pb-2">Rating</th>
                              <th className="text-left font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted pb-2">Description</th>
                              <th className="text-right font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted pb-2">Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {check.levels!.map((level, idx) => (
                              <tr key={idx} className="border-b border-outline dark:border-dark-outline last:border-0">
                                <td className="py-2 pr-4 font-medium text-ink dark:text-dark-ink align-top">
                                  {level.rating}
                                </td>
                                <td className="py-2 pr-4 text-ink-muted dark:text-dark-ink-muted">
                                  {level.description}
                                </td>
                                <td className="py-2 text-right font-mono text-ink dark:text-dark-ink align-top">
                                  {level.points}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Quick Stats */}
      <section className="mt-12 pt-8 border-t border-outline dark:border-dark-outline">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Your Journal Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border border-outline dark:border-dark-outline">
            <div className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
              {new Set(entries.map((e) => e.sectionId)).size}/{course.sections.length}
            </div>
            <div className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">
              {course.sectionLabel}s with entries
            </div>
          </div>
          <div className="p-4 border border-outline dark:border-dark-outline">
            <div className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
              {entries.length}
            </div>
            <div className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">
              Total entries
            </div>
          </div>
          <div className="p-4 border border-outline dark:border-dark-outline">
            <div className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
              {explorationAreas.length}
            </div>
            <div className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">
              Exploration areas
            </div>
          </div>
          <div className="p-4 border border-outline dark:border-dark-outline">
            <div className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
              {entries.filter((e) => e.published).length}
            </div>
            <div className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">
              Published entries
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface CheckResult {
  checkId: string;
  passed: boolean;
  earnedPoints: number;
  maxPoints: number;
  details?: string;
}

function evaluateRubricChecks(
  course: ReturnType<typeof getCoursePack>,
  entries: ReturnType<typeof getEntries>,
  explorationAreas: ReturnType<typeof getFurtherExplorationAreas>,
  syntheses: ReturnType<typeof getSyntheses>
): CheckResult[] {
  if (!course) return [];

  const results: CheckResult[] = [];
  const publishedEntries = entries.filter((e) => e.published);
  const sectionsWithEntries = new Set(entries.map((e) => e.sectionId));
  const coveredSections = course.sections.filter((s) => sectionsWithEntries.has(s.id)).length;

  course.rubrics.forEach((rubric) => {
    rubric.checks.forEach((check) => {
      let earnedPoints: number;
      let details: string;

      switch (check.id) {
        // Journal Setup Rubric
        case 'organization-structure': {
          if (coveredSections === course.sections.length) {
            earnedPoints = 5;
            details = 'All modules have sections';
          } else if (coveredSections >= course.sections.length * 0.75) {
            earnedPoints = 4;
            details = `${coveredSections}/${course.sections.length} modules covered`;
          } else if (coveredSections >= course.sections.length * 0.5) {
            earnedPoints = 3;
            details = `${coveredSections}/${course.sections.length} modules covered`;
          } else if (coveredSections > 0) {
            earnedPoints = 2;
            details = `Only ${coveredSections}/${course.sections.length} modules`;
          } else {
            earnedPoints = 0;
            details = 'No modules started';
          }
          break;
        }
        case 'content-module-1': {
          const m1Entries = entries.filter((e) => e.sectionId === 'module-1');
          const hasNotes = m1Entries.some((e) => e.notes.trim());
          const hasReflection = m1Entries.some((e) => e.reflection.trim());
          const hasQuestions = m1Entries.some((e) => e.questions.trim());
          
          if (hasNotes && hasReflection && hasQuestions) {
            earnedPoints = 5;
            details = 'Comprehensive Module 1 content';
          } else if (hasNotes && (hasReflection || hasQuestions)) {
            earnedPoints = 4;
            details = 'Good Module 1 content';
          } else if (hasNotes) {
            earnedPoints = 3;
            details = 'Basic Module 1 notes';
          } else if (m1Entries.length > 0) {
            earnedPoints = 2;
            details = 'Minimal Module 1 content';
          } else {
            earnedPoints = 0;
            details = 'No Module 1 entries';
          }
          break;
        }
        case 'use-of-media': {
          const totalResources = entries.reduce((sum, e) => sum + e.resources.length, 0);
          if (totalResources >= 5) {
            earnedPoints = 5;
            details = `${totalResources} resources integrated`;
          } else if (totalResources >= 3) {
            earnedPoints = 4;
            details = `${totalResources} resources added`;
          } else if (totalResources >= 1) {
            earnedPoints = 3;
            details = `${totalResources} resource(s) present`;
          } else {
            earnedPoints = 0;
            details = 'No resources added';
          }
          break;
        }
        case 'technical-quality': {
          if (publishedEntries.length > 0) {
            earnedPoints = 5;
            details = `${publishedEntries.length} entries published and linkable`;
          } else if (entries.length > 0) {
            earnedPoints = 3;
            details = 'Entries exist but not published';
          } else {
            earnedPoints = 0;
            details = 'No entries yet';
          }
          break;
        }

        // Final Journal Rubric
        case 'comprehensive-coverage': {
          const percentage = coveredSections / course.sections.length;
          if (percentage === 1) {
            earnedPoints = 5;
            details = 'All 8 modules covered';
          } else if (percentage >= 0.875) {
            earnedPoints = 4;
            details = `${coveredSections}/8 modules covered`;
          } else if (percentage >= 0.625) {
            earnedPoints = 3;
            details = `${coveredSections}/8 modules - coverage uneven`;
          } else {
            earnedPoints = 2;
            details = `Only ${coveredSections}/8 modules`;
          }
          break;
        }
        case 'critical-reflection': {
          const withReflection = entries.filter((e) => e.reflection.trim().length > 100);
          const withPersonal = entries.filter((e) => e.personalConnection.trim());
          if (withReflection.length >= 8 && withPersonal.length >= 4) {
            earnedPoints = 5;
            details = 'Deep reflection with personal connections';
          } else if (withReflection.length >= 6) {
            earnedPoints = 4;
            details = `${withReflection.length} entries with reflection`;
          } else if (withReflection.length >= 3) {
            earnedPoints = 3;
            details = 'Basic reflection present';
          } else {
            earnedPoints = 2;
            details = 'Minimal reflection';
          }
          break;
        }
        case 'further-exploration': {
          const minRequired = course.requirements.minimumFurtherExplorationAreas || 3;
          if (explorationAreas.length >= minRequired && explorationAreas.every((a) => a.notes.trim())) {
            earnedPoints = 5;
            details = `${explorationAreas.length} areas with detailed notes`;
          } else if (explorationAreas.length >= minRequired) {
            earnedPoints = 4;
            details = `${explorationAreas.length} areas identified`;
          } else if (explorationAreas.length >= 1) {
            earnedPoints = 3;
            details = `${explorationAreas.length}/${minRequired} areas`;
          } else {
            earnedPoints = 2;
            details = 'No exploration areas';
          }
          break;
        }
        case 'organization-coherence': {
          const hasAllSections = coveredSections === course.sections.length;
          const hasSynthesis = syntheses.length > 0 && syntheses[0].conclusion.trim();
          if (hasAllSections && hasSynthesis) {
            earnedPoints = 5;
            details = 'Well-organized with synthesis';
          } else if (hasAllSections) {
            earnedPoints = 4;
            details = 'Good organization';
          } else if (coveredSections >= 4) {
            earnedPoints = 3;
            details = 'Partial organization';
          } else {
            earnedPoints = 2;
            details = 'Needs better organization';
          }
          break;
        }
        case 'clarity-grammar': {
          const avgLength = entries.length > 0 
            ? entries.reduce((sum, e) => sum + e.reflection.length + e.notes.length, 0) / entries.length 
            : 0;
          if (avgLength > 500 && publishedEntries.length > 0) {
            earnedPoints = 5;
            details = 'Clear, polished writing';
          } else if (avgLength > 300) {
            earnedPoints = 4;
            details = 'Good writing quality';
          } else if (avgLength > 100) {
            earnedPoints = 3;
            details = 'Basic writing present';
          } else {
            earnedPoints = 2;
            details = 'Needs more content';
          }
          break;
        }

        default:
          earnedPoints = 0;
          details = 'Self-assessment needed';
      }

      results.push({ 
        checkId: check.id, 
        passed: earnedPoints >= check.points * 0.8, 
        earnedPoints,
        maxPoints: check.points,
        details 
      });
    });
  });

  return results;
}
