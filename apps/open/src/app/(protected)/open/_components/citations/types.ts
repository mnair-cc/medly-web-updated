/**
 * Unified citation type used across chat, flashcards, and notes.
 */
export interface Citation {
  documentId: string;
  pageIndex: number; // 0-indexed
  sourceSegment: string; // Text snippet for highlighting
}

/**
 * Citation with display text (as parsed from markdown).
 */
export interface ParsedCitation extends Citation {
  displayText: string;
  startIndex: number; // Position in original string
  endIndex: number;
  rawMatch: string; // Original matched string
}

/**
 * Props for citation click handlers.
 */
export interface CitationClickHandler {
  (citation: Citation): void;
}
