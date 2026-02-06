"use client";

import { useSidebar } from "@/app/(protected)/open/_components/sidebar/MOSidebarLayoutClient";
import { Flashcard } from "@/app/(protected)/open/_types/flashcardTypes";
import { applyWhiteOverlay } from "@/app/_lib/utils/colorUtils";
import { useResponsive } from "@/app/_hooks/useResponsive";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAutoFontSize } from "./useAutoFontSize";

interface FlashcardPreviewPanelProps {
  cards: Flashcard[];
  selectedIndex: number;
  onSelectCard: (index: number) => void;
}

const CARD_ASPECT_RATIO = "1 / 1.3"; // portrait (width / height)

const FlashcardPreviewPanel: React.FC<FlashcardPreviewPanelProps> = ({
  cards,
  selectedIndex,
  onSelectCard,
}) => {
  // Get collection color for card background
  const { collections, selectedCollection } = useSidebar();
  const { isBelowSm } = useResponsive();
  const { cardColor, primaryColor } = useMemo(() => {
    const collection = collections.find((c) => c.id === selectedCollection);
    const primary = collection?.primaryColor || "#41C3FF";
    return {
      primaryColor: primary,
      cardColor: applyWhiteOverlay(primary, 0.5), // 50% white for card background
    };
  }, [collections, selectedCollection]);

  const [isPressed, setIsPressed] = useState(false);
  const [displayedContent, setDisplayedContent] = useState<"term" | "definition">("term");
  const selectedCard = cards[selectedIndex];
  const scrollAccumulatorRef = useRef(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef(selectedIndex);
  const cardsLengthRef = useRef(cards.length);
  const onSelectCardRef = useRef(onSelectCard);
  const handleFlipRef = useRef<((animate?: boolean) => void) | null>(null);
  const isPreviewActiveRef = useRef(false);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    cardsLengthRef.current = cards.length;
  }, [cards.length]);

  useEffect(() => {
    onSelectCardRef.current = onSelectCard;
  }, [onSelectCard]);

  // Reset to front when selecting a different card
  useEffect(() => {
    setIsPressed(false);
    setDisplayedContent("term");
  }, [selectedIndex]);

  const handleFlip = (animate = false) => {
    if (animate) {
      setIsPressed(true);
      setTimeout(() => {
        setDisplayedContent((prev) => (prev === "term" ? "definition" : "term"));
        setIsPressed(false);
      }, 100);
    } else {
      setDisplayedContent((prev) => (prev === "term" ? "definition" : "term"));
    }
  };

  useEffect(() => {
    handleFlipRef.current = handleFlip;
  });

  // Get both term and definition content
  const termContent = useMemo(() => {
    if (!selectedCard) return "";
    return selectedCard.term || "Empty card";
  }, [selectedCard]);

  const definitionContent = useMemo(() => {
    if (!selectedCard) return "";
    return selectedCard.definition || "No definition";
  }, [selectedCard]);

  // Use the longer text for font sizing to ensure both will fit
  const longerContent = useMemo(() => {
    if (!termContent && !definitionContent) return "";
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

  // Check if card is flipped (showing definition)
  const isFlipped = displayedContent === "definition";

  // Keyboard shortcuts (active when the preview is hovered/focused):
  // - ArrowLeft/ArrowRight: previous/next card
  // - ArrowUp/ArrowDown: flip card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPreviewActiveRef.current) return;

      const activeElement = document.activeElement;
      const isTypingInInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "MATH-FIELD" ||
          (activeElement instanceof HTMLElement &&
            activeElement.isContentEditable));
      if (isTypingInInput) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        const idx = selectedIndexRef.current;
        const len = cardsLengthRef.current;
        if (e.key === "ArrowRight" && idx < len - 1) {
          onSelectCardRef.current(idx + 1);
        } else if (e.key === "ArrowLeft" && idx > 0) {
          onSelectCardRef.current(idx - 1);
        }
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        handleFlipRef.current?.(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  // Prevent page scrolling while the cursor is over the preview panel.
  // We use native listeners with passive:false to ensure preventDefault is honored.
  useEffect(() => {
    const el = rightPanelRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Ignore pinch-to-zoom gesture (trackpad) which sets ctrlKey on wheel events in many browsers
      if (e.ctrlKey) return;
      // Prefer vertical scroll; ignore primarily horizontal swipes
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      e.preventDefault();
      e.stopPropagation();

      scrollAccumulatorRef.current += e.deltaY;

      // Mouse wheel (deltaMode 1) vs trackpad (deltaMode 0)
      const threshold = e.deltaMode === 1 ? 3 : 25;
      if (Math.abs(scrollAccumulatorRef.current) < threshold) return;

      const direction = scrollAccumulatorRef.current > 0 ? 1 : -1;
      scrollAccumulatorRef.current = 0;

      const idx = selectedIndexRef.current;
      const len = cardsLengthRef.current;
      if (direction > 0 && idx < len - 1) {
        onSelectCardRef.current(idx + 1);
      } else if (direction < 0 && idx > 0) {
        onSelectCardRef.current(idx - 1);
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => {
      el.removeEventListener("wheel", handleWheel, true);
    };
  }, []);

  useEffect(() => {
    const el = thumbnailsRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const canScroll = el.scrollHeight > el.clientHeight + 1;
      if (!canScroll) {
        // If the thumbnail strip can't scroll, don't let the page scroll instead.
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
        // Stop scroll chaining to the page when the thumbnail list hits its bounds.
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => {
      el.removeEventListener("wheel", handleWheel, true);
    };
  }, []);

  if (cards.length === 0) {
    return (
      <div
        className="flex items-center justify-center p-8"
        style={{ backgroundColor: "#FBFBFD" }}
      >
        <p className="text-gray-400">Add cards to see preview</p>
      </div>
    );
  }

  return (
    <div
      ref={previewContainerRef}
      className="flex gap-6 p-6 overflow-hidden shrink-0"
      tabIndex={0}
      onMouseEnter={() => {
        isPreviewActiveRef.current = true;
      }}
      onMouseLeave={() => {
        isPreviewActiveRef.current = false;
      }}
      onFocus={() => {
        isPreviewActiveRef.current = true;
      }}
      onBlur={() => {
        isPreviewActiveRef.current = false;
      }}
      onMouseDown={() => {
        // Allow keyboard navigation immediately after clicking anywhere in the preview.
        previewContainerRef.current?.focus();
      }}
      style={{
        // backgroundColor: "#FBFBFD",
        height: "60vh",
        outline: "none",
      }}
    >
      {/* Left: Thumbnail strip - hidden on mobile */}
      {!isBelowSm && (
        <div
          ref={thumbnailsRef}
          className="flex flex-col gap-2 overflow-y-auto self-stretch min-h-0 h-full pr-1 overscroll-contain"
        >
          {cards.map((card, index) => (
            <div key={card.id} className="flex flex-col items-center">
              <div
                className={`rounded p-1 ${index === selectedIndex ? "bg-[#f2f2f7] rounded-[4px]" : "hover:bg-[#f2f2f7]"
                  }`}
              >
                <button
                  onClick={() => onSelectCard(index)}
                  className="flex flex-col w-[80px] rounded-md p-2 border border-[#F2F2F7] overflow-hidden focus:outline-none focus-visible:outline-none"
                  style={{
                    backgroundColor: cardColor,
                    aspectRatio: CARD_ASPECT_RATIO,
                    outline: "none",
                  }}
                >
                  {/* Card content preview */}
                  <div className="text-[9px] text-gray-800 line-clamp-4 text-left flex-1">
                    {card.term || "Empty"}
                  </div>
                </button>
              </div>
              {/* Card number below */}
              <span
                className={`text-xs mt-1 ${index === selectedIndex ? "text-black font-medium" : "text-[#595959]"
                  }`}
              >
                {index + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Right: Large preview + spacer (wheel navigation only on this side) */}
      <div
        ref={rightPanelRef}
        className="flex-1 flex gap-6"
        style={{
          // Prevent wheel scroll from "escaping" into the parent (the card list below),
          // ensuring wheel is used for card navigation while the cursor is over this side.
          overscrollBehavior: "contain",
        }}
      >
        {/* Center: Large preview */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Large card preview - clickable to flip */}
          <button
            onClick={() => handleFlip()}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            onTouchStart={() => setIsPressed(true)}
            onTouchEnd={() => setIsPressed(false)}
            className="rounded-2xl px-8 py-6 flex flex-col cursor-pointer focus:outline-none focus-visible:outline-none"
            style={{
              backgroundColor: isFlipped ? "#FFFFFF" : cardColor,
              aspectRatio: CARD_ASPECT_RATIO,
              height: "calc(100% - 32px)",
              width: "auto",
              outline: "none",
              transform: isPressed ? "scale(0.98)" : "scale(1)",
              transition: "transform 80ms ease-out",
            }}
          >
            {/* Card content */}
            <div
              ref={fontSizeContainerRef}
              className="flex-1 flex items-center justify-center overflow-hidden w-full"
            >
              <p
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
                  {currentContent}
                </span>
              </p>
            </div>
            {!isFlipped && (
              <svg width="52" height="41" viewBox="0 0 52 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M42.0243 0C44.1593 1.98414e-05 45.6735 2.15419 46.2335 5.98857C46.7837 9.75392 46.3695 14.8367 45.0826 20.1535C45.0435 20.315 45.145 20.4461 45.3104 20.4461H50.3141C51.4954 20.4461 52.2257 21.3821 51.8935 22.535C50.5525 27.1902 48.6561 31.5651 46.5145 34.904C44.055 38.7383 41.4739 40.8925 39.3387 40.8925C37.2037 40.8925 35.6895 38.7383 35.1294 34.904C34.9198 33.4687 34.8501 31.8422 34.9157 30.0843C34.9277 29.7579 34.3911 29.7586 34.2425 30.085C33.4415 31.8426 32.572 33.469 31.6583 34.904C29.2166 38.7383 26.6594 40.8925 24.5495 40.8925C22.4395 40.8925 20.9495 38.7383 20.4071 34.904C20.2201 33.5818 20.1512 32.097 20.1962 30.4966C20.2052 30.1753 19.6859 30.1746 19.535 30.4959C18.7831 32.0965 17.9736 33.5815 17.1254 34.904C14.6661 38.7383 12.085 40.8925 9.94988 40.8925C7.81477 40.8925 6.30044 38.7383 5.74032 34.904C5.19029 31.1387 5.60449 26.0556 6.89133 20.7388C6.93043 20.5773 6.82893 20.4461 6.66357 20.4461H1.65972C0.478586 20.4461 -0.251717 19.5103 0.0803571 18.3575C1.42145 13.7022 3.31804 9.32743 5.45958 5.98857C7.91895 2.15417 10.5 1.56546e-05 12.6351 0C14.7703 -1.41926e-07 16.2844 2.15415 16.8445 5.98857C17.0541 7.42378 17.1237 9.05039 17.0582 10.8084C17.0461 11.1347 17.5827 11.1342 17.7315 10.8077C18.5325 9.04997 19.4022 7.42359 20.316 5.98857C22.7576 2.15418 25.3146 1.45072e-07 27.4247 0C29.5346 9.31842e-06 31.0247 2.15418 31.567 5.98857C31.7541 7.31065 31.8228 8.79517 31.7777 10.3952C31.7688 10.7166 32.2883 10.7172 32.4393 10.3959C33.191 8.79563 34.0006 7.31083 34.8487 5.98857C37.3079 2.15419 39.8891 1.41925e-07 42.0243 0Z" fill="black" />
              </svg>
            )}
          </button>
        </div>

        {/* Right spacer for balance - hidden on mobile */}
        {!isBelowSm && <div className="w-[80px] shrink-0" />}
      </div>
    </div>
  );
};

export default FlashcardPreviewPanel;
