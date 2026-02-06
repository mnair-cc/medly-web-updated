import { QuestionGroup, Canvas } from "@/app/types/types";

export type PostMockInsightsLesson = {
  lessonTitle?: string;
  topicTitle?: string; // Legacy field name - use lessonTitle for new data
  feedback: string;
  lessonLegacyId?: string;
};

export type PostMockInsights = {
  level?: string;
  summary?: string;
  strengths?: PostMockInsightsLesson[];
  improvements?: PostMockInsightsLesson[];
};

export type TopicBreakdown = {
  topicLegacyId: string;
  topicTitle: string;
  cohortAverage: number;
  userMarks: number;
  maxMarks: number;
};

export type ResultsDayInsights = {
  level?: string;
  summary?: string;
  strengths?: PostMockInsightsLesson[];
  improvements?: PostMockInsightsLesson[];
  grade?: string;
  userMarks?: number;
  maxMarks?: number;
  cohortDistribution?: {
    lower: number;
    middle: number;
    upper: number;
  };
  percentileAccolade?: number;
  topicsBreakdown?: TopicBreakdown[];
};

export enum SessionType {
  PracticeSession = "practice-session",
  LessonSession = "lesson-session",
  LearnSession = "learn-session",
  PaperSession = "paper-session",
  MockSession = "mock-session",
  OpenSession = "open-session",
}

export type QuestionHistory = {
  legacyId: string;
  lastSeen: string;
  marksAchieved: number;
};

export type MasteryScore = {
  legacyId: string;
  mastery: number;
};

export type BlockProgress = {
  user_answer?:
    | string
    | string[]
    | Record<string, string>
    | Record<string, string[]>;
  canvas?: Canvas;
  viewed_at?: string; // ISO format timestamp
  completed_at?: string; // ISO format timestamp
};

export type LearnFlowProgress = {
  messages: Array<{
    message: string;
    type: "apiMessage" | "userMessage";
    card_data?: Record<string, string | number | boolean>;
    source_docs?: Array<Record<string, string | number>>;
  }>;
  current_block_index: number;
  completed_at?: string; // ISO timestamp - set when the entire learn flow is completed
  blocks: Record<string, BlockProgress>; // Key format: "{chunk_index}_{block_order}"
};

export type SessionData = {
  id: string;
  sessionType: SessionType;
  sessionTitle: string;
  sessionSubtitle: string;
  gcseHigher?: boolean;
  hasInsert: boolean;
  insertType: "text" | "periodic_table" | null;
  insertText: string | null;
  inputMode: InputMode;
  isTimed: boolean;
  durationInMinutes: number | null;
  currentGrade: string | null;
  targetGrade: string | null;
  totalMarksAwarded: number;
  totalMarksPossible: number;
  questionCount: number;
  timeStarted: string | null;
  timeFinished: string | null;
  isMarked: boolean;
  pages: MockPage[];
  questionHistory: QuestionHistory[];
  masteryScores?: {
    lessonMasteryScore: number;
    subLessonMasteryScores: MasteryScore[];
  };
  initialInsights?: PostMockInsights;
  resultsDayInsights?: ResultsDayInsights;
  mu?: number;
  sigma?: number;
  p_mastery?: number;
  mastery_tier?: number;
  rank?: number;
  learnFlowProgress?: LearnFlowProgress | null;
};

export type CoverContent = {
  examBoard: string;
  subject: string;
  course: string;
  series: string;
  paper: string;
  date: string;
  time: string;
  tier: "Higher" | "Foundation" | null;
  totalMarks: number;
};

export type InsertContent = string;

export type TextbookContent = string | null;

// Learn flow types
export type LearnFlowStep = {
  step_number: number;
  step_text: string;
  step_math?: string;
};

export type LearnFlowTextContent = {
  kind: "text";
  text: string;
  diagram_svg?: string;
};

export type LearnFlowWorkedExampleContent = {
  kind: "worked_example";
  question: string;
  steps: LearnFlowStep[];
  answer: string;
  diagram_svg?: string;
};

export type LearnFlowQuestionContent = {
  kind: "question";
  question_type: "mcq";
  question_id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  requires_working: boolean;
  explanation: LearnFlowStep[];
  diagram_svg?: string;
};

export type LearnFlowBlock = {
  title: string;
  order: number;
  content:
    | LearnFlowTextContent
    | LearnFlowWorkedExampleContent
    | LearnFlowQuestionContent;
};

export type LearnFlowChunk = {
  chunk_index: number;
  title: string;
  blocks: LearnFlowBlock[];
};

export type LearnFlow = {
  lesson_id: string;
  lesson_title: string;
  unit_title: string;
  topic_title: string;
  chunks: LearnFlowChunk[];
};

export type LearnContent = {
  flows: LearnFlow[];
} | null;

export enum QuestionSessionPageType {
  Document = "document",
  Cover = "cover",
  Insert = "insert",
  Textbook = "textbook",
  Learn = "learn",
  Question = "question",
  Review = "review",
  Notes = "notes",
  Notepad = "notepad",
  Practice = "practice",
  Flashcards = "flashcards",
}

export type MockPage = {
  type: QuestionSessionPageType;
  content:
    | CoverContent
    | InsertContent
    | TextbookContent
    | LearnContent
    | QuestionGroup
    | null;
  progress: number;
};

export type InputMode =
  | "select"
  | "draw"
  | "text"
  | "math"
  | "message"
  | "pen"
  | "eraser"
  | "grab";
