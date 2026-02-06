export interface Grade {
  test: string;
  grade: string;
}

export type SlideType =
  | "welcome"
  | "loading"
  | "completed_papers"
  | "time_spent"
  | "lets_see"
  | "grades"
  | "with_others"
  | "best_subject"
  | "percentile"
  | "school_leaderboard"
  | "improvement"
  | "performance"
  | "strongest_topics"
  | "weakest_topics"
  | "exam_countdown"
  | "summary";

export interface Slide {
  type: SlideType;
  title1?: string;
  title2?: string;
  title3?: string;
  subtitle?: string;
  showNextButton?: boolean;
  buttonText?: string;
  figureLarge?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface Topic {
  title: string;
  marksLost: number;
  marksPercentage: number;
  surprisal: number;
  percentile: number;
  subjectId: string;
}

export interface MockResult {
  subject: string;
  grade: string;
}

export interface ApiTopic {
  subject: string;
  title: string;
  score: number;
}

export interface MockResultsResponse {
  mocks: MockResult[];
  timeSpentInMinutes: number;
  topics: ApiTopic[];
  totalStudents: number;
  percentile: number;
  bestSubject: string;
  bestSubjectScore: number;
  worstSubject: string;
  worstSubjectScore: number;
}

export interface Subject {
  subject: string;
  percentile: number;
  mark: number;
  grade: string;
  timeSpentInMinutes: number;
}

export interface PaperInsight {
  mark: number;
  maxMark: number;
  percentile: number;
  percentage: number;
  grade: string;
  timeSpentInMinutes: number;
  paperId: string;
  subjectId: string;
  weakestTopics: Topic[];
  strongestTopics: Topic[];
  questionType: {
    mcq: string;
    mcqMultiple: string;
    longAnswer: string;
  };
}

export interface SubjectInsight {
  percentile: number;
  subjectId: string;
  totalGrade: string;
  totalMark: number;
  weakestTopics: Topic[];
  strongestTopics: Topic[];
}

export interface InsightsData {
  paperInsights: PaperInsight[];
  totalStudents: number;
  timeSpentInMinutes: number;
  weakestTopics: Topic[];
  strongestTopics: Topic[];
  subjectInsights: SubjectInsight[];
  candidateId: string;
  awards: string[];
}
