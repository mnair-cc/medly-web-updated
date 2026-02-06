"use client";

import { useState, useEffect, useRef } from "react";
import TickCircleIcon from "../../icons/TickCircleIcon";
import CircularProgressBar from "@/app/_components/CircularProgressBar";
import {
  GETTING_STARTED_STEP_IDS,
  GETTING_STARTED_STEPS_CONFIG,
  useGettingStartedProgress,
} from "@/app/_hooks/useGettingStartedSteps";

interface Step {
  id: string;
  text: string;
  isCompleted: boolean;
  hideTail?: boolean;
}

// Image mapping for displayed indices
const INDEX_IMAGE_MAP: { [key: number]: string } = {
  0: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fsidebar.gif?alt=media&token=c1b3f5d1-ee2c-4b5a-a2cc-79b88cffea1d",
  1: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fmarking.gif?alt=media&token=7d1041e5-7219-4cee-b6e4-b4833287c381",
  2: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fdiagram_ai.gif?alt=media&token=030cdcb0-3080-4253-890c-c73aa9e0e5b1",
  3: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fswitch_modes.gif?alt=media&token=6712dbbb-16a4-427f-b918-3eb170d6da26"
};

export default function GettingStartedPopover({
  arrowClassName,
  hideTail = false,
  variant = "static",
  showToast = true,
}: {
  arrowClassName?: string;
  hideTail?: boolean;
  variant?: "static" | "toast";
  showToast?: boolean;
}) {
  const { progress, completedCount, totalCount, isHydrated } = useGettingStartedProgress();

  const steps: Step[] = GETTING_STARTED_STEPS_CONFIG.map((cfg) => ({
    id: cfg.id,
    text: cfg.text,
    isCompleted: Boolean(progress[cfg.id]),
  }));

  const firstIncompleteIndex = steps.findIndex((step) => !step.isCompleted);
  const [displayedIndex, setDisplayedIndex] = useState(
    firstIncompleteIndex !== -1 ? firstIncompleteIndex : 0
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Toast variant state
  const [isVisible, setIsVisible] = useState(variant === "static");
  const [isSlideOut, setIsSlideOut] = useState(false);
  const prevCompletedCountRef = useRef(completedCount);
  const prevProgressRef = useRef(progress);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [celebratingStepId, setCelebratingStepId] = useState<string | null>(null);
  const [showCelebrationStrikethrough, setShowCelebrationStrikethrough] = useState(false);
  const [showNextStep, setShowNextStep] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const celebrationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasArmedHideAfterFade, setHasArmedHideAfterFade] = useState(false);
  const didInitializeRef = useRef(false);

  // Show on initial load if uncompleted steps exist (toast variant only)
  useEffect(() => {
    if (variant !== "toast") return;
    if (!isHydrated) return;
    if (completedCount < totalCount) {
      setIsVisible(true);
      setIsSlideOut(false);
      setShowNextStep(true);
    } else {
      // All steps complete: ensure toast stays hidden on load
      setIsVisible(false);
      setIsSlideOut(false);
      setShowNextStep(false);
    }
  }, [variant, completedCount, totalCount, isHydrated]);

  // Detect completion changes and show/reset timer (toast variant only)
  useEffect(() => {
    if (variant !== "toast") return;
    if (!isHydrated) return;

    // Skip celebration on first hydration to avoid page-load animation
    if (!didInitializeRef.current) {
      didInitializeRef.current = true;
      prevCompletedCountRef.current = completedCount;
      prevProgressRef.current = progress;
      return;
    }

    if (completedCount > prevCompletedCountRef.current) {
      // Find newly completed step by comparing previous and current progress
      const newlyCompletedStepId = GETTING_STARTED_STEP_IDS.find(
        (stepId) =>
          Boolean(progress[stepId]) && !Boolean(prevProgressRef.current[stepId])
      );

      // Step completed - show and reset timer
      setIsVisible(true);
      setIsSlideOut(false);
      // Clear any existing hide timer and re-arm logic will occur after next step fades in
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      if (!isHovered) {
        // Hide timer will be started 3s after the next step fade-in completes
      }

      // Start celebration animation after 1000ms delay
      if (newlyCompletedStepId && celebrationTimerRef.current === null) {
        // Set celebrating step immediately (before delay) and hide next step
        setCelebratingStepId(newlyCompletedStepId);
        setShowNextStep(false);
        setShowCelebrationStrikethrough(false);
        setHasArmedHideAfterFade(false);

        celebrationTimerRef.current = setTimeout(() => {
          // At ~700ms from now: show strikethrough
          setShowCelebrationStrikethrough(true);

          // After 1000ms, crossfade: next step fades in, completed step fades out
          setTimeout(() => {
            setShowNextStep(true);
          }, 1000);

          // Clear celebration state after crossfade completes
          setTimeout(() => {
            setCelebratingStepId(null);
            setShowCelebrationStrikethrough(false);
            celebrationTimerRef.current = null;
          }, 1200);
        }, 1000);
      }
    }
    prevCompletedCountRef.current = completedCount;
    prevProgressRef.current = progress;
  }, [completedCount, variant, progress, isHydrated]);

  // Hide timing: start 3s after the next step fades in; pause/resume on hover
  useEffect(() => {
    if (variant !== "toast" || !isVisible) return;

    // Only arm hide timer after next step is visible
    if (!showNextStep) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      return;
    }

    // Pause timer while hovered
    if (isHovered) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      return;
    }

    // Start/restart timer. First arm includes 300ms fade-in, then 3s; subsequent arms are 3s.
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    const delay = hasArmedHideAfterFade ? 3000 : 3300;
    hideTimerRef.current = setTimeout(() => {
      setIsSlideOut(true);
      setTimeout(() => setIsVisible(false), 200);
    }, delay);
    if (!hasArmedHideAfterFade) setHasArmedHideAfterFade(true);
  }, [variant, isVisible, showNextStep, isHovered, hasArmedHideAfterFade]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    };
  }, []);

  // Sync displayedIndex with firstIncompleteIndex when not hovering
  useEffect(() => {
    if (hoveredIndex === null) {
      setDisplayedIndex(firstIncompleteIndex !== -1 ? firstIncompleteIndex : 0);
    }
  }, [firstIncompleteIndex, hoveredIndex]);

  const getStepOpacity = (stepIndex: number) => {
    // Before revealing next step, keep all steps subdued
    if (variant === "toast" && !showNextStep) {
      return "opacity-20";
    }
    if (stepIndex === firstIncompleteIndex) return "opacity-100";
    return "opacity-20";
  };

  const completedSteps = completedCount;
  const totalSteps = totalCount || GETTING_STARTED_STEP_IDS.length;
  const percentage = (completedSteps / totalSteps) * 100;

  // Don't render if toast variant and either not visible or showToast is false
  if (variant === "toast" && (!isVisible || !showToast)) {
    return null;
  }

  return (
    <div
      className={`relative ${variant === "toast"
        ? isSlideOut
          ? "animate-[slide-out-left_0.3s_ease-out]"
          : "animate-[slide-in-left_0.3s_ease-out]"
        : ""
        }`}
      onMouseEnter={() => variant === "toast" && setIsHovered(true)}
      onMouseLeave={() => variant === "toast" && setIsHovered(false)}
    >
      <div className="bg-[rgba(255,255,255,0.8)] backdrop-blur-md rounded-3xl shadow-[0_0_16px_rgba(0,0,0,0.16)] border border-white w-[560px] p-5 relative z-10 flex flex-row items-center justify-between gap-10">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-rounded-bold text-[17px]">Getting Started</p>
            <div className="flex items-center gap-2">
              <p className="font-rounded-heavy text-[17px]">
                {completedSteps}
                <span className="text-[12px] font-rounded-semibold">
                  /{totalSteps}
                </span>
              </p>
              <CircularProgressBar
                progress={percentage}
                size={22}
                strokeWidth={4}
              />
            </div>
          </div>

          <ul className="mt-3">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className="flex items-center gap-0 text-[14px] leading-6 font-rounded-semibold mb-2 cursor-default"
                onMouseEnter={() => {
                  setHoveredIndex(index);
                  setDisplayedIndex(index);
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  setDisplayedIndex(
                    firstIncompleteIndex !== -1 ? firstIncompleteIndex : 0
                  );
                }}
              >
                <div className="w-8 relative">
                  {step.isCompleted &&
                    !(variant === "toast" && celebratingStepId === step.id) ? (
                    // Completed tick (always shown for completed steps)
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22.9055 12.1848C22.9055 18.1543 17.9695 23.0903 11.9895 23.0903C6.01992 23.0903 1.08398 18.1543 1.08398 12.1848C1.08398 6.21524 6.00937 1.2793 11.9789 1.2793C17.959 1.2793 22.9055 6.21524 22.9055 12.1848Z"
                        fill="#E6F7FF"
                        stroke="#E6F7FF"
                        strokeWidth="2"
                      />
                      <path
                        d="M11.7575 16.3618C11.536 16.7098 11.2091 16.8996 10.8188 16.8996C10.4286 16.8996 10.1228 16.7309 9.83798 16.3723L7.34892 13.3453C7.16963 13.1132 7.07471 12.8813 7.07471 12.6281C7.07471 12.1008 7.48603 11.6789 8.01337 11.6789C8.31924 11.6789 8.57235 11.7949 8.82548 12.1219L10.7872 14.6004L14.9849 7.90312C15.2064 7.54453 15.4911 7.36523 15.8076 7.36523C16.3137 7.36523 16.7778 7.71327 16.7778 8.24062C16.7778 8.4832 16.6619 8.73632 16.5141 8.9578L11.7575 16.3618Z"
                        fill="#06B0FF"
                      />
                    </svg>
                  ) : (
                    // Incomplete dotted circle
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22.9055 12.1848C22.9055 18.1543 17.9695 23.0903 11.9895 23.0903C6.01992 23.0903 1.08398 18.1543 1.08398 12.1848C1.08398 6.21524 6.00937 1.2793 11.9789 1.2793C17.959 1.2793 22.9055 6.21524 22.9055 12.1848Z"
                        stroke="#06B0FF"
                        opacity="0.3"
                        strokeWidth="2"
                        strokeDasharray="3 4"
                      />
                    </svg>
                  )}
                  {/* Celebration tick animation overlay */}
                  {variant === "toast" &&
                    celebratingStepId === step.id &&
                    step.isCompleted && (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute top-0 left-0"
                      >
                        <path
                          d="M22.9055 12.1848C22.9055 18.1543 17.9695 23.0903 11.9895 23.0903C6.01992 23.0903 1.08398 18.1543 1.08398 12.1848C1.08398 6.21524 6.00937 1.2793 11.9789 1.2793C17.959 1.2793 22.9055 6.21524 22.9055 12.1848Z"
                          fill="#E6F7FF"
                          className="animate-[tick-circle-fade-in_0.3s_ease-out_0.7s_both]"
                        />
                        <path
                          d="M11.7575 16.3618C11.536 16.7098 11.2091 16.8996 10.8188 16.8996C10.4286 16.8996 10.1228 16.7309 9.83798 16.3723L7.34892 13.3453C7.16963 13.1132 7.07471 12.8813 7.07471 12.6281C7.07471 12.1008 7.48603 11.6789 8.01337 11.6789C8.31924 11.6789 8.57235 11.7949 8.82548 12.1219L10.7872 14.6004L14.9849 7.90312C15.2064 7.54453 15.4911 7.36523 15.8076 7.36523C16.3137 7.36523 16.7778 7.71327 16.7778 8.24062C16.7778 8.4832 16.6619 8.73632 16.5141 8.9578L11.7575 16.3618Z"
                          fill="#06B0FF"
                          className="animate-[tick-path-scale-in_0.3s_ease-out_0.7s_both] origin-center"
                        />
                      </svg>
                    )}
                </div>
                <span
                  className={`relative inline-block ${variant === "toast" && celebratingStepId === step.id
                    ? "transition-opacity duration-300 ease-out"
                    : "transition-all duration-300 ease-out"
                    } ${variant === "toast" && celebratingStepId === step.id
                      ? `${showNextStep ? "opacity-0" : "opacity-100"} text-black`
                      : hoveredIndex !== null && index === hoveredIndex
                        ? "opacity-100 text-black"
                        : getStepOpacity(index)
                    } ${variant === "toast" && celebratingStepId === step.id && showCelebrationStrikethrough
                      ? "line-through"
                      : step.isCompleted && celebratingStepId !== step.id
                        ? "line-through"
                        : ""
                    }`}
                >
                  {step.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col self-stretch justify-center bg-[#F2F2F7] rounded-[12px] flex-1 items-center overflow-hidden">
          {INDEX_IMAGE_MAP[displayedIndex] ? (
            <img
              src={INDEX_IMAGE_MAP[displayedIndex]}
              alt={`Step ${displayedIndex}`}
              className="w-full h-full object-contain rounded-[8px]"
            />
          ) : (
            <span className="font-rounded-bold text-[24px]">{displayedIndex}</span>
          )}
        </div>

        {(variant === "toast") && (
          <div 
            className="self-stretch flex flex-col justify-start items-start -ml-8 -mr-2 cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => {
              if (variant === "toast") {
                // Clear any existing timers
                if (hideTimerRef.current) {
                  clearTimeout(hideTimerRef.current);
                  hideTimerRef.current = null;
                }
                if (celebrationTimerRef.current) {
                  clearTimeout(celebrationTimerRef.current);
                  celebrationTimerRef.current = null;
                }
                // Dismiss immediately
                setIsVisible(false);
                setIsSlideOut(false);
              }
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.31361 17.9346C7.94447 18.3037 7.92689 18.9629 8.3224 19.3408C8.70033 19.7363 9.3683 19.7188 9.73744 19.3496L14.0001 15.0869L18.2628 19.3496C18.6408 19.7275 19.2911 19.7363 19.6691 19.3408C20.0646 18.9629 20.0558 18.3037 19.6779 17.9258L15.4152 13.6631L19.6779 9.40918C20.0558 9.02246 20.0646 8.37207 19.6691 7.99414C19.2911 7.59863 18.6408 7.60742 18.2628 7.98535L14.0001 12.248L9.73744 7.98535C9.3683 7.61621 8.70033 7.59863 8.3224 7.99414C7.92689 8.37207 7.94447 9.03125 8.31361 9.40039L12.5763 13.6631L8.31361 17.9346Z" fill="#1C1C1E" />
            </svg>
          </div>
        )
        }

      </div>

      {!hideTail && (
        <>
          {/* Pointer notch (SVG, no shadow) */}
          {/* Shadow arrow behind the card */}
          <svg
            width="25"
            height="21"
            viewBox="0 0 25 21"
            xmlns="http://www.w3.org/2000/svg"
            className={`absolute -bottom-[10px] select-none pointer-events-none drop-shadow-md z-0 ${arrowClassName ? arrowClassName : "left-1/2 -translate-x-1/2"
              }`}
          >
            <path
              d="M12.1445 20.4063C11.1495 20.4063 10.154 19.9373 9.59863 19.0107L0.504881 4.05762C0.250405 3.63172 0.123118 3.17377 0.123045 2.72656C0.123045 1.22484 1.27986 2.99583e-05 3.07324 1.84501e-06L21.2275 2.57914e-07C23.0208 0.000118327 24.1777 1.22489 24.1777 2.72656C24.1777 3.17376 24.0387 3.62107 23.7842 4.05762L14.7012 19.0107C14.1458 19.9373 13.1396 20.4062 12.1445 20.4063Z"
              fill="white"
            />
          </svg>

          {/* Crisp arrow above the card (no shadow) */}
          <svg
            width="25"
            height="21"
            viewBox="0 0 25 21"
            xmlns="http://www.w3.org/2000/svg"
            className={`absolute -bottom-[10px] select-none pointer-events-none z-20 ${arrowClassName ? arrowClassName : "left-1/2 -translate-x-1/2"
              }`}
          >
            <path
              d="M12.1445 20.4063C11.1495 20.4063 10.154 19.9373 9.59863 19.0107L0.504881 4.05762C0.250405 3.63172 0.123118 3.17377 0.123045 2.72656C0.123045 1.22484 1.27986 2.99583e-05 3.07324 1.84501e-06L21.2275 2.57914e-07C23.0208 0.000118327 24.1777 1.22489 24.1777 2.72656C24.1777 3.17376 24.0387 3.62107 23.7842 4.05762L14.7012 19.0107C14.1458 19.9373 13.1396 20.4062 12.1445 20.4063Z"
              fill="white"
            />
          </svg>
        </>
      )}
    </div>
  );
}
