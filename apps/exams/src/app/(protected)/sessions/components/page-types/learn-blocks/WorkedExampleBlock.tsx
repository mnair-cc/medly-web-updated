import { Canvas, CanvasMessage } from "@/app/types/types";
import "katex/dist/katex.min.css";
import React, { useCallback, useRef } from "react";
import { InputMode, LearnFlowWorkedExampleContent } from "../../../types";
import LearnBlockCard from "./LearnBlockCard";
import LearnBlockFooter from "./LearnBlockFooter";
import LearnExplanationSteps from "./LearnExplanationSteps";
import LearnModeSketchCanvas from "../../question-components/canvas/LearnModeSketchCanvas";
import MemoizedMarkdown from "./MemoizedMarkdown";

interface WorkedExampleBlockProps {
  content: LearnFlowWorkedExampleContent;
  onComplete?: () => void;
  isFinalBlock?: boolean;
  onExplainClick?: (stepIndex: number, stepMath: string) => void;
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
  isReadOnly: boolean;
  canvas?: Canvas;
  updateCanvas?: (canvas: Canvas) => void;
  blockKey: string;
  canvasMessage?: CanvasMessage[] | undefined;
  handleSendMessage: (message: string) => void;
  isAwaitingResponse: boolean;
  shimmerTextboxIndices?: number[];
  fadeInTextboxIndices?: number[];
  highlightedText?: string[];
}

const WorkedExampleBlock: React.FC<WorkedExampleBlockProps> = React.memo(
  ({
    content,
    onComplete,
    isFinalBlock = false,
    onExplainClick,
    inputMode,
    setInputMode,
    isReadOnly,
    canvas,
    updateCanvas,
    blockKey,
    canvasMessage,
    handleSendMessage,
    isAwaitingResponse,
    shimmerTextboxIndices = [],
    fadeInTextboxIndices = [],
    highlightedText = [],
  }) => {
    // Use ref to always have access to latest onComplete without breaking memoization
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    const handleComplete = useCallback(() => {
      onCompleteRef.current?.();
    }, []);

    // Memoize the updateQuestionCanvas wrapper to prevent SketchCanvas re-renders
    const stableUpdateQuestionCanvas = useCallback(
      (_groupId: number, _legacyId: string, canvasData: Canvas) => {
        updateCanvas?.(canvasData);
      },
      [updateCanvas],
    );

    return (
      <LearnBlockCard
        title="Worked Example"
        footer={
          onComplete && !isFinalBlock ? (
            <LearnBlockFooter buttonText="Continue" onPress={handleComplete} />
          ) : undefined
        }
      >
        <div className="mb-6 bg-[rgba(242,242,247,0.5)] rounded-[16px] p-[20px]">
          <div className="prose prose-sm max-w-none">
            <MemoizedMarkdown
              content={content.question_text}
              highlightedText={highlightedText}
            />
          </div>
        </div>

        <div className="mb-6">
          <LearnExplanationSteps
            steps={content.steps}
            onExplainClick={onExplainClick}
          />
        </div>
        {/* Canvas disabled for now
        <LearnModeSketchCanvas
          inputMode={inputMode}
          setInputMode={setInputMode}
          isReadOnly={isReadOnly}
          isQuestionMarked={false}
          canvas={canvas}
          canvasMessage={canvasMessage}
          updateQuestionCanvas={stableUpdateQuestionCanvas}
          questionGroupId={0}
          questionLegacyId={blockKey}
          questionAnnotations={undefined}
          handleSendMessage={handleSendMessage}
          shimmerTextboxIndices={shimmerTextboxIndices}
          fadeInTextboxIndices={fadeInTextboxIndices}
          isAwaitingResponse={isAwaitingResponse}
        />
        */}
      </LearnBlockCard>
    );
  },
);

WorkedExampleBlock.displayName = "WorkedExampleBlock";

export default WorkedExampleBlock;
