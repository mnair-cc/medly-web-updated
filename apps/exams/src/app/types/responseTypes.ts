import {
  PaperInsight,
  SubjectInsight,
} from "../(protected)/mocks/_types/types";
import { Exam, MockRegistrationData } from "./types";

export type GetSubjectResponse = {
  id: number;
  legacy_id: string;
  title: string;
  exam_board: string;
  course: string;
};

export type GetSubjectWithCurriculumResponse = {
  id: number;
  legacy_id: string;
  title: string;
  course: string;
  exam_board: string;
  exams: ExamCurriculumResponse[];
  units: UnitWithTopicsResponse[];
  question_count: number;
  questions: string[];
  total_marks_possible: number;
};

export type ExamCurriculumResponse = {
  id: number;
  exam_type: string;
  gcse_higher: boolean;
  papers: PaperCurriculumResponse[];
};

export type PaperCurriculumResponse = {
  id: number;
  legacy_id: string;
  number: string;
  exam_board: string;
  date: string;
  units: string[];
};

export type UnitWithTopicsResponse = {
  id: number;
  legacy_id: string;
  title: string;
  topics: TopicWithLessonsResponse[];
  question_count: number;
  questions: string[];
  total_marks_possible: number;
};

export type TopicWithLessonsResponse = {
  id: number;
  legacy_id: string;
  title: string;
  lessons: LessonResponse[];
  question_count: number;
  questions: string[];
  total_marks_possible: number;
};

export type LessonResponse = {
  id: number;
  legacy_id: string;
  title: string;
  textbook_content: string;
  topic_title: string;
  unit_title: string;
  subject_title: string;
  question_count: number;
  questions: string[];
  total_marks_possible: number;
};

export type ExamResponse = {
  id: number;
  legacy_id: string;
  title: string;
  series: string;
  exam_board: string;
  course: string;
  papers: PaperResponse[];
};

export type PaperResponse = {
  id: number;
  legacy_id: string;
  title: string;
  exam_board: string;
  course: string;
  date: string;
  number: string;
  question_groups: QuestionGroupResponse[];
};

export type QuestionGroupResponse = {
  id: number;
  legacy_id: string;
  stem: string;
  diagram: string;
  questions: QuestionResponse[];
};

export type QuestionResponse = {
  id: number;
  legacy_id: string;
  title: string;
  content: string;
  correct_answer: string;
  created_at: string;
  max_mark: number;
  onboarding_question: string;
  question_type: string;
  updated_at: string;
  question_text: string;
  diagram: string;
  question_stem: string;
  question_stem_diagram: string;
  options: string[] | { list_1: string[]; list_2: string[] };
  gcse_higher: boolean;
  order: number;
  question_group_id: number;
  lesson_legacy_ids: string[];
};

export type LessonQuestionForGroup = {
  id: number;
  legacy_id: string;
  question_text: string;
  options: any;
  max_mark: number;
  correct_answer: any;
  onboarding_question: string | null;
  order: number | null;
  question_group_id: number | null;
  question_type: string;
  diagram: string | null;
  gcse_higher: boolean | null;
  difficulty: number | null;
  generation_date: string | null;
  created_at: string;
  updated_at: string | null;
};

export type LessonQuestionGroup = {
  id: number;
  stem: string;
  diagram: string | null;
  order: number;
  chunk_index: number | null;
  latex_symbols: string | string[] | null;
  calculator: boolean | null;
  stage: number | null;
  questions: LessonQuestionForGroup[];
};

// Unified shape consumed by the UI. The hook may transform the API output to match this.
export type RegisteredMocksResponse = {
  // Flattened fields for convenience
  candidateId?: string;
  registeredAt?: string;
  selectedExams?: {
    examId: string;
    board: string | null;
    series: string | null;
    subject: string;
    // Derived from examId when not provided by the API
    course?: string;
  }[];
  // Optional: exam dates aggregated for the user (may be set by the hook)
  exams?: Exam[];
  // Full registration payload when callers need extra fields (optional)
  registrationData?: MockRegistrationData;
  mockFinishedStatuses?: { [key: string]: boolean };
};

export type MockInsightsResponse = {
  paperInsights: PaperInsight[];
  subjectInsights: SubjectInsight[];
  awards: string[];
};
