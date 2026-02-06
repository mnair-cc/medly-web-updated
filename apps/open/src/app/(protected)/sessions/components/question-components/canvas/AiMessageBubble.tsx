import React, { useState, useMemo, useRef, useEffect } from "react";

const SpeechBubble = ({
  text,
  x,
  y,
  onSegmentChange,
}: {
  text: string;
  x: number;
  y: number;
  onSegmentChange?: (isOnLastSegment: boolean) => void;
}) => {
  // Estimate characters per line based on max-width (320px) and font size
  // Rough estimate: ~40-50 characters per line for text-sm
  const CHARS_PER_LINE = 32;
  const MAX_LINES = 2;

  // Split text into segments that fit within two lines
  const textSegments = useMemo(() => {
    const CHARS_PER_SEGMENT = CHARS_PER_LINE * MAX_LINES;

    // Step 1: Split by newlines and remove them
    const newlineSplit = text
      .split(/\n+/)
      .filter((segment) => segment.trim().length > 0);

    const finalSegments = [];

    // Step 2: Process each newline-separated segment
    for (const segment of newlineSplit) {
      const trimmedSegment = segment.trim();

      // Step 3: Check if this segment needs further splitting
      if (trimmedSegment.length <= CHARS_PER_SEGMENT) {
        finalSegments.push(trimmedSegment);
        continue;
      }

      // Step 4: Apply existing segmentation logic for segments that are too long
      let remainingText = trimmedSegment;

      while (remainingText.length > 0) {
        if (remainingText.length <= CHARS_PER_SEGMENT) {
          finalSegments.push(remainingText.trim());
          break;
        }

        let bestBreakPoint = -1;
        let bestBreakScore = 0;

        // First priority: Check for sentence endings from the beginning, but exclude numbered lists
        for (
          let i = 1;
          i < Math.min(CHARS_PER_SEGMENT, remainingText.length);
          i++
        ) {
          const char = remainingText[i];
          const nextChar =
            i < remainingText.length - 1 ? remainingText[i + 1] : "";

          // Sentence endings with space or end of text - highest priority regardless of length
          // BUT exclude numbered lists (e.g., "1. ", "2. ", etc.)
          if (/[.!?]/.test(char) && (/\s/.test(nextChar) || nextChar === "")) {
            // Check if this is a numbered list by looking at the context before the period
            const beforePeriod = remainingText.substring(
              Math.max(0, i - 10),
              i
            );
            const isNumberedList = /\b\d+$/.test(beforePeriod.trim());

            if (!isNumberedList) {
              bestBreakPoint = i;
              bestBreakScore = 1000; // Very high score to ensure priority
              break; // Take the first sentence ending we find
            }
          }
        }

        // If no sentence ending found, use the existing character-based logic
        if (bestBreakPoint === -1) {
          // Expand search range - look from ideal length down to 40% for more flexibility
          const maxSearch = Math.min(
            CHARS_PER_SEGMENT,
            remainingText.length - 1
          );
          const minSearch = Math.max(1, Math.floor(CHARS_PER_SEGMENT * 0.4));

          for (let i = maxSearch; i >= minSearch; i--) {
            const char = remainingText[i];
            const prevChar = i > 0 ? remainingText[i - 1] : "";
            const nextChar =
              i < remainingText.length - 1 ? remainingText[i + 1] : "";
            let score = 0;

            // Never break if we're in the middle of a word
            if (
              i > 0 &&
              i < remainingText.length - 1 &&
              /[a-zA-Z0-9]/.test(char) &&
              /[a-zA-Z0-9]/.test(nextChar)
            ) {
              continue; // Skip this position, it's mid-word
            }

            // Semi-colons and colons (good break points)
            if (/[;:]/.test(char) && (/\s/.test(nextChar) || nextChar === "")) {
              score = 80;
            }
            // Commas (decent break points)
            else if (char === "," && (/\s/.test(nextChar) || nextChar === "")) {
              score = 60;
            }
            // After conjunctions and connecting words
            else if (
              i > 0 &&
              /\s(and|but|or|so|yet|for|nor|because|since|while|although|however|therefore|meanwhile|furthermore|moreover|consequently)\s/i.test(
                remainingText.substring(Math.max(0, i - 15), i + 20)
              )
            ) {
              score = 50;
            }
            // After prepositions
            else if (
              i > 0 &&
              /\s(with|without|through|during|before|after|under|over|between|among|within|upon|beneath|beside|beyond|despite|except|including)\s/i.test(
                remainingText.substring(Math.max(0, i - 10), i + 15)
              )
            ) {
              score = 30;
            }
            // Word boundaries - space followed by non-space
            else if (/\s/.test(char) && /\S/.test(nextChar)) {
              score = 20;
            }
            // Space at end of segment
            else if (
              /\s/.test(char) &&
              (nextChar === "" || /\s/.test(nextChar))
            ) {
              score = 15;
            }

            // Bonus for being closer to the ideal length (but not too harsh on shorter segments)
            const lengthRatio = i / CHARS_PER_SEGMENT;
            const lengthBonus =
              lengthRatio > 0.7 ? lengthRatio * 25 : lengthRatio * 10;
            score += lengthBonus;

            if (score > bestBreakScore) {
              bestBreakScore = score;
              bestBreakPoint = i;
            }
          }
        }

        // Enhanced fallback: ensure we never break mid-word
        if (bestBreakPoint === -1) {
          // Start from the character limit and work backwards to find a word boundary
          let fallbackBreakPoint = Math.min(
            CHARS_PER_SEGMENT - 1,
            remainingText.length - 1
          );

          // Walk backwards until we find a good break point
          while (fallbackBreakPoint > Math.floor(CHARS_PER_SEGMENT * 0.3)) {
            const char = remainingText[fallbackBreakPoint];
            const nextChar =
              fallbackBreakPoint < remainingText.length - 1
                ? remainingText[fallbackBreakPoint + 1]
                : "";

            // Good break point: space, punctuation, or end of text
            if (/\s/.test(char) || /[.!?,:;]/.test(char) || nextChar === "") {
              bestBreakPoint = fallbackBreakPoint;
              break;
            }
            fallbackBreakPoint--;
          }

          // If still no good break point, find the last space before character limit
          if (bestBreakPoint === -1) {
            const lastSpace = remainingText.lastIndexOf(
              " ",
              CHARS_PER_SEGMENT - 1
            );
            bestBreakPoint =
              lastSpace > Math.floor(CHARS_PER_SEGMENT * 0.3)
                ? lastSpace
                : Math.floor(CHARS_PER_SEGMENT * 0.6);
          }
        }

        // Extract the segment
        let segmentText = remainingText.substring(0, bestBreakPoint + 1).trim();

        // Clean up: remove trailing punctuation that's not a sentence ender
        if (
          segmentText.length > 0 &&
          /[,:;]$/.test(segmentText) &&
          !/[.!?]$/.test(segmentText)
        ) {
          segmentText = segmentText.slice(0, -1).trim();
        }

        if (segmentText.length > 0) {
          finalSegments.push(segmentText);
        }

        remainingText = remainingText.substring(bestBreakPoint + 1).trim();
      }
    }

    return finalSegments.filter((segment) => segment.length > 0);
  }, [text, CHARS_PER_LINE, MAX_LINES]);

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isFloating, setIsFloating] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hasMultipleSegments = textSegments.length > 1;

  // Call onSegmentChange when reaching last segment - but only after user has navigated
  useEffect(() => {
    if (onSegmentChange && hasMultipleSegments && hasNavigated) {
      const isOnLastSegment = currentSegmentIndex === textSegments.length - 1;
      console.log("AiMessageBubble segment change:", {
        currentSegmentIndex,
        totalSegments: textSegments.length,
        isOnLastSegment,
        hasNavigated,
      });
      onSegmentChange(isOnLastSegment);
    }
  }, [
    currentSegmentIndex,
    textSegments.length,
    hasMultipleSegments,
    onSegmentChange,
    hasNavigated,
  ]);

  // Reset visibility and segment index when text changes
  useEffect(() => {
    setIsVisible(true);
    setCurrentSegmentIndex(0);
    setHasNavigated(false); // Reset navigation flag
    // Trigger animation when text changes
    setIsAnimating(true);
    setIsFloating(false);
    const timer = setTimeout(() => {
      setIsAnimating(false);
      // Start floating animation after initial animation completes
      setTimeout(() => setIsFloating(true), 100);
    }, 50); // Brief delay to ensure animation plays

    // Check if we should trigger effects immediately (single segment) or wait
    if (onSegmentChange) {
      if (textSegments.length === 1) {
        console.log(
          "AiMessageBubble single segment - triggering effects immediately"
        );
        // Single segment - trigger immediately after animation
        setTimeout(() => {
          onSegmentChange(true);
        }, 200); // Increased delay to ensure bubble is fully rendered
      } else {
        console.log(
          "AiMessageBubble multiple segments:",
          textSegments.length,
          "- waiting for last segment"
        );
      }
    }

    return () => clearTimeout(timer);
  }, [text, onSegmentChange, textSegments.length]);

  // Handle clicks outside the bubble
  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
  //       setIsVisible(false);
  //     }
  //   };

  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside);
  //   };
  // }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (hasMultipleSegments) {
      if (isLastSegment) {
        // setIsVisible(false);
      } else {
        setHasNavigated(true); // Mark that user has navigated
        setCurrentSegmentIndex((prev) => (prev + 1) % textSegments.length);
      }
    } else {
      // When there's only one segment, clicking should hide it
      // setIsVisible(false);
    }
  };

  const handleLeftClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSegmentIndex > 0) {
      setHasNavigated(true); // Mark that user has navigated
      setCurrentSegmentIndex((prev) => prev - 1);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSegmentIndex < textSegments.length - 1) {
      setHasNavigated(true); // Mark that user has navigated
      setCurrentSegmentIndex((prev) => prev + 1);
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
  };

  const currentText = textSegments[currentSegmentIndex];
  const isLastSegment = currentSegmentIndex === textSegments.length - 1;

  // Apply minimum constraints for positioning
  const clampedX = Math.max(x, 20);
  const clampedY = Math.max(y, 80);

  if (!isVisible) {
    return null;
  }

  if (!currentText) {
    return null;
  }

  // Calculate estimated bubble width based on text length
  // Base width: ~16px per character + padding (~32px) + some buffer
  const estimatedBubbleWidth = Math.min(
    Math.max(currentText.length * 8 + 64, 120), // Minimum 120px, ~8px per char + padding
    320 // Max width from max-w-80 (320px)
  );

  // Determine if we're in the safe area (considering bubble width)
  const halfBubbleWidth = estimatedBubbleWidth / 2;
  const isInLeftSafeArea = clampedX < halfBubbleWidth + 20; // 20px buffer from left edge
  const isInRightSafeArea =
    clampedX > (window?.innerWidth || 1200) - halfBubbleWidth - 20; // 20px buffer from right edge

  // Choose positioning based on safe area
  let transformX = "-50%"; // Default: center
  let tailPosition = "left-1/2 -translate-x-1/2"; // Default: center

  if (isInLeftSafeArea) {
    transformX = "0%"; // Position from left
    tailPosition = "left-10 -translate-x-0"; // Tail near left edge
  } else if (isInRightSafeArea) {
    transformX = "-100%"; // Position from right
    tailPosition = "right-10 -translate-x-0"; // Tail near right edge
  }

  return (
    <div
      className="absolute z-[9999]"
      style={{
        left: clampedX,
        top: clampedY,
        transform: `translate(${transformX}, -100%) ${
          isAnimating ? "translateY(-8px)" : "translateY(0px)"
        }`,
        pointerEvents: "auto",
      }}
    >
      <div
        ref={bubbleRef}
        className={`bg-[#333333] w-auto max-w-80 p-3 px-4 rounded-[999px] text-white flex items-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.15)] cursor-pointer hover:bg-[#404040] transition-all duration-300 ease-out relative z-10 ${
          isAnimating ? "opacity-0" : "opacity-100"
        } ${isFloating ? "animate-float" : ""}`}
        onClick={handleClick}
        style={{ pointerEvents: "auto" }}
      >
        <style jsx>{`
          @keyframes float {
            0%,
            100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-4px);
            }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>
        <p className="text-sm font-rounded-heavy leading-[1.2] text-center">
          {currentText}
          {hasMultipleSegments && (
            <>
              <span className="ml-1 text-xs opacity-70">
                ({currentSegmentIndex + 1}/{textSegments.length})
              </span>
              {/* Show left arrow for middle and last segments */}
              <button
                className="inline-flex items-center justify-center w-6 h-4 cursor-pointer hover:opacity-70"
                onClick={handleLeftClick}
              >
                <svg
                  className="rotate-90"
                  width="7"
                  height="5"
                  viewBox="0 0 7 5"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 0.41909C7 0.173039 6.93231 0.00010798 6.5 0.00010798L0.5 0C0.0720524 0 0 0.170001 0 0.416052C0 0.543634 0.0786026 0.649953 0.179039 0.795761L2.83843 4.62322C3.03057 4.89357 3.22707 4.99685 3.49782 4.99685C3.76856 4.99685 3.96943 4.89357 4.16157 4.62322L6.82096 0.795761C6.9214 0.65299 7 0.546672 7 0.41909Z"
                    fill={
                      currentSegmentIndex > 0
                        ? "white"
                        : "rgba(255,255,255,0.3)"
                    }
                  />
                </svg>
              </button>
              {/* Show right arrow for first and middle segments */}
              <button
                className="inline-flex items-center justify-center h-6 w-4 -ml-1 cursor-pointer hover:opacity-70"
                onClick={handleRightClick}
              >
                <svg
                  className="-rotate-90"
                  width="7"
                  height="5"
                  viewBox="0 0 7 5"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 0.41909C7 0.173039 6.93231 0.00010798 6.5 0.00010798L0.5 0C0.0720524 0 0 0.170001 0 0.416052C0 0.543634 0.0786026 0.649953 0.179039 0.795761L2.83843 4.62322C3.03057 4.89357 3.22707 4.99685 3.49782 4.99685C3.76856 4.99685 3.96943 4.89357 4.16157 4.62322L6.82096 0.795761C6.9214 0.65299 7 0.546672 7 0.41909Z"
                    fill={
                      currentSegmentIndex < textSegments.length - 1
                        ? "white"
                        : "rgba(255,255,255,0.3)"
                    }
                  />
                </svg>
              </button>
              {/* Show close icon for last segment */}
              {currentSegmentIndex === textSegments.length - 1 && (
                <svg
                  onClick={handleCloseClick}
                  className="inline ml-1 cursor-pointer hover:opacity-70"
                  width="12"
                  height="12"
                  viewBox="0 0 20 19"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9.99121 18.7422C14.9746 18.7422 19.0879 14.6289 19.0879 9.6543C19.0879 4.67969 14.9658 0.566406 9.98242 0.566406C5.00781 0.566406 0.90332 4.67969 0.90332 9.6543C0.90332 14.6289 5.0166 18.7422 9.99121 18.7422ZM6.99414 13.4863C6.52832 13.4863 6.15918 13.1172 6.15918 12.6426C6.15918 12.4316 6.24707 12.2207 6.41406 12.0625L8.80469 9.66309L6.41406 7.27246C6.24707 7.11426 6.15918 6.90332 6.15918 6.69238C6.15918 6.21777 6.52832 5.85742 6.99414 5.85742C7.24023 5.85742 7.43359 5.93652 7.5918 6.09473L9.99121 8.48535L12.3994 6.08594C12.5752 5.91895 12.7598 5.83984 12.9971 5.83984C13.4629 5.83984 13.832 6.20898 13.832 6.6748C13.832 6.89453 13.7441 7.08789 13.5771 7.26367L11.1865 9.66309L13.5771 12.0537C13.7354 12.2207 13.8232 12.4229 13.8232 12.6426C13.8232 13.1172 13.4541 13.4863 12.9795 13.4863C12.7422 13.4863 12.54 13.3984 12.373 13.2402L9.99121 10.8584L7.60938 13.2402C7.45117 13.4072 7.24023 13.4863 6.99414 13.4863Z"
                    fill="white"
                  />
                </svg>
              )}
            </>
          )}
        </p>
        {/* tail of the bubble */}
        <svg
          className={`absolute -bottom-[7px] ${tailPosition}`}
          width="23"
          height="8"
          viewBox="0 0 23 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15.5406 5.42334C14.8006 2.71167 19.7343 0.677918 22.2012 0H-0.000663757C2.71289 1.80778 8.75257 6.04286 11.8403 7.4571C13.3204 8.13502 16.4559 8.77685 15.5406 5.42334Z"
            fill="#333333"
          />
        </svg>
      </div>
    </div>
  );
};

export default SpeechBubble;
