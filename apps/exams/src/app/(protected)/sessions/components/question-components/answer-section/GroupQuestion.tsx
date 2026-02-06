import { useState, useCallback, useRef, useEffect } from "react";
import { QuestionWithMarkingResult, MarkingContext } from "@/app/types/types";
import TickIcon from "@/app/_components/icons/TickIcon";

interface GroupQuestionProps {
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  handleMarkQuestion: (markingContext: MarkingContext) => void;
  setUserAnswer: (answer: string | string[] | { left?: string; right?: string } | Record<string, string[]>) => void;
}

export default function GroupQuestion({
  currentQuestionWithMarkingResult,
  handleMarkQuestion,
  setUserAnswer,
}: GroupQuestionProps) {
  // Parse correctAnswer to get groups and their correct items
  const correctAnswer = typeof currentQuestionWithMarkingResult.correctAnswer === 'string'
    ? JSON.parse(currentQuestionWithMarkingResult.correctAnswer)
    : currentQuestionWithMarkingResult.correctAnswer;

  const categories = Object.keys(correctAnswer);
  const rawOptions = currentQuestionWithMarkingResult.options;
  const options = Array.isArray(rawOptions)
    ? rawOptions.map(opt => typeof opt === 'string' ? opt : opt.option)
    : (rawOptions && typeof rawOptions === 'object' && 'options' in rawOptions && Array.isArray(rawOptions.options))
      ? rawOptions.options
      : [];

  const GAP = 8; // Gap between items

  // Initialize state
  const [categoryAssignments, setCategoryAssignments] = useState<Record<string, string[]>>(() => {
    if (currentQuestionWithMarkingResult.userAnswer && typeof currentQuestionWithMarkingResult.userAnswer === 'object' && !Array.isArray(currentQuestionWithMarkingResult.userAnswer)) {
      return currentQuestionWithMarkingResult.userAnswer as Record<string, string[]>;
    }
    const initial: Record<string, string[]> = {};
    categories.forEach(cat => initial[cat] = []);
    return initial;
  });

  const [draggedOption, setDraggedOption] = useState<string | null>(null);
  const [draggedFromCategory, setDraggedFromCategory] = useState<string | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number>(-1);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [targetIndex, setTargetIndex] = useState<number>(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number, y: number } | null>(null);

  // Touch handling state
  const [initialTouchPos, setInitialTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);

  // Item positions and heights for animations (per category)
  const [itemPositions, setItemPositions] = useState<Record<string, Record<string, number>>>({});
  const [itemHeights, setItemHeights] = useState<Record<string, number>>({});

  // Refs for category elements and items
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const isMarked = currentQuestionWithMarkingResult.userMark !== undefined;

  // Constants
  const DRAG_THRESHOLD = 10; // Minimum movement to start drag

  // Calculate cumulative Y positions for items in a category
  const calculatePositions = (items: string[], heights: Record<string, number>) => {
    const positions: Record<string, number> = {};
    let currentY = 0;

    items.forEach((item) => {
      positions[item] = currentY;
      const itemHeight = heights[item] || 56;
      currentY += itemHeight + GAP;
    });

    return positions;
  };

  // Initialize all categories with empty arrays if not present
  const initializeCategories = useCallback(() => {
    const initialized: Record<string, string[]> = {};
    categories.forEach(category => {
      initialized[category] = categoryAssignments[category] || [];
    });
    return initialized;
  }, [categories, categoryAssignments]);

  // Get unassigned options
  const getUnassignedOptions = useCallback(() => {
    const assignedOptions = new Set(
      Object.values(categoryAssignments).flat()
    );
    return options.filter(option => option && !assignedOptions.has(option));
  }, [options, categoryAssignments]);

  const unassignedOptions = getUnassignedOptions();

  // Measure item heights after render
  useEffect(() => {
    const measureHeights = () => {
      const newHeights: Record<string, number> = {};

      itemRefs.current.forEach((element, itemKey) => {
        if (element) {
          newHeights[itemKey] = element.offsetHeight;
        }
      });

      setItemHeights(newHeights);
    };

    const timeoutId = setTimeout(measureHeights, 50);
    return () => clearTimeout(timeoutId);
  }, [categoryAssignments]);

  // Recalculate positions when assignments or heights change (but NOT during drag)
  useEffect(() => {
    if (Object.keys(itemHeights).length === 0 || isDragging) return;

    const newPositions: Record<string, Record<string, number>> = {};

    categories.forEach(category => {
      const items = categoryAssignments[category] || [];
      newPositions[category] = calculatePositions(items, itemHeights);
    });

    setItemPositions(newPositions);
  }, [categoryAssignments, itemHeights, isDragging]);

  // Find which category the drag position is over
  const findCategoryAtPosition = useCallback((clientX: number, clientY: number): string | null => {
    for (const category of categories) {
      const element = categoryRefs.current[category];
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      const padding = 20;

      if (clientX >= rect.left - padding &&
          clientX <= rect.right + padding &&
          clientY >= rect.top - padding &&
          clientY <= rect.bottom + padding) {
        return category;
      }
    }
    return null;
  }, [categories]);

  // Calculate target index within a category based on Y position
  const getTargetIndexInCategory = useCallback((category: string, clientY: number): number => {
    const categoryElement = categoryRefs.current[category];
    if (!categoryElement) return 0;

    const items = categoryAssignments[category] || [];
    if (items.length === 0) return 0;

    const rect = categoryElement.getBoundingClientRect();
    const relativeY = clientY - rect.top - 60; // Account for header height

    let currentY = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemHeight = itemHeights[item] || 56;
      const itemMidpoint = currentY + itemHeight / 2;

      if (relativeY < itemMidpoint) {
        return i;
      }

      currentY += itemHeight + GAP;
    }

    return items.length;
  }, [categoryAssignments, itemHeights, GAP]);

  // Animate items to show where dragged item will be inserted
  const animateItemsToNewPositions = (category: string, toIdx: number) => {
    if (Object.keys(itemHeights).length === 0 || !draggedOption) return;

    const items = categoryAssignments[category] || [];
    const newOrder = [...items];

    // If dragging within same category, remove the item first
    if (category === draggedFromCategory) {
      const currentIdx = newOrder.indexOf(draggedOption);
      if (currentIdx >= 0) {
        newOrder.splice(currentIdx, 1);
      }
    }

    // Insert dragged item at target position to preview the drop
    newOrder.splice(toIdx, 0, draggedOption);

    // Calculate positions with the preview order
    const newPositions = calculatePositions(newOrder, itemHeights);
    setItemPositions(prev => ({
      ...prev,
      [category]: newPositions
    }));
  };

  // Update position during drag
  const updatePositionRef = useRef({ targetIndex, hoveredCategory });
  updatePositionRef.current = { targetIndex, hoveredCategory };

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    const category = findCategoryAtPosition(clientX, clientY);
    const prevCategory = updatePositionRef.current.hoveredCategory;
    const prevTargetIndex = updatePositionRef.current.targetIndex;

    setHoveredCategory(category);

    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setDragPosition({
        x: clientX - containerRect.left,
        y: clientY - containerRect.top
      });
    }

    // Calculate target index within category
    if (category && isDragging) {
      const newTargetIndex = getTargetIndexInCategory(category, clientY);

      // Animate preview if target changed
      if (newTargetIndex !== prevTargetIndex || category !== prevCategory) {
        setTargetIndex(newTargetIndex);
        animateItemsToNewPositions(category, newTargetIndex);
      }
    } else {
      // Reset target when not over any category
      setTargetIndex(-1);
    }

    // If we left a category, reset its positions
    if (prevCategory && prevCategory !== category) {
      const items = categoryAssignments[prevCategory] || [];
      const resetPositions = calculatePositions(items, itemHeights);
      setItemPositions(prev => ({
        ...prev,
        [prevCategory]: resetPositions
      }));
    }
  }, [findCategoryAtPosition, isDragging, getTargetIndexInCategory, categoryAssignments, itemHeights]);

  // Check if all items are correctly placed
  const checkIfAllCorrect = useCallback((assignments: Record<string, string[]>) => {
    const assignedOptions = new Set(Object.values(assignments).flat());
    if (assignedOptions.size !== options.length) return false;

    for (const category of categories) {
      const assigned = assignments[category] || [];
      const correct = correctAnswer[category] || [];

      if (assigned.length !== correct.length) return false;

      for (const item of assigned) {
        if (!correct.includes(item)) return false;
      }
    }

    return true;
  }, [categories, correctAnswer, options]);

  // Global mouse/touch handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updatePosition(e.clientX, e.clientY);
      }
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
          updatePosition(touch.clientX, touch.clientY);
        }
      } else if (hasMoved && isDragging) {
        // Already dragging - prevent default and continue
        e.preventDefault();
        updatePosition(touch.clientX, touch.clientY);
      }
    };

    const handleDragEnd = () => {
      // Only process if we actually dragged
      if (hasMoved && isDragging && draggedOption && hoveredCategory !== null) {
        const newAssignments = { ...initializeCategories() };

        // Remove from current location
        Object.keys(newAssignments).forEach(cat => {
          newAssignments[cat] = newAssignments[cat].filter(opt => opt !== draggedOption);
        });

        // Insert at target index in target category
        const insertIndex = targetIndex >= 0 ? targetIndex : newAssignments[hoveredCategory].length;
        newAssignments[hoveredCategory].splice(insertIndex, 0, draggedOption);

        setCategoryAssignments(newAssignments);

        // If has assigned all options, set user answer
        const assignedOptions = new Set(Object.values(newAssignments).flat());
        if (assignedOptions.size === options.length) {
          setUserAnswer(newAssignments);
        }

        // Check if all correct
        if (checkIfAllCorrect(newAssignments)) {
          setTimeout(() => {
            handleMarkQuestion({
              questionLegacyId: currentQuestionWithMarkingResult.legacyId.toString(),
              question: currentQuestionWithMarkingResult.questionText,
              correctAnswer: currentQuestionWithMarkingResult.correctAnswer,
              markMax: currentQuestionWithMarkingResult.maxMark,
              userAnswer: newAssignments,
              canvas: currentQuestionWithMarkingResult.canvas,
              questionType: currentQuestionWithMarkingResult.questionType,
            });
          }, 10);
        }
      }

      // Reset all drag state
      setDraggedOption(null);
      setDraggedFromCategory(null);
      setDraggedFromIndex(-1);
      setHoveredCategory(null);
      setTargetIndex(-1);
      setIsDragging(false);
      setDragPosition(null);
      setInitialTouchPos(null);
      setHasMoved(false);
    };

    if (draggedOption) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleDragEnd);
      document.addEventListener('touchcancel', handleDragEnd);
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleDragEnd);
      document.removeEventListener('touchcancel', handleDragEnd);
    };
  }, [isDragging, draggedOption, hoveredCategory, targetIndex, hasMoved, initialTouchPos, DRAG_THRESHOLD, updatePosition, initializeCategories, checkIfAllCorrect, handleMarkQuestion, currentQuestionWithMarkingResult, setUserAnswer]);

  // Start drag
  const startDrag = useCallback((option: string, category: string | null, clientX: number, clientY: number) => {
    if (isMarked) return;

    const fromCategory = category || null;
    const fromIndex = fromCategory ? (categoryAssignments[fromCategory] || []).indexOf(option) : -1;

    setDraggedOption(option);
    setDraggedFromCategory(fromCategory);
    setDraggedFromIndex(fromIndex);
    setIsDragging(true);
    updatePosition(clientX, clientY);
  }, [isMarked, categoryAssignments, updatePosition]);

  const handleMouseDown = (e: React.MouseEvent, option: string, category: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    setHasMoved(true); // Enable drop processing for mouse drags
    startDrag(option, category, e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent, option: string, category: string | null = null) => {
    // Don't prevent default initially - allow scrolling
    e.stopPropagation();
    if (e.touches[0]) {
      const touch = e.touches[0];
      setInitialTouchPos({ x: touch.clientX, y: touch.clientY });
      setHasMoved(false);
      setDraggedOption(option);
      setDraggedFromCategory(category);
      setDraggedFromIndex(category ? (categoryAssignments[category] || []).indexOf(option) : -1);
    }
  };

  const handleCategoryClick = (category: string) => {
    if (isMarked || unassignedOptions.length === 0) return;

    const optionToMove = unassignedOptions[0];
    const newAssignments = { ...initializeCategories() };
    newAssignments[category] = [...newAssignments[category], optionToMove];

    setCategoryAssignments(newAssignments);
    setUserAnswer(newAssignments);

    if (checkIfAllCorrect(newAssignments)) {
      setTimeout(() => {
        handleMarkQuestion({
          questionLegacyId: currentQuestionWithMarkingResult.legacyId.toString(),
          question: currentQuestionWithMarkingResult.questionText,
          correctAnswer: currentQuestionWithMarkingResult.correctAnswer,
          markMax: currentQuestionWithMarkingResult.maxMark,
          userAnswer: newAssignments,
          canvas: currentQuestionWithMarkingResult.canvas,
          questionType: currentQuestionWithMarkingResult.questionType,
        });
      }, 10);
    }
  };

  const handleOptionClick = (e: React.MouseEvent, option: string, category: string) => {
    e.stopPropagation();
    if (isMarked || isDragging || hasMoved) return;

    const newAssignments = { ...initializeCategories() };
    newAssignments[category] = newAssignments[category].filter(opt => opt !== option);

    setCategoryAssignments(newAssignments);
    setUserAnswer(newAssignments);
  };

  const isOptionCorrect = (option: string, category: string) => {
    return correctAnswer[category]?.includes(option) || false;
  };

  const getOptionLetter = (index: number) => {
    return String.fromCharCode(65 + index);
  };

  const getOriginalOptionIndex = (option: string) => {
    return options.findIndex(opt => opt === option);
  };

  // Render category content with absolute positioning for animations
  const renderCategoryItems = (category: string) => {
    const items = categoryAssignments[category] || [];
    const positions = itemPositions[category] || {};
    const isTargetCategory = hoveredCategory === category && isDragging;

    // Calculate container height - include space for preview item if hovering
    let totalHeight = items.reduce((sum, item) => {
      return sum + (itemHeights[item] || 56) + GAP;
    }, 0);

    // Add height for dragged item preview if hovering and item not already in category
    if (isTargetCategory && draggedOption && !items.includes(draggedOption)) {
      totalHeight += (itemHeights[draggedOption] || 56) + GAP;
    }

    return (
      <div className="relative min-h-[60px]" style={{ height: totalHeight > 0 ? `${totalHeight}px` : '60px' }}>
        {items.map((option, index) => {
          const isDraggedItem = draggedOption === option;
          const position = positions[option] || 0;
          // Only show placeholder when dragging within the same category (not when hovering elsewhere)
          const showPlaceholder = isDraggedItem && isDragging && draggedFromCategory === category && hoveredCategory === category;

          return (
            <div
              key={option}
              ref={(el) => {
                if (el) itemRefs.current.set(option, el);
              }}
              className="absolute w-full"
              style={{
                transform: `translateY(${position}px)`,
                transition: isDragging ? 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
                zIndex: isDraggedItem && isDragging ? 5 : 10,
                opacity: Object.keys(itemHeights).length === 0 ? 0 : 1,
              }}
            >
              {showPlaceholder && (
                <div
                  style={{
                    height: `${itemHeights[option] || 56}px`,
                    border: '4px dashed #f2f2f7',
                    borderRadius: '16px',
                    backgroundColor: '#FAFAFD',
                  }}
                />
              )}
              <div
                onMouseDown={(e) => handleMouseDown(e, option, category)}
                onTouchStart={(e) => handleTouchStart(e, option, category)}
                onClick={(e) => handleOptionClick(e, option, category)}
                className={`py-3 px-4 rounded-[16px] text-sm font-rounded-bold border flex items-center gap-3 ${
                  isMarked
                    ? isOptionCorrect(option, category)
                      ? "bg-[#E4FFB7] border-[#7CC500] text-[#7CC500] border-b-4"
                      : "bg-[#FDEEEE] border-[#FF4B4C] text-[#FF4B4C] border-b-4"
                    : "bg-white border-[#F0F0F0] cursor-move border-b-4 hover:translate-y-[1px] hover:border-b-2 hover:mb-[2px]"
                } ${isMarked ? "cursor-not-allowed" : "cursor-move"}`}
                style={{ touchAction: 'none', opacity: showPlaceholder ? 0 : 1, pointerEvents: showPlaceholder ? 'none' : 'auto' }}
              >
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full border font-rounded-bold text-xs flex-shrink-0 ${
                    isMarked
                      ? isOptionCorrect(option, category)
                        ? "bg-[#7CC500] border-[#7CC500] text-white"
                        : "bg-[#FF4B4C] border-[#FF4B4C] text-white"
                      : "border-[#F0F0F0] text-[rgba(0,0,0,0.8)]"
                  }`}
                >
                  {getOptionLetter(getOriginalOptionIndex(option))}
                </div>
                <span className="flex-1">{option}</span>
              </div>
            </div>
          );
        })}

        {/* Show preview ghost item when dragging over from another category or pool */}
        {isTargetCategory && draggedOption && targetIndex >= 0 && category !== draggedFromCategory && (
          <div
            className="absolute w-full pointer-events-none"
            style={{
              transform: `translateY(${positions[draggedOption] || 0}px)`,
              transition: 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              zIndex: 5,
            }}
          >
            <div
              style={{
                height: `${itemHeights[draggedOption] || 56}px`,
                border: '4px dashed #f2f2f7',
                borderRadius: '16px',
                backgroundColor: '#FAFAFD',
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col pb-10 relative pt-2">
      {/* Dragged Item Visual Feedback */}
      {isDragging && draggedOption && dragPosition && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: dragPosition.x - 200,
            top: dragPosition.y - (itemHeights[draggedOption] || 56) / 2,
            transform: 'rotate(-2deg) scale(1.05)',
            width: '400px',
            opacity: 0.9,
            zIndex: 100,
          }}
        >
          <div className="py-3 px-4 bg-white rounded-[16px] text-sm font-rounded-bold shadow-lg border border-[#F0F0F0] border-b-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full border border-[#F0F0F0] font-rounded-bold text-xs text-[rgba(0,0,0,0.8)] flex-shrink-0">
              {getOptionLetter(getOriginalOptionIndex(draggedOption))}
            </div>
            <span className="flex-1">{draggedOption}</span>
          </div>
        </div>
      )}

      {/* Options Pool */}
      {unassignedOptions.length > 0 && (
        <div className="pt-0 pb-5">
          <div className="flex flex-col gap-2 md:px-10">
            {unassignedOptions.slice(0, 1).map((option, index) => (
              <div
                key={option}
                onMouseDown={(e) => handleMouseDown(e, option, null)}
                onTouchStart={(e) => handleTouchStart(e, option, null)}
                className={`py-3 px-4 bg-white border border-[#F0F0F0] rounded-[16px] text-sm font-rounded-bold border-b-4 flex items-center gap-3 ${
                  isMarked ? "cursor-not-allowed" : "cursor-move"
                } ${draggedOption === option ? "opacity-30 scale-95 border-dashed" : "hover:translate-y-[1px] hover:border-b-2 hover:mb-[2px]"}`}
                style={{ touchAction: 'none' }}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-[#F0F0F0] font-rounded-bold text-xs text-[rgba(0,0,0,0.8)] flex-shrink-0">
                  {getOptionLetter(getOriginalOptionIndex(option))}
                </div>
                <span className="flex-1">{option}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="mb-5 flex-1 flex flex-col">
        <div className="flex gap-2 h-full">
          {categories.map((category, index) => {
            const isHovered = hoveredCategory === category;
            return (
              <div
                key={category}
                ref={(el) => { categoryRefs.current[category] = el; }}
                className={`border-4 border-dashed rounded-[24px] p-4 transition-all duration-200 flex-1 ${
                  isHovered ? "border-[#05B0FF] bg-[#E6F7FF]" : "border-[#ECEBF2] bg-[#FBFBFD]"
                } ${(isMarked || unassignedOptions.length === 0) ? "cursor-default" : "cursor-pointer"}`}
                onClick={() => handleCategoryClick(category)}
                onMouseEnter={() => !isDragging && !isMarked && setHoveredCategory(category)}
                onMouseLeave={() => !isDragging && !isMarked && setHoveredCategory(null)}
              >
                <div className="flex gap-3 mt-1 mb-2">
                  <h4 className={`flex-1 font-rounded-bold text-[17px] leading-tight transition-all duration-200 -mt-0.5 ${
                    isHovered ? "text-[#05B0FF]" : "text-[#A3A3A4]"
                  }`}>
                    {category}
                  </h4>
                </div>

                {renderCategoryItems(category)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}