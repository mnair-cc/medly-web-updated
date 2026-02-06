import { LearnContent } from "@/app/(protected)/sessions/types";
import { Timestamp } from "firebase-admin/firestore";

export enum CourseType {
  GCSE = "gcse",
  IGCSE = "igcse",
  A_LEVEL = "a_level",
  IB = "ib",
  AP = "ap",
}

export interface FirebaseUserDetails {
  avatar: string;
  userName: string;
  source: string;
  year: number;
  userType: string;
  focusArea: string;
  exam: CourseType;
  parentEmail?: string;
  parentEmailMarketingOptOut?: boolean;
  hasCompletedOnboarding: boolean;
  featuresUsedToday: number | null;
  dateOfFirstUse: Timestamp | null;
  dateOfMostRecentUse: Timestamp | null;
  totalQuestionsCompleted?: number;
  subscription: {
    end: number;
    start: number;
    status: string;
    willRenew: boolean;
  };
}

export interface UserDetails {
  uid: string;
  avatar: string;
  userName: string;
  source: string;
  year: number;
  focusArea: string;
  parentEmail?: string;
  parentEmailMarketingOptOut?: boolean;
  hasCompletedOnboarding: boolean;
  hasCompletedOpenOnboarding: boolean;
  featuresUsedToday: number | null;
  dateOfFirstUse: string;
  dateOfMostRecentUse: string;
  totalQuestionsCompleted?: number;
  subscription: {
    status: string;
    start: number;
    end: number;
    willRenew: boolean;
    isSubscription?: boolean;
    paymentProvider?: string;
    planCode?: string;
    lastCheckedStripe?: string;
    lastManuallySyncedAt?: string;
  };
}

export interface UserDetailsWithSubjects extends UserDetails {
  subjectsWeb: { [key: string]: UserSubjectWithLessons };
}

export interface UserSubject {
  id: number;
  legacyId: string;
  title: string;
  examBoard: string;
  currentGrade: string;
  targetGrade: string;
  weakTopics?: string[];
  gcseHigher?: boolean;
  priorQualificationGrade?: string;
}

export interface UserSubjectWithLessons extends UserSubject {
  lessons: { [key: string]: UserLesson };
}

export interface UserLesson {
  id: number;
  legacyId: string;
  title: string;
  answeredQuestions: number;
  totalMarksAwarded: number;
}

export interface CourseWithExamBoards {
  name: string;
  examBoards: ExamBoardWithSubjects[];
}

export interface ExamBoardWithSubjects {
  name: string;
  subjects: Subject[];
}

export interface Subject {
  id: number;
  legacyId: string;
  title: string;
}

export interface SubjectWithUnits extends Subject {
  id: number;
  legacyId: string;
  title: string;
  examBoard: string;
  course: string;
  currentGrade?: string;
  targetGrade?: string;
  weakTopics?: string[];
  gcseHigher?: boolean;
  priorQualificationGrade?: string;
  exams: Exam[];
  units: UnitWithTopics[];
  totalQuestions: number;
  answeredQuestions: number;
  totalMarksAwarded: number;
  totalMarksPossible: number;
  totalMarksMissed: number;
}

export interface UnitWithTopics {
  id: number;
  legacyId: string;
  title: string;
  topics: TopicWithLessons[];
  totalQuestions: number;
  answeredQuestions: number;
  totalMarksAwarded: number;
  totalMarksPossible: number;
  totalMarksMissed: number;
}

export interface TopicWithLessons {
  id: number;
  legacyId: string;
  title: string;
  lessons: Lesson[];
  totalQuestions: number;
  answeredQuestions: number;
  totalMarksAwarded: number;
  totalMarksPossible: number;
  totalMarksMissed: number;
}

export interface Lesson {
  id: number;
  legacyId: string;
  title: string;
  totalQuestions: number;
  questionLegacyIds: string[];
  answeredQuestions: number;
  answeredQuestionLegacyIds: string[];
  totalMarksAwarded: number;
  totalMarksPossible: number;
  totalMarksMissed: number;
}

export type LessonProgress = {
  lessonLegacyId: string;
  answeredQuestions: number;
  legacyQuestionCount: number;
  answeredQuestionLegacyIds: string[];
  masteryScore: number;
  totalMarksAwarded: number;
  totalMarksPossible: number;
  totalMarksMissed: number;
};

export enum QuestionDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

export interface StrategyStep {
  index: number;
  title: string;
  heading: string;
  questionType: string;
  options: string[] | { option: string; explanation: string }[];
  correctAnswer: string;
  categories?: string[] | null;
  correct_answer_mapping?: { [key: string]: string[] } | null;
  // Optional properties for breakdown components
  description?: string;
  maxMark?: number;
  legacyId?: string;
  sub_steps?: Array<{ step: string }>;
  success_string?: string | string[];
  summary_center?: string;
}

export interface QuestionStrategy {
  steps: StrategyStep[];
  feedback: string;
}

export interface Question {
  id: number;
  legacyId: string;
  subLessonId?: string;
  correctAnswer: string;
  createdAt: string;
  maxMark: number;
  options:
    | string[]
    | { list_1: string[]; list_2: string[] }
    | { option: string; explanation: string }[];
  order: number;
  difficulty?: QuestionDifficulty;
  markScheme: string[];
  questionGroupId: number;
  irtParameters: {
    a: number;
    b: number;
    c: number;
  };
  strategy: QuestionStrategy;
  questionText: string;
  passageText?: string;
  questionType: string;
  diagram: string;
  questionStem: string;
  questionStemDiagram: string;
  updatedAt: string;
  lessonLegacyIds: string[];
  // New group-level fields
  chunkIndex?: number;
  latexSymbols?: string | string[];
  calculator?: boolean;
  stage?: number;
}

export interface MessageAttachments {
  selectedText?: string | null;
  screenshot?: {
    dataUrl: string;
  } | null;
  draggedContexts?: Array<{
    id: string;
    name: string;
    type: "document" | "folder";
    documentType?: string;
    documentIds: string[];
  }>;
}

export interface Message {
  id?: string;
  message: string;
  type:
    | "apiMessage"
    | "userMessage"
    | "systemMessage"
    | "markschemeCard"
    | "aoAnalysisCard"
    | "strategyCard"
    | "timingCard";
  attachments?: MessageAttachments;
  cardData?: {
    question?: QuestionWithMarkingResult;
    index?: number;
    getQuestionHeading?: (
      question: QuestionWithMarkingResult,
      index: number,
    ) => string;
    showMarkScheme?: boolean;
    currentQuestionWithMarkingResult?: QuestionWithMarkingResult;
    questionsWithMarkingResults?: QuestionWithMarkingResult[];
    aoData?: Record<string, unknown>;
    strategySteps?: Array<Record<string, unknown>>;
    currentStepIndex?: number;
    isMarked?: boolean;
    userMark?: number;
    durationSpentInSeconds?: number;
    subLessonId?: string;
    difficulty?: string;
  };
  // Status message field
  isStatusMessage?: boolean;
  isStreaming?: boolean; // True while tokens are still arriving
  invocationId?: string; // Groups messages from same API invocation
  // Tool call message fields
  isToolCall?: boolean;
  toolCallId?: string;
  toolName?: string;
  toolCallStatus?: "running" | "completed" | "error";
  toolDisplayDetail?: string; // e.g., document title for readDocument
  // Awaiting response fields (persistent until next user action)
  isAwaitingResponse?: boolean;
  awaitingText?: string;
}

export interface AiResponse {
  message: string;
  progress: number;
  summary: string;
}

export interface ChatContext {
  message: string;
  chatHistory: Message[];
  lessonLegacyId: string;
  subjectLegacyId: string;
  progress: number; // 0-1
  lessonTitle: string;
  textbookContent: string;
  userName: string;
  previousConversationGuidance: string;
  previousConversation: Message[];
}

export interface UserLessonData {
  progress: number;
  messages: Message[];
  summary: string;
}

export interface LessonData {
  id: number;
  legacyId: string;
  title: string;
  textbookContent: string;
  learnContent?: LearnContent | null;
  mu?: number;
  sigma?: number;
  p_mastery?: number;
  mastery_tier?: number;
  rank?: number;
}

export interface AiContext {
  question: string;
  history: string[];
  specification_point: { [key: string]: string };
  subject: string;
  progress: number;
  lesson: string;
  context: string;
  report: string;
  previous_conversation: Message[];
}

export interface Exam {
  id: number;
  legacyId: string;
  title: string;
  series: string;
  subjectId?: string;
  board?: string;
  papers: Paper[];
}

export interface Paper {
  id: number;
  legacyId: string;
  number: string;
  date: string;
  questionGroups: QuestionGroup[];
  hasFinished?: boolean;
  duration?: string;
}

export interface QuestionGroup {
  id: number;
  order: number;
  legacyId: string;
  questionStem: string;
  questions: Question[] | QuestionWithMarkingResult[];
  stage?: number;
}

export interface MarkingContext {
  questionLegacyId: string;
  question: string;
  questionStem?: string;
  correctAnswer: string | string[] | { left?: string; right?: string };
  markMax: number;
  userAnswer: string | string[] | { left?: string; right?: string } | undefined;
  canvas: Canvas | undefined;
  desmosExpressions?: unknown[];
  questionType: string;
  retryCount?: number;
  subLessonId?: string;
  lessonLegacyIds?: string[];
  markScheme?: string[];
  options?: string[];
}

export interface AnswerPair {
  correctAnswer: string;
  userAnswer: string;
  isCorrect?: boolean;
}

export interface Highlight {
  strong: string[];
  weak: string[];
}

export interface AOAnalysis {
  ao_description: string;
  ao_level: number;
  ao_level_reasoning: string;
  ao_mark: number;
  ao_mark_reasoning: string;
  ao_markmax: number;
  ao_number: number;
  strength_highlights: string[];
  strengths_feedback_point: string[];
  weakness_highlights: string[];
  weaknesses_feedback_point: string[];
}

export interface AnswerAttempt {
  attemptNumber: number;
  timestamp: string;
  annotatedAnswer?: string;
  markingTable?: string;
  userAnswer?:
    | string
    | string[]
    | { left?: string; right?: string }
    | undefined;
  userMark?: number;
  canvas?: Canvas;
}

export interface MarkingResult {
  questionLegacyId: string;
  annotatedAnswer?: string | AnswerPair[] | undefined;
  markingTable?: string | undefined;
  markMax?: number;
  userAnswer?:
    | string
    | string[]
    | { left?: string; right?: string }
    | undefined;
  userMark?: number | undefined;
  canvas?: Canvas;
  highlights?: Highlight[];
  annotations?: Highlight[];
  decorations?: Decoration[];
  messages?: Message[];
  messageCount?: number;
  isSolvedWithMedly?: boolean;
  isMarked?: boolean;
  isMarkedForReview?: boolean;
  durationSpentInSeconds?: number;
  ao_analysis?: AOAnalysis[];
  desmosExpressions?: unknown[];
  isQuickFix?: boolean;
  isFoundationalGap?: boolean;
  answerAttempts?: AnswerAttempt[];
}

export interface QuestionWithMarkingResult extends Question, MarkingResult {}

export enum SessionType {
  Practice = "practice",
  QuestionBank = "question-bank",
  Paper = "paper",
  Mock = "mock",
  Lesson = "lesson-session",
}

export enum AuthProviderOptions {
  CREDENTIALS = "credentials",
  APPLE = "apple",
  GOOGLE = "google",
}

export enum PlanCode {
  MONTHLY = "monthly",
  BLOCK = "block",
  ANNUAL = "annual",
  BLOCK_ANNUAL = "blockAnnual",
  BLOCK_ANNUAL_2027 = "blockAnnual2027",
}

export interface PlanDetails {
  isActive: boolean;
  endDate: number;
  willRenew: boolean;
  isSubscription: boolean;
  planCode: PlanCode;
  paymentProvider: "stripe" | "revenuecat";
  status?: string;
  lastManuallySyncedAt?: string;
}

export interface FirebaseSubscription {
  status: string;
  start: number;
  end: number;
  willRenew?: boolean;
  paymentProvider?: "stripe" | "revenuecat";
  isSubscription?: boolean;
  planCode?: PlanCode;
  lastCheckedStripe?: Timestamp;
  lastManuallySyncedAt?: Timestamp;
}

export interface MockProgress {
  timeStarted: Date | null;
  timeFinished: Date | null;
  answers: MarkingResult[];
  currentGrade?: string;
  predictedGrade?: string;
}

export interface MockWithProgress {
  durationInMinutes: number;
  timeStarted: Date | null;
  timeFinished: Date | null;
  questions: QuestionWithMarkingResult[];
  currentGrade?: string;
  predictedGrade?: string;
}

interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface Stroke {
  paths: Point[];
  color?: string;
  width?: number;
}

export interface TextboxData {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  isMath?: boolean;
}

interface Math {
  latex: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export interface Canvas {
  paths?: Stroke[];
  textboxes?: TextboxData[];
  maths?: Math[];
  stemPaths?: Stroke[];
}

export interface CanvasMessage {
  text: string;
  x: number;
  y: number;
}

export interface FloatingMessage {
  text: string;
  targetText?: string;
  targetIndex?: number;
  targetAction?: string;
  targetComponent?: string;
}

export enum DecorationType {
  HIGHLIGHT = "highlight",
  BLOCK = "block",
  CIRCLE = "circle",
  FADE = "fade",
  COMMENT = "comment",
  STRIKETHROUGH = "strikethrough",
  SUMMARY = "summary",
}

export enum UnderlineType {
  SOLID = "solid",
  DASHED = "dashed",
  DOTTED = "dotted",
  NONE = "none",
}

export interface Decoration {
  type: DecorationType;
  text?: string;
  startText?: string;
  endText?: string;
  color?: string;
  underline?: UnderlineType;
  comment?: string;
  summary?: string;
  note?: string;
}

export interface QuestionAnswer {
  [key: string]:
    | string
    | string[]
    | { left?: string; right?: string }
    | undefined;
}

export interface QuestionCanvas {
  [key: string]: Canvas;
}

export interface MockDetails {
  id: number;
  date: Date;
  subject: string;
  board: string;
  description: string;
  legacyIds: string[];
}

export interface School {
  id: string;
  school_name: string;
  location: {
    street: string;
    locality: string;
    town: string;
    postcode: string;
  };
}

export interface MockRegistrationData {
  isRegistered: boolean;
  candidateId: string;
  referralCode: string;
  registeredAt: string;
  referralCodeUsed?: string;
  referrerUserId?: string;
  waitListPosition?: number;
  referrals:
    | {
        userId: string;
        userName: string;
        candidateId: string;
        referredAt: string;
      }[]
    | null;
  selectedExams: {
    examId: string;
    board: string | null;
    series: string | null;
    subject: string;
    subjectId: string;
  }[];
}
export interface KnowledgeModelData {
  mu: number;
  sigma: number;
  p_mastery: number;
  mastery_tier: number;
  rank: number;
}
