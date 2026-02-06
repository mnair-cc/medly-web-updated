import { LearnContent } from "@/app/(protected)/sessions/types";

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
}

export interface QuestionGroupResponse {
  id: number;
  stem: string;
  diagram?: string | null;
  passage_text?: string | null;
  description?: string | null;
  order: number;
  chunk_index?: number | null;
  legacy_id?: string | null;
  latex_symbols?: string | string[];
  calculator?: boolean | null;
  stage?: number | null;
  questions: QuestionResponse[];
}

export interface QuestionsResponse {
  data: QuestionGroupResponse[];
}

export interface LessonResponse {
  data: {
    id: number;
    legacy_id: string;
    title: string;
    textbook_content: string | null;
    topic_title: string;
    unit_title: string;
    subject_title: string;
    learn_flow_content?: LearnContent | null;
  };
}

export interface LessonProgressResponse {
  data: {
    mu?: number;
    sigma?: number;
    p_mastery?: number;
    mastery_tier?: number;
    rank?: number;
  };
}

export interface LearnFlowProgressResponse {
  data: {
    progress: {
      current_block_index: number;
      created_at?: string;
      updated_at?: string;
      completed_at?: string; // Set when the entire learn flow is completed
    };
    messages: Array<{
      id?: string;
      message: string;
      type: "apiMessage" | "userMessage";
      card_data?: Record<string, string | number | boolean>;
      source_docs?: Array<Record<string, string | number>>;
    }>;
    blocks: Record<
      string,
      {
        user_answer?:
          | string
          | string[]
          | Record<string, string>
          | Record<string, string[]>;
        canvas?: Record<string, unknown>;
        viewed_at?: string;
        completed_at?: string;
      }
    >;
  };
}
