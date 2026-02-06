import React, { useState } from "react";
import { Decoration } from "@/app/types/types";
import ChevronLeftIcon from "@/app/_components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/app/_components/icons/ChevronRightIcon";
import NoteBox from "./NoteBox";

interface NotesColumnProps {
  decorations: Decoration[];
  updateQuestionDecorations: (decorations: Decoration[]) => void;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  selectedDecorationIndex?: number | null;
  onSelectDecoration?: (index: number | null) => void;
}

export default function NotesColumn({
  decorations,
  updateQuestionDecorations,
  isOpen: externalIsOpen,
  onToggle,
  selectedDecorationIndex,
  onSelectDecoration,
}: NotesColumnProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isNotesColumnOpen =
    externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleToggle = () => {
    const newState = !isNotesColumnOpen;
    if (onToggle) {
      onToggle(newState);
    } else {
      setInternalIsOpen(newState);
    }
  };

  const notesDecorations = decorations.filter(
    (decoration) => decoration.note !== undefined && decoration.note !== null
  );

  if (notesDecorations.length === 0) {
    return null;
  }

  return (
    <div className="relative border-l h-full border-[#F2F2F7]">
      <button
        className={`absolute bottom-8 flex items-center gap-2 bg-white border-r border-t border-b border-[#F2F2F7] p-2 ${
          isNotesColumnOpen
            ? "left-0 rounded-r-full"
            : "right-full border-l rounded-l-full"
        }`}
        onClick={handleToggle}
      >
        <div className="opacity-50">
          {isNotesColumnOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </div>
      </button>
      <div className="p-2 overflow-y-auto h-full">
        {isNotesColumnOpen && (
          <ul className="flex flex-col gap-2 p-2 w-[300px]">
            {notesDecorations.map((decoration, noteIndex) => {
              const decorationIndex = decorations.findIndex(
                (d) => d === decoration
              );

              return (
                <NoteBox
                  key={noteIndex}
                  decoration={decoration}
                  decorationIndex={decorationIndex}
                  allDecorations={decorations}
                  updateQuestionDecorations={updateQuestionDecorations}
                  isSelected={selectedDecorationIndex === decorationIndex}
                  onSelect={() => onSelectDecoration?.(decorationIndex)}
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
