"use client";

import React, {
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import { CrossCanvasRegistry } from "@/app/_lib/utils/CrossCanvasRegistry";

interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
  velocity?: number; // For velocity-based pressure simulation
}

interface Vec2 {
  x: number;
  y: number;
}

// Velocity tracking for pressure simulation
interface VelocityTracker {
  prevPoint: Vec2;
  pointerVelocity: Vec2;
  prevPressure: number;
}

interface EraserPreviewPoint extends Point {
  timestamp: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  isEraser: boolean;
  isApplePencil?: boolean; // Optional for backward compatibility
  zIndex: number; // For cross-canvas z-ordering
}

interface CustomSketchCanvasProps {
  width?: string | number;
  height?: string | number;
  strokeColor?: string;
  strokeWidth?: number;
  eraserWidth?: number;
  onStroke?: (
    data: any,
    isEraser: boolean,
    eraserPoints?: Point[],
    erasedStrokesData?: any,
    isHistoryUpdate?: boolean,
    strokeId?: string
  ) => void;
  onEraserMove?: (eraserPoints: Point[]) => void;
  onDrawingStateChange?: (isDrawing: boolean) => void;
  style?: React.CSSProperties;
  index?: number; // Index of the expression to show placeholder for first one
  initialPaths?: any; // Initial stroke data to load
  questionId?: string; // Question ID for globally unique stroke IDs
  showPlaceholder?: boolean;
  onStrokeAdded?: (
    questionId: string,
    canvasRef: any,
    strokeId: string,
    strokeData?: any
  ) => void;
  onStrokeRemoved?: (questionId: string, strokeId: string) => void;
  onEraseAction?: (questionId: string, canvasRef: any, erasedData: any) => void;
  // Global cross-canvas registry integration (optional)
  registerWithRegistryId?: string; // if provided, register this canvas
  isReadOnly?: boolean;
}

interface CustomSketchCanvasHandle {
  eraseMode: (enabled: boolean) => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  exportPaths: () => Promise<any>;
  crossCanvasErase: (eraserPoints: Point[]) => Promise<void>;
  previewCrossCanvasErase: (eraserPoints: Point[]) => void;
  clearErasePreview: () => void;
  getStrokeBounds: () => {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  } | null;
  importStrokes: (pathsData: any) => void;
  addStrokes: (strokesData: any) => void; // Method to add back erased strokes for undo
  // New methods for clean ID-based undo/redo
  removeStrokeById: (strokeId: string) => void;
  addStroke: (strokeData: {
    id: string;
    points: Point[];
    color: string;
    width: number;
    isEraser: boolean;
    isApplePencil?: boolean;
    zIndex: number;
  }) => void;
  // Batch methods for handling multiple strokes atomically
  addStrokesBatch: (
    strokesData: Array<{
      id: string;
      points: Point[];
      color: string;
      width: number;
      isEraser: boolean;
      isApplePencil?: boolean;
      zIndex: number;
    }>
  ) => void;
  removeStrokesByIds: (strokeIds: string[]) => void;
  isReadOnly: boolean;
}

const CustomSketchCanvas = forwardRef<
  CustomSketchCanvasHandle,
  CustomSketchCanvasProps
>(function CustomSketchCanvas(
  {
    width = "100%",
    height = "100%",
    strokeColor = "#06B0FF",
    strokeWidth = 4, // Base 4px * 0.75 min pressure = 3px minimum stroke width
    eraserWidth = 8,
    onStroke,
    onEraserMove,
    onDrawingStateChange,
    style = {},
    index,
    initialPaths,
    questionId,
    showPlaceholder = true,
    onStrokeAdded,
    onStrokeRemoved,
    onEraseAction,
    registerWithRegistryId,
    isReadOnly = false,
  },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const registeredIdRef = useRef<string | null>(null);
  const selfRef = useRef<CustomSketchCanvasHandle | null>(null); // Self-reference for callbacks

  // Initialize strokes with initial paths if provided
  const initialStrokes = React.useMemo(() => {
    if (initialPaths) {
      const convertedStrokes =
        initialPaths.paths?.map(
          (pathData: any, pathIndex: number): Stroke => ({
            id: `initial-stroke-${pathIndex}`,
            points: Array.isArray(pathData.paths) ? pathData.paths : [],
            color: strokeColor,
            width: strokeWidth,
            isEraser: false,
            isApplePencil: false,
            zIndex: pathIndex,
          })
        ) || [];
      return convertedStrokes;
    }
    return [];
  }, [initialPaths, strokeColor, strokeWidth]);

        const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
        const [history, setHistory] = useState<Stroke[][]>([initialStrokes]);
        const [historyIndex, setHistoryIndex] = useState(0);
        const [isDrawing, setIsDrawing] = useState(false);
        const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
        const [isEraserMode, setIsEraserMode] = useState(false);
        const [eraserPreviewPoints, setEraserPreviewPoints] = useState<EraserPreviewPoint[]>([]);
        const [strokesToDelete, setStrokesToDelete] = useState<Set<string>>(new Set());

  // Tracking state
  const strokeIdCounter = useRef(0);
  const lastPointRef = useRef<Point | null>(null);
  const currentPointerIdRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const globalZIndex = useRef(0); // Global z-index for cross-canvas ordering

  // Velocity tracking for pressure simulation
  const velocityTracker = useRef<VelocityTracker>({
    prevPoint: { x: 0, y: 0 },
    pointerVelocity: { x: 0, y: 0 },
    prevPressure: 0.7, // Start with higher pressure for 2px+ strokes
  });

  // Notify parent component when drawing state changes
  React.useEffect(() => {
    if (onDrawingStateChange) {
      onDrawingStateChange(isDrawing);
    }
  }, [isDrawing, onDrawingStateChange]);

  // Register/unregister with global registry if asked
  useEffect(() => {
    const id = registerWithRegistryId;
    const el = svgRef.current as unknown as HTMLElement | null;
    if (id && el) {
      registeredIdRef.current = id;
      try {
        CrossCanvasRegistry.registerCanvas(id, "page", el, () => {
          const handle = selfRef.current;
          if (!handle) return null;
          return {
            previewEraseLocal: (points) =>
              handle.previewCrossCanvasErase(points),
            performEraseLocal: (points) => handle.crossCanvasErase(points),
            clearErasePreview: () => handle.clearErasePreview(),
          };
        });
      } catch {}
    }
    return () => {
      if (registeredIdRef.current) {
        try {
          CrossCanvasRegistry.unregisterCanvas(registeredIdRef.current);
        } catch {}
        registeredIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerWithRegistryId]);

  // Constants for pressure simulation
  const RATE_OF_PRESSURE_CHANGE = 0.275;

  // Vector utilities
  const vecSub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
  const vecLen = (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y);
  const vecNormalize = (v: Vec2): Vec2 => {
    const len = vecLen(v);
    return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
  };
  const vecMul = (v: Vec2, scalar: number): Vec2 => ({
    x: v.x * scalar,
    y: v.y * scalar,
  });
  const vecLerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });

  // Update pointer velocity for pressure simulation
  const updatePointerVelocity = useCallback(
    (currentPoint: Vec2, elapsed: number) => {
      if (elapsed === 0) return;

      const tracker = velocityTracker.current;
      const delta = vecSub(currentPoint, tracker.prevPoint);
      tracker.prevPoint = { ...currentPoint };

      const length = vecLen(delta);
      const direction = length ? vecNormalize(delta) : { x: 0, y: 0 };

      // Linear interpolation to smooth velocity
      const next = vecLerp(
        tracker.pointerVelocity,
        vecMul(direction, length / elapsed),
        0.5
      );

      // Zero out very small velocities
      if (Math.abs(next.x) < 0.01) next.x = 0;
      if (Math.abs(next.y) < 0.01) next.y = 0;

      tracker.pointerVelocity = next;
    },
    []
  );

  // Simulate pressure from velocity (tldraw pattern)
  const simulatePressure = useCallback(
    (
      currentPoint: Vec2,
      lastPoint: Point | null,
      realPressure: number,
      isApplePencil: boolean
    ): number => {
      const tracker = velocityTracker.current;

      if (!lastPoint) {
        tracker.prevPressure = isApplePencil
          ? Math.max(0.75, realPressure * 1.875)
          : 0.7;
        return tracker.prevPressure;
      }

      const distance = Math.sqrt(
        Math.pow(currentPoint.x - lastPoint.x, 2) +
          Math.pow(currentPoint.y - lastPoint.y, 2)
      );

      const elapsed = Date.now() - (lastPoint.timestamp || 0);
      updatePointerVelocity(currentPoint, elapsed);

      let pressure: number;

      if (isApplePencil && realPressure > 0) {
        // Use real pressure with smoothing for Apple Pencil
        const sp = Math.min(1, distance / strokeWidth); // Speed factor
        pressure = Math.min(
          1,
          tracker.prevPressure +
            (realPressure * 1.875 - tracker.prevPressure) *
              (sp * RATE_OF_PRESSURE_CHANGE)
        );
      } else {
        // Simulate pressure based on velocity for finger/mouse
        const velocity = vecLen(tracker.pointerVelocity);
        const maxVelocity = 50; // Adjust based on testing
        const sp = Math.min(1, velocity / maxVelocity); // Speed factor
        const rp = Math.min(1, 1 - sp); // Reverse pressure: slower = more pressure

        pressure = Math.min(
          1,
          tracker.prevPressure +
            (rp - tracker.prevPressure) * (sp * RATE_OF_PRESSURE_CHANGE)
        );
        pressure = Math.max(0.5, Math.min(1.0, pressure)); // Ensure minimum 50% pressure (2px with 4px base)
      }

      tracker.prevPressure = pressure;
      return pressure;
    },
    [strokeWidth]
  );

  // Points between with pressure simulation
  const pointsBetween = useCallback(
    (a: Point, b: Point, steps = 6): Point[] => {
      const results: Point[] = [];

      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        // Ease function for smoother interpolation
        const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        const point: Point = {
          x: a.x + (b.x - a.x) * easedT,
          y: a.y + (b.y - a.y) * easedT,
          pressure:
            (a.pressure || 0.5) +
            ((b.pressure || 0.5) - (a.pressure || 0.5)) * easedT,
          timestamp:
            (a.timestamp || 0) +
            ((b.timestamp || 0) - (a.timestamp || 0)) * easedT,
          velocity: Math.abs(0.5 - easedT) * 0.65 + 0.35, // Simulate varying pressure
        };

        results.push(point);
      }

      return results;
    },
    []
  );

  // Generate pressure-sensitive path from points
  const generatePressurePath = useCallback(
    (points: Point[], baseWidth: number): string => {
      if (points.length < 2) return "";

      // For single point, create a small circle
      if (points.length === 1) {
        const point = points[0];
        const radius = (baseWidth * (point.pressure || 0.5)) / 2;
        return `M ${point.x - radius} ${point.y} A ${radius} ${radius} 0 1 0 ${point.x + radius} ${point.y} A ${radius} ${radius} 0 1 0 ${point.x - radius} ${point.y}`;
      }

      // Generate smooth path with varying width based on pressure
      let path = "";

      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];

        // Calculate stroke width based on pressure
        const currentWidth = baseWidth * (current.pressure || 0.5);
        const nextWidth = baseWidth * (next.pressure || 0.5);
        const avgWidth = (currentWidth + nextWidth) / 2;

        // Create a simple line segment
        // In a full implementation, you'd create variable-width strokes
        // For now, we'll use the average width and let CSS handle it
        if (i === 0) {
          path += `M ${current.x} ${current.y}`;
        }

        // Use quadratic curves for smoother lines
        if (i < points.length - 2) {
          const control = {
            x: (current.x + next.x) / 2,
            y: (current.y + next.y) / 2,
          };
          path += ` Q ${current.x} ${current.y} ${control.x} ${control.y}`;
        } else {
          path += ` L ${next.x} ${next.y}`;
        }
      }

      return path;
    },
    []
  );

  // Calculate average pressure for stroke width
  const getAveragePressure = useCallback((points: Point[]): number => {
    if (points.length === 0) return 0.5;
    const totalPressure = points.reduce(
      (sum, point) => sum + (point.pressure || 0.5),
      0
    );
    return totalPressure / points.length;
  }, []);

  // Generate eraser preview segments with fade
  const generateEraserPreviewSegments = useCallback(() => {
    if (eraserPreviewPoints.length < 2) return [];

    const now = Date.now();
    const fadeTime = 500;
    const initialStrokeWidth = 10; // Starting stroke width for eraser preview
    const segments = [];

    // Group consecutive points into segments based on timestamps
    let currentSegment = [eraserPreviewPoints[0]];

    for (let i = 1; i < eraserPreviewPoints.length; i++) {
      const point = eraserPreviewPoints[i];
      const age = now - point.timestamp;

      if (age >= fadeTime) continue; // Skip expired points

      currentSegment.push(point);

      // If this point is old enough or we've reached end, create a segment
      if (currentSegment.length >= 10 || i === eraserPreviewPoints.length - 1) {
        if (currentSegment.length >= 2) {
          // Calculate opacity based on average age of segment
          const avgAge =
            currentSegment.reduce((sum, p) => sum + (now - p.timestamp), 0) /
            currentSegment.length;
          const progress = Math.min(avgAge / fadeTime, 1);

          // Ease-out function: 1 - (1-t)^3
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          const opacity = Math.max(0, 1 - easedProgress);

          // Animate stroke width from initial width down to 0
          const strokeWidth = Math.max(
            0,
            initialStrokeWidth * (1 - easedProgress)
          );

          if (opacity > 0.01 && strokeWidth > 0.1) {
            // Only render if visible and has width
            segments.push({
              path: generatePressurePath(currentSegment, eraserWidth),
              opacity,
              strokeWidth,
            });
          }
        }
        currentSegment = [point]; // Start new segment
      }
    }

    return segments;
  }, [eraserPreviewPoints, generatePressurePath, eraserWidth]);

  // Check if eraser intersects with a stroke
  const doesEraserIntersectStroke = useCallback(
    (eraserPoints: Point[], stroke: Stroke): boolean => {
      const eraserRadius = eraserWidth / 2;

      // Check if any eraser point is close enough to any stroke point
      for (const eraserPoint of eraserPoints) {
        for (const strokePoint of stroke.points) {
          const distance = Math.sqrt(
            Math.pow(eraserPoint.x - strokePoint.x, 2) +
              Math.pow(eraserPoint.y - strokePoint.y, 2)
          );
          if (distance <= eraserRadius + stroke.width / 2) {
            return true;
          }
        }
      }
      return false;
    },
    [eraserWidth]
  );

  // Helper function to determine if a stroke should be rendered as a dot
  const isStrokeDot = useCallback((stroke: Stroke): boolean => {
    if (stroke.points.length === 0) return false;
    if (stroke.points.length === 1) return true;

    // Check if all points are very close together (within 3 pixels)
    const firstPoint = stroke.points[0];
    const maxDistance = stroke.points.reduce((max, point) => {
      const distance = Math.sqrt(
        Math.pow(point.x - firstPoint.x, 2) +
          Math.pow(point.y - firstPoint.y, 2)
      );
      return Math.max(max, distance);
    }, 0);

    return maxDistance <= 3;
  }, []);

  // Update strokes that will be deleted by current eraser path
  const updateStrokesToDelete = useCallback(
    (eraserPoints: Point[]) => {
      if (!isEraserMode || eraserPoints.length === 0) {
        setStrokesToDelete(new Set());
        return;
      }

      const intersectingStrokeIds = new Set<string>();
      strokes.forEach((stroke) => {
        if (
          !stroke.isEraser &&
          doesEraserIntersectStroke(eraserPoints, stroke)
        ) {
          intersectingStrokeIds.add(stroke.id);
        }
      });

      setStrokesToDelete(intersectingStrokeIds);
    },
    [isEraserMode, strokes, doesEraserIntersectStroke]
  );

  // Add eraser preview point with timestamp
  const addEraserPreviewPoint = useCallback((point: Point) => {
    const previewPoint: EraserPreviewPoint = {
      ...point,
      timestamp: Date.now(),
    };
    setEraserPreviewPoints((prev) => [...prev, previewPoint]);
  }, []);

  // Clean up expired eraser preview points and update animation
  const updateEraserPreview = useCallback(() => {
    const now = Date.now();
    const fadeTime = 300; // 300ms fade duration

    setEraserPreviewPoints((prev) =>
      prev.filter((point) => now - point.timestamp < fadeTime)
    );
  }, []);

  // Animation loop for eraser preview
  const animateEraserPreview = useCallback(() => {
    updateEraserPreview();
    if (eraserPreviewPoints.length > 0 || isDrawing) {
      animationFrameRef.current = requestAnimationFrame(animateEraserPreview);
    }
  }, [eraserPreviewPoints.length, isDrawing, updateEraserPreview]);

  // Start/stop animation based on eraser preview points
  React.useEffect(() => {
    if (eraserPreviewPoints.length > 0 || (isDrawing && isEraserMode)) {
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(animateEraserPreview);
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    eraserPreviewPoints.length,
    isDrawing,
    isEraserMode,
    animateEraserPreview,
  ]);

  // Add to history for undo/redo
  const addToHistory = useCallback(
    (newStrokes: Stroke[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push([...newStrokes]);
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  // Apple Pencil detection based on tldraw logic
  const detectApplePencil = useCallback(
    (event: React.PointerEvent): boolean => {
      const pressure = event.pressure || 0;
      const isPointerTypePen = event.pointerType === "pen";

      // tldraw logic: isPen || (z > 0 && z < 0.5) || (z > 0.5 && z < 1)
      const isPenOrStylus =
        isPointerTypePen ||
        (pressure > 0 && pressure < 0.5) ||
        (pressure > 0.5 && pressure < 1);

      // console.log('🖊️ Pencil Detection:', {
      //     pointerType: event.pointerType,
      //     pressure: pressure,
      //     isPenOrStylus: isPenOrStylus,
      //     isPointerTypePen: isPointerTypePen
      // });

      return isPenOrStylus;
    },
    []
  );

  // Get SVG coordinates with pressure simulation
  const getSVGPoint = useCallback(
    (event: React.PointerEvent, isApplePencil: boolean): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0, pressure: 0, timestamp: 0 };

      const rect = svg.getBoundingClientRect();
      const rawPressure = event.pressure || 0;
      const currentPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      // Simulate or use real pressure
      const pressure = simulatePressure(
        currentPoint,
        lastPointRef.current,
        rawPressure,
        isApplePencil
      );

      return {
        x: currentPoint.x,
        y: currentPoint.y,
        pressure: pressure,
        timestamp: Date.now(),
      };
    },
    [simulatePressure]
  );

  // Start drawing
  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      // Prevent any drawing/erasing in read-only mode
      if (isReadOnly) {
        return;
      }

      // Comment out debug logging
      // console.log('🖊️ PointerDown:', {
      //     pointerType: event.pointerType,
      //     pointerId: event.pointerId,
      //     pressure: event.pressure,
      //     isPrimary: event.isPrimary,
      //     button: event.button,
      //     buttons: event.buttons,
      //     timestamp: Date.now()
      // });

      // Prevent default to avoid conflicts
      event.preventDefault();

      // Only handle primary pointer (left click/first touch/Apple Pencil)
      if (!event.isPrimary) {
        // console.log('⚠️ Ignoring non-primary pointer');
        return;
      }

      const isApplePencil = detectApplePencil(event);

      // Reset velocity tracker for new stroke
      velocityTracker.current.prevPoint = {
        x: event.clientX,
        y: event.clientY,
      };
      velocityTracker.current.pointerVelocity = { x: 0, y: 0 };
      velocityTracker.current.prevPressure = isApplePencil
        ? Math.max(0.75, (event.pressure || 0) * 1.875)
        : 0.7;

      const point = getSVGPoint(event, isApplePencil);

      // Comment out debug logging
      // console.log('🖊️ Starting stroke:', {
      //     point,
      //     isApplePencil,
      //     pointerId: event.pointerId,
      //     rawPressure: event.pressure,
      //     simulatedPressure: point.pressure
      // });

      lastPointRef.current = point;
      currentPointerIdRef.current = event.pointerId;

      const newStroke: Stroke = {
        id: questionId
          ? `${questionId}-stroke-${strokeIdCounter.current++}`
          : `stroke-${strokeIdCounter.current++}`,
        points: [point],
        color: isEraserMode ? "transparent" : strokeColor,
        width: isEraserMode ? eraserWidth : strokeWidth,
        isEraser: isEraserMode,
        isApplePencil: isApplePencil,
        zIndex: globalZIndex.current++, // Assign and increment global z-index
      };

      setCurrentStroke(newStroke);
      setIsDrawing(true);

      // Add initial eraser preview point if in eraser mode
      if (isEraserMode) {
        addEraserPreviewPoint(point);
      }

      // Capture pointer - critical for Apple Pencil
      if (svgRef.current) {
        try {
          svgRef.current.setPointerCapture(event.pointerId);
          // console.log('✅ Pointer captured:', event.pointerId);
        } catch (error) {
          console.error("❌ Failed to capture pointer:", error);
        }
      }
    },
    [
      getSVGPoint,
      detectApplePencil,
      strokeColor,
      strokeWidth,
      eraserWidth,
      isEraserMode,
      addEraserPreviewPoint,
      isReadOnly,
    ]
  );

  // Continue drawing
  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      // Early exit if not drawing or wrong pointer
      if (
        !isDrawing ||
        !currentStroke ||
        currentPointerIdRef.current !== event.pointerId
      ) {
        // Comment out debug logging
        // if (event.pointerType === 'pen') {
        //     console.log('🖊️ PointerMove ignored:', {
        //         isDrawing,
        //         hasCurrentStroke: !!currentStroke,
        //         pointerIdMatch: currentPointerIdRef.current === event.pointerId,
        //         currentPointerId: currentPointerIdRef.current,
        //         eventPointerId: event.pointerId
        //     });
        // }
        return;
      }

      event.preventDefault();
      const isApplePencil = currentStroke.isApplePencil || false;
      const point = getSVGPoint(event, isApplePencil);
      const lastPoint = lastPointRef.current;

      // Distance check - Apple Pencil needs smaller threshold
      if (lastPoint) {
        const distance = Math.sqrt(
          Math.pow(point.x - lastPoint.x, 2) +
            Math.pow(point.y - lastPoint.y, 2)
        );

        // Use smaller threshold for Apple Pencil (similar to tldraw's 1/zoomLevel approach)
        const minDistance = currentStroke.isApplePencil ? 0.5 : 2;

        if (distance < minDistance) {
          return;
        }
      }

      lastPointRef.current = point;

      // Add eraser preview point if in eraser mode
      if (isEraserMode) {
        addEraserPreviewPoint(point);
      }

      // Comment out debug logging
      // console.log('🖊️ Adding point:', {
      //     strokeId: currentStroke.id,
      //     pointsCount: currentStroke.points.length,
      //     point,
      //     isApplePencil: currentStroke.isApplePencil
      // });

      setCurrentStroke((prev) => {
        if (!prev) return null;
        const updatedStroke = {
          ...prev,
          points: [...prev.points, point],
        };

        // Update strokes to delete preview if in eraser mode
        if (isEraserMode) {
          updateStrokesToDelete(updatedStroke.points);
          // Call cross-canvas eraser preview
          if (onEraserMove) {
            onEraserMove(updatedStroke.points);
          }
          // Broadcast preview to other canvas types via registry
          if (registeredIdRef.current) {
            try {
              CrossCanvasRegistry.previewGlobalErase(
                registeredIdRef.current,
                updatedStroke.points as any
              );
            } catch (error) {
              console.error(
                "Failed to preview global erase from page canvas:",
                registeredIdRef.current,
                error
              );
            }
          }
        }

        return updatedStroke;
      });
    },
    [
      isDrawing,
      currentStroke,
      getSVGPoint,
      isEraserMode,
      addEraserPreviewPoint,
      updateStrokesToDelete,
      onEraserMove,
    ]
  );

  // End drawing
  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      // Comment out debug logging
      // console.log('🖊️ PointerUp:', {
      //     pointerType: event.pointerType,
      //     pointerId: event.pointerId,
      //     isDrawing,
      //     hasCurrentStroke: !!currentStroke,
      //     strokePoints: currentStroke?.points?.length || 0,
      //     matchesCurrentPointer: currentPointerIdRef.current === event.pointerId
      // });

      // Only handle if this is our current drawing pointer
      if (
        !isDrawing ||
        !currentStroke ||
        currentPointerIdRef.current !== event.pointerId
      ) {
        // console.log('⚠️ PointerUp ignored - state mismatch');
        return;
      }

      event.preventDefault();
      setIsDrawing(false);

      if (isEraserMode) {
        // Capture strokes that will be erased BEFORE removing them
        const erasedStrokes = strokes.filter(
          (stroke) =>
            !stroke.isEraser &&
            doesEraserIntersectStroke(currentStroke.points, stroke)
        );

        // Remove intersecting strokes
        const newStrokes = strokes.filter(
          (stroke) => !doesEraserIntersectStroke(currentStroke.points, stroke)
        );
        setStrokes(newStrokes);
        addToHistory(newStrokes);

        // Call onStroke callback for OCR processing after erasing
        if (onStroke) {
          // Create the export data with the remaining strokes (for OCR)
          const allDrawingStrokes = newStrokes.filter(
            (stroke) => !stroke.isEraser
          );
          const exportData = {
            paths: allDrawingStrokes.map((stroke) => ({
              paths: stroke.points,
            })),
          };

          // Create erased strokes data for undo functionality
          const erasedStrokesData = {
            paths: erasedStrokes.map((stroke) => ({
              paths: stroke.points,
              id: stroke.id,
              color: stroke.color,
              width: stroke.width,
              zIndex: stroke.zIndex,
              isApplePencil: stroke.isApplePencil,
            })),
          };

          // Use requestAnimationFrame for better performance and to avoid blocking next strokes
          requestAnimationFrame(() => {
            // Pass remaining strokes for OCR, eraser points for cross-canvas, and erased strokes for undo
            onStroke(exportData, true, currentStroke.points, erasedStrokesData);
          });
        }

        // Call onEraseAction callback for global undo/redo system
        if (
          onEraseAction &&
          questionId &&
          erasedStrokes.length > 0 &&
          selfRef.current
        ) {
          const erasedStrokesData = {
            paths: erasedStrokes.map((stroke) => ({
              paths: stroke.points,
              id: stroke.id,
              color: stroke.color,
              width: stroke.width,
              zIndex: stroke.zIndex,
              isApplePencil: stroke.isApplePencil,
            })),
          };
          onEraseAction(questionId, selfRef.current, erasedStrokesData);
        }

        // Broadcast global erase to Desmos canvases via registry
        if (registeredIdRef.current && currentStroke.points.length > 0) {
          try {
            CrossCanvasRegistry.performGlobalErase(
              registeredIdRef.current,
              currentStroke.points as any
            ).then(() => {
              try {
                CrossCanvasRegistry.clearAllPreviews();
              } catch {}
            });
          } catch (error) {
            console.error(
              "Failed to perform global erase from page canvas:",
              registeredIdRef.current,
              error
            );
          }
        }
      } else {
        // Add the completed stroke
        const newStrokes = [...strokes, currentStroke];
        setStrokes(newStrokes);
        addToHistory(newStrokes);

        // Call onStroke callback for OCR processing with the updated strokes
        if (onStroke && currentStroke.points.length > 0) {
          // Create the export data with the updated strokes (including the current one)
          const allDrawingStrokes = newStrokes.filter(
            (stroke) => !stroke.isEraser
          );
          const exportData = {
            paths: allDrawingStrokes.map((stroke) => ({
              paths: stroke.points,
            })),
          };

          // Use requestAnimationFrame for better performance and to avoid blocking next strokes
          requestAnimationFrame(() => {
            onStroke(
              exportData,
              false,
              undefined,
              undefined,
              false,
              currentStroke.id
            );
          });
        }

        // Call onStrokeAdded callback for global undo/redo system
        if (
          onStrokeAdded &&
          questionId &&
          currentStroke.id &&
          selfRef.current
        ) {
          const strokeData = {
            id: currentStroke.id,
            points: currentStroke.points,
            color: currentStroke.color,
            width: currentStroke.width,
            isEraser: currentStroke.isEraser,
            isApplePencil: currentStroke.isApplePencil,
            zIndex: currentStroke.zIndex,
          };
          onStrokeAdded(
            questionId,
            selfRef.current,
            currentStroke.id,
            strokeData
          );
        }
      }

      setCurrentStroke(null);
      currentPointerIdRef.current = null;

      // Clear eraser preview state
      setStrokesToDelete(new Set());

      // Clear cross-canvas eraser preview when erasing ends
      if (isEraserMode && onEraserMove) {
        onEraserMove([]); // Empty array signals end of erasing
      }

      // Release pointer capture
      if (svgRef.current) {
        try {
          svgRef.current.releasePointerCapture(event.pointerId);
          // console.log('✅ Pointer released:', event.pointerId);
        } catch (error) {
          console.error("❌ Failed to release pointer:", error);
        }
      }
    },
    [
      isDrawing,
      currentStroke,
      isEraserMode,
      strokes,
      doesEraserIntersectStroke,
      addToHistory,
      onStroke,
      onEraserMove,
    ]
  );

  // Handle pointer cancel/leave
  const handlePointerCancel = useCallback(
    (event: React.PointerEvent) => {
      // Comment out debug logging
      // console.log('🖊️ PointerCancel/Leave:', {
      //     pointerType: event.pointerType,
      //     pointerId: event.pointerId,
      //     reason: 'cancel'
      // });

      if (currentPointerIdRef.current === event.pointerId) {
        handlePointerUp(event);
      }
    },
    [handlePointerUp]
  );

  // Kill touch events to prevent conflicts (tldraw pattern)
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    // console.log('🖊️ TouchStart - killing event');
    (event as any).isKilled = true;
    event.preventDefault();
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    (event as any).isKilled = true;
    event.preventDefault();
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    (event as any).isKilled = true;
    event.preventDefault();
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => {
    const handle: CustomSketchCanvasHandle = {
      eraseMode: (enabled: boolean) => {
        if (isReadOnly) return;
        setIsEraserMode(enabled);
        // Clear preview state when switching modes
        if (!enabled) {
          setStrokesToDelete(new Set());
        }
      },
      undo: () => {
        if (isReadOnly) return;
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const newStrokes = history[newIndex];
          setHistoryIndex(newIndex);
          setStrokes(newStrokes);
          setStrokesToDelete(new Set()); // Clear preview state

          // Trigger OCR update after undo (but don't track as new stroke)
          if (onStroke) {
            const allDrawingStrokes = newStrokes.filter(
              (stroke) => !stroke.isEraser
            );
            const exportData = {
              paths: allDrawingStrokes.map((stroke) => ({
                paths: stroke.points,
              })),
            };
            setTimeout(() => {
              onStroke(exportData, false, undefined, undefined, true); // isHistoryUpdate = true
            }, 0);
          }
        }
      },
      redo: () => {
        if (isReadOnly) return;
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          const newStrokes = history[newIndex];
          setHistoryIndex(newIndex);
          setStrokes(newStrokes);
          setStrokesToDelete(new Set()); // Clear preview state

          // Trigger OCR update after redo (but don't track as new stroke)
          if (onStroke) {
            const allDrawingStrokes = newStrokes.filter(
              (stroke) => !stroke.isEraser
            );
            const exportData = {
              paths: allDrawingStrokes.map((stroke) => ({
                paths: stroke.points,
              })),
            };
            setTimeout(() => {
              onStroke(exportData, false, undefined, undefined, true); // isHistoryUpdate = true
            }, 0);
          }
        }
      },
      clearCanvas: () => {
        if (isReadOnly) return;
        setStrokes([]);
        addToHistory([]);
        setStrokesToDelete(new Set()); // Clear preview state

        // Reset velocity tracker
        velocityTracker.current = {
          prevPoint: { x: 0, y: 0 },
          pointerVelocity: { x: 0, y: 0 },
          prevPressure: 0.7,
        };

        // Trigger OCR update after clear (empty canvas, but don't track as new stroke)
        if (onStroke) {
          const exportData = { paths: [] };
          setTimeout(() => {
            onStroke(exportData, false, undefined, undefined, true); // isHistoryUpdate = true
          }, 0);
        }
      },
      exportPaths: async () => {
        // Format compatible with Mathpix OCR
        const drawingStrokes = strokes.filter((stroke) => !stroke.isEraser);
        // console.log('📤 Exporting paths - Total strokes:', strokes.length, 'Drawing strokes:', drawingStrokes.length);

        return {
          paths: drawingStrokes.map((stroke) => ({
            paths: stroke.points,
          })),
        };
      },
      crossCanvasErase: async (eraserPoints: Point[]) => {
        // console.log('🖍️ Cross-canvas erase called with', eraserPoints.length, 'eraser points');

        // Filter out strokes that intersect with the eraser points
        const newStrokes = strokes.filter(
          (stroke) => !doesEraserIntersectStroke(eraserPoints, stroke)
        );

        if (newStrokes.length !== strokes.length) {
          setStrokes(newStrokes);
          addToHistory(newStrokes);

          // console.log('🖍️ Cross-canvas erase removed', strokes.length - newStrokes.length, 'strokes');

          // Trigger OCR update after cross-canvas erasing (but don't re-trigger cross-canvas logic)
          if (onStroke) {
            const allDrawingStrokes = newStrokes.filter(
              (stroke) => !stroke.isEraser
            );
            const exportData = {
              paths: allDrawingStrokes.map((stroke) => ({
                paths: stroke.points,
              })),
            };
            setTimeout(() => {
              // Pass empty array for eraserPoints to avoid re-triggering cross-canvas logic
              // No erased strokes data for cross-canvas (handled by the originating canvas)
              onStroke(exportData, true, [], undefined);
            }, 0);
          }
        } else {
          // console.log('🖍️ Cross-canvas erase: no strokes affected');
        }
      },
      previewCrossCanvasErase: (eraserPoints: Point[]) => {
        // Update preview of strokes that would be deleted by cross-canvas erasing
        const intersectingStrokeIds = new Set<string>();
        strokes.forEach((stroke) => {
          if (
            !stroke.isEraser &&
            doesEraserIntersectStroke(eraserPoints, stroke)
          ) {
            intersectingStrokeIds.add(stroke.id);
          }
        });
        setStrokesToDelete(intersectingStrokeIds);
      },
      clearErasePreview: () => {
        // Clear the erase preview
        setStrokesToDelete(new Set());
      },
      getStrokeBounds: () => {
        // Calculate bounding box of all drawing strokes
        const drawingStrokes = strokes.filter((stroke) => !stroke.isEraser);

        if (drawingStrokes.length === 0) {
          return null;
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        drawingStrokes.forEach((stroke) => {
          stroke.points.forEach((point) => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
          });
        });

        return {
          left: minX,
          right: maxX,
          top: minY,
          bottom: maxY,
          width: maxX - minX,
          height: maxY - minY,
        };
      },
      importStrokes: (pathsData: any) => {
        // Convert initial paths to internal stroke format and set them
        if (!pathsData || !pathsData.paths || !Array.isArray(pathsData.paths)) {
          return;
        }

        const importedStrokes = pathsData.paths.map(
          (pathData: any, pathIndex: number): Stroke => ({
            id: `imported-stroke-${pathIndex}`,
            points: Array.isArray(pathData.paths) ? pathData.paths : [],
            color: strokeColor,
            width: strokeWidth,
            isEraser: false,
            isApplePencil: false,
            zIndex: pathIndex,
          })
        );

        // Update strokes and history
        setStrokes(importedStrokes);
        setHistory([importedStrokes]);
        setHistoryIndex(0);

        // Trigger OCR update with imported strokes
        if (onStroke && importedStrokes.length > 0) {
          const exportData = {
            paths: importedStrokes.map((stroke: Stroke) => ({
              paths: stroke.points,
            })),
          };
          setTimeout(() => {
            onStroke(exportData, false); // false indicates this is not from erasing
          }, 0);
        }
      },
      addStrokes: (strokesData: any) => {
        // Add erased strokes back to the canvas (for undo functionality)
        if (
          !strokesData ||
          !strokesData.paths ||
          !Array.isArray(strokesData.paths)
        ) {
          return;
        }

        console.log("✅ Adding back erased strokes:", strokesData.paths.length);

        // Convert erased stroke data back to internal stroke format
        const restoredStrokes = strokesData.paths.map(
          (pathData: any): Stroke => ({
            id: pathData.id || `restored-stroke-${Date.now()}-${Math.random()}`,
            points: Array.isArray(pathData.paths) ? pathData.paths : [],
            color: pathData.color || strokeColor,
            width: pathData.width || strokeWidth,
            isEraser: false,
            isApplePencil: false,
            zIndex: pathData.zIndex || globalZIndex.current++,
          })
        );

        // Add the restored strokes to current strokes
        const newStrokes = [...strokes, ...restoredStrokes];
        setStrokes(newStrokes);
        addToHistory(newStrokes);

        console.log(
          "✅ Restored strokes added, total strokes now:",
          newStrokes.length
        );

        // Note: We don't call onStroke here because this is just restoring erased strokes for undo
        // We don't want to trigger stroke tracking or OCR for restored strokes
      },
      // New methods for clean ID-based undo/redo
      removeStrokeById: (strokeId: string) => {
        if (isReadOnly) return;
        console.log("🗑️ Removing stroke by ID:", strokeId);
        const newStrokes = strokes.filter((stroke) => stroke.id !== strokeId);
        setStrokes(newStrokes);
        addToHistory(newStrokes);

        // Note: Don't trigger onStroke here since this is controlled removal
      },
      addStroke: (strokeData: {
        id: string;
        points: { x: number; y: number }[];
        color: string;
        width: number;
        isEraser: boolean;
        isApplePencil?: boolean;
        zIndex: number;
      }) => {
        if (isReadOnly) return;
        console.log("➕ Adding stroke by ID:", strokeData.id);

        // Use functional setState to ensure we work with latest state
        setStrokes((prevStrokes) => {
          // Check for duplicate stroke IDs to prevent phantom strokes
          const existingStroke = prevStrokes.find(
            (stroke) => stroke.id === strokeData.id
          );
          if (existingStroke) {
            console.warn(
              `⚠️ Attempted to add duplicate stroke ID ${strokeData.id}, skipping`
            );
            return prevStrokes; // Return unchanged if duplicate
          }

          const newStroke: Stroke = {
            id: strokeData.id,
            points: strokeData.points,
            color: strokeData.color,
            width: strokeData.width,
            isEraser: strokeData.isEraser,
            isApplePencil: strokeData.isApplePencil || false,
            zIndex: strokeData.zIndex,
          };
          const newStrokes = [...prevStrokes, newStroke];

          // Update history with new strokes
          setTimeout(() => addToHistory(newStrokes), 0);

          return newStrokes;
        });

        // Note: Don't trigger onStroke here since this is controlled addition
      },
      // Batch methods for atomic multi-stroke operations
      addStrokesBatch: (
        strokesData: Array<{
          id: string;
          points: { x: number; y: number }[];
          color: string;
          width: number;
          isEraser: boolean;
          isApplePencil?: boolean;
          zIndex: number;
        }>
      ) => {
        if (isReadOnly) return;
        console.log(
          "📦 Adding multiple strokes by batch:",
          strokesData.map((s) => s.id)
        );

        // Use functional setState for atomic update
        setStrokes((prevStrokes) => {
          // Filter out strokes that already exist to prevent duplicates
          const validStrokes = strokesData.filter((strokeData) => {
            const existingStroke = prevStrokes.find(
              (stroke) => stroke.id === strokeData.id
            );
            if (existingStroke) {
              console.warn(
                `⚠️ Skipping duplicate stroke ID in batch: ${strokeData.id}`
              );
              return false;
            }
            return true;
          });

          if (validStrokes.length === 0) {
            console.log("📦 No valid strokes to add in batch");
            return prevStrokes;
          }

          // Convert to internal stroke format
          const newStrokes = validStrokes.map((strokeData) => ({
            id: strokeData.id,
            points: strokeData.points,
            color: strokeData.color,
            width: strokeData.width,
            isEraser: strokeData.isEraser,
            isApplePencil: strokeData.isApplePencil || false,
            zIndex: strokeData.zIndex,
          }));

          const updatedStrokes = [...prevStrokes, ...newStrokes];
          console.log(
            `📦 Added ${newStrokes.length} strokes in batch. Total: ${updatedStrokes.length}`
          );

          // Update history with new strokes
          setTimeout(() => addToHistory(updatedStrokes), 0);

          return updatedStrokes;
        });
      },
      removeStrokesByIds: (strokeIds: string[]) => {
        if (isReadOnly) return;
        console.log("🗑️ Removing multiple strokes by IDs:", strokeIds);

        // Use functional setState for atomic update
        setStrokes((prevStrokes) => {
          const updatedStrokes = prevStrokes.filter(
            (stroke) => !strokeIds.includes(stroke.id)
          );
          const removedCount = prevStrokes.length - updatedStrokes.length;

          console.log(
            `🗑️ Removed ${removedCount} strokes. Total remaining: ${updatedStrokes.length}`
          );

          // Update history with new strokes
          setTimeout(() => addToHistory(updatedStrokes), 0);

          return updatedStrokes;
        });
      },
      isReadOnly: isReadOnly,
    };
    selfRef.current = handle; // Store self-reference for callbacks
    return handle;
  }, [
    historyIndex,
    history,
    strokes,
    addToHistory,
    onStroke,
    doesEraserIntersectStroke,
    isReadOnly,
  ]);

  // Get eraser preview segments for rendering
  const eraserPreviewSegments = generateEraserPreviewSegments();

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{
        border: "none",
        display: "block",
        touchAction: "none",
        userSelect: "none",
        cursor: isReadOnly ? "default" : "crosshair",
        overflow: "visible", // Allow strokes to render outside bounds
        zIndex: isDrawing ? 9999 : 1, // Higher z-index when actively drawing
        position: "relative",
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Placeholder text for first expression when no strokes exist */}
      {index === 0 &&
        strokes.filter((stroke) => !stroke.isEraser).length === 0 &&
        showPlaceholder && (
          <text
            x="24"
            y="50%"
            dy="0.35em"
            textAnchor="start"
            fill="#9CA3AF"
            fontSize="16"
            fontFamily="'Shantell Sans'"
            fontWeight="500"
            xmlSpace="preserve"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            <style>{`
                            @keyframes placeholderLetterFade { from { opacity: 0; } to { opacity: 1; } }
                        `}</style>
            {Array.from("Write working here").map((char, i) => (
              <tspan
                key={`placeholder-char-${i}`}
                style={{
                  opacity: 0,
                  animation: "placeholderLetterFade 0.6s forwards",
                  animationDelay: `${i * 0.03}s`,
                }}
              >
                {char}
              </tspan>
            ))}
          </text>
        )}

      {/* Render completed strokes sorted by z-index for proper layering */}
      {strokes
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((stroke: Stroke, index: number) => {
          if (isStrokeDot(stroke)) {
            // Render as dot/circle for single clicks
            const point = stroke.points[0];
            return (
              <circle
                key={`${stroke.id}-${index}`}
                cx={point.x}
                cy={point.y}
                r={stroke.width / 2}
                fill={stroke.color}
                opacity={strokesToDelete.has(stroke.id) ? 0.5 : 1}
              />
            );
          } else {
            // Render as path for regular strokes with pressure sensitivity
            const avgPressure = getAveragePressure(stroke.points);
            const pressureSensitiveWidth = stroke.width * avgPressure;
            return (
              <path
                key={`${stroke.id}-${index}`}
                d={generatePressurePath(stroke.points, stroke.width)}
                stroke={stroke.color} // All strokes use #06B0FF now
                strokeWidth={pressureSensitiveWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={strokesToDelete.has(stroke.id) ? 0.5 : 1}
              />
            );
          }
        })}

      {/* Render current stroke being drawn (only for pen mode) */}
      {currentStroke && currentStroke.points.length >= 1 && !isEraserMode && (
        <>
          {isStrokeDot(currentStroke) ? (
            // Render current stroke as dot if it's just a single point or very small
            <circle
              cx={currentStroke.points[0].x}
              cy={currentStroke.points[0].y}
              r={currentStroke.width / 2}
              fill={currentStroke.color}
            />
          ) : (
            // Render current stroke as path for regular drawing with pressure sensitivity
            (() => {
              const avgPressure = getAveragePressure(currentStroke.points);
              const pressureSensitiveWidth = currentStroke.width * avgPressure;
              return (
                <path
                  d={generatePressurePath(
                    currentStroke.points,
                    currentStroke.width
                  )}
                  stroke={currentStroke.color}
                  strokeWidth={pressureSensitiveWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })()
          )}
        </>
      )}

      {/* Render eraser preview with fade and shrinking width */}
      {eraserPreviewSegments.map((segment, index) => (
        <path
          key={`eraser-preview-${index}`}
          d={segment.path}
          stroke="#ECECF1"
          strokeWidth={segment.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={segment.opacity}
        />
      ))}

      {/* Commented out debug info - uncomment if needed for debugging */}
      {/* 
                <text x={10} y={20} fill="black" fontSize="12" style={{ pointerEvents: 'none' }}>
                    Strokes: {strokes.length} | Drawing: {isDrawing ? 'Yes' : 'No'} | Apple Pencil: {strokes.filter(s => s.isApplePencil).length}
                </text>
                */}
    </svg>
  );
});

export default CustomSketchCanvas;
