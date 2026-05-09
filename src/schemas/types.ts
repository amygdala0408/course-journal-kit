// Core TypeScript schemas for Course Journal Kit

// ============================================
// COURSE PACK TYPES (Course-specific data)
// ============================================

export type CoursePack = {
  id: string;
  title: string;
  code?: string;
  term?: string;
  description?: string;
  sectionLabel: 'Module' | 'Week' | 'Unit' | 'Chapter' | 'Session' | 'Theme' | string;
  
  requirements: CourseRequirements;
  outcomes: CourseOutcome[];
  sections: CourseSection[];
  rubrics: Rubric[];
  reflectionLenses: ReflectionLens[];
  promptTemplates?: PromptTemplate[];
  weeklyPrompts?: WeeklyPrompt[];
};

export type CourseRequirements = {
  publicLinkRequired?: boolean;
  minimumFurtherExplorationAreas?: number;
  requiresFinalSynthesis?: boolean;
  requiresResources?: boolean;
  requiresMedia?: boolean;
};

export type CourseOutcome = {
  id: string;
  label: string;
  text: string;
};

export type CourseSection = {
  id: string;
  number: number;
  title: string;
  description?: string;
  topics: CourseTopic[];
  requiredSources?: CourseSourceSeed[];
  outcomes?: string[];
  assignments?: Assignment[];
  keyFrameworks?: string[];
  dueDate?: string;
};

export type CourseTopic = {
  id: string;
  title: string;
  required?: boolean;
  guidingQuestions?: string[];
  suggestedResources?: ResourceSeed[];
};

export type Assignment = {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  type: 'reflection' | 'discussion' | 'project' | 'quiz' | 'other';
};

export type ResourceSeed = {
  title: string;
  url?: string;
  type: ResourceType;
};

export type CourseSourceSeed = ResourceSeed & {
  id: string;
  authors?: string;
  citation?: string;
  required?: boolean;
  uploadRequired?: boolean;
  notes?: string;
};

export type Rubric = {
  id: string;
  title: string;
  totalPoints: number;
  checks: RubricCheck[];
};

export type RubricCheck = {
  id: string;
  label: string;
  description: string;
  points: number;
  levels?: RubricLevel[];
  checkFn?: string;
};

export type RubricLevel = {
  rating: string;
  description: string;
  points: number;
};

export type ReflectionLens = {
  id: string;
  label: string;
  description?: string;
  promptHint?: string;
};

export type PromptTemplate = {
  id: string;
  category: PromptCategory;
  title: string;
  template: string;
};

export type PromptCategory =
  | 'deepen-reflection'
  | 'professional-practice'
  | 'ethical-equity'
  | 'find-sources'
  | 'search-queries'
  | 'apply-frameworks'
  | 'prepare-discussion'
  | 'retrieval-practice'
  | 'final-synthesis'
  | 'capstone-ideas';

export type WeeklyPrompt = {
  id: string;
  sectionId: string;
  weekNumber: number;
  prompt: string;
  dueDate?: string;
};

// ============================================
// JOURNAL ENTRY TYPES (User-created data)
// ============================================

export type JournalEntry = {
  id: string;
  courseId: string;
  sectionId: string;
  topicId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;

  // Core content fields
  notes: string;
  summary: string;
  keyConcepts: string;
  reflection: string;
  personalConnection: string;
  professionalApplication: string;
  questions: string;
  ethicalEquityConsiderations: string;
  keyTakeaways: string;

  // Metadata
  selectedLenses: string[];
  resources: Resource[];
  artifacts: Artifact[];
  tags: string[];
  confidenceRating?: number;
  aiUseDisclosure?: string;
  published: boolean;
};

export type Resource = {
  id: string;
  title: string;
  url?: string;
  type: ResourceType;
  citation?: string;
  notes?: string;
  addedAt: string;
};

export type CourseSource = {
  id: string;
  courseId: string;
  sectionId: string;
  syllabusSourceId?: string;
  title: string;
  authors?: string;
  url?: string;
  type: ResourceType;
  citation?: string;
  sourceOrigin?: 'syllabus' | 'manual' | 'suggested';
  required?: boolean;
  uploadRequired?: boolean;
  attachmentName?: string;
  attachmentMimeType?: string;
  // IndexedDB key for the attachment blob. Replaces the legacy
  // attachmentDataUrl which used to live inline in localStorage.
  attachmentRef?: string;
  // Legacy field kept for one-time migration. After migration this is undefined.
  attachmentDataUrl?: string;
  usedInEntryIds?: string[];
  isAssigned: boolean;
  isSupplementary: boolean;
  readingStatus: 'unread' | 'in-progress' | 'completed';
  notes: string;
  keyQuotes: SourceQuote[];
  keyTerms: string[];
  questions: string;
  connections: string;
  tags: string[];
  addedAt: string;
  updatedAt: string;
};

export type SourceQuote = {
  id: string;
  text: string;
  page?: string;
  note?: string;
};

export type ResourceType =
  | 'article'
  | 'book'
  | 'video'
  | 'podcast'
  | 'website'
  | 'tool'
  | 'image'
  | 'document'
  | 'other';

// ============================================
// ARTIFACT TYPES (Visual/Interactive Learning Evidence)
// ============================================

export type ArtifactType = 'image' | 'infographic' | 'diagram' | 'embed' | 'tool' | 'video' | 'other';

export type Artifact = {
  id: string;
  type: ArtifactType;
  title: string;
  description?: string;
  // For images: base64 data URL or external URL
  // For embeds/tools: iframe URL
  url: string;
  // Optional thumbnail for embeds/tools
  thumbnailUrl?: string;
  // Alt text for accessibility
  altText?: string;
  // Caption shown below artifact
  caption?: string;
  // Reflection on what this artifact represents/demonstrates
  reflection?: string;
  // Tags for organization
  tags: string[];
  // When was this created/added
  createdAt: string;
};

// ============================================
// FURTHER EXPLORATION TYPES
// ============================================

export type FurtherExplorationArea = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  relatedSectionIds: string[];
  relatedTags: string[];
  resources: Resource[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================
// RETRIEVAL PRACTICE TYPES
// ============================================

export type ReviewCard = {
  id: string;
  courseId: string;
  sectionId: string;
  entryId: string;
  question: string;
  answer?: string;
  source: 'questions' | 'keyConcepts' | 'manual';
  lastReviewed?: string;
  timesReviewed: number;
  confidence: number;
};

// ============================================
// SYNTHESIS TYPES
// ============================================

export type FinalSynthesis = {
  id: string;
  courseId: string;
  title: string;
  introduction: string;
  selectedEntryIds: string[];
  themeNotes: SynthesisTheme[];
  conclusion: string;
  createdAt: string;
  updatedAt: string;
};

export type SynthesisTheme = {
  id: string;
  title: string;
  entryIds: string[];
  notes: string;
  order: number;
};

// ============================================
// PUBLISHED JOURNAL TYPES
// ============================================

export type PublishedJournal = {
  courseId: string;
  studentName: string;
  courseStartDate?: string;
  publishedAt: string;
  entries: JournalEntry[];
  furtherExplorationAreas: FurtherExplorationArea[];
  finalSynthesis?: FinalSynthesis;
};

// ============================================
// APP STATE TYPES
// ============================================

export type JournalData = {
  // Bumped whenever the storage shape changes so we can migrate safely.
  // 1 = pre-migration baseline (attachments inline as data URLs in localStorage).
  // 2 = attachments moved to IndexedDB; CourseSource.attachmentRef points to a blob.
  schemaVersion?: number;
  entries: JournalEntry[];
  furtherExplorationAreas: FurtherExplorationArea[];
  reviewCards: ReviewCard[];
  syntheses: FinalSynthesis[];
  sources: CourseSource[];
  customCoursePacks: CoursePack[];
  settings: UserSettings;
};

export type UserSettings = {
  studentName: string;
  darkMode: 'system' | 'light' | 'dark';
  autoSaveInterval: number;
  defaultTags: string[];
};

// ============================================
// UTILITY TYPES
// ============================================

export type EntryProgress = {
  hasNotes: boolean;
  hasSummary: boolean;
  hasReflection: boolean;
  hasQuestions: boolean;
  hasKeyTakeaways: boolean;
  hasProfessionalApplication: boolean;
  hasResources: boolean;
  completionPercentage: number;
};

export type SectionProgress = {
  sectionId: string;
  totalEntries: number;
  publishedEntries: number;
  averageCompletion: number;
};
