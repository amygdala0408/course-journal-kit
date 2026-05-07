import { useState } from 'react';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import { useKeyboardShortcuts, getShortcutLabel } from '../hooks/useKeyboardShortcuts';
import { getCoursePack } from '../course-packs';
import { getEntries, getSources } from '../utils/storage';
import WeeklyWorkflowWizard from './WeeklyWorkflowWizard';

interface LayoutProps {
  isDark: boolean;
  toggleDarkMode: () => void;
  preference: 'system' | 'light' | 'dark';
  setDarkMode: (pref: 'system' | 'light' | 'dark') => void;
}

export default function Layout({ isDark, toggleDarkMode }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showWorkflowWizard, setShowWorkflowWizard] = useState(false);
  const location = useLocation();
  const { courseId } = useParams();

  const currentCourse = courseId ? getCoursePack(courseId) : null;
  
  // Extract current section from URL
  const sectionMatch = location.pathname.match(/\/section\/([^/]+)/);
  const currentSectionId = sectionMatch ? sectionMatch[1] : null;
  const currentSection = currentCourse?.sections.find(s => s.id === currentSectionId);
  
  // Get sources for current section (for workflow wizard)
  const sectionSources = currentSectionId && courseId ? getSources(courseId, currentSectionId) : [];
  const hasSectionEntry = currentSectionId && courseId
    ? getEntries(courseId).some((entry) => entry.sectionId === currentSectionId)
    : false;

  useKeyboardShortcuts({
    toggleSidebar: () => setSidebarOpen((prev) => !prev),
  });

  const isActive = (path: string) => location.pathname === path;
  const isActivePrefix = (prefix: string) => location.pathname.startsWith(prefix);

  return (
    <div className={`min-h-screen flex ${isDark ? 'dark bg-dark-surface' : 'bg-surface'}`}>
      {/* Sidebar / Archive Index */}
      <aside
        className={`
          ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}
          border-r-2 border-ink dark:border-dark-ink
          transition-all duration-200
          flex flex-col
          bg-surface dark:bg-dark-surface
        `}
      >
        {/* Logo / Title */}
        <div className="p-6 border-b border-ink dark:border-dark-ink">
          <Link to="/" className="block">
            <h1 className="font-editorial text-2xl font-semibold text-ink dark:text-dark-ink leading-tight">
              Course Journal Kit
            </h1>
          </Link>
        </div>

        {/* Course Navigation */}
        {currentCourse && (
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                {currentCourse.code || 'Current Course'}
              </span>
              <h2 className="font-editorial text-lg font-medium text-ink dark:text-dark-ink mt-1">
                {currentCourse.title}
              </h2>
            </div>

            {/* Section Links */}
            <div className="space-y-1">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
                {currentCourse.sectionLabel}s
              </span>
              {currentCourse.sections.map((section) => (
                <Link
                  key={section.id}
                  to={`/course/${courseId}/section/${section.id}`}
                  className={`
                    block px-3 py-2 text-sm border
                    ${
                      isActivePrefix(`/course/${courseId}/section/${section.id}`)
                        ? 'bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface border-ink dark:border-dark-ink'
                        : 'border-transparent hover:border-ink dark:hover:border-dark-ink text-ink dark:text-dark-ink'
                    }
                  `}
                >
                  {currentCourse.sectionLabel} {section.number}: {section.title}
                </Link>
              ))}
            </div>

            {/* Tools */}
            <div className="mt-8 space-y-1">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
                Tools
              </span>
              <NavLink to={`/course/${courseId}/sources`} active={isActive(`/course/${courseId}/sources`)}>
                Sources & Readings
              </NavLink>
              <NavLink to={`/course/${courseId}/search`} active={isActive(`/course/${courseId}/search`)}>
                Source Search
              </NavLink>
              <NavLink to={`/course/${courseId}/resources`} active={isActive(`/course/${courseId}/resources`)}>
                Resources
              </NavLink>
              <NavLink to={`/course/${courseId}/rubric`} active={isActive(`/course/${courseId}/rubric`)}>
                Rubric Tracker
              </NavLink>
              <NavLink to={`/course/${courseId}/review`} active={isActive(`/course/${courseId}/review`)}>
                Review Cards
              </NavLink>
              <NavLink to={`/course/${courseId}/exploration`} active={isActive(`/course/${courseId}/exploration`)}>
                Further Exploration
              </NavLink>
              <NavLink to={`/course/${courseId}/synthesis`} active={isActive(`/course/${courseId}/synthesis`)}>
                Final Synthesis
              </NavLink>
              <NavLink to={`/course/${courseId}/export`} active={isActive(`/course/${courseId}/export`)}>
                Export / Share
              </NavLink>
            </div>
          </nav>
        )}

        {/* Bottom Links */}
        <div className="p-4 border-t border-ink dark:border-dark-ink">
          <NavLink to="/builder" active={isActivePrefix('/builder')}>
            Course Builder
          </NavLink>
          <NavLink to="/settings" active={isActive('/settings')}>
            Settings
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-14 border-b border-ink dark:border-dark-ink flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="p-2 border border-ink dark:border-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
            title={`Toggle sidebar (${getShortcutLabel('toggleSidebar')})`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            {/* Weekly Workflow Button - shows when in a section context */}
            {currentSection && (
              <button
                onClick={() => setShowWorkflowWizard(true)}
                className="px-3 py-1.5 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-xs uppercase tracking-wider"
              >
                Workflow: {currentCourse?.sectionLabel} {currentSection.number}
              </button>
            )}
            {currentCourse && (
              <Link
                to={`/public/${courseId}`}
                target="_blank"
                className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink"
              >
                View Public Journal →
              </Link>
            )}
            <button
              onClick={toggleDarkMode}
              className="p-2 border border-ink dark:border-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
              title="Toggle dark mode"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Weekly Workflow Wizard - accessible from anywhere in a section */}
      {showWorkflowWizard && currentCourse && currentSectionId && (
        <WeeklyWorkflowWizard
          course={currentCourse}
          sectionId={currentSectionId}
          sources={sectionSources}
          hasEntry={hasSectionEntry}
          onClose={() => setShowWorkflowWizard(false)}
        />
      )}
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`
        block px-3 py-2 text-sm border
        ${
          active
            ? 'bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface border-ink dark:border-dark-ink'
            : 'border-transparent hover:border-ink dark:hover:border-dark-ink text-ink dark:text-dark-ink'
        }
      `}
    >
      {children}
    </Link>
  );
}
