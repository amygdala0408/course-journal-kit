import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CoursePack, CourseSource } from '../schemas/types';

type WorkflowStep = 'sources' | 'reading' | 'notes' | 'draft' | 'review';

interface WorkflowWizardProps {
  course: CoursePack;
  sectionId: string;
  sources: CourseSource[];
  hasEntry: boolean;
  onClose: () => void;
}

export default function WeeklyWorkflowWizard({
  course,
  sectionId,
  sources,
  hasEntry,
  onClose,
}: WorkflowWizardProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('sources');
  
  const section = course.sections.find(s => s.id === sectionId);
  const completedSources = sources.filter(s => s.readingStatus === 'completed');
  const inProgressSources = sources.filter(s => s.readingStatus === 'in-progress');
  const sourcesWithNotes = sources.filter(s => s.notes || s.keyQuotes.length > 0);
  
  const steps: { id: WorkflowStep; label: string; description: string }[] = [
    { id: 'sources', label: 'Add Sources', description: 'Add your assigned readings and any supplementary sources' },
    { id: 'reading', label: 'Read & Track', description: 'Work through your sources and mark progress' },
    { id: 'notes', label: 'Take Notes', description: 'Add notes, quotes, and questions to each source' },
    { id: 'draft', label: 'Draft Entry', description: 'Compile your notes into a journal entry' },
    { id: 'review', label: 'Review & Publish', description: 'Polish your entry and publish when ready' },
  ];
  
  const getStepStatus = (stepId: WorkflowStep): 'complete' | 'current' | 'upcoming' => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };
  
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'sources': return sources.length > 0;
      case 'reading': return completedSources.length > 0;
      case 'notes': return sourcesWithNotes.length > 0;
      case 'draft': return true;
      case 'review': return hasEntry;
      default: return false;
    }
  };
  
  const nextStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };
  
  const prevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface dark:bg-dark-surface border-2 border-ink dark:border-dark-ink w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-ink dark:border-dark-ink flex justify-between items-center">
          <div>
            <h2 className="font-editorial text-xl font-medium text-ink dark:text-dark-ink">
              Weekly Workflow
            </h2>
            <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted mt-1">
              {course.sectionLabel} {section?.number}: {section?.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted dark:text-dark-ink-muted hover:text-ink dark:hover:text-dark-ink text-xl"
          >
            ✕
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-4 py-3 border-b border-outline dark:border-dark-outline bg-surface-container dark:bg-dark-surface-container">
          <div className="flex justify-between">
            {steps.map((step, i) => {
              const status = getStepStatus(step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className="flex flex-col items-center flex-1"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono mb-1 ${
                    status === 'complete' 
                      ? 'bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface'
                      : status === 'current'
                      ? 'border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink'
                      : 'border border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted'
                  }`}>
                    {status === 'complete' ? '✓' : i + 1}
                  </div>
                  <span className={`font-mono text-xs ${
                    status === 'current' ? 'text-ink dark:text-dark-ink' : 'text-ink-muted dark:text-dark-ink-muted'
                  }`}>
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'sources' && (
            <div className="space-y-4">
              <h3 className="font-editorial text-lg text-ink dark:text-dark-ink">
                Step 1: Add Your Sources
              </h3>
              <p className="text-ink-muted dark:text-dark-ink-muted">
                Start by adding the assigned readings for this {course.sectionLabel.toLowerCase()}. 
                You can also add supplementary sources you find interesting.
              </p>
              
              <div className="p-4 border border-outline dark:border-dark-outline">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm text-ink dark:text-dark-ink">
                    Sources Added
                  </span>
                  <span className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
                    {sources.length}
                  </span>
                </div>
                {sources.length === 0 ? (
                  <p className="text-sm text-ink-muted dark:text-dark-ink-muted">
                    No sources yet. Add your first source to continue.
                  </p>
                ) : (
                  <ul className="text-sm text-ink-muted dark:text-dark-ink-muted space-y-1">
                    {sources.slice(0, 3).map(s => (
                      <li key={s.id}>• {s.title}</li>
                    ))}
                    {sources.length > 3 && <li>• ...and {sources.length - 3} more</li>}
                  </ul>
                )}
              </div>
              
              <Link
                to={`/course/${course.id}/section/${sectionId}/sources`}
                className="block w-full py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider text-center"
              >
                Go to Sources Page →
              </Link>
            </div>
          )}
          
          {currentStep === 'reading' && (
            <div className="space-y-4">
              <h3 className="font-editorial text-lg text-ink dark:text-dark-ink">
                Step 2: Read & Track Progress
              </h3>
              <p className="text-ink-muted dark:text-dark-ink-muted">
                Work through your sources. Update the reading status as you go.
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border border-outline dark:border-dark-outline text-center">
                  <div className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
                    {completedSources.length}
                  </div>
                  <div className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">
                    Completed
                  </div>
                </div>
                <div className="p-4 border border-outline dark:border-dark-outline text-center">
                  <div className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
                    {inProgressSources.length}
                  </div>
                  <div className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">
                    In Progress
                  </div>
                </div>
                <div className="p-4 border border-outline dark:border-dark-outline text-center">
                  <div className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
                    {sources.length - completedSources.length - inProgressSources.length}
                  </div>
                  <div className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted uppercase">
                    Unread
                  </div>
                </div>
              </div>
              
              {completedSources.length === 0 && (
                <p className="text-sm text-ink-muted dark:text-dark-ink-muted p-4 border border-dashed border-outline dark:border-dark-outline">
                  Complete at least one source to continue to the next step.
                </p>
              )}
              
              <Link
                to={`/course/${course.id}/section/${sectionId}/sources`}
                className="block w-full py-3 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider text-center"
              >
                Update Reading Status →
              </Link>
            </div>
          )}
          
          {currentStep === 'notes' && (
            <div className="space-y-4">
              <h3 className="font-editorial text-lg text-ink dark:text-dark-ink">
                Step 3: Take Notes
              </h3>
              <p className="text-ink-muted dark:text-dark-ink-muted">
                For each source, add your notes, key quotes, questions, and connections.
              </p>
              
              <div className="p-4 border border-outline dark:border-dark-outline">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm text-ink dark:text-dark-ink">
                    Sources with Notes
                  </span>
                  <span className="font-mono text-2xl font-bold text-ink dark:text-dark-ink">
                    {sourcesWithNotes.length}/{sources.length}
                  </span>
                </div>
                <div className="text-sm text-ink-muted dark:text-dark-ink-muted">
                  Total quotes saved: {sources.reduce((acc, s) => acc + s.keyQuotes.length, 0)}
                </div>
              </div>
              
              <div className="p-4 bg-surface-container dark:bg-dark-surface-container">
                <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
                  Tips for Good Notes
                </h4>
                <ul className="text-sm text-ink-muted dark:text-dark-ink-muted space-y-1">
                  <li>• Summarize key arguments in your own words</li>
                  <li>• Save quotes that support or challenge your thinking</li>
                  <li>• Note questions the source raises for you</li>
                  <li>• Connect ideas across different sources</li>
                </ul>
              </div>
              
              <Link
                to={`/course/${course.id}/section/${sectionId}/sources`}
                className="block w-full py-3 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider text-center"
              >
                Add Notes to Sources →
              </Link>
            </div>
          )}
          
          {currentStep === 'draft' && (
            <div className="space-y-4">
              <h3 className="font-editorial text-lg text-ink dark:text-dark-ink">
                Step 4: Draft Your Entry
              </h3>
              <p className="text-ink-muted dark:text-dark-ink-muted">
                Create a new journal entry and use "Draft from Sources" to compile your notes 
                into a starting point for your reflection.
              </p>
              
              <div className="p-4 bg-surface-container dark:bg-dark-surface-container">
                <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
                  Your Notes Summary
                </h4>
                <ul className="text-sm text-ink dark:text-dark-ink space-y-1">
                  <li>• {completedSources.length} sources completed</li>
                  <li>• {sources.reduce((acc, s) => acc + s.keyQuotes.length, 0)} quotes saved</li>
                  <li>• {sourcesWithNotes.length} sources with notes</li>
                </ul>
              </div>
              
              <Link
                to={`/course/${course.id}/entry/new?section=${sectionId}`}
                className="block w-full py-3 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm uppercase tracking-wider text-center"
              >
                Create New Entry →
              </Link>
              
              <p className="text-xs text-ink-muted dark:text-dark-ink-muted text-center">
                Use the "Draft from Sources" button in the entry sidebar to compile your notes
              </p>
            </div>
          )}
          
          {currentStep === 'review' && (
            <div className="space-y-4">
              <h3 className="font-editorial text-lg text-ink dark:text-dark-ink">
                Step 5: Review & Publish
              </h3>
              <p className="text-ink-muted dark:text-dark-ink-muted">
                Review your entry, ensure it addresses the weekly prompt, and publish when ready.
              </p>
              
              <div className="p-4 bg-surface-container dark:bg-dark-surface-container">
                <h4 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-2">
                  Final Checklist
                </h4>
                <ul className="text-sm text-ink dark:text-dark-ink space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 border border-ink dark:border-dark-ink flex items-center justify-center text-xs">
                      {hasEntry ? '✓' : ''}
                    </span>
                    Entry created
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 border border-ink dark:border-dark-ink flex items-center justify-center text-xs"></span>
                    Addresses weekly prompt
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 border border-ink dark:border-dark-ink flex items-center justify-center text-xs"></span>
                    Cites sources appropriately
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 border border-ink dark:border-dark-ink flex items-center justify-center text-xs"></span>
                    Includes personal reflection
                  </li>
                </ul>
              </div>
              
              <button
                onClick={onClose}
                className="w-full py-3 bg-ink dark:bg-dark-ink text-inverse-on-surface dark:text-dark-surface font-mono text-sm uppercase tracking-wider"
              >
                Complete Workflow ✓
              </button>
            </div>
          )}
        </div>
        
        {/* Footer Navigation */}
        <div className="p-4 border-t border-outline dark:border-dark-outline flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 'sources'}
            className="px-4 py-2 border border-outline dark:border-dark-outline text-ink-muted dark:text-dark-ink-muted hover:border-ink dark:hover:border-dark-ink hover:text-ink dark:hover:text-dark-ink font-mono text-sm disabled:opacity-30"
          >
            ← Previous
          </button>
          
          {currentStep !== 'review' && (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="px-4 py-2 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface font-mono text-sm disabled:opacity-30"
            >
              Next Step →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
