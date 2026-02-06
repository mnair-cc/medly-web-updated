// Response types for V2 Curriculum API

export interface LessonProgressData {
  answered_question_legacy_ids: string[];
  mastery_score: number;
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
  question_legacy_ids?: string[];
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

