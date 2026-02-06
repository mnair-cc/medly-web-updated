import { Timestamp } from "firebase-admin/firestore";
import {
  InputMode,
  MockPage,
  PostMockInsights,
  ResultsDayInsights,
  QuestionHistory,
  SessionType,
} from "../(protected)/sessions/types";
import { MasteryScore } from "../(protected)/sessions/types";
import {
  AnswerPair,
  AnswerAttempt,
  AOAnalysis,
  Canvas,
  Highlight,
  Message,
  QuestionDifficulty,
} from "./types";

export interface SubjectMastery {
  subjectId: string;
  userId: string;
  unitsMastery: UnitMastery[];
}

export interface MockRegistrationDataFirebase {
  isRegistered: boolean;
  candidateId: string;
  referralCode: string;
  registeredAt: Timestamp;
  mockId?: string;
  referralCodeUsed?: string;
  referrerUserId?: string;
  waitListPosition?: number;
  referrals:
    | {
        userId: string;
        userName: string;
        candidateId: string;
        referredAt: Timestamp;
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

export type SessionDataFirebase = {
  id: string;
  sessionType: SessionType;
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
  totalQuestions?: number; // Cached total question count for progress calculation
  timeStarted: Timestamp | null;
  timeFinished: Timestamp | null;
  isMarked: boolean;
  pages: MockPage[];
  questionHistory: QuestionHistory[];
  masteryScores?: {
    lessonMasteryScore: number;
    subLessonMasteryScores: MasteryScore[];
  };
  initialInsights?: PostMockInsights;
  resultsDayInsights?: ResultsDayInsights;
};

export interface StrategyStepFirebase {
  index: number;
  title: string;
  heading: string;
  questionType: string;
  options: string[] | { option: string; explanation: string }[];
  correctAnswer: string;
  categories?: string[] | null;
  correctAnswerMapping?: { [key: string]: string[] } | null;
  // Optional properties for breakdown components
  description?: string;
  maxMark?: number;
  legacyId?: string;
  subSteps?: Array<{ step: string }>;
  successString?: string | string[];
  summaryCenter?: string;
}

export interface QuestionStrategyFirebase {
  steps: StrategyStepFirebase[];
  feedback: string;
}

export interface QuestionFirebase {
  id: number;
  legacyId: string;
  subLessonId?: string;
  correctAnswer: string;
  createdAt: Timestamp;
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
  strategy: QuestionStrategyFirebase;
  questionText: string;
  questionType: string;
  diagram: string;
  questionStem: string;
  questionStemDiagram: string;
  updatedAt: Timestamp;
}

export interface MarkingResultFirebase {
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
  messages?: Message[];
  isMarked?: boolean;
  isMarkedForReview?: boolean;
  ao_analysis?: AOAnalysis[];
  answerAttempts?: AnswerAttempt[];
}

export interface QuestionWithMarkingResultFirebase
  extends QuestionFirebase,
    MarkingResultFirebase {}
