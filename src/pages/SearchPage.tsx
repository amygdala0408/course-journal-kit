import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCoursePack } from '../course-packs';
import { getEntries } from '../utils/storage';

type SearchDatabase = 'google-scholar' | 'eric' | 'pubmed' | 'google';

const databases: Array<{ id: SearchDatabase; name: string; baseUrl: string; description: string }> = [
  {
    id: 'google-scholar',
    name: 'Google Scholar',
    baseUrl: 'https://scholar.google.com/scholar?q=',
    description: 'Academic papers, theses, books, conference papers',
  },
  {
    id: 'eric',
    name: 'ERIC',
    baseUrl: 'https://eric.ed.gov/?q=',
    description: 'Education research and information',
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    baseUrl: 'https://pubmed.ncbi.nlm.nih.gov/?term=',
    description: 'Biomedical and life sciences literature',
  },
  {
    id: 'google',
    name: 'Google',
    baseUrl: 'https://www.google.com/search?q=',
    description: 'General web search',
  },
];

export default function SearchPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? getCoursePack(courseId) : null;
  const entries = courseId ? getEntries(courseId) : [];

  const [query, setQuery] = useState('');
  const [selectedDb, setSelectedDb] = useState<SearchDatabase>('google-scholar');
  const [includeCourseTopic, setIncludeCourseTopic] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>('');

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-editorial text-2xl text-ink dark:text-dark-ink mb-4">Course not found</h1>
        <Link to="/" className="text-ink-muted dark:text-dark-ink-muted hover:underline">← Back to Home</Link>
      </div>
    );
  }

  const section = selectedSection ? course.sections.find((s) => s.id === selectedSection) : null;
  const sectionContext = section ? `${section.title} educational technology` : '';
  
  const buildSearchQuery = () => {
    let fullQuery = query.trim();
    if (includeCourseTopic && sectionContext) {
      fullQuery = `${fullQuery} ${sectionContext}`.trim();
    }
    return fullQuery;
  };

  const getSearchUrl = () => {
    const db = databases.find((d) => d.id === selectedDb);
    if (!db) return '';
    return `${db.baseUrl}${encodeURIComponent(buildSearchQuery())}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const suggestedQueries = [
    'benefits challenges implementation',
    'research evidence effectiveness',
    'best practices strategies',
    'case study example',
    'framework model theory',
    'equity access inclusion',
    'student outcomes assessment',
    'teacher professional development',
  ];

  const questionsFromEntries = entries
    .filter((e) => e.questions.trim())
    .flatMap((e) => e.questions.split('\n').filter((q) => q.trim()))
    .slice(0, 5);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
          {course.code}
        </span>
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight mt-1">
          Source Search
        </h1>
        <p className="text-ink-muted dark:text-dark-ink-muted mt-2">
          Generate search queries to find academic sources for your reflections.
        </p>
      </header>

      {/* Search Builder */}
      <section className="mb-8 p-6 border-2 border-ink dark:border-dark-ink">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Build Your Search
        </h2>

        {/* Query Input */}
        <div className="mb-4">
          <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
            Search Terms
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search terms..."
            rows={3}
            className="w-full p-4 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink placeholder:text-outline dark:placeholder:text-dark-outline"
          />
        </div>

        {/* Section Context */}
        <div className="mb-4">
          <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
            Add {course.sectionLabel} Context
          </label>
          <div className="flex gap-4 items-center">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="flex-1 p-3 border border-ink dark:border-dark-ink bg-surface dark:bg-dark-surface text-ink dark:text-dark-ink"
            >
              <option value="">No context</option>
              {course.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {course.sectionLabel} {s.number}: {s.title}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCourseTopic}
                onChange={(e) => setIncludeCourseTopic(e.target.checked)}
                className="w-5 h-5 border-2 border-ink dark:border-dark-ink"
              />
              <span className="font-mono text-sm text-ink dark:text-dark-ink">Include</span>
            </label>
          </div>
        </div>

        {/* Database Selection */}
        <div className="mb-6">
          <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
            Search Database
          </label>
          <div className="grid grid-cols-2 gap-2">
            {databases.map((db) => (
              <button
                key={db.id}
                onClick={() => setSelectedDb(db.id)}
                className={`p-3 border text-left ${
                  selectedDb === db.id
                    ? 'bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface border-ink dark:border-dark-ink'
                    : 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container'
                }`}
              >
                <div className="font-mono text-sm font-medium">{db.name}</div>
                <div className="text-xs opacity-70 mt-1">{db.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Generated Query Preview */}
        <div className="mb-6 p-4 bg-surface-container dark:bg-dark-surface-container border border-outline dark:border-dark-outline">
          <label className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted block mb-2">
            Generated Query
          </label>
          <p className="font-mono text-sm text-ink dark:text-dark-ink break-all">
            {buildSearchQuery() || '(enter search terms above)'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href={getSearchUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 py-3 text-center border-2 font-mono text-sm uppercase tracking-wider ${
              query.trim()
                ? 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface'
                : 'border-outline dark:border-dark-outline text-outline dark:text-dark-outline cursor-not-allowed'
            }`}
          >
            Search →
          </a>
          <button
            onClick={() => copyToClipboard(buildSearchQuery())}
            disabled={!query.trim()}
            className="px-6 py-3 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm disabled:opacity-50"
          >
            Copy Query
          </button>
          <button
            onClick={() => copyToClipboard(getSearchUrl())}
            disabled={!query.trim()}
            className="px-6 py-3 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm disabled:opacity-50"
          >
            Copy URL
          </button>
        </div>
      </section>

      {/* Suggested Queries */}
      <section className="mb-8">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Suggested Search Patterns
        </h2>
        <div className="flex flex-wrap gap-2">
          {suggestedQueries.map((sq) => (
            <button
              key={sq}
              onClick={() => setQuery((prev) => `${prev} ${sq}`.trim())}
              className="px-3 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-xs"
            >
              + {sq}
            </button>
          ))}
        </div>
      </section>

      {/* Questions from Entries */}
      {questionsFromEntries.length > 0 && (
        <section>
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Questions from Your Journal
          </h2>
          <div className="space-y-2">
            {questionsFromEntries.map((q, i) => (
              <button
                key={i}
                onClick={() => setQuery(q)}
                className="block w-full text-left p-3 border border-outline dark:border-dark-outline text-ink dark:text-dark-ink hover:border-ink dark:hover:border-dark-ink text-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
