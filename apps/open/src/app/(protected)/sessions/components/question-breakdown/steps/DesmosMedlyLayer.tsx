'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Spinner from '@/app/_components/Spinner';
import ArrowWithTailUpIcon from '@/app/_components/icons/ArrowWithTailUpIcon';

interface ExpressionItemDecoration {
    index: number;
    decoration: boolean;
}

interface DesmosMedlyLayerProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    onPressCheckDesmos?: () => void;
    onExpressionItemPress?: (index: number, element: HTMLElement) => void;
    onPressUnderline?: (index: number) => void;
    isAwaitingResponse?: boolean;
    calculatorInstance?: React.RefObject<any>;
    showMedlyLayer?: boolean;
    expressionItemDecorations?: ExpressionItemDecoration[];
}

// React component for the overlay text
function OverlayText({ onPressCheckDesmos, isAwaitingResponse, hasContent }: { onPressCheckDesmos?: () => void, isAwaitingResponse?: boolean, hasContent?: boolean }) {
    // Only show the button if there's content
    if (!hasContent) {
        return null;
    }
    return (
        <>
            {/* Background highlight */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    zIndex: 1
                }}
            />

            {/* Text overlay */}

            <div className="absolute right-0 top-0 w-10 h-10 bg-white" />
            <button
                className="font-rounded-semibold absolute top-3 right-3 bg-white py-1 rounded-full text-black text-xs font-bold z-[2] whitespace-nowrap flex items-center gap-1 hover:bg-gray-50 transition-colors cursor-pointer justify-center"
                style={{
                    boxShadow: '0px 0px 15px 0px rgba(0, 0, 0, 0.15)',
                    width: '68px',
                    paddingRight: '0px',
                    paddingLeft: '2px',
                    pointerEvents: 'auto',
                    gap: '6px'
                }}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPressCheckDesmos?.();
                }}
                disabled={isAwaitingResponse}
            >
                {!isAwaitingResponse ? (
                    <>
                        Send
                        <ArrowWithTailUpIcon
                            backgroundColor="#00AEFF"
                            fillColor="white"
                            width={18}
                            height={18}
                        />
                    </>
                ) : (
                    <Spinner size="small" />
                )}
            </button>
        </>
    );
}

export default function DesmosMedlyLayer({
    containerRef,
    onPressCheckDesmos,
    onExpressionItemPress,
    onPressUnderline,
    isAwaitingResponse = false,
    calculatorInstance,
    showMedlyLayer = false,
    expressionItemDecorations = []
}: DesmosMedlyLayerProps) {
    const highlightedElementRef = useRef<HTMLElement | null>(null);
    const reactRootRef = useRef<any>(null);
    const originalStylesRef = useRef<string>('');
    const decoratedElementsRef = useRef<Map<HTMLElement, string>>(new Map()); // Track original styles of decorated elements
    const [forceUpdate, setForceUpdate] = useState(0);

    // Function to check if the selected expression has meaningful content
    const hasSelectedExpressionContent = (targetDiv: HTMLElement): boolean => {
        try {
            // Handle expression tables - they always have content if selected
            if (targetDiv.classList.contains('dcg-expressiontable')) {
                return true;
            }

            // Method 1: Check for empty class
            const rootBlock = targetDiv.querySelector('.dcg-mq-root-block');
            if (rootBlock?.classList.contains('dcg-mq-empty')) {
                return false;
            }

            // Method 2: Use Desmos API if available
            if (calculatorInstance?.current) {
                const exprId = targetDiv.getAttribute('expr-id');
                if (exprId) {
                    try {
                        const expressions = calculatorInstance.current.getExpressions();
                        const targetExpression = expressions.find((expr: any) => expr.id === exprId);
                        if (targetExpression && targetExpression.latex && targetExpression.latex.trim() !== '') {
                            return true;
                        }
                    } catch (error) {
                        console.log('🔍 Could not use API to check content, falling back to DOM:', error);
                    }
                }
            }

            // Method 3: Fallback DOM content check
            if (rootBlock && !rootBlock.classList.contains('dcg-mq-empty')) {
                const hasVariables = rootBlock.querySelector('var');
                const hasDigits = rootBlock.querySelector('.dcg-mq-digit');
                const hasOperators = rootBlock.querySelector('.dcg-mq-binary-operator, .dcg-mq-operator');
                const hasFractions = rootBlock.querySelector('.dcg-mq-fraction');
                const hasSqrt = rootBlock.querySelector('.dcg-mq-sqrt');

                const hasContent = !!hasVariables || !!hasDigits || !!hasOperators || !!hasFractions || !!hasSqrt;
                return hasContent;
            }

            return false;
        } catch (error) {
            console.error('🔍 Error checking expression content:', error);
            return false;
        }
    };

    // Function to apply decorations to expression items
    const applyExpressionDecorations = () => {
        if (!containerRef.current || expressionItemDecorations.length === 0) return;

        // Get all expression items
        const expressionItems = containerRef.current.querySelectorAll('.dcg-expressionitem.dcg-mathitem') as NodeListOf<HTMLElement>;

        // Clear previous decorations for items that should no longer be decorated
        decoratedElementsRef.current.forEach((_, element) => {
            const expressionIndex = Array.from(expressionItems).indexOf(element);
            const shouldBeDecorated = expressionItemDecorations.some(({ index, decoration }) =>
                index === expressionIndex && decoration
            );

            if (!shouldBeDecorated) {
                // Remove existing underline decoration
                const existingUnderline = element.querySelector('.medly-math-underline');
                if (existingUnderline) {
                    // Remove click handler from underline
                    if ((existingUnderline as any)._medlyUnderlineClickHandler) {
                        existingUnderline.removeEventListener('click', (existingUnderline as any)._medlyUnderlineClickHandler);
                        delete (existingUnderline as any)._medlyUnderlineClickHandler;
                    }
                    existingUnderline.remove();
                }

                // Reset cursor and remove attributes
                element.style.cursor = '';
                element.removeAttribute('data-medly-decorated');

                // Remove click handler
                if ((element as any)._medlyClickHandler) {
                    element.removeEventListener('click', (element as any)._medlyClickHandler);
                    delete (element as any)._medlyClickHandler;
                }

                decoratedElementsRef.current.delete(element);
            }
        });

        // Apply new decorations
        expressionItemDecorations.forEach(({ index, decoration }) => {
            if (decoration && expressionItems[index]) {
                const element = expressionItems[index];

                // Skip if already decorated to prevent rerendering loop
                if (decoratedElementsRef.current.has(element)) {
                    return;
                }

                // Find the math content within the expression
                const mathField = element.querySelector('.dcg-math-field');
                const rootBlock = element.querySelector('.dcg-mq-root-block');

                if (mathField && rootBlock) {
                    // Store element reference
                    decoratedElementsRef.current.set(element, '');

                    // Make sure the math field has relative positioning for absolute children
                    const mathFieldElement = mathField as HTMLElement;
                    const currentPosition = getComputedStyle(mathFieldElement).position;
                    if (currentPosition === 'static') {
                        mathFieldElement.style.position = 'relative';
                    }

                    // Calculate the width of actual math content (excluding cursor)
                    const rootBlockElement = rootBlock as HTMLElement;
                    const contentSpans = rootBlockElement.querySelectorAll('span:not(.dcg-mq-cursor), var');

                    let leftMost = Infinity;
                    let rightMost = -Infinity;

                    if (contentSpans.length > 0) {
                        const mathFieldRect = mathFieldElement.getBoundingClientRect();

                        // Find the leftmost and rightmost positions of content
                        contentSpans.forEach(span => {
                            const spanRect = (span as HTMLElement).getBoundingClientRect();
                            leftMost = Math.min(leftMost, spanRect.left - mathFieldRect.left);
                            rightMost = Math.max(rightMost, spanRect.right - mathFieldRect.left);
                        });

                        // Calculate position relative to math field
                        const rootBlockRect = rootBlockElement.getBoundingClientRect();
                        const topOffset = rootBlockRect.bottom - mathFieldRect.top + 0; // 2px gap
                        const width = rightMost - leftMost;

                        // Create underline element
                        const underline = document.createElement('div');
                        underline.className = 'medly-math-underline';
                        underline.style.cssText = `
                            position: absolute !important;
                            left: ${leftMost}px !important;
                            top: ${topOffset}px !important;
                            width: ${width}px !important;
                            height: 0 !important;
                            border-bottom: 2px dotted red !important;
                            pointer-events: auto !important;
                            z-index: 10 !important;
                            cursor: pointer !important;
                            padding: 2px 0 !important;
                        `;

                        // Add click handler to underline
                        const underlineClickHandler = (e: Event) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Underline clicked for expression index:', index);
                            onPressUnderline?.(index);
                        };

                        underline.addEventListener('click', underlineClickHandler);

                        // Store the handler for cleanup
                        (underline as any)._medlyUnderlineClickHandler = underlineClickHandler;

                        // Append underline to math field
                        mathFieldElement.appendChild(underline);
                    }

                    // Add click handler if not already added
                    if (!element.hasAttribute('data-medly-decorated')) {
                        element.setAttribute('data-medly-decorated', 'true');
                        element.style.cursor = 'pointer';

                        const clickHandler = (e: Event) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onExpressionItemPress?.(index, element);
                        };

                        element.addEventListener('click', clickHandler);

                        // Store the handler so we can remove it later
                        (element as any)._medlyClickHandler = clickHandler;
                    }
                }
            }
        });
    };

    // Add this to the window for easy access in console
    useEffect(() => {
        if (showMedlyLayer) {
            (window as any).refreshOverlay = () => {
                setForceUpdate(prev => prev + 1);
            };
        }
    }, [showMedlyLayer]);

    useEffect(() => {
        if (!showMedlyLayer || !containerRef.current) return;

        const cleanupPreviousHighlight = () => {
            // Unmount React component
            if (reactRootRef.current) {
                reactRootRef.current.unmount();
                reactRootRef.current = null;
            }

            // Only restore position if we changed it from static
            if (highlightedElementRef.current && originalStylesRef.current === 'position-was-static') {
                highlightedElementRef.current.style.position = '';
            }

            // Clean up references
            highlightedElementRef.current = null;
            originalStylesRef.current = '';
        };

        const highlightElement = () => {
            if (!containerRef.current) return;

            // Apply expression decorations
            applyExpressionDecorations();

            // Find the currently selected expression (item or table)
            const targetDiv = containerRef.current.querySelector('.dcg-expressionitem.dcg-mathitem.dcg-selected, .dcg-expressiontable.dcg-selected') as HTMLElement;

            if (targetDiv) {
                // If this is already the highlighted element, don't redo it
                if (highlightedElementRef.current === targetDiv) {
                    return;
                }

                // Check if the expression has actually rendered content
                const hasExpressionContent = targetDiv.querySelector('.dcg-mathquill-wrapper, .dcg-math-field') ||
                    targetDiv.classList.contains('dcg-expressiontable');

                // Only proceed if we have actual content
                if (!hasExpressionContent) {
                    return;
                }

                // Clean up previous highlighting first
                cleanupPreviousHighlight();

                // Store reference to the new element (but don't modify its styles!)
                highlightedElementRef.current = targetDiv;

                // Create a container div for our overlay that won't interfere with the target
                const overlayContainer = document.createElement('div');
                overlayContainer.style.cssText = `
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    pointer-events: none !important;
                    z-index: 1000 !important;
                    `;

                // Make sure the target element can contain absolutely positioned children
                const currentPosition = getComputedStyle(targetDiv).position;
                if (currentPosition === 'static') {
                    targetDiv.style.position = 'relative';
                    originalStylesRef.current = 'position-was-static'; // Flag to remember this
                } else {
                    originalStylesRef.current = 'position-was-not-static';
                }

                // Append the container to the target element
                targetDiv.appendChild(overlayContainer);

                // Check if the selected expression has content
                const hasContent = hasSelectedExpressionContent(targetDiv);

                // Create React root and render the overlay component inside our container
                reactRootRef.current = createRoot(overlayContainer);
                reactRootRef.current.render(<OverlayText onPressCheckDesmos={onPressCheckDesmos} isAwaitingResponse={isAwaitingResponse} hasContent={hasContent} />);
            } else {
                // No selected expression found - clean up any existing highlight
                cleanupPreviousHighlight();
            }
        };

        // Start highlighting immediately
        highlightElement();

        // Set up interval to continuously check for selection changes
        const interval = setInterval(highlightElement, 100);

        return () => {
            clearInterval(interval);

            // Clean up on unmount
            cleanupPreviousHighlight();

            // Clean up decorated elements
            decoratedElementsRef.current.forEach((_, element) => {
                // Remove existing underline decoration
                const existingUnderline = element.querySelector('.medly-math-underline');
                if (existingUnderline) {
                    // Remove click handler from underline
                    if ((existingUnderline as any)._medlyUnderlineClickHandler) {
                        existingUnderline.removeEventListener('click', (existingUnderline as any)._medlyUnderlineClickHandler);
                        delete (existingUnderline as any)._medlyUnderlineClickHandler;
                    }
                    existingUnderline.remove();
                }

                // Reset cursor and remove attributes
                element.style.cursor = '';
                element.removeAttribute('data-medly-decorated');

                // Remove click handler
                if ((element as any)._medlyClickHandler) {
                    element.removeEventListener('click', (element as any)._medlyClickHandler);
                    delete (element as any)._medlyClickHandler;
                }
            });
            decoratedElementsRef.current.clear();
        };
    }, [containerRef, forceUpdate, isAwaitingResponse, onPressCheckDesmos, calculatorInstance, expressionItemDecorations, onExpressionItemPress, onPressUnderline, showMedlyLayer]);

    // Return null if the layer should not be shown
    if (!showMedlyLayer) {
        return null;
    }

    return null; // This component doesn't render anything in React
}