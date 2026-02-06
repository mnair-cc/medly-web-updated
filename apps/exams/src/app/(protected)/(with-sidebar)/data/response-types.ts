/**
 * Shared response types for v2 curriculum API
 * Used across papers, mocks, and lessons
 */

export interface QuestionResponse {
  id: number;
  legacy_id: string;
  question_text: string;
  correct_answer: string;
  max_mark: number;
  order: number;
  difficulty?: number;
  message_count?: number;
  highlights?: Array<
    | { start: number; end: number; color: string }
    | { strong: string[]; weak: string[] }
  >;
  decorations?: Array<{
    type: string;
    text?: string;
    start_text?: string;
    end_text?: string;
    color?: string;
    underline?: string;
    comment?: string;
    summary?: string;
    note?: string;
  }>;
  mark_max?: number;
  duration_spent_in_seconds?: number;
  user_answer?: string | string[] | { left?: string; right?: string };
  user_mark?: number;
  ao_analysis?: Array<{
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
  }>;
  is_foundational_gap?: boolean;
  is_quick_fix?: boolean;
  is_marked_for_review?: boolean;
  marking_table?: string;
  desmos_expressions?: string[];
  annotated_answer?: string;
  is_solved_with_medly?: boolean;
  is_marked?: boolean;
  question_legacy_id?: string;
  annotations?: Array<
    { text: string; position: number } | { strong: string[]; weak: string[] }
  >;
  answer_attempts?: Array<{
    attempt_number: number;
    timestamp: string;
    annotated_answer?: string;
    marking_table?: string;
    user_answer?: string | string[] | { left?: string; right?: string };
    user_mark?: number;
    canvas?: {
      paths: Array<{
        type: string;
        points: Array<{ x: number; y: number }>;
        color?: string;
        width?: number;
      }>;
      textboxes: Array<{
        id: string;
        text: string;
        x: number;
        y: number;
        width?: number;
        height?: number;
      }>;
      maths: Array<{
        id: string;
        latex: string;
        x: number;
        y: number;
      }>;
    };
    desmos_expressions?: string[];
  }>;
  canvas?: {
    paths: Array<{
      type: string;
      points: Array<{ x: number; y: number }>;
      color?: string;
      width?: number;
    }>;
    textboxes: Array<{
      id: string;
      text: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
    }>;
    maths: Array<{
      id: string;
      latex: string;
      x: number;
      y: number;
    }>;
  };
  messages?: Array<{
    id?: string;
    message: string;
    type: string;
    card_data?: Record<string, string | number | boolean>;
    source_docs?: Array<Record<string, string | number>>;
  }>;
  question_type?: string;
  diagram?: string;
  options?:
    | string[]
    | { list_1: string[]; list_2: string[] }
    | { option: string; explanation: string }[];
  sub_lesson_id?: string;
  lesson_legacy_ids?: string[];
}

export interface QuestionGroupResponse {
  id: number;
  order: number;
  legacy_id?: string | null;
  question_stem?: string;
  stem?: string; // Papers use 'stem' instead of 'question_stem'
  stage?: number | null;
  questions: QuestionResponse[];
  chunk_index?: number;
  latex_symbols?: string | string[];
  calculator?: boolean;
  diagram?: string;
}
