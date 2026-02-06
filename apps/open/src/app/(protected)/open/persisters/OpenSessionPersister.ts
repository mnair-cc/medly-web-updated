import { nextApiClient } from "@/app/_lib/utils/axiosHelper";
import { TranscriptionChunk } from "@/app/_hooks/useTranscription";
import { FlashcardDeck } from "@/app/(protected)/open/_types/flashcardTypes";
import { QuestionGroup, QuestionWithMarkingResult } from "@/app/types/types";

export interface DocumentSessionData {
  notes?: { [page: number]: string };
  canvases?: { [page: number]: any };
  highlights?: { [page: number]: any[] };
  // pageNotes removed - now stored in Firebase Storage via /api/open/documents/{id}/notes endpoint
  documentTranscription?: TranscriptionChunk[];
  allPagesText?: Array<{ page: number; text: string }>;
  questionGroups?: QuestionGroup[]; // Question groups with stems
  flashcardDeck?: FlashcardDeck;
}

export class OpenSessionPersister {
  async saveDocumentData(
    documentId: string,
    sessionData: DocumentSessionData
  ): Promise<void> {
    await nextApiClient.put(`/open/documents/${documentId}/session`, sessionData);
  }
}
