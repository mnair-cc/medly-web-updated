'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDesmosButtonDetection } from '@/app/_hooks/useDesmosButtonDetection';
import DesmosMedlyLayer from './DesmosMedlyLayer';
import { useResponsive } from '@/app/_hooks/useResponsive';


// Extend the global Window interface to include Desmos
declare global {
    interface Window {
        Desmos: {
            GraphingCalculator: (element: HTMLElement, options?: any) => any;
            ScientificCalculator: (element: HTMLElement, options?: any) => any;
        };
    }
}

interface ExpressionItemDecoration {
    index: number;
    decoration: boolean;
}

interface DesmosStepProps {
    desmos_type?: "graph" | "scientific";
    width?: number;
    height?: number;
    expressions?: Array<{
        id?: string;
        latex: string;
        color?: string;
        [key: string]: any;
    }>;
    options?: any;
    onExpressionsChange?: (expressions: any[]) => void;
    onPressCheckDesmos?: () => void;
    onExpressionItemPress?: (index: number, element: HTMLElement) => void;
    onPressUnderline?: (index: number) => void;
    showMedlyLayer?: boolean;
    isAwaitingResponse?: boolean;
    expressionItemDecorations?: ExpressionItemDecoration[];
    isPracticeMode?: boolean;
}



export default function DesmosStep({
    desmos_type = "graph",
    width = 600,
    height = 400,
    expressions = [],
    options = {},
    onExpressionsChange,
    onPressCheckDesmos,
    onExpressionItemPress,
    onPressUnderline,
    showMedlyLayer = false,
    isAwaitingResponse = false,
    expressionItemDecorations = [],
    isPracticeMode = false
}: DesmosStepProps) {
    const calculatorRef = useRef<HTMLDivElement>(null);
    const calculatorInstance = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentBounds, setCurrentBounds] = useState<any>(null);
    const { isWideScreen } = useResponsive();

    // Helper function to send expressions with bounds (for graphing calculator)
    const sendExpressionsWithBounds = useCallback((expressions: any[], bounds?: any) => {
        if (!onExpressionsChange) return;

        if (desmos_type === "scientific") {
            // Scientific calculator doesn't have bounds, send expressions as-is
            onExpressionsChange(expressions);
            return;
        }

        // For graphing calculator, include bounds as a special entry
        const boundsToUse = bounds || currentBounds;
        const expressionsWithBounds = [...expressions];

        if (boundsToUse) {
            expressionsWithBounds.push({
                id: '__graph_bounds__',
                type: 'graphBounds',
                graphBounds: {
                    mathCoordinates: boundsToUse.mathCoordinates,
                    pixelCoordinates: boundsToUse.pixelCoordinates,
                    left: boundsToUse.mathCoordinates.left,
                    right: boundsToUse.mathCoordinates.right,
                    bottom: boundsToUse.mathCoordinates.bottom,
                    top: boundsToUse.mathCoordinates.top
                },
                latex: `\\text{Bounds: } [${boundsToUse.mathCoordinates.left.toFixed(2)}, ${boundsToUse.mathCoordinates.right.toFixed(2)}] \\times [${boundsToUse.mathCoordinates.bottom.toFixed(2)}, ${boundsToUse.mathCoordinates.top.toFixed(2)}]`
            });
        }

        onExpressionsChange(expressionsWithBounds);
    }, [onExpressionsChange, desmos_type, currentBounds]);

    // Load Desmos API script
    useEffect(() => {
        // Guard against SSR
        if (typeof window === 'undefined') return;

        const loadDesmosScript = () => {
            // Check if script is already loaded or loading
            if (window.Desmos) {
                setIsLoaded(true);
                return;
            }

            // Check if script is already in DOM
            const existingScript = document.querySelector('script[src*="desmos.com/api"]');
            if (existingScript) {
                // Script exists but may not be loaded yet, wait for it
                const checkLoaded = () => {
                    if (window.Desmos) {
                        setIsLoaded(true);
                    } else {
                        setTimeout(checkLoaded, 100);
                    }
                };
                checkLoaded();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://www.desmos.com/api/v1.11/calculator.js?apiKey=f04ac3ce0c8f48a88d5b2e08a90b3066';
            script.async = true;
            script.onload = () => {
                setIsLoaded(true);
            };
            script.onerror = () => {
                console.error('Failed to load Desmos API');
            };

            document.head.appendChild(script);
        };

        loadDesmosScript();
    }, []);

    // Initialize calculator when script is loaded
    useEffect(() => {
        if (typeof window === 'undefined' || !isLoaded || !calculatorRef.current || !window.Desmos) return;

        // Prevent multiple initializations
        if (calculatorInstance.current) return;

        try {
            // Default options based on calculator type
            let defaultOptions = {};

            if (desmos_type === "scientific") {
                // Scientific calculator options
                defaultOptions = {
                    keypad: true,
                    expressions: true,
                    settingsMenu: true,
                    expressionsTopbar: true,
                    border: true,
                    ...options
                };

                // Create the scientific calculator instance
                calculatorInstance.current = window.Desmos.ScientificCalculator(
                    calculatorRef.current,
                    defaultOptions
                );
            } else {
                // Graphing calculator options (default)
                defaultOptions = {
                    keypad: true,
                    graphpaper: true,
                    expressions: true,
                    settingsMenu: true,
                    zoomButtons: true,
                    expressionsTopbar: true,
                    pointsOfInterest: true,
                    trace: true,
                    border: true,
                    ...options
                };

                // Create the graphing calculator instance
                calculatorInstance.current = window.Desmos.GraphingCalculator(
                    calculatorRef.current,
                    defaultOptions
                );
            }

            // Set initial expressions if provided
            expressions.forEach((expr, index) => {
                const { id, latex, color, ...otherProps } = expr;
                calculatorInstance.current.setExpression({
                    id: id || `expr-${index}`,
                    latex,
                    color,
                    ...otherProps
                });
            });

            // Observe expression analysis changes - only available for graphing calculator
            if (desmos_type !== "scientific" && calculatorInstance.current && typeof calculatorInstance.current.observe === 'function') {
                calculatorInstance.current.observe('expressionAnalysis', function () {
                    const analysisData = calculatorInstance.current.expressionAnalysis;
                    const currentExpressions = calculatorInstance.current.getExpressions();

                    // Create a map of expressions by ID for quick lookup
                    const expressionsMap = currentExpressions.reduce((map: any, expr: any) => {
                        map[expr.id] = expr;
                        return map;
                    }, {});

                    // Transform the analysis object into an array of objects with content
                    const expressionAnalysisArray = Object.keys(analysisData).map(expressionId => ({
                        id: expressionId,
                        latex: expressionsMap[expressionId]?.latex || 'N/A',
                        type: expressionsMap[expressionId]?.type || 'expression',
                        isGraphable: analysisData[expressionId].isGraphable,
                        isError: analysisData[expressionId].isError,
                        errorMessage: analysisData[expressionId].errorMessage || null,
                        evaluationDisplayed: analysisData[expressionId].evaluationDisplayed || false,
                        evaluation: analysisData[expressionId].evaluation || null
                    }));

                });
            }

            // Observe graph paper bounds changes (zoom/pan) - only for graphing calculator
            if (desmos_type !== "scientific" && calculatorInstance.current && typeof calculatorInstance.current.observe === 'function') {
                calculatorInstance.current.observe('graphpaperBounds', function () {
                    const bounds = calculatorInstance.current.graphpaperBounds;
                    // Update current bounds state
                    setCurrentBounds(bounds);

                    // Send updated expressions with new bounds
                    if (calculatorInstance.current && typeof calculatorInstance.current.getExpressions === 'function') {
                        const currentExpressions = calculatorInstance.current.getExpressions();
                        sendExpressionsWithBounds(currentExpressions, bounds);
                    }
                });
            }

            // Send initial expressions immediately after initialization
            setTimeout(() => {
                if (calculatorInstance.current) {
                    // Handle different APIs for different calculator types
                    if (desmos_type === "scientific") {
                        // Scientific calculator uses getState() instead of getExpressions()
                        if (typeof calculatorInstance.current.getState === 'function') {
                            const state = calculatorInstance.current.getState();
                            // Convert state to expressions format for consistency
                            const expressions = state.expressions || [];
                            sendExpressionsWithBounds(expressions);
                        }
                    } else {
                        // Graphing calculator uses getExpressions()
                        if (typeof calculatorInstance.current.getExpressions === 'function') {
                            const initialExpressions = calculatorInstance.current.getExpressions();

                            // Also get initial bounds for graphing calculator
                            const initialBounds = calculatorInstance.current.graphpaperBounds;
                            if (initialBounds) {
                                setCurrentBounds(initialBounds);
                                sendExpressionsWithBounds(initialExpressions, initialBounds);
                            } else {
                                sendExpressionsWithBounds(initialExpressions);
                            }
                        }
                    }


                }
            }, 100); // Small delay to ensure calculator is fully ready

        } catch (error) {
            console.error('Error initializing Desmos calculator:', error);
        }
    }, [isLoaded, expressions, options, desmos_type]);

    // Keep track of previous expressions to detect when Enter is pressed on non-empty lines
    const previousExpressionsRef = useRef<any[]>([]);

    // Separate effect to handle the 'change' observer with updated onExpressionsChange
    useEffect(() => {
        if (!calculatorInstance.current) {
            return;
        }

        if (typeof calculatorInstance.current.observeEvent !== 'function') {
            return;
        }

        // Remove any existing 'change' observer
        if (typeof calculatorInstance.current.unobserveEvent === 'function') {
            calculatorInstance.current.unobserveEvent('change');
        }

        // Add the 'change' observer with the current onExpressionsChange callback
        calculatorInstance.current.observeEvent('change', function (eventName: string, event: any) {
            // Handle different event structures for different calculator types
            const isUserInitiated = event && typeof event.isUserInitiated === 'boolean' ? event.isUserInitiated : true;

            // Get current expressions/state and notify parent component
            if (calculatorInstance.current) {
                let currentExpressions = [];

                if (desmos_type === "scientific") {
                    // Scientific calculator uses getState()
                    if (typeof calculatorInstance.current.getState === 'function') {
                        const state = calculatorInstance.current.getState();
                        currentExpressions = state.expressions || [];
                    } else {
                        return;
                    }
                } else {
                    // Graphing calculator uses getExpressions()
                    if (typeof calculatorInstance.current.getExpressions === 'function') {
                        currentExpressions = calculatorInstance.current.getExpressions();
                    } else {
                        return;
                    }
                }

                // Detect when Enter is pressed on a non-empty line
                if (isUserInitiated && previousExpressionsRef.current.length > 0) {
                    const previousExpressions = previousExpressionsRef.current;

                    // Check if a new expression was added (length increased by 1)
                    if (currentExpressions.length === previousExpressions.length + 1) {

                        // Find the index where the new expression was added
                        let newExpressionIndex = -1;
                        for (let i = 0; i < currentExpressions.length; i++) {
                            // If this index didn't exist before, or the expression changed significantly
                            if (i >= previousExpressions.length ||
                                (previousExpressions[i] && currentExpressions[i].id !== previousExpressions[i].id)) {
                                newExpressionIndex = i;
                                break;
                            }
                        }

                        // Check if the previous expression (where Enter was pressed) had content
                        if (newExpressionIndex > 0) {
                            const previousExpression = previousExpressions[newExpressionIndex - 1];

                            if (previousExpression && previousExpression.latex && previousExpression.latex.trim() !== '') {
                            }
                        }
                    }
                }
                previousExpressionsRef.current = [...currentExpressions];

                if (onExpressionsChange) {
                    sendExpressionsWithBounds(currentExpressions);
                }
            }
        });

        // Cleanup function to remove the observer
        return () => {
            if (calculatorInstance.current && typeof calculatorInstance.current.unobserveEvent === 'function') {
                calculatorInstance.current.unobserveEvent('change');
            }
        };
    }, [onExpressionsChange, desmos_type]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (calculatorInstance.current) {
                try {
                    // Remove event observers before destroying
                    // Note: 'change' observer is handled in separate effect above
                    if (typeof calculatorInstance.current.unobserve === 'function') {
                        // Only unobserve expressionAnalysis if it was added (graphing calculator only)
                        if (desmos_type !== "scientific") {
                            calculatorInstance.current.unobserve('expressionAnalysis');
                            calculatorInstance.current.unobserve('graphpaperBounds');
                        }
                    }

                    // Destroy the calculator instance
                    if (typeof calculatorInstance.current.destroy === 'function') {
                        calculatorInstance.current.destroy();
                    }
                    calculatorInstance.current = null;
                } catch (error) {
                    console.error('Error destroying Desmos calculator:', error);
                }
            }
        };
    }, [desmos_type]);

    // Function to add quadratic equation demo
    const addQuadraticDemo = () => {
        if (!calculatorInstance.current) return;

        // Main quadratic equation
        calculatorInstance.current.setExpression({ id: 'quad', latex: 'y = a x^2 + b x + c' });

        // Parameters
        calculatorInstance.current.setExpression({ id: 'a', latex: 'a=1' });
        calculatorInstance.current.setExpression({ id: 'b', latex: 'b=0' });
        calculatorInstance.current.setExpression({ id: 'c', latex: 'c=-4' });

        // Discriminant
        calculatorInstance.current.setExpression({ id: 'disc', latex: 'D = b^2 - 4ac' });

        // Roots
        calculatorInstance.current.setExpression({ id: 'x1', latex: 'x_1 = \\frac{-b - \\sqrt{D}}{2a}' });
        calculatorInstance.current.setExpression({ id: 'x2', latex: 'x_2 = \\frac{-b + \\sqrt{D}}{2a}' });

        // Points at x-intercepts
        calculatorInstance.current.setExpression({
            id: 'pt1',
            latex: '(x_1, 0)',
            showLabel: true,
            label: 'x₁',
            color: '#2d70b3', // Desmos.Colors.BLUE
            pointStyle: 'STAR'
        });

        calculatorInstance.current.setExpression({
            id: 'pt2',
            latex: '(x_2, 0)',
            showLabel: true,
            label: 'x₂',
            color: '#c74440', // Desmos.Colors.RED
            pointStyle: 'STAR'
        });

    };

    // Use the hook for button click detection
    // const clickedButtons = useDesmosButtonDetection({
    //     containerRef: calculatorRef,
    //     enabled: isLoaded && !!calculatorInstance.current,
    //     onButtonClick: (selector, buttonText, element) => {
    //         // Custom logic can go here if needed
    //         console.log('Custom handler:', {selector, buttonText});
    //     }
    // });

    return (
        <div className="desmos-step" style={{ width: '100%', height: '100%', position: 'relative', minHeight: '400px' }}>
            <div
                ref={calculatorRef}
                style={{
                    width: '100%',
                    height: '100%',
                    // border: '1px solid transparent',
                    // borderRadius: '4px'
                }}
            />
            {isWideScreen && isPracticeMode && (
                <DesmosMedlyLayer
                    containerRef={calculatorRef}
                    onPressCheckDesmos={onPressCheckDesmos}
                    onExpressionItemPress={onExpressionItemPress}
                    onPressUnderline={onPressUnderline}
                    isAwaitingResponse={isAwaitingResponse}
                    calculatorInstance={calculatorInstance}
                    showMedlyLayer={isLoaded}
                    expressionItemDecorations={expressionItemDecorations}
                />
            )}
            {!isLoaded && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#666'
                }}>
                </div>
            )}
        </div>
    );
}
