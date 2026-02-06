"use client";

import React from "react";
import Spinner from "@/app/_components/Spinner";
import { Check, X } from "lucide-react";
import type { ToolCallState } from "./MOChatLayoutClient";

// Human-readable tool names
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  generateFlashcardsFromSource: "Generating flashcards",
  generateQuestionsFromSource: "Generating questions",
  generateSummaryFromSource: "Generating summary",
  readDocument: "Reading document",
  navigateToDocument: "Navigating to document",
  createFlashcards: "Creating flashcards",
  updateFlashcards: "Updating flashcards",
  deleteFlashcards: "Deleting flashcards",
  highlightText: "Highlighting text",
  editNotes: "Editing notes",
  rewriteNotes: "Writing notes",
};

interface ToolCallChipProps {
  toolCall: ToolCallState;
}

export function ToolCallChip({ toolCall }: ToolCallChipProps) {
  // Dynamic display name with detail (e.g., "Reading 'Document Title'")
  const displayName =
    toolCall.toolName === "readDocument" && toolCall.toolDisplayDetail
      ? `Read '${toolCall.toolDisplayDetail}'`
    : toolCall.toolName === "navigateToDocument" && toolCall.toolDisplayDetail
      ? `Navigating to '${toolCall.toolDisplayDetail}'`
    : TOOL_DISPLAY_NAMES[toolCall.toolName] ?? toolCall.toolName;

  const isRunning = toolCall.status === "running";
  const isError = toolCall.status === "error";

  return (
    <div
      className={`
        inline-flex items-start gap-1.5
        rounded-full text-sm font-rounded-semibold
        transition-all duration-200 mb-5
        text-[#595959]
      `}
    >
      {isRunning ? (
        <span className="mt-[3px]"><Spinner size="small" /></span>
      ) : isError ? (
        <X className="w-3.5 h-3.5 mt-[3px] shrink-0" strokeWidth={2.5} />
      ) : (
        <Check className="w-3.5 h-3.5 mt-[3px] shrink-0" strokeWidth={2.5} />
      )}
      <span className="flex-1">{displayName}</span>
    </div>
  );
}
