import { MarkingContext, QuestionWithMarkingResult } from "@/app/types/types";
import { useState, useRef, useEffect, useCallback } from "react";

const ReorderQuestion = ({
  currentQuestionWithMarkingResult,
  handleMarkQuestion,
  setUserAnswer,
}: {
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  handleMarkQuestion: (markingContext: MarkingContext) => void;
  setUserAnswer: (answer: string | string[] | { left?: string; right?: string }) => void;
}) => {
  // Initialize state with shuffled options
  const [currentOrder, setCurrentOrder] = useState<string[]>(
    Array.isArray(currentQuestionWithMarkingResult.options)
      ? currentQuestionWithMarkingResult.options.map(opt => typeof opt === 'string' ? opt : opt.option)
      : []
  );
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number>(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);

  // Touch handling state
  const [initialTouchPos, setInitialTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  
  // Enhanced state for animations
  const [itemPositions, setItemPositions] = useState<Record<string, number>>({});
  const [itemHeights, setItemHeights] = useState<Record<string, number>>({});
  const [lastTargetIndex, setLastTargetIndex] = useState<number>(-1);

  // Refs for DOM elements
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Constants
  const GAP = 8; // Gap between items
  const DRAG_THRESHOLD = 10; // Minimum movement to start drag

  // Safely get correct answer as string[] (may be stored as JSON string)
  const getCorrectAnswerArray = useCallback((): string[] => {
    const ca = currentQuestionWithMarkingResult.correctAnswer as unknown;
    if (Array.isArray(ca)) {
      return ca.map(v => typeof v === 'string' ? v : String((v as any)?.option ?? v));
    }
    if (typeof ca === 'string') {
      try {
        const parsed = JSON.parse(ca);
        return Array.isArray(parsed) ? parsed.map((v: any) => typeof v === 'string' ? v : String(v?.option ?? v)) : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [currentQuestionWithMarkingResult.correctAnswer]);

  // Calculate cumulative positions based on actual heights
  const calculatePositions = useCallback((order: string[], heights: Record<string, number>) => {
    const positions: Record<string, number> = {};
    let currentY = 0;
    
    order.forEach((item) => {
      positions[item] = currentY;
      const itemHeight = heights[item] || 56; // Fallback to default height
      currentY += itemHeight + GAP;
    });
    
    return positions;
  }, [GAP]);

  // Initialize item positions
  const initializePositions = useCallback((order: string[]) => {
    // Start with default heights for immediate positioning
    const defaultHeights: Record<string, number> = {};
    order.forEach(item => {
      defaultHeights[item] = 56; // Default button height
    });
    return calculatePositions(order, defaultHeights);
  }, [calculatePositions]);

  // Reset state when question changes
  useEffect(() => {
    // If userAnswer exists, use it as the order; otherwise use original options
    let newOrder: string[] = [];

    if (Array.isArray(currentQuestionWithMarkingResult.userAnswer) && currentQuestionWithMarkingResult.userAnswer.length > 0) {
      newOrder = currentQuestionWithMarkingResult.userAnswer as string[];
    } else {
      const options = currentQuestionWithMarkingResult.options;
      newOrder = Array.isArray(options)
        ? options.map(opt => typeof opt === 'string' ? opt : opt.option)
        : [];
    }

    setCurrentOrder(newOrder);
    setItemPositions(initializePositions(newOrder));
    setItemHeights({}); // Reset heights - items will be hidden until measured
    setDraggedItem(null);
    setDraggedFromIndex(-1);
    setIsDragging(false);
    setDragPosition(null);
    setIsCorrect(false);
    setLastTargetIndex(-1);
  }, [currentQuestionWithMarkingResult.legacyId, currentQuestionWithMarkingResult.options, initializePositions]);

  // Measure actual heights after render and update positions
  useEffect(() => {
    if (currentOrder.length === 0) return;

    const measureHeights = () => {
      const newHeights: Record<string, number> = {};
      let allMeasured = true;

      currentOrder.forEach(item => {
        const element = itemRefs.current.get(item);
        if (element) {
          // Measure the actual height of the button container
          const height = element.offsetHeight;
          newHeights[item] = height;
        } else {
          allMeasured = false;
        }
      });

      if (allMeasured) {
        setItemHeights(newHeights);
        // Recalculate positions with actual heights
        const newPositions = calculatePositions(currentOrder, newHeights);
        setItemPositions(newPositions);
        // Items will automatically become visible due to opacity change
      }
    };

    // Small delay to ensure elements are rendered
    const timeoutId = setTimeout(measureHeights, 100);
    return () => clearTimeout(timeoutId);
  }, [currentOrder, calculatePositions]);

  // Get option letter (A, B, C, D...)
  const getOptionLetter = (option: string) => {
    const options = currentQuestionWithMarkingResult.options;
    if (Array.isArray(options)) {
      const originalIndex = options.findIndex(opt => 
        typeof opt === 'string' ? opt === option : opt.option === option
      );
      return String.fromCharCode(65 + Math.max(0, originalIndex));
    }
    return "A";
  };

  // Calculate target index based on drag position
  const getTargetIndex = useCallback((clientY: number) => {
    if (!containerRef.current || Object.keys(itemHeights).length === 0) return -1;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeY = clientY - containerRect.top;
    
    // Find which item position the Y coordinate falls into
    let currentY = 0;
    for (let i = 0; i < currentOrder.length; i++) {
      const item = currentOrder[i];
      const itemHeight = itemHeights[item] || 56;
      const itemEnd = currentY + itemHeight + GAP;
      
      // If Y is in the first half of this item, target this index
      // If Y is in the second half, target the next index
      if (relativeY < currentY + itemHeight / 2) {
        return i;
      } else if (relativeY < itemEnd) {
        return Math.min(i + 1, currentOrder.length - 1);
      }
      
      currentY = itemEnd;
    }
    
    return currentOrder.length - 1;
  }, [currentOrder, itemHeights, GAP]);

  // Animate items to their new positions (inspired by react-native-drag-sort)
  const animateItemsToNewPositions = useCallback((fromIndex: number, toIndex: number) => {
    if (Object.keys(itemHeights).length === 0) return;

    // Create a new order with the dragged item moved to target position
    const newOrder = [...currentOrder];
    const draggedItemValue = currentOrder[fromIndex];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedItemValue);
    
    // Calculate new positions based on this temporary order
    const newPositions = calculatePositions(newOrder, itemHeights);
    
    setItemPositions(newPositions);
  }, [currentOrder, draggedItem, itemHeights, calculatePositions]);

  // Handle drag start
  const handleDragStart = useCallback((option: string, clientX: number, clientY: number) => {
    if (currentQuestionWithMarkingResult.annotatedAnswer || currentQuestionWithMarkingResult.userMark !== undefined) return;

    const fromIndex = currentOrder.indexOf(option);
    setDraggedItem(option);
    setDraggedFromIndex(fromIndex);
    setIsDragging(true);
    setLastTargetIndex(fromIndex);

    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setDragPosition({
        x: clientX - containerRect.left,
        y: clientY - containerRect.top
      });
    }
  }, [currentOrder, currentQuestionWithMarkingResult.annotatedAnswer, currentQuestionWithMarkingResult.userMark, isCorrect]);

  // Handle drag move
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !draggedItem || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    setDragPosition({
      x: clientX - containerRect.left,
      y: clientY - containerRect.top
    });

    const targetIndex = getTargetIndex(clientY);

    // Only animate if target index changed (like react-native-drag-sort)
    if (targetIndex !== lastTargetIndex && targetIndex >= 0) {
      animateItemsToNewPositions(draggedFromIndex, targetIndex);
      setLastTargetIndex(targetIndex);
    }
  }, [isDragging, draggedItem, draggedFromIndex, lastTargetIndex, getTargetIndex, animateItemsToNewPositions]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging || !draggedItem) return;

    // Finalize the order based on final target position
    if (lastTargetIndex >= 0 && lastTargetIndex !== draggedFromIndex) {
      const newOrder = [...currentOrder];
      newOrder.splice(draggedFromIndex, 1);
      newOrder.splice(lastTargetIndex, 0, draggedItem);
      setCurrentOrder(newOrder);

      // Update userAnswer to enable "Check answer" button
      setUserAnswer(newOrder);

      // Reset positions to match new order with current heights
      const newPositions = calculatePositions(newOrder, itemHeights);
      setItemPositions(newPositions);

      // Check if the new order is correct
      const correctAnswer = getCorrectAnswerArray();
      const isOrderCorrect = newOrder.every((item, index) => item === correctAnswer[index]);

      if (isOrderCorrect) {
        setIsCorrect(true);

        // Submit the answer
        setTimeout(() => {
          handleMarkQuestion({
            questionLegacyId: currentQuestionWithMarkingResult.legacyId.toString(),
            question: currentQuestionWithMarkingResult.questionText,
            correctAnswer: currentQuestionWithMarkingResult.correctAnswer,
            markMax: currentQuestionWithMarkingResult.maxMark,
            userAnswer: newOrder,
            canvas: currentQuestionWithMarkingResult.canvas,
            questionType: currentQuestionWithMarkingResult.questionType,
          });
        }, 10); // Small delay to show correct state
      }
    } else {
      // Reset positions if no actual move occurred
      const resetPositions = calculatePositions(currentOrder, itemHeights);
      setItemPositions(resetPositions);
    }

    setIsDragging(false);
    setDragPosition(null);
    setDraggedItem(null);
    setDraggedFromIndex(-1);
    setLastTargetIndex(-1);
  }, [isDragging, draggedItem, lastTargetIndex, draggedFromIndex, currentOrder, currentQuestionWithMarkingResult, handleMarkQuestion, calculatePositions, itemHeights, setUserAnswer]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent, option: string) => {
    e.stopPropagation();
    handleDragStart(option, e.clientX, e.clientY);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent, option: string) => {
    // Don't prevent default initially - allow scrolling
    e.stopPropagation();
    if (e.touches[0]) {
      const touch = e.touches[0];
      setInitialTouchPos({ x: touch.clientX, y: touch.clientY });
      setHasMoved(false);
      setDraggedItem(option);
      setDraggedFromIndex(currentOrder.indexOf(option));
    }
  };

  // Global mouse/touch move and end handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;

      const touch = e.touches[0];

      // Check if we've moved enough to start dragging
      if (!hasMoved && initialTouchPos) {
        const deltaX = Math.abs(touch.clientX - initialTouchPos.x);
        const deltaY = Math.abs(touch.clientY - initialTouchPos.y);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > DRAG_THRESHOLD) {
          // Start drag - now prevent default to stop scrolling
          e.preventDefault();
          setHasMoved(true);
          setIsDragging(true);
          setLastTargetIndex(draggedFromIndex);

          if (containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            setDragPosition({
              x: touch.clientX - containerRect.left,
              y: touch.clientY - containerRect.top
            });
          }
          handleDragMove(touch.clientX, touch.clientY);
        }
      } else if (hasMoved && isDragging) {
        // Already dragging - prevent default and continue
        e.preventDefault();
        handleDragMove(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      // Only process if we actually dragged
      if (hasMoved && isDragging) {
        handleDragEnd();
      }

      // Reset all touch state
      setDraggedItem(null);
      setDraggedFromIndex(-1);
      setIsDragging(false);
      setDragPosition(null);
      setInitialTouchPos(null);
      setHasMoved(false);
    };

    // Register touch listeners when touch starts (draggedItem is set)
    if (draggedItem && initialTouchPos) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    }

    // Register mouse listeners when dragging
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, draggedItem, initialTouchPos, hasMoved, draggedFromIndex, handleDragMove, handleDragEnd, DRAG_THRESHOLD]);

  // Get button state for each option
  const getButtonState = (option: string) => {
    // If question is marked, show correct/incorrect states
    if (currentQuestionWithMarkingResult.userMark !== undefined) {
      const correctAnswer = getCorrectAnswerArray();
      const currentIndex = currentOrder.indexOf(option);

      // Check if this item is in the correct position
      if (currentIndex >= 0 && correctAnswer[currentIndex] === option) {
        return "correct";
      } else {
        return "incorrect";
      }
    }

    if (draggedItem === option && isDragging) return "selected";
    return undefined;
  };

  // Get colors based on button state (from PrimaryButtonClicky)
  const getBackgroundColor = (state: string | undefined) => {
    switch (state) {
      case "correct":
        return "#E4FFB7";
      case "incorrect":
        return "#FDEEEE";
      case "selected":
        return "#DBF3FF";
      default:
        return "white";
    }
  };

  const getBorderColor = (state: string | undefined) => {
    switch (state) {
      case "correct":
        return "#7CC500";
      case "incorrect":
        return "#FF4B4C";
      case "selected":
        return "#06B0FF";
      default:
        return "#F0F0F0";
    }
  };

  const getTextColor = (state: string | undefined) => {
    switch (state) {
      case "correct":
        return "#7CC500";
      case "incorrect":
        return "#FF4B4C";
      case "selected":
        return "#06B0FF";
      default:
        return "rgba(0,0,0,0.8)";
    }
  };

  const getCircleBackgroundColor = (state: string | undefined) => {
    switch (state) {
      case "correct":
      case "incorrect":
      case "selected":
        return getBorderColor(state);
      default:
        return "transparent";
    }
  };

  const getCircleTextColor = (state: string | undefined) => {
    switch (state) {
      case "correct":
      case "incorrect":
      case "selected":
        return "white";
      default:
        return "rgba(0,0,0,0.8)";
    }
  };

  return (
    <div className="flex flex-col">
      <div
        ref={containerRef}
        className="px-4 md:px-6 pb-2 relative"
        style={{
          userSelect: 'none',
          height: Object.keys(itemHeights).length > 0
            ? Math.max(...Object.values(itemPositions)) + Math.max(...Object.values(itemHeights)) + GAP + 'px'
            : currentOrder.length * 72 + 'px' // Fallback height (56 + 16 gap)
        }}
      >
      {currentOrder.map((option) => {
        const isDraggedItem = draggedItem === option;
        const currentPosition = itemPositions[option] || 0;
        
        return (
          <div
            key={option}
            ref={(el) => {
              if (el) itemRefs.current.set(option, el);
            }}
            className="absolute w-full"
            style={{
              transform: `translateY(${currentPosition}px)`,
              transition: 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              zIndex: isDraggedItem && isDragging ? 50 : 10,
              opacity: Object.keys(itemHeights).length === 0 ? 0 : 1, // Hide until heights are measured
            }}
          >
            {isDraggedItem && isDragging && (
              // Dashed outline placeholder when dragging
              <div
                style={{
                  height: `${itemHeights[option] || 56}px`,
                  border: '4px dashed #f2f2f7',
                  borderStyle: 'dashed',
                  borderRadius: '16px',
                  margin: '0 4px', // Match button margin
                  backgroundColor: '#FAFAFD',
                }}
              />
            )}
            <div
              onMouseDown={(e) => handleMouseDown(e, option)}
              onTouchStart={(e) => handleTouchStart(e, option)}
              className={`py-4 px-4 rounded-[16px] text-sm font-rounded-bold border border-b-4 flex items-center gap-3 ${
                currentQuestionWithMarkingResult.annotatedAnswer || currentQuestionWithMarkingResult.userMark !== undefined ? "cursor-not-allowed" : "cursor-move"
              } ${isDraggedItem && isDragging ? "opacity-30 scale-95 border-dashed" : "hover:translate-y-[1px] hover:border-b-2 hover:mb-[2px]"}`}
              style={{
                touchAction: 'none',
                backgroundColor: getBackgroundColor(getButtonState(option)),
                borderColor: getBorderColor(getButtonState(option)),
                color: getTextColor(getButtonState(option)),
                opacity: isDraggedItem && isDragging ? 0 : 1,
                pointerEvents: isDraggedItem && isDragging ? 'none' : 'auto',
              }}
            >
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full border font-rounded-bold text-xs flex-shrink-0"
                style={{
                  backgroundColor: getCircleBackgroundColor(getButtonState(option)),
                  borderColor: getBorderColor(getButtonState(option)),
                  color: getCircleTextColor(getButtonState(option)),
                }}
              >
                {getOptionLetter(option)}
              </div>
              <span className="flex-1">{option}</span>
            </div>
          </div>
        );
      })}

        {/* Dragged item visual feedback */}
        {isDragging && draggedItem && dragPosition && (
          <div
            className="absolute pointer-events-none z-50"
            style={{
              left: dragPosition.x - 200, // Center the dragged item on cursor
              top: dragPosition.y - (itemHeights[draggedItem] || 56) / 2,
              transform: 'rotate(-2deg) scale(1.05)',
              width: '400px',
              opacity: 0.9,
            }}
          >
            <div className="py-3 px-4 bg-[#DBF3FF] border border-[#06B0FF] rounded-[16px] text-sm font-rounded-bold border-b-4 flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border border-[#06B0FF] bg-[#06B0FF] font-rounded-bold text-xs text-white flex-shrink-0">
                {getOptionLetter(draggedItem)}
              </div>
              <span className="flex-1 text-[#06B0FF]">{draggedItem}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReorderQuestion;
