import { SessionData, SessionType } from "../types";
import { QuestionWithMarkingResult } from "@/app/types/types";

export interface SessionPersisterParams {
  subjectId?: string;
  paperId?: string;
  lessonId?: string;
  practiceSessionId?: string;
  questionLegacyId?: string;
}

export interface SessionPersister {
  saveSessionData(
    params: SessionPersisterParams,
    data: Partial<SessionData>,
    sessionType: SessionType
  ): Promise<void>;

  saveQuestionData(
    params: SessionPersisterParams,
    questionData: Partial<QuestionWithMarkingResult>,
    sessionType: SessionType
  ): Promise<void>;
}
