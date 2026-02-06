"use client";

import { useSidebar } from "@/app/(protected)/open/_components/sidebar/MOSidebarLayoutClient";
import {
  Flashcard,
  FlashcardSourceReference,
} from "@/app/(protected)/open/_types/flashcardTypes";
import { applyWhiteOverlay } from "@/app/_lib/utils/colorUtils";
import { RotateCcw, Check } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FlashcardMarkdown from "./FlashcardMarkdown";
import { useAutoFontSize } from "./useAutoFontSize";

interface FlashcardStudyViewProps {
  card: Flashcard;
  onResponse: (quality: "good" | "again", responseTimeMs?: number) => void;
  onCitationClick?: (ref: FlashcardSourceReference) => void;
  remainingCards?: number;
}

const CARD_ASPECT_RATIO = "1 / 1.3";

const FlashcardStudyView: React.FC<FlashcardStudyViewProps> = ({
  card,
  onResponse,
  onCitationClick,
  remainingCards = 0,
}) => {
  // Get collection color for card background
  const { collections, selectedCollection } = useSidebar();
  const { cardColor, stackColors, primaryColor } = useMemo(() => {
    const collection = collections.find((c) => c.id === selectedCollection);
    const primary = collection?.primaryColor || "#41C3FF";
    return {
      primaryColor: primary,
      cardColor: applyWhiteOverlay(primary, 0.5), // 50% white for main card
      stackColors: [
        applyWhiteOverlay(primary, 0.35), // darker for back cards
        applyWhiteOverlay(primary, 0.4),
        applyWhiteOverlay(primary, 0.45),
      ],
    };
  }, [collections, selectedCollection]);

  const [isPressed, setIsPressed] = useState(false);
  const [displayedContent, setDisplayedContent] = useState<"term" | "definition">("term");
  const [startTime] = useState(() => Date.now());

  const containerRef = useRef<HTMLDivElement>(null);
  const handleFlipRef = useRef<((animate?: boolean) => void) | null>(null);

  const isFlipped = displayedContent === "definition";

  // Reset state when card changes
  useEffect(() => {
    setIsPressed(false);
    setDisplayedContent("term");
  }, [card.id]);

  const handleFlip = useCallback((animate = false) => {
    if (animate) {
      setIsPressed(true);
      setTimeout(() => {
        setDisplayedContent((prev) => (prev === "term" ? "definition" : "term"));
        setIsPressed(false);
      }, 100);
    } else {
      setDisplayedContent((prev) => (prev === "term" ? "definition" : "term"));
    }
  }, []);

  // Get both term and definition content
  const termContent = useMemo(() => card.term || "Empty card", [card.term]);
  const definitionContent = useMemo(() => card.definition || "No definition", [card.definition]);

  // Use the longer text for font sizing to ensure both will fit
  const longerContent = useMemo(() => {
    // Compare lengths and return the longer one
    return (termContent.length >= definitionContent.length) ? termContent : definitionContent;
  }, [termContent, definitionContent]);

  // Calculate font size based on the longer text
  const { fontSize, containerRef: fontSizeContainerRef } = useAutoFontSize(longerContent, {
    minSize: 12,
    maxSize: 40,
    widthMargin: 0.95,
    heightMargin: 0.85,
  });

  // Get current content to display
  const currentContent = displayedContent === "definition" ? definitionContent : termContent;

  useEffect(() => {
    handleFlipRef.current = handleFlip;
  });

  const handleResponse = useCallback(
    (quality: "good" | "again", animate = false) => {
      const responseTimeMs = Date.now() - startTime;
      if (animate) {
        setIsPressed(true);
        setTimeout(() => {
          setIsPressed(false);
          onResponse(quality, responseTimeMs);
        }, 100);
      } else {
        onResponse(quality, responseTimeMs);
      }
    },
    [onResponse, startTime],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTypingInInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "MATH-FIELD" ||
          (activeElement instanceof HTMLElement &&
            activeElement.isContentEditable));
      if (isTypingInInput) return;

      // Space to flip
      if (e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        handleFlipRef.current?.(true);
      }

      // Up/Down to flip
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        handleFlipRef.current?.(true);
      }

      // Left/Right for responses (only after flipped)
      if (isFlipped && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === "ArrowLeft") {
          handleResponse("again", true);
        } else {
          handleResponse("good", true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isFlipped, handleResponse]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col flex-1 items-center justify-center overflow-hidden"
      tabIndex={0}
      style={{
        backgroundColor: "#FBFBFD",
        height: "100%",
        outline: "none",
      }}
    >
      {/* Card container */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {/* Card stack container */}
        <div className="relative" style={{ height: "calc(60vh - 100px)" }}>
          {/* Background cards (stack effect) */}
          {[
            { minCards: 3, colorIndex: 0, rotate: 6, offset: 4, zIndex: 1 },
            { minCards: 2, colorIndex: 1, rotate: 3, offset: 2, zIndex: 2 },
            { minCards: 1, colorIndex: 2, rotate: 1, offset: 1, zIndex: 3 },
          ].map(
            ({ minCards, colorIndex, rotate, offset, zIndex }) =>
              remainingCards >= minCards && (
                <div
                  key={minCards}
                  className="absolute rounded-2xl"
                  style={{
                    backgroundColor: stackColors[colorIndex],
                    aspectRatio: CARD_ASPECT_RATIO,
                    height: "100%",
                    width: "auto",
                    transform: `rotate(${rotate}deg)`,
                    top: `${offset}px`,
                    left: `${offset}px`,
                    zIndex,
                    boxShadow: "0 2px 2px rgba(0, 0, 0, 0.01)",
                  }}
                />
              ),
          )}

          {/* Main card */}
          <button
            onClick={() => handleFlipRef.current?.()}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            onTouchStart={() => setIsPressed(true)}
            onTouchEnd={() => setIsPressed(false)}
            className="relative rounded-2xl px-8 py-6 flex flex-col cursor-pointer focus:outline-none focus-visible:outline-none"
            style={{
              backgroundColor: isFlipped ? "#FFFFFF" : cardColor,
              aspectRatio: CARD_ASPECT_RATIO,
              height: "100%",
              width: "auto",
              outline: "none",
              zIndex: 4,
              transform: isPressed ? "scale(0.98)" : "scale(1)",
              transition: "transform 80ms ease-out",
              boxShadow: "0 2px 2px rgba(0, 0, 0, 0.01)",
            }}
          >
            <div
              ref={fontSizeContainerRef}
              className="flex-1 flex items-center justify-center overflow-hidden w-full"
            >
              <div
                className="font-rounded-bold text-center w-full break-words flex items-center justify-center"
                style={{
                  color: isFlipped ? primaryColor : "#111827",
                  fontSize,
                  lineHeight: "1.4",
                  wordBreak: "break-word",
                  overflowWrap: "break-word"
                }}
              >
                <span className="text-center w-full">
                  <FlashcardMarkdown
                    content={currentContent}
                    sourceReferences={card.sourceReferences}
                    onCitationClick={onCitationClick}
                  />
                </span>
              </div>
            </div>

            <div className={`absolute bottom-0 left-0 right-0 w-full flex flex-row p-5 ${isFlipped ? 'justify-between' : 'justify-start'} items-center text-[15px] font-rounded-semibold`}>
              {!isFlipped ? (
                <div className="p-2">
                {/* <svg width="52" height="41" viewBox="0 0 52 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M42.0243 0C44.1593 1.98414e-05 45.6735 2.15419 46.2335 5.98857C46.7837 9.75392 46.3695 14.8367 45.0826 20.1535C45.0435 20.315 45.145 20.4461 45.3104 20.4461H50.3141C51.4954 20.4461 52.2257 21.3821 51.8935 22.535C50.5525 27.1902 48.6561 31.5651 46.5145 34.904C44.055 38.7383 41.4739 40.8925 39.3387 40.8925C37.2037 40.8925 35.6895 38.7383 35.1294 34.904C34.9198 33.4687 34.8501 31.8422 34.9157 30.0843C34.9277 29.7579 34.3911 29.7586 34.2425 30.085C33.4415 31.8426 32.572 33.469 31.6583 34.904C29.2166 38.7383 26.6594 40.8925 24.5495 40.8925C22.4395 40.8925 20.9495 38.7383 20.4071 34.904C20.2201 33.5818 20.1512 32.097 20.1962 30.4966C20.2052 30.1753 19.6859 30.1746 19.535 30.4959C18.7831 32.0965 17.9736 33.5815 17.1254 34.904C14.6661 38.7383 12.085 40.8925 9.94988 40.8925C7.81477 40.8925 6.30044 38.7383 5.74032 34.904C5.19029 31.1387 5.60449 26.0556 6.89133 20.7388C6.93043 20.5773 6.82893 20.4461 6.66357 20.4461H1.65972C0.478586 20.4461 -0.251717 19.5103 0.0803571 18.3575C1.42145 13.7022 3.31804 9.32743 5.45958 5.98857C7.91895 2.15417 10.5 1.56546e-05 12.6351 0C14.7703 -1.41926e-07 16.2844 2.15415 16.8445 5.98857C17.0541 7.42378 17.1237 9.05039 17.0582 10.8084C17.0461 11.1347 17.5827 11.1342 17.7315 10.8077C18.5325 9.04997 19.4022 7.42359 20.316 5.98857C22.7576 2.15418 25.3146 1.45072e-07 27.4247 0C29.5346 9.31842e-06 31.0247 2.15418 31.567 5.98857C31.7541 7.31065 31.8228 8.79517 31.7777 10.3952C31.7688 10.7166 32.2883 10.7172 32.4393 10.3959C33.191 8.79563 34.0006 7.31083 34.8487 5.98857C37.3079 2.15419 39.8891 1.41925e-07 42.0243 0Z" fill="black" />
                </svg> */}
                </div>
              ) : (
                <>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResponse("again");
                    }}
                    className="cursor-pointer"
                  >
                    Ask again later
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResponse("good");
                    }}
                    className="bg-black px-5 py-2 rounded-full text-white cursor-pointer"
                  >
                    Good
                  </div>
                </>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardStudyView;
