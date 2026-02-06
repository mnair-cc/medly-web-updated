// Types for mocks data - safe to import from client components

export interface CohortDistribution {
  lower: number;
  middle: number;
  upper: number;
}

export interface MockPaper {
  paperId: string;
  number: string;
  date: string;
  questionsAnswered: number;
  totalQuestions: number;
  isStarted: boolean;
  isFinished: boolean;
  grade?: string;
  userMarks?: number;
  maxMarks?: number;
  cohortDistribution?: CohortDistribution;
}

export interface MockExam {
  examId: string;
  title: string;
  board?: string;
  series?: string;
  subjectId: string;
  papers: MockPaper[];
}

export interface MocksData {
  isRegistered: boolean;
  exams: MockExam[];
  referralCode?: string;
}
