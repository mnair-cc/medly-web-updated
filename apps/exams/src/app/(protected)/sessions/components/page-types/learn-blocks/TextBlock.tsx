import { preprocessLaTeX } from "@/app/_hooks/useLatexPreprocessing";
import { Canvas, CanvasMessage } from "@/app/types/types";
import "katex/dist/katex.min.css";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { InputMode, LearnFlowTextContent } from "../../../types";
import LearnBlockCard from "./LearnBlockCard";
import LearnBlockFooter from "./LearnBlockFooter";
import LearnModeSketchCanvas from "../../question-components/canvas/LearnModeSketchCanvas";
import MemoizedMarkdown from "./MemoizedMarkdown";

interface TextBlockProps {
  title: string;
  content: LearnFlowTextContent;
  onComplete?: () => void;
  isFinalBlock?: boolean;
  isFirstBlock?: boolean;
  currentBlockIndex?: number;
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

const TextBlock: React.FC<TextBlockProps> = React.memo(
  ({
    title,
    content,
    onComplete,
    isFinalBlock = false,
    isFirstBlock = false,
    currentBlockIndex = 0,
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
    // If user has progressed past block 0, the first block should start expanded
    const [isExpanded, setIsExpanded] = useState(
      isFirstBlock ? currentBlockIndex > 0 : false,
    );

    // Memoize the updateQuestionCanvas wrapper to prevent SketchCanvas re-renders
    const stableUpdateQuestionCanvas = useCallback(
      (_groupId: number, _legacyId: string, canvasData: Canvas) => {
        updateCanvas?.(canvasData);
      },
      [updateCanvas],
    );

    // Extract first paragraph for first block
    const { firstParagraph, fullText } = useMemo(() => {
      // Always preprocess LaTeX to ensure proper rendering
      const processedText = preprocessLaTeX(content.text);

      if (!isFirstBlock) {
        return { firstParagraph: null, fullText: processedText };
      }

      // Split by double newlines (markdown paragraph separator)
      const paragraphs = processedText
        .split(/\n\n+/)
        .filter((p) => p.trim().length > 0);

      if (paragraphs.length <= 1) {
        // Only one paragraph, no need to truncate
        return { firstParagraph: null, fullText: processedText };
      }

      return {
        firstParagraph: paragraphs[0].trim(),
        fullText: processedText,
      };
    }, [content.text, isFirstBlock]);

    const shouldShowTruncated = isFirstBlock && firstParagraph && !isExpanded;
    const displayText = shouldShowTruncated ? firstParagraph : fullText;

    // Use ref to always have access to latest onComplete without breaking memoization
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    const handleExpand = useCallback(() => {
      setIsExpanded(true);
    }, []);

    const handleContinue = useCallback(() => {
      onCompleteRef.current?.();
    }, []);

    return (
      <LearnBlockCard
        title={title}
        footer={
          onComplete && !isFinalBlock ? (
            <LearnBlockFooter
              buttonText={shouldShowTruncated ? "Continue" : "Continue"}
              onPress={shouldShowTruncated ? handleExpand : handleContinue}
            />
          ) : undefined
        }
      >
        <div className="prose prose-sm max-w-none mb-6">
          <MemoizedMarkdown
            content={displayText}
            highlightedText={highlightedText}
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

TextBlock.displayName = "TextBlock";

export default TextBlock;
