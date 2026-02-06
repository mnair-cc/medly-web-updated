import { useRef, useState, useEffect, useCallback } from "react";
import { InputMode } from "../../../types";
import {
  Canvas,
  TextboxData,
  Highlight,
  CanvasMessage,
} from "@/app/types/types";
import Textbox from "./Textbox";
import InputHint from "./InputHint";
import AiMessageBubble from "./AiMessageBubble";
import SpeechBubble from "./AiMessageBubbleFloaty";
import FloatingToolbar from "./FloatingToolbar";
import { useResponsive } from "@/app/_hooks/useResponsive";
import SendButton from "@/app/_components/SendButton";
import CustomSketchCanvas from "../../question-breakdown/steps/CustomSketchCanvas";

const LearnModeSketchCanvas = ({
  inputMode,
  isDraggingPage,
  setInputMode,
  isReadOnly,
  isQuestionMarked,
  canvas,
  canvasMessage,
  updateQuestionCanvas,
  questionGroupId,
  questionLegacyId,
  questionAnnotations,
  handleSendMessage,
  shimmerTextboxIndices = [],
  fadeInTextboxIndices = [],
  onCanvasUpdate,
  isAwaitingResponse,
  isSolveTogether,
  onStrokeAdded,
  onStrokeRemoved,
  onEraseAction,
}: {
  inputMode: InputMode;
  isDraggingPage?: boolean;
  setInputMode: (inputMode: InputMode) => void;
  isReadOnly: boolean;
  isQuestionMarked?: boolean;
  canvas: Canvas | undefined;
  canvasMessage?: CanvasMessage[] | undefined;
  updateQuestionCanvas: (
    questionGroupId: number,
    questionLegacyId: string,
    canvas: Canvas
  ) => void;
  questionGroupId: number;
  questionLegacyId: string;
  questionAnnotations: Highlight[] | undefined;
  handleSendMessage: (message: string) => void;
  shimmerTextboxIndices?: number[];
  fadeInTextboxIndices?: number[];
  onCanvasUpdate?: (
    questionGroupId: number,
    questionLegacyId: string,
    oldCanvas: Canvas | undefined,
    newCanvas: Canvas
  ) => void;
  isAwaitingResponse?: boolean;
  isSolveTogether?: boolean;
  onStrokeAdded?: (
    questionId: string,
    canvasRef: any,
    strokeId: string,
    strokeData?: any
  ) => void;
  onStrokeRemoved?: (questionId: string, strokeId: string) => void;
  onEraseAction?: (questionId: string, canvasRef: any, erasedData: any) => void;
}) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const customSketchCanvasRef = useRef<any>(null);
  const { isTouchScreen } = useResponsive();

  // Local optimistic state for canvas - allows immediate UI updates without waiting for parent re-render
  const [localCanvas, setLocalCanvas] = useState<Canvas | undefined>(canvas);

  // Sync local canvas with prop when prop changes (e.g., from parent re-render or initial load)
  useEffect(() => {
    setLocalCanvas(canvas);
  }, [canvas]);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
  const [hoveredTextboxIndex, setHoveredTextboxIndex] = useState<number | null>(
    null
  );
  const [draggedTextboxIndex, setDraggedTextboxIndex] = useState<number | null>(
    null
  );
  const [selectedTextboxIndex, setSelectedTextboxIndex] = useState<
    number | null
  >(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [editingTextboxIndex, setEditingTextboxIndex] = useState<number | null>(
    null
  );
  const [copiedTextbox, setCopiedTextbox] = useState<TextboxData | null>(null);
  const [isBlankTextbox, setIsBlankTextbox] = useState<boolean>(false);
  const [clearInputHintText, setClearInputHintText] = useState<boolean>(false);
  const [isHoveringInteractive, setIsHoveringInteractive] =
    useState<boolean>(false);
  const pressedInteractiveElRef = useRef<HTMLElement | null>(null);
  const isTouchingRef = useRef<boolean>(false);
  const previousEditingIndexRef = useRef<number | null>(null);
  const canvasBeforeEditRef = useRef<Canvas | undefined>(undefined);
  const isNewTextboxRef = useRef<boolean>(false);
  const lastTapTimeRef = useRef<number>(0);
  const lastTappedIndexRef = useRef<number | null>(null);
  // Track the working position during drag to survive parent re-renders
  const dragWorkingPosRef = useRef<{ x: number; y: number } | null>(null);
  // Track drag start position in ref to avoid state updates during drag
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Track textbox position at START of drag (read from DOM, not React state)
  const dragBasePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Track scrollable element for manual horizontal scrolling (tables)
  const scrollableElementRef = useRef<Element | null>(null);
  const scrollStartXRef = useRef<number>(0);
  const scrollStartScrollLeftRef = useRef<number>(0);

  // Detect and pass clicks through to underlying interactive elements (e.g., buttons)
  // Exclude textbox-related elements (contenteditable, math-field, data-textbox-index) to prevent infinite loops
  const isInteractiveUnderlying = useCallback(
    (clientX: number, clientY: number) => {
      const container = canvasContainerRef.current;
      if (!container) return false;
      const previous = container.style.pointerEvents;
      container.style.pointerEvents = "none";
      const underlying = document.elementFromPoint(
        clientX,
        clientY
      ) as HTMLElement | null;
      container.style.pointerEvents = previous || "";
      if (!underlying) return false;

      // Exclude textbox-related elements to prevent infinite recursion
      if (
        underlying.closest(
          '[data-textbox-index], [contenteditable="true"], math-field'
        )
      ) {
        return false;
      }

      const interactiveSelector =
        'button, [role="button"], a, input, textarea, select, [data-clickable]';
      return !!underlying.closest(interactiveSelector);
    },
    []
  );

  const getUnderlyingInteractiveElement = useCallback(
    (clientX: number, clientY: number) => {
      const container = canvasContainerRef.current;
      if (!container) return null;
      const previous = container.style.pointerEvents;
      container.style.pointerEvents = "none";
      const el = document.elementFromPoint(
        clientX,
        clientY
      ) as HTMLElement | null;
      container.style.pointerEvents = previous || "";
      if (!el) return null;

      // Exclude textbox-related elements to prevent infinite recursion
      if (
        el.closest('[data-textbox-index], [contenteditable="true"], math-field')
      ) {
        return null;
      }

      return el.closest(
        'button, [role="button"], a, input, textarea, select, [data-clickable]'
      ) as HTMLElement | null;
    },
    []
  );

  const forwardMouseDownToUnderlying = useCallback(
    (clientX: number, clientY: number) => {
      const el = getUnderlyingInteractiveElement(clientX, clientY);
      if (el) {
        // Create event with cancelable: false to prevent it from being stopped
        // and use bubbles: false to prevent it from bubbling back up
        const syntheticEvent = new MouseEvent("mousedown", {
          bubbles: false,
          cancelable: false,
          clientX,
          clientY,
        });
        el.dispatchEvent(syntheticEvent);
        pressedInteractiveElRef.current = el;
      }
    },
    [getUnderlyingInteractiveElement]
  );

  const forwardMouseUpAndClickToUnderlying = useCallback(
    (clientX: number, clientY: number) => {
      const el =
        pressedInteractiveElRef.current ||
        getUnderlyingInteractiveElement(clientX, clientY);
      if (el) {
        // Create events with bubbles: false to prevent them from bubbling back up
        const syntheticMouseUp = new MouseEvent("mouseup", {
          bubbles: false,
          cancelable: false,
          clientX,
          clientY,
        });
        el.dispatchEvent(syntheticMouseUp);
        el.click();
      }
      pressedInteractiveElRef.current = null;
    },
    [getUnderlyingInteractiveElement]
  );

  const handleCanvasClick = (e: React.MouseEvent) => {
    // If clicking over an underlying interactive element, ignore (handled in mouseup)
    if (isInteractiveUnderlying(e.clientX, e.clientY)) {
      return;
    }

    // Don't handle any canvas interactions in grab mode
    if (inputMode === "grab") return;

    if (inputMode === "message") {
      handleResetInputMode();
      return;
    }

    if (selectedTextboxIndex !== null) {
      setSelectedTextboxIndex(null);
      return;
    }

    if ((inputMode !== "text" && inputMode !== "math") || isReadOnly) return;

    // Check if the click is on a textbox
    const target = e.target as HTMLElement;
    if (target.closest('[contenteditable="true"]')) {
      return;
    }

    handleCreateTextbox(e.clientX, e.clientY);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    // If double-clicking over an underlying interactive element, don't create textbox
    if (isInteractiveUnderlying(e.clientX, e.clientY)) {
      return;
    }
    // Don't create textbox if in read-only mode
    if (isReadOnly) return;

    // If hovering over an existing textbox, handle error removal for math textboxes
    if (hoveredTextboxIndex !== null) {
      const textbox = localCanvas?.textboxes?.[hoveredTextboxIndex];
      if (textbox && textbox.isMath && textbox.text.includes("\\error{")) {
        // Remove all \error{...} commands from the text
        const cleanedText = textbox.text.replace(/\\error\{([^}]*)\}/g, "$1");

        // Update the textbox with cleaned text
        handleUpdateTextbox(hoveredTextboxIndex, {
          ...textbox,
          text: cleanedText,
        });
      }
      return;
    }

    // Determine the correct input mode
    const targetInputMode = questionLegacyId.toLowerCase().includes("math")
      ? "math"
      : "math";

    // Reset input mode first
    handleResetInputMode();

    // Then create a new textbox with the correct input mode
    handleCreateTextbox(e.clientX, e.clientY, targetInputMode);
  };

  const handleCreateTextbox = (
    xPos: number,
    yPos: number,
    overrideInputMode?: "text" | "math"
  ) => {
    if (!canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = xPos - rect.left + 0;
    const y = yPos - rect.top - 16;
    const effectiveInputMode = overrideInputMode || inputMode;
    const newTextbox: TextboxData = {
      x,
      y,
      text: "",
      fontSize: 16,
      color: isQuestionMarked ? "#1CA4FF" : "#000000",
      isMath: effectiveInputMode === "math",
    };

    // Store the canvas state before adding the new textbox
    const oldCanvas = localCanvas;

    const newCanvas = {
      ...localCanvas,
      textboxes: [...(localCanvas?.textboxes || []), newTextbox],
    };

    // Update local state immediately for instant UI feedback
    setLocalCanvas(newCanvas);
    // Then persist to parent (async, won't block UI)
    updateQuestionCanvas(questionGroupId, questionLegacyId, newCanvas);

    // Set the new textbox to edit mode
    const newTextboxIndex = localCanvas?.textboxes?.length || 0;
    setEditingTextboxIndex(newTextboxIndex);
    setSelectedTextboxIndex(newTextboxIndex);
    setIsBlankTextbox(true);

    // Mark this as a new textbox (don't capture canvas here - let useEffect do it)
    isNewTextboxRef.current = true;
  };

  const handleUpdateTextbox = (index: number, textboxData: TextboxData) => {
    // CRITICAL FIX: Check if the textbox actually changed before updating
    const currentTextbox = localCanvas?.textboxes?.[index];
    if (
      currentTextbox &&
      currentTextbox.text === textboxData.text &&
      currentTextbox.x === textboxData.x &&
      currentTextbox.y === textboxData.y &&
      currentTextbox.fontSize === textboxData.fontSize &&
      currentTextbox.color === textboxData.color &&
      currentTextbox.isMath === textboxData.isMath
    ) {
      return;
    }

    const newCanvas = {
      ...localCanvas,
      textboxes: localCanvas?.textboxes?.map((textbox, i) => {
        if (i === index) return textboxData;
        return textbox;
      }),
    };

    // Update local state immediately for instant UI feedback
    setLocalCanvas(newCanvas);
    // Then persist to parent
    updateQuestionCanvas(questionGroupId, questionLegacyId, newCanvas);
  };

  // Function to insert text into the currently editing math textbox
  const insertTextAtCursor = useCallback(
    (textToInsert: string) => {
      if (editingTextboxIndex === null) return;

      const textbox = localCanvas?.textboxes?.[editingTextboxIndex];
      if (!textbox || !textbox.isMath) return;

      // Find the math-field element for the current textbox within this specific canvas
      const mathField = document.querySelector(
        `[data-canvas-id="${questionLegacyId}"] [data-textbox-index="${editingTextboxIndex}"] math-field`
      ) as any; // MathfieldElement type

      if (mathField && mathField.insert) {
        try {
          // Use MathLive's insert method to add the LaTeX
          mathField.insert(textToInsert);

          // Update the textbox data with the new value
          const updatedText = mathField.value || "";
          handleUpdateTextbox(editingTextboxIndex, {
            ...textbox,
            text: updatedText,
          });
        } catch (error) {
          console.warn("Failed to insert text into math field:", error);
        }
      }
    },
    [editingTextboxIndex, localCanvas, handleUpdateTextbox, questionLegacyId]
  );

  const handleDeleteTextbox = useCallback(
    (index: number, clearSelectedAndEditing: boolean = true) => {
      const oldCanvas = localCanvas;
      const deletedTextbox = localCanvas?.textboxes?.[index];
      const updatedCanvas = {
        ...localCanvas,
        textboxes: localCanvas?.textboxes?.filter((_, i) => i !== index),
      };

      // Update local state immediately for instant UI feedback
      setLocalCanvas(updatedCanvas);
      // Then persist to parent
      updateQuestionCanvas(questionGroupId, questionLegacyId, updatedCanvas);

      // Only call the hook if the deleted textbox had content
      if (onCanvasUpdate && oldCanvas && deletedTextbox?.text?.trim()) {
        // onCanvasUpdate(questionGroupId, questionLegacyId, oldCanvas, updatedCanvas);
      }

      // Only clear selected and editing indices if they match the deleted textbox
      if (clearSelectedAndEditing) {
        if (selectedTextboxIndex === index) {
          setSelectedTextboxIndex(null);
        }
        if (editingTextboxIndex === index) {
          setEditingTextboxIndex(null);
        }
      }

      // Blur any focused elements to prevent focus transfer
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    [
      localCanvas,
      questionLegacyId,
      questionGroupId,
      updateQuestionCanvas,
      selectedTextboxIndex,
      editingTextboxIndex,
      onCanvasUpdate,
    ]
  );

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    if (isReadOnly) return;
    if (inputMode === "grab") return;
    // Ignore synthetic mouse events originating from touch interactions
    if (isTouchingRef.current) return;

    // If question is marked, only allow interaction with blue textboxes
    const textbox = localCanvas?.textboxes?.[index];
    if (isQuestionMarked && textbox?.color === "#000000") {
      return;
    }

    // Read current position from DOM (not React state) to handle rapid clicks
    // This ensures we get the latest position even if React hasn't re-rendered yet
    const textboxElement = canvasContainerRef.current?.querySelector(
      `[data-textbox-index="${index}"]`
    ) as HTMLElement;
    if (textboxElement) {
      const currentLeft =
        parseFloat(textboxElement.style.left) || textbox?.x || 0;
      const currentTop =
        parseFloat(textboxElement.style.top) || textbox?.y || 0;
      dragWorkingPosRef.current = { x: currentLeft, y: currentTop };
      // Store the base position at drag start (never updated during drag)
      dragBasePositionRef.current = { x: currentLeft, y: currentTop };
    } else if (textbox) {
      // Fallback to React state if DOM element not found
      dragWorkingPosRef.current = { x: textbox.x, y: textbox.y };
      dragBasePositionRef.current = { x: textbox.x, y: textbox.y };
    }

    // Store the original position for calculating transform offset
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };

    setDraggedTextboxIndex(index);
    setSelectedTextboxIndex(index);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchingRef.current) return;
      if (inputMode === "grab") return;

      // Check if we're actively dragging a textbox
      const isActiveDrag =
        draggedTextboxIndex !== null && dragWorkingPosRef.current;

      // Only update hover state when NOT dragging (skip state updates during drag for performance)
      if (!isActiveDrag) {
        setIsHoveringInteractive(isInteractiveUnderlying(e.clientX, e.clientY));
      }

      if (
        canvasContainerRef.current &&
        isActiveDrag &&
        dragWorkingPosRef.current
      ) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        // Calculate cumulative delta from drag start
        const deltaX = e.clientX - dragStartPosRef.current.x;
        const deltaY = e.clientY - dragStartPosRef.current.y;

        // Use base position from drag start (from DOM, not stale React state)
        const baseX = dragBasePositionRef.current.x;
        const baseY = dragBasePositionRef.current.y;

        let newX = baseX + deltaX;
        let newY = baseY + deltaY;

        // Get the textbox element within THIS canvas (scoped selector)
        const textboxElement = canvasContainerRef.current?.querySelector(
          `[data-textbox-index="${draggedTextboxIndex}"]`
        ) as HTMLElement;
        if (textboxElement) {
          const textboxRect = textboxElement.getBoundingClientRect();
          const textboxWidth = textboxRect.width;
          const textboxHeight = textboxRect.height;

          // Constrain to canvas boundaries
          newX = Math.max(0, Math.min(newX, rect.width - textboxWidth));
          newY = Math.max(0, Math.min(newY, rect.height - textboxHeight));

          // Apply CSS transform for smooth visual update (bypasses React!)
          // Transform is relative to the DOM's current left/top (which equals baseX/baseY)
          const transformX = newX - baseX;
          const transformY = newY - baseY;
          textboxElement.style.transform = `translate(${transformX}px, ${transformY}px)`;
        } else {
          // Fallback if we can't get the element
          newX = Math.max(0, Math.min(newX, rect.width - 20));
          newY = Math.max(0, Math.min(newY, rect.height - 20));
        }

        // Store final position in ref for mouseup
        dragWorkingPosRef.current = { x: newX, y: newY };
      }
      // Update cursor position for the hint - skip during drag for performance
      if (canvasContainerRef.current && !isActiveDrag) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    [draggedTextboxIndex, isInteractiveUnderlying, inputMode]
  );

  const handleMouseUp = (e?: React.MouseEvent) => {
    if (isTouchingRef.current) return;
    if (inputMode === "grab") return;

    // Ignore events from textbox elements to prevent infinite recursion
    if (e) {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          '[data-textbox-index], [contenteditable="true"], math-field'
        )
      ) {
        // Still handle drag end if dragging
        if (
          draggedTextboxIndex !== null &&
          localCanvas &&
          dragWorkingPosRef.current
        ) {
          // Update DOM position directly AND clear transform atomically (no flash)
          const textboxElement = canvasContainerRef.current?.querySelector(
            `[data-textbox-index="${draggedTextboxIndex}"]`
          ) as HTMLElement;
          if (textboxElement) {
            // Set the final position directly in DOM before clearing transform
            textboxElement.style.left = `${dragWorkingPosRef.current.x}px`;
            textboxElement.style.top = `${dragWorkingPosRef.current.y}px`;
            textboxElement.style.transform = "";
          }

          // Use the final position from the ref
          const updatedTextboxes = [...(localCanvas?.textboxes || [])];
          const currentTextbox = updatedTextboxes[draggedTextboxIndex];
          if (currentTextbox) {
            updatedTextboxes[draggedTextboxIndex] = {
              ...currentTextbox,
              x: dragWorkingPosRef.current.x,
              y: dragWorkingPosRef.current.y,
            };
          }
          const newCanvas = {
            ...localCanvas,
            textboxes: updatedTextboxes,
          };
          // Update local state immediately
          setLocalCanvas(newCanvas);
          updateQuestionCanvas(questionGroupId, questionLegacyId, newCanvas);
        }
        setDraggedTextboxIndex(null);
        dragWorkingPosRef.current = null;
        return;
      }
    }

    if (e && pressedInteractiveElRef.current) {
      forwardMouseUpAndClickToUnderlying(e.clientX, e.clientY);
      e.preventDefault();
      e.stopPropagation();
    }

    if (
      draggedTextboxIndex !== null &&
      localCanvas &&
      dragWorkingPosRef.current
    ) {
      // Update DOM position directly AND clear transform atomically (no flash)
      const textboxElement = canvasContainerRef.current?.querySelector(
        `[data-textbox-index="${draggedTextboxIndex}"]`
      ) as HTMLElement;
      if (textboxElement) {
        // Set the final position directly in DOM before clearing transform
        textboxElement.style.left = `${dragWorkingPosRef.current.x}px`;
        textboxElement.style.top = `${dragWorkingPosRef.current.y}px`;
        textboxElement.style.transform = "";
      }

      // Use the final position from the ref
      const updatedTextboxes = [...(localCanvas?.textboxes || [])];
      const currentTextbox = updatedTextboxes[draggedTextboxIndex];
      if (currentTextbox) {
        updatedTextboxes[draggedTextboxIndex] = {
          ...currentTextbox,
          x: dragWorkingPosRef.current.x,
          y: dragWorkingPosRef.current.y,
        };
      }
      const newCanvas = {
        ...localCanvas,
        textboxes: updatedTextboxes,
      };
      // Update local state immediately
      setLocalCanvas(newCanvas);
      updateQuestionCanvas(questionGroupId, questionLegacyId, newCanvas);
    }
    setDraggedTextboxIndex(null);
    dragWorkingPosRef.current = null;
  };

  const handleResetInputMode = () => {
    if (questionLegacyId.toLowerCase().includes("math")) {
      setInputMode("math");
    } else {
      setInputMode("math");
    }
  };

  const handleCopyTextbox = () => {
    if (
      selectedTextboxIndex !== null &&
      localCanvas?.textboxes?.[selectedTextboxIndex]
    ) {
      const textboxToCopy = localCanvas?.textboxes[selectedTextboxIndex];
      setCopiedTextbox(textboxToCopy);
    }
  };

  const handlePasteTextbox = () => {
    if (copiedTextbox && localCanvas && localCanvas?.textboxes) {
      // Create new textbox with same properties but y+40
      const newTextbox: TextboxData = {
        ...copiedTextbox,
        x: copiedTextbox.x,
        y: copiedTextbox.y + 40,
      };

      const newCanvas = {
        ...localCanvas,
        textboxes: [...localCanvas?.textboxes, newTextbox],
      };

      // Update local state immediately
      setLocalCanvas(newCanvas);
      updateQuestionCanvas(questionGroupId, questionLegacyId, newCanvas);

      // Select the newly pasted textbox
      const newTextboxIndex = localCanvas?.textboxes.length;
      setSelectedTextboxIndex(newTextboxIndex);
    }
  };

  // Track when editing ends and call the hook
  useEffect(() => {
    // Check if we just finished editing (transitioned from editing to not editing)
    if (
      previousEditingIndexRef.current !== null &&
      editingTextboxIndex === null &&
      canvasBeforeEditRef.current &&
      localCanvas &&
      onCanvasUpdate
    ) {
      const editedTextboxIndex = previousEditingIndexRef.current;
      const oldCanvas = canvasBeforeEditRef.current;
      const newCanvas = localCanvas;

      // Check if the textbox still exists and has content
      const editedTextbox = newCanvas.textboxes?.[editedTextboxIndex];
      const oldTextbox = oldCanvas.textboxes?.[editedTextboxIndex];

      // Only fire the hook if there was a meaningful change
      // Check if the textbox was empty before and after (or deleted while empty)
      const oldTextboxText = oldTextbox?.text?.trim() || "";
      const newTextboxText = editedTextbox?.text?.trim() || "";

      // Don't fire if:
      // 1. Textbox was empty and remains empty
      // 2. Textbox was empty and was deleted
      const wasEmpty = oldTextboxText === "";
      const isEmpty = newTextboxText === "";
      const wasDeleted = !editedTextbox && oldTextbox;

      if (wasEmpty && (isEmpty || wasDeleted)) {
        // Empty textbox that stayed empty or was deleted - don't fire hook
      } else if (
        editedTextbox &&
        newTextboxText !== "" &&
        oldTextboxText !== newTextboxText
      ) {
        // Textbox exists, has content, and content changed - fire the hook
        onCanvasUpdate(questionGroupId, questionLegacyId, oldCanvas, newCanvas);
      } else if (wasDeleted && oldTextboxText !== "") {
        // Textbox with content was deleted - fire the hook
        onCanvasUpdate(questionGroupId, questionLegacyId, oldCanvas, newCanvas);
      }

      // Reset the refs
      canvasBeforeEditRef.current = undefined;
      isNewTextboxRef.current = false;
    }

    // When starting to edit (both new and existing textboxes), capture the canvas state
    if (
      editingTextboxIndex !== null &&
      (previousEditingIndexRef.current === null ||
        previousEditingIndexRef.current !== editingTextboxIndex)
    ) {
      // Deep copy the canvas and its textboxes (this now includes the new empty textbox if just created)
      canvasBeforeEditRef.current = localCanvas
        ? {
            ...localCanvas,
            textboxes: localCanvas?.textboxes
              ? localCanvas?.textboxes.map((tb) => ({ ...tb }))
              : [],
          }
        : undefined;
    }

    // Store current editing state for next comparison
    previousEditingIndexRef.current = editingTextboxIndex;

    // Reset the new textbox flag after we've captured the canvas
    if (editingTextboxIndex !== null && isNewTextboxRef.current) {
      isNewTextboxRef.current = false;
    }
  }, [
    editingTextboxIndex,
    canvas,
    onCanvasUpdate,
    questionGroupId,
    questionLegacyId,
  ]);

  useEffect(() => {
    // delete textbox when it's selected, not being edited and the backspace key is pressed
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field - if so, don't intercept keys
      const activeElement = document.activeElement;
      const isTypingInInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement instanceof HTMLElement &&
            activeElement.isContentEditable));

      // if (isBlankTextbox) {
      //   if (e.key === "?" && inputMode !== "message") {
      //     setSelectedTextboxIndex(null);
      //     e.preventDefault();
      //     e.stopPropagation();
      //     e.stopImmediatePropagation();
      //     setInputMode("message");
      //   } else if (e.key !== "Shift") {
      //     setIsBlankTextbox(false);
      //   }
      // }

      // "/" key to switch to message mode (only when no textbox is selected/editing and not typing in input)
      // if (
      //   (e.key === "/" || e.key === "?") &&
      //   !isReadOnly &&
      //   editingTextboxIndex === null &&
      //   inputMode !== "message"
      // ) {
      //   setSelectedTextboxIndex(null);
      //   e.preventDefault();
      //   e.stopPropagation();
      //   e.stopImmediatePropagation();

      //   setInputMode("message");
      //   return;
      // }

      // if (
      //   e.key === "?" &&
      //   !isReadOnly &&
      //   selectedTextboxIndex === null &&
      //   editingTextboxIndex === null &&
      //   !isTypingInInput
      // ) {
      //   e.preventDefault();
      //   e.stopPropagation();
      //   e.stopImmediatePropagation();
      //   handleSendMessage("Check my working");
      // }

      // Escape key to exit message mode
      if (e.key === "Escape" && inputMode === "message") {
        e.preventDefault();
        e.stopPropagation();
        setClearInputHintText(true);
        handleResetInputMode();
        setTimeout(() => setClearInputHintText(false), 100);
        return;
      }

      // Escape key to exit edit mode and deselect textboxes
      if (e.key === "Escape" && !isReadOnly) {
        e.preventDefault();
        e.stopPropagation();

        // Exit edit mode if currently editing
        if (editingTextboxIndex !== null) {
          setEditingTextboxIndex(null);
        }

        // Deselect any selected textbox
        if (selectedTextboxIndex !== null) {
          setSelectedTextboxIndex(null);
        }

        // Reset input mode to default (text)
        handleResetInputMode();

        // Blur any focused elements
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      // Enter key handling is now done through custom event system in Textbox component

      if (
        e.key === "Backspace" &&
        selectedTextboxIndex !== null &&
        !isReadOnly &&
        editingTextboxIndex === null
      ) {
        // If question is marked, only allow deletion of blue textboxes
        const textbox = localCanvas?.textboxes?.[selectedTextboxIndex];
        if (isQuestionMarked && textbox?.color === "#000000") {
          return;
        }

        handleDeleteTextbox(selectedTextboxIndex);
        setSelectedTextboxIndex(null);
      }

      // Copy textbox with Ctrl+C or Cmd+C
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "c" &&
        selectedTextboxIndex !== null &&
        !isReadOnly &&
        editingTextboxIndex === null &&
        !isTypingInInput
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleCopyTextbox();
        return;
      }

      // Paste textbox with Ctrl+V or Cmd+V
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "v" &&
        copiedTextbox &&
        !isReadOnly &&
        editingTextboxIndex === null &&
        !isTypingInInput
      ) {
        e.preventDefault();
        e.stopPropagation();
        handlePasteTextbox();
        return;
      }
    };

    // Use capture phase to intercept the event before it reaches other handlers
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [
    selectedTextboxIndex,
    isReadOnly,
    editingTextboxIndex,
    handleDeleteTextbox,
    inputMode,
    setInputMode,
    copiedTextbox,
    handleCopyTextbox,
    handlePasteTextbox,
  ]);

  // Deselect textbox when clicking outside this canvas
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const handleGlobalPointerOrTouchDown = (event: Event) => {
      const container = canvasContainerRef.current;
      if (!container) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (!container.contains(target)) {
        // CRITICAL FIX: If we have an active textbox being edited, force blur to commit content
        const activeEl = document.activeElement;
        if (activeEl instanceof HTMLElement && container.contains(activeEl)) {
          activeEl.blur();
        }

        // Small delay to allow blur handler to complete
        setTimeout(() => {
          // Clear editing and selection state if click is outside this canvas
          if (editingTextboxIndex !== null) {
            setEditingTextboxIndex(null);
          }
          if (selectedTextboxIndex !== null) {
            setSelectedTextboxIndex(null);
          }
        }, 10);
      }
    };

    document.addEventListener(
      "pointerdown",
      handleGlobalPointerOrTouchDown,
      true
    );
    document.addEventListener(
      "touchstart",
      handleGlobalPointerOrTouchDown,
      true
    );
    return () => {
      document.removeEventListener(
        "pointerdown",
        handleGlobalPointerOrTouchDown,
        true
      );
      document.removeEventListener(
        "touchstart",
        handleGlobalPointerOrTouchDown,
        true
      );
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [editingTextboxIndex, selectedTextboxIndex]);

  // While dragging on touch, prevent page from scrolling
  useEffect(() => {
    if (draggedTextboxIndex === null) return;
    const preventTouchScroll = (e: TouchEvent) => {
      e.preventDefault();
    };
    document.addEventListener("touchmove", preventTouchScroll, {
      passive: false,
    });
    return () => {
      document.removeEventListener("touchmove", preventTouchScroll);
    };
  }, [draggedTextboxIndex]);

  // Listen for custom mathfield-enter events from Textbox components
  useEffect(() => {
    const handleMathFieldEnter = (e: CustomEvent) => {
      const { textboxIndex, shiftKey, mathFieldElement } = e.detail;

      if (
        textboxIndex !== editingTextboxIndex ||
        isReadOnly ||
        !localCanvas?.textboxes?.[textboxIndex]
      ) {
        return;
      }

      if (shiftKey) {
        // Shift+Enter: insert line break within the same textbox
        if (mathFieldElement && mathFieldElement.insert) {
          try {
            mathFieldElement.insert("\\\\");
          } catch (error) {
            console.warn("Failed to insert line break in math field:", error);
          }
        }
      } else {
        // Regular Enter: Create new math textbox underneath
        const currentTextbox = localCanvas?.textboxes[textboxIndex];

        let updatedCanvas = localCanvas;

        // Check for meaningful text change and trigger onCanvasUpdate if needed
        if (canvasBeforeEditRef.current && localCanvas && onCanvasUpdate) {
          const oldCanvas = canvasBeforeEditRef.current;
          const editedTextbox = localCanvas?.textboxes?.[textboxIndex];
          const oldTextbox = oldCanvas.textboxes?.[textboxIndex];

          // Get the CURRENT text from the MathLive field since canvas state may not be synced yet
          // Add robust null checking for mathFieldElement
          let currentText = "";
          try {
            if (
              mathFieldElement &&
              typeof mathFieldElement.value === "string"
            ) {
              currentText = mathFieldElement.value.trim();
            }
          } catch (error) {
            console.warn("Failed to get current text from math field:", error);
          }
          const oldTextboxText = oldTextbox?.text?.trim() || "";

          // Only trigger if there's meaningful content change
          if (
            editedTextbox &&
            currentText !== "" &&
            oldTextboxText !== currentText
          ) {
            // Create updated canvas with current text
            const updatedTextbox = {
              ...editedTextbox,
              text: currentText,
            };
            updatedCanvas = {
              ...localCanvas,
              textboxes: localCanvas?.textboxes.map((tb, i) =>
                i === textboxIndex ? updatedTextbox : tb
              ),
            };

            onCanvasUpdate(
              questionGroupId,
              questionLegacyId,
              oldCanvas,
              updatedCanvas
            );
          }
        }

        // Create new math textbox at same x, y+40
        const newTextbox: TextboxData = {
          x: currentTextbox.x,
          y: currentTextbox.y + 40,
          text: "",
          fontSize: 16,
          color: isQuestionMarked === true ? "#1CA4FF" : "#000000",
          isMath: true,
        };

        const newCanvas = {
          ...updatedCanvas,
          textboxes: [...(updatedCanvas.textboxes || []), newTextbox],
        };

        updateQuestionCanvas(questionGroupId, questionLegacyId, newCanvas);

        // Set the new textbox to edit mode
        // Use the length of the updated canvas, not the old canvas
        const newTextboxIndex = newCanvas.textboxes.length - 1;
        setEditingTextboxIndex(newTextboxIndex);
        setSelectedTextboxIndex(newTextboxIndex);
        setIsBlankTextbox(true);

        // Mark this as a new textbox
        isNewTextboxRef.current = true;
      }
    };

    // Listen for the custom event on the canvas container
    const container = canvasContainerRef.current;
    if (container) {
      container.addEventListener(
        "mathfield-enter",
        handleMathFieldEnter as EventListener
      );
      return () => {
        container.removeEventListener(
          "mathfield-enter",
          handleMathFieldEnter as EventListener
        );
      };
    }
  }, [
    editingTextboxIndex,
    isReadOnly,
    canvas,
    onCanvasUpdate,
    questionGroupId,
    questionLegacyId,
    updateQuestionCanvas,
    isQuestionMarked,
  ]);

  // Add native touch event listeners with { passive: false } to allow preventDefault
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Don't handle textbox interactions in pen/eraser/grab mode
      if (
        inputMode === "pen" ||
        inputMode === "eraser" ||
        inputMode === "grab"
      ) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      // Check for scrollable element using elementsFromPoint (gets elements under canvas)
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const scrollableEl = elements
        .find((el) => el.closest("[data-scrollable]"))
        ?.closest("[data-scrollable]");

      if (scrollableEl) {
        // Store scrollable element and initial positions for manual scrolling
        scrollableElementRef.current = scrollableEl;
        scrollStartXRef.current = touch.clientX;
        scrollStartScrollLeftRef.current = scrollableEl.scrollLeft;
        return; // Don't set isTouchingRef - we're handling scroll manually
      }

      isTouchingRef.current = true;

      // Always update drag start position to prevent stale coordinates - use ref to avoid re-renders
      dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      // If touching an underlying interactive element, forward it
      if (isInteractiveUnderlying(touch.clientX, touch.clientY)) {
        const el = getUnderlyingInteractiveElement(
          touch.clientX,
          touch.clientY
        );
        if (el) pressedInteractiveElRef.current = el;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // If touching on a textbox, record start position for potential drag
      const target = e.target as HTMLElement;
      const textboxEl = target.closest(
        "[data-textbox-index]"
      ) as HTMLElement | null;
      if (textboxEl) {
        const attr = textboxEl.getAttribute("data-textbox-index");
        const index = attr ? parseInt(attr, 10) : NaN;
        if (!Number.isNaN(index) && !isReadOnly) {
          // If question is marked, only allow interaction with blue textboxes
          const textbox = localCanvas?.textboxes?.[index];
          if (isQuestionMarked && textbox?.color === "#000000") {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          setSelectedTextboxIndex(index);
          // Prevent the synthetic click from the canvas
          e.preventDefault();
          e.stopPropagation();
        }
      } else {
        // Clear selection when touching empty space to prevent ghost dragging
        if (selectedTextboxIndex !== null) {
          setSelectedTextboxIndex(null);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Handle scrollable element scrolling first (for tables)
      if (scrollableElementRef.current) {
        const touch = e.touches[0];
        if (touch) {
          const deltaX = scrollStartXRef.current - touch.clientX;
          scrollableElementRef.current.scrollLeft =
            scrollStartScrollLeftRef.current + deltaX;
          e.preventDefault(); // Prevent page scroll while scrolling table
        }
        return;
      }

      // Don't handle textbox dragging in pen/eraser/grab mode
      if (
        inputMode === "pen" ||
        inputMode === "eraser" ||
        inputMode === "grab"
      ) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      // Check if we should start dragging (significant movement detected)
      if (
        selectedTextboxIndex !== null &&
        draggedTextboxIndex === null &&
        editingTextboxIndex === null
      ) {
        // Use ref for delta calculation - no state updates during drag!
        const deltaX = touch.clientX - dragStartPosRef.current.x;
        const deltaY = touch.clientY - dragStartPosRef.current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Start drag if moved more than 10 pixels
        if (distance > 10) {
          // Read position from DOM (not React state) to handle rapid interactions
          const textboxElement = container.querySelector(
            `[data-textbox-index="${selectedTextboxIndex}"]`
          ) as HTMLElement | null;
          const textbox = localCanvas?.textboxes?.[selectedTextboxIndex];
          if (textboxElement) {
            const currentLeft =
              parseFloat(textboxElement.style.left) || textbox?.x || 0;
            const currentTop =
              parseFloat(textboxElement.style.top) || textbox?.y || 0;
            dragWorkingPosRef.current = { x: currentLeft, y: currentTop };
            dragBasePositionRef.current = { x: currentLeft, y: currentTop };
          } else if (textbox) {
            dragWorkingPosRef.current = { x: textbox.x, y: textbox.y };
            dragBasePositionRef.current = { x: textbox.x, y: textbox.y };
          }
          setDraggedTextboxIndex(selectedTextboxIndex);
        }
      }

      // Only handle move when dragging a textbox
      if (
        draggedTextboxIndex !== null &&
        canvasContainerRef.current &&
        dragWorkingPosRef.current
      ) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        // Calculate cumulative delta from drag start
        const deltaX = touch.clientX - dragStartPosRef.current.x;
        const deltaY = touch.clientY - dragStartPosRef.current.y;

        // Use base position from drag start (from DOM, not stale React state)
        const baseX = dragBasePositionRef.current.x;
        const baseY = dragBasePositionRef.current.y;

        let newX = baseX + deltaX;
        let newY = baseY + deltaY;

        // Scoped selector to this canvas container
        const textboxElement = container.querySelector(
          `[data-textbox-index="${draggedTextboxIndex}"]`
        ) as HTMLElement | null;
        if (textboxElement) {
          const textboxRect = textboxElement.getBoundingClientRect();
          const textboxWidth = textboxRect.width;
          const textboxHeight = textboxRect.height;
          newX = Math.max(0, Math.min(newX, rect.width - textboxWidth));
          newY = Math.max(0, Math.min(newY, rect.height - textboxHeight));

          // Apply CSS transform for smooth visual update (bypasses React!)
          const transformX = newX - baseX;
          const transformY = newY - baseY;
          textboxElement.style.transform = `translate(${transformX}px, ${transformY}px)`;
        } else {
          newX = Math.max(0, Math.min(newX, rect.width - 20));
          newY = Math.max(0, Math.min(newY, rect.height - 20));
        }

        // Store final position in ref for touchend
        dragWorkingPosRef.current = { x: newX, y: newY };

        // Prevent page from scrolling while dragging
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Clear scrollable element reference if we were scrolling
      if (scrollableElementRef.current) {
        scrollableElementRef.current = null;
        return;
      }

      // Don't handle textbox interactions in pen/eraser/grab mode
      if (
        inputMode === "pen" ||
        inputMode === "eraser" ||
        inputMode === "grab"
      ) {
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) return;

      // Check for double-tap on textbox to enter edit mode
      const target = e.target as HTMLElement;
      const textboxEl = target.closest(
        "[data-textbox-index]"
      ) as HTMLElement | null;
      if (textboxEl && draggedTextboxIndex === null) {
        const attr = textboxEl.getAttribute("data-textbox-index");
        const index = attr ? parseInt(attr, 10) : NaN;
        if (!Number.isNaN(index) && !isReadOnly) {
          const now = Date.now();
          const timeSinceLastTap = now - lastTapTimeRef.current;

          // Double-tap detected (within 300ms and same textbox)
          if (timeSinceLastTap < 300 && lastTappedIndexRef.current === index) {
            e.preventDefault();
            e.stopPropagation();
            setEditingTextboxIndex(index);
            lastTapTimeRef.current = 0;
            lastTappedIndexRef.current = null;
            isTouchingRef.current = false;
            return;
          } else {
            // Record this tap
            lastTapTimeRef.current = now;
            lastTappedIndexRef.current = index;
          }
        }
      }

      // Finish drag if any
      if (
        draggedTextboxIndex !== null &&
        localCanvas &&
        dragWorkingPosRef.current
      ) {
        // Update DOM position directly AND clear transform atomically (no flash)
        const textboxElement = container.querySelector(
          `[data-textbox-index="${draggedTextboxIndex}"]`
        ) as HTMLElement;
        if (textboxElement) {
          // Set the final position directly in DOM before clearing transform
          textboxElement.style.left = `${dragWorkingPosRef.current.x}px`;
          textboxElement.style.top = `${dragWorkingPosRef.current.y}px`;
          textboxElement.style.transform = "";
        }

        // Use the final position from the ref
        const updatedTextboxes = [...(localCanvas?.textboxes || [])];
        const currentTextbox = updatedTextboxes[draggedTextboxIndex];
        if (currentTextbox) {
          updatedTextboxes[draggedTextboxIndex] = {
            ...currentTextbox,
            x: dragWorkingPosRef.current.x,
            y: dragWorkingPosRef.current.y,
          };
        }
        const newCanvas = {
          ...localCanvas,
          textboxes: updatedTextboxes,
        };
        // Update local state immediately
        setLocalCanvas(newCanvas);
        updateQuestionCanvas(questionGroupId, questionLegacyId, newCanvas);
      }
      setDraggedTextboxIndex(null);
      dragWorkingPosRef.current = null;
      isTouchingRef.current = false;

      // Forward tap/click to underlying interactive element if any
      if (pressedInteractiveElRef.current) {
        forwardMouseUpAndClickToUnderlying(touch.clientX, touch.clientY);
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchCancel = () => {
      // Clear CSS transform if any (scoped to this canvas)
      if (draggedTextboxIndex !== null) {
        const textboxElement = container.querySelector(
          `[data-textbox-index="${draggedTextboxIndex}"]`
        ) as HTMLElement;
        if (textboxElement) {
          textboxElement.style.transform = "";
        }
      }
      setDraggedTextboxIndex(null);
      dragWorkingPosRef.current = null;
      isTouchingRef.current = false;
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: false });
    container.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [
    isReadOnly,
    isQuestionMarked,
    canvas,
    editingTextboxIndex,
    draggedTextboxIndex,
    questionGroupId,
    questionLegacyId,
    updateQuestionCanvas,
    setSelectedTextboxIndex,
    setDraggedTextboxIndex,
    inputMode,
  ]);

  // Sync CustomSketchCanvas eraser mode with inputMode
  useEffect(() => {
    if (customSketchCanvasRef.current) {
      customSketchCanvasRef.current.eraseMode(inputMode === "eraser");
    }
  }, [inputMode]);

  return (
    <div
      ref={canvasContainerRef}
      style={{
        // Canvas always sits behind interactive content (MCQs, buttons)
        // Strokes and textboxes appear behind buttons - this is intentional for Learn mode
        zIndex: 0,
        // Pointer events always enabled - buttons at z-50 will naturally receive clicks
        // Empty space clicks go to canvas for textbox creation
        pointerEvents: "auto",
      }}
      className={`absolute top-0 left-0 w-full h-full overflow-hidden ${
        isHoveringInteractive
          ? "cursor-pointer"
          : !isReadOnly && (inputMode === "text" || inputMode === "math")
            ? "cursor-text"
            : inputMode === "grab"
              ? isDraggingPage
                ? "cursor-grabbing"
                : "cursor-grab"
              : inputMode === "message"
                ? "cursor-triangle"
                : "cursor-triangle"
      }`}
      data-canvas-id={questionLegacyId}
      onMouseDown={(e) => {
        // Ignore events from textbox elements to prevent infinite recursion
        const target = e.target as HTMLElement;
        if (
          target.closest(
            '[data-textbox-index], [contenteditable="true"], math-field'
          )
        ) {
          return;
        }

        if (isInteractiveUnderlying(e.clientX, e.clientY)) {
          forwardMouseDownToUnderlying(e.clientX, e.clientY);
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onClick={handleCanvasClick}
      onDoubleClick={handleCanvasDoubleClick}
      onMouseMove={handleMouseMove}
      onMouseUp={(e) => handleMouseUp(e)}
      onMouseEnter={() => setIsHoveringCanvas(true)}
      onMouseLeave={() => {
        handleMouseUp();
        setIsHoveringCanvas(false);
        setIsHoveringInteractive(false);
      }}
    >
      {/* CustomSketchCanvas for pen/eraser drawing */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: inputMode === "pen" || inputMode === "eraser" ? 1000 : 1, // Well above FloatingToolbar (z-index: 100) in pen/eraser, below textboxes otherwise
          pointerEvents:
            inputMode === "pen" || inputMode === "eraser" ? "auto" : "none",
        }}
      >
        <CustomSketchCanvas
          ref={customSketchCanvasRef}
          isReadOnly={isReadOnly}
          width="100%"
          height="100%"
          strokeColor="#06B0FF"
          strokeWidth={4}
          eraserWidth={8}
          index={0}
          initialPaths={canvas}
          questionId={questionLegacyId}
          showPlaceholder={false}
          onStrokeAdded={onStrokeAdded}
          onStrokeRemoved={onStrokeRemoved}
          onEraseAction={onEraseAction}
          registerWithRegistryId={`sketch-canvas-${questionLegacyId}`}
          style={{ backgroundColor: "transparent" }}
          onStroke={(data, isEraser) => {
            // Merge with existing canvas data
            const mergedCanvas = {
              paths: data.paths !== undefined ? data.paths : canvas?.paths,
              textboxes: localCanvas?.textboxes,
              maths: canvas?.maths,
              stemPaths: canvas?.stemPaths, // Preserve stem strokes
            };
            updateQuestionCanvas(
              questionGroupId,
              questionLegacyId,
              mergedCanvas
            );
          }}
        />
      </div>

      {!isHoveringInteractive && !isTouchScreen && (
        <InputHint
          inputMode={inputMode}
          resetInputMode={handleResetInputMode}
          mousePosition={mousePosition}
          isReadOnly={isReadOnly}
          isHoveringOnTextbox={hoveredTextboxIndex !== null}
          isHoveringCanvas={isHoveringCanvas}
          handleSendMessage={handleSendMessage}
          clearMessageText={clearInputHintText}
        />
      )}

      {localCanvas?.textboxes?.map((textboxData, index) => {
        // Find the last textbox index (with content)
        const textboxes = localCanvas?.textboxes || [];
        let lastTextboxIndex = -1;
        let hasTextboxes = false;
        for (let i = textboxes.length - 1; i >= 0; i--) {
          if (textboxes[i].text.length > 0) {
            lastTextboxIndex = i;
            hasTextboxes = true;
            break;
          }
        }

        // Show send button on currently editing textbox (if editing), otherwise on last textbox
        const shouldShowSendButton =
          editingTextboxIndex !== null
            ? index === editingTextboxIndex
            : hasTextboxes && index === lastTextboxIndex;

        return (
          <div
            key={index}
            style={{
              position: "relative",
              // Textboxes above drawing paths (z-1) but below MCQ buttons
              zIndex: 10,
              pointerEvents:
                inputMode === "pen" || inputMode === "eraser" ? "none" : "auto",
            }}
          >
            <Textbox
              textboxData={textboxData}
              index={index}
              inputMode={inputMode}
              isReadOnly={
                isReadOnly ||
                (isQuestionMarked === true && textboxData.color === "#000000")
              }
              isBeingEdited={editingTextboxIndex === index}
              setEditingTextboxIndex={setEditingTextboxIndex}
              setHoveredTextboxIndex={setHoveredTextboxIndex}
              handleUpdateTextbox={handleUpdateTextbox}
              handleDeleteTextbox={() => handleDeleteTextbox(index, false)}
              onMouseDown={(e) => handleMouseDown(e, index)}
              questionAnnotations={questionAnnotations}
              showShimmer={shimmerTextboxIndices.includes(index)}
              fadeIn={fadeInTextboxIndices.includes(index)}
              shouldShowSendButton={false}
              handleSendMessage={handleSendMessage}
              isAwaitingResponse={isAwaitingResponse}
              isSolveTogether={isSolveTogether}
            />

            {/* Render FloatingToolbar for math textboxes being edited */}
            {editingTextboxIndex === index &&
              textboxData.isMath &&
              !isReadOnly && (
                <div
                  style={{
                    position: "absolute",
                    left: textboxData.x + 10, // Offset slightly to align better with textbox content
                    top: textboxData.y + 40, // Position above the textbox
                    zIndex: 100,
                  }}
                >
                  <FloatingToolbar
                    type={
                      questionLegacyId.toLowerCase().includes("chem")
                        ? "chem"
                        : "math"
                    }
                    onMultiplicationClick={() => insertTextAtCursor("\\times")}
                    onDivisionClick={() => insertTextAtCursor("\\div")}
                    onSuperscriptClick={() =>
                      insertTextAtCursor("^{\\placeholder{}}")
                    }
                    onSubscriptClick={() =>
                      insertTextAtCursor("_{\\placeholder{}}")
                    }
                    onFractionClick={() =>
                      insertTextAtCursor(
                        "\\frac{\\placeholder{}}{\\placeholder{}}"
                      )
                    }
                    onSquareRootClick={() =>
                      insertTextAtCursor("\\sqrt{\\placeholder{}}")
                    }
                    onRightArrowClick={() => insertTextAtCursor("\\rightarrow")}
                    onRightLeftHarpoonsClick={() =>
                      insertTextAtCursor("\\rightleftharpoons")
                    }
                    onRecurringDecimalClick={() =>
                      insertTextAtCursor("\\dot{\\placeholder{}}")
                    }
                    onIntegrationClick={() =>
                      insertTextAtCursor("\\int\\placeholder{}")
                    }
                    onDifferentiationClick={() =>
                      insertTextAtCursor(
                        "\\frac{d}{dx}\\left(\\placeholder{}\\right)"
                      )
                    }
                  />
                </div>
              )}
          </div>
        );
      })}

      {/* {canvasMessage?.map((message, index) => (
        <AiMessageBubble
          key={index}
          text={message.text || ""}
          x={message.x || 0}
          y={message.y || 0}
        />
      ))} */}

      {/* <SpeechBubble
        text="This bubble is positioned based on the word 'morphological' in the document! This is page 2. "
        targetText="Coll and colleagues reported a much higher number"
      // onSegmentChange={(isOnLastSegment) => {
      //   console.log('Segment change:', isOnLastSegment);
      // }}
      /> */}
    </div>
  );
};

export default LearnModeSketchCanvas;
