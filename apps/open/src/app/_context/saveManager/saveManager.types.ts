import { QuestionWithMarkingResult } from "@/app/types/types";
import { SessionType } from "@/app/(protected)/sessions/types";

// ============================================================================
// Types
// ============================================================================

/** API request type for saving answers (snake_case for API) */
export interface AnswerRequest {
  question_legacy_id: string;
  user_answer?: string | string[] | { left?: string; right?: string };
  canvas?: unknown;
  decorations?: unknown;
  user_mark?: number;
  mark_max?: number;
  is_marked?: boolean;
  is_marked_for_review?: boolean;
  annotated_answer?: unknown;
  marking_table?: string;
  desmos_expressions?: string[];
  highlights?: unknown;
  annotations?: unknown;
  ao_analysis?: unknown;
  is_foundational_gap?: boolean;
  is_quick_fix?: boolean;
  is_solved_with_medly?: boolean;
  messages?: unknown;
  message_count?: number;
  duration_spent_in_seconds?: number;
  answer_attempts?: unknown;
}

export type SaveWithTimestamp = QuestionWithMarkingResult & {
  timestamp?: number;
  /** True if this is the first answer for this question (no prior userAnswer/canvas/etc) */
  isFirstAnswer?: boolean;
};

export enum SaveState {
  SAVED = "SAVED",
  SAVING = "SAVING",
  ERROR = "ERROR",
}

// Optionally get from environment variable
export const DEBOUNCE_MS = process.env.NEXT_PUBLIC_DEBOUNCE_MS
  ? parseInt(process.env.NEXT_PUBLIC_DEBOUNCE_MS)
  : 3000; // Wait for 3 seconds before sending a save request in case user continues making changes
export const MAX_WAIT_MS = process.env.NEXT_PUBLIC_MAX_WAIT_MS
  ? parseInt(process.env.NEXT_PUBLIC_MAX_WAIT_MS)
  : 10000; // Wait at most 10 seconds before sending the save request

export const SAVEABLE_SESSION_TYPES = new Set([
  SessionType.PaperSession,
  SessionType.LessonSession,
  SessionType.PracticeSession,
  SessionType.MockSession,
]);

export interface UseSaveManagerParams {
  paperId?: string;
  lessonId?: string;
  sessionType: SessionType;
}

export interface UseSaveManagerReturn {
  saveState: SaveState;
  hasPendingSaves: boolean;
  addPendingSave: (save: QuestionWithMarkingResult) => void;
  flushPendingSaves: () => Promise<void>;
}

export interface SaveManagerContextValue {
  addPendingSave: (
    save: QuestionWithMarkingResult,
    params: { lessonId?: string; paperId?: string; sessionType: SessionType }
  ) => void;
  flushPendingSaves: () => Promise<void>;
  saveState: SaveState;
  hasPendingSaves: boolean;
}

export interface SavePayloadByEndpoint {
  savesByEndpoint: Map<string, { saves: Partial<QuestionWithMarkingResult>[] }>;
}
