"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useResponsive } from "@/app/_hooks/useResponsive";

export type TooltipPosition = "right" | "bottom";
export type TooltipTriggerMode = "auto" | "hover";

export type IntroStep = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  hasSkip?: boolean;
  isFinal?: boolean;
  buttonText?: string;
  isDisabled?: boolean;
  hideButton?: boolean;
};

interface MOTooltipProps {
  storageKey?: string | null;
  steps: IntroStep[];
  isSkippable?: boolean;
  onComplete?: () => void;
  onFeedback?: () => void;
  disabled?: boolean;
  position?: TooltipPosition;
  triggerMode?: TooltipTriggerMode;
  anchorElement?: HTMLElement | null;
  /** Additional horizontal offset in pixels. Positive moves right. Default: 0 */
  offsetLeft?: number;
  /** Additional vertical offset in pixels. Positive moves down. Default: 0 */
  offsetTop?: number;
}

export default function MOTooltip({
  storageKey,
  steps,
  isSkippable = false,
  onComplete,
  onFeedback,
  disabled = false,
  position: tooltipPosition = "right",
  triggerMode = "auto",
  anchorElement,
  offsetLeft = 0,
  offsetTop = 0,
}: MOTooltipProps) {
  const { isBelowSm, isMeasured } = useResponsive();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasHoveredDropdown, setHasHoveredDropdown] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isAnimatedIn, setIsAnimatedIn] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // For hover mode, check if already seen in localStorage
  const [hasBeenSeen, setHasBeenSeen] = useState(false);

  useEffect(() => {
    if (storageKey) {
      try {
        const seen = localStorage.getItem(storageKey);
        setHasBeenSeen(seen === "true");
      } catch {
        setHasBeenSeen(false);
      }
    }
  }, [storageKey]);

  // Gate visibility via localStorage flag (if storageKey provided)
  useEffect(() => {
    if (!isMeasured || isBelowSm) return;

    // For hover mode, don't auto-show
    if (triggerMode === "hover") {
      return;
    }

    // If no storageKey, always show the tooltip
    if (!storageKey) {
      setIsOpen(true);
      return;
    }
    try {
      const seen = localStorage.getItem(storageKey);
      setIsOpen(seen !== "true");
    } catch {
      setIsOpen(true);
    }
  }, [storageKey, isMeasured, isBelowSm, triggerMode]);

  // Handle hover mode visibility with smooth fade in/out
  useEffect(() => {
    if (triggerMode !== "hover" || hasBeenSeen) return;

    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (isHovering) {
      // Reset hiding state when hovering again
      setIsHiding(false);
      // Show tooltip immediately
      setIsOpen(true);
    } else {
      // Add a small delay before hiding to prevent flickering on edge transitions
      hideTimeoutRef.current = setTimeout(() => {
        // Mark as hiding to prevent entrance animation from re-triggering
        setIsHiding(true);
        // Fade out: animate first, then hide after animation completes
        setIsAnimatedIn(false);
        const hideTimer = setTimeout(() => {
          setIsOpen(false);
        }, 150); // Match the fade duration
        return () => clearTimeout(hideTimer);
      }, 100); // Debounce delay to prevent edge flickering
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [isHovering, triggerMode, hasBeenSeen]);

  // Attach hover listeners to anchor element
  useEffect(() => {
    if (triggerMode !== "hover" || !anchorElement || hasBeenSeen) return;

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    anchorElement.addEventListener("mouseenter", handleMouseEnter);
    anchorElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      anchorElement.removeEventListener("mouseenter", handleMouseEnter);
      anchorElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [anchorElement, triggerMode, hasBeenSeen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Check localStorage for mode dropdown hover + listen for custom event
  useEffect(() => {
    const checkHover = () => {
      try {
        const hovered = localStorage.getItem("has_hovered_mode_dropdown") === "true";
        setHasHoveredDropdown(hovered);
      } catch { }
    };

    checkHover(); // Check on mount
    window.addEventListener("mode-dropdown-hovered", checkHover);

    return () => window.removeEventListener("mode-dropdown-hovered", checkHover);
  }, []);

  // Calculate position based on anchor element
  useLayoutEffect(() => {
    if (!isOpen) return;

    // For hover mode, use anchorElement; otherwise use anchorRef
    const targetElement = triggerMode === "hover" ? anchorElement : anchorRef.current;

    const updatePosition = () => {
      if (!targetElement) return;

      if (triggerMode === "hover" && anchorElement) {
        // For hover mode, position relative to the anchor element directly
        const rect = anchorElement.getBoundingClientRect();

        if (tooltipPosition === "bottom") {
          // Position above the element (tooltip appears above, arrow points down)
          setPosition({
            top: rect.top - 8, // Will be adjusted by transform
            left: rect.left + rect.width / 2,
          });
        } else {
          // Position to the right
          setPosition({
            top: rect.top + rect.height * 0.15,
            left: rect.right + 8,
          });
        }
      } else {
        // Original behavior for auto mode
        const anchor = anchorRef.current;
        if (!anchor) return;

        const parent = anchor.closest("[class*='relative']") as HTMLElement;
        if (!parent) return;

        const parentRect = parent.getBoundingClientRect();

        if (tooltipPosition === "bottom") {
          setPosition({
            top: parentRect.top - 8 + offsetTop,
            left: parentRect.left + parentRect.width / 2 + offsetLeft,
          });
        } else {
          setPosition({
            top: parentRect.top + parentRect.height * 0.15 + offsetTop,
            left: parentRect.right + 8 + offsetLeft,
          });
        }
      }
    };

    updatePosition();

    // Update on scroll/resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, tooltipPosition, triggerMode, anchorElement, offsetLeft, offsetTop]);

  // Trigger entrance animation after position is set
  useEffect(() => {
    if (position && !isAnimatedIn && !isHiding) {
      const timer = requestAnimationFrame(() => setIsAnimatedIn(true));
      return () => cancelAnimationFrame(timer);
    }
  }, [position, isAnimatedIn, isHiding]);

  const closeAndPersist = () => {
    // Only persist to localStorage if storageKey is provided
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {
        // no-op
      }
    }
    setIsOpen(false);
    onComplete?.();
  };

  if (!isOpen || !isMeasured || isBelowSm || steps.length === 0) return <div ref={anchorRef} />;

  const current = steps[stepIndex];
  const isLast = Boolean(current?.isFinal);
  const canGoNext = stepIndex < steps.length - 1;
  const isButtonDisabled = current?.isDisabled && !hasHoveredDropdown;

  // Get styles based on tooltip position
  const getTooltipStyles = () => {
    if (tooltipPosition === "bottom") {
      return {
        top: position?.top,
        left: position?.left,
        transform: isAnimatedIn
          ? "translate(-50%, -100%)"
          : "translate(-50%, calc(-100% + 8px))",
      };
    }
    return {
      top: position?.top,
      left: position?.left,
      transform: isAnimatedIn ? "translateY(0)" : "translateY(8px)",
    };
  };

  const tooltipContent = position && (
    <div
      className={`fixed bg-white/95 backdrop-blur-[16px] rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-[#F2F2F7] w-[280px] p-4 z-[1300] transition-all ease-out ${triggerMode === "hover" ? "duration-150 pointer-events-none" : "duration-300"}`}
      style={{
        ...getTooltipStyles(),
        opacity: isAnimatedIn ? (disabled ? 0.5 : 1) : 0,
      }}
    >
      {/* Triangle pointer - positioned based on tooltipPosition */}
      {tooltipPosition === "right" ? (
        // Left-pointing arrow (for right-positioned tooltip)
        <div
          className="absolute overflow-hidden"
          style={{
            width: 13,
            height: 16,
            left: -13,
            top: "20%",
          }}
        >
          <svg
            width="26"
            height="16"
            viewBox="0 0 26 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M-3.49691e-07 8C-3.77842e-07 8.64402 0.538536 8.9761 1.52794 9.56981L11.422 15.527C11.9605 15.8491 12.4615 16 13 16C13.5385 16 14.0395 15.8491 14.578 15.527L24.4721 9.56981C25.4615 8.9761 26 8.64403 26 8C26 7.35598 25.4615 7.0239 24.4721 6.43019L14.578 0.472956C14.0395 0.150943 13.5385 -5.44708e-07 13 -5.68248e-07C12.4615 -5.91788e-07 11.9605 0.150943 11.422 0.472955L1.52794 6.43019C0.538536 7.0239 -3.2154e-07 7.35597 -3.49691e-07 8Z"
              fill="white"
              stroke="#F2F2F7"
            />
          </svg>
        </div>
      ) : (
        // Down-pointing arrow (for bottom-positioned tooltip - appears above element)
        <div
          className="absolute"
          style={{
            left: "50%",
            bottom: -10,
            transform: "translateX(-50%)",
          }}
        >
          <svg
            width="20"
            height="11"
            viewBox="0 0 20 11"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* White fill triangle */}
            <path
              d="M0 0H20L10 10L0 0Z"
              fill="white"
            />
            {/* Border strokes (left and right edges only) */}
            <path
              d="M0 0L10 10L20 0"
              stroke="#F2F2F7"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>
      )}
      {/* Image - if provided */}
      {current?.imageUrl && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <img
            src={current.imageUrl}
            alt=""
            className="w-full h-auto"
          />
        </div>
      )}
      <div className="mb-2">
        <p className="font-rounded-bold text-[14px]">{current?.title}</p>
        {current?.description ? (
          <p className="text-[14px] leading-5 mt-1 opacity-80">
            {current.description}
          </p>
        ) : null}
      </div>

      {!current?.hideButton && (
        <div className="flex items-center justify-between mt-4 gap-2 flex-row">
          {isLast ? (
            <>
              <button
                type="button"
                className={`px-4 py-2 rounded-xl text-white font-rounded-bold text-[14px] ${isButtonDisabled
                  ? "bg-[#06B0FF]/50 cursor-not-allowed"
                  : "bg-[#06B0FF] hover:bg-[#05B0FF]/80"
                  }`}
                onClick={closeAndPersist}
                disabled={isButtonDisabled}
              >
                {current?.buttonText || "I'm Ready!"}
              </button>
              {onFeedback && (
                <button
                  type="button"
                  className="text-[#06B0FF] font-rounded-bold px-2 py-1 text-[14px]"
                  onClick={onFeedback}
                >
                  Give feedback
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className={`px-4 py-2 rounded-xl text-white font-rounded-bold text-[13px] ${isButtonDisabled
                  ? "bg-[#06B0FF]/50 cursor-not-allowed"
                  : "bg-[#06B0FF] hover:bg-[#05B0FF]/80"
                  }`}
                onClick={() => {
                  if (canGoNext) setStepIndex((i) => i + 1);
                }}
                disabled={isButtonDisabled}
              >
                {current?.buttonText || "Next"}
              </button>
              {(current?.hasSkip || isSkippable) && (
                <button
                  type="button"
                  className="text-[#06B0FF] font-rounded-bold px-2 py-1 text-[14px]"
                  onClick={closeAndPersist}
                >
                  Skip
                </button>
              )}
            </>
          )}

          <span className="ml-auto text-[13px] text-[#595959]/50 font-rounded-bold select-none mr-4">
            {stepIndex + 1}/{steps.length}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div ref={anchorRef} />
      {typeof window !== "undefined" && createPortal(tooltipContent, document.body)}
    </>
  );
}
