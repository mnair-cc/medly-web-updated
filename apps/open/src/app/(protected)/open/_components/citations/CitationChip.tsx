"use client";

import type { Citation, CitationClickHandler } from "./types";

interface CitationChipProps {
  citation: Citation;
  displayText: string;
  onClick?: CitationClickHandler;
  variant?: "chat" | "flashcard" | "notes";
  className?: string;
}

/**
 * Reusable citation chip component.
 * Displays a clickable citation reference with consistent styling.
 */
export default function CitationChip({
  citation,
  displayText,
  onClick,
  variant = "chat",
  className = "",
}: CitationChipProps) {
  const handleClick = () => {
    onClick?.(citation);
  };

  const baseStyles = "cursor-pointer whitespace-nowrap transition-colors";

  const variantStyles = {
    chat: "text-[#595959] text-[10px] hover:bg-[rgba(0,0,0,0.08)] font-rounded-bold bg-[rgba(0,0,0,0.1)] rounded-full py-1 px-2 mr-1",
    flashcard:
      "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100",
    notes:
      "text-[#595959] text-[10px] hover:bg-[rgba(0,0,0,0.08)] font-rounded-bold bg-[rgba(0,0,0,0.1)] rounded-full py-1 px-2",
  };

  return (
    <span
      className={`citation-${variant} ${baseStyles} ${variantStyles[variant]} ${className}`}
      data-document-id={citation.documentId}
      data-page-index={citation.pageIndex}
      data-source-segment={citation.sourceSegment}
      onClick={handleClick}
      title={`Page ${citation.pageIndex + 1}: "${citation.sourceSegment}"`}
    >
      {displayText}
    </span>
  );
}
