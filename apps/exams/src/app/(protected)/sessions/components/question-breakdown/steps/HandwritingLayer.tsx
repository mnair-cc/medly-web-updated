'use client';

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { CrossCanvasRegistry } from '@/app/_lib/utils/CrossCanvasRegistry';
import { createRoot } from 'react-dom/client';
import { useMathpixOCR } from '@/app/_hooks/useMathpixOCR';
import CustomSketchCanvas from './CustomSketchCanvas';
import Spinner from '@/app/_components/Spinner';

interface ExpressionItemDecoration {
    index: number;
    decoration: boolean;
    validationState?: 'invalid' | 'indeterminate' | 'valid'; // Add validation state for different decoration colors
}

interface HandwritingLayerProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    onPressCheckDesmos?: () => void;
    onExpressionItemPress?: (index: number, element: HTMLElement) => void;
    onPressUnderline?: (index: number) => void;
    onExpressionUpdated?: (expressionIndex: number, latex: string) => void;
    onExpressionLineFocusChange?: (previousIndex: number | null, currentIndex: number) => void;
    isAwaitingResponse?: boolean;
    calculatorInstance?: React.RefObject<any>;
    showMedlyLayer?: boolean;
    expressionItemDecorations?: ExpressionItemDecoration[];
    currentTool?: 'pen' | 'eraser' | '';
    onOcrEvent?: (payload: { expressionIndex: number; strokes: any; ocr: any | null }) => void;
    autoExpandBehavior?: 'none' | 'auto' | 'always';
    floatingMessage?: {
        text: string;
        targetText?: string;
        targetAction?: string;
        targetIndex?: number;
        targetComponent?: string;
    };
    hideExpressionCalculatedOutput?: boolean;
    hideSendButton?: boolean;
    isReadOnly?: boolean;
    initialExpressionData?: any[]; // Array of saved expression data for each canvas
    questionId?: string;
    onStrokeAdded?: (questionId: string, canvasRef: any, strokeId: string, strokeData?: any) => void;
    onStrokeRemoved?: (questionId: string, strokeId: string) => void;
    onEraseAction?: (questionId: string, canvasRef: any, erasedData: any) => void;
    // Optional global cross-canvas id to register this Desmos container under
    globalCanvasId?: string;
}

// Define the methods that can be called via ref
interface HandwritingLayerHandle {
    triggerUndo: () => void;
    triggerRedo: () => void;
    triggerClearAll: () => void;
}



// Interface for tracking strokes globally across all canvases
interface GlobalStroke {
    strokeId: string; // Unique stroke ID from canvas
    canvasRef: any;
    expressionElement: HTMLElement;
    timestamp: number;
}

// Interface for tracking redo operations
interface RedoOperation {
    type: 'stroke' | 'cross-canvas-erase' | 'clear-all';
    timestamp: number;
    data: any;
}

const HandwritingLayer = forwardRef<HandwritingLayerHandle, HandwritingLayerProps>(function HandwritingLayer({
    containerRef,
    onPressCheckDesmos,
    onExpressionItemPress,
    onPressUnderline,
    onExpressionUpdated,
    onExpressionLineFocusChange,
    isAwaitingResponse = false,
    calculatorInstance,
    showMedlyLayer = false,
    expressionItemDecorations = [],
    currentTool = 'pen',
    onOcrEvent,
    floatingMessage,
    hideExpressionCalculatedOutput = false,
    hideSendButton = false,
    isReadOnly = false,
    initialExpressionData = [],
    questionId,
    onStrokeAdded,
    onStrokeRemoved,
    onEraseAction,
    autoExpandBehavior = 'auto'
}, ref) {
    const highlightedElementRef = useRef<HTMLElement | null>(null);
    const reactRootRef = useRef<any>(null);
    const originalStylesRef = useRef<string>('');
    const decoratedElementsRef = useRef<Map<HTMLElement, string>>(new Map()); // Track original styles of decorated elements

    const sketchCanvasRefs = useRef<Map<HTMLElement, any>>(new Map()); // Track sketch canvas refs for undo/clear
    const overlayToIdRef = useRef<Map<HTMLElement, string>>(new Map()); // Map overlay to registry id
    const currentToolRef = useRef<'pen' | 'eraser' | ''>(currentTool); // Track current tool
    const globalStrokeHistory = useRef<GlobalStroke[]>([]); // Track all strokes across all canvases globally
    const lastEditedExpressionRef = useRef<HTMLElement | null>(null); // Track which expression was last edited
    const canvasCoordinateMapRef = useRef<Map<HTMLElement, DOMRect>>(new Map()); // Track canvas positions for coordinate transformation
    const crossCanvasOperationRef = useRef<{ canvases: HTMLElement[], operation: 'erase' } | null>(null); // Track cross-canvas operations for undo
    const strokeBoundsRef = useRef<Map<HTMLElement, { left: number; right: number; top: number; bottom: number; width: number; height: number }>>(new Map()); // Store stroke bounds immediately when strokes are added
    const confidenceDataRef = useRef<Map<number, number>>(new Map()); // Track confidence scores per expression index

    // Timestamp and clear tracking for global undo/clear functionality
    const lastStrokeTimeRef = useRef<number>(0); // Track timestamp of last stroke
    const clearedDataRef = useRef<any>(null); // Store cleared data for undo after clear
    const floatingMessageRef = useRef(floatingMessage); // Track current floating message for event handlers
    const redoHistoryRef = useRef<RedoOperation[]>([]); // Track operations that can be redone

    const [forceUpdate, setForceUpdate] = useState(0);
    const [containerReady, setContainerReady] = useState(false);

    // Use the Mathpix OCR hook
    const { processStrokes, isLoading: isMathpixLoading, error: mathpixError } = useMathpixOCR();

    // Helper function to update expression focus and notify changes
    const updateExpressionFocus = useCallback((newExpression: HTMLElement | null) => {
        const previousExpression = lastEditedExpressionRef.current;

        // Only proceed if the expression actually changed
        if (previousExpression === newExpression) return;

        lastEditedExpressionRef.current = newExpression;

        // Get expression indices for the callback
        if (onExpressionLineFocusChangeRef.current && containerRef.current) {
            const basicExpressions = containerRef.current.querySelectorAll('.dcg-basic-expression') as NodeListOf<HTMLElement>;

            let previousIndex: number | null = null;
            let currentIndex: number = -1;

            // Find previous expression index
            if (previousExpression) {
                basicExpressions.forEach((expression, index) => {
                    if (expression === previousExpression) {
                        previousIndex = index;
                    }
                });
            }

            // Find current expression index
            if (newExpression) {
                basicExpressions.forEach((expression, index) => {
                    if (expression === newExpression) {
                        currentIndex = index;
                    }
                });
            }

            // Always call callback, even when newExpression is null (for clear all/undo operations)
            if (newExpression && currentIndex >= 0) {
                onExpressionLineFocusChangeRef.current(previousIndex, currentIndex);
            } else if (!newExpression) {
                onExpressionLineFocusChangeRef.current(previousIndex, -1);
            }
        }
    }, [containerRef]);

    // Coordinate transformation utilities for cross-canvas operations
    const updateCanvasCoordinateMap = useCallback(() => {
        if (!containerRef.current) return;

        const basicExpressions = containerRef.current.querySelectorAll('.dcg-basic-expression') as NodeListOf<HTMLElement>;
        basicExpressions.forEach(expression => {
            const rect = expression.getBoundingClientRect();
            canvasCoordinateMapRef.current.set(expression, rect);
        });
    }, []);

    const transformPointBetweenCanvases = useCallback((point: { x: number, y: number }, fromCanvas: HTMLElement, toCanvas: HTMLElement): { x: number, y: number } => {
        const fromRect = canvasCoordinateMapRef.current.get(fromCanvas);
        const toRect = canvasCoordinateMapRef.current.get(toCanvas);

        if (!fromRect || !toRect) {
            console.warn('⚠️ Cannot transform point - canvas rects not found');
            return point;
        }

        // Convert from local coordinates to global screen coordinates
        const globalX = fromRect.left + point.x;
        const globalY = fromRect.top + point.y;

        // Convert from global screen coordinates to target canvas local coordinates
        const localX = globalX - toRect.left;
        const localY = globalY - toRect.top;

        return { x: localX, y: localY };
    }, []);

    const getCanvasesIntersectedByEraser = useCallback((eraserPoints: { x: number, y: number }[], originCanvas: HTMLElement): HTMLElement[] => {
        if (!containerRef.current) return [originCanvas];

        const intersectedCanvases = new Set<HTMLElement>([originCanvas]); // Always include origin canvas
        const basicExpressions = containerRef.current.querySelectorAll('.dcg-basic-expression') as NodeListOf<HTMLElement>;
        const originIndex = Array.from(basicExpressions).indexOf(originCanvas);

        console.log('🔍 Checking canvas intersection - origin canvas:', originIndex);

        basicExpressions.forEach((expression, index) => {
            if (expression === originCanvas) return; // Skip origin canvas, already included

            // Transform eraser points to this canvas's coordinate system
            const transformedPoints = eraserPoints.map(point =>
                transformPointBetweenCanvases(point, originCanvas, expression)
            );

            // Check if any transformed point is within this canvas bounds (with extended buffer for cross-canvas strokes)
            const targetRect = canvasCoordinateMapRef.current.get(expression);
            if (targetRect) {
                // Extended bounds to catch strokes that overflow from adjacent canvases
                const buffer = 100; // pixels buffer to catch overflow strokes
                const hasIntersection = transformedPoints.some(point =>
                    point.x >= -buffer && point.x <= targetRect.width + buffer &&
                    point.y >= -buffer && point.y <= targetRect.height + buffer
                );

                console.log('🔍 Canvas', index,
                    'intersection check:', hasIntersection,
                    'sample transformed point:', transformedPoints[0],
                    'canvas bounds (with buffer):', {
                        x: [-buffer, targetRect.width + buffer],
                        y: [-buffer, targetRect.height + buffer]
                    });

                if (hasIntersection) {
                    intersectedCanvases.add(expression);
                    console.log('✅ Canvas', index, 'added to intersected canvases');
                }
            }
        });

        console.log('🔍 Intersected canvases:', Array.from(intersectedCanvases).map(c => Array.from(basicExpressions).indexOf(c)));

        return Array.from(intersectedCanvases);
    }, [transformPointBetweenCanvases]);

    const previewCrossCanvasErasing = useCallback((eraserPoints: { x: number, y: number }[], originCanvas: HTMLElement) => {
        // Update coordinate map for accurate calculations
        updateCanvasCoordinateMap();

        // Find all canvases intersected by the eraser
        const intersectedCanvases = getCanvasesIntersectedByEraser(eraserPoints, originCanvas);

        // Clear preview on all canvases first
        sketchCanvasRefs.current.forEach((canvasRef) => {
            if (canvasRef && typeof canvasRef.clearErasePreview === 'function') {
                canvasRef.clearErasePreview();
            }
        });

        // Set preview on intersected canvases
        intersectedCanvases.forEach((canvas: HTMLElement) => {
            const canvasRef = sketchCanvasRefs.current.get(canvas);
            if (canvasRef && typeof canvasRef.previewCrossCanvasErase === 'function') {
                // Transform eraser points to this canvas's coordinate system
                const transformedPoints = eraserPoints.map(point =>
                    transformPointBetweenCanvases(point, originCanvas, canvas)
                );

                // Preview cross-canvas erasing
                canvasRef.previewCrossCanvasErase(transformedPoints);
            }
        });
    }, [updateCanvasCoordinateMap, getCanvasesIntersectedByEraser, transformPointBetweenCanvases]);

    const updateCanvasZIndices = useCallback((activeCanvasIndex: number | null) => {
        if (!containerRef.current) return;

        // Get all overlay containers
        const overlayContainers = containerRef.current.querySelectorAll('.medly-sketch-overlay') as NodeListOf<HTMLElement>;

        overlayContainers.forEach((overlay) => {
            const overlayIndex = (overlay as any)._medlyOverlayIndex;
            if (typeof overlayIndex === 'number') {
                if (activeCanvasIndex === overlayIndex) {
                    // Active canvas gets highest z-index
                    overlay.style.zIndex = '9999';
                } else {
                    // Reset other canvases to normal z-index
                    overlay.style.zIndex = '10';
                }
            }
        });
    }, []);

    // Function to update border styling based on floating message
    const updateOverlayBorders = useCallback(() => {
        if (!containerRef.current) return;

        // Get all overlay containers
        const overlayContainers = containerRef.current.querySelectorAll('.medly-sketch-overlay') as NodeListOf<HTMLElement>;

        overlayContainers.forEach((overlay) => {
            const overlayIndex = (overlay as any)._medlyOverlayIndex;
            if (typeof overlayIndex === 'number') {
                // Check if this overlay should have the animated border
                const shouldHighlight = floatingMessage?.targetAction === 'use_canvas' &&
                    floatingMessage?.targetIndex === overlayIndex &&
                    typeof floatingMessage?.targetIndex === 'number';

                if (shouldHighlight) {
                    // Apply animated border
                    overlay.style.border = '0px solid #007AFF';
                    overlay.style.animation = 'borderFade 0s ease-in-out infinite';
                    overlay.style.borderRadius = '0';
                } else {
                    // Remove border and animation
                    overlay.style.border = '';
                    overlay.style.animation = '';
                    overlay.style.borderRadius = '';
                }
            }
        });
    }, [floatingMessage]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        triggerUndo: async () => {
            console.log('🔄 HandwritingLayer: triggerUndo called');
            console.log('📊 Current redo history length:', redoHistoryRef.current.length);
            console.log('📊 Current redo history contents:', redoHistoryRef.current.map(op => `${op.type}@${op.timestamp}`));

            // Check if there's a cross-canvas operation to undo first
            if (crossCanvasOperationRef.current) {
                console.log('↩️ Undoing cross-canvas operation across', crossCanvasOperationRef.current.canvases.length, 'canvases');

                // Store reference before clearing
                const operation = crossCanvasOperationRef.current;

                // Store the operation in redo history before undoing
                const canvasDataBeforeUndo = new Map();
                for (const canvas of operation.canvases) {
                    const canvasRef = sketchCanvasRefs.current.get(canvas);
                    if (canvasRef && typeof canvasRef.exportPaths === 'function') {
                        try {
                            const pathData = await canvasRef.exportPaths();
                            canvasDataBeforeUndo.set(canvas, pathData);
                            console.log('💾 Exported canvas data for erase redo:', pathData);
                        } catch (error) {
                            console.warn('Failed to export paths for redo:', error);
                        }
                    }
                }

                const redoOp: RedoOperation = {
                    type: 'cross-canvas-erase',
                    timestamp: Date.now(),
                    data: {
                        canvases: operation.canvases,
                        operation: operation.operation,
                        canvasDataBeforeUndo,
                        lastEditedExpression: lastEditedExpressionRef.current,
                        globalStrokeHistory: [...globalStrokeHistory.current],
                        strokeBounds: new Map(strokeBoundsRef.current),
                        confidenceData: new Map(confidenceDataRef.current)
                    }
                };
                redoHistoryRef.current.push(redoOp);
                console.log('✅ Added cross-canvas-erase operation to redo history:', redoOp);
                console.log('📊 Redo history now has:', redoHistoryRef.current.length, 'operations');

                // Clear the cross-canvas operation first to prevent interference
                crossCanvasOperationRef.current = null;

                // Undo on all affected canvases
                operation.canvases.forEach(canvas => {
                    const canvasRef = sketchCanvasRefs.current.get(canvas);
                    if (canvasRef && typeof canvasRef.undo === 'function') {
                        // console.log('↩️ Calling undo on canvas:', Array.from(sketchCanvasRefs.current.keys()).indexOf(canvas));
                        canvasRef.undo();
                    }
                });

                // Update last edited expression (use first canvas from the operation)
                if (operation.canvases.length > 0) {
                    updateExpressionFocus(operation.canvases[0]);
                } else {
                    updateExpressionFocus(null);
                }

                // Update send button
                createOverlayTextForAllExpressions();
                // console.log('↩️ Cross-canvas undo completed');

                // Recompute sizing for all expressions after undo of cross-canvas operation
                recomputeAllExpressionsSizing();
                return;
            }

            if (globalStrokeHistory.current.length === 0) {
                // Check if we have cleared data to restore (undo after clear)
                if (clearedDataRef.current) {
                    console.log('📦 Restoring cleared data after clear all');
                    const clearedState = clearedDataRef.current;

                    // Store current empty state in redo history before restoring
                    const currentEmptyState = {
                        globalStrokeHistory: [...globalStrokeHistory.current],
                        lastEditedExpression: lastEditedExpressionRef.current,
                        crossCanvasOperation: crossCanvasOperationRef.current,
                        strokeBounds: new Map(strokeBoundsRef.current),
                        confidenceData: new Map(confidenceDataRef.current),
                        canvasData: new Map()
                    };

                    const redoOp: RedoOperation = {
                        type: 'clear-all',
                        timestamp: Date.now(),
                        data: {
                            emptyState: currentEmptyState,
                            clearedState: { ...clearedState }
                        }
                    };
                    redoHistoryRef.current.push(redoOp);
                    console.log('✅ Added clear-all operation to redo history:', redoOp);
                    console.log('📊 Redo history now has:', redoHistoryRef.current.length, 'operations');

                    // Restore canvas data first
                    clearedState.canvasData.forEach((pathData: any, expression: any) => {
                        const canvasRef = sketchCanvasRefs.current.get(expression);
                        if (canvasRef && typeof canvasRef.loadPaths === 'function') {
                            try {
                                canvasRef.loadPaths(pathData);
                                console.log('🔄 Restored paths for expression:', Array.from(sketchCanvasRefs.current.keys()).indexOf(expression));
                            } catch (error) {
                                console.warn('Failed to restore paths:', error);
                            }
                        }
                    });

                    // Restore global state
                    globalStrokeHistory.current = clearedState.globalStrokeHistory;
                    updateExpressionFocus(clearedState.lastEditedExpression);
                    crossCanvasOperationRef.current = clearedState.crossCanvasOperation;
                    strokeBoundsRef.current = clearedState.strokeBounds;
                    confidenceDataRef.current = clearedState.confidenceData;

                    // Clear the cleared data since it's been restored
                    clearedDataRef.current = null;

                    // Update UI components
                    createOverlayTextForAllExpressions();
                    updateExpressionVisibility();
                    applyStrokeExpressionDecorations();
                    recomputeAllExpressionsSizing();

                    console.log('✅ Cleared data restored successfully');
                    return;
                }

                // console.log('↩️ No strokes to undo and no cleared data to restore');
                updateExpressionFocus(null);
                createOverlayTextForAllExpressions();
                return;
            }

            // Find the most recent stroke across all canvases
            const lastStroke = globalStrokeHistory.current[globalStrokeHistory.current.length - 1];
            // console.log('↩️ Undoing most recent stroke from canvas:', Array.from(sketchCanvasRefs.current.keys()).indexOf(lastStroke.expressionElement));

            // Export the current stroke path data before undoing
            let strokePathData = null;
            if (lastStroke.canvasRef && typeof lastStroke.canvasRef.exportPaths === 'function') {
                try {
                    const exportedPaths = await lastStroke.canvasRef.exportPaths();
                    if (exportedPaths?.paths?.length > 0) {
                        // Get the last stroke (most recent one)
                        strokePathData = {
                            paths: [exportedPaths.paths[exportedPaths.paths.length - 1]]
                        };
                        console.log('💾 Exported stroke path data for redo:', strokePathData);
                    }
                } catch (error) {
                    console.warn('⚠️ Failed to export stroke paths for redo:', error);
                }
            }

            // Store the stroke in redo history before undoing
            const redoOp: RedoOperation = {
                type: 'stroke',
                timestamp: Date.now(),
                data: {
                    stroke: { ...lastStroke },
                    strokePathData, // Add the actual stroke path data
                    lastEditedExpression: lastEditedExpressionRef.current,
                    lastStrokeTime: lastStrokeTimeRef.current,
                    strokeBounds: strokeBoundsRef.current.get(lastStroke.expressionElement),
                    confidenceData: confidenceDataRef.current.get(
                        Array.from(sketchCanvasRefs.current.keys()).indexOf(lastStroke.expressionElement)
                    )
                }
            };
            redoHistoryRef.current.push(redoOp);
            console.log('✅ Added stroke operation to redo history:', redoOp);
            console.log('📊 Redo history now has:', redoHistoryRef.current.length, 'operations');

            // Call undo on the specific canvas that had the most recent stroke
            if (lastStroke.canvasRef && typeof lastStroke.canvasRef.undo === 'function') {
                // Clear any cross-canvas operation when undoing regular strokes
                if (crossCanvasOperationRef.current) {
                    // console.log('🗑️ Clearing cross-canvas operation due to regular stroke undo');
                    crossCanvasOperationRef.current = null;
                }

                lastStroke.canvasRef.undo();

                // Remove the last stroke from our global history
                globalStrokeHistory.current.pop();

                // Update last edited expression to the new most recent stroke's expression (if any)
                if (globalStrokeHistory.current.length > 0) {
                    const newLastStroke = globalStrokeHistory.current[globalStrokeHistory.current.length - 1];
                    updateExpressionFocus(newLastStroke.expressionElement);
                    // Update lastStrokeTimeRef to the timestamp of the new last stroke
                    lastStrokeTimeRef.current = newLastStroke.timestamp;
                } else {
                    updateExpressionFocus(null);
                    // No strokes remaining, reset timestamp to 0
                    lastStrokeTimeRef.current = 0;
                }

                // Update send button to show on the correct expression
                createOverlayTextForAllExpressions();

                // console.log('↩️ Regular stroke undo completed, remaining strokes:', globalStrokeHistory.current.length);

                // Recompute sizing for all expressions after regular undo
                recomputeAllExpressionsSizing();
            } else {
                console.warn('↩️ Cannot undo - canvas ref is invalid');
            }
        },
        triggerRedo: () => {
            console.log('🔄 HandwritingLayer: triggerRedo called');
            console.log('📊 Redo history length:', redoHistoryRef.current.length);
            console.log('📊 Redo history contents:', redoHistoryRef.current.map(op => `${op.type}@${op.timestamp}`));

            if (redoHistoryRef.current.length === 0) {
                console.log('↪️ HandwritingLayer: No operations to redo');
                return;
            }

            // Get the most recent undone operation
            const redoOperation = redoHistoryRef.current.pop();
            if (!redoOperation) return;

            console.log('↪️ HandwritingLayer: Redoing operation:', redoOperation.type, 'from timestamp:', redoOperation.timestamp);

            if (redoOperation.type === 'stroke') {
                // Redo a stroke
                const { stroke, strokePathData, lastEditedExpression, lastStrokeTime, strokeBounds, confidenceData } = redoOperation.data;

                // Restore the stroke using addStrokes method
                if (stroke.canvasRef && typeof stroke.canvasRef.addStrokes === 'function' && strokePathData) {
                    console.log('🔄 Restoring stroke using addStrokes method with data:', strokePathData);
                    stroke.canvasRef.addStrokes(strokePathData);

                    // Add the stroke back to global history
                    globalStrokeHistory.current.push(stroke);

                    // Restore expression focus and timestamp
                    updateExpressionFocus(stroke.expressionElement);
                    lastStrokeTimeRef.current = lastStrokeTime;

                    // Restore stored bounds and confidence data
                    if (strokeBounds) {
                        strokeBoundsRef.current.set(stroke.expressionElement, strokeBounds);
                    }
                    if (confidenceData !== undefined) {
                        const expressionIndex = Array.from(sketchCanvasRefs.current.keys()).indexOf(stroke.expressionElement);
                        confidenceDataRef.current.set(expressionIndex, confidenceData);
                    }

                    // Update UI components
                    createOverlayTextForAllExpressions();
                    applyStrokeExpressionDecorations();
                    recomputeAllExpressionsSizing();
                    updateExpressionVisibility();

                    console.log('↪️ Stroke redo completed using addStrokes');
                } else {
                    console.warn('❌ Cannot redo stroke: missing canvasRef.addStrokes or strokePathData', {
                        hasCanvasRef: !!stroke.canvasRef,
                        hasAddStrokes: !!(stroke.canvasRef?.addStrokes),
                        hasStrokePathData: !!strokePathData
                    });
                }
            } else if (redoOperation.type === 'cross-canvas-erase') {
                // Redo a cross-canvas erase operation
                const { canvases, operation, canvasDataBeforeUndo, lastEditedExpression, globalStrokeHistory, strokeBounds, confidenceData } = redoOperation.data;

                // Restore canvas data that was captured before undo
                canvasDataBeforeUndo.forEach((pathData: any, canvas: HTMLElement) => {
                    const canvasRef = sketchCanvasRefs.current.get(canvas);
                    if (canvasRef && typeof canvasRef.importStrokes === 'function') {
                        try {
                            console.log('🔄 Restoring canvas state for erase redo using importStrokes:', pathData);
                            canvasRef.importStrokes(pathData);
                        } catch (error) {
                            console.warn('Failed to import strokes for redo:', error);
                        }
                    }
                });

                // Restore global state
                globalStrokeHistory.current = globalStrokeHistory;
                updateExpressionFocus(lastEditedExpression);
                crossCanvasOperationRef.current = { canvases, operation };
                strokeBoundsRef.current = strokeBounds;
                confidenceDataRef.current = confidenceData;

                // Update UI components
                createOverlayTextForAllExpressions();
                applyStrokeExpressionDecorations();
                recomputeAllExpressionsSizing();
                updateExpressionVisibility();

                console.log('↪️ Cross-canvas erase redo completed');
            } else if (redoOperation.type === 'clear-all') {
                // Redo a clear-all operation (go back to empty state)
                const { emptyState } = redoOperation.data;

                // Clear all canvases
                sketchCanvasRefs.current.forEach((sketchCanvasRef) => {
                    if (sketchCanvasRef && typeof sketchCanvasRef.clearCanvas === 'function') {
                        sketchCanvasRef.clearCanvas();
                    }
                });

                // Restore empty state
                globalStrokeHistory.current = emptyState.globalStrokeHistory;
                updateExpressionFocus(emptyState.lastEditedExpression);
                crossCanvasOperationRef.current = emptyState.crossCanvasOperation;
                strokeBoundsRef.current = emptyState.strokeBounds;
                confidenceDataRef.current = emptyState.confidenceData;

                // Update UI components
                createOverlayTextForAllExpressions();
                updateExpressionVisibility();
                applyStrokeExpressionDecorations();
                recomputeAllExpressionsSizing();

                console.log('↪️ Clear-all redo completed');
            }
        },
        triggerClearAll: () => {

            // Store current state for undo after clear
            const currentState = {
                globalStrokeHistory: [...globalStrokeHistory.current],
                lastEditedExpression: lastEditedExpressionRef.current,
                crossCanvasOperation: crossCanvasOperationRef.current,
                strokeBounds: new Map(strokeBoundsRef.current),
                confidenceData: new Map(confidenceDataRef.current),
                canvasData: new Map()
            };

            // Collect stroke data from each canvas before clearing
            sketchCanvasRefs.current.forEach((sketchCanvasRef, expression) => {
                if (sketchCanvasRef && typeof sketchCanvasRef.exportPaths === 'function') {
                    try {
                        const pathData = sketchCanvasRef.exportPaths();
                        if (pathData && pathData.length > 0) {
                            currentState.canvasData.set(expression, pathData);
                        }
                    } catch (error) {
                        console.warn('Failed to export paths for undo after clear:', error);
                    }
                }
            });

            // Only store cleared data if there was actually content to clear
            if (currentState.globalStrokeHistory.length > 0 || currentState.canvasData.size > 0) {
                clearedDataRef.current = currentState;
                console.log('💾 Stored cleared data for undo after clear');
            } else {
                clearedDataRef.current = null;
            }

            sketchCanvasRefs.current.forEach((sketchCanvasRef, expression) => {
                if (sketchCanvasRef && typeof sketchCanvasRef.clearCanvas === 'function') {
                    sketchCanvasRef.clearCanvas();
                    // console.log('🗑️ Clear called on sketch canvas for expression', Array.from(sketchCanvasRefs.current.keys()).indexOf(expression));
                }
            });

            // Clear the global stroke history, last edited expression, cross-canvas operations, stored bounds, and confidence data
            globalStrokeHistory.current = [];
            updateExpressionFocus(null);
            crossCanvasOperationRef.current = null;
            strokeBoundsRef.current.clear();
            confidenceDataRef.current.clear();

            // Update send button to remove from all expressions
            createOverlayTextForAllExpressions();

            // Update expression visibility (will hide all since confidence data is cleared)
            updateExpressionVisibility();

            // console.log('🗑️ All drawing state cleared');

            // Recompute sizing for all expressions after clear all (reset to base)
            recomputeAllExpressionsSizing();
        },

        getLastStrokeTime: () => {
            // Return 0 if no strokes remain, otherwise return the actual timestamp
            return globalStrokeHistory.current.length > 0 ? lastStrokeTimeRef.current : 0;
        }
    }), []);

    // Inject CSS to remove padding from dcg-mq-math-mode within dcg-exp-output-container
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const STYLE_ID = 'medly-desmos-math-mode-padding-fix';
        let styleTag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = STYLE_ID;
            styleTag.textContent = `
                .dcg-calculator-api-container-v1_11 .dcg-basic-expression .dcg-exp-output-container .dcg-mq-math-mode {
                    padding-right: 16px !important;
                    padding-left: 0 !important;
                    font-size: 13.8px !important;
                }
                .dcg-calculator-api-container-v1_11 .dcg-basic-expression .dcg-mq-math-mode {
                    padding-right: 0 !important;
                }
                .dcg-tooltip-hit-area-container {
                    display: none !important;
                }
                .dcg-calculator-api-container-v1_11 .dcg-calc-basic-main {
                    background: transparent !important;
                    background-color: transparent !important;
                }
                .dcg-calculator-api-container-v1_11 .dcg-container {
                    background: transparent !important;
                    background-color: transparent !important;
                }
            `;
            document.head.appendChild(styleTag);
        }
    }, []);

    // Log Mathpix loading state and errors
    useEffect(() => {
        if (isMathpixLoading) {
            // console.log('🔄 Mathpix OCR is processing...');
        }
    }, [isMathpixLoading]);

    useEffect(() => {
        if (mathpixError) {
            // console.error('❌ Mathpix OCR error:', mathpixError);
        }
    }, [mathpixError]);

    // Use refs for callbacks to avoid useEffect dependency issues
    const onPressCheckDesmosRef = useRef(onPressCheckDesmos);
    const onExpressionItemPressRef = useRef(onExpressionItemPress);
    const onPressUnderlineRef = useRef(onPressUnderline);
    const onExpressionUpdatedRef = useRef(onExpressionUpdated);
    const onExpressionLineFocusChangeRef = useRef(onExpressionLineFocusChange);
    const isAwaitingResponseRef = useRef(isAwaitingResponse);
    const onOcrEventRef = useRef(onOcrEvent);

    // Update refs when props change
    useEffect(() => {
        onPressCheckDesmosRef.current = onPressCheckDesmos;
        onExpressionItemPressRef.current = onExpressionItemPress;
        onPressUnderlineRef.current = onPressUnderline;
        onExpressionUpdatedRef.current = onExpressionUpdated;
        onExpressionLineFocusChangeRef.current = onExpressionLineFocusChange;
        isAwaitingResponseRef.current = isAwaitingResponse;
        currentToolRef.current = currentTool;
        onOcrEventRef.current = onOcrEvent;
    });

    // Keep overlays' interactivity in sync with current tool selection and read-only state
    useEffect(() => {
        if (!showMedlyLayer || !containerRef.current) return;
        const overlays = containerRef.current.querySelectorAll('.medly-sketch-overlay') as NodeListOf<HTMLElement>;
        overlays.forEach(overlay => {
            if (!currentToolRef.current || isReadOnly) {
                overlay.style.pointerEvents = 'none';
                overlay.style.touchAction = 'auto';
            } else {
                overlay.style.pointerEvents = 'auto';
                overlay.style.touchAction = 'none';
            }
        });
    }, [showMedlyLayer, containerRef, currentTool, isReadOnly]);

    // Log when forceUpdate changes
    useEffect(() => {
        if (forceUpdate > 0) {
            // console.log('🔄 ForceUpdate triggered:', forceUpdate);
        }
    }, [forceUpdate]);

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
                        // console.log('🔍 Could not use API to check content, falling back to DOM:', error);
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

    // Function to apply decorations to stroke-based basic expressions
    const applyStrokeExpressionDecorations = () => {
        if (!containerRef.current) return;

        // Get all basic expression elements
        const basicExpressions = containerRef.current.querySelectorAll('.dcg-basic-expression') as NodeListOf<HTMLElement>;

        // Clear previous decorations for items that should no longer be decorated
        decoratedElementsRef.current.forEach((_, element) => {
            const expressionIndex = Array.from(basicExpressions).indexOf(element);
            const shouldBeDecorated = expressionItemDecorations.some(({ index, decoration }) =>
                index === expressionIndex && decoration
            );

            if (!shouldBeDecorated) {
                // Remove existing underline decoration (check both expression and sketch overlay)
                const existingUnderline = element.querySelector('.medly-stroke-underline') ||
                    element.querySelector('.medly-sketch-overlay .medly-stroke-underline');
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
                element.removeAttribute('data-medly-stroke-decorated');

                // Remove click handler
                if ((element as any)._medlyClickHandler) {
                    element.removeEventListener('click', (element as any)._medlyClickHandler);
                    delete (element as any)._medlyClickHandler;
                }

                decoratedElementsRef.current.delete(element);
            }
        });

        // Apply new decorations
        expressionItemDecorations.forEach(({ index, decoration, validationState }) => {
            if (decoration && basicExpressions[index]) {
                const element = basicExpressions[index];

                // Remove existing decoration if present (so we can re-decorate with updated bounds)
                if (decoratedElementsRef.current.has(element)) {
                    const existingUnderline = element.querySelector('.medly-stroke-underline') ||
                        element.querySelector('.medly-sketch-overlay .medly-stroke-underline');
                    if (existingUnderline) {
                        // Remove click handler from underline
                        if ((existingUnderline as any)._medlyUnderlineClickHandler) {
                            existingUnderline.removeEventListener('click', (existingUnderline as any)._medlyUnderlineClickHandler);
                            delete (existingUnderline as any)._medlyUnderlineClickHandler;
                        }
                        existingUnderline.remove();
                    }
                }

                // Get stored stroke bounds for this expression
                const strokeBounds = strokeBoundsRef.current.get(element);
                if (!strokeBounds) {
                    return;
                }

                // Store element reference
                decoratedElementsRef.current.set(element, '');

                // Find the sketch overlay container for this expression
                const sketchOverlay = element.querySelector('.medly-sketch-overlay') as HTMLElement;
                if (!sketchOverlay) {
                    console.warn('🎨 No sketch overlay found for expression', index);
                    return;
                }

                // Calculate position based on stroke bounds (relative to the overlay, not the expression)
                const topOffset = strokeBounds.bottom + 2; // 2px gap below the lowest stroke
                const leftOffset = strokeBounds.left;
                const width = strokeBounds.width;

                // Determine underline color based on validation state
                let underlineColor = 'red'; // default for invalid
                let shouldHide = false;
                if (validationState === 'indeterminate') {
                    underlineColor = '#5B94F9'; // blue for indeterminate
                    shouldHide = true; // Hide blue underlines temporarily
                } else if (validationState === 'invalid') {
                    underlineColor = 'red'; // red for invalid
                }

                // Create underline element
                const underline = document.createElement('div');
                underline.className = 'medly-stroke-underline';
                underline.style.cssText = `
                    position: absolute !important;
                    left: ${leftOffset}px !important;
                    top: ${topOffset}px !important;
                    width: ${width}px !important;
                    height: 0 !important;
                    border-bottom: 2px dotted ${underlineColor} !important;
                    // pointer-events: auto !important;
                    pointer-events: none !important; // disabled pointer events for stroke underlines
                    z-index: 15 !important;
                    cursor: pointer !important;
                    padding: 2px 0 !important;
                    ${shouldHide ? 'display: none !important;' : ''}
                `;

                // Add click handler to underline
                const underlineClickHandler = (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // console.log('Stroke underline clicked for expression index:', index);
                    onPressUnderlineRef.current?.(index);
                };

                underline.addEventListener('click', underlineClickHandler);

                // Store the handler for cleanup
                (underline as any)._medlyUnderlineClickHandler = underlineClickHandler;

                // Append underline to the sketch overlay instead of the expression
                sketchOverlay.appendChild(underline);

                // Add click handler if not already added
                if (!element.hasAttribute('data-medly-stroke-decorated')) {
                    element.setAttribute('data-medly-stroke-decorated', 'true');
                    element.style.cursor = 'pointer';

                    const clickHandler = (e: Event) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onExpressionItemPressRef.current?.(index, element);
                    };

                    element.addEventListener('click', clickHandler);

                    // Store the handler so we can remove it later
                    (element as any)._medlyClickHandler = clickHandler;
                }
            }
        });
    };

    // Function to apply decorations to math expression items
    const applyExpressionDecorations = () => {
        // Only log when there are actual decorations to apply
        if (expressionItemDecorations.length > 0) {
            // console.log('🎨 Applying math-based expression decorations:', expressionItemDecorations);
        }
        if (!containerRef.current) return;

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
        expressionItemDecorations.forEach(({ index, decoration, validationState }) => {
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

                        // Determine underline color based on validation state
                        let underlineColor = 'red'; // default for invalid
                        let shouldHide = false;
                        if (validationState === 'indeterminate') {
                            underlineColor = '#007AFF'; // blue for indeterminate (iOS system blue)
                            shouldHide = true; // Hide blue underlines temporarily
                        } else if (validationState === 'invalid') {
                            underlineColor = 'red'; // red for invalid
                        }

                        // Create underline element
                        const underline = document.createElement('div');
                        underline.className = 'medly-math-underline';
                        underline.style.cssText = `
                            position: absolute !important;
                            left: ${leftMost}px !important;
                            top: ${topOffset}px !important;
                            width: ${width}px !important;
                            height: 0 !important;
                            border-bottom: 2px dotted ${underlineColor} !important;
                            pointer-events: auto !important;
                            z-index: 10 !important;
                            cursor: pointer !important;
                            padding: 2px 0 !important;
                            ${shouldHide ? 'display: none !important;' : ''}
                        `;

                        // Add click handler to underline
                        const underlineClickHandler = (e: Event) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // console.log('Underline clicked for expression index:', index);
                            onPressUnderlineRef.current?.(index);
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
                            onExpressionItemPressRef.current?.(index, element);
                        };

                        element.addEventListener('click', clickHandler);

                        // Store the handler so we can remove it later
                        (element as any)._medlyClickHandler = clickHandler;
                    }
                }
            }
        });
    };



    // Function to apply text alignment to math root blocks
    const applyRootBlockTextAlignment = () => {
        if (!containerRef.current) return;

        // Find all dcg-mq-root-block elements and set text-align to end
        const rootBlocks = containerRef.current.querySelectorAll('.dcg-mq-root-block') as NodeListOf<HTMLElement>;
        rootBlocks.forEach(rootBlock => {
            rootBlock.style.textAlign = 'end';
            rootBlock.style.paddingRight = '8px';
        });

        // console.log('📝 Applied text-align: end to', rootBlocks.length, 'root blocks');
    };

    // Function to update math field and output container visibility based on confidence scores
    const updateExpressionVisibility = () => {
        if (!containerRef.current) return;

        // Find all dcg-basic-expression elements
        const basicExpressions = containerRef.current.querySelectorAll('.dcg-basic-expression') as NodeListOf<HTMLElement>;

        basicExpressions.forEach((expression, index) => {
            const confidence = confidenceDataRef.current.get(index) ?? null;
            const mathField = expression.querySelector('.dcg-math-field') as HTMLElement | null;
            const outputContainer = expression.querySelector('.dcg-exp-output-container') as HTMLElement | null;

            // Hide output container if hideExpressionCalculatedOutput prop is true
            if (hideExpressionCalculatedOutput && outputContainer) {
                outputContainer.style.display = 'none';
            }

            // if (typeof confidence === 'number') {
            //     if (confidence > 0.5 && outputContainer) {
            //         // High confidence with output: show only output container
            //         if (mathField) mathField.style.display = 'none';
            //         outputContainer.style.display = '';
            //         console.log(`📊 Expression ${index}: showing output container (confidence: ${confidence})`);
            //     } else if (confidence > 0.5) {
            //         // Good confidence: show only math field
            //         if (mathField) mathField.style.display = '';
            //         if (outputContainer) outputContainer.style.display = '';
            //         console.log(`📊 Expression ${index}: showing math field (confidence: ${confidence})`);
            //     } else {
            //         // Low confidence: hide both
            //         if (mathField) mathField.style.display = '';
            //         if (outputContainer) outputContainer.style.display = '';
            //         console.log(`📊 Expression ${index}: hiding both (low confidence: ${confidence})`);
            //     }
            // } else {
            //     // No confidence data: hide both (fallback behavior)
            //     if (mathField) mathField.style.display = 'none';
            //     if (outputContainer) outputContainer.style.display = 'none';
            // }
        });
    };

    // Function to hide output containers (legacy - now handled by updateExpressionVisibility)
    const hideOutputContainers = () => {
        if (!containerRef.current) return;

        // Find all dcg-exp-output-container elements and hide them
        const outputContainers = containerRef.current.querySelectorAll('.dcg-exp-output-container') as NodeListOf<HTMLElement>;
        outputContainers.forEach(container => {
            container.style.display = 'none';
        });

        // console.log('📝 Hidden', outputContainers.length, 'output containers');
    };

    // Function to apply initial sizing to expression rows (centralized here)
    const applyInitialExpressionSizing = () => {
        if (!containerRef.current) return;

        const listContainer = containerRef.current.querySelector('.dcg-basic-list-container') as HTMLElement | null;
        const expressions = (listContainer
            ? listContainer.querySelectorAll('.dcg-basic-expression')
            : containerRef.current.querySelectorAll('.dcg-basic-expression')) as NodeListOf<HTMLElement>;

        expressions.forEach(expression => {
            try {
                if (expression.getAttribute('data-medly-initial-sized') === 'true') return;

                const computedStyle = window.getComputedStyle(expression);
                const currentHeightPx = parseFloat(computedStyle.height || '0');
                if (currentHeightPx > 0) {
                    // Store the original height for future recomputations
                    expression.setAttribute('data-medly-original-height', `${currentHeightPx}`);
                    const targetMinHeight = Math.ceil(currentHeightPx * 1.5);
                    expression.style.minHeight = `${targetMinHeight}px`;
                    expression.setAttribute('data-medly-initial-sized', 'true');
                    // ensure overflow visible for cross-canvas behavior
                    expression.style.overflow = 'visible';
                    // console.log(`📐 Applied initial min-height ${targetMinHeight}px to expression`);
                }
            } catch (e) {
                console.warn('⚠️ Failed to apply initial expression sizing:', e);
            }
        });

        // Update coordinate map after initial sizing
        updateCanvasCoordinateMap();
    };

    // Compute base min-height from original height (1.5x of the original line height)
    const getBaseMinHeight = (expression: HTMLElement): number => {
        try {
            const original = parseFloat(expression.getAttribute('data-medly-original-height') || '');
            if (!isNaN(original) && original > 0) {
                return Math.ceil(original * 1.5);
            }
            const computedStyle = window.getComputedStyle(expression);
            const currentHeightPx = parseFloat(computedStyle.height || '0');
            if (currentHeightPx > 0) {
                expression.setAttribute('data-medly-original-height', `${currentHeightPx}`);
                return Math.ceil(currentHeightPx * 1.5);
            }
        } catch { }
        return 0;
    };

    // Check if the next line has strokes (for smart expansion logic)
    const hasStrokesOnNextLine = (expression: HTMLElement): boolean => {
        if (!containerRef.current) return false;

        const basicExpressions = containerRef.current.querySelectorAll('.dcg-basic-expression') as NodeListOf<HTMLElement>;
        const currentIndex = Array.from(basicExpressions).indexOf(expression);

        if (currentIndex === -1 || currentIndex >= basicExpressions.length - 1) {
            // Last expression or not found, no next line
            return false;
        }

        const nextExpression = basicExpressions[currentIndex + 1];
        const nextBounds = strokeBoundsRef.current.get(nextExpression);

        // Return true if next line has strokes (bounds exist)
        return !!nextBounds;
    };

    // Recompute container sizing based on current stroke bounds and thresholds
    const recomputeExpressionSizing = (expression: HTMLElement) => {
        if (autoExpandBehavior === 'none') return;

        // For 'auto' mode, check if next line has strokes
        if (autoExpandBehavior === 'auto' && hasStrokesOnNextLine(expression)) {
            // Next line has strokes, don't expand further - just maintain current height
            updateCanvasCoordinateMap();
            return;
        }

        // For 'always' mode or 'auto' mode with empty next line, proceed with expansion

        try {
            // Get original height for scaling calculations
            const originalHeight = parseFloat(expression.getAttribute('data-medly-original-height') || '0');
            const baseMin = getBaseMinHeight(expression);

            const bounds = strokeBoundsRef.current.get(expression);

            if (!bounds || originalHeight === 0) {
                // No strokes or no original height - reset to base
                if (baseMin > 0) {
                    expression.style.minHeight = `${baseMin}px`;
                }
                updateCanvasCoordinateMap();
                return;
            }

            // Calculate required height based on stroke bounds
            // Find the lowest y position (bounds.bottom) and add original height as buffer
            const requiredHeight = Math.ceil(bounds.bottom + originalHeight / 1.5);

            // Ensure we don't go below the base minimum
            const finalHeight = Math.max(requiredHeight, baseMin);

            expression.style.minHeight = `${finalHeight}px`;
            // console.log(`📏 Set expression min-height to ${finalHeight}px (stroke bottom: ${bounds.bottom}px + original height: ${originalHeight}px)`);

            updateCanvasCoordinateMap();
        } catch (err) {
            console.warn('⚠️ Failed to recompute expression sizing:', err);
        }
    };

    // Recompute sizing for all expressions in the container
    const recomputeAllExpressionsSizing = () => {
        if (!containerRef.current) return;
        const basicExpressions = containerRef.current.querySelectorAll('.dcg-basic-expression') as NodeListOf<HTMLElement>;
        basicExpressions.forEach(expr => recomputeExpressionSizing(expr));
    };

    // Function to create sketch canvas overlays for scientific calculator expressions
    const createSketchCanvasOverlays = () => {
        if (!containerRef.current) return;

        // Find all dcg-basic-expression elements (scientific calculator)
        const basicExpressions = containerRef.current.querySelectorAll('.dcg-basic-expression') as NodeListOf<HTMLElement>;
        // console.log('📝 Creating sketch canvas overlays for', basicExpressions.length, 'basic expressions');

        if (basicExpressions.length === 0) {
            return;
        }

        basicExpressions.forEach((expression, index) => {
            // Skip if overlay already exists
            if (expression.querySelector('.medly-sketch-overlay')) {
                // console.log('📝 Skipping overlay creation - already exists for expression', index);
                return;
            }

            // Get the bounding box of the expression
            const rect = expression.getBoundingClientRect();

            // Make sure the expression has relative positioning for absolute children and allows overflow
            const currentPosition = getComputedStyle(expression).position;
            if (currentPosition === 'static') {
                expression.style.position = 'relative';
            }
            // Enable overflow for cross-canvas stroke visibility
            expression.style.overflow = 'visible';
            expression.style.zIndex = '1';

            // Create the overlay container
            const overlayDiv = document.createElement('div');
            overlayDiv.className = 'medly-sketch-overlay';
            overlayDiv.style.cssText = `
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                pointer-events: ${isReadOnly ? 'none' : 'auto'} !important;
                z-index: 10 !important;
                overflow: visible !important;
            `;
            // Default touch behavior for drawing: we'll manage two-finger scroll manually
            (overlayDiv as HTMLElement).style.touchAction = (currentToolRef.current && !isReadOnly) ? 'none' : 'auto';

            // Store reference for dynamic z-index updates
            (overlayDiv as any)._medlyOverlayIndex = index;

            // Compute a stable registry id for this overlay
            const registryId = `desmos-${questionId || 'unknown'}-expr-${index}`;
            overlayToIdRef.current.set(overlayDiv, registryId);

            // Active touch pointers tracking for two-finger scroll passthrough
            const activeTouchIds = new Set<number>();

            // Add pointer event listener to set eraser mode before stroke starts
            const handlePointerDown = (e: PointerEvent) => {
                // If read-only mode, prevent all interactions
                if (isReadOnly) {
                    return;
                }
                
                // If no tool selected, do not intercept; allow scroll
                if (!currentToolRef.current) {
                    return;
                }

                // Remove border animation when user starts drawing on this overlay
                const currentFloatingMessage = floatingMessageRef.current;
                // console.log('👆 Pointer down on overlay', index, 'with floatingMessage:', currentFloatingMessage);
                if (currentFloatingMessage?.targetAction === 'use_canvas' &&
                    currentFloatingMessage?.targetIndex === index &&
                    typeof currentFloatingMessage?.targetIndex === 'number') {
                    overlayDiv.style.border = '';
                    overlayDiv.style.animation = '';
                    overlayDiv.style.borderRadius = '';
                    // console.log('🎨 Removed border animation for overlay', index, 'due to user interaction');
                }

                if (e.pointerType === 'touch') {
                    activeTouchIds.add(e.pointerId);
                    if (activeTouchIds.size >= 2) {
                        // Two-finger gesture → pass through for scrolling
                        (overlayDiv as HTMLElement).style.pointerEvents = 'none';
                        (overlayDiv as any)._twoFingerScroll = true;
                        return;
                    }
                    // One-finger gesture while drawing: capture pointer to keep events and stop native scroll
                    try { (e.target as Element)?.setPointerCapture?.(e.pointerId); } catch { }
                    // Prevent browser from interpreting as scroll
                    e.preventDefault();
                }

                if (sketchCanvasRef && typeof sketchCanvasRef.eraseMode === 'function') {
                    const shouldBeEraser = currentToolRef.current === 'eraser';
                    sketchCanvasRef.eraseMode(shouldBeEraser);
                    // console.log('🖱️ Set eraser mode to', shouldBeEraser, 'on pointer down for expression', index);
                }
            };

            const handlePointerMove = (e: PointerEvent) => {
                // If read-only mode, prevent all interactions
                if (isReadOnly) return;
                
                // If no tool selected, don't interfere
                if (!currentToolRef.current) return;
                if (e.pointerType === 'touch') {
                    // If two-finger scroll is active, let it pass through
                    if ((overlayDiv as any)._twoFingerScroll) return;
                    // Single-finger move while drawing should not scroll the page
                    e.preventDefault();
                }
            };

            const handlePointerUpLike = (e: PointerEvent) => {
                // If read-only mode, prevent all interactions
                if (isReadOnly) return;
                
                if (e.pointerType === 'touch') {
                    activeTouchIds.delete(e.pointerId);
                    if (activeTouchIds.size < 2 && (overlayDiv as any)._twoFingerScroll) {
                        // Restore interactivity after two-finger scroll ends
                        (overlayDiv as HTMLElement).style.pointerEvents = (currentToolRef.current && !isReadOnly) ? 'auto' : 'none';
                        delete (overlayDiv as any)._twoFingerScroll;
                    }
                    try { (e.target as Element)?.releasePointerCapture?.(e.pointerId); } catch { }
                }
            };

            // Only use pointer events to avoid conflicts on touch devices
            overlayDiv.addEventListener('pointerdown', handlePointerDown as any);
            overlayDiv.addEventListener('pointermove', handlePointerMove as any);
            overlayDiv.addEventListener('pointerup', handlePointerUpLike as any);
            overlayDiv.addEventListener('pointercancel', handlePointerUpLike as any);
            overlayDiv.addEventListener('pointerleave', handlePointerUpLike as any);

            // Store reference to the CustomSketchCanvas for accessing paths later
            let sketchCanvasRef: any = null;

            // Create React root and render CustomSketchCanvas
            const reactRoot = createRoot(overlayDiv);
            reactRoot.render(
                <CustomSketchCanvas
                    ref={(ref: any) => {
                        sketchCanvasRef = ref;
                        // Store the ref for undo/clear functionality
                        if (ref) {
                            sketchCanvasRefs.current.set(expression, ref);
                            // Register with global registry
                            try {
                                CrossCanvasRegistry.registerCanvas(
                                    registryId,
                                    'desmos',
                                    overlayDiv,
                                    () => {
                                        const handle = sketchCanvasRefs.current.get(expression);
                                        if (!handle) return null;
                                        return {
                                            previewEraseLocal: (points) => handle.previewCrossCanvasErase?.(points),
                                            performEraseLocal: (points) => handle.crossCanvasErase?.(points),
                                            clearErasePreview: () => handle.clearErasePreview?.()
                                        };
                                    }
                                );
                            } catch {}
                        }
                    }}
                    width="100%"
                    height="100%"
                    strokeColor="#06B0FF"
                    strokeWidth={4}
                    eraserWidth={8}
                    index={index}
                    initialPaths={initialExpressionData[index]?.strokes}
                    questionId={questionId}
                    style={{
                        backgroundColor: 'transparent'
                    }}
                    onEraserMove={(eraserPoints) => {
                        // Preview cross-canvas erasing during eraser movement
                        if (currentToolRef.current === 'eraser') {
                            if (eraserPoints.length === 0) {
                                // Clear all eraser previews when erasing ends
                                sketchCanvasRefs.current.forEach((canvasRef) => {
                                    if (canvasRef && typeof canvasRef.clearErasePreview === 'function') {
                                        canvasRef.clearErasePreview();
                                    }
                                });
                                // Also clear global previews
                                try { CrossCanvasRegistry.clearAllPreviews(); } catch {}
                            } else {
                                // Preview cross-canvas erasing
                                previewCrossCanvasErasing(eraserPoints, expression);
                                // Broadcast preview to page-level canvas via registry
                                const id = overlayToIdRef.current.get(overlayDiv);
                                if (id) {
                                    try { CrossCanvasRegistry.previewGlobalErase(id, eraserPoints); } catch {}
                                }
                            }
                        }
                    }}
                    onDrawingStateChange={(isDrawing) => {
                        // Update z-indices when drawing state changes
                        if (isDrawing) {
                            updateCanvasZIndices(index);
                        } else {
                            updateCanvasZIndices(null);
                        }
                    }}
                    onStroke={async (allStrokeData, isFromErasing, eraserPoints, erasedStrokesData, isHistoryUpdate, strokeId) => {
                        // console.log('✏️ onStroke triggered - checking what data we get:', {
                        //     expressionIndex: index,
                        //     allStrokeData,
                        //     isFromErasing,
                        //     currentTool: currentToolRef.current,
                        //     totalPaths: allStrokeData?.paths?.length || 0,
                        //     action: isFromErasing ? 'erased' : 'drew',
                        //     timestamp: new Date().toISOString(),
                        //     eraserPoints: eraserPoints?.length || 0
                        // });

                        // If no tool is selected, ignore strokes
                        if (!currentToolRef.current) {
                            return;
                        }

                        // Handle erasing operations for undo tracking
                        if (isFromErasing) {
                            console.log('🖍️ Processing erasing operation for undo tracking...');

                            // Clear redo history when new erase is made (can't redo after new changes)
                            if (redoHistoryRef.current.length > 0) {
                                console.log('🗑️ Clearing redo history due to new erase operation');
                                redoHistoryRef.current = [];
                            }

                            // Capture erase action for global undo functionality
                            const sketchCanvasRef = sketchCanvasRefs.current.get(expression);
                            console.log('🔍 Debug erase action:', {
                                hasSketchCanvasRef: !!sketchCanvasRef,
                                hasOnEraseAction: !!onEraseAction,
                                hasQuestionId: !!questionId,
                                questionId
                            });

                            if (sketchCanvasRef && onEraseAction && questionId) {
                                try {
                                    console.log('🔍 Erased strokes data for undo:', {
                                        hasErasedStrokesData: !!erasedStrokesData,
                                        erasedStrokesCount: erasedStrokesData?.paths?.length || 0
                                    });

                                    // Log the actual erased stroke data
                if (erasedStrokesData?.paths?.length > 0) {
                    console.log('🖍️ Erased stroke details:', erasedStrokesData.paths.map((path: any, index: number) => ({
                                            strokeIndex: index,
                                            id: path.id,
                                            color: path.color,
                                            width: path.width,
                                            zIndex: path.zIndex,
                                            pointsCount: path.paths?.length || 0,
                                            firstPoint: path.paths?.[0] ? { x: path.paths[0].x, y: path.paths[0].y } : null,
                                            lastPoint: path.paths?.length > 0 ? {
                                                x: path.paths[path.paths.length - 1].x,
                                                y: path.paths[path.paths.length - 1].y
                                            } : null
                                        })));
                                    }

                                    // Always call onEraseAction when an erase happens, pass the erased strokes for undo
                                    console.log('✅ Calling onEraseAction with erased strokes data:', { questionId, hasSketchCanvasRef: !!sketchCanvasRef, hasErasedStrokesData: !!erasedStrokesData });
                                    // Track this as an erase action for undo - pass the erased strokes data (what was removed)
                                    onEraseAction(questionId, sketchCanvasRef, erasedStrokesData || { paths: [] });
                                } catch (error) {
                                    console.warn('Failed to track erase action:', error);
                                }
                            } else {
                                console.log('❌ Not calling onEraseAction - missing requirements');
                            }

                            if (eraserPoints && eraserPoints.length > 0) {
                                // Only handle operations with actual eraser points (not secondary calls from crossCanvasErase)
                                // Update coordinate map for accurate calculations
                                updateCanvasCoordinateMap();

                                // Find all canvases intersected by the eraser
                                const intersectedCanvases = getCanvasesIntersectedByEraser(eraserPoints, expression);
                                // console.log('🎯 Eraser intersects', intersectedCanvases.length, 'canvases');

                                if (intersectedCanvases.length > 1) {
                                    // This is a cross-canvas operation
                                    crossCanvasOperationRef.current = {
                                        canvases: intersectedCanvases,
                                        operation: 'erase'
                                    };

                                    // Perform erasing on all intersected canvases (except the origin canvas which already erased)
                                    const erasingPromises = intersectedCanvases
                                        .filter(canvas => canvas !== expression) // Skip origin canvas
                                        .map(async (canvas: HTMLElement) => {
                                            const canvasRef = sketchCanvasRefs.current.get(canvas);
                                            if (canvasRef && typeof canvasRef.crossCanvasErase === 'function') {
                                                // Transform eraser points to this canvas's coordinate system
                                                const transformedPoints = eraserPoints.map(point =>
                                                    transformPointBetweenCanvases(point, expression, canvas)
                                                );

                                                // Perform cross-canvas erasing
                                                await canvasRef.crossCanvasErase(transformedPoints);
                                                // console.log('🖍️ Cross-canvas erase completed on canvas:', Array.from(sketchCanvasRefs.current.keys()).indexOf(canvas));
                                            }
                                        });

                                    await Promise.all(erasingPromises);
                                    // console.log('🖍️ Cross-canvas erasing completed across all intersected canvases');

                                    // Update bounds for all affected canvases after cross-canvas erasing
                                    intersectedCanvases.forEach(canvas => {
                                        const canvasRef = sketchCanvasRefs.current.get(canvas);
                                        if (canvasRef && typeof canvasRef.getStrokeBounds === 'function') {
                                            const currentBounds = canvasRef.getStrokeBounds();
                                            if (currentBounds) {
                                                strokeBoundsRef.current.set(canvas, currentBounds);
                                            } else {
                                                // No strokes remaining, clear stored bounds
                                                strokeBoundsRef.current.delete(canvas);
                                            }
                                        }
                                    });
                                    // Also broadcast the erase to page-level canvas via registry
                                    const id = overlayToIdRef.current.get(overlayDiv);
                                    if (id && eraserPoints && eraserPoints.length > 0) {
                                        try { await CrossCanvasRegistry.performGlobalErase(id, eraserPoints); } catch {}
                                    }
                                } else {
                                    // Single canvas erase - track as cross-canvas operation for consistent undo
                                    crossCanvasOperationRef.current = {
                                        canvases: [expression],
                                        operation: 'erase'
                                    };
                                    // console.log('🖍️ Single canvas erase tracked for undo');
                                    // Broadcast single-canvas erase globally as well
                                    const id = overlayToIdRef.current.get(overlayDiv);
                                    if (id && eraserPoints && eraserPoints.length > 0) {
                                        try { await CrossCanvasRegistry.performGlobalErase(id, eraserPoints); } catch {}
                                    }
                                }
                            } else if (!crossCanvasOperationRef.current) {
                                // No eraser points and no existing operation - this is a standalone erase (like clear canvas)
                                crossCanvasOperationRef.current = {
                                    canvases: [expression],
                                    operation: 'erase'
                                };
                                // console.log('🖍️ Standalone erase operation tracked for undo');
                            }
                            // If eraserPoints is empty but crossCanvasOperationRef.current exists, 
                            // this is likely a secondary call from crossCanvasErase - ignore it

                            // Update stored bounds after erasing operation (only for single canvas operations)
                            // Cross-canvas operations already updated bounds for all affected canvases above
                            if ((!eraserPoints || eraserPoints.length === 0) ||
                                (eraserPoints && eraserPoints.length > 0 && getCanvasesIntersectedByEraser(eraserPoints, expression).length === 1)) {
                                if (sketchCanvasRef && typeof sketchCanvasRef.getStrokeBounds === 'function') {
                                    const currentBounds = sketchCanvasRef.getStrokeBounds();
                                    if (currentBounds) {
                                        strokeBoundsRef.current.set(expression, currentBounds);
                                    } else {
                                        // No strokes remaining, clear stored bounds
                                        strokeBoundsRef.current.delete(expression);
                                    }
                                }
                            }

                            // Update decorations after erasing operation
                            applyStrokeExpressionDecorations();

                            // Recompute sizing after erase
                            recomputeExpressionSizing(expression);
                        }

                        // Track stroke in global history only if it's a new stroke (not from erasing and not a history update)
                        if (!isFromErasing && !isHistoryUpdate && allStrokeData?.paths?.length > 0) {
                            // Clear redo history when new stroke is added (can't redo after new changes)
                            if (redoHistoryRef.current.length > 0) {
                                console.log('🗑️ Clearing redo history due to new stroke');
                                redoHistoryRef.current = [];
                            }

                            // Clear any pending cross-canvas operation when new stroke is added
                            if (crossCanvasOperationRef.current) {
                                // console.log('🖋️ Clearing cross-canvas operation due to new stroke');
                                crossCanvasOperationRef.current = null;
                            }

                            const strokeTimestamp = Date.now();

                            // Report stroke to global system with full stroke data
                            if (onStrokeAdded && questionId && strokeId) {
                                // Get the stroke data from allStrokeData
                                const lastStrokePath = allStrokeData?.paths?.[allStrokeData.paths.length - 1];
                                const strokeData = lastStrokePath ? {
                                    points: lastStrokePath.paths || [],
                                    color: '#06B0FF', // Default color, could be enhanced
                                    width: 4, // Default width, could be enhanced
                                    isEraser: false,
                                    isApplePencil: false,
                                    zIndex: 0 // Could be enhanced with actual zIndex
                                } : undefined;

                                console.log('🔗 HandwritingLayer: Calling onStrokeAdded with strokeId and data:', strokeId, strokeData);
                                onStrokeAdded(questionId, sketchCanvasRef, strokeId, strokeData);
                            }

                            const newStroke: GlobalStroke = {
                                strokeId: strokeId || `fallback-stroke-${Date.now()}-${Math.random()}`,
                                canvasRef: sketchCanvasRef,
                                expressionElement: expression,
                                timestamp: strokeTimestamp
                            };
                            globalStrokeHistory.current.push(newStroke);

                            // Update last stroke timestamp for global undo
                            lastStrokeTimeRef.current = strokeTimestamp;

                            // Update last edited expression
                            updateExpressionFocus(expression);
                            // console.log('📝 Added stroke to global history, total strokes:', globalStrokeHistory.current.length, 'last edited expression:', index);

                            // Capture stroke bounds immediately before they can be cleared by OCR processing
                            if (sketchCanvasRef && typeof sketchCanvasRef.getStrokeBounds === 'function') {
                                const currentBounds = sketchCanvasRef.getStrokeBounds();
                                if (currentBounds) {
                                    strokeBoundsRef.current.set(expression, currentBounds);

                                    // Re-apply stroke decorations with updated bounds
                                    applyStrokeExpressionDecorations();

                                    // Use the centralized recompute logic for consistent expansion behavior
                                    recomputeExpressionSizing(expression);
                                } else {
                                    // If no bounds after stroke, reset sizing to base
                                    recomputeExpressionSizing(expression);
                                }
                            }

                            // Update send button to show on the newly edited expression
                            createOverlayTextForAllExpressions();
                        }

                        // Check if canvas is empty (no strokes remaining)
                        const hasStrokes = allStrokeData?.paths?.length > 0;

                        if (hasStrokes) {
                            try {
                                // console.log(`🔍 Processing ${isFromErasing ? 'remaining strokes after erasing' : 'new stroke'} for OCR...`);

                                // Use a small delay to allow for rapid successive strokes before OCR
                                const ocrDelay = isFromErasing ? 0 : 150; // Shorter delay for erasing, small delay for drawing

                                setTimeout(async () => {
                                    try {
                                        const result = await processStrokes(allStrokeData, index);

                                        // Store confidence data for visibility logic
                                        if (result && typeof result.confidence === 'number') {
                                            confidenceDataRef.current.set(index, result.confidence);
                                            // console.log('📊 Stored confidence for expression', index, ':', result.confidence);
                                        } else {
                                            // Clear confidence data if no result or no confidence
                                            confidenceDataRef.current.delete(index);
                                        }

                                        // Emit OCR event with strokes and result
                                        try {
                                            onOcrEventRef.current?.({
                                                expressionIndex: index,
                                                strokes: allStrokeData,
                                                ocr: result || null
                                            });
                                        } catch (e) {
                                            console.error('❌ Error emitting onOcrEvent:', e);
                                        }

                                        if (result && result.latex_styled) {
                                            // console.log('🎯 LaTeX generated for expression', index, ':', result.latex_styled);
                                            onExpressionUpdatedRef.current?.(index, result.latex_styled);
                                        } else {
                                            console.log('⚠️ OCR returned no LaTeX result');
                                        }

                                        // Update expression visibility based on confidence
                                        updateExpressionVisibility();
                                    } catch (error) {
                                        console.error('❌ Error processing OCR:', error);
                                    }
                                }, ocrDelay);
                            } catch (error) {
                                console.error('❌ Error setting up OCR processing:', error);
                            }
                        } else {
                            // Canvas is empty - clear the expression directly without calling OCR call
                            // console.log('🧹 Canvas is empty - clearing expression without OCR call');

                            // Clear confidence data for this expression
                            confidenceDataRef.current.delete(index);

                            onExpressionUpdatedRef.current?.(index, '');
                            // Emit OCR event with empty strokes and null OCR
                            try {
                                onOcrEventRef.current?.({
                                    expressionIndex: index,
                                    strokes: allStrokeData,
                                    ocr: null
                                });
                            } catch (e) {
                                console.error('❌ Error emitting onOcrEvent (empty canvas):', e);
                            }

                            // Clear stored bounds for this expression since it's now empty
                            strokeBoundsRef.current.delete(expression);

                            // Re-apply decorations to remove underline for this empty expression
                            applyStrokeExpressionDecorations();

                            // Update expression visibility (will hide both fields since no confidence data)
                            updateExpressionVisibility();
                        }
                    }}
                />
            );

            // Store the root and canvas ref for cleanup
            (overlayDiv as any)._reactRoot = reactRoot;
            (overlayDiv as any)._sketchCanvasRef = sketchCanvasRef;
            (overlayDiv as any)._pointerDownHandler = handlePointerDown;
            (overlayDiv as any)._pointerMoveHandler = handlePointerMove;

            // Note: We handle eraser mode per-interaction via pointer events, not during initialization

            // Append to the expression
            expression.appendChild(overlayDiv);
        });

        // console.log('📝 Sketch canvas overlays created for all expressions');

        // Update coordinate map after creating overlays
        updateCanvasCoordinateMap();
    };

    // Function to cleanup sketch canvas overlays
    const cleanupSketchCanvasOverlays = () => {
        if (!containerRef.current) return;

        const overlays = containerRef.current.querySelectorAll('.medly-sketch-overlay') as NodeListOf<HTMLElement>;
        overlays.forEach(overlay => {
            // Find the parent expression to remove from our refs
            const parentExpression = overlay.closest('.dcg-basic-expression') as HTMLElement;
            if (parentExpression) {
                // Remove strokes from global history for this expression
                globalStrokeHistory.current = globalStrokeHistory.current.filter(
                    stroke => stroke.expressionElement !== parentExpression
                );

                // If this was the last edited expression, clear the reference
                if (lastEditedExpressionRef.current === parentExpression) {
                    // Update to the new most recent stroke's expression (if any)
                    if (globalStrokeHistory.current.length > 0) {
                        const newLastStroke = globalStrokeHistory.current[globalStrokeHistory.current.length - 1];
                        updateExpressionFocus(newLastStroke.expressionElement);
                    } else {
                        updateExpressionFocus(null);
                    }
                }

                sketchCanvasRefs.current.delete(parentExpression);

                // Clear stored bounds for this expression
                strokeBoundsRef.current.delete(parentExpression);
            }

            // Clean up event listeners
            if ((overlay as any)._pointerDownHandler) {
                overlay.removeEventListener('pointerdown', (overlay as any)._pointerDownHandler);
            }
            if ((overlay as any)._pointerMoveHandler) {
                overlay.removeEventListener('pointermove', (overlay as any)._pointerMoveHandler);
            }

            // Unmount React component
            if ((overlay as any)._reactRoot) {
                (overlay as any)._reactRoot.unmount();
            }
            // Unregister from global registry
            const id = overlayToIdRef.current.get(overlay as unknown as HTMLElement);
            if (id) {
                try { CrossCanvasRegistry.unregisterCanvas(id); } catch {}
                overlayToIdRef.current.delete(overlay as unknown as HTMLElement);
            }
            overlay.remove();
        });

        // console.log('📝 Sketch canvas overlays cleaned up');
    };

    // Function to create send button for the last edited expression only
    const createOverlayTextForAllExpressions = () => {
        if (!containerRef.current) return;

        // Find all dcg-basic-expression elements
        const basicExpressions = containerRef.current.querySelectorAll('.dcg-basic-expression') as NodeListOf<HTMLElement>;
        // console.log('📝 Found', basicExpressions.length, 'basic expressions');

        if (basicExpressions.length === 0) {
            return;
        }

        // Find the index of the last edited expression
        let lastEditedIndex = -1;
        if (lastEditedExpressionRef.current) {
            basicExpressions.forEach((expression, index) => {
                if (expression === lastEditedExpressionRef.current) {
                    lastEditedIndex = index;
                }
            });
        }

        // console.log('📝 Last edited expression index:', lastEditedIndex);

        basicExpressions.forEach((expression, index) => {
            const shouldShowButton = index === lastEditedIndex && lastEditedIndex >= 0 && !hideSendButton;
            const hasExistingButton = expression.querySelector('.medly-send-button-container');

            // If button exists but shouldn't be shown, remove it
            if (hasExistingButton && !shouldShowButton) {
                // Clean up spinner root if it exists
                if ((hasExistingButton as any)._spinnerRoot) {
                    (hasExistingButton as any)._spinnerRoot.unmount();
                    (hasExistingButton as any)._spinnerRoot = null;
                }

                // Remove event listeners
                if ((hasExistingButton as any)._clickHandler) {
                    const button = hasExistingButton.querySelector('.medly-send-button');
                    if (button) {
                        button.removeEventListener('click', (hasExistingButton as any)._clickHandler);
                    }
                }

                hasExistingButton.remove();
                // console.log('🗑️ Removed send button from expression', index);
                return;
            }

            // If button doesn't exist but should be shown, create it
            if (!hasExistingButton && shouldShowButton) {
                // Make sure the expression container has flex display
                const currentDisplay = getComputedStyle(expression).display;
                if (currentDisplay !== 'flex') {
                    expression.style.display = 'flex';
                    expression.style.alignItems = 'flex-start';
                    expression.style.gap = '16px';
                    expression.style.paddingTop = '8px';
                }

                // Create the send button container
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'medly-send-button-container';
                buttonContainer.style.cssText = `
                    display: flex !important;
                    align-items: center !important;
                    flex-shrink: 0 !important;
                    margin-left: auto !important;
                    padding-right: 8px !important;
                    position: relative !important;
                    z-index: 10000 !important;
                    pointer-events: auto !important;
                `;

                // Create the send button
                const sendButton = document.createElement('button');
                sendButton.className = 'font-rounded-semibold medly-send-button';
                sendButton.style.cssText = `
                    background: white !important;
                    border: none !important;
                    border-radius: 9999px !important;
                    color: black !important;
                    font-size: 12px !important;
                    font-weight: bold !important;
                    cursor: pointer !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 6px !important;
                    width: 72px !important;
                    height: 28px !important;
                    padding: 0 2px 0 2px !important;
                    margin-right: 8px !important;
                    box-shadow: 0px 0px 15px 0px rgba(0, 0, 0, 0.15) !important;
                    transition: background-color 0.2s !important;
                    white-space: nowrap !important;
                `;

                // Add hover effect
                sendButton.addEventListener('mouseenter', () => {
                    if (!isAwaitingResponseRef.current) {
                        sendButton.style.backgroundColor = '#f9fafb';
                    }
                });
                sendButton.addEventListener('mouseleave', () => {
                    sendButton.style.backgroundColor = 'white';
                });

                // Create button content based on state - use a function that accesses current isAwaitingResponse
                const updateButtonContent = () => {
                    // Access current isAwaitingResponse value from ref instead of closure
                    const currentIsAwaitingResponse = isAwaitingResponseRef.current;

                    if (currentIsAwaitingResponse) {
                        // Clean up existing spinner root if it exists
                        if ((buttonContainer as any)._spinnerRoot) {
                            (buttonContainer as any)._spinnerRoot.unmount();
                            (buttonContainer as any)._spinnerRoot = null;
                        }

                        // Clear existing content
                        sendButton.innerHTML = '';

                        // Create container for spinner
                        const spinnerContainer = document.createElement('div');
                        sendButton.appendChild(spinnerContainer);

                        // Create React root and render Spinner
                        const spinnerRoot = createRoot(spinnerContainer);
                        spinnerRoot.render(<Spinner size="small" />);

                        // Store spinner root on button container for cleanup
                        (buttonContainer as any)._spinnerRoot = spinnerRoot;

                        sendButton.disabled = true;
                        sendButton.style.cursor = 'default';
                    } else {
                        // Clean up spinner root if it exists
                        if ((buttonContainer as any)._spinnerRoot) {
                            (buttonContainer as any)._spinnerRoot.unmount();
                            (buttonContainer as any)._spinnerRoot = null;
                        }

                        sendButton.innerHTML = `
                            Check
                            <div style="
                                width: 18px;
                                height: 18px;
                                background-color: #00AEFF;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                position: relative;
                                font-family: 'SF Pro Rounded', sans-serif;
                            ">
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                    <path d="M5 1L5 8M5 1L2 4M5 1L8 4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        `;
                        sendButton.disabled = false;
                        sendButton.style.cursor = 'pointer';
                    }
                };



                updateButtonContent();

                // Add click handler
                const handleClick = (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isAwaitingResponseRef.current) {
                        onPressCheckDesmosRef.current?.();
                    }
                };

                sendButton.addEventListener('click', handleClick);

                // Store the update function and click handler for cleanup
                (buttonContainer as any)._updateButtonContent = updateButtonContent;
                (buttonContainer as any)._clickHandler = handleClick;

                // Append button to container
                buttonContainer.appendChild(sendButton);

                // Insert the button container after the output container (or at the end if no output container)
                const outputContainer = expression.querySelector('.dcg-exp-output-container');
                if (outputContainer) {
                    outputContainer.insertAdjacentElement('afterend', buttonContainer);
                } else {
                    expression.appendChild(buttonContainer);
                }

                // console.log('🚀 Send button rendered for expression', index, '(last edited)');
            }
        });

        // console.log('📝 Send button processing complete for last edited expression');
    };

    // Function to cleanup send buttons for all expressions
    const cleanupOverlayTextForAllExpressions = () => {
        if (!containerRef.current) return;

        // Clean up all send button containers
        const buttonContainers = containerRef.current.querySelectorAll('.medly-send-button-container') as NodeListOf<HTMLElement>;
        buttonContainers.forEach(container => {
            // Clean up spinner root if it exists
            if ((container as any)._spinnerRoot) {
                (container as any)._spinnerRoot.unmount();
                (container as any)._spinnerRoot = null;
            }

            // Remove event listeners
            if ((container as any)._clickHandler) {
                const button = container.querySelector('.medly-send-button');
                if (button) {
                    button.removeEventListener('click', (container as any)._clickHandler);
                }
            }
            container.remove();
        });

        // console.log('📝 Send buttons cleaned up for all expressions');
    };

    // Function to update existing send button state
    const updateOverlayTextForAllExpressions = () => {
        if (!containerRef.current) return;

        // Update all existing send buttons (should only be the last edited expression)
        const buttonContainers = containerRef.current.querySelectorAll('.medly-send-button-container') as NodeListOf<HTMLElement>;
        buttonContainers.forEach(container => {
            const updateFunction = (container as any)._updateButtonContent;
            if (updateFunction) {
                updateFunction();
            }
        });

        // console.log('📝 Send button state updated for last edited expression');
    };

    // Add this to the window for easy access in console
    useEffect(() => {
        if (showMedlyLayer) {
            (window as any).refreshOverlay = () => {
                setForceUpdate(prev => prev + 1);
            };
        }
    }, [showMedlyLayer]);

    // Watch for container becoming ready
    useEffect(() => {
        // console.log('👀 HandwritingLayer: Watching for container readiness...');
        if (!showMedlyLayer) {
            // console.log('❌ HandwritingLayer: showMedlyLayer false, not watching container');
            setContainerReady(false);
            return;
        }

        let intervalId: NodeJS.Timeout | null = null;

        const checkContainerReady = () => {
            const isReady = !!containerRef.current && !!containerRef.current.querySelector('.dcg-calc-basic-main, .dcg-container');

            setContainerReady(prev => {
                if (isReady !== prev) {
                    // console.log('🔄 HandwritingLayer: Container readiness changed to:', isReady);

                    // If container becomes ready, stop the polling interval
                    if (isReady && intervalId) {
                        // console.log('🛑 HandwritingLayer: Container is ready, stopping polling interval');
                        clearInterval(intervalId);
                        intervalId = null;
                    }

                    return isReady;
                }
                return prev;
            });
        };

        // Check immediately
        checkContainerReady();

        // Set up a polling interval to check for readiness (only if not already ready)
        if (!containerReady) {
            intervalId = setInterval(checkContainerReady, 100);
        }

        // Also listen for DOM changes that might indicate readiness
        let observer: MutationObserver | null = null;
        if (containerRef.current) {
            observer = new MutationObserver(checkContainerReady);
            observer.observe(containerRef.current, {
                childList: true,
                subtree: true
            });
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
            observer?.disconnect();
        };
    }, [showMedlyLayer]); // Only re-run when showMedlyLayer changes

    useEffect(() => {
        // console.log('🔄 HandwritingLayer useEffect triggered - showMedlyLayer:', showMedlyLayer, 'containerReady:', containerReady, 'containerRef exists:', !!containerRef.current);
        if (!showMedlyLayer) {
            // console.log('❌ HandwritingLayer: showMedlyLayer is false, skipping initialization');
            return;
        }
        if (!containerReady || !containerRef.current) {
            // console.log('❌ HandwritingLayer: containerReady is false or containerRef.current is null, skipping initialization (Desmos not ready yet)');
            return;
        }

        // console.log('✅ HandwritingLayer: All conditions met, proceeding with initialization');

        const cleanupPreviousHighlight = () => {
            // console.log('🧹 Cleaning up previous highlight');
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

            // console.log('🎯 HandwritingLayer: Starting element highlighting...');

            // Apply text alignment to math root blocks
            // console.log('🎯 HandwritingLayer: Applying text alignment to root blocks...');
            applyRootBlockTextAlignment();

            // Update expression visibility based on confidence (initially will hide all since no confidence data yet)
            // console.log('🎯 HandwritingLayer: Updating initial expression visibility...');
            updateExpressionVisibility();

            // Apply initial sizing to expressions (centralized here)
            // console.log('🎯 HandwritingLayer: Applying initial expression sizing...');
            applyInitialExpressionSizing();

            // Create sketch canvas overlays for scientific calculator expressions
            // console.log('🎯 HandwritingLayer: Creating sketch canvas overlays...');
            createSketchCanvasOverlays();

            // Create send buttons for all basic expressions instead of just selected ones
            // console.log('🎯 HandwritingLayer: Creating overlay text for all expressions...');
            createOverlayTextForAllExpressions();

            // console.log('✅ HandwritingLayer: Element highlighting completed');
        };

        // Ensure parent containers allow overflow for cross-canvas strokes
        if (containerRef.current) {
            // Set overflow visible on the container and its parent elements
            const container = containerRef.current;
            container.style.overflow = 'visible';

            // Also set on parent elements that might clip
            let parent = container.parentElement;
            while (parent && parent !== document.body) {
                if (parent.classList.contains('dcg-calculator') ||
                    parent.classList.contains('dcg-container') ||
                    parent.style.overflow === 'hidden') {
                    parent.style.overflow = 'visible';
                }
                parent = parent.parentElement;
            }
        }

        // Start highlighting immediately
        highlightElement();

        // Set up mutation observer to watch for new expressions
        const observer = new MutationObserver((mutations) => {
            // Check if new expressions were added
            const hasNewExpressions = mutations.some(mutation => {
                return Array.from(mutation.addedNodes).some(node =>
                    (node as Element).classList?.contains?.('dcg-basic-expression')
                );
            });

            if (hasNewExpressions) {
                // console.log('🆕 New expressions detected, applying sizing, creating overlays and send buttons');
                applyRootBlockTextAlignment();
                updateExpressionVisibility();
                applyInitialExpressionSizing();
                createSketchCanvasOverlays();
                createOverlayTextForAllExpressions();
            }
        });

        // Start observing the container for class changes
        if (containerRef.current) {
            observer.observe(containerRef.current, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }

        return () => {
            observer.disconnect();

            // Clean up on unmount
            cleanupPreviousHighlight();

            // Clean up sketch canvas overlays
            cleanupSketchCanvasOverlays();

            // Clean up send buttons for all expressions
            cleanupOverlayTextForAllExpressions();

            // Clear sketch canvas refs
            sketchCanvasRefs.current.clear();

            // Clear global stroke history and last edited expression
            globalStrokeHistory.current = [];
            updateExpressionFocus(null);

            // Clear coordinate map, cross-canvas operation reference, stored bounds, confidence data, and redo history
            canvasCoordinateMapRef.current.clear();
            crossCanvasOperationRef.current = null;
            strokeBoundsRef.current.clear();
            confidenceDataRef.current.clear();
            redoHistoryRef.current = [];

            // Clean up decorated elements (both math and stroke decorations)
            decoratedElementsRef.current.forEach((_, element) => {
                // Remove existing math underline decoration
                const existingMathUnderline = element.querySelector('.medly-math-underline');
                if (existingMathUnderline) {
                    // Remove click handler from underline
                    if ((existingMathUnderline as any)._medlyUnderlineClickHandler) {
                        existingMathUnderline.removeEventListener('click', (existingMathUnderline as any)._medlyUnderlineClickHandler);
                        delete (existingMathUnderline as any)._medlyUnderlineClickHandler;
                    }
                    existingMathUnderline.remove();
                }

                // Remove existing stroke underline decoration
                const existingStrokeUnderline = element.querySelector('.medly-stroke-underline');
                if (existingStrokeUnderline) {
                    // Remove click handler from underline
                    if ((existingStrokeUnderline as any)._medlyUnderlineClickHandler) {
                        existingStrokeUnderline.removeEventListener('click', (existingStrokeUnderline as any)._medlyUnderlineClickHandler);
                        delete (existingStrokeUnderline as any)._medlyUnderlineClickHandler;
                    }
                    existingStrokeUnderline.remove();
                }

                // Reset cursor and remove attributes
                element.style.cursor = '';
                element.removeAttribute('data-medly-decorated');
                element.removeAttribute('data-medly-stroke-decorated');

                // Remove click handler
                if ((element as any)._medlyClickHandler) {
                    element.removeEventListener('click', (element as any)._medlyClickHandler);
                    delete (element as any)._medlyClickHandler;
                }
            });
            decoratedElementsRef.current.clear();
        };
    }, [showMedlyLayer, containerReady, forceUpdate]);

    // Separate effect for prop updates to avoid unnecessary re-renders
    useEffect(() => {
        if (showMedlyLayer && containerReady && containerRef.current) {
            // console.log('🔄 HandwritingLayer: Updating overlay text for all expressions');
            updateOverlayTextForAllExpressions();
        }
    }, [isAwaitingResponse, showMedlyLayer, containerReady]);

    // Separate effect for expression decorations to avoid unnecessary re-renders
    useEffect(() => {
        if (showMedlyLayer && containerReady && containerRef.current) {
            // console.log('🔄 HandwritingLayer: Applying expression decorations');
            // Check if we have basic expressions (scientific calculator mode)
            const basicExpressions = containerRef.current.querySelectorAll('.dcg-basic-expression');

            if (basicExpressions.length > 0) {
                // console.log('🎨 HandwritingLayer: Applying stroke-based decorations for scientific calculator mode');
                // Use stroke-based decorations for scientific calculator mode
                applyStrokeExpressionDecorations();
            } else {
                // console.log('🎨 HandwritingLayer: Applying math-based decorations for regular expressions');
                // Use math-based decorations for regular expressions
                applyExpressionDecorations();
            }
        }
    }, [expressionItemDecorations, showMedlyLayer, containerReady]);

    // Effect to update floating message ref
    useEffect(() => {
        floatingMessageRef.current = floatingMessage;
    }, [floatingMessage]);

    // Effect to update overlay borders when floating message changes
    useEffect(() => {
        if (showMedlyLayer && containerReady && containerRef.current) {
            // console.log('🎨 HandwritingLayer: Updating overlay borders based on floating message');
            updateOverlayBorders();
        }
    }, [floatingMessage, showMedlyLayer, containerReady, updateOverlayBorders]);

    // Note: We don't set eraser mode globally anymore to avoid interference between canvases
    // Instead, we handle eraser mode per-interaction via pointer events on each canvas

    // Return null if the layer should not be shown
    if (!showMedlyLayer) {
        return null;
    }

    return null; // This component doesn't render anything in React
});

export default HandwritingLayer;