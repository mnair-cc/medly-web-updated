export interface AnswerRequest {
  question_legacy_id: string;
  user_answer?: string | string[] | { left?: string; right?: string };
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
  user_mark?: number;
  mark_max?: number;
  is_marked?: boolean;
  is_marked_for_review?: boolean;
  annotated_answer?:
    | string
    | Array<{
        correct_answer: string;
        user_answer: string;
        is_correct?: boolean;
      }>;
  marking_table?: string;
  desmos_expressions?: string[];
  highlights?: Array<
    | { start: number; end: number; color: string }
    | { strong: string[]; weak: string[] }
  >;
  annotations?: Array<
    { text: string; position: number } | { strong: string[]; weak: string[] }
  >;
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
  is_solved_with_medly?: boolean;
  messages?: Array<{
    id?: string;
    message: string;
    type: string;
    card_data?: Record<string, string | number | boolean>;
    source_docs?: Array<Record<string, string | number>>;
  }>;
  message_count?: number;
  duration_spent_in_seconds?: number;
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
}

export interface AnswersBatchRequest {
  answers: AnswerRequest[];
}
