"use client";

import {
  Flashcard,
  FlashcardSourceReference,
} from "@/app/(protected)/open/_types/flashcardTypes";
import { GripVertical, Trash2, Image } from "lucide-react";
import React, { useRef, useEffect, useCallback } from "react";

interface FlashcardRowProps {
  rowNumber: number;
  card: Flashcard;
  onTermChange: (term: string) => void;
  onDefinitionChange: (definition: string) => void;
  onDelete: () => void;
  onCitationClick?: (ref: FlashcardSourceReference) => void;
  onFocus?: () => void;
  canDelete?: boolean;
  // Drag props
  isDragging?: boolean;
  isDraggedItem?: boolean;
  translateY?: number;
  onDragStart?: (e: React.PointerEvent) => void;
  setRef?: (el: HTMLDivElement | null) => void;
  // Animation props
  isNewlyAdded?: boolean;
}

const FlashcardRow: React.FC<FlashcardRowProps> = ({
  rowNumber,
  card,
  onTermChange,
  onDefinitionChange,
  onDelete,
  onFocus,
  canDelete = true,
  isDragging = false,
  isDraggedItem = false,
  translateY = 0,
  onDragStart,
  setRef,
  isNewlyAdded = false,
}) => {
  const termRef = useRef<HTMLTextAreaElement>(null);
  const definitionRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize both textareas to match the taller one
  const syncHeights = useCallback(() => {
    const term = termRef.current;
    const def = definitionRef.current;
    if (!term || !def) return;

    // Reset to auto to get true scrollHeight
    term.style.height = "auto";
    def.style.height = "auto";

    // Get the max height (minimum 100px)
    const maxHeight = Math.max(100, term.scrollHeight, def.scrollHeight);

    // Apply to both
    term.style.height = `${maxHeight}px`;
    def.style.height = `${maxHeight}px`;
  }, []);

  // Sync heights when either content changes
  useEffect(() => {
    syncHeights();
  }, [card.term, card.definition, syncHeights]);

  return (
    <div
      ref={setRef}
      data-card-row
      className={`flex items-start gap-3 ${isNewlyAdded ? "animate-flashcard-fade-in" : ""}`}
      style={{
        transform: translateY !== 0 ? `translateY(${translateY}px)` : undefined,
        transition:
          isDragging && !isDraggedItem ? "transform 150ms ease-out" : undefined,
        zIndex: isDraggedItem ? 50 : undefined,
        willChange: isDragging ? "transform" : undefined,
      }}
      onFocus={onFocus}
    >
      {/* Row number */}
      <div className="w-6 pt-4 text-sm text-gray-400 text-right shrink-0">
        {rowNumber}
      </div>

      {/* Term input */}
      <div className="flex-1 min-w-0">
        <textarea
          ref={termRef}
          value={card.term}
          onChange={(e) => onTermChange(e.target.value)}
          placeholder="Enter term..."
          className="w-full min-h-[100px] p-4 bg-[#F9F9FB] rounded-xl resize-none text-gray-900 placeholder-gray-400 focus:outline-none text-[15px] overflow-hidden"
        />
      </div>

      {/* Definition input */}
      <div className="flex-1 min-w-0">
        <textarea
          ref={definitionRef}
          value={card.definition}
          onChange={(e) => onDefinitionChange(e.target.value)}
          placeholder="Enter definition..."
          className="w-full min-h-[100px] p-4 bg-[#F9F9FB] rounded-xl resize-none text-gray-900 placeholder-gray-400 focus:outline-none text-[15px] overflow-hidden"
        />
      </div>

      {/* Image placeholder */}
      <div className="hidden w-[120px] h-[100px] bg-[#F9F9FB] rounded-xl flex flex-col items-center justify-center shrink-0">
        <Image className="w-8 h-8 text-gray-300" />
        <span className="text-xs text-gray-300 mt-1">Image</span>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-1 pt-2 shrink-0">
        <button
          className="p-1.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder"
          onPointerDown={onDragStart}
        >
          <GripVertical className="w-5 h-5" />
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FlashcardRow;
