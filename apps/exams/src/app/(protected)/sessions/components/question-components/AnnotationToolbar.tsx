import { useState, useEffect, useRef } from "react";
import { SelectionInfo } from "./QuestionTextRenderer";
import BinIcon from "@/app/_components/icons/BinIcon";
import EditIcon from "@/app/_components/icons/EditIcon";
import UnderlineIcon from "@/app/_components/icons/UnderlineIcon";
import ChevronDownIcon from "@/app/_components/icons/ChevronDownIcon";
import ChevronUpIcon from "@/app/_components/icons/ChevronUpIcon";
import { DecorationType, Decoration, UnderlineType } from "@/app/types/types";
import { useExamLoggerContext } from "@/app/(protected)/sessions/contexts/ExamLoggerContext";

const AnnotationToolbar = ({
  selectionInfo,
  combinedDecorations,
  updateQuestionDecorations,
  onOpenNotesColumn,
  lastUsedHighlightColor,
  lastUsedUnderlineType,
  onColorChange,
  onUnderlineChange,
  questionLegacyId,
}: {
  selectionInfo: SelectionInfo;
  combinedDecorations: Decoration[];
  updateQuestionDecorations: (decorations: Decoration[]) => void;
  onOpenNotesColumn?: () => void;
  lastUsedHighlightColor: string;
  lastUsedUnderlineType: UnderlineType | null;
  onColorChange: (color: string) => void;
  onUnderlineChange: (type: UnderlineType | null) => void;
  questionLegacyId: string;
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const { logDeleteDecoration, logAddDecoration } = useExamLoggerContext();
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Determine which decorations currently apply to the selected text
  const overlappingDecorations = combinedDecorations.filter(
    (d) =>
      d.text &&
      (d.text.includes(selectionInfo.text) ||
        selectionInfo.text.includes(d.text))
  );

  const overlappingIndices = combinedDecorations
    .map((d, idx) => ({ d, idx }))
    .filter(
      ({ d }) =>
        d.text &&
        (d.text.includes(selectionInfo.text) ||
          selectionInfo.text.includes(d.text))
    )
    .map(({ idx }) => idx);

  const topDecorationIndex = overlappingIndices.length
    ? Math.max(...overlappingIndices)
    : -1;

  const topDecoration =
    topDecorationIndex !== -1 ? combinedDecorations[topDecorationIndex] : null;

  // Get currently applied highlight colors
  const appliedHighlightColors = overlappingDecorations
    .filter((d) => d.type === DecorationType.HIGHLIGHT)
    .map((d) => d.color || "#F6DEA3")
    .filter((color, index, self) => self.indexOf(color) === index); // Remove duplicates

  // Get currently applied underline style
  const appliedUnderlineStyle =
    overlappingDecorations.find(
      (d) => d.underline && d.underline !== UnderlineType.NONE
    )?.underline || null;

  // Available highlight colors
  const highlightColors = [
    { color: "#F6DEA3", selectedBorderColor: "#CC933A" },
    { color: "#C3DEED", selectedBorderColor: "#5996BE" },
    { color: "#F5D5E4", selectedBorderColor: "#D0719E" },
  ];

  // Calculate position that stays within viewport bounds
  useEffect(() => {
    if (!toolbarRef.current) return;

    const toolbarRect = toolbarRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // Calculate desired position (centered on selection)
    let left = selectionInfo.rect.left + selectionInfo.rect.width / 2;
    let top = selectionInfo.rect.top + window.scrollY - 50;

    // Adjust horizontal position to stay within viewport
    const toolbarWidth = toolbarRect.width || 200; // fallback width
    const halfWidth = toolbarWidth / 2;

    if (left - halfWidth < 10) {
      // Too far left, align to left edge with padding
      left = halfWidth + 10;
    } else if (left + halfWidth > viewportWidth - 10) {
      // Too far right, align to right edge with padding
      left = viewportWidth - halfWidth - 10;
    }

    // Adjust vertical position to stay within viewport
    const topRelativeToViewport = selectionInfo.rect.top - 50;

    if (topRelativeToViewport < 10) {
      // Not enough space above, position below the selection
      top = selectionInfo.rect.bottom + window.scrollY + 10;
    }

    setPosition({ left, top });
  }, [selectionInfo]);

  const handleUnderlineSelect = (value: UnderlineType) => {
    setIsDropdownOpen(false);

    if (value === UnderlineType.NONE || value === appliedUnderlineStyle) {
      // Remove underline from existing decorations that apply to this text
      const newDecorations = combinedDecorations.map((d) => {
        const appliesToThisText =
          d.text &&
          (d.text.includes(selectionInfo.text) ||
            selectionInfo.text.includes(d.text));

        if (appliesToThisText && d.underline) {
          // Remove underline from this decoration
          return { ...d, underline: undefined };
        }
        return d;
      });

      updateQuestionDecorations(newDecorations);
      onUnderlineChange(null);
    } else {
      // Save the selected underline type
      onUnderlineChange(value);

      // Check if there's an existing decoration for this text that we can add underline to
      const existingDecorationIndex = combinedDecorations.findIndex(
        (d) =>
          d.text &&
          (d.text.includes(selectionInfo.text) ||
            selectionInfo.text.includes(d.text))
      );

      if (existingDecorationIndex !== -1) {
        // Update existing decoration with new underline
        const newDecorations = [...combinedDecorations];
        newDecorations[existingDecorationIndex] = {
          ...newDecorations[existingDecorationIndex],
          underline: value,
        };
        updateQuestionDecorations(newDecorations);
      } else {
        // Create new highlight decoration with underline, using last used color
        updateQuestionDecorations([
          ...combinedDecorations,
          {
            type: DecorationType.HIGHLIGHT,
            text: selectionInfo.text,
            color: lastUsedHighlightColor,
            underline: value,
          },
        ]);
      }
    }
  };

  const handleDecorationSelect = (decoration: Decoration) => {
    setIsDropdownOpen(false);

    if (decoration.type === DecorationType.HIGHLIGHT) {
      // Save the selected highlight color
      if (decoration.color) {
        onColorChange(decoration.color);
      }

      // Check if this exact highlight color is already applied
      const isAlreadyApplied = appliedHighlightColors.includes(
        decoration.color || lastUsedHighlightColor
      );

      if (isAlreadyApplied) {
        // Remove the existing highlight with this color
        const decorationsWithoutThisHighlight = combinedDecorations.filter(
          (d) => {
            const isMatchingHighlight =
              d.type === DecorationType.HIGHLIGHT &&
              d.color === decoration.color;
            const appliesToThisText =
              d.text &&
              (d.text.includes(selectionInfo.text) ||
                selectionInfo.text.includes(d.text));

            // Keep decorations that don't match this specific highlight for this text
            return !(isMatchingHighlight && appliesToThisText);
          }
        );

        // Log removal of decorations that were filtered out
        const removedDecorations = combinedDecorations.filter((d) => {
          const isMatchingHighlight =
            d.type === DecorationType.HIGHLIGHT && d.color === decoration.color;
          const appliesToThisText =
            d.text &&
            (d.text.includes(selectionInfo.text) ||
              selectionInfo.text.includes(d.text));
          return isMatchingHighlight && appliesToThisText;
        });

        removedDecorations.forEach((removedDecoration) => {
          logDeleteDecoration(
            questionLegacyId,
            removedDecoration.text || selectionInfo.text
          ).catch(console.error);
        });

        updateQuestionDecorations(decorationsWithoutThisHighlight);
      } else {
        // Check if there's an existing highlight decoration for this text that we can update
        const existingDecorationIndex = combinedDecorations.findIndex((d) => {
          const isHighlightDecoration = d.type === DecorationType.HIGHLIGHT;
          const appliesToThisText =
            d.text &&
            (d.text.includes(selectionInfo.text) ||
              selectionInfo.text.includes(d.text));
          return isHighlightDecoration && appliesToThisText;
        });

        if (existingDecorationIndex !== -1) {
          // Update existing decoration with new color, preserving all other properties
          const newDecorations = [...combinedDecorations];
          newDecorations[existingDecorationIndex] = {
            ...newDecorations[existingDecorationIndex],
            color: decoration.color,
          };
          updateQuestionDecorations(newDecorations);
        } else {
          // Create new highlight decoration with last used underline if available
          const newDecoration = {
            ...decoration,
            ...(lastUsedUnderlineType && {
              underline: lastUsedUnderlineType,
            }),
          };

          updateQuestionDecorations([...combinedDecorations, newDecoration]);

          // Log the decoration creation
          logAddDecoration(questionLegacyId, selectionInfo.text).catch(
            console.error
          );
        }
      }
    } else {
      // For non-highlight decorations, just add them
      updateQuestionDecorations([...combinedDecorations, decoration]);

      // Log the decoration creation
      logAddDecoration(questionLegacyId, selectionInfo.text).catch(
        console.error
      );
    }
  };

  // Delete all decorations that apply to the selected text
  const handleDelete = () => {
    if (topDecoration === null) return;

    // Remove the most recently added decoration for this text (the one with highest index)
    const indexToRemove = topDecorationIndex;
    const decorationToRemove = combinedDecorations[indexToRemove];
    const newDecorations = combinedDecorations.filter(
      (_, idx) => idx !== indexToRemove
    );

    updateQuestionDecorations(newDecorations);

    // Log the decoration deletion
    if (decorationToRemove && questionLegacyId) {
      logDeleteDecoration(
        questionLegacyId,
        decorationToRemove.text || selectionInfo.text
      ).catch(console.error);
    }
  };

  // Handle edit button click - create note if doesn't exist and open notes column
  const handleEdit = () => {
    const newDecorations = [...combinedDecorations];

    if (topDecoration && topDecorationIndex !== -1) {
      // Update existing decoration to add note if it doesn't have one
      if (!topDecoration.note) {
        newDecorations[topDecorationIndex] = {
          ...topDecoration,
          note: "",
        };
      }
    } else {
      // Create new highlight decoration with empty note, using last used color and underline
      newDecorations.push({
        type: DecorationType.HIGHLIGHT,
        color: lastUsedHighlightColor,
        text: selectionInfo.text,
        note: "",
        ...(lastUsedUnderlineType && { underline: lastUsedUnderlineType }),
      });
    }

    updateQuestionDecorations(newDecorations);

    // Open the notes column
    onOpenNotesColumn?.();
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[1001]"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        transform: "translateX(-50%)",
      }}
      data-annotation-toolbar
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-center items-center bg-white rounded-xl shadow-[0px_0px_25px_0px_rgba(0,0,0,0.15)] px-3 py-2 gap-2">
        <div className="flex justify-center items-center gap-3 pr-2 border-r border-[#00000014]">
          {highlightColors.map((highlightColor) => {
            const isApplied = appliedHighlightColors.includes(
              highlightColor.color
            );
            return (
              <button
                key={highlightColor.color}
                className="relative h-7 w-7 rounded-lg border hover:border-2 transition-all"
                style={{
                  backgroundColor: `${highlightColor.color}66`, // 40% opacity
                  borderColor: isApplied
                    ? highlightColor.selectedBorderColor
                    : highlightColor.color,
                  borderWidth: isApplied ? "2px" : "",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDecorationSelect({
                    type: DecorationType.HIGHLIGHT,
                    color: highlightColor.color,
                    text: selectionInfo.text,
                  });
                }}
              ></button>
            );
          })}

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className="flex justify-center items-center px-1 py-1 rounded-lg hover:bg-[#F2F2F7] transition-all"
            >
              <UnderlineIcon />
              {isDropdownOpen ? (
                <ChevronUpIcon className="w-4 h-4 ml-[-5px] mt-[3px]" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 ml-[-5px] mt-[3px]" />
              )}
            </button>

            {isDropdownOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-4 p-2 bg-white rounded-lg shadow-[0px_0px_16px_0px_rgba(0,0,0,0.10)] z-[1002]"
                data-annotation-toolbar
                onClick={(e) => e.stopPropagation()}
              >
                {Object.values(UnderlineType).map((option) => {
                  const isCurrentStyle =
                    appliedUnderlineStyle === option ||
                    (option === UnderlineType.NONE && !appliedUnderlineStyle);

                  return (
                    <button
                      key={option}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnderlineSelect(option);
                      }}
                      className={`relative flex items-center justify-center w-full p-2 text-xs text-center rounded-lg hover:bg-[#F2F2F7] transition-all ${
                        isCurrentStyle ? "bg-[#F2F2F7]" : ""
                      }`}
                    >
                      {option === UnderlineType.NONE ? (
                        <div className="w-8 h-3 flex items-center justify-center mx-auto">
                          <span className="text-[10px]">None</span>
                        </div>
                      ) : (
                        <div className="w-8 h-3 flex items-center mx-auto">
                          <div
                            className="w-full h-0"
                            style={{
                              borderBottom: `2px ${option}`,
                            }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            className="p-1 rounded-lg enabled:hover:bg-[#F2F2F7] disabled:opacity-30"
            disabled={topDecoration === null}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
          >
            <BinIcon />
          </button>
        </div>
        <button
          className="p-1 rounded-lg hover:bg-[#F2F2F7]"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit();
          }}
        >
          <EditIcon fill="#1C1C1E" />
        </button>
      </div>
    </div>
  );
};

export default AnnotationToolbar;
