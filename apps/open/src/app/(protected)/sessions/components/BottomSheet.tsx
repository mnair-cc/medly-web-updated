import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";

interface BottomSheetProps {
  children: ReactNode;
  snapPoints?: (number | string)[]; // [0.2, 0.7, 1.0] or ['280px', 0.7, 1] format
  activeSnapPoint?: number | string;
  setActiveSnapPoint?: (point: number | string) => void;
  open?: boolean;
  minimumHeight?: number; // in pixels, for the lowest snap point
  handleAreaHeight?: number; // height of draggable area when at top
  className?: string;
}

interface DragState {
  isDragging: boolean;
  startY: number;
  startPosition: number;
  lastY: number;
  velocity: number;
  startedOnHandle: boolean;
}

export default function BottomSheet({
  children,
  snapPoints = [0.5, 0.8, 1.0],
  activeSnapPoint = snapPoints[1],
  setActiveSnapPoint,
  open = true,
  minimumHeight = 280,
  handleAreaHeight = 40,
  className = "",
}: BottomSheetProps) {
  // Normalize snap points to numbers for internal calculations
  const normalizedSnapPoints = useMemo(() => {
    const normalized = snapPoints.map((point) => {
      if (typeof point === "string") {
        const pixelValue = parseInt(point.replace("px", ""));
        const viewportHeight =
          typeof window !== "undefined" ? window.innerHeight : 800;
        return pixelValue / viewportHeight;
      }
      return typeof point === "number" ? point : 0.2;
    });
    return normalized.sort((a, b) => a - b);
  }, [snapPoints]);

  // Normalize active snap point
  const normalizedActiveSnapPoint = useMemo(() => {
    if (typeof activeSnapPoint === "string") {
      const pixelValue = parseInt(activeSnapPoint.replace("px", ""));
      const viewportHeight =
        typeof window !== "undefined" ? window.innerHeight : 800;
      return pixelValue / viewportHeight;
    }
    return typeof activeSnapPoint === "number"
      ? activeSnapPoint
      : normalizedSnapPoints[1];
  }, [activeSnapPoint, normalizedSnapPoints]);

  const [currentPosition, setCurrentPosition] = useState(
    normalizedActiveSnapPoint
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startY: 0,
    startPosition: 0,
    lastY: 0,
    velocity: 0,
    startedOnHandle: false,
  });

  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const velocityTracker = useRef<{ y: number; timestamp: number }[]>([]);

  // Check if coordinates are within the handle area
  const isWithinHandleArea = useCallback((clientY: number) => {
    if (!handleRef.current || !drawerRef.current) return false;

    const handleRect = handleRef.current.getBoundingClientRect();
    return clientY >= handleRect.top && clientY <= handleRect.bottom;
  }, []);

  // Convert snap point to pixel position
  const getPixelPosition = useCallback((snapPoint: number) => {
    if (!drawerRef.current || typeof window === "undefined") return 0;
    const viewportHeight = window.innerHeight;
    return viewportHeight * (1 - snapPoint);
  }, []);

  // Find closest snap point based on position and velocity
  const findClosestSnapPoint = useCallback(
    (position: number, velocity: number) => {
      const viewportHeight =
        typeof window !== "undefined" ? window.innerHeight : 800;
      const currentSnapPoint = 1 - position / viewportHeight;
      const velocityThreshold = 300; // pixels per second

      if (Math.abs(velocity) > velocityThreshold) {
        if (velocity > 0) {
          // Moving down - find next lower snap point
          const lowerPoints = normalizedSnapPoints.filter(
            (point) => point < currentSnapPoint
          );
          return lowerPoints.length > 0
            ? Math.max(...lowerPoints)
            : normalizedSnapPoints[0];
        } else {
          // Moving up - find next higher snap point
          const higherPoints = normalizedSnapPoints.filter(
            (point) => point > currentSnapPoint
          );
          return higherPoints.length > 0
            ? Math.min(...higherPoints)
            : normalizedSnapPoints[normalizedSnapPoints.length - 1];
        }
      } else {
        // Low velocity - snap to closest point
        return normalizedSnapPoints.reduce((closest, point) => {
          return Math.abs(point - currentSnapPoint) <
            Math.abs(closest - currentSnapPoint)
            ? point
            : closest;
        });
      }
    },
    [normalizedSnapPoints]
  );

  // Animate to target snap point
  const animateToSnapPoint = useCallback(
    (targetSnapPoint: number) => {
      if (!drawerRef.current) return;

      setIsAnimating(true);
      setCurrentPosition(targetSnapPoint);

      // Update parent state with original snap point format
      if (setActiveSnapPoint) {
        const originalSnapPoint = snapPoints.find(
          (point, index) =>
            Math.abs(normalizedSnapPoints[index] - targetSnapPoint) < 0.001
        );
        if (originalSnapPoint !== undefined) {
          setActiveSnapPoint(originalSnapPoint);
        }
      }

      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    },
    [setActiveSnapPoint, snapPoints, normalizedSnapPoints]
  );

  // Check if we're at the top position
  const isAtTopPosition = useCallback(() => {
    const maxSnapPoint = Math.max(...normalizedSnapPoints);
    return Math.abs(currentPosition - maxSnapPoint) < 0.05;
  }, [currentPosition, normalizedSnapPoints]);

  // Check if content is at the very top (scrollTop === 0)
  const isContentAtTop = useCallback(() => {
    return (contentRef.current?.scrollTop || 0) === 0;
  }, []);

  // Determine if we should drag the drawer vs let content scroll
  const shouldDragDrawer = useCallback(
    (clientY: number) => {
      if (dragState.startedOnHandle) {
        return true; // Always allow dragging if initiated from the handle
      }

      if (!isAtTopPosition()) {
        // Not at top position - always drag drawer
        return true;
      }

      // At top position - check content scroll state and drag direction
      const deltaY = clientY - dragState.startY;
      const isDraggingDown = deltaY > 0;

      if (isDraggingDown && !isContentAtTop()) {
        // Dragging down but content can still scroll up - let content scroll
        return false;
      }

      // Either dragging up, or dragging down with content at top - drag drawer
      return true;
    },
    [
      isAtTopPosition,
      isContentAtTop,
      dragState.startY,
      dragState.startedOnHandle,
    ]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (clientY: number, startedOnHandle: boolean = false) => {
      if (!open) return false;

      const now = Date.now();
      setDragState({
        isDragging: true,
        startY: clientY,
        startPosition: currentPosition,
        lastY: clientY,
        velocity: 0,
        startedOnHandle,
      });

      velocityTracker.current = [{ y: clientY, timestamp: now }];
      return true;
    },
    [open, currentPosition]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!dragState.isDragging) return false;

      const now = Date.now();

      // Update velocity tracker
      velocityTracker.current.push({ y: clientY, timestamp: now });
      velocityTracker.current = velocityTracker.current.filter(
        (point) => now - point.timestamp <= 100
      );

      // Calculate velocity
      let velocity = 0;
      if (velocityTracker.current.length >= 2) {
        const recent =
          velocityTracker.current[velocityTracker.current.length - 1];
        const previous = velocityTracker.current[0];
        const timeDiff = recent.timestamp - previous.timestamp;
        if (timeDiff > 0) {
          velocity = ((recent.y - previous.y) / timeDiff) * 1000; // pixels per second
        }
      }

      // Check if we should drag the drawer
      if (!shouldDragDrawer(clientY)) {
        // Let content scroll - update drag state but don't move drawer
        setDragState((prev) => ({
          ...prev,
          lastY: clientY,
          velocity,
        }));
        return false;
      }

      // Drag the drawer
      const deltaY = clientY - dragState.startY;
      const viewportHeight =
        typeof window !== "undefined" ? window.innerHeight : 800;
      const targetPosition = dragState.startPosition - deltaY / viewportHeight;

      const minSnapPoint = Math.min(...normalizedSnapPoints);
      const maxSnapPoint = Math.max(...normalizedSnapPoints);

      let newPosition = targetPosition;

      // Apply rubber band effect
      if (targetPosition < minSnapPoint) {
        const overscroll = minSnapPoint - targetPosition;
        newPosition = minSnapPoint - overscroll * 0.3;
      } else if (targetPosition > maxSnapPoint) {
        const overscroll = targetPosition - maxSnapPoint;
        newPosition = maxSnapPoint + overscroll * 0.3;
      }

      setCurrentPosition(newPosition);
      setDragState((prev) => ({
        ...prev,
        lastY: clientY,
        velocity,
      }));

      return true;
    },
    [dragState, shouldDragDrawer, normalizedSnapPoints]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging) return;

    const targetSnapPoint = findClosestSnapPoint(
      getPixelPosition(currentPosition),
      dragState.velocity
    );

    animateToSnapPoint(targetSnapPoint);
    setDragState((prev) => ({
      ...prev,
      isDragging: false,
      startedOnHandle: false,
    }));
  }, [
    dragState,
    currentPosition,
    findClosestSnapPoint,
    getPixelPosition,
    animateToSnapPoint,
  ]);

  // Check if touch target is a form element or draggable element
  const isFormElement = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;
    const tagName = target.tagName.toLowerCase();
    return (
      ["input", "textarea", "select", "button"].includes(tagName) ||
      target.getAttribute("contenteditable") === "true" ||
      target.closest(
        'input, textarea, select, button, [contenteditable="true"]'
      ) !== null ||
      target.getAttribute("data-draggable") === "true" ||
      target.closest('[data-draggable="true"]') !== null
    );
  }, []);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;

      // Don't interfere with form elements
      if (isFormElement(e.target)) {
        return;
      }

      const touch = e.touches[0];
      const startedOnHandle = isWithinHandleArea(touch.clientY);
      const started = handleDragStart(touch.clientY, startedOnHandle);
      if (started) {
        e.preventDefault();
      }
    },
    [handleDragStart, isWithinHandleArea, isFormElement]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const isDraggingDrawer = handleDragMove(e.touches[0].clientY);
      if (isDraggingDrawer) {
        e.preventDefault();
      }
    },
    [handleDragMove]
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't interfere with form elements
      if (isFormElement(e.target)) {
        return;
      }

      const startedOnHandle = isWithinHandleArea(e.clientY);
      const started = handleDragStart(e.clientY, startedOnHandle);
      if (started) {
        e.preventDefault();
      }
    },
    [handleDragStart, isWithinHandleArea, isFormElement]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const isDraggingDrawer = handleDragMove(e.clientY);
      if (isDraggingDrawer) {
        e.preventDefault();
      }
    },
    [handleDragMove]
  );

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Global mouse event listeners when dragging
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  // Update position when activeSnapPoint changes externally
  useEffect(() => {
    if (
      !dragState.isDragging &&
      normalizedActiveSnapPoint !== currentPosition
    ) {
      animateToSnapPoint(normalizedActiveSnapPoint);
    }
  }, [
    normalizedActiveSnapPoint,
    currentPosition,
    dragState.isDragging,
    animateToSnapPoint,
  ]);

  // Calculate styles
  const pixelPosition = getPixelPosition(currentPosition);
  const isAtTop = currentPosition >= Math.max(...normalizedSnapPoints) * 0.95;

  if (!open) {
    return null;
  }

  return (
    <div
      ref={drawerRef}
      className={`fixed inset-x-0 bottom-0 z-[100] flex flex-col bg-white border border-gray-200 border-b-none rounded-t-[24px] shadow-[0_15px_15px_15px_rgba(0,0,0,0.15)] md:hidden ${className}`}
      style={{
        transform: `translateY(${pixelPosition}px)`,
        height: "100vh",
        maxHeight: "92%",
        transition: isAnimating
          ? "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)"
          : "none",
        willChange: "transform",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {/* Handle */}
      <div
        ref={handleRef}
        className="flex-shrink-0 pt-4 pb-4 flex justify-center"
        style={{ height: handleAreaHeight }}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
      </div>
      {/* Content */}
      <div
        ref={contentRef}
        className={`flex-1 overflow-hidden ${isAtTop ? "overflow-y-auto" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
