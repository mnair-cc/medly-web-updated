import ArrowWithTailUpIcon from "@/app/_components/icons/ArrowWithTailUpIcon";
import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import supersub from "remark-supersub";
import { useResponsive } from "@/app/_hooks/useResponsive";
import {
  FloatingMessage,
  QuestionGroup,
  QuestionWithMarkingResult,
} from "@/app/types/types";
import {
  QuestionSessionPageType,
  SessionData,
} from "@/app/(protected)/sessions/types";

// SVG component for add expression (plus icon)
const AddExpressionIcon = () => (
  <svg
    className="inline"
    style={{ verticalAlign: "middle" }}
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.67383 21.8809H19.3174C21.2246 21.8809 22.209 20.8965 22.209 19.0156V8.31934C22.209 6.43848 21.2246 5.4541 19.3174 5.4541H8.67383C6.77539 5.4541 5.78223 6.42969 5.78223 8.31934V19.0156C5.78223 20.8965 6.77539 21.8809 8.67383 21.8809ZM9.77246 13.6631C9.77246 13.1445 10.1416 12.7842 10.6514 12.7842H13.1562V10.2793C13.1562 9.76953 13.5078 9.40918 14.0176 9.40918C14.5273 9.40918 14.8965 9.76953 14.8965 10.2793V12.7842H17.4014C17.9023 12.7842 18.2715 13.1445 18.2715 13.6631C18.2715 14.1641 17.9023 14.5244 17.4014 14.5244H14.8965V17.0293C14.8965 17.5303 14.5273 17.8994 14.0176 17.8994C13.5078 17.8994 13.1562 17.5303 13.1562 17.0293V14.5244H10.6514C10.1416 14.5244 9.77246 14.1641 9.77246 13.6631Z"
      fill="white"
    />
  </svg>
);

// SVG component for add regression (trend line icon)
const AddRegressionIcon = () => (
  <svg
    className="inline"
    style={{ verticalAlign: "middle" }}
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9 24L19 6" stroke="white" stroke-linecap="round" />
    <circle cx="11" cy="12" r="2" fill="white" />
    <circle cx="10" cy="19" r="2" fill="white" />
    <circle cx="17" cy="17" r="2" fill="white" />
    <circle cx="20" cy="10" r="2" fill="white" />
  </svg>
);

const CopyExpressionIcon = () => (
  <svg
    className="inline"
    style={{ verticalAlign: "middle" }}
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 10C13.0768 10 15.9232 10 21 10M8.52 17H21"
      stroke="white"
      stroke-linecap="round"
    />
    <path
      d="M22.2134 19.7231L22.2134 7.6206C22.2134 5.71338 21.229 4.72021 19.3481 4.72021L8.65185 4.72021C6.771 4.72021 5.78662 5.71338 5.78662 7.62061L5.78662 19.7231C5.78662 21.6216 6.76221 22.6147 8.65186 22.6147L19.3481 22.6147C21.229 22.6147 22.2134 21.6216 22.2134 19.7231ZM20.4644 19.7319C20.4644 20.4614 20.0864 20.8657 19.313 20.8657L11.2271 20.8657C10.4536 20.8657 10.0757 20.4614 10.0757 19.7319L10.0757 7.61182C10.0757 6.88232 10.4536 6.47803 11.2271 6.47803L19.313 6.47803C20.0864 6.47803 20.4644 6.88232 20.4644 7.61182L20.4644 19.7319Z"
      fill="white"
    />
    <path
      d="M12.2754 15.2694C12.0269 15.0121 11.8972 14.7025 11.8957 14.2484L11.8891 8.9173L11.8899 8.91247C11.8954 8.59 11.9794 8.29353 12.2453 8.03659C12.7443 7.55458 13.4766 7.63299 13.9259 8.09766C14.1517 8.33123 14.2914 8.65815 14.2668 9.00957L14.2675 9.00889L14.1551 11.3489L14.1535 11.3613L14.1185 11.7157L14.7692 11.0148L14.7805 11.0039L21.8214 4.27751C22.335 3.78228 23.1725 3.80129 23.6797 4.32572C24.1805 4.84386 24.1682 5.68303 23.6558 6.17829L23.6551 6.17897L16.6142 12.9053L16.6065 12.9128L15.8808 13.5517L16.2438 13.5254L16.257 13.525L18.5913 13.4839L18.5913 13.4853C18.9464 13.4724 19.2755 13.6327 19.4992 13.864C19.9513 14.3318 19.9917 15.0582 19.4956 15.5381C19.2348 15.7902 18.947 15.8774 18.6163 15.8719L18.6107 15.8718L13.2755 15.676C12.8264 15.6673 12.5142 15.5164 12.2754 15.2694Z"
      fill="white"
      stroke="black"
      stroke-width="0.5"
    />
  </svg>
);

// SVG component for suggested zoom (magnifying glass icon)
const SuggestedZoomIcon = () => (
  <svg
    className="inline"
    style={{ verticalAlign: "middle" }}
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12.5322 19.0332C13.9297 19.0332 15.2393 18.6113 16.3291 17.8906L20.1787 21.749C20.4336 21.9951 20.7588 22.1182 21.1104 22.1182C21.8398 22.1182 22.376 21.5469 22.376 20.8262C22.376 20.4922 22.2617 20.167 22.0156 19.9209L18.1924 16.0801C18.9834 14.9551 19.4492 13.5928 19.4492 12.1162C19.4492 8.31055 16.3379 5.19922 12.5322 5.19922C8.73535 5.19922 5.61523 8.31055 5.61523 12.1162C5.61523 15.9219 8.72656 19.0332 12.5322 19.0332ZM12.5322 17.1875C9.74609 17.1875 7.46094 14.9023 7.46094 12.1162C7.46094 9.33008 9.74609 7.04492 12.5322 7.04492C15.3184 7.04492 17.6035 9.33008 17.6035 12.1162C17.6035 14.9023 15.3184 17.1875 12.5322 17.1875ZM10.2646 12.8105H11.8379V14.3838C11.8379 14.7705 12.1455 15.0781 12.5322 15.0781C12.9189 15.0781 13.2178 14.7705 13.2178 14.3838V12.8105H14.7998C15.1865 12.8105 15.4941 12.5029 15.4941 12.1162C15.4941 11.7295 15.1865 11.4219 14.7998 11.4219H13.2178V9.84863C13.2178 9.46191 12.9189 9.1543 12.5322 9.1543C12.1455 9.1543 11.8379 9.46191 11.8379 9.84863V11.4219H10.2646C9.87793 11.4219 9.57031 11.7295 9.57031 12.1162C9.57031 12.5029 9.87793 12.8105 10.2646 12.8105Z"
      fill="#1C1C1E"
    />
  </svg>
);

const SpeechBubble = ({
  floatingMessage,
  sessionData,
  currentPageIndex,
  isOnLastSegment,
  searchContainer,
  onSegmentChange,
  handleSendMessage,
  isHidden = false,
}: {
  floatingMessage?: FloatingMessage;
  sessionData?: SessionData;
  currentPageIndex?: number;
  isOnLastSegment?: boolean;
  searchContainer?: HTMLElement | null;
  onSegmentChange?: (isOnLastSegment: boolean) => void;
  handleSendMessage?: (message: string) => void;
  isHidden?: boolean;
}) => {
  const { isWideScreen } = useResponsive();

  // Derive text from floatingMessage
  const text =
    floatingMessage?.text.replace(/\\\\/g, "\\").replace(/\\n/g, "\n") || "";

  // Preprocess text to replace special tags with markdown-safe placeholders
  const preprocessedText = useMemo(() => {
    return text
      .replace(/<add_expression\/>/g, '<span class="add-expression"></span>')
      .replace(/<add_regression\/>/g, '<span class="add-regression"></span>')
      .replace(/<suggested_zoom\/>/g, '<span class="suggested-zoom"></span>')
      .replace(/<copy_expression\/>/g, '<span class="copy-expression"></span>');
  }, [text]);

  // Derive targetText from floatingMessage and session data
  const targetText = useMemo(() => {
    if (!floatingMessage) return undefined;

    // Check if targetAction is 'write_work' and we're on the final segment
    // if (floatingMessage.targetIndex == undefined && isOnLastSegment) {
    //   return "Write your work here";
    // }

    // If targetIndex is provided, try to get text from canvas
    if (
      floatingMessage.targetIndex !== undefined &&
      sessionData &&
      currentPageIndex !== undefined
    ) {
      const questionGroup = sessionData?.pages?.[currentPageIndex]
        ?.content as QuestionGroup;
      const currentQuestion = questionGroup
        ?.questions?.[0] as QuestionWithMarkingResult;
      const canvas = currentQuestion?.canvas;

      if (canvas?.textboxes?.[floatingMessage.targetIndex]?.text) {
        return canvas.textboxes[floatingMessage.targetIndex].text;
      } else {
        return "Write your work here";
      }
    }

    // Fall back to provided targetText
    if (floatingMessage.targetText) {
      return floatingMessage.targetText;
    }

    // No target text available
    return undefined;
  }, [floatingMessage, sessionData, currentPageIndex, isOnLastSegment]);

  // Derive fallbackTargetText from session data
  const fallbackTargetText = useMemo(() => {
    if (!sessionData || currentPageIndex === undefined) return undefined;

    // Get current question for fallback
    if (
      sessionData?.pages?.[currentPageIndex]?.type ===
      QuestionSessionPageType.Question
    ) {
      const questionGroup = sessionData.pages[currentPageIndex]
        .content as QuestionGroup;
      const currentQuestion = questionGroup?.questions?.[0];

      if (currentQuestion) {
        // Default to using questionStem
        const textToUse =
          currentQuestion.questionStem || currentQuestion.questionText;

        // If questionStem is empty, use 'Write your work here'
        // if (!textToUse.trim()) {
        //   return "Write your work here";
        // }

        // Extract first two words (remove markdown and LaTeX first)
        const cleanText = textToUse
          .replace(/\$\$.*?\$\$/g, "") // Remove block LaTeX
          .replace(/\$.*?\$/g, "") // Remove inline LaTeX
          .replace(/\\\[.*?\\\]/g, "") // Remove block LaTeX \[...\]
          .replace(/\\\(.*?\\\)/g, "") // Remove inline LaTeX \(...\)
          .replace(/[#*_~`]/g, "") // Remove markdown symbols
          .trim();

        const words = cleanText.split(/\s+/);
        const firstTwoWords = words.slice(0, 2).join(" ");
        return firstTwoWords && firstTwoWords.length > 0
          ? firstTwoWords
          : "Write your work here";
      }
    }
    return undefined;
  }, [sessionData, currentPageIndex]);

  // Derive hideMessageInput from floatingMessage
  const hideMessageInput = floatingMessage?.targetAction === "write_work";

  // Function to find target component using querySelector
  const findTargetComponent = useCallback(() => {
    if (!floatingMessage?.targetComponent) return null;

    // Use searchContainer if provided, otherwise fall back to document.body
    const searchRoot = searchContainer || document.body;
    // Get targetIndex, default to 0 if not provided
    const targetIndex = floatingMessage.targetIndex ?? 0;

    try {
      // First, try to find elements within the current step only
      const currentStepContainer = searchRoot.querySelector(
        '[data-step-status="current"]'
      );
      if (currentStepContainer) {
        const targetElementsInCurrentStep =
          currentStepContainer.querySelectorAll(
            floatingMessage.targetComponent
          ) as NodeListOf<HTMLElement>;
        if (targetElementsInCurrentStep.length > 0) {
          // Use targetIndex to select the specific component, or fall back to the last one if index is out of bounds
          const elementIndex =
            targetIndex < targetElementsInCurrentStep.length
              ? targetIndex
              : targetElementsInCurrentStep.length - 1;
          const targetElement = targetElementsInCurrentStep[elementIndex];
          // console.log(`[AiMessageBubbleFloaty] ✅ Found ${targetElementsInCurrentStep.length} target component(s) in current step with selector: ${floatingMessage.targetComponent}, using index ${elementIndex}:`, targetElement);
          return targetElement;
        }
      }

      // Fallback: search in the entire container (for backwards compatibility)
      const targetElements = searchRoot.querySelectorAll(
        floatingMessage.targetComponent
      ) as NodeListOf<HTMLElement>;
      if (targetElements.length > 0) {
        // Use targetIndex to select the specific component, or fall back to the last one if index is out of bounds
        const elementIndex =
          targetIndex < targetElements.length
            ? targetIndex
            : targetElements.length - 1;
        const targetElement = targetElements[elementIndex];
        // console.log(`[AiMessageBubbleFloaty] ✅ Found ${targetElements.length} target component(s) with selector: ${floatingMessage.targetComponent}, using index ${elementIndex} (fallback):`, targetElement);
        return targetElement;
      } else {
        // console.log(`[AiMessageBubbleFloaty] ❌ Target component not found with selector: ${floatingMessage.targetComponent}`);
        return null;
      }
    } catch (error) {
      // console.error(`[AiMessageBubbleFloaty] ❌ Error finding target component with selector: ${floatingMessage.targetComponent}`, error);
      return null;
    }
  }, [
    floatingMessage?.targetComponent,
    floatingMessage?.targetIndex,
    searchContainer,
  ]);

  // Split text into segments using LaTeX-aware logic
  const textSegments = useMemo(() => {
    // Temporarily protect LaTeX expressions from splitting
    const latexPlaceholders: string[] = [];
    let protectedText = preprocessedText;

    // Replace LaTeX expressions with placeholders
    const latexRegexes = [
      /\$\$([\s\S]*?)\$\$/g, // Block LaTeX with $$
      /\$([^\$]*?)\$/g, // Inline LaTeX with $
      /\\\[([\s\S]*?)\\\]/g, // Block LaTeX with \[ \]
      /\\\(([\s\S]*?)\\\)/g, // Inline LaTeX with \( \)
    ];

    latexRegexes.forEach((regex) => {
      protectedText = protectedText.replace(regex, (match: string) => {
        const placeholder = `__LATEX_${latexPlaceholders.length}__`;
        latexPlaceholders.push(match);
        return placeholder;
      });
    });

    // Step 1: Split by newlines first - each line becomes a potential segment
    const newlineSplit = protectedText
      .replace("\n$$", "$$")
      .replace(/\n\n/g, "\n")
      .split("\n")
      .filter((segment) => segment.trim().length > 0);

    const finalSegments: string[] = [];

    // Step 2: Process each line-separated segment
    for (const segment of newlineSplit) {
      const trimmedSegment = segment.trim();
      if (!trimmedSegment) continue;

      // Check if this segment contains sentence-ending punctuation
      // If it does, we can split it further; if not, treat it as a single segment
      const hasSentenceEnding = /[.!?]/.test(trimmedSegment);

      if (!hasSentenceEnding) {
        // No sentence punctuation - treat as single segment
        finalSegments.push(trimmedSegment);
      } else {
        // Has sentence punctuation - split by sentence boundaries
        const sentences = trimmedSegment
          .split(/([.!?])(\s+|$)/)
          .filter((part) => part.trim().length > 0);

        let currentSentence = "";

        for (let i = 0; i < sentences.length; i++) {
          const part = sentences[i];

          // If this is punctuation
          if (/^[.!?]$/.test(part)) {
            currentSentence += part;

            // Check if this should NOT be split:
            const beforePunct = currentSentence.slice(0, -1);
            const nextPart = sentences[i + 1];

            // 1. Decimal numbers (e.g., "3.14")
            const isDecimal =
              part === "." &&
              /\d$/.test(beforePunct) &&
              nextPart &&
              /^\s*\d/.test(nextPart);

            // 2. List items (e.g., "1.", "2.", "a.", "i.")
            const isListItem =
              part === "." &&
              /^\s*(?:\d+|[a-z]|[ivx]+)$/i.test(beforePunct.trim());

            // 3. Abbreviations (e.g., "Dr.", "Mr.", "etc.")
            const isAbbreviation =
              part === "." &&
              /\b(?:Dr|Mr|Mrs|Ms|Prof|etc|vs|e\.g|i\.e)$/i.test(beforePunct);

            if (!isDecimal && !isListItem && !isAbbreviation) {
              // This is a sentence boundary - push the current sentence
              if (currentSentence.trim()) {
                finalSegments.push(currentSentence.trim());
              }
              currentSentence = "";
              // Skip the whitespace part that follows punctuation
              if (i + 1 < sentences.length && /^\s+$/.test(sentences[i + 1])) {
                i++;
              }
            }
          } else {
            // This is regular text
            currentSentence += part;
          }
        }

        // Add any remaining text as a segment
        if (currentSentence.trim()) {
          finalSegments.push(currentSentence.trim());
        }
      }
    }

    // Restore LaTeX expressions in each segment
    const processedSegments = finalSegments.map((segment) => {
      let result = segment;
      latexPlaceholders.forEach((latex, index) => {
        result = result.replace(`__LATEX_${index}__`, latex);
      });
      return result;
    });

    return processedSegments.filter((segment) => segment.length > 0);
  }, [preprocessedText]);

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isFloating, setIsFloating] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [isUserClosed, setIsUserClosed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, scale: 1 });
  const [messageText, setMessageText] = useState("");

  // Drag-related state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const [draggedThisSession, setDraggedThisSession] = useState(false);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const targetRange = useRef<Range | null>(null);
  const targetElement = useRef<HTMLElement | null>(null);
  const hasMultipleSegments = textSegments.length > 1;

  // Function to find target text in the document
  const findTargetText = useCallback(() => {
    if (!targetText) {
      return null;
    }

    // Use searchContainer if provided, otherwise fall back to document.body
    const searchRoot = searchContainer || document.body;

    // First, try to search within the current step only
    const currentStepContainer = searchRoot.querySelector(
      '[data-step-status="current"]'
    );
    let preferredSearchRoot = currentStepContainer || searchRoot;

    // Helper function to search for text in the DOM
    const searchForText = (
      searchText: string,
      searchScopeRoot = preferredSearchRoot
    ) => {
      // First, check if searchText contains LaTeX and extract just the LaTeX part
      const latexMatches = [
        /\$\$(.*?)\$\$/g.exec(searchText), // Block LaTeX: $$ ... $$
        /\$(.*?)\$/g.exec(searchText), // Inline LaTeX: $ ... $
        /\\\[(.*?)\\\]/g.exec(searchText), // Block LaTeX: \[ ... \]
        /\\\((.*?)\\\)/g.exec(searchText), // Inline LaTeX: \( ... \)
      ];

      const latexMatch = latexMatches.find((match) => match);
      let finalSearchText = latexMatch ? latexMatch[0] : searchText; // Use full LaTeX match (with delimiters) or original text

      // Normalize LaTeX: convert four backslashes to two backslashes
      if (latexMatch) {
        finalSearchText = finalSearchText.replace(/\\\\/g, "\\");
      }

      // PRIORITY 1: Search within KaTeX elements first (for ReactMarkdown with rehype-katex)
      const katexElements = searchScopeRoot.querySelectorAll(".katex");

      for (const katexElement of katexElements) {
        // Get the original LaTeX from the annotation element in MathML
        const annotation = katexElement.querySelector(
          'annotation[encoding="application/x-tex"]'
        );
        const latexContent = annotation?.textContent || "";

        // Check if search text matches the LaTeX content or is contained within it
        if (latexContent.includes(finalSearchText)) {
          const range = document.createRange();
          range.selectNode(katexElement);
          return range;
        }

        // Check if the search text is a LaTeX expression with delimiters
        const latexMatches = [
          /^\$\$(.*?)\$\$$/.exec(finalSearchText), // Block LaTeX: $$ ... $$
          /^\$(.*?)\$$/.exec(finalSearchText), // Inline LaTeX: $ ... $
          /^\\\[(.*?)\\\]$/.exec(finalSearchText), // Block LaTeX: \[ ... \]
          /^\\\((.*?)\\\)$/.exec(finalSearchText), // Inline LaTeX: \( ... \)
        ];

        // Extract inner LaTeX content if search text has delimiters
        const innerLatex = latexMatches.find((match) => match)?.[1];
        if (innerLatex && latexContent.includes(innerLatex.trim())) {
          const range = document.createRange();
          range.selectNode(katexElement);
          return range;
        }

        // Also check rendered text content
        const renderedText = katexElement.textContent || "";
        if (renderedText.includes(finalSearchText)) {
          const range = document.createRange();
          range.selectNode(katexElement);
          return range;
        }
      }

      // PRIORITY 2: Search within math-field elements
      const mathFields = searchScopeRoot.querySelectorAll(
        "math-field"
      ) as NodeListOf<any>;

      for (const mathField of mathFields) {
        // Check if the search text is a LaTeX expression with delimiters
        const latexMatches = [
          /^\$\$(.*?)\$\$$/.exec(finalSearchText), // Block LaTeX: $$ ... $$
          /^\$(.*?)\$$/.exec(finalSearchText), // Inline LaTeX: $ ... $
          /^\\\[(.*?)\\\]$/.exec(finalSearchText), // Block LaTeX: \[ ... \]
          /^\\\((.*?)\\\)$/.exec(finalSearchText), // Inline LaTeX: \( ... \)
        ];

        // Extract inner LaTeX content if search text has delimiters
        const innerLatex = latexMatches.find((match) => match)?.[1];

        if (innerLatex) {
          // Search for the inner LaTeX content in the math field
          if (mathField.value && mathField.value.includes(innerLatex.trim())) {
            const range = document.createRange();
            range.selectNode(mathField);
            return range;
          }
        } else {
          // Original logic: direct search in LaTeX source
          if (mathField.value && mathField.value.includes(finalSearchText)) {
            const range = document.createRange();
            range.selectNode(mathField);
            return range;
          }
        }

        // Also check if the search text appears in the rendered content
        // This handles cases where the search text might be in the visual representation
        const mathFieldText = mathField.textContent || "";
        if (mathFieldText.includes(finalSearchText)) {
          const range = document.createRange();
          range.selectNode(mathField);
          return range;
        }
      }

      // PRIORITY 3: Search in regular DOM text nodes (only if not found in math elements)
      const walker = document.createTreeWalker(
        searchScopeRoot,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        const textContent = node.textContent || "";
        const index = textContent.indexOf(finalSearchText);

        if (index !== -1) {
          // Check if it's an exact word match (not part of another word)
          const beforeChar = index > 0 ? textContent[index - 1] : " ";
          const afterChar =
            index + finalSearchText.length < textContent.length
              ? textContent[index + finalSearchText.length]
              : " ";

          // Check word boundaries
          const isWordBoundaryBefore =
            /\s|^/.test(beforeChar) || /[^\w]/.test(beforeChar);
          const isWordBoundaryAfter =
            /\s|$/.test(afterChar) || /[^\w]/.test(afterChar);

          if (isWordBoundaryBefore && isWordBoundaryAfter) {
            // Additional check: avoid text nodes that are inside math processing elements
            // or hidden elements that might be part of ReactMarkdown's processing
            const parentElement = node.parentElement;
            if (parentElement) {
              const style = window.getComputedStyle(parentElement);
              // Skip if parent is hidden, has display: none, or is a processing element
              if (
                style.display === "none" ||
                style.visibility === "hidden" ||
                style.opacity === "0" ||
                parentElement.style.display === "none" ||
                parentElement.hasAttribute("data-temp") ||
                parentElement.classList.contains("math-processing") ||
                parentElement.classList.contains("katex-temp") ||
                parentElement.classList.contains("hidden")
              ) {
                continue;
              }
            }

            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + finalSearchText.length);
            return range;
          }
        }
      }

      return null;
    };

    // First try to find the primary target text in current step
    let range = searchForText(targetText);

    // If not found in current step and we're in a step container, try full container
    if (!range && currentStepContainer) {
      range = searchForText(targetText, searchRoot);
    }

    // If not found and we have a fallback, try the fallback
    if (!range && fallbackTargetText) {
      range = searchForText(fallbackTargetText);
      // If still not found in current step, try fallback in full container
      if (!range && currentStepContainer) {
        range = searchForText(fallbackTargetText, searchRoot);
      }

      if (range) {
        console.log("[AiMessageBubbleFloaty] ✅ Fallback search succeeded!");
      } else {
        console.log("[AiMessageBubbleFloaty] ❌ Fallback search also failed");
      }
    } else if (!range) {
      console.log(
        "[AiMessageBubbleFloaty] ❌ Primary search failed and no fallbackTargetText provided"
      );
    } else {
      console.log("[AiMessageBubbleFloaty] ✅ Primary search succeeded!");
    }

    return range;
  }, [targetText, fallbackTargetText, searchContainer]);

  // Function to update bubble position based on target component or text position
  const updatePosition = useCallback(() => {
    // Check if we have a target component first
    if (floatingMessage?.targetComponent) {
      const component = findTargetComponent();
      if (component) {
        targetElement.current = component;
        const rect = component.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newX = rect.left + rect.width / 2;
        let newY =
          floatingMessage.targetComponent === ".dcg-graph-outer"
            ? rect.top // Center vertically for Desmos graph
            : rect.top; // Top position for other components
        let scale = 1;

        // Apply drag offset with bounds checking
        let finalX = newX + dragOffset.x;
        let finalY = newY + dragOffset.y;

        // Calculate estimated bubble dimensions for bounds checking
        const estimatedBubbleWidth =
          Math.min(
            Math.max(
              (textSegments[currentSegmentIndex]?.length || 0) * 8 + 64,
              120
            ),
            320
          ) * scale;
        const estimatedBubbleHeight = 60 * scale; // Rough estimate for bubble height

        // Apply bounds checking to keep bubble within screen
        const halfBubbleWidth = estimatedBubbleWidth / 16;
        const margin = 10; // Small margin from screen edges
        const topMargin = 28; // Top safe area
        const bottomMargin = !isWideScreen ? 180 : margin; // Larger bottom safe area for mobile

        // Horizontal bounds checking
        const minX = halfBubbleWidth + margin;
        const maxX = viewportWidth - halfBubbleWidth - margin;
        finalX = Math.max(minX, Math.min(maxX, finalX));

        // Vertical bounds checking
        const minY = estimatedBubbleHeight + topMargin;
        const maxY = viewportHeight - bottomMargin;
        finalY = Math.max(minY, Math.min(maxY, finalY));

        // Update drag offset when dragging to reflect constrained position
        if (isDragging) {
          const constrainedDragOffsetX = finalX - newX;
          const constrainedDragOffsetY = finalY - newY;

          // Only update dragOffset if it's different from the intended offset (i.e., we hit a boundary)
          if (
            constrainedDragOffsetX !== dragOffset.x ||
            constrainedDragOffsetY !== dragOffset.y
          ) {
            setDragOffset({
              x: constrainedDragOffsetX,
              y: constrainedDragOffsetY,
            });
          }
        }

        // Update position
        setPosition((prevPosition) => {
          const hasSignificantChange =
            Math.abs(prevPosition.x - finalX) > 1 ||
            Math.abs(prevPosition.y - finalY) > 1 ||
            prevPosition.scale !== scale;

          if (hasSignificantChange) {
            return { x: finalX, y: finalY, scale };
          }
          return prevPosition;
        });

        // Only show bubble if user hasn't explicitly closed it
        if (!isUserClosed) {
          setIsVisible(true);
        }
        return;
      } else {
        console.log(
          "[AiMessageBubbleFloaty] ❌ Target component not found, falling back to text search"
        );
      }
    }

    // Fall back to text-based targeting
    if (!targetRange.current) return;

    const rect = targetRange.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = rect.left + rect.width / 2;
    let newY = rect.top;
    let scale = 1;

    // Apply drag offset with bounds checking
    let finalX = newX + dragOffset.x;
    let finalY = newY + dragOffset.y;

    // Calculate estimated bubble dimensions for bounds checking
    const estimatedBubbleWidth =
      Math.min(
        Math.max(
          (textSegments[currentSegmentIndex]?.length || 0) * 8 + 64,
          120
        ),
        320
      ) * scale;
    const estimatedBubbleHeight = 60 * scale; // Rough estimate for bubble height

    // Apply bounds checking to keep bubble within screen
    const halfBubbleWidth = estimatedBubbleWidth / 16;
    const margin = 10; // Small margin from screen edges
    const topMargin = 28; // Top safe area
    const bottomMargin = !isWideScreen ? 180 : margin; // Larger bottom safe area for mobile

    // Horizontal bounds checking
    const minX = halfBubbleWidth + margin;
    const maxX = viewportWidth - halfBubbleWidth - margin;
    finalX = Math.max(minX, Math.min(maxX, finalX));

    // Vertical bounds checking
    const minY = estimatedBubbleHeight + topMargin;
    const maxY = viewportHeight - bottomMargin;
    finalY = Math.max(minY, Math.min(maxY, finalY));

    // Update drag offset when dragging to reflect constrained position
    if (isDragging) {
      const constrainedDragOffsetX = finalX - newX;
      const constrainedDragOffsetY = finalY - newY;

      // Only update dragOffset if it's different from the intended offset (i.e., we hit a boundary)
      if (
        constrainedDragOffsetX !== dragOffset.x ||
        constrainedDragOffsetY !== dragOffset.y
      ) {
        setDragOffset({ x: constrainedDragOffsetX, y: constrainedDragOffsetY });
      }
    }

    // Update position
    setPosition((prevPosition) => {
      const hasSignificantChange =
        Math.abs(prevPosition.x - finalX) > 1 ||
        Math.abs(prevPosition.y - finalY) > 1 ||
        prevPosition.scale !== scale;

      if (hasSignificantChange) {
        return { x: finalX, y: finalY, scale };
      }
      return prevPosition;
    });

    // Only show bubble if user hasn't explicitly closed it
    if (!isUserClosed) {
      setIsVisible(true);
    }
  }, [
    floatingMessage?.targetComponent,
    findTargetComponent,
    targetRange,
    isUserClosed,
    dragOffset,
    isDragging,
    isWideScreen,
    currentSegmentIndex,
    textSegments,
  ]);

  // Throttled scroll handler
  // TODO: shouldn't need to recalculate position, as we should ideally place the bubble inside the parent element
  const throttledUpdatePosition = useCallback(() => {
    let ticking = false;

    const handleUpdate = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updatePosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    return handleUpdate;
  }, [updatePosition]);

  // Initialize target text finding and position tracking
  useEffect(() => {
    // Check if we have a target component selector
    if (floatingMessage?.targetComponent) {
      const component = findTargetComponent();
      if (component) {
        targetElement.current = component;
        updatePosition();

        // Add scroll listener with throttling
        const handleScroll = throttledUpdatePosition();

        // Add listeners to multiple potential scroll containers
        const scrollContainers = [
          window,
          document,
          document.documentElement,
          document.body,
        ];

        // Find scrollable parent containers
        let element = component.parentElement;
        while (element && element !== document.body) {
          const style = window.getComputedStyle(element);
          if (
            style.overflow === "scroll" ||
            style.overflow === "auto" ||
            style.overflowY === "scroll" ||
            style.overflowY === "auto"
          ) {
            scrollContainers.push(element);
          }
          element = element.parentElement;
        }

        // Add event listeners to all potential scroll containers
        scrollContainers.forEach((container) => {
          if (container === window) {
            container.addEventListener("scroll", handleScroll, {
              passive: true,
            });
            container.addEventListener("resize", handleScroll, {
              passive: true,
            });
          } else {
            (container as Element).addEventListener("scroll", handleScroll, {
              passive: true,
            });
          }
        });

        // Set up observer to watch for DOM changes that might affect the target component
        const observer = new MutationObserver(() => {
          // Re-find the target component in case DOM changed
          const newComponent = findTargetComponent();
          if (newComponent) {
            targetElement.current = newComponent;
            updatePosition();
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
        });

        return () => {
          scrollContainers.forEach((container) => {
            if (container === window) {
              container.removeEventListener("scroll", handleScroll);
              container.removeEventListener("resize", handleScroll);
            } else {
              (container as Element).removeEventListener(
                "scroll",
                handleScroll
              );
            }
          });
          observer.disconnect();
        };
      } else {
        console.log(
          "[AiMessageBubbleFloaty] ❌ Target component not found, falling back to text search"
        );
      }
    }

    // Fall back to text-based targeting
    const range = findTargetText();
    if (range) {
      targetRange.current = range;
      updatePosition();

      // Add scroll listener with throttling
      const handleScroll = throttledUpdatePosition();

      // Add listeners to multiple potential scroll containers
      const scrollContainers = [
        window,
        document,
        document.documentElement,
        document.body,
      ];

      // Find scrollable parent containers
      let element = range.startContainer.parentElement;
      while (element && element !== document.body) {
        const style = window.getComputedStyle(element);
        if (
          style.overflow === "scroll" ||
          style.overflow === "auto" ||
          style.overflowY === "scroll" ||
          style.overflowY === "auto"
        ) {
          scrollContainers.push(element);
        }
        element = element.parentElement;
      }

      // Add event listeners to all potential scroll containers
      scrollContainers.forEach((container) => {
        if (container === window) {
          container.addEventListener("scroll", handleScroll, { passive: true });
          container.addEventListener("resize", handleScroll, { passive: true });
        } else {
          (container as Element).addEventListener("scroll", handleScroll, {
            passive: true,
          });
        }
      });

      // Also trigger on any potential DOM changes that might affect layout
      const observer = new MutationObserver(() => {
        // Re-find the target text in case DOM changed
        const newRange = findTargetText();
        if (newRange) {
          targetRange.current = newRange;
          updatePosition();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return () => {
        scrollContainers.forEach((container) => {
          if (container === window) {
            container.removeEventListener("scroll", handleScroll);
            container.removeEventListener("resize", handleScroll);
          } else {
            (container as Element).removeEventListener("scroll", handleScroll);
          }
        });
        observer.disconnect();
      };
    } else {
      // Neither target component nor target text found, hide bubble
      setIsVisible(false);
    }
  }, [
    floatingMessage?.targetComponent,
    findTargetComponent,
    findTargetText,
    updatePosition,
    throttledUpdatePosition,
  ]);

  // Call onSegmentChange when reaching last segment - but only after user has navigated
  useEffect(() => {
    if (onSegmentChange && hasMultipleSegments && hasNavigated) {
      const isOnLastSegment = currentSegmentIndex === textSegments.length - 1;
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
    setCurrentSegmentIndex(0);
    setHasNavigated(false); // Reset navigation flag
    setIsUserClosed(false); // Reset user close state for new text
    // Reset drag state for new text
    setDragOffset({ x: 0, y: 0 });
    setHasBeenDragged(false);
    setIsDragging(false);
    setDraggedThisSession(false);

    // Trigger animation when text changes
    setIsAnimating(false);
    setIsFloating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
      // Start floating animation after initial animation completes
      setTimeout(() => setIsFloating(true), 100);
    }, 50); // Brief delay to ensure animation plays

    // Check if we should trigger effects immediately (single segment) or wait
    if (onSegmentChange) {
      if (textSegments.length === 1) {
        // Single segment - trigger immediately after animation
        setTimeout(() => {
          onSegmentChange(true);
        }, 200); // Increased delay to ensure bubble is fully rendered
      }
    }

    return () => clearTimeout(timer);
  }, [preprocessedText, onSegmentChange, textSegments.length]);

  // Shared drag logic
  const startDrag = useCallback(
    (clientX: number, clientY: number, target: HTMLElement) => {
      // Only start drag if not clicking on interactive elements
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "svg" ||
        target.tagName === "path"
      ) {
        return false; // Let click handlers work
      }

      setIsDragging(true);
      setDraggedThisSession(false); // Reset drag flag
      setDragStartPos({ x: clientX, y: clientY });
      setDragStartOffset({ ...dragOffset });
      return true;
    },
    [dragOffset]
  );

  const updateDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;

      const deltaX = clientX - dragStartPos.x;
      const deltaY = clientY - dragStartPos.y;

      // Check if we've moved enough to consider it a drag (threshold)
      const dragThreshold = 5; // pixels
      const hasDraggedEnough =
        Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold;

      if (hasDraggedEnough) {
        setDraggedThisSession(true);
      }

      setDragOffset({
        x: dragStartOffset.x + deltaX,
        y: dragStartOffset.y + deltaY,
      });

      setHasBeenDragged(true);
    },
    [isDragging, dragStartPos, dragStartOffset]
  );

  const endDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const started = startDrag(e.clientX, e.clientY, e.target as HTMLElement);
    if (started) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      updateDrag(e.clientX, e.clientY);
    },
    [updateDrag]
  );

  const handleMouseUp = useCallback(() => {
    endDrag();
  }, [endDrag]);

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return; // Only handle single touch

    const touch = e.touches[0];
    const started = startDrag(
      touch.clientX,
      touch.clientY,
      e.target as HTMLElement
    );
    if (started) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return; // Only handle single touch

      e.preventDefault(); // Prevent scrolling
      const touch = e.touches[0];
      updateDrag(touch.clientX, touch.clientY);
    },
    [updateDrag]
  );

  const handleTouchEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  // Prevent click events if we just finished dragging
  const handleClick = (e: React.MouseEvent) => {
    if (draggedThisSession) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Original click logic
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

  const handleLeftHalfClick = (e: React.MouseEvent) => {
    if (draggedThisSession) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    e.preventDefault();
    if (currentSegmentIndex > 0) {
      setHasNavigated(true);
      setCurrentSegmentIndex((prev) => prev - 1);
    }
  };

  const handleRightHalfClick = (e: React.MouseEvent) => {
    if (draggedThisSession) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    e.preventDefault();
    if (hasMultipleSegments) {
      if (currentSegmentIndex < textSegments.length - 1) {
        setHasNavigated(true);
        setCurrentSegmentIndex((prev) => prev + 1);
      }
    } else {
      // For single segment, clicking should hide it
      // setIsVisible(false);
    }
  };

  const handleLeftClick = (e: React.MouseEvent) => {
    if (draggedThisSession) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    if (currentSegmentIndex > 0) {
      setHasNavigated(true); // Mark that user has navigated
      setCurrentSegmentIndex((prev) => prev - 1);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    if (draggedThisSession) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    if (currentSegmentIndex < textSegments.length - 1) {
      setHasNavigated(true); // Mark that user has navigated
      setCurrentSegmentIndex((prev) => prev + 1);
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    if (draggedThisSession) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    setIsVisible(false);
    setIsUserClosed(true);
  };

  // Add global mouse and touch event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  // Message submission handlers
  const handleMessageSubmit = () => {
    if (messageText.trim() && handleSendMessage) {
      handleSendMessage(messageText);
      setMessageText("");
      setIsVisible(false);
      setIsUserClosed(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleMessageSubmit();
    }
  };

  const currentText = textSegments[currentSegmentIndex];
  const isLastSegment = currentSegmentIndex === textSegments.length - 1;

  if (!floatingMessage || !isVisible || !currentText) {
    return null;
  }

  // Calculate estimated bubble width based on text length
  // Base width: ~16px per character + padding (~32px) + some buffer
  const estimatedBubbleWidth =
    Math.min(
      Math.max(currentText.length * 8 + 64, 120), // Minimum 120px, ~8px per char + padding
      320 // Max width from max-w-80 (320px)
    ) * position.scale;

  // Determine if we're in the safe area (considering bubble width)
  const halfBubbleWidth = estimatedBubbleWidth / 2;
  const isInLeftSafeArea = position.x < halfBubbleWidth + 20; // 20px buffer from left edge
  const isInRightSafeArea =
    position.x > (window?.innerWidth || 1200) - halfBubbleWidth - 20; // 20px buffer from right edge

  // Choose positioning based on safe area
  let transformX = "-50%"; // Default: center
  // let tailPosition = "left-10 -translate-x-0";
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
      className={`fixed ${isLastSegment ? "z-[5000]" : "z-[5000]"}`}
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(${transformX}, -100%) scale(${position.scale}) ${
          isAnimating ? "translateY(-8px)" : "translateY(0px)"
        }`,
        pointerEvents: "auto",
        transformOrigin: "center bottom",
        transition: !isDragging
          ? "left 150ms ease-out, top 150ms ease-out"
          : "none",
      }}
    >
      <div
        ref={bubbleRef}
        className={`bg-[#333333] w-auto max-w-80 p-3 px-4 rounded-[32px] text-white flex items-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.15)] hover:bg-[#404040] transition-all duration-300 ease-out relative z-10 ${
          isHidden ? "opacity-0" : isAnimating ? "opacity-0" : "opacity-100"
        } ${isFloating ? "animate-float" : ""}`}
        style={{
          pointerEvents: "auto",
          cursor: isDragging ? "grabbing" : "all-scroll",
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <style jsx>{`
          @keyframes float {
            0%,
            100% {
              transform: translateY(-8px);
            }
            50% {
              transform: translateY(-4px);
            }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>

        <>
          <div className="block md:hidden">
            <svg
              width="10"
              height="32"
              viewBox="0 0 5 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.80371 15.9404C2.9707 16.3359 3.31348 16.5996 3.71777 16.5996C4.37695 16.5996 4.83398 16.1162 4.83398 15.5186C4.83398 15.1934 4.64941 14.7803 4.52637 14.4727L2.15332 8.63672L4.52637 2.80078C4.64941 2.49316 4.83398 2.07129 4.83398 1.75488C4.83398 1.15723 4.37695 0.673828 3.71777 0.673828C3.31348 0.673828 2.9707 0.9375 2.80371 1.32422L0.386719 7.25684C0.193359 7.72266 0 8.18848 0 8.63672C0 9.07617 0.193359 9.54199 0.386719 10.0166L2.80371 15.9404Z"
                fill={
                  currentSegmentIndex > 0 ? "white" : "rgba(255,255,255,0.3)"
                }
              />
            </svg>
          </div>
          <div className="text-sm font-rounded-heavy leading-[1.2] text-center min-w-32">
            {/* {currentText} */}
            <ReactMarkdown
              className={`markdown-styles [&_strong]:font-[400] `}
              remarkPlugins={[
                remarkGfm,
                [remarkMath, { singleDollarTextMath: true }],
                supersub,
              ]}
              rehypePlugins={[rehypeKatex, rehypeRaw]}
              components={{
                // p: ({ node, ...props }) => <p className="" {...props} />,
                // h1: ({ node, ...props }) => <h2 className="mt-10 mb-2 text-base font-medium" {...props} />,
                ul: ({ node, ...props }) => (
                  <ul className="list-disc pl-2 ml-5 mb-3" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal pl-2 ml-5 mb-3" {...props} />
                ),
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                // Custom span renderer to replace action placeholders
                span: ({ node, className, ...props }) => {
                  if (className === "add-expression") {
                    return <AddExpressionIcon />;
                  } else if (className === "add-regression") {
                    return <AddRegressionIcon />;
                  } else if (className === "copy-expression") {
                    return <CopyExpressionIcon />;
                  } else if (className === "suggested-zoom") {
                    return <SuggestedZoomIcon />;
                  }
                  return <span className={className} {...props} />;
                },
              }}
            >
              {currentText}
            </ReactMarkdown>

            {!hasMultipleSegments && (
              <svg
                onClick={handleCloseClick}
                className="inline-block mt-2 z-10"
                style={{ cursor: "pointer" }}
                width="12"
                height="12"
                viewBox="0 0 20 19"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.99121 18.7422C14.9746 18.7422 19.0879 14.6289 19.0879 9.6543C19.0879 4.67969 14.9658 0.566406 9.98242 0.566406C5.00781 0.566406 0.90332 4.67969 0.90332 9.6543C0.90332 14.6289 5.0166 18.7422 9.99121 18.7422ZM6.99414 13.4863C6.52832 13.4863 6.15918 13.1172 6.15918 12.6426C6.15918 12.4316 6.24707 12.2207 6.41406 12.0625L8.80469 9.66309L6.41406 7.27246C6.24707 7.11426 6.15918 6.90332 6.15918 6.69238C6.15918 6.21777 6.52832 5.85742 6.99414 5.85742C7.24023 5.85742 7.43359 5.93652 7.5918 6.09473L9.99121 8.48535L12.3994 6.08594C12.5752 5.91895 12.7598 5.83984 12.9971 5.83984C13.4629 5.83984 13.832 6.20898 13.832 6.6748C13.832 6.89453 13.7441 7.08789 13.5771 7.26367L11.1865 9.66309L13.5771 12.0537C13.7354 12.2207 13.8232 12.4229 13.8232 12.6426C13.8232 13.1172 13.4541 13.4863 12.9795 13.4863C12.9795 13.4863 12.54 13.3984 12.373 13.2402L9.99121 10.8584L7.60938 13.2402C7.45117 13.4072 7.24023 13.4863 6.99414 13.4863Z"
                  fill="white"
                />
              </svg>
            )}

            <>
              {hasMultipleSegments && (
                <>
                  {/* Left half clickable area */}
                  <div
                    className="absolute left-0 top-0 w-1/2 h-full"
                    onClick={handleLeftHalfClick}
                    style={{ zIndex: 1, cursor: "inherit" }}
                  />

                  {/* Right half clickable area */}
                  <div
                    className="absolute right-0 top-0 w-1/2 h-full"
                    onClick={handleRightHalfClick}
                    style={{ zIndex: 1, cursor: "inherit" }}
                  />

                  <div className="-mb-1 flex items-center justify-center gap-1">
                    {/* Show left arrow for middle and last segments */}
                    <button
                      className="hidden md:flex pointer-events-none items-center justify-center w-6 h-4 hover:opacity-70 relative z-10"
                      // onClick={handleLeftClick}
                      style={{ cursor: "pointer" }}
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

                    <div className="inline-flex text-xs opacity-70 mt-1 mb-1">
                      {currentSegmentIndex + 1}/{textSegments.length}
                    </div>

                    {/* Show right arrow for first and middle segments */}
                    <button
                      className="hidden md:flex pointer-events-none items-center justify-center h-6 w-4 hover:opacity-70 relative z-10"
                      // onClick={handleRightClick}
                      style={{ cursor: "pointer" }}
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
                    {isLastSegment && (
                      <svg
                        onClick={handleCloseClick}
                        className="inline ml-1 hover:opacity-70 relative z-10"
                        style={{ cursor: "pointer" }}
                        width="12"
                        height="12"
                        viewBox="0 0 20 19"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9.99121 18.7422C14.9746 18.7422 19.0879 14.6289 19.0879 9.6543C19.0879 4.67969 14.9658 0.566406 9.98242 0.566406C5.00781 0.566406 0.90332 4.67969 0.90332 9.6543C0.90332 14.6289 5.0166 18.7422 9.99121 18.7422ZM6.99414 13.4863C6.52832 13.4863 6.15918 13.1172 6.15918 12.6426C6.15918 12.4316 6.24707 12.2207 6.41406 12.0625L8.80469 9.66309L6.41406 7.27246C6.24707 7.11426 6.15918 6.90332 6.15918 6.69238C6.15918 6.21777 6.52832 5.85742 6.99414 5.85742C7.24023 5.85742 7.43359 5.93652 7.5918 6.09473L9.99121 8.48535L12.3994 6.08594C12.5752 5.91895 12.7598 5.83984 12.9971 5.83984C13.4629 5.83984 13.832 6.20898 13.832 6.6748C13.832 6.89453 13.7441 7.08789 13.5771 7.26367L11.1865 9.66309L13.5771 12.0537C13.7354 12.2207 13.8232 12.4229 13.8232 12.6426C13.8232 13.1172 13.4541 13.4863 12.9795 13.4863C12.9795 13.4863 12.54 13.3984 12.373 13.2402L9.99121 10.8584L7.60938 13.2402C7.45117 13.4072 7.24023 13.4863 6.99414 13.4863Z"
                          fill="white"
                        />
                      </svg>
                    )}
                  </div>
                </>
              )}
            </>
          </div>
          <div className="block md:hidden">
            <svg
              width="10"
              height="32"
              viewBox="0 0 6 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.6123 15.9404L5.0293 10.0166C5.23145 9.54199 5.41602 9.07617 5.41602 8.63672C5.41602 8.18848 5.23145 7.72266 5.0293 7.25684L2.6123 1.32422C2.44531 0.9375 2.10254 0.673828 1.69824 0.673828C1.03906 0.673828 0.582031 1.15723 0.582031 1.75488C0.582031 2.07129 0.766602 2.49316 0.889648 2.80078L3.2627 8.63672L0.889648 14.4727C0.766602 14.7803 0.582031 15.1934 0.582031 15.5186C0.582031 16.1162 1.03906 16.5996 1.69824 16.5996C2.10254 16.5996 2.44531 16.3359 2.6123 15.9404Z"
                fill={
                  currentSegmentIndex < textSegments.length - 1
                    ? "white"
                    : "rgba(255,255,255,0.3)"
                }
              />
            </svg>
          </div>
        </>
        {/* tail of the bubble */}
        <svg
          className={`absolute -bottom-[7px] ${tailPosition} -scale-x-100`}
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
      {/* Reply button */}
      {false && !isWideScreen && isLastSegment && !hideMessageInput && (
        <div className="absolute top-full right-0 bg-white rounded-full z-[99999] shadow-[0_0_24px_rgba(0,0,0,0.2)] flex items-center">
          <textarea
            className="min-w-40 px-3 py-2 cursor-auto focus:outline-none text-sm text-black placeholder:text-[#000000]/50 resize-none bg-transparent"
            placeholder="Reply"
            rows={1}
            autoFocus={true}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="flex items-center justify-center px-2">
            <button
              className="w-6 h-6 rounded-full flex items-center justify-center"
              onClick={handleMessageSubmit}
            >
              <ArrowWithTailUpIcon
                backgroundColor={
                  messageText.trim().length > 0 ? "#00AEFF" : "#B3B3B3"
                }
                fillColor="white"
              />
            </button>
          </div>

          {/* <svg className="absolute right-5 -bottom-[7px]" width="17" height="8" viewBox="0 0 17 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.9 5.42335C11.3333 2.71167 15.1111 0.677918 17 0L0 -1.48619e-06C2.07778 1.80778 6.70237 6.04286 9.06667 7.4571C10.2 8.13502 12.6008 8.77685 11.9 5.42335Z" fill="white" />
          </svg> */}
        </div>
      )}
    </div>
  );
};

export default SpeechBubble;
