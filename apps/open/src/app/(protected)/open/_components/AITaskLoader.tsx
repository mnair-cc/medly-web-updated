"use client";

import type { AITask } from "../_types/aiTask";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import Spinner from "@/app/_components/Spinner";

interface AITaskLoaderProps {
  task: AITask;
  onDismiss: () => void;
  onUndo: () => Promise<void>;
}

export default function AITaskLoader({
  task,
  onDismiss,
  onUndo,
}: AITaskLoaderProps) {
  const { track } = useTracking();

  const handleFeedback = (type: "positive" | "negative") => {
    track("ai_task_feedback", {
      task_label: task.label,
      feedback_type: type,
    });
  };

  const handleUndo = async () => {
    await onUndo();
  };

  // Loading state - matches Image 1
  if (task.status === "running") {
    return (
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1300] flex items-center gap-4 px-5 py-4 bg-white rounded-2xl"
        style={{
          boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
          minWidth: 280,
        }}
      >
        <Spinner size="small" />
        <span className="font-rounded-bold text-[15px] text-[#1C1C1E]">
          {task.label}...
        </span>
        {task.progress && (
          <span className="text-[15px] text-[#8E8E93] ml-auto">
            {task.progress.current} of {task.progress.total}
          </span>
        )}
      </div>
    );
  }

  // Error state
  if (task.status === "error") {
    return (
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1300] flex flex-col bg-white rounded-2xl"
        style={{
          boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
          minWidth: 320,
        }}
      >
        {/* Top row */}
        <div className="flex items-center gap-3 px-5 py-4">
          {/* Red X icon */}
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 3L3 9M3 3L9 9"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span className="font-rounded-bold text-[15px] text-[#1C1C1E]">
            {task.error || "Something went wrong"}
          </span>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="ml-auto text-[#C7C7CC] hover:text-[#8E8E93] transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Done state - matches Image 2
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1300] flex flex-col bg-white rounded-2xl"
      style={{
        boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
        minWidth: 320,
      }}
    >
      {/* Top row: Checkmark, Done!, X */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Green checkmark circle */}
        <div className="w-6 h-6 rounded-full bg-[#34C759] flex items-center justify-center flex-shrink-0">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 7L6 10L11 4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <span className="font-rounded-bold text-[15px] text-[#1C1C1E]">
          Done!
        </span>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="ml-auto text-[#C7C7CC] hover:text-[#8E8E93] transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 5L5 15M5 5L15 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Horizontal divider */}
      <div className="h-px bg-[#E5E5EA] mx-5" />

      {/* Bottom row: Thoughts?, thumbs, Undo */}
      <div className="flex items-center gap-3 px-5 py-3">
        <span className="text-[14px] text-[#8E8E93]">Thoughts?</span>

        {/* Thumbs up */}
        <button
          onClick={() => handleFeedback("positive")}
          className="text-[#C7C7CC] hover:text-[#34C759] transition-colors"
          aria-label="Good result"
        >
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.46387 16.9854C4.46387 20.0879 6.4502 22.6279 8.99902 22.6279H11.8906C13.0771 23.2344 14.4834 23.5859 16.0303 23.5859H17.2607C18.4033 23.5859 19.3789 23.5156 20.0117 23.3574C21.3037 23.0322 22.1211 22.1182 22.1211 20.9668C22.1211 20.7559 22.0947 20.5713 22.0332 20.3779C22.6396 19.9121 22.9824 19.2178 22.9824 18.4619C22.9824 18.1104 22.9121 17.7676 22.7891 17.4775C23.1934 17.0469 23.4307 16.4316 23.4307 15.79C23.4307 15.3594 23.3252 14.9375 23.1494 14.6035C23.3955 14.2256 23.5361 13.7246 23.5361 13.1797C23.5361 11.7734 22.4639 10.6924 21.0752 10.6924H17.8057C17.6211 10.6924 17.498 10.6045 17.5068 10.4375C17.5508 9.52344 18.9746 7.35254 18.9746 5.56836C18.9746 4.25879 18.0518 3.30078 16.7773 3.30078C15.8545 3.30078 15.2217 3.78418 14.6152 4.93555C13.5254 7.04492 12.1982 8.89062 10.2383 11.2988H8.66504C6.27441 11.2988 4.46387 13.8301 4.46387 16.9854ZM9.93945 16.915C9.93945 15.0518 10.3525 13.8564 11.5479 12.2656C12.875 10.4814 14.7207 8.3457 16.0479 5.69141C16.3291 5.1377 16.5225 4.99707 16.8037 4.99707C17.1377 4.99707 17.3574 5.24316 17.3574 5.66504C17.3574 6.96582 15.8633 9.14551 15.8633 10.5693C15.8633 11.6328 16.7158 12.3096 17.876 12.3096H21.0312C21.541 12.3096 21.9189 12.6963 21.9189 13.2061C21.9189 13.5664 21.8047 13.8037 21.4971 14.1025C21.2686 14.3311 21.2334 14.665 21.4355 14.9023C21.6904 15.2539 21.7959 15.4912 21.7959 15.79C21.7959 16.1504 21.6289 16.458 21.2773 16.7129C20.9785 16.9326 20.873 17.2842 21.0488 17.6357C21.2334 17.9961 21.3301 18.1719 21.3301 18.4531C21.3301 18.875 21.0576 19.1914 20.5127 19.4814C20.2227 19.6396 20.1436 19.9561 20.2666 20.2285C20.4512 20.6768 20.4775 20.7646 20.4688 20.958C20.4688 21.3359 20.1963 21.6348 19.6074 21.7842C19.0889 21.9072 18.2627 21.9688 17.1729 21.96L16.0391 21.9512C12.4004 21.916 9.93945 19.8682 9.93945 16.915ZM6.06348 16.9854C6.06348 14.7529 7.20605 12.9688 8.52441 12.9072C8.75293 12.9072 8.98145 12.9072 9.20996 12.9072C8.58594 14.1201 8.31348 15.3945 8.31348 16.915C8.31348 18.5322 8.87598 19.9561 9.9043 21.0635C9.5791 21.0635 9.23633 21.0635 8.90234 21.0635C7.36426 21.002 6.06348 19.1914 6.06348 16.9854Z"
              fill="currentColor" />
          </svg>
        </button>

        {/* Thumbs down */}
        <button
          onClick={() => handleFeedback("negative")}
          className="text-[#C7C7CC] hover:text-[#FF3B30] transition-colors"
          aria-label="Bad result"
        >
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.5361 10.9297C23.5361 7.82715 21.5498 5.28711 19.001 5.28711H16.1094C14.9229 4.68066 13.5166 4.3291 11.9697 4.3291H10.7393C9.59668 4.3291 8.62109 4.39941 7.98828 4.55762C6.69629 4.87402 5.87891 5.79688 5.87891 6.94824C5.87891 7.15039 5.91406 7.34375 5.9668 7.52832C5.36035 8.00293 5.01758 8.68848 5.01758 9.44434C5.01758 9.7959 5.08789 10.1387 5.21094 10.4287C4.80664 10.8594 4.56934 11.4834 4.56934 12.125C4.56934 12.5469 4.6748 12.9775 4.85059 13.3115C4.60449 13.6807 4.46387 14.1816 4.46387 14.7354C4.46387 16.1416 5.53613 17.2227 6.9248 17.2227H10.1943C10.3789 17.2227 10.502 17.3105 10.4932 17.4775C10.4492 18.3828 9.02539 20.5625 9.02539 22.3467C9.02539 23.6562 9.94824 24.6143 11.2227 24.6143C12.1455 24.6143 12.7783 24.1309 13.3848 22.9795C14.4834 20.8701 15.8018 19.0244 17.7617 16.6074H19.335C21.7256 16.6074 23.5361 14.085 23.5361 10.9297ZM18.0605 11C18.0605 12.8633 17.6475 14.0498 16.4521 15.6494C15.125 17.4248 13.2793 19.5693 11.9521 22.2236C11.6709 22.7773 11.4775 22.9092 11.2051 22.9092C10.8711 22.9092 10.6514 22.6719 10.6514 22.25C10.6514 20.9492 12.1367 18.7695 12.1367 17.3369C12.1367 16.2822 11.2842 15.5967 10.124 15.5967H6.96875C6.45898 15.5967 6.08105 15.2188 6.08105 14.709C6.08105 14.3486 6.2041 14.1113 6.50293 13.8125C6.73145 13.5752 6.7666 13.2412 6.56445 13.0127C6.30957 12.6523 6.2041 12.4238 6.2041 12.125C6.2041 11.7646 6.37109 11.457 6.72266 11.1934C7.02148 10.9824 7.12695 10.6221 6.95117 10.2705C6.7666 9.91895 6.66992 9.73438 6.66992 9.46191C6.66992 9.04004 6.94238 8.71484 7.4873 8.4248C7.77734 8.2666 7.85645 7.95898 7.7334 7.67773C7.54883 7.22949 7.52246 7.15039 7.53125 6.95703C7.53125 6.5791 7.80371 6.28027 8.39258 6.13086C8.91113 5.99902 9.7373 5.94629 10.8271 5.95508L11.9609 5.96387C15.5996 5.99902 18.0605 8.03809 18.0605 11ZM21.9453 10.9297C21.9453 13.1621 20.7939 14.9463 19.4756 14.999C19.2471 15.0078 19.0186 15.0078 18.79 15.0078C19.4141 13.7861 19.6865 12.5205 19.6865 11C19.6865 9.38281 19.124 7.95898 18.1045 6.84277C18.4297 6.84277 18.7637 6.85156 19.0977 6.85156C20.6357 6.91309 21.9453 8.71484 21.9453 10.9297Z" 
            fill="currentColor" />
          </svg>

        </button>

        {/* Undo button - right aligned */}
        <button
          onClick={handleUndo}
          disabled={!task.undoCallback}
          className={`ml-auto font-rounded-bold text-[14px] transition-colors ${task.undoCallback
            ? "text-[#007AFF] hover:text-[#0056B3]"
            : "text-[#C7C7CC] cursor-not-allowed"
            }`}
        >
          Undo
        </button>
      </div>
    </div>
  );
}
