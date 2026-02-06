import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { QuestionWithMarkingResult, MarkingResult, MarkingContext, StrategyStep } from "@/app/types/types";
import TickIcon from "@/app/_components/icons/TickIcon";
import CrossIcon from "@/app/_components/icons/CrossIcon";
import { useResponsive } from "@/app/_hooks/useResponsive";

interface SortStepProps {
    step: StrategyStep;
    userAnswer: Record<string, string[]>;
    updateAnswer: (stepId: string, answer: Record<string, string[]>) => void;
    isMarking: boolean;
    isMarked: boolean;
    markingResult: MarkingResult | null;
    onTargetLetterChange?: (letter: string | null) => void;
}

export default function SortStep({
    step,
    userAnswer,
    updateAnswer,
    isMarking,
    isMarked,
    markingResult,
    onTargetLetterChange,
}: SortStepProps) {
    const { isWideScreen } = useResponsive();
    const [categoryAssignments, setCategoryAssignments] = useState<Record<string, string[]>>(
        userAnswer || {}
    );
    const [draggedOption, setDraggedOption] = useState<string | null>(null);
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState<{ x: number, y: number } | null>(null);

    // Refs for category elements to calculate positions
    const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const containerRef = useRef<HTMLDivElement>(null);

    // Get data from step
    const options = Array.isArray(step.options) ? step.options as Array<{ option: string }> : [];
    const allCategories = step.categories || [];
    const correctAnswerMapping = step.correct_answer_mapping || {};
    const stepId = step.legacyId || `step-${step.index}`;

    // Only show categories that have at least one correct option
    const categories = allCategories.filter(category =>
        correctAnswerMapping[category] && correctAnswerMapping[category].length > 0
    );

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
        return options
            .map(opt => typeof opt === 'string' ? opt : opt.option)
            .filter(option => option && !assignedOptions.has(option));
    }, [options, categoryAssignments]);

    // Simple hit detection - check if point is inside category with generous padding
    const findCategoryAtPosition = useCallback((clientX: number, clientY: number): string | null => {
        for (const category of categories) {
            const element = categoryRefs.current[category];
            if (!element) continue;

            const rect = element.getBoundingClientRect();
            const padding = 30; // Generous padding around each category

            const isInside = clientX >= rect.left - padding &&
                clientX <= rect.right + padding &&
                clientY >= rect.top - padding &&
                clientY <= rect.bottom + padding;

            if (isInside) {
                return category;
            }
        }

        return null;
    }, [categories]);

    // Update hovered category and drag position
    const updatePosition = useCallback((clientX: number, clientY: number) => {
        const category = findCategoryAtPosition(clientX, clientY);
        setHoveredCategory(category);

        // Update drag position relative to container for visual feedback
        if (containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            setDragPosition({
                x: clientX - containerRect.left,
                y: clientY - containerRect.top
            });
        }
    }, [findCategoryAtPosition]);

    // Global mouse/touch handlers
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            updatePosition(e.clientX, e.clientY);
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault(); // Prevent scrolling
            if (e.touches[0]) {
                updatePosition(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        const handleMouseUp = () => {
            if (draggedOption && hoveredCategory) {
                // Complete the drop
                const newAssignments = { ...initializeCategories() };

                // Remove from current location
                Object.keys(newAssignments).forEach(cat => {
                    newAssignments[cat] = newAssignments[cat].filter(opt => opt !== draggedOption);
                });

                // Add to new location
                newAssignments[hoveredCategory] = [...newAssignments[hoveredCategory], draggedOption];

                setCategoryAssignments(newAssignments);
                updateAnswer(stepId, newAssignments);
            }

            // Reset drag state
            setDraggedOption(null);
            setHoveredCategory(null);
            setIsDragging(false);
            setDragPosition(null);
        };

        const handleTouchEnd = () => {
            handleMouseUp(); // Same logic for touch
        };

        // Add global listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging, draggedOption, hoveredCategory, updatePosition, initializeCategories, stepId, updateAnswer]);

    // Start drag
    const startDrag = useCallback((option: string, clientX: number, clientY: number) => {
        if (isMarked || isMarking) return;

        setDraggedOption(option);
        setIsDragging(true);
        updatePosition(clientX, clientY);
    }, [isMarked, isMarking, updatePosition]);

    // Mouse handlers for drag start
    const handleMouseDown = (e: React.MouseEvent, option: string) => {
        e.preventDefault();
        startDrag(option, e.clientX, e.clientY);
    };

    // Touch handlers for drag start
    const handleTouchStart = (e: React.TouchEvent, option: string) => {
        e.preventDefault();
        if (e.touches[0]) {
            startDrag(option, e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const handleCategoryClick = (category: string) => {
        if (isMarked || isMarking || unassignedOptions.length === 0) {
            return;
        }

        const optionToMove = unassignedOptions[0];
        const newAssignments = { ...initializeCategories() };
        newAssignments[category] = [...newAssignments[category], optionToMove];

        setCategoryAssignments(newAssignments);
        updateAnswer(stepId, newAssignments);
    };

    const handleOptionClick = (e: React.MouseEvent, option: string, category: string) => {
        e.stopPropagation();

        if (isMarked || isMarking) {
            return;
        }

        const newAssignments = { ...initializeCategories() };
        newAssignments[category] = newAssignments[category].filter(opt => opt !== option);

        setCategoryAssignments(newAssignments);
        updateAnswer(stepId, newAssignments);
    };

    const unassignedOptions = getUnassignedOptions();

    // Calculate and notify parent of target letter for heading replacement
    useEffect(() => {
        if (!onTargetLetterChange) return;

        if (unassignedOptions.length === 0) {
            onTargetLetterChange(null); // Will show "each answer choice"
        } else {
            // Get the option at index 1 (second unassigned option)
            const targetOption = unassignedOptions[0];
            if (targetOption) {
                const originalIndex = getOriginalOptionIndex(targetOption);
                const letter = getOptionLetter(originalIndex);
                onTargetLetterChange(letter);
            } else {
                onTargetLetterChange(null);
            }
        }
    }, [unassignedOptions, onTargetLetterChange]);

    // Check if option is correctly placed
    const isOptionCorrect = (option: string, category: string) => {
        return correctAnswerMapping[category]?.includes(option) || false;
    };

    const getOptionLetter = (index: number) => {
        return String.fromCharCode(65 + index); // A, B, C, D...
    };

    const getOriginalOptionIndex = (option: string) => {
        return options.findIndex(opt =>
            typeof opt === 'string' ? opt === option : opt.option === option
        );
    };

    return (
        <div ref={containerRef} className="h-full flex flex-col pb-10 relative pt-2">
            {/* Dragged Item Visual Feedback */}
            {isDragging && draggedOption && dragPosition && (
                <div
                    className="absolute pointer-events-none z-50"
                    style={{
                        left: dragPosition.x - 50, // Center the dragged item on cursor
                        top: dragPosition.y - 20,
                        transform: 'rotate(-2deg)', // Subtle rotation for visual appeal
                    }}
                >
                    <div className="py-3 px-4 bg-white rounded-[16px] text-sm font-rounded-bold shadow-lg scale-110 opacity-90 flex items-center" style={{ width: '400px' }}>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-[#F0F0F0] mr-3 font-rounded-bold text-xs text-[rgba(0,0,0,0.8)]">
                            {getOptionLetter(getOriginalOptionIndex(draggedOption))}
                        </div>
                        <div className="flex-1">
                            {draggedOption}
                        </div>
                    </div>
                </div>
            )}

            {/* Options Pool */}
            {unassignedOptions.length > 0 && (
                <div className="pt-0 pb-5">
                    <div className="flex flex-col gap-2 md:px-10">
                        {unassignedOptions.slice(0, isWideScreen ? 1 : 1).map((option, index) => (
                            <div
                                key={option}
                                data-draggable="true"
                                onMouseDown={(e) => handleMouseDown(e, option)}
                                onTouchStart={(e) => handleTouchStart(e, option)}
                                className={`py-3 px-4 bg-white border border-[#F0F0F0] rounded-[16px] text-sm font-rounded-bold border-b-4 flex items-center gap-3 ${(isMarked || isMarking) ? "cursor-not-allowed" : "cursor-move"} ${draggedOption === option ? "opacity-30 scale-95 border-dashed" : ""} ${index !== 0 ? "opacity-50" : "hover:border-[#F0F0F0] transition-all duration-100 hover:translate-y-[1px] hover:border-b-2 hover:mb-[2px]"}`}
                                style={{ touchAction: 'none' }}
                            >
                                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-[#F0F0F0] font-rounded-bold text-xs text-[rgba(0,0,0,0.8)] flex-shrink-0">
                                    {getOptionLetter(getOriginalOptionIndex(option))}
                                </div>
                                <span className="flex-1">
                                    {option}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Categories */}
            <div className="mb-5 flex-1 flex flex-col">
                {categories.length === 2 ? (
                    // 2 categories: [category 1 (flex-2), category 2 (flex-1)]
                    <div className="flex gap-2 h-full">
                        {categories.map((category, index) => {
                            const isHovered = hoveredCategory === category;
                            return (
                                <div
                                    key={category}
                                    ref={(el) => { categoryRefs.current[category] = el; }}
                                    className={`border-4 border-dashed rounded-[24px] p-4 transition-all duration-200 ${index === 0 ? 'w-7/12' : 'w-5/12'
                                        } ${isHovered
                                            ? "border-[#05B0FF] bg-[#E6F7FF]"
                                            : "border-[#ECEBF2] bg-[#FBFBFD]"
                                        } ${(isMarked || isMarking || unassignedOptions.length === 0) ? "cursor-default" : "cursor-pointer"}`}
                                    onClick={() => handleCategoryClick(category)}
                                    onMouseEnter={() => !isDragging && !isMarked && setHoveredCategory(category)}
                                    onMouseLeave={() => !isDragging && !isMarked && setHoveredCategory(null)}
                                >
                                    <div className="flex gap-3 mt-1 mb-2">
                                        {index === 0 ? (
                                            <TickIcon fill={isHovered ? "#05B0FF" : "#A3A3A4"} />
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M0.313608 10.9346C-0.0555325 11.3037 -0.0731106 11.9629 0.322397 12.3408C0.700327 12.7363 1.3683 12.7188 1.73744 12.3496L6.00013 8.08691L10.2628 12.3496C10.6408 12.7275 11.2911 12.7363 11.6691 12.3408C12.0646 11.9629 12.0558 11.3037 11.6779 10.9258L7.41517 6.66309L11.6779 2.40918C12.0558 2.02246 12.0646 1.37207 11.6691 0.994141C11.2911 0.598633 10.6408 0.607422 10.2628 0.985352L6.00013 5.24805L1.73744 0.985352C1.3683 0.616211 0.700327 0.598633 0.322397 0.994141C-0.0731106 1.37207 -0.0555325 2.03125 0.313608 2.40039L4.5763 6.66309L0.313608 10.9346Z"
                                                    fill={isHovered ? "#05B0FF" : "#A3A3A4"} />
                                            </svg>
                                        )}
                                        <h4 className={`flex-1 font-rounded-bold text-[17px] leading-tight transition-all duration-200 -mt-0.5 ${isHovered ? "text-[#05B0FF]" : "text-[#A3A3A4]"
                                            }`}>
                                            {category}
                                        </h4>
                                    </div>

                                    <div className="flex flex-wrap gap-2 min-h-[60px]">
                                        {(categoryAssignments[category] || []).map((option) => {
                                            return (
                                                <div
                                                    key={option}
                                                    data-draggable="true"
                                                    onMouseDown={(e) => handleMouseDown(e, option)}
                                                    onTouchStart={(e) => handleTouchStart(e, option)}
                                                    onClick={(e) => handleOptionClick(e, option, category)}
                                                    className={`py-3 px-4 rounded-[16px] text-sm font-rounded-bold border transition-all duration-100 flex items-center gap-3 ${isMarked
                                                        ? isOptionCorrect(option, category)
                                                            ? "bg-[#E4FFB7] border-[#7CC500] text-[#7CC500] border-b-4"
                                                            : "bg-[#FDEEEE] border-[#FF4B4C] text-[#FF4B4C] border-b-4"
                                                        : "bg-white border-[#F0F0F0] hover:border-[#F0F0F0] cursor-pointer border-b-4 hover:translate-y-[1px] hover:border-b-2 hover:mb-[2px]"
                                                        } ${(isMarked || isMarking) ? "cursor-not-allowed" : "cursor-pointer"} ${draggedOption === option ? "opacity-30 scale-95 border-dashed" : ""}`}
                                                    style={{ touchAction: 'none' }}
                                                >
                                                    <div
                                                        className={`flex items-center justify-center w-6 h-6 rounded-full border font-rounded-bold text-xs flex-shrink-0 ${isMarked
                                                            ? isOptionCorrect(option, category)
                                                                ? "bg-[#7CC500] border-[#7CC500] text-white"
                                                                : "bg-[#FF4B4C] border-[#FF4B4C] text-white"
                                                            : "border-[#F0F0F0] text-[rgba(0,0,0,0.8)]"
                                                            }`}
                                                    >
                                                        {getOptionLetter(getOriginalOptionIndex(option))}
                                                    </div>
                                                    <span className="flex-1">
                                                        {option}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : categories.length === 3 ? (
                    // 3 categories: [category 1], [category 2, category 3]
                    <div className="flex flex-col gap-2 h-full">
                        {/* First row - Category 1 */}
                        <div className="flex flex-1">
                            {(() => {
                                const category = categories[0];
                                const isHovered = hoveredCategory === category;
                                return (
                                    <div
                                        key={category}
                                        ref={(el) => { categoryRefs.current[category] = el; }}
                                        className={`border-4 border-dashed rounded-[24px] p-4 transition-all duration-200 w-full ${isHovered
                                            ? "border-[#05B0FF] bg-[#E6F7FF]"
                                            : "border-[#ECEBF2] bg-[#FBFBFD]"
                                            } ${(isMarked || isMarking || unassignedOptions.length === 0) ? "cursor-default" : "cursor-pointer"}`}
                                        onClick={() => handleCategoryClick(category)}
                                        onMouseEnter={() => !isDragging && !isMarked && setHoveredCategory(category)}
                                        onMouseLeave={() => !isDragging && !isMarked && setHoveredCategory(null)}
                                    >
                                        <div className="flex gap-3 mt-1 mb-2">
                                            <TickIcon fill={isHovered ? "#05B0FF" : "#A3A3A4"} />
                                            <h4 className={`flex-1 font-rounded-bold text-[17px] leading-tight transition-all duration-200 -mt-0.5 ${isHovered ? "text-[#05B0FF]" : "text-[#A3A3A4]"
                                                }`}>
                                                {category}
                                            </h4>
                                        </div>

                                        <div className="flex flex-wrap gap-2 min-h-[60px]">
                                            {(categoryAssignments[category] || []).map((option) => {
                                                return (
                                                    <div
                                                        key={option}
                                                        data-draggable="true"
                                                        onMouseDown={(e) => handleMouseDown(e, option)}
                                                        onTouchStart={(e) => handleTouchStart(e, option)}
                                                        onClick={(e) => handleOptionClick(e, option, category)}
                                                        className={`py-3 px-4 rounded-[16px] text-sm font-rounded-bold border transition-all duration-100 flex items-center gap-3 ${isMarked
                                                            ? isOptionCorrect(option, category)
                                                                ? "bg-[#E4FFB7] border-[#7CC500] text-[#7CC500] border-b-4"
                                                                : "bg-[#FDEEEE] border-[#FF4B4C] text-[#FF4B4C] border-b-4"
                                                            : "bg-white border-[#F0F0F0] hover:border-[#F0F0F0] cursor-pointer border-b-4 hover:translate-y-[1px] hover:border-b-2 hover:mb-[2px]"
                                                            } ${(isMarked || isMarking) ? "cursor-not-allowed" : "cursor-pointer"} ${draggedOption === option ? "opacity-30 scale-95 border-dashed" : ""}`}
                                                        style={{ touchAction: 'none' }}
                                                    >
                                                        <div
                                                            className={`flex items-center justify-center w-6 h-6 rounded-full border font-rounded-bold text-xs flex-shrink-0 ${isMarked
                                                                ? isOptionCorrect(option, category)
                                                                    ? "bg-[#7CC500] border-[#7CC500] text-white"
                                                                    : "bg-[#FF4B4C] border-[#FF4B4C] text-white"
                                                                : "border-[#F0F0F0] text-[rgba(0,0,0,0.8)]"
                                                                }`}
                                                        >
                                                            {getOptionLetter(getOriginalOptionIndex(option))}
                                                        </div>
                                                        <span className="flex-1">
                                                            {option}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        {/* Second row - Categories 2 and 3 */}
                        <div className="flex gap-2 flex-1">
                            {categories.slice(1).map((category, index) => {
                                const isHovered = hoveredCategory === category;
                                const actualIndex = index + 1;
                                return (
                                    <div
                                        key={category}
                                        ref={(el) => { categoryRefs.current[category] = el; }}
                                        className={`border-4 border-dashed rounded-[24px] p-4 transition-all duration-200 flex-1 ${isHovered
                                            ? "border-[#05B0FF] bg-[#E6F7FF]"
                                            : "border-[#ECEBF2] bg-[#FBFBFD]"
                                            } ${(isMarked || isMarking || unassignedOptions.length === 0) ? "cursor-default" : "cursor-pointer"}`}
                                        onClick={() => handleCategoryClick(category)}
                                        onMouseEnter={() => !isDragging && !isMarked && setHoveredCategory(category)}
                                        onMouseLeave={() => !isDragging && !isMarked && setHoveredCategory(null)}
                                    >
                                        <div className="flex gap-3 mt-1 mb-2">
                                            <svg width="16" height="16" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M0.313608 10.9346C-0.0555325 11.3037 -0.0731106 11.9629 0.322397 12.3408C0.700327 12.7363 1.3683 12.7188 1.73744 12.3496L6.00013 8.08691L10.2628 12.3496C10.6408 12.7275 11.2911 12.7363 11.6691 12.3408C12.0646 11.9629 12.0558 11.3037 11.6779 10.9258L7.41517 6.66309L11.6779 2.40918C12.0558 2.02246 12.0646 1.37207 11.6691 0.994141C11.2911 0.598633 10.6408 0.607422 10.2628 0.985352L6.00013 5.24805L1.73744 0.985352C1.3683 0.616211 0.700327 0.598633 0.322397 0.994141C-0.0731106 1.37207 -0.0555325 2.03125 0.313608 2.40039L4.5763 6.66309L0.313608 10.9346Z"
                                                    fill={isHovered ? "#05B0FF" : "#A3A3A4"} />
                                            </svg>
                                            <h4 className={`flex-1 font-rounded-bold text-[17px] leading-tight transition-all duration-200 -mt-0.5 ${isHovered ? "text-[#05B0FF]" : "text-[#A3A3A4]"
                                                }`}>
                                                {category}
                                            </h4>
                                        </div>

                                        <div className="flex flex-wrap gap-2 min-h-[60px]">
                                            {(categoryAssignments[category] || []).map((option) => {
                                                return (
                                                    <div
                                                        key={option}
                                                        data-draggable="true"
                                                        onMouseDown={(e) => handleMouseDown(e, option)}
                                                        onTouchStart={(e) => handleTouchStart(e, option)}
                                                        onClick={(e) => handleOptionClick(e, option, category)}
                                                        className={`py-3 px-4 rounded-[16px] text-sm font-rounded-bold border transition-all duration-100 flex items-center gap-3 ${isMarked
                                                            ? isOptionCorrect(option, category)
                                                                ? "bg-[#E4FFB7] border-[#7CC500] text-[#7CC500] border-b-4"
                                                                : "bg-[#FDEEEE] border-[#FF4B4C] text-[#FF4B4C] border-b-4"
                                                            : "bg-white border-[#F0F0F0] hover:border-[#F0F0F0] cursor-pointer border-b-4 hover:translate-y-[1px] hover:border-b-2 hover:mb-[2px]"
                                                            } ${(isMarked || isMarking) ? "cursor-not-allowed" : "cursor-pointer"} ${draggedOption === option ? "opacity-30 scale-95 border-dashed" : ""}`}
                                                        style={{ touchAction: 'none' }}
                                                    >
                                                        <div
                                                            className={`flex items-center justify-center w-6 h-6 rounded-full border font-rounded-bold text-xs flex-shrink-0 ${isMarked
                                                                ? isOptionCorrect(option, category)
                                                                    ? "bg-[#7CC500] border-[#7CC500] text-white"
                                                                    : "bg-[#FF4B4C] border-[#FF4B4C] text-white"
                                                                : "border-[#F0F0F0] text-[rgba(0,0,0,0.8)]"
                                                                }`}
                                                        >
                                                            {getOptionLetter(getOriginalOptionIndex(option))}
                                                        </div>
                                                        <span className="flex-1">
                                                            {option}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : categories.length === 4 ? (
                    // 4 categories: [category 1], [category 2, 3, 4]
                    <div className="flex flex-col gap-2 h-full">
                        {/* First row - Category 1 */}
                        <div className="flex flex-1">
                            {(() => {
                                const category = categories[0];
                                const isHovered = hoveredCategory === category;
                                return (
                                    <div
                                        key={category}
                                        ref={(el) => { categoryRefs.current[category] = el; }}
                                        className={`border-4 border-dashed rounded-[24px] p-4 transition-all duration-200 w-full ${isHovered
                                            ? "border-[#05B0FF] bg-[#E6F7FF]"
                                            : "border-[#ECEBF2] bg-[#FBFBFD]"
                                            } ${(isMarked || isMarking || unassignedOptions.length === 0) ? "cursor-default" : "cursor-pointer"}`}
                                        onClick={() => handleCategoryClick(category)}
                                        onMouseEnter={() => !isDragging && !isMarked && setHoveredCategory(category)}
                                        onMouseLeave={() => !isDragging && !isMarked && setHoveredCategory(null)}
                                    >
                                        <div className="flex gap-3 mt-1 mb-2">
                                            <TickIcon fill={isHovered ? "#05B0FF" : "#A3A3A4"} />
                                            <h4 className={`flex-1 font-rounded-bold text-[17px] leading-tight transition-all duration-200 -mt-0.5 ${isHovered ? "text-[#05B0FF]" : "text-[#A3A3A4]"
                                                }`}>
                                                {category}
                                            </h4>
                                        </div>

                                        <div className="flex flex-wrap gap-2 min-h-[60px]">
                                            {(categoryAssignments[category] || []).map((option) => {
                                                return (
                                                    <div
                                                        key={option}
                                                        data-draggable="true"
                                                        onMouseDown={(e) => handleMouseDown(e, option)}
                                                        onTouchStart={(e) => handleTouchStart(e, option)}
                                                        onClick={(e) => handleOptionClick(e, option, category)}
                                                        className={`py-3 px-4 rounded-[16px] text-sm font-rounded-bold border transition-all duration-100 flex items-center gap-3 ${isMarked
                                                            ? isOptionCorrect(option, category)
                                                                ? "bg-[#E4FFB7] border-[#7CC500] text-[#7CC500] border-b-4"
                                                                : "bg-[#FDEEEE] border-[#FF4B4C] text-[#FF4B4C] border-b-4"
                                                            : "bg-white border-[#F0F0F0] hover:border-[#F0F0F0] cursor-pointer border-b-4 hover:translate-y-[1px] hover:border-b-2 hover:mb-[2px]"
                                                            } ${(isMarked || isMarking) ? "cursor-not-allowed" : "cursor-pointer"} ${draggedOption === option ? "opacity-30 scale-95 border-dashed" : ""}`}
                                                        style={{ touchAction: 'none' }}
                                                    >
                                                        <div
                                                            className={`flex items-center justify-center w-6 h-6 rounded-full border font-rounded-bold text-xs flex-shrink-0 ${isMarked
                                                                ? isOptionCorrect(option, category)
                                                                    ? "bg-[#7CC500] border-[#7CC500] text-white"
                                                                    : "bg-[#FF4B4C] border-[#FF4B4C] text-white"
                                                                : "border-[#F0F0F0] text-[rgba(0,0,0,0.8)]"
                                                                }`}
                                                        >
                                                            {getOptionLetter(getOriginalOptionIndex(option))}
                                                        </div>
                                                        <span className="flex-1">
                                                            {option}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        {/* Second row - Categories 2, 3, and 4 */}
                        <div className="flex gap-2 flex-1">
                            {categories.slice(1).map((category, index) => {
                                const isHovered = hoveredCategory === category;
                                const actualIndex = index + 1;
                                return (
                                    <div
                                        key={category}
                                        ref={(el) => { categoryRefs.current[category] = el; }}
                                        className={`border-4 border-dashed rounded-[24px] p-4 transition-all duration-200 flex-1 ${isHovered
                                            ? "border-[#05B0FF] bg-[#E6F7FF]"
                                            : "border-[#ECEBF2] bg-[#FBFBFD]"
                                            } ${(isMarked || isMarking || unassignedOptions.length === 0) ? "cursor-default" : "cursor-pointer"}`}
                                        onClick={() => handleCategoryClick(category)}
                                        onMouseEnter={() => !isDragging && !isMarked && setHoveredCategory(category)}
                                        onMouseLeave={() => !isDragging && !isMarked && setHoveredCategory(null)}
                                    >
                                        <div className="flex gap-3 mt-1 mb-2">
                                            <svg width="16" height="16" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M0.313608 10.9346C-0.0555325 11.3037 -0.0731106 11.9629 0.322397 12.3408C0.700327 12.7363 1.3683 12.7188 1.73744 12.3496L6.00013 8.08691L10.2628 12.3496C10.6408 12.7275 11.2911 12.7363 11.6691 12.3408C12.0646 11.9629 12.0558 11.3037 11.6779 10.9258L7.41517 6.66309L11.6779 2.40918C12.0558 2.02246 12.0646 1.37207 11.6691 0.994141C11.2911 0.598633 10.6408 0.607422 10.2628 0.985352L6.00013 5.24805L1.73744 0.985352C1.3683 0.616211 0.700327 0.598633 0.322397 0.994141C-0.0731106 1.37207 -0.0555325 2.03125 0.313608 2.40039L4.5763 6.66309L0.313608 10.9346Z"
                                                    fill={isHovered ? "#05B0FF" : "#A3A3A4"} />
                                            </svg>
                                            <h4 className={`flex-1 font-rounded-bold text-[17px] leading-tight transition-all duration-200 -mt-0.5 ${isHovered ? "text-[#05B0FF]" : "text-[#A3A3A4]"
                                                }`}>
                                                {category}
                                            </h4>
                                        </div>

                                        <div className="flex flex-wrap gap-2 min-h-[60px]">
                                            {(categoryAssignments[category] || []).map((option) => {
                                                return (
                                                    <div
                                                        key={option}
                                                        data-draggable="true"
                                                        onMouseDown={(e) => handleMouseDown(e, option)}
                                                        onTouchStart={(e) => handleTouchStart(e, option)}
                                                        onClick={(e) => handleOptionClick(e, option, category)}
                                                        className={`py-3 px-4 rounded-[16px] text-sm font-rounded-bold border transition-all duration-100 flex items-center gap-3 ${isMarked
                                                            ? isOptionCorrect(option, category)
                                                                ? "bg-[#E4FFB7] border-[#7CC500] text-[#7CC500] border-b-4"
                                                                : "bg-[#FDEEEE] border-[#FF4B4C] text-[#FF4B4C] border-b-4"
                                                            : "bg-white border-[#F0F0F0] hover:border-[#F0F0F0] cursor-pointer border-b-4 hover:translate-y-[1px] hover:border-b-2 hover:mb-[2px]"
                                                            } ${(isMarked || isMarking) ? "cursor-not-allowed" : "cursor-pointer"} ${draggedOption === option ? "opacity-30 scale-95 border-dashed" : ""}`}
                                                        style={{ touchAction: 'none' }}
                                                    >
                                                        <div
                                                            className={`flex items-center justify-center w-6 h-6 rounded-full border font-rounded-bold text-xs flex-shrink-0 ${isMarked
                                                                ? isOptionCorrect(option, category)
                                                                    ? "bg-[#7CC500] border-[#7CC500] text-white"
                                                                    : "bg-[#FF4B4C] border-[#FF4B4C] text-white"
                                                                : "border-[#F0F0F0] text-[rgba(0,0,0,0.8)]"
                                                                }`}
                                                        >
                                                            {getOptionLetter(getOriginalOptionIndex(option))}
                                                        </div>
                                                        <span className="flex-1">
                                                            {option}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    // Default layout for other cases (1 or 5+ categories)
                    <div className="grid grid-cols-3 gap-2 h-full">
                        {categories.map((category, index) => {
                            const isHovered = hoveredCategory === category;
                            return (
                                <div
                                    key={category}
                                    ref={(el) => { categoryRefs.current[category] = el; }}
                                    className={`border-4 border-dashed rounded-[24px] p-4 transition-all duration-200 ${index === 0 ? 'col-span-3' : ''
                                        } ${isHovered
                                            ? "border-[#05B0FF] bg-[#E6F7FF]"
                                            : "border-[#ECEBF2] bg-[#FBFBFD]"
                                        } ${(isMarked || isMarking || unassignedOptions.length === 0) ? "cursor-default" : "cursor-pointer"}`}
                                    onClick={() => handleCategoryClick(category)}
                                    onMouseEnter={() => !isDragging && !isMarked && setHoveredCategory(category)}
                                    onMouseLeave={() => !isDragging && !isMarked && setHoveredCategory(null)}
                                >
                                    <div className="flex gap-3 mt-1 mb-2">
                                        {index === 0 ? (
                                            <TickIcon fill={isHovered ? "#05B0FF" : "#A3A3A4"} />
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M0.313608 10.9346C-0.0555325 11.3037 -0.0731106 11.9629 0.322397 12.3408C0.700327 12.7363 1.3683 12.7188 1.73744 12.3496L6.00013 8.08691L10.2628 12.3496C10.6408 12.7275 11.2911 12.7363 11.6691 12.3408C12.0646 11.9629 12.0558 11.3037 11.6779 10.9258L7.41517 6.66309L11.6779 2.40918C12.0558 2.02246 12.0646 1.37207 11.6691 0.994141C11.2911 0.598633 10.6408 0.607422 10.2628 0.985352L6.00013 5.24805L1.73744 0.985352C1.3683 0.616211 0.700327 0.598633 0.322397 0.994141C-0.0731106 1.37207 -0.0555325 2.03125 0.313608 2.40039L4.5763 6.66309L0.313608 10.9346Z"
                                                    fill={isHovered ? "#05B0FF" : "#A3A3A4"} />
                                            </svg>
                                        )}
                                        <h4 className={`flex-1 font-rounded-bold text-[17px] leading-tight transition-all duration-200 -mt-0.5 ${isHovered ? "text-[#05B0FF]" : "text-[#A3A3A4]"
                                            }`}>
                                            {category}
                                        </h4>
                                    </div>

                                    <div className="flex flex-wrap gap-2 min-h-[60px]">
                                        {(categoryAssignments[category] || []).map((option) => {
                                            return (
                                                <div
                                                    key={option}
                                                    data-draggable="true"
                                                    onMouseDown={(e) => handleMouseDown(e, option)}
                                                    onTouchStart={(e) => handleTouchStart(e, option)}
                                                    onClick={(e) => handleOptionClick(e, option, category)}
                                                    className={`py-3 px-4 rounded-[16px] text-sm font-rounded-bold border transition-all duration-100 flex items-center gap-3 ${isMarked
                                                        ? isOptionCorrect(option, category)
                                                            ? "bg-[#E4FFB7] border-[#7CC500] text-[#7CC500] border-b-4"
                                                            : "bg-[#FDEEEE] border-[#FF4B4C] text-[#FF4B4C] border-b-4"
                                                        : "bg-white border-[#F0F0F0] hover:border-[#F0F0F0] cursor-pointer border-b-4 hover:translate-y-[1px] hover:border-b-2 hover:mb-[2px]"
                                                        } ${(isMarked || isMarking) ? "cursor-not-allowed" : "cursor-pointer"} ${draggedOption === option ? "opacity-30 scale-95 border-dashed" : ""}`}
                                                    style={{ touchAction: 'none' }}
                                                >
                                                    <div
                                                        className={`flex items-center justify-center w-6 h-6 rounded-full border font-rounded-bold text-xs flex-shrink-0 ${isMarked
                                                            ? isOptionCorrect(option, category)
                                                                ? "bg-[#7CC500] border-[#7CC500] text-white"
                                                                : "bg-[#FF4B4C] border-[#FF4B4C] text-white"
                                                            : "border-[#F0F0F0] text-[rgba(0,0,0,0.8)]"
                                                            }`}
                                                    >
                                                        {getOptionLetter(getOriginalOptionIndex(option))}
                                                    </div>
                                                    <span className="flex-1">
                                                        {option}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
} 