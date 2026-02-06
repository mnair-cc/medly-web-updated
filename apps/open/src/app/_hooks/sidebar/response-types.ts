export interface UserSubjectResponse {
  legacy_id: string;
  title: string;
  course: string;
  exam_board: string;
  current_grade?: string | null;
  target_grade?: string | null;
  weak_topics?: string[];
  gcse_higher?: boolean | null;
  prior_qualification_grade?: string | null;
}

export interface UserSubjectsResponse {
  data: UserSubjectResponse[];
}

export interface LessonProgressData {
  questions_answered: number;
  total_questions: number;
  mastery_score: number;
  total_marks_awarded?: number;
  total_marks_missed?: number;
}

export interface SubjectProgressResponse {
  data: {
    lessons: Record<string, LessonProgressData>;
  };
}

export interface SubjectLessonResponse {
  id: number;
  legacy_id: string;
  title: string;
}

export interface SubjectTopicResponse {
  id: number;
  legacy_id: string;
  title: string;
  lessons: SubjectLessonResponse[];
}

export interface SubjectUnitResponse {
  id: number;
  legacy_id: string;
  title: string;
  topics: SubjectTopicResponse[];
}

export interface SubjectCurriculumResponse {
  data: {
    id: number;
    legacy_id: string;
    title: string;
    course: string;
    exam_board: string;
    units: SubjectUnitResponse[];
  };
}

export interface PaperResponse {
  id: number;
  legacy_id: string;
  number: string;
  exam_board: string;
  date: string | null;
}

export interface ExamResponse {
  id: number;
  exam_type: string;
  series: string;
  gcse_higher: boolean;
  gcse_triple: boolean;
  papers: PaperResponse[];
}

export interface SubjectPapersResponse {
  data: ExamResponse[];
}
