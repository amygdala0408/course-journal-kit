import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDarkMode } from './hooks/useDarkMode';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import SectionPage from './pages/SectionPage';
import EntryPage from './pages/EntryPage';
import ResourcesPage from './pages/ResourcesPage';
import SearchPage from './pages/SearchPage';
import RubricPage from './pages/RubricPage';
import ReviewPage from './pages/ReviewPage';
import ExplorationPage from './pages/ExplorationPage';
import SynthesisPage from './pages/SynthesisPage';
import ExportPage from './pages/ExportPage';
import CourseBuilderPage from './pages/CourseBuilderPage';
import PublicPage from './pages/PublicPage';
import SettingsPage from './pages/SettingsPage';
import SourcesPage from './pages/SourcesPage';

function App() {
  const { isDark, toggleDarkMode, preference, setDarkMode } = useDarkMode();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route - no layout */}
        <Route path="/public/:courseId" element={<PublicPage />} />
        <Route path="/share/:shareId" element={<PublicPage />} />

        {/* App routes with layout */}
        <Route
          element={
            <Layout
              isDark={isDark}
              toggleDarkMode={toggleDarkMode}
              preference={preference}
              setDarkMode={setDarkMode}
            />
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/course/:courseId" element={<CoursePage />} />
          <Route path="/course/:courseId/section/:sectionId" element={<SectionPage />} />
          <Route path="/course/:courseId/entry/new" element={<EntryPage />} />
          <Route path="/course/:courseId/entry/:entryId" element={<EntryPage />} />
          <Route path="/course/:courseId/resources" element={<ResourcesPage />} />
          <Route path="/course/:courseId/sources" element={<SourcesPage />} />
          <Route path="/course/:courseId/section/:sectionId/sources" element={<SourcesPage />} />
          <Route path="/course/:courseId/search" element={<SearchPage />} />
          <Route path="/course/:courseId/rubric" element={<RubricPage />} />
          <Route path="/course/:courseId/review" element={<ReviewPage />} />
          <Route path="/course/:courseId/exploration" element={<ExplorationPage />} />
          <Route path="/course/:courseId/synthesis" element={<SynthesisPage />} />
          <Route path="/course/:courseId/export" element={<ExportPage />} />
          <Route path="/builder" element={<CourseBuilderPage />} />
          <Route path="/builder/:courseId" element={<CourseBuilderPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
