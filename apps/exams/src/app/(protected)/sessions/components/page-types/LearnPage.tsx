import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  LearnContent,
  LearnFlowBlock,
  LearnFlowProgress,
  InputMode,
  MockPage,
} from "../../types";
import { QuestionSessionPageType } from "../../types";
import TextBlock from "./learn-blocks/TextBlock";
import WorkedExampleBlock from "./learn-blocks/WorkedExampleBlock";
import QuestionBlock from "./learn-blocks/QuestionBlock";
import LearnBlockFooter from "./learn-blocks/LearnBlockFooter";
import { BlockProgress } from "../../types";
import { Canvas, CanvasMessage } from "@/app/types/types";
import SketchToolbar from "../footer/SketchToolbar";
import { useResponsive } from "@/app/_hooks/useResponsive";
import LockOverlay from "@/app/_components/LockOverlay";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import { useFeatureUsage } from "@/app/_hooks/useFeatureUsage";
import { useMedlyMondays } from "@/app/_hooks/useMedlyMondays";

const LearnPage = ({
  content,
  onCurrentBlockIndexChange,
  onWhyClick,
  onExplainClick,
  pages,
  handleSetCurrentPageIndex,
  lessonId,
  subjectId,
  initialLearnFlowProgress,
  updateBlockIndex,
  updateMcqAnswer,
  updateCanvas,
  markLearnFlowCompleted,
  // Note: inputMode/setInputMode props are ignored - we use local state
  // to isolate Learn flow from SessionStructure re-renders
  inputMode: _inputModeProp,
  setInputMode: _setInputModeProp,
  canvasMessage,
  isAwaitingResponse,
  handleSendMessageRef,
  isReadOnly,
  shimmerTextboxIndices = [],
  fadeInTextboxIndices = [],
  highlightedText = [],
}: {
  content: LearnContent;
  onCurrentBlockIndexChange?: (index: number) => void;
  onWhyClick?: () => void;
  onExplainClick?: (stepIndex: number, stepMath: string) => void;
  pages?: MockPage[];
  handleSetCurrentPageIndex?: (index: number) => void;
  lessonId?: string;
  subjectId?: string;
  initialLearnFlowProgress?: LearnFlowProgress | null;
  updateBlockIndex?: (index: number) => void;
  updateMcqAnswer?: (
    blockKey: string,
    userAnswer:
      | string
      | string[]
      | Record<string, string>
      | Record<string, string[]>
  ) => void;
  updateCanvas?: (blockKey: string, canvas: Canvas) => void;
  markLearnFlowCompleted?: () => void;
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
  canvasMessage?: CanvasMessage[] | undefined;
  isAwaitingResponse: boolean;
  handleSendMessageRef: React.MutableRefObject<
    ((message: string) => void) | null
  >;
  isReadOnly: boolean;
  shimmerTextboxIndices?: number[];
  fadeInTextboxIndices?: number[];
  highlightedText?: string[];
}) => {
  const learnData = content;
  const { isTouchScreen } = useResponsive();
  const { hasActivePlan } = useHasActivePlan();
  const { featureUsage } = useFeatureUsage();
  const { isSubjectUnlocked } = useMedlyMondays();
  const [visibleBlockIndex, setVisibleBlockIndex] = useState(
    initialLearnFlowProgress?.current_block_index || 0
  );
  const hasTrackedMilestone = useRef(false);
  const [mathCanvasMode, setMathCanvasMode] = useState<"drawing" | "textbox">(
    "textbox"
  );
  // Local inputMode state - isolates Learn flow from SessionStructure re-renders
  // Default to "select" for learn mode (less obtrusive than textbox)
  const [inputMode, setInputMode] = useState<InputMode>("select");
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isInitialMount = useRef(true);

  // Check if learn flow should be locked for free users
  // Lock if: not premium AND feature limit reached AND learn flow not already completed
  // AND subject is not unlocked via Medly Mondays
  const isLearnFlowCompleted = !!initialLearnFlowProgress?.completed_at;
  const shouldShowLock =
    !hasActivePlan &&
    featureUsage.isFreeUseFinished &&
    !isLearnFlowCompleted &&
    !isSubjectUnlocked(subjectId);

  // For now, just use the first flow
  const flow = learnData?.flows?.[0];

  // Flatten all blocks from all chunks into a single array, sorted by order
  // Also create a map of block index to chunk_index and block_order for persistence
  const { allBlocks, blockKeyMap } = useMemo(() => {
    if (!flow) return { allBlocks: [], blockKeyMap: new Map<number, string>() };
    const blocks: LearnFlowBlock[] = [];
    const keyMap = new Map<number, string>();
    flow.chunks.forEach((chunk) => {
      chunk.blocks
        .sort((a, b) => a.order - b.order)
        .forEach((block) => {
          const blockIndex = blocks.length;
          blocks.push(block);
          keyMap.set(blockIndex, `${chunk.chunk_index}_${block.order}`);
        });
    });
    return { allBlocks: blocks, blockKeyMap: keyMap };
  }, [flow]);

  const handleBlockComplete = useCallback(() => {
    const isFinalBlock = visibleBlockIndex === allBlocks.length - 1;

    if (!isFinalBlock) {
      // Move to the next block
      const newIndex = visibleBlockIndex + 1;
      setVisibleBlockIndex(newIndex);
      onCurrentBlockIndexChange?.(newIndex);
      // Update is debounced internally
      updateBlockIndex?.(newIndex);

      // Track milestone for PostHog survey trigger (configurable threshold)
      // Uses client-side posthog.capture() directly because surveys require client-side events
      const SURVEY_TRIGGER_BLOCK = 10;
      if (newIndex === SURVEY_TRIGGER_BLOCK && !hasTrackedMilestone.current) {
        hasTrackedMilestone.current = true;
        const posthog = (
          window as unknown as {
            posthog?: { capture: (event: string, properties?: object) => void };
          }
        ).posthog;
        posthog?.capture("learn_flow_milestone_reached", {
          block_index: newIndex,
          total_blocks: allBlocks.length,
        });
      }

      // If we just moved to the final block and it's NOT a question type,
      // mark the learn flow as complete immediately (questions handle their own completion)
      const isNewBlockFinal = newIndex === allBlocks.length - 1;
      const newBlock = allBlocks[newIndex];
      if (isNewBlockFinal && newBlock?.content?.kind !== "question") {
        markLearnFlowCompleted?.();
      }
    } else {
      // This IS the final block - mark the learn flow as complete
      // (This path is used by question blocks that call onComplete after checking MCQ)
      markLearnFlowCompleted?.();
    }
  }, [
    visibleBlockIndex,
    allBlocks,
    onCurrentBlockIndexChange,
    updateBlockIndex,
    markLearnFlowCompleted,
  ]);

  // Report current block index changes and persist (but not on initial mount)
  useEffect(() => {
    onCurrentBlockIndexChange?.(visibleBlockIndex);

    // Don't persist on initial mount - data is already loaded from server
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Update is debounced internally
    updateBlockIndex?.(visibleBlockIndex);
  }, [visibleBlockIndex, onCurrentBlockIndexChange, updateBlockIndex]);

  // Scroll to the newly revealed block when visibleBlockIndex changes
  useEffect(() => {
    // Don't auto-scroll when lock overlay is showing
    if (shouldShowLock) return;

    if (visibleBlockIndex > 0) {
      const nextBlockIndex = visibleBlockIndex;
      const nextBlockRef = blockRefs.current[nextBlockIndex];
      if (nextBlockRef) {
        nextBlockRef.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [visibleBlockIndex, shouldShowLock]);

  // Find the first question page index
  const firstQuestionPageIndex = useMemo(() => {
    if (!pages || !handleSetCurrentPageIndex) return null;
    const index = pages.findIndex(
      (page) => page.type === QuestionSessionPageType.Question
    );
    return index !== -1 ? index : null;
  }, [pages, handleSetCurrentPageIndex]);

  const handleGoToPractice = useCallback(() => {
    if (firstQuestionPageIndex !== null && handleSetCurrentPageIndex) {
      handleSetCurrentPageIndex(firstQuestionPageIndex);
    }
  }, [firstQuestionPageIndex, handleSetCurrentPageIndex]);

  const isAllBlocksVisible =
    allBlocks.length > 0 && visibleBlockIndex === allBlocks.length - 1;

  // Stable empty array reference for non-current blocks
  const EMPTY_NUMBER_ARRAY = useMemo<number[]>(() => [], []);

  // Stable handleSendMessage callback
  const stableHandleSendMessage = useCallback((message: string) => {
    if (handleSendMessageRef.current) {
      handleSendMessageRef.current(message);
    }
  }, []);

  // Stable handleUpdateCanvas callback
  const stableHandleUpdateCanvas = useCallback(
    (blockKey: string | undefined, canvas: Canvas) => {
      if (!blockKey || !updateCanvas) return;
      updateCanvas(blockKey, canvas);
    },
    [updateCanvas]
  );

  // Create memoized updateCanvas callbacks for each block
  const blockUpdateCallbacks = useMemo(() => {
    const callbacks: Record<string, (canvas: Canvas) => void> = {};
    allBlocks.forEach((_, index) => {
      const blockKey = blockKeyMap.get(index);
      if (blockKey) {
        callbacks[blockKey] = (canvas: Canvas) =>
          stableHandleUpdateCanvas(blockKey, canvas);
      }
    });
    return callbacks;
  }, [allBlocks, blockKeyMap, stableHandleUpdateCanvas]);

  // Create memoized onAnswerChange callbacks for each block
  const blockAnswerCallbacks = useMemo(() => {
    const callbacks: Record<
      string,
      (
        userAnswer:
          | string
          | string[]
          | Record<string, string>
          | Record<string, string[]>
      ) => void
    > = {};
    allBlocks.forEach((_, index) => {
      const blockKey = blockKeyMap.get(index);
      if (blockKey && updateMcqAnswer) {
        callbacks[blockKey] = (userAnswer) =>
          updateMcqAnswer(blockKey, userAnswer);
      }
    });
    return callbacks;
  }, [allBlocks, blockKeyMap, updateMcqAnswer]);

  if (!learnData?.flows || learnData.flows.length === 0) {
    return (
      <div className="flex-1 w-full flex flex-col">
        <div className="max-w-[800px] mx-auto w-full px-4 py-6">
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-[16px] border border-[#F2F2F7] p-6">
            <div className="mb-4 text-4xl">📖</div>
            <h2 className="text-xl font-rounded-bold text-gray-900 mb-2">
              Learn Content Unavailable
            </h2>
            <p className="text-sm text-gray-500 max-w-md">
              Learn content is not available for this lesson.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderBlock = (block: LearnFlowBlock, index: number) => {
    const isVisible = index <= visibleBlockIndex;
    const isCurrent = index === visibleBlockIndex;
    const isFinalBlock = index === allBlocks.length - 1;
    const blockKey = blockKeyMap.get(index);
    const persistedBlock: BlockProgress | undefined =
      blockKey && initialLearnFlowProgress?.blocks?.[blockKey]
        ? initialLearnFlowProgress.blocks[blockKey]
        : undefined;

    if (!isVisible) {
      return null;
    }

    // Use memoized callbacks for stable prop references
    const updateCanvasCallback = blockKey
      ? blockUpdateCallbacks[blockKey]
      : undefined;

    const commonCanvasProps = {
      inputMode,
      setInputMode,
      isReadOnly,
      canvas: persistedBlock?.canvas,
      updateCanvas: updateCanvasCallback,
      blockKey: blockKey || `block-${index}`,
      canvasMessage: isCurrent ? canvasMessage : undefined,
      handleSendMessage: stableHandleSendMessage,
      isAwaitingResponse: isCurrent ? isAwaitingResponse : false,
      shimmerTextboxIndices: isCurrent
        ? shimmerTextboxIndices
        : EMPTY_NUMBER_ARRAY,
      fadeInTextboxIndices: isCurrent
        ? fadeInTextboxIndices
        : EMPTY_NUMBER_ARRAY,
      highlightedText,
    };

    switch (block.content.kind) {
      case "text":
        return (
          <div
            key={`${block.order}-${index}`}
            ref={(el) => {
              blockRefs.current[index] = el;
            }}
          >
            <TextBlock
              title={block.title}
              content={block.content}
              onComplete={isCurrent ? handleBlockComplete : undefined}
              isFinalBlock={isFinalBlock}
              isFirstBlock={index === 0}
              currentBlockIndex={visibleBlockIndex}
              {...commonCanvasProps}
            />
          </div>
        );
      case "worked_example":
        return (
          <div
            key={`${block.order}-${index}`}
            ref={(el) => {
              blockRefs.current[index] = el;
            }}
          >
            <WorkedExampleBlock
              content={block.content}
              onComplete={isCurrent ? handleBlockComplete : undefined}
              isFinalBlock={isFinalBlock}
              onExplainClick={onExplainClick}
              {...commonCanvasProps}
            />
          </div>
        );
      case "question":
        const persistedUserAnswer = persistedBlock?.user_answer;
        const { blockKey: _, ...questionCanvasProps } = commonCanvasProps;
        // Use memoized answer callback for stable prop reference
        const onAnswerChangeCallback = blockKey
          ? blockAnswerCallbacks[blockKey]
          : undefined;
        return (
          <div
            key={`${block.order}-${index}`}
            ref={(el) => {
              blockRefs.current[index] = el;
            }}
          >
            <QuestionBlock
              title={block.title}
              content={block.content}
              onComplete={isCurrent ? handleBlockComplete : undefined}
              isFinalBlock={isFinalBlock}
              onExplainClick={onExplainClick}
              lessonId={lessonId}
              blockKey={blockKey}
              persistedUserAnswer={persistedUserAnswer}
              onAnswerChange={onAnswerChangeCallback}
              {...questionCanvasProps}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex-1 w-full flex flex-col relative ${shouldShowLock ? "overflow-hidden" : ""}`}
    >
      {/* Show lock overlay for free users who have hit their limit and haven't completed this learn flow */}
      {shouldShowLock && <LockOverlay />}
      <div className="w-full md:px-0 px-4 py-6">
        {allBlocks.map((block, index) => renderBlock(block, index))}
        {isAllBlocksVisible && firstQuestionPageIndex !== null && (
          <div className="mt-6 md:w-[800px] mx-auto">
            <LearnBlockFooter
              buttonText="Go to practice"
              buttonState="filled"
              onPress={handleGoToPractice}
            />
          </div>
        )}
        {/* Canvas Toolbar - disabled for now
        {!isReadOnly && (
          <div className="sticky bottom-6 left-0 right-0 flex justify-center z-[1001] pointer-events-none mt-6">
            <SketchToolbar
              mode={inputMode}
              type={isTouchScreen ? "toolbar-math" : "toolbar"}
              onSelectMode={() => setInputMode("select")}
              onTextMode={() => setInputMode("text")}
              onMathMode={() => setInputMode("math")}
              onMessageMode={() => setInputMode("message")}
              onPenMode={() => setInputMode("pen")}
              onEraserMode={() => setInputMode("eraser")}
              onGrabMode={() => setInputMode("grab")}
              showTouchTools={true}
              mathCanvasMode={mathCanvasMode}
              onMathCanvasModeChange={setMathCanvasMode}
            />
          </div>
        )}
        */}
      </div>
    </div>
  );
};

export default LearnPage;
