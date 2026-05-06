import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCoursePack } from '../course-packs';
import { getEntries, getReviewCards, saveReviewCard } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';
import type { ReviewCard } from '../schemas/types';

export default function ReviewPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? getCoursePack(courseId) : null;
  const entries = courseId ? getEntries(courseId) : [];
  const existingCards = courseId ? getReviewCards(courseId) : [];

  const [cards, setCards] = useState<ReviewCard[]>(existingCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState<'review' | 'generate'>('review');

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-editorial text-2xl text-ink dark:text-dark-ink mb-4">Course not found</h1>
        <Link to="/" className="text-ink-muted dark:text-dark-ink-muted hover:underline">← Back to Home</Link>
      </div>
    );
  }

  const generateCardsFromEntries = () => {
    const newCards: ReviewCard[] = [];

    entries.forEach((entry) => {
      const section = course.sections.find((s) => s.id === entry.sectionId);

      if (entry.questions.trim()) {
        entry.questions.split('\n').filter((q) => q.trim()).forEach((question) => {
          if (!cards.some((c) => c.question === question.trim())) {
            newCards.push({
              id: uuidv4(),
              courseId: course.id,
              sectionId: entry.sectionId,
              entryId: entry.id,
              question: question.trim(),
              source: 'questions',
              timesReviewed: 0,
              confidence: 0,
            });
          }
        });
      }

      if (entry.keyConcepts.trim()) {
        const conceptQuestion = `What are the key concepts from ${course.sectionLabel} ${section?.number}: ${section?.title}?`;
        if (!cards.some((c) => c.question === conceptQuestion)) {
          newCards.push({
            id: uuidv4(),
            courseId: course.id,
            sectionId: entry.sectionId,
            entryId: entry.id,
            question: conceptQuestion,
            answer: entry.keyConcepts,
            source: 'keyConcepts',
            timesReviewed: 0,
            confidence: 0,
          });
        }
      }

      if (entry.keyTakeaways.trim()) {
        const takeawayQuestion = `What are the key takeaways from ${course.sectionLabel} ${section?.number}: ${section?.title}?`;
        if (!cards.some((c) => c.question === takeawayQuestion)) {
          newCards.push({
            id: uuidv4(),
            courseId: course.id,
            sectionId: entry.sectionId,
            entryId: entry.id,
            question: takeawayQuestion,
            answer: entry.keyTakeaways,
            source: 'keyConcepts',
            timesReviewed: 0,
            confidence: 0,
          });
        }
      }
    });

    newCards.forEach((card) => saveReviewCard(card));
    setCards([...cards, ...newCards]);
  };

  const markReviewed = (confidence: number) => {
    if (cards.length === 0) return;

    const card = cards[currentIndex];
    const updatedCard: ReviewCard = {
      ...card,
      lastReviewed: new Date().toISOString(),
      timesReviewed: card.timesReviewed + 1,
      confidence,
    };

    saveReviewCard(updatedCard);
    setCards(cards.map((c) => (c.id === card.id ? updatedCard : c)));
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const currentCard = cards[currentIndex];
  const section = currentCard ? course.sections.find((s) => s.id === currentCard.sectionId) : null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
          {course.code}
        </span>
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight mt-1">
          Review Cards
        </h1>
        <p className="text-ink-muted dark:text-dark-ink-muted mt-2">
          Practice retrieval with flashcard-style review.
        </p>
      </header>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setMode('review')}
          className={`px-4 py-2 border font-mono text-sm ${
            mode === 'review'
              ? 'bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface border-ink dark:border-dark-ink'
              : 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink'
          }`}
        >
          Review ({cards.length})
        </button>
        <button
          onClick={() => setMode('generate')}
          className={`px-4 py-2 border font-mono text-sm ${
            mode === 'generate'
              ? 'bg-ink text-inverse-on-surface dark:bg-dark-ink dark:text-dark-surface border-ink dark:border-dark-ink'
              : 'border-ink dark:border-dark-ink text-ink dark:text-dark-ink'
          }`}
        >
          Generate Cards
        </button>
      </div>

      {mode === 'generate' ? (
        <section className="p-6 border-2 border-ink dark:border-dark-ink">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Generate Review Cards
          </h2>
          <p className="text-ink-muted dark:text-dark-ink-muted mb-6">
            Automatically create review cards from your journal entries. Cards are generated from:
          </p>
          <ul className="list-disc list-inside text-ink-muted dark:text-dark-ink-muted mb-6 space-y-1">
            <li>Questions you've written</li>
            <li>Key concepts from each entry</li>
            <li>Key takeaways from each entry</li>
          </ul>
          <button
            onClick={generateCardsFromEntries}
            className="px-6 py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider"
          >
            Generate Cards from Entries
          </button>
          <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-4">
            {entries.length} entries available • {cards.length} cards created
          </p>
        </section>
      ) : cards.length === 0 ? (
        <div className="border-2 border-dashed border-outline dark:border-dark-outline p-12 text-center">
          <p className="text-ink-muted dark:text-dark-ink-muted mb-4">
            No review cards yet. Generate cards from your journal entries.
          </p>
          <button
            onClick={() => setMode('generate')}
            className="inline-block px-6 py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider"
          >
            Generate Cards
          </button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="mb-6 flex justify-between items-center">
            <span className="font-mono text-sm text-ink-muted dark:text-dark-ink-muted">
              Card {currentIndex + 1} of {cards.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)}
                className="px-3 py-1 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm"
              >
                ← Prev
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % cards.length)}
                className="px-3 py-1 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-surface-container-high dark:hover:bg-dark-surface-container font-mono text-sm"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Card */}
          <div className="border-2 border-ink dark:border-dark-ink p-8 min-h-[300px] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <span className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">
                {course.sectionLabel} {section?.number}: {section?.title}
              </span>
              <span className="font-mono text-xs px-2 py-1 border border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted">
                {currentCard.source}
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <p className="font-editorial text-2xl text-ink dark:text-dark-ink text-center mb-8">
                {currentCard.question}
              </p>

              {showAnswer && currentCard.answer && (
                <div className="p-4 bg-surface-container dark:bg-dark-surface-container border border-outline dark:border-dark-outline">
                  <p className="text-ink dark:text-dark-ink whitespace-pre-wrap">
                    {currentCard.answer}
                  </p>
                </div>
              )}
            </div>

            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider"
              >
                {currentCard.answer ? 'Show Answer' : 'Think About It...'}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted text-center">
                  How confident do you feel?
                </p>
                <div className="flex gap-2">
                  {[
                    { label: 'Not at all', value: 1 },
                    { label: 'Somewhat', value: 2 },
                    { label: 'Confident', value: 3 },
                    { label: 'Very confident', value: 4 },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => markReviewed(option.value)}
                      className="flex-1 py-3 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-xs"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-4 flex justify-between font-mono text-xs text-ink-muted dark:text-dark-ink-muted">
            <span>Reviewed {currentCard.timesReviewed} times</span>
            {currentCard.lastReviewed && (
              <span>Last: {new Date(currentCard.lastReviewed).toLocaleDateString()}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
