import {
  preprocessLaTeX,
  removeAltText,
} from "@/app/_hooks/useLatexPreprocessing";
import { Decoration, DecorationType, UnderlineType } from "@/app/types/types";
import "katex/contrib/mhchem/mhchem";
import "katex/dist/katex.min.css";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import styles from "../practice.module.css";

export interface SelectionInfo {
  text: string;
  rect: DOMRect;
}

interface SummaryPopupData {
  summaryKey: string;
  decoration: Decoration;
  decoratedText: string;
  spanRef: React.RefObject<HTMLSpanElement | null>;
}

const QuestionTextRenderer = ({
  decorations = [],
  text,
  diagram,
  italicize = false,
  selectedDecorationIndex,
  isAnnotating = false,
}: {
  decorations: Decoration[];
  text: string;
  diagram?: string;
  italicize?: boolean;
  selectedDecorationIndex?: number | null;
  isAnnotating?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state for summary popups
  const [summaryDragOffsets, setSummaryDragOffsets] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());
  const [draggingSummary, setDraggingSummary] = useState<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track summary popups for positioning
  const [summaryPopups, setSummaryPopups] = useState<SummaryPopupData[]>([]);
  const summarySpanRefs = useRef<
    Map<string, React.RefObject<HTMLSpanElement | null>>
  >(new Map());

  // Generate unique key for each summary popup
  const getSummaryKey = useCallback(
    (decorationIndex: number, decoratedText: string): string => {
      return `summary-${decorationIndex}-${decoratedText.slice(0, 20)}`;
    },
    [],
  );

  // Drag handlers for summary popups
  const startSummaryDrag = useCallback(
    (summaryKey: string, clientX: number, clientY: number) => {
      setDraggingSummary(summaryKey);
      dragStartPos.current = { x: clientX, y: clientY };
      const currentOffset = summaryDragOffsets.get(summaryKey) || {
        x: 0,
        y: 0,
      };
      dragStartOffset.current = { ...currentOffset };

      // Clear any existing text selection
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges();
      }

      return true;
    },
    [summaryDragOffsets],
  );

  const updateSummaryDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingSummary || !containerRef.current) return;

      const deltaX = clientX - dragStartPos.current.x;
      const deltaY = clientY - dragStartPos.current.y;

      const newOffset = {
        x: dragStartOffset.current.x + deltaX,
        y: dragStartOffset.current.y + deltaY,
      };

      // Constrain to red container bounds
      const containerRect = containerRef.current.getBoundingClientRect();
      const popupWidth = 280;
      const popupHeight = 120; // Approximate height
      const topPadding = 100; // Padding from top edge
      const bottomPadding = 40; // Padding from bottom edge

      const minX = -containerRect.width / 2 + popupWidth / 2;
      const maxX = containerRect.width / 2 - popupWidth / 2;
      const minY = -popupHeight / 2 + topPadding; // More restrictive top bound
      const maxY = containerRect.height - popupHeight / 2 - bottomPadding; // More restrictive bottom bound

      newOffset.x = Math.max(minX, Math.min(maxX, newOffset.x));
      newOffset.y = Math.max(minY, Math.min(maxY, newOffset.y));

      setSummaryDragOffsets((prev) =>
        new Map(prev).set(draggingSummary, newOffset),
      );
    },
    [draggingSummary],
  );

  const endSummaryDrag = useCallback(() => {
    setDraggingSummary(null);
  }, []);

  // Mouse event handlers for summary dragging
  const handleSummaryMouseDown = useCallback(
    (summaryKey: string) => (e: React.MouseEvent) => {
      const started = startSummaryDrag(summaryKey, e.clientX, e.clientY);
      if (started) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [startSummaryDrag],
  );

  const handleSummaryTouchStart = useCallback(
    (summaryKey: string) => (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const started = startSummaryDrag(
        summaryKey,
        touch.clientX,
        touch.clientY,
      );
      if (started) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [startSummaryDrag],
  );

  // Global mouse and touch event listeners for dragging
  useEffect(() => {
    if (!draggingSummary) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault(); // Prevent text selection during drag
      updateSummaryDrag(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      endSummaryDrag();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      updateSummaryDrag(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      endSummaryDrag();
    };

    const handleSelectStart = (e: Event) => {
      // Prevent text selection during drag
      e.preventDefault();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("selectstart", handleSelectStart);
    };
  }, [draggingSummary, updateSummaryDrag, endSummaryDrag]);

  // Reset drag state when decorations change (new summary popups)
  // useEffect(() => {
  //   setSummaryDragOffsets(new Map());
  //   setDraggingSummary(null);
  //   setSummaryPopups([]);
  //   summarySpanRefs.current.clear();
  // }, [decorations]);

  // Helper function to normalize apostrophes for consistent matching
  const normalizeApostrophes = (str: string): string => {
    return str.replace(/['']/g, "'");
  };

  // Track which pure LaTeX decorations we've already used (to handle order correctly)
  const usedPureLatexDecorations = new Set<string>();

  const findTextPositions = (
    text: string,
    searchText: string,
  ): { start: number; end: number }[] => {
    const positions: { start: number; end: number }[] = [];
    const normalizedText = normalizeApostrophes(text);
    const normalizedSearchText = normalizeApostrophes(searchText);
    let index = normalizedText.indexOf(normalizedSearchText);

    while (index !== -1) {
      positions.push({
        start: index,
        end: index + normalizedSearchText.length - 1,
      });
      index = normalizedText.indexOf(normalizedSearchText, index + 1);
    }

    return positions;
  };

  const findRange = (
    text: string,
    startText: string,
    endText: string,
  ): { start: number; end: number } | null => {
    const normalizedText = normalizeApostrophes(text);
    const normalizedStartText = normalizeApostrophes(startText);
    const normalizedEndText = normalizeApostrophes(endText);

    const startIndex = normalizedText.indexOf(normalizedStartText);
    if (startIndex === -1) return null;

    const endIndex = normalizedText.indexOf(
      normalizedEndText,
      startIndex + normalizedStartText.length,
    );
    if (endIndex === -1) return null;

    return {
      start: startIndex,
      end: endIndex + normalizedEndText.length - 1,
    };
  };

  const findTextInRange = (
    text: string,
    startText: string,
    endText: string,
    targetText: string,
  ) => {
    const range = findRange(text, startText, endText);
    if (!range) return [];

    const rangeText = text.slice(range.start, range.end + 1);
    const normalizedRangeText = normalizeApostrophes(rangeText);
    const normalizedTargetText = normalizeApostrophes(targetText);
    const positions = [];
    let index = normalizedRangeText.indexOf(normalizedTargetText);

    while (index !== -1) {
      positions.push({
        start: range.start + index,
        end: range.start + index + normalizedTargetText.length - 1,
      });
      index = normalizedRangeText.indexOf(normalizedTargetText, index + 1);
    }

    return positions;
  };

  const applyDecorations = (
    text: string,
    decorationsToUse: Decoration[],
  ): ReactNode => {
    if (!decorationsToUse || !decorationsToUse.length || !text) {
      return text;
    }

    // Check if there's any summary decoration that applies to this specific text
    const hasSummaryInThisText = decorationsToUse.some((decoration) => {
      if (!decoration.summary) return false;

      // Check if this decoration's text is found in the current text
      if (decoration.text) {
        return text.includes(decoration.text);
      }

      // Check if this decoration's range applies to this text
      if (decoration.startText && decoration.endText) {
        return (
          text.includes(decoration.startText) ||
          text.includes(decoration.endText)
        );
      }

      return false;
    });

    // Create an array to track which characters have which decorations
    const charDecorations: Decoration[][] = new Array(text.length)
      .fill(null)
      .map(() => []);

    decorationsToUse.forEach((decoration) => {
      let positions: { start: number; end: number }[] = [];

      if (
        decoration.type === "circle" &&
        decoration.startText &&
        decoration.endText &&
        decoration.text
      ) {
        // Special handling for circle with range
        positions = findTextInRange(
          text,
          decoration.startText,
          decoration.endText,
          decoration.text,
        );
      } else if (decoration.startText && decoration.endText) {
        const range = findRange(text, decoration.startText, decoration.endText);
        if (range) positions = [range];
      } else if (decoration.text) {
        positions = findTextPositions(text, decoration.text);
      }

      positions.forEach((pos) => {
        for (let i = pos.start; i <= pos.end; i++) {
          if (i < charDecorations.length) {
            charDecorations[i].push(decoration);
          }
        }
      });
    });

    // Build the decorated text
    const result: ReactNode[] = [];
    let i = 0;

    while (i < text.length) {
      const currentDecorations = charDecorations[i];

      if (currentDecorations.length === 0) {
        // No decorations - find the next decorated character or end
        let j = i + 1;
        while (j < text.length && charDecorations[j].length === 0) {
          j++;
        }
        const unDecoratedText = text.slice(i, j);
        // If there's a summary in this text, fade undecorated text
        if (hasSummaryInThisText) {
          result.push(
            <span
              key={`undecorated-${i}-${j}`}
              className={`opacity-30 ${
                isAnnotating ? "cursor-text-highlight" : "cursor-text"
              }`}
            >
              {unDecoratedText}
            </span>,
          );
        } else {
          result.push(
            <span
              key={`undecorated-${i}-${j}`}
              className={isAnnotating ? "cursor-text-highlight" : "cursor-text"}
            >
              {unDecoratedText}
            </span>,
          );
        }
        i = j;
      } else {
        // Find the end of this decoration group
        let j = i + 1;
        while (
          j < text.length &&
          charDecorations[j].length === currentDecorations.length &&
          charDecorations[j].every(
            (dec, idx) => dec === currentDecorations[idx],
          )
        ) {
          j++;
        }

        const decoratedText = text.slice(i, j);

        const hasComment = currentDecorations.some((d) => d.comment);
        const hasSummary = currentDecorations.some((d) => d.summary);
        const decorationClasses = getDecorationClasses(
          currentDecorations,
          hasSummary,
        );

        // Determine the top-most decoration in this group (last one applied)
        const topDecoration = currentDecorations[currentDecorations.length - 1];
        const topDecIndex = decorationsToUse.findIndex(
          (d) => d === topDecoration,
        );

        const isSelected = selectedDecorationIndex === topDecIndex;
        const decorationStyles = getDecorationStyles(
          currentDecorations,
          isSelected,
        );
        const commentDecoration = currentDecorations.find((d) => d.comment);
        const summaryDecoration = currentDecorations.find((d) => d.summary);

        // Generate unique key for this summary popup and create ref
        let summaryKey = "";
        let spanRef: React.RefObject<HTMLSpanElement | null> | undefined;
        if (hasSummary && summaryDecoration) {
          summaryKey = getSummaryKey(i, decoratedText);
          if (!summarySpanRefs.current.has(summaryKey)) {
            summarySpanRefs.current.set(
              summaryKey,
              React.createRef<HTMLSpanElement | null>(),
            );
          }
          spanRef = summarySpanRefs.current.get(summaryKey);

          // Add to summary popups list for rendering
          setSummaryPopups((prev) => {
            const existing = prev.find((p) => p.summaryKey === summaryKey);
            if (!existing) {
              return [
                ...prev,
                {
                  summaryKey,
                  decoration: summaryDecoration,
                  decoratedText,
                  spanRef: spanRef!,
                },
              ];
            }
            return prev;
          });
        }

        result.push(
          <span
            key={`${i}-${j}`}
            ref={spanRef}
            className={`relative ${decorationClasses} ${
              isSelected ? "medly-decoration-selected" : ""
            } ${isAnnotating ? "cursor-text-highlight" : "cursor-text"}`}
            style={{
              ...decorationStyles,
            }}
            onMouseEnter={() => {
              // Don't apply hover effects if selected
              if (isSelected) return;

              // Disable hover effects for highlighted text
              if (currentDecorations.some((d) => d.type === "highlight")) {
                return;
              }
            }}
            onMouseLeave={() => {
              // Don't restore opacity if selected
              if (isSelected) return;

              // No hover style changes for highlighted text
              if (currentDecorations.some((d) => d.type === "highlight")) {
                return;
              }
            }}
            data-top-dec={topDecIndex}
            onClick={(e) => {
              // If this span includes a highlight, disable clicking on it entirely
              const hasHighlight = currentDecorations.some(
                (d) => d.type === "highlight",
              );
              if (hasHighlight) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }

              // Prevent native blue selection flash
              const sel = window.getSelection();
              // if (sel) sel.removeAllRanges();

              // Emit a custom event so QuestionPage can open the toolbar using this span
              const r = e.currentTarget.getBoundingClientRect();
              const rect = {
                left: r.left,
                top: r.top,
                width: r.width,
                height: r.height,
                right: r.right,
                bottom: r.bottom,
              } as DOMRect;

              window.dispatchEvent(
                new CustomEvent("medly-decoration-click", {
                  detail: {
                    text: decoratedText,
                    rect,
                    decorationIndex: topDecIndex,
                  },
                }),
              );

              // Stop event propagation to prevent click-outside handler
              e.stopPropagation();
            }}
          >
            {decoratedText}

            {hasComment && commentDecoration && (
              <div className="pointer-events-auto select-none absolute opacity-95 bg-white rounded-full px-3 py-2 shadow-[0_0_15px_rgba(0,0,0,0.15)] z-[1000] -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <div className="font-medium font-[500] text-[14px] text-black">
                  {commentDecoration.comment}
                </div>
                <svg
                  className="absolute -bottom-[8px] left-1/2 transform -translate-x-1/2"
                  width="24"
                  height="10"
                  viewBox="0 0 15 6"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.5 4C5 2 1.66667 0.5 0 0H15C13.1667 1.33333 9.08614 4.45693 7 5.5C6 6 3.88165 6.47339 4.5 4Z"
                    fill="white"
                  />
                </svg>
              </div>
            )}
          </span>,
        );
        i = j;
      }
    }

    return result;
  };

  // Calculate position for summary popup
  const getSummaryPopupPosition = (
    spanRef: React.RefObject<HTMLSpanElement | null>,
    summaryKey: string,
  ) => {
    if (!containerRef.current || !spanRef.current) {
      return { x: 0, y: 0 };
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const spanRect = spanRef.current.getBoundingClientRect();

    // X: Center of the red container (50% of container width)
    const centerX = containerRect.width / 2;

    // Y: Vertically centered with the decorated text line
    const spanCenterY = spanRect.top - containerRect.top + spanRect.height / 2;

    const dragOffset = summaryDragOffsets.get(summaryKey) || { x: 0, y: 0 };

    // Apply same Y bounds as drag constraints
    const popupHeight = 120;
    const topPadding = 100; // Match the updated padding
    const bottomPadding = 40;
    const minY = -popupHeight / 2 + topPadding;
    const maxY = containerRect.height - popupHeight / 2 - bottomPadding;

    const constrainedY = Math.max(
      minY,
      Math.min(maxY, spanCenterY + dragOffset.y),
    );

    return {
      x: centerX + dragOffset.x,
      y: constrainedY,
    };
  };

  const getDecorationClasses = (
    decorations: Decoration[],
    hasSummaryInText: boolean,
  ): string => {
    const classes: string[] = [];

    decorations.forEach((decoration) => {
      switch (decoration.type) {
        case DecorationType.HIGHLIGHT:
          // Add base highlight styling (padding, margins, etc.)
          classes.push(
            "px-1 -mx-1 py-0.5 -my-0.5 rounded-[4px] text-black transition-all duration-200",
          );
          break;
        case DecorationType.CIRCLE:
          classes.push("border-2 rounded-full px-1");
          break;
        case DecorationType.FADE:
          classes.push("opacity-30");
          break;
        case DecorationType.STRIKETHROUGH:
          classes.push("line-through");
          break;
        case DecorationType.COMMENT:
          classes.push("");
          break;
        case DecorationType.SUMMARY:
          classes.push("");
          break;
        case DecorationType.BLOCK:
          classes.push("border-l-4 pl-2 py-1");
          break;
      }
    });

    // If there's a summary decoration in this specific text, fade all text including decorated text
    if (hasSummaryInText) {
      classes.push("opacity-30");
    }

    return classes.join(" ");
  };

  const getDecorationStyles = (
    decorations: Decoration[],
    isSelected: boolean = false,
  ): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    // Collect all underline decorations for overlapping handling
    const underlineDecorations = decorations.filter(
      (d) => d.underline && d.underline !== UnderlineType.NONE,
    );

    // Handle multiple highlights by blending colors
    const highlightDecorations = decorations.filter(
      (d) => d.type === "highlight",
    );
    if (highlightDecorations.length > 0) {
      if (highlightDecorations.length === 1) {
        // Single highlight - use full opacity if selected, otherwise 40%
        const color = highlightDecorations[0].color || "#05B0FF";
        const hexToRgba = (hex: string, opacity: number) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        };
        styles.backgroundColor = hexToRgba(color, isSelected ? 1.0 : 0.4);
        if (isSelected) {
          // Ensure selected state overrides hover effects
          styles.backgroundImage = "none";
        }
      } else {
        // Multiple highlights - blend colors naturally using higher opacity if selected
        const backgroundImages = highlightDecorations.map((decoration) => {
          const color = decoration.color || "#05B0FF";
          const opacity = isSelected ? "66" : "33"; // 40% vs 20% opacity
          return `linear-gradient(to right, ${color}${opacity}, ${color}${opacity})`;
        });
        styles.backgroundImage = backgroundImages.join(", ");
        styles.backgroundBlendMode = "multiply";
      }
    }

    // Handle other decoration types
    decorations.forEach((decoration) => {
      const color = decoration.color || "#05B0FF";

      switch (decoration.type) {
        case "circle":
          styles.borderColor = color;
          break;
        case "block":
          styles.borderLeftColor = color;
          break;
      }
    });

    // Handle underlines using border-bottom and background for overlapping
    if (underlineDecorations.length > 0) {
      const backgroundImages: string[] = [];

      underlineDecorations.forEach((decoration, index) => {
        // Use decoration color if available, otherwise use a default dark color
        const color = decoration.color || "#1C1C1E";

        if (index === 0) {
          // First underline uses border-bottom
          let borderStyle: string;
          switch (decoration.underline) {
            case UnderlineType.SOLID:
              borderStyle = "solid";
              break;
            case UnderlineType.DASHED:
              borderStyle = "dashed";
              break;
            case UnderlineType.DOTTED:
              borderStyle = "dotted";
              break;
            default:
              borderStyle = "solid";
          }
          styles.borderBottom = `2px ${borderStyle} ${color}`;
          styles.paddingBottom = "2px";
        } else {
          // Additional underlines use background gradients to create different line styles
          switch (decoration.underline) {
            case UnderlineType.SOLID:
              backgroundImages.push(
                `linear-gradient(to right, ${color} 0%, ${color} 100%)`,
              );
              break;
            case UnderlineType.DASHED:
              backgroundImages.push(
                `repeating-linear-gradient(to right, ${color} 0px, ${color} 8px, transparent 8px, transparent 16px)`,
              );
              break;
            case UnderlineType.DOTTED:
              backgroundImages.push(
                `repeating-linear-gradient(to right, ${color} 0px, ${color} 3px, transparent 3px, transparent 8px)`,
              );
              break;
            default:
              backgroundImages.push(
                `linear-gradient(to right, ${color} 0%, ${color} 100%)`,
              );
          }
        }
      });

      if (backgroundImages.length > 0) {
        styles.backgroundImage = backgroundImages.join(", ");
        styles.backgroundSize = backgroundImages
          .map(() => `100% 2px`)
          .join(", ");
        styles.backgroundPosition = backgroundImages
          .map((_, index) => {
            const offset = 6 + index * 4; // Offset for each additional underline
            return `0 calc(100% + ${offset}px)`;
          })
          .join(", ");
        styles.backgroundRepeat = "no-repeat";
      }
    }

    return styles;
  };

  // Helper function to check if any decoration has summary
  // const hasAnyDecorationWithSummary = (decorations: Decoration[]): boolean => {
  //   return decorations.some((decoration) => decoration.summary);
  // };

  // Helper function to apply decorations to mixed content (strings and React elements)
  const applyDecorationsToMixedContent = (children: ReactNode): ReactNode => {
    if (typeof children === "string") {
      return applyDecorations(children, expandedDecorations);
    }

    if (Array.isArray(children)) {
      // Handle the case where we have mixed content with potential LaTeX decorations
      // First, let's check if this array matches our expected structure for LaTeX content
      // Check if this specific paragraph content has LaTeX expressions
      const paragraphText = Array.isArray(children)
        ? children
            .map((child) => (typeof child === "string" ? child : ""))
            .join("")
        : "";
      const hasLatexInThisParagraph =
        Array.isArray(children) &&
        children.some(
          (child) =>
            React.isValidElement(child) &&
            (child.props as any)?.className === "katex",
        );

      // console.log('LATEX_LOGS: Paragraph analysis', {
      //   hasLatexInThisParagraph,
      //   decorationsCount: normalizedDecorations.length,
      //   willProcess: normalizedDecorations.length > 0 && hasLatexInThisParagraph,
      //   children: Array.isArray(children) ? children.map(child => ({
      //     type: typeof child,
      //     isElement: React.isValidElement(child),
      //     className: React.isValidElement(child) ? (child.props as any)?.className : 'n/a'
      //   })) : 'not-array'
      // });

      if (expandedDecorations.length > 0 && hasLatexInThisParagraph) {
        // For this specific paragraph, we need to figure out which LaTeX expressions it contains
        // and match them to the appropriate decorations

        // Get the text content of this paragraph (without LaTeX, since they're React elements)
        const paragraphTextParts = Array.isArray(children)
          ? children.filter((child) => typeof child === "string")
          : [];
        const paragraphText = paragraphTextParts.join("");

        // console.log('LATEX_LOGS: Processing mixed content paragraph', {
        //   paragraphText,
        //   children: children,
        //   expandedDecorations: expandedDecorations,
        //   originalTextSnippet: text.slice(0, 100) + '...'
        // });

        // For this specific paragraph, find which LaTeX expressions it should contain
        // by looking at the surrounding text context

        // Count KaTeX elements in this paragraph
        const katexElementsInParagraph = Array.isArray(children)
          ? children.filter(
              (child) =>
                React.isValidElement(child) &&
                (child.props as any)?.className === "katex",
            ).length
          : 0;

        // console.log('LATEX_LOGS: KaTeX elements in paragraph', { katexElementsInParagraph, paragraphText });

        // Find which LaTeX expressions from our decorations could be in this paragraph
        // by looking for the paragraph text in the original text and seeing what LaTeX is nearby
        const latexMatches: Array<{ text: string; decoration?: Decoration }> =
          [];

        // New approach: Instead of trying to match paragraph text exactly,
        // let's find LaTeX expressions that have decorations and see if they
        // should be in this paragraph based on the number of KaTeX elements

        // Get all LaTeX expressions from the original text
        const allLatexInOriginal: string[] = [];

        // First, find display math ($$...$$) - need to handle this specially
        const displayMathRegex = /\$\$[^$]*?\$\$/g;
        let displayMatch;
        while ((displayMatch = displayMathRegex.exec(text)) !== null) {
          allLatexInOriginal.push(displayMatch[0]);
        }

        // Then, find inline math ($...$) but skip display math areas
        let textWithoutDisplayMath = text;
        // Remove display math temporarily to avoid conflicts
        textWithoutDisplayMath = text.replace(/\$\$[^$]*?\$\$/g, "");

        const inlineMathRegex = /\$[^$]+\$/g;
        let inlineMatch;
        while (
          (inlineMatch = inlineMathRegex.exec(textWithoutDisplayMath)) !== null
        ) {
          allLatexInOriginal.push(inlineMatch[0]);
        }

        // Sort by position in original text to maintain order
        allLatexInOriginal.sort((a, b) => {
          const posA = text.indexOf(a);
          const posB = text.indexOf(b);
          return posA - posB;
        });

        // console.log('LATEX_LOGS: All LaTeX in original', { allLatexInOriginal });

        // Find which of these LaTeX expressions have decorations
        const latexWithDecorations: Array<{
          text: string;
          decoration: Decoration;
        }> = [];
        allLatexInOriginal.forEach((latexText) => {
          const matchingDecoration = expandedDecorations.find((d) => {
            if (d.text === latexText) {
              return true; // Exact match
            }
            // Try content matching
            let latexContent = latexText.replace(/^\$|\$$/g, "");
            latexContent = latexContent.replace(/\\%/g, "%");
            latexContent = latexContent.replace(/\{,\}/g, ",");
            latexContent = latexContent.replace(/\{|\}/g, "");
            return d.text === latexContent;
          });

          if (matchingDecoration) {
            latexWithDecorations.push({
              text: latexText,
              decoration: matchingDecoration,
            });
          }
        });

        // console.log('LATEX_LOGS: LaTeX with decorations', { latexWithDecorations });

        // For this paragraph, take the first N LaTeX expressions that have decorations
        // where N is the number of KaTeX elements in this paragraph
        // This assumes LaTeX expressions appear in the same order as they're processed
        const latexForThisParagraph = latexWithDecorations.slice(
          0,
          katexElementsInParagraph,
        );

        latexForThisParagraph.forEach((item) => {
          latexMatches.push(item);
        });

        // console.log('LATEX_LOGS: LaTeX assigned to this paragraph', {
        //   katexElementsInParagraph,
        //   latexForThisParagraph: latexForThisParagraph.map(item => item.text)
        // });

        // console.log('LATEX_LOGS: Final LaTeX matches for paragraph', { latexMatches });

        // Track which LaTeX element we're currently processing
        let latexElementIndex = 0;

        return children.map((child, index) => {
          // Check if this is a KaTeX element that should be decorated
          if (
            React.isValidElement(child) &&
            (child.props as any)?.className === "katex"
          ) {
            // console.log('LATEX_LOGS: Processing KaTeX element in mixed content', {
            //   index,
            //   latexElementIndex,
            //   availableMatches: latexMatches.length
            // });

            // Get the decoration for this specific LaTeX element based on position
            const currentLatexMatch = latexMatches[latexElementIndex];
            latexElementIndex++;

            // console.log('LATEX_LOGS: KaTeX element match result', {
            //   currentLatexMatch,
            //   hasDecoration: !!(currentLatexMatch && currentLatexMatch.decoration)
            // });

            if (currentLatexMatch && currentLatexMatch.decoration) {
              const decoration = currentLatexMatch.decoration;
              const decorationClasses = getDecorationClasses(
                [decoration],
                false,
              );
              const decorationStyles = getDecorationStyles([decoration], false);
              const backgroundColor = hexToRgba(
                decoration.color || "#05B0FF",
                0.4,
              );

              return (
                <span
                  key={index}
                  className={`katex-highlight ${decorationClasses} ${
                    isAnnotating ? "cursor-text-highlight" : "cursor-text"
                  } px-1 -mx-1 py-0.5 -my-0.5 rounded-[4px]`}
                  style={{
                    ...decorationStyles,
                    backgroundColor,
                  }}
                >
                  {child}
                </span>
              );
            }
          }

          if (typeof child === "string") {
            // Apply regular text decorations to string content
            // Filter out decorations that are handled by LaTeX matching above
            const nonLatexDecorations = expandedDecorations.filter((d) => {
              if (!d.text) return false;
              // Include regular text decorations that exist in this string segment
              const existsInThisString = child.includes(d.text);
              // Exclude decorations that were already matched to LaTeX elements
              const wasMatchedToLatex = latexMatches.some(
                (match) => match.decoration === d,
              );
              return existsInThisString && !wasMatchedToLatex;
            });

            return (
              <React.Fragment key={index}>
                {applyDecorations(child, nonLatexDecorations)}
              </React.Fragment>
            );
          }
          return child;
        });
      } else {
        // No LaTeX decorations, process normally
        return children.map((child, index) => {
          if (typeof child === "string") {
            return (
              <React.Fragment key={index}>
                {applyDecorations(child, expandedDecorations)}
              </React.Fragment>
            );
          }
          return child;
        });
      }
    }

    return children;
  };

  // Process the text through LaTeX preprocessing
  // Guard against null/undefined text
  if (!text) {
    return null;
  }

  // Check if text contains table syntax - if so, don't double newlines as it breaks tables
  const hasTableSyntax = text.includes("|") && text.includes("---");
  const textWithProcessedNewlines = hasTableSyntax
    ? text
    : text.replace(/\n/g, "\n\n");

  const processedText = removeAltText(
    preprocessLaTeX(removeAltText(preprocessLaTeX(textWithProcessedNewlines))),
  );

  // Helper function to convert hex color to rgba with opacity
  const hexToRgba = (hex: string, opacity: number): string => {
    // Remove # if present
    hex = hex.replace("#", "");

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Helper function to normalize decoration text for proper matching
  const normalizeDecorationText = (text: string): string => {
    if (!text) return text;

    // Handle double-escaped backslashes (common in serialization)
    return text
      .replace(/\\\\%/g, "\\%") // Convert \\% to \%
      .replace(/\\\\,/g, "\\,") // Convert \\, to \,
      .replace(/\\\\\{/g, "\\{") // Convert \\{ to \{
      .replace(/\\\\\}/g, "\\}"); // Convert \\} to \}
  };

  // Function to split decorations containing LaTeX into multiple decorations
  const splitDecorationByLatex = (decoration: Decoration): Decoration[] => {
    if (!decoration.text || !decoration.text.includes("$")) {
      return [decoration];
    }

    let text = decoration.text;

    // Step 1: Protect currency indicators ($ followed by digit) like preprocessing does
    const currencyPlaceholders: string[] = [];
    text = text.replace(/\$(?=\d)/g, (match) => {
      currencyPlaceholders.push(match);
      return `<<CURRENCY_${currencyPlaceholders.length - 1}>>`;
    });

    // Step 2: Find LaTeX expressions (display math $$...$$ and inline math $...$)
    const latexRegex = /(\$\$[\s\S]*?\$\$|\$[^$]+?\$)/g;

    const segments: Array<{ text: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = latexRegex.exec(text)) !== null) {
      // Add text before LaTeX if any
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index);
        if (textBefore) {
          segments.push({ text: textBefore });
        }
      }

      // Add LaTeX expression
      segments.push({ text: match[0] });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last LaTeX if any
    if (lastIndex < text.length) {
      const textAfter = text.slice(lastIndex);
      if (textAfter) {
        segments.push({ text: textAfter });
      }
    }

    // If no segments found (no LaTeX detected), return original
    if (segments.length === 0) {
      return [decoration];
    }

    // Step 3: Create decoration objects for each segment
    const result: Decoration[] = segments.map((segment) => {
      // Restore currency indicators
      const restoredText = segment.text.replace(
        /<<CURRENCY_(\d+)>>/g,
        (_, index) => currencyPlaceholders[parseInt(index)],
      );

      return {
        ...decoration,
        text: restoredText,
      };
    });

    return result;
  };

  // Normalize all decoration texts
  const normalizedDecorations = decorations.map((d) => ({
    ...d,
    text: d.text ? normalizeDecorationText(d.text) : d.text,
  }));

  // Split decorations containing LaTeX into multiple decorations
  const expandedDecorations = normalizedDecorations.flatMap(
    splitDecorationByLatex,
  );

  // Create a simple mapping of pure LaTeX decorations for standalone paragraphs
  const pureLatexDecorations = new Map<string, Decoration>();
  expandedDecorations.forEach((decoration) => {
    if (decoration.text) {
      const isPureLatex =
        decoration.text.match(/^\$[^$]*\$$/) ||
        decoration.text.match(/^\$\$[^$]*\$\$$/);
      if (isPureLatex) {
        pureLatexDecorations.set(decoration.text, decoration);
      }
    }
  });

  // Create an ordered list of standalone LaTeX expressions that have decorations
  const standaloneLatexList: string[] = [];
  const lines = text.split("\n");
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (pureLatexDecorations.has(trimmed)) {
      standaloneLatexList.push(trimmed);
    }
  });

  // Counter for standalone LaTeX paragraphs
  let standaloneLatexCounter = 0;

  return (
    <div
      ref={containerRef}
      className={`relative ${
        isAnnotating ? "cursor-text-highlight" : "cursor-text"
      }`}
    >
      {/* Add styles for LaTeX highlighting */}
      <style jsx>{`
        .katex-highlight .katex,
        .katex-highlight .katex *,
        .katex-highlight .katex .base,
        .katex-highlight .katex .strut,
        .katex-highlight .katex .mord,
        .katex-highlight .katex .mbin,
        .katex-highlight .katex .mrel,
        .katex-highlight .katex .mopen,
        .katex-highlight .katex .mclose,
        .katex-highlight .katex .mpunct {
          background-color: inherit !important;
        }
      `}</style>
      <ReactMarkdown
        className={styles.markdownContent}
        remarkPlugins={[
          remarkGfm,
          [remarkMath, { singleDollarTextMath: true }],
        ]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={
          {
            p: ({ children }: { children: ReactNode }) => {
              // Check if this is a pure LaTeX paragraph (single KaTeX element)
              if (
                React.isValidElement(children) &&
                (children.props as any)?.className === "katex"
              ) {
                // This is a standalone LaTeX paragraph like "$x > 1$"
                // We need to check if any of our decorations match this LaTeX

                // Use the counter to map this standalone LaTeX paragraph to the correct decoration
                let matchingDecoration: Decoration | undefined;

                if (standaloneLatexCounter < standaloneLatexList.length) {
                  const latexExpr = standaloneLatexList[standaloneLatexCounter];
                  matchingDecoration = pureLatexDecorations.get(latexExpr);
                  standaloneLatexCounter++;
                }

                if (matchingDecoration) {
                  const decorationClasses = getDecorationClasses(
                    [matchingDecoration],
                    false,
                  );
                  const decorationStyles = getDecorationStyles(
                    [matchingDecoration],
                    false,
                  );
                  const backgroundColor = hexToRgba(
                    matchingDecoration.color || "#05B0FF",
                    0.4,
                  );

                  return (
                    <p className={`${italicize ? "italic" : ""}`}>
                      <span
                        className={`katex-highlight ${decorationClasses} ${
                          isAnnotating ? "cursor-text-highlight" : "cursor-text"
                        } px-1 -mx-1 py-0.5 -my-0.5 rounded-[4px]`}
                        style={{
                          ...decorationStyles,
                          backgroundColor,
                        }}
                      >
                        {children}
                      </span>
                    </p>
                  );
                }

                // No decoration found, render normally
                return (
                  <p className={`${italicize ? "italic" : ""}`}>{children}</p>
                );
              }

              // Handle mixed content paragraphs (existing logic)
              const processedChildren =
                typeof children === "string"
                  ? applyDecorations(children, expandedDecorations)
                  : applyDecorationsToMixedContent(children);

              return (
                <p
                  className={`${
                    expandedDecorations.length > 0
                      ? "text-[rgba(0,0,0,0.8)]"
                      : "text-black"
                  } ${italicize ? "italic" : ""}`}
                >
                  {processedChildren}
                </p>
              );
            },
            td: ({ children }: { children: ReactNode }) => {
              const processedChildren =
                typeof children === "string"
                  ? applyDecorations(children, expandedDecorations)
                  : applyDecorationsToMixedContent(children);

              return (
                <td
                  className={`px-4 border-r border-[#f2f2f7] text-center ${
                    italicize ? "italic" : ""
                  }`}
                >
                  {processedChildren}
                </td>
              );
            },
            th: ({ children }: { children: ReactNode }) => {
              const processedChildren =
                typeof children === "string"
                  ? applyDecorations(children, expandedDecorations)
                  : applyDecorationsToMixedContent(children);

              return (
                <th
                  className={`px-4 border-b border-r bg-[#F8F8FB] border-[#f2f2f7] font-medium text-center ${
                    italicize ? "italic" : ""
                  }`}
                >
                  {processedChildren}
                </th>
              );
            },
            code: ({ children }: { children: ReactNode }) => {
              const processedChildren =
                typeof children === "string"
                  ? applyDecorations(children, expandedDecorations)
                  : applyDecorationsToMixedContent(children);

              // Render as regular text instead of code block
              return (
                <span
                  className={`${
                    expandedDecorations.length > 0
                      ? "text-[rgba(0,0,0,0.8)]"
                      : "text-black"
                  } ${italicize ? "italic" : ""} ${
                    isAnnotating ? "cursor-text-highlight" : "cursor-text"
                  }`}
                >
                  {processedChildren}
                </span>
              );
            },
            pre: ({ children }: { children: ReactNode }) => {
              // Render code blocks as regular text instead of preformatted blocks
              const processedChildren =
                typeof children === "string"
                  ? applyDecorations(children, expandedDecorations)
                  : applyDecorationsToMixedContent(children);

              return (
                <span
                  className={`${
                    expandedDecorations.length > 0
                      ? "text-[rgba(0,0,0,0.8)]"
                      : "text-black"
                  } ${italicize ? "italic" : ""} ${
                    isAnnotating ? "cursor-text-highlight" : "cursor-text"
                  }`}
                >
                  {processedChildren}
                </span>
              );
            },
          } as Components
        }
      >
        {processedText}
      </ReactMarkdown>

      {/* Render summary popups */}
      {summaryPopups.map((popup) => {
        const position = getSummaryPopupPosition(
          popup.spanRef,
          popup.summaryKey,
        );
        const isDragging = draggingSummary === popup.summaryKey;

        return (
          <div
            key={popup.summaryKey}
            className="pointer-events-auto select-none absolute bg-white rounded-[16px] p-4 shadow-[0_0_15px_rgba(0,0,0,0.15)] w-[280px] cursor-grab active:cursor-grabbing"
            style={{
              left: position.x,
              top: position.y,
              transform: `translate(-50%, -50%) rotate(-1deg)`,
              transition: isDragging ? "none" : "transform 150ms ease-out",
              userSelect: isDragging ? "none" : "auto",
            }}
            onMouseDown={handleSummaryMouseDown(popup.summaryKey)}
            onTouchStart={handleSummaryTouchStart(popup.summaryKey)}
          >
            <div className="flex flex-row gap-2 items-center mb-1">
              <div className="w-5 h-5 flex items-center justify-center font-rounded-bold text-[12px] text-[white] bg-[#7CC500] rounded-full">
                {expandedDecorations.findIndex((d) => d.summary) + 1}
              </div>
              <div className="font-rounded-bold text-[15px] text-[#7CC500]">
                Summary
              </div>
            </div>
            <div className="font-['Shantell_Sans'] font-[500] text-[17px] text-black leading-normal">
              {popup.decoration.summary}
            </div>
          </div>
        );
      })}

      {diagram && (
        <div className="flex flex-row justify-center pr-10 mt-4 w-full max-w-full overflow-hidden items-center">
          <div className="w-full max-w-[640px] overflow-hidden">
            <ReactMarkdown
              className={styles.markdownContent}
              remarkPlugins={[
                remarkGfm,
                [remarkMath, { singleDollarTextMath: true }],
              ]}
              rehypePlugins={[rehypeKatex, rehypeRaw]}
              components={
                {
                  p: ({ children }: { children: ReactNode }) => {
                    return (
                      <p
                        className={`${
                          expandedDecorations.length > 0
                            ? "text-[rgba(0,0,0,0.8)]"
                            : "text-black"
                        } ${italicize ? "italic" : ""}`}
                      >
                        {applyDecorationsToMixedContent(children)}
                      </p>
                    );
                  },
                  img: ({
                    src,
                    alt,
                    title,
                  }: {
                    src?: string;
                    alt?: string;
                    title?: string;
                  }) => {
                    return (
                      <figure className="my-4">
                        <img
                          src={src}
                          alt={alt || ""}
                          className="max-w-full h-auto max-h-[400px] mx-auto block object-contain"
                        />
                        {title && (
                          <figcaption className="text-center text-sm text-gray-500 mt-2">
                            {title}
                          </figcaption>
                        )}
                      </figure>
                    );
                  },
                  svg: ({
                    children,
                    ...props
                  }: {
                    children: ReactNode;
                    [key: string]: unknown;
                  }) => {
                    return (
                      <svg
                        {...props}
                        className="max-w-full h-auto mx-auto block"
                        style={{
                          maxHeight: "400px",
                          width: "auto",
                          height: "auto",
                        }}
                      >
                        {children}
                      </svg>
                    );
                  },
                  td: ({ children }: { children: ReactNode }) => {
                    return (
                      <td
                        className={`px-4 border-r border-[#f2f2f7] text-center ${
                          italicize ? "italic" : ""
                        }`}
                      >
                        {applyDecorationsToMixedContent(children)}
                      </td>
                    );
                  },
                  th: ({ children }: { children: ReactNode }) => {
                    return (
                      <th
                        className={`px-4 border-b border-r bg-[#F8F8FB] border-[#f2f2f7] font-medium text-center ${
                          italicize ? "italic" : ""
                        }`}
                      >
                        {applyDecorationsToMixedContent(children)}
                      </th>
                    );
                  },
                  code: ({ children }: { children: ReactNode }) => {
                    // Render as regular text instead of code block
                    return (
                      <span
                        className={`${
                          expandedDecorations.length > 0
                            ? "text-[rgba(0,0,0,0.8)]"
                            : "text-black"
                        } ${italicize ? "italic" : ""} ${
                          isAnnotating ? "cursor-text-highlight" : "cursor-text"
                        }`}
                      >
                        {applyDecorationsToMixedContent(children)}
                      </span>
                    );
                  },
                  pre: ({ children }: { children: ReactNode }) => {
                    // Render code blocks as regular text instead of preformatted blocks
                    return (
                      <span
                        className={`${
                          expandedDecorations.length > 0
                            ? "text-[rgba(0,0,0,0.8)]"
                            : "text-black"
                        } ${italicize ? "italic" : ""} ${
                          isAnnotating ? "cursor-text-highlight" : "cursor-text"
                        }`}
                      >
                        {applyDecorationsToMixedContent(children)}
                      </span>
                    );
                  },
                } as Components
              }
            >
              {removeAltText(preprocessLaTeX(diagram))}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize to prevent re-renders that clear text selection
const MemoizedQuestionTextRenderer = React.memo(QuestionTextRenderer);

export { MemoizedQuestionTextRenderer as QuestionTextRenderer };
