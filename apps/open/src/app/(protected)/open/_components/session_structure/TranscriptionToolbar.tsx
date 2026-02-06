import {
  TranscriptionChunk,
  useTranscription,
} from "@/app/(protected)/open/_hooks/useTranscription";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import MOTooltip from "@/app/(protected)/open/_components/MOTooltip";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TRANSCRIBE_STORAGE_KEY = "open_transcribe_clicked";
const TRANSCRIBE_TUTORIAL_IMAGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fopen%2Ftranscribe_tutorial.png?alt=media&token=94d99ac1-5607-4910-bf9a-90fc3d966568";

interface TranscriptionToolbarProps {
  /** Optional list of lines (already broken). New lines should be appended at the end. */
  lines?: string[];
  /** Number of visible lines in the viewport (default 3). */
  maxLines?: number;
  /** Tailwind width class for the text container (e.g. w-20). */
  width?: string;
  /** Demo mode: auto-play a paragraph into lines. */
  demoMode?: boolean;
  /** Delay between new lines in demo mode (ms). */
  demoDelay?: number;
  /** Timer text to display (e.g. "0:00"). If not provided, timer is hidden. */
  timerText?: string;
  /** Click handler for the toolbar (optional, defaults to transcription toggle) */
  onClick?: (e: React.MouseEvent) => void;
  /** Callback when transcription changes */
  onTranscriptionChange?: (
    currentText: string,
    transcriptChunks: TranscriptionChunk[],
    isRecording: boolean,
  ) => void;
  /** Initial transcript chunks to continue from (persisted value) */
  initialTranscription?: TranscriptionChunk[];
}

export default function TranscriptionToolbar({
  lines: externalLines,
  maxLines = 3,
  width = "w-20",
  demoMode = false,
  demoDelay = 1200,
  timerText: externalTimerText,
  onClick: externalOnClick,
  onTranscriptionChange,
  initialTranscription,
}: TranscriptionToolbarProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarElement, setToolbarElement] = useState<HTMLElement | null>(null);

  // Update toolbarElement when ref is set
  useEffect(() => {
    if (toolbarRef.current) {
      setToolbarElement(toolbarRef.current);
    }
  }, []);
  const { track } = useTracking();

  // Use initial transcription chunks directly
  const initialChunks = useMemo(() => {
    return initialTranscription || [];
  }, [initialTranscription]);

  // Transcription hook
  const {
    isRecording,
    currentText,
    transcriptChunks,
    startTranscription,
    stopTranscription,
    elapsedTime,
  } = useTranscription(initialChunks);

  // Use a ref to store the callback to avoid infinite loops
  const onTranscriptionChangeRef = useRef(onTranscriptionChange);
  useEffect(() => {
    onTranscriptionChangeRef.current = onTranscriptionChange;
  }, [onTranscriptionChange]);

  // Notify parent when transcription changes
  useEffect(() => {
    if (onTranscriptionChangeRef.current) {
      onTranscriptionChangeRef.current(
        currentText,
        transcriptChunks,
        isRecording,
      );
    }
  }, [currentText, transcriptChunks, isRecording]);

  // Compute full accumulated transcript for display
  const fullTranscript = useMemo(() => {
    const historyText = transcriptChunks.map((chunk) => chunk.text).join(" ");
    const fullText = historyText
      ? `${historyText} ${currentText}`.trim()
      : currentText;
    return fullText;
  }, [transcriptChunks, currentText]);

  // Format elapsed time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Determine which lines to use:
  // - If demo mode or external lines explicitly provided, use external lines
  // - Otherwise, feed the internal queue directly from transcription deltas
  const lines =
    demoMode || externalLines !== undefined ? externalLines || [] : [];

  // Determine timer text:
  // - Use external timer text if provided
  // - Otherwise, show timer when recording
  const timerText =
    externalTimerText !== undefined
      ? externalTimerText
      : isRecording
        ? formatTime(elapsedTime)
        : undefined;

  // Handle toolbar click: toggle transcript view
  const handleToolbarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShowTranscript(!isShowTranscript);
  };

  // Mark transcribe as clicked in localStorage (for tooltip)
  const markTranscribeClicked = useCallback(() => {
    try {
      localStorage.setItem(TRANSCRIBE_STORAGE_KEY, "true");
    } catch {
      // no-op
    }
  }, []);

  // Handle icon click: toggle transcription recording
  const handleIconClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Mark as clicked to dismiss tooltip permanently
    markTranscribeClicked();

    if (externalOnClick) {
      externalOnClick(e);
    } else if (!demoMode) {
      // Toggle transcription
      if (isRecording) {
        track("transcription_ended", { duration_seconds: elapsedTime });
        stopTranscription();
      } else {
        track("transcription_started");
        await startTranscription();
      }
    }
  };

  // Four-row buffer: first three are visible, fourth sits just below to scroll in
  const [buffer, setBuffer] = useState<string[]>(() =>
    new Array(maxLines + 1).fill(""),
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [translatePct, setTranslatePct] = useState(0);

  // Incoming queue so we never drop lines during animation
  const pendingQueueRef = useRef<string[]>([]);
  const postBufferRef = useRef<string[] | null>(null);
  const idleScrollTimerRef = useRef<number | null>(null);

  // Recompute row shift percent: one row = 1 / (maxLines + 1) of track height
  const rowShiftPct = useMemo(() => 100 / (maxLines + 1), [maxLines]);

  // Builder state for subtitle-style streaming (working mode)
  const processedHistoryCountRef = useRef<number>(0);
  const lastCurrentTextRef = useRef<string>("");
  const lineBuilderRef = useRef<string>("");
  const [previewLine, setPreviewLine] = useState<string>("");
  const previewStartTimeRef = useRef<number | null>(null);
  const previewFlushTimerRef = useRef<number | null>(null);
  const previewLastUpdateAtRef = useRef<number | null>(null);

  // Timing configuration (adaptive)
  const CHARS_PER_SECOND = 15; // ~15 cps
  const MIN_FLUSH_MS = 800; // lower bound for readability
  const MAX_FLUSH_MS = 4000; // upper bound as requested
  const MIN_CHARS_FOR_TIMEOUT_FLUSH = 10; // guard tiny fragments unless punctuated

  const getContainerWidth = (): number => {
    return viewportRef.current?.offsetWidth || 300;
  };

  // Append text to builder, wrap into visual lines, enqueue full lines; keep leftover as preview
  const appendAndConsume = (text: string) => {
    if (!text) return;
    const containerWidth = getContainerWidth();
    const combined = (lineBuilderRef.current || "") + text;
    const parts = breakTextIntoLines(combined, containerWidth);
    if (parts.length === 0) return;
    const fullLines = parts.slice(0, -1);
    const partial = parts[parts.length - 1] || "";
    if (fullLines.length) enqueue(fullLines);
    lineBuilderRef.current = partial;
    setPreviewLine(partial);

    // Update timers for adaptive flush
    const now = Date.now();
    if (previewStartTimeRef.current == null || fullLines.length > 0) {
      // Start timing a new preview line (or after a full line was emitted)
      previewStartTimeRef.current = now;
    }
    previewLastUpdateAtRef.current = now;
    schedulePreviewFlush();
  };

  const clearPreviewFlushTimer = () => {
    if (previewFlushTimerRef.current != null) {
      window.clearTimeout(previewFlushTimerRef.current);
      previewFlushTimerRef.current = null;
    }
  };

  const schedulePreviewFlush = () => {
    clearPreviewFlushTimer();
    const currentPreview = lineBuilderRef.current || "";
    if (!currentPreview) return; // nothing to flush yet
    const start = previewStartTimeRef.current ?? Date.now();
    const targetMs = Math.min(
      Math.max(
        Math.round((currentPreview.length / CHARS_PER_SECOND) * 1000),
        MIN_FLUSH_MS,
      ),
      MAX_FLUSH_MS,
    );
    const fireAt = start + targetMs;
    const delay = Math.max(fireAt - Date.now(), 0);
    previewFlushTimerRef.current = window.setTimeout(() => {
      // Decide if we should flush tiny fragments
      const latest = lineBuilderRef.current || "";
      const endsWithPunct = /[\.!?;:,]$/.test(latest.trim());
      if (
        latest.length >= MIN_CHARS_FOR_TIMEOUT_FLUSH ||
        endsWithPunct ||
        Date.now() - start >= MAX_FLUSH_MS
      ) {
        finalizePreviewLine();
      } else {
        // Defer slightly, but respect MAX cap implicitly via next schedule
        previewLastUpdateAtRef.current = Date.now();
        schedulePreviewFlush();
      }
    }, delay);
  };

  const finalizePreviewLine = () => {
    const latest = lineBuilderRef.current || "";
    if (!latest) return;
    enqueue([latest]);
    lineBuilderRef.current = "";
    setPreviewLine("");
    clearPreviewFlushTimer();
    previewStartTimeRef.current = null;
    previewLastUpdateAtRef.current = null;
  };

  // Utility: measure text width for wrapping
  const measureTextWidth = (text: string, font: string): number => {
    if (!measureCanvasRef.current) {
      measureCanvasRef.current = document.createElement("canvas");
    }
    const ctx = measureCanvasRef.current.getContext("2d");
    if (!ctx) return 0;
    ctx.font = font;
    return ctx.measureText(text).width;
  };

  const breakTextIntoLines = (
    text: string,
    containerWidth: number,
  ): string[] => {
    if (!viewportRef.current) return [text];
    const computedStyle = window.getComputedStyle(viewportRef.current);
    const font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;

    const words = text.split(" ");
    const out: string[] = [];
    let current = "";
    for (const w of words) {
      const test = current ? current + " " + w : w;
      const width = measureTextWidth(test, font);
      if (width > containerWidth && current) {
        out.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) out.push(current);
    return out;
  };

  // Feed management ----------------------------------------------------------
  const prevProcessedRef = useRef<string[]>([]);
  const enqueue = (newLines: string[]) => {
    if (!newLines.length) return;
    pendingQueueRef.current.push(...newLines);
    startIfIdle();
  };

  const startIfIdle = () => {
    if (isAnimating) return;
    const next = pendingQueueRef.current.shift();
    if (!next) return;

    // Stage next as bottom row in buffer, then animate up by one row
    let computedNextBuffer: string[] = [];
    let computedPostBuffer: string[] = [];
    setBuffer((prev) => {
      const nextBuffer = prev.slice(0, maxLines);
      nextBuffer.push(next);
      while (nextBuffer.length < maxLines + 1) nextBuffer.push("");
      computedNextBuffer = nextBuffer;
      computedPostBuffer = [...nextBuffer.slice(1), ""];
      postBufferRef.current = computedPostBuffer;
      return nextBuffer;
    });

    // Kick animation on next frame
    requestAnimationFrame(() => {
      setIsAnimating(true);
      requestAnimationFrame(() => setTranslatePct(-rowShiftPct));
    });
  };

  // Force a scroll upward with a provided next string (e.g., "" for idle vanish)
  const startScrollWithNext = (next: string) => {
    if (isAnimating) return;

    let computedNextBuffer: string[] = [];
    let computedPostBuffer: string[] = [];
    setBuffer((prev) => {
      const nextBuffer = prev.slice(0, maxLines);
      nextBuffer.push(next);
      while (nextBuffer.length < maxLines + 1) nextBuffer.push("");
      computedNextBuffer = nextBuffer;
      computedPostBuffer = [...nextBuffer.slice(1), ""];
      postBufferRef.current = computedPostBuffer;
      return nextBuffer;
    });

    requestAnimationFrame(() => {
      setIsAnimating(true);
      requestAnimationFrame(() => setTranslatePct(-rowShiftPct));
    });
  };

  const handleTransitionEnd: React.TransitionEventHandler<HTMLDivElement> = (
    e,
  ) => {
    if (e.propertyName !== "transform") return;
    if (!isAnimating) return;
    // End of scroll: swap content and reset transform with transition disabled
    setIsAnimating(false);
    const post = postBufferRef.current;
    if (post) {
      setBuffer(post);
    }
    setTranslatePct(0);
    // Try to start next pending item after the reset
    requestAnimationFrame(() => startIfIdle());
  };

  // Continuously process queue when idle (ensures queue flows even without new text)
  useEffect(() => {
    if (demoMode) return;

    // Use a small interval to check queue status and process if idle
    const checkInterval = setInterval(() => {
      if (!isAnimating && pendingQueueRef.current.length > 0) {
        startIfIdle();
      }
    }, 20);

    return () => clearInterval(checkInterval);
  }, [isAnimating, demoMode]);

  // Demo mode: create lines and enqueue with interval
  useEffect(() => {
    if (!demoMode) return;
    if (!viewportRef.current) return;

    const paragraph =
      "This is an example of a longer paragraph flowing like subtitles. Each line appears at the bottom and scrolls upward smoothly, just like live captions on a video call.";
    const containerWidth = viewportRef.current.offsetWidth;
    const chunks = breakTextIntoLines(paragraph, containerWidth);

    let i = 0;
    const tick = () => {
      enqueue([chunks[i]]);
      i = (i + 1) % chunks.length;
    };
    tick();
    const id = window.setInterval(tick, demoDelay);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, demoDelay, maxLines]);

  // Non-demo: watch props.lines and enqueue only new items (already broken)
  useEffect(() => {
    if (demoMode) return;
    const prev = prevProcessedRef.current;
    const newcomers = lines.slice(prev.length);
    if (newcomers.length) enqueue(newcomers);
    prevProcessedRef.current = lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  // Working mode: live consumption of currentText deltas into full lines
  useEffect(() => {
    if (demoMode) return; // demo handled separately

    const prev = lastCurrentTextRef.current || "";
    const curr = currentText || "";

    let suffix = "";
    if (curr.startsWith(prev)) {
      suffix = curr.slice(prev.length);
    } else if (prev && curr.length > 0) {
      // Fallback: find last occurrence of prev and take the remainder; else take curr
      const idx = curr.lastIndexOf(prev);
      suffix = idx >= 0 ? curr.slice(idx + prev.length) : curr;
    } else if (!prev && curr) {
      suffix = curr;
    }

    if (suffix) {
      appendAndConsume(suffix);
    }

    // Update ref after processing
    lastCurrentTextRef.current = curr;
  }, [currentText, demoMode]);

  // Track finalized segments arriving in history; avoid duplicating content by not enqueueing them again.
  // We still reset our pointer for informational purposes.
  useEffect(() => {
    if (demoMode) return;
    processedHistoryCountRef.current = transcriptChunks.length;
    // If the currentText was cleared (finalization), keep preview as-is; do not force scroll.
  }, [transcriptChunks.length, demoMode]);

  // Keep bottom row showing the current preview (no overlay), when idle
  useEffect(() => {
    if (demoMode) return;
    if (isAnimating) return;
    if (pendingQueueRef.current.length > 0) return;
    setBuffer((prev) => {
      const next = prev.slice();
      // Ensure the bottom slot reflects the preview content (opacity handles empty)
      next[next.length - 1] = previewLine || "";
      return next;
    });
  }, [previewLine, isAnimating, demoMode]);

  const clearIdleScrollTimer = () => {
    if (idleScrollTimerRef.current != null) {
      window.clearTimeout(idleScrollTimerRef.current);
      idleScrollTimerRef.current = null;
    }
  };

  // Schedule idle scroll to make lines disappear after a delay when no new lines arrive
  useEffect(() => {
    if (demoMode) return;
    clearIdleScrollTimer();

    // If there are no pending lines, no animation in progress, preview is empty,
    // and there are visible lines, schedule a scroll to remove the top line.
    const hasVisible = buffer.some((b) => !!b);
    const hasPending = pendingQueueRef.current.length > 0;
    if (!isAnimating && !hasPending && !previewLine && hasVisible) {
      idleScrollTimerRef.current = window.setTimeout(() => {
        startScrollWithNext("");
      }, 2000);
    }

    return () => clearIdleScrollTimer();
  }, [buffer, previewLine, isAnimating, demoMode]);

  // Reset state when transcription stops or starts
  useEffect(() => {
    if (!isRecording) {
      // Clear all working state when transcription stops
      clearPreviewFlushTimer();
      clearIdleScrollTimer();
      lineBuilderRef.current = "";
      setPreviewLine("");
      previewStartTimeRef.current = null;
      previewLastUpdateAtRef.current = null;
      // Don't reset lastCurrentTextRef - keep accumulated reference for appending
      // lastCurrentTextRef.current = "";
      processedHistoryCountRef.current = 0;
      pendingQueueRef.current = [];

      // Reset buffer to empty state
      setBuffer(new Array(maxLines + 1).fill(""));
      setIsAnimating(false);
      setTranslatePct(0);
    }
  }, [isRecording, maxLines]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPreviewFlushTimer();
      clearIdleScrollTimer();
    };
  }, []);

  // Initialize buffer with last three lines (or blanks)
  useEffect(() => {
    const lastThree = lines.slice(-maxLines);
    const init = [...lastThree, ""];
    while (init.length < maxLines + 1) init.unshift("");
    setBuffer(init.slice(-(maxLines + 1)));
    setTranslatePct(0);
    setIsAnimating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxLines]);

  // Layout values ------------------------------------------------------------
  const trackHeightPct = useMemo(
    () => ((maxLines + 1) / maxLines) * 100,
    [maxLines],
  );
  const rowHeightPct = useMemo(() => 100 / (maxLines + 1), [maxLines]);

  const [isShowTranscript, setIsShowTranscript] = useState(false);

  // Auto-scroll to bottom when transcript view is open and content changes
  useEffect(() => {
    if (isShowTranscript && transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop =
        transcriptScrollRef.current.scrollHeight;
    }
  }, [isShowTranscript, fullTranscript]);

  // Tooltip steps for transcribe tutorial
  const transcribeTooltipSteps = useMemo(
    () => [
      {
        id: "transcribe-tutorial",
        title: "Click to Start Recording Lecture",
        description:
          "Free up your mind to focus on understanding, not note-taking.",
        imageUrl: TRANSCRIBE_TUTORIAL_IMAGE_URL,
        hideButton: true,
        isFinal: true,
      },
    ],
    [],
  );

  return (
    <>
      <motion.div
        ref={toolbarRef}
        className={`flex ${isShowTranscript ? "flex-col" : "gap-1"} backdrop-blur-xl border-white bg-[rgba(255,255,255,0.8)] rounded-[18px] shadow-[0_1px_4px_rgba(0,0,0,0.15)] canvas-toolbar pointer-events-auto overflow-hidden pl-4 pr-4 py-2`}
        style={{ transformOrigin: "bottom center" }}
        animate={{
          width: isShowTranscript ? 400 : 180,
          height: isShowTranscript ? 240 : 52,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        onClick={handleToolbarClick}
      >
      <div className="w-full h-full">
        {isShowTranscript ? (
          // Expanded view
          <>
            {/* Header with close button and recording icon */}
            <div className="flex items-center justify-between py-2 px-1">
              <div className="text-[14px] font-rounded-bold">Transcript</div>
              <div className="flex items-center gap-2">
                {/* Recording icon */}
                {/* {isRecording ? (
                  <div
                    className="w-[32px] h-[32px] flex items-center justify-center cursor-pointer"
                    onClick={handleIconClick}
                  >
                    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="15.5714" cy="15.5714" r="8.57143" fill="#EF463C" />
                      <path d="M15.9923 32C24.7617 32 32 24.7582 32 16C32 7.24178 24.7463 0 15.9768 0C7.22281 0 0 7.24178 0 16C0 24.7582 7.23828 32 15.9923 32ZM10.146 20.2244V11.7602C10.146 10.7698 10.7801 10.1509 11.8163 10.1509H20.1527C21.189 10.1509 21.8231 10.7698 21.8231 11.7602V20.2244C21.8231 21.2302 21.189 21.8491 20.1527 21.8491H11.8163C10.7801 21.8491 10.146 21.2302 10.146 20.2244Z" fill="#FCDCDA" />
                    </svg>
                  </div>
                ) : (
                  <div
                    className="w-[32px] h-[32px] flex items-center justify-center cursor-pointer"
                    onClick={handleIconClick}
                  >
                    <div className="w-[24px] h-[24px] bg-[#06B0FF] rounded-full flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="13" y="6" width="2" height="16" rx="1" fill="white" />
                        <rect x="9" y="10" width="2" height="8" rx="1" fill="white" />
                        <rect x="17" y="10" width="2" height="8" rx="1" fill="white" />
                        <rect x="21" y="12" width="2" height="4" rx="1" fill="white" />
                        <rect x="5" y="12" width="2" height="4" rx="1" fill="white" />
                      </svg>
                    </div>
                  </div>
                )} */}
                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsShowTranscript(false);
                  }}
                  className="w-6 h-6 flex items-center justify-center cursor-pointer"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 1L11 11M1 11L11 1"
                      stroke="#666"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {/* Full transcript content */}
            <div
              ref={transcriptScrollRef}
              className="px-1 flex-1 overflow-y-auto text-[13px] font-rounded text-[#595959]/50 max-h-[180px]"
            >
              {fullTranscript ||
                "No transcript yet. Click the microphone icon to start recording."}
            </div>
          </>
        ) : (
          // Collapsed view
          <div
            className={`h-[36px] flex items-center w-full`}
            style={{
              cursor: externalOnClick || !demoMode ? "pointer" : "default",
            }}
          >
            {/* Transcription text display */}
            <div
              className={`flex items-center gap-1 flex-1 h-full relative font-rounded-bold text-[12px] overflow-hidden mr-2`}
            >
              {!isRecording && (
                <div className="leading-tight text-[14px]">
                  {transcriptChunks.length > 0 ? "Resume" : "Transcribe"}
                </div>
              )}
              {isRecording && (
                <div
                  className="relative w-full h-full overflow-hidden"
                  ref={viewportRef}
                >
                  <div
                    ref={trackRef}
                    className="flex flex-col w-full"
                    style={{
                      height: `${trackHeightPct}%`,
                      transform: `translateY(${translatePct}%)`,
                      transition: isAnimating
                        ? "transform 300ms ease-out"
                        : "none",
                    }}
                    onTransitionEnd={handleTransitionEnd}
                  >
                    {buffer.map((line, idx) => (
                      <div
                        key={`row-${idx}`}
                        className="w-full leading-tight"
                        style={{
                          height: `${rowHeightPct}%`,
                          display: "flex",
                          alignItems: "center",
                          opacity: line ? 1 : 0,
                        }}
                      >
                        <span className="w-full text-ellipsis overflow-hidden whitespace-nowrap">
                          {line}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(180deg, white 0%, transparent 100%)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Timer display */}
            {timerText !== undefined && (
              <div className="w-[30px] text-center text-[12px] font-rounded-bold text-[#FF383C]">
                {timerText}
              </div>
            )}

            {/* Recording icon */}
            {isRecording ? (
              <div
                className="w-[48px] h-[48px] flex items-center justify-center cursor-pointer -mr-3"
                onClick={handleIconClick}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="15.5714"
                    cy="15.5714"
                    r="8.57143"
                    fill="#EF463C"
                  />
                  <path
                    d="M15.9923 32C24.7617 32 32 24.7582 32 16C32 7.24178 24.7463 0 15.9768 0C7.22281 0 0 7.24178 0 16C0 24.7582 7.23828 32 15.9923 32ZM10.146 20.2244V11.7602C10.146 10.7698 10.7801 10.1509 11.8163 10.1509H20.1527C21.189 10.1509 21.8231 10.7698 21.8231 11.7602V20.2244C21.8231 21.2302 21.189 21.8491 20.1527 21.8491H11.8163C10.7801 21.8491 10.146 21.2302 10.146 20.2244Z"
                    fill="#FCDCDA"
                  />
                </svg>
              </div>
            ) : (
              <div
                className="w-[48px] h-[48px] flex items-center justify-center cursor-pointer -mr-3"
                onClick={handleIconClick}
              >
                <div className="w-[32px] h-[32px] bg-[#06B0FF] rounded-full flex items-center justify-center">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="13"
                      y="6"
                      width="2"
                      height="16"
                      rx="1"
                      fill={isRecording ? "white" : "white"}
                    />
                    <rect
                      x="9"
                      y="10"
                      width="2"
                      height="8"
                      rx="1"
                      fill={isRecording ? "white" : "white"}
                    />
                    <rect
                      x="17"
                      y="10"
                      width="2"
                      height="8"
                      rx="1"
                      fill={isRecording ? "white" : "white"}
                    />
                    <rect
                      x="21"
                      y="12"
                      width="2"
                      height="4"
                      rx="1"
                      fill={isRecording ? "white" : "white"}
                    />
                    <rect
                      x="5"
                      y="12"
                      width="2"
                      height="4"
                      rx="1"
                      fill={isRecording ? "white" : "white"}
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>

      {/* Transcribe tutorial tooltip - shows on hover if not clicked before */}
      {!isShowTranscript && !isRecording && toolbarElement && (
        <MOTooltip
          storageKey={TRANSCRIBE_STORAGE_KEY}
          steps={transcribeTooltipSteps}
          position="bottom"
          triggerMode="hover"
          anchorElement={toolbarElement}
        />
      )}
    </>
  );
}
