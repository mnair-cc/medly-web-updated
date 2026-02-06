"use client";

import { FlashcardSourceReference } from "@/app/(protected)/open/_types/flashcardTypes";
import { FileText } from "lucide-react";
import React from "react";

interface FlashcardCitationProps {
  reference: FlashcardSourceReference;
  index: number;
  onClick?: () => void;
}

const FlashcardCitation: React.FC<FlashcardCitationProps> = ({
  reference,
  index,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
      title={`Page ${reference.pageIndex + 1}: "${reference.sourceSegment}"`}
    >
      <FileText className="w-3 h-3" />
      <span>[{index}]</span>
      <span className="text-blue-500">p.{reference.pageIndex + 1}</span>
    </button>
  );
};

export default FlashcardCitation;
