// Flashcard Types

export interface FlashcardSourceReference {
  documentId: string;
  pageIndex: number; // 0-indexed
  sourceSegment: string;
}

export interface FlashcardStudyEvent {
  timestamp: string;
  quality: "good" | "again";
  responseTimeMs?: number;
}

export interface Flashcard {
  id: string;
  term: string; // Markdown, [n] citations map to sourceReferences
  definition: string; // Markdown, [n] citations map to sourceReferences
  sourceReferences: FlashcardSourceReference[];
  order: number;
  studyHistory: FlashcardStudyEvent[];
  author: "user" | "ai";
  createdAt: string;
  updatedAt: string;
}

export interface StudySessionRecord {
  sessionId: string;
  startedAt: string;
  completedAt?: string;
  isShuffled: boolean;
  totalCards: number;
  goodCount: number;
  againCount: number;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  description?: string;
  sourceDocumentIds: string[];
  cards: Flashcard[];
  currentSession?: {
    sessionId: string;
    startedAt: string;
    isShuffled: boolean;
    cardOrder: string[]; // Card IDs in study order
    currentIndex: number;
  };
  sessionHistory: StudySessionRecord[];
  createdAt: string;
  updatedAt: string;
}

export type FlashcardViewMode = "edit" | "study";
