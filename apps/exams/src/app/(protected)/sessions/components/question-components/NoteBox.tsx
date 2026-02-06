import React, { useState } from "react";
import { Decoration } from "@/app/types/types";
import BinIcon from "@/app/_components/icons/BinIcon";
import AutoSizingTextarea from "../AutoSizingTextarea";

interface NoteBoxProps {
  decoration: Decoration;
  decorationIndex: number;
  allDecorations: Decoration[];
  updateQuestionDecorations: (decorations: Decoration[]) => void;
  isSelected: boolean;
  onSelect?: () => void;
}

export default function NoteBox({
  decoration,
  decorationIndex,
  allDecorations,
  updateQuestionDecorations,
  isSelected,
  onSelect,
}: NoteBoxProps) {
  const [noteText, setNoteText] = useState(decoration.note ?? "");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleNoteChange = (newNote: string) => {
    setNoteText(newNote);
  };

  const handleNoteBlur = (newNote: string) => {
    if (decorationIndex === -1) return;

    const updatedDecorations = [...allDecorations];
    updatedDecorations[decorationIndex] = {
      ...updatedDecorations[decorationIndex],
      note: newNote,
    };

    updateQuestionDecorations(updatedDecorations);
  };

  const handleConfirmDelete = () => {
    if (decorationIndex === -1) return;

    const updatedDecorations = [...allDecorations];
    updatedDecorations[decorationIndex] = {
      ...updatedDecorations[decorationIndex],
      note: undefined,
    };

    updateQuestionDecorations(updatedDecorations);
    setShowDeleteConfirmation(false);
  };

  return (
    <li
      className={`bg-white rounded-2xl p-2 border border-[#E9E9F0] relative ${
        isSelected
          ? "shadow-[0px_0px_10px_0px_rgba(0,0,0,0.08)] translate-x-[-8px]"
          : ""
      }`}
      onClick={(e) => {
        e.stopPropagation();
        // Small delay to ensure proper state management timing
        setTimeout(() => {
          onSelect?.();
        }, 0);
      }}
      data-decoration-notebox
    >
      <div className="flex gap-2 justify-between items-center">
        <div
          className="flex-1 truncate p-2 rounded-lg"
          style={{
            backgroundColor: isSelected
              ? decoration.color
              : `${decoration.color}66`,
            borderBottom:
              decoration.underline && decoration.underline !== "none"
                ? decoration.underline === "dotted"
                  ? `2px dotted ${decoration.color}`
                  : decoration.underline === "dashed"
                  ? `2px dashed ${decoration.color}`
                  : `2px solid ${decoration.color}`
                : undefined,
          }}
        >
          {decoration.text}
        </div>
        <button
          className="flex-shrink-0"
          onClick={() => {
            if (decorationIndex === -1) return;
            setShowDeleteConfirmation(true);
          }}
        >
          <BinIcon />
        </button>
      </div>
      <div className="p-2">
        <AutoSizingTextarea
          placeholder="Notes are saved automatically."
          value={noteText}
          onChange={handleNoteChange}
          onBlur={handleNoteBlur}
        />
      </div>

      {/* Delete confirmation overlay */}
      {showDeleteConfirmation && (
        <div className="absolute inset-0 bg-black/80 rounded-2xl flex flex-col items-center justify-center p-4">
          <div className="text-sm font-medium text-white mb-2">
            Delete this note?
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 text-xs bg-white text-black rounded-lg hover:bg-gray-200"
              onClick={() => setShowDeleteConfirmation(false)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600"
              onClick={handleConfirmDelete}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
