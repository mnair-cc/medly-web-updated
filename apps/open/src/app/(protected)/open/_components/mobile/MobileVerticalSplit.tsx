"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { applyBlackOverlay } from "@/app/_lib/utils/colorUtils";

// Spring config for Dynamic Island-style animation (snappy)
const pillSpringConfig = {
  type: "spring" as const,
  duration: 0.25,
  bounce: 0.1,
};

function AskAnythingPill({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      transition={pillSpringConfig}
      whileTap={{ scale: 0.95 }}
      className="absolute left-1/2 bg-black text-[12px] text-white font-rounded-bold px-4 py-2 rounded-full z-20 flex items-center gap-2 touch-manipulation select-none pointer-events-auto"
      style={{
        WebkitTapHighlightColor: "transparent",
        x: "-50%",
        bottom: "100%",
        marginBottom: 8,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6.91699 13.834C8.31445 13.834 9.62402 13.4121 10.7139 12.6914L14.5635 16.5498C14.8184 16.7959 15.1436 16.9189 15.4951 16.9189C16.2246 16.9189 16.7607 16.3477 16.7607 15.627C16.7607 15.293 16.6465 14.9678 16.4004 14.7217L12.5771 10.8809C13.3682 9.75586 13.834 8.39355 13.834 6.91699C13.834 3.11133 10.7227 0 6.91699 0C3.12012 0 0 3.11133 0 6.91699C0 10.7227 3.11133 13.834 6.91699 13.834ZM6.91699 11.9883C4.13086 11.9883 1.8457 9.70312 1.8457 6.91699C1.8457 4.13086 4.13086 1.8457 6.91699 1.8457C9.70312 1.8457 11.9883 4.13086 11.9883 6.91699C11.9883 9.70312 9.70312 11.9883 6.91699 11.9883Z"
          fill="#FFFFFF"
        />
      </svg>
      Ask Medly
    </motion.button>
  );
}

interface MobileVerticalSplitProps {
  topContent: ReactNode;
  bottomContent: ReactNode;
  snapPoints?: number[]; // [0, 0.21, 0.5, 1] - represents bottom panel height as percentage
  activeSnapPoint?: number;
  onSnapPointChange?: (point: number) => void;
  handleHeight?: number;
  fullScreenBottom?: boolean; // When true, bottom content fills entire screen (no split, no handle)
  onAskAnythingClick?: () => void; // Called when "Ask anything" pill is tapped (at snap point 0)
  primaryColor?: string; // Module primary color for status bar when at snap point 1
}

interface DragState {
  isDragging: boolean;
  startY: number;
  startPosition: number;
  lastY: number;
  velocity: number;
}

/**
 * MobileVerticalSplit - A draggable vertical split between two content areas
 *
 * The snapPoints represent the bottom panel height as a percentage of the container.
 * - 0 = bottom panel hidden (full top panel view with "Ask anything" pill)
 * - 0.21 = bottom panel takes 21% (minimized chat with input bar visible)
 * - 0.5 = bottom panel takes 50% (split view)
 * - 1 = bottom panel takes 100% (full chat)
 */
export default function MobileVerticalSplit({
  topContent,
  bottomContent,
  snapPoints = [0, 0.21, 0.5, 1],
  activeSnapPoint,
  onSnapPointChange,
  handleHeight = 24,
  fullScreenBottom = false,
  onAskAnythingClick,
  primaryColor,
}: MobileVerticalSplitProps) {
  const sortedSnapPoints = useMemo(
    () => [...snapPoints].sort((a, b) => a - b),
    [snapPoints]
  );

  const initialSnapPoint = activeSnapPoint ?? sortedSnapPoints[0];
  const [currentPosition, setCurrentPosition] = useState(initialSnapPoint);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startY: 0,
    startPosition: 0,
    lastY: 0,
    velocity: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const velocityTracker = useRef<{ y: number; timestamp: number }[]>([]);

  // Find closest snap point based on position and velocity
  const findClosestSnapPoint = useCallback(
    (position: number, velocity: number) => {
      const velocityThreshold = 300; // pixels per second

      if (Math.abs(velocity) > velocityThreshold) {
        if (velocity > 0) {
          // Dragging down - decrease bottom panel height (find lower snap point)
          const lowerPoints = sortedSnapPoints.filter((point) => point < position);
          return lowerPoints.length > 0
            ? Math.max(...lowerPoints)
            : sortedSnapPoints[0];
        } else {
          // Dragging up - increase bottom panel height (find higher snap point)
          const higherPoints = sortedSnapPoints.filter((point) => point > position);
          return higherPoints.length > 0
            ? Math.min(...higherPoints)
            : sortedSnapPoints[sortedSnapPoints.length - 1];
        }
      } else {
        // Low velocity - snap to closest point
        return sortedSnapPoints.reduce((closest, point) => {
          return Math.abs(point - position) < Math.abs(closest - position)
            ? point
            : closest;
        });
      }
    },
    [sortedSnapPoints]
  );

  // Animate to target snap point
  const animateToSnapPoint = useCallback(
    (targetSnapPoint: number) => {
      setIsAnimating(true);
      setCurrentPosition(targetSnapPoint);

      if (onSnapPointChange) {
        onSnapPointChange(targetSnapPoint);
      }

      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    },
    [onSnapPointChange]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (clientY: number) => {
      const now = Date.now();
      setDragState({
        isDragging: true,
        startY: clientY,
        startPosition: currentPosition,
        lastY: clientY,
        velocity: 0,
      });

      velocityTracker.current = [{ y: clientY, timestamp: now }];
      return true;
    },
    [currentPosition]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!dragState.isDragging || !containerRef.current) return false;

      const now = Date.now();
      const containerHeight = containerRef.current.getBoundingClientRect().height;

      // Update velocity tracker
      velocityTracker.current.push({ y: clientY, timestamp: now });
      velocityTracker.current = velocityTracker.current.filter(
        (point) => now - point.timestamp <= 100
      );

      // Calculate velocity
      let velocity = 0;
      if (velocityTracker.current.length >= 2) {
        const recent = velocityTracker.current[velocityTracker.current.length - 1];
        const previous = velocityTracker.current[0];
        const timeDiff = recent.timestamp - previous.timestamp;
        if (timeDiff > 0) {
          velocity = ((recent.y - previous.y) / timeDiff) * 1000;
        }
      }

      // Calculate new position
      const deltaY = clientY - dragState.startY;
      // Dragging down (positive deltaY) should decrease bottom panel height
      const deltaPercent = -deltaY / containerHeight;
      let newPosition = dragState.startPosition + deltaPercent;

      const minSnapPoint = Math.min(...sortedSnapPoints);
      const maxSnapPoint = Math.max(...sortedSnapPoints);

      // Apply rubber band effect
      if (newPosition < minSnapPoint) {
        const overscroll = minSnapPoint - newPosition;
        newPosition = minSnapPoint - overscroll * 0.3;
      } else if (newPosition > maxSnapPoint) {
        const overscroll = newPosition - maxSnapPoint;
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
    [dragState, sortedSnapPoints]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging) return;

    const targetSnapPoint = findClosestSnapPoint(currentPosition, dragState.velocity);
    animateToSnapPoint(targetSnapPoint);
    setDragState((prev) => ({
      ...prev,
      isDragging: false,
    }));
  }, [dragState, currentPosition, findClosestSnapPoint, animateToSnapPoint]);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      handleDragStart(touch.clientY);
      e.preventDefault();
    },
    [handleDragStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const isDragging = handleDragMove(e.touches[0].clientY);
      if (isDragging) {
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
      handleDragStart(e.clientY);
      e.preventDefault();
    },
    [handleDragStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleDragMove(e.clientY);
    },
    [handleDragMove]
  );

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Global mouse and touch event listeners when dragging
  useEffect(() => {
    if (dragState.isDragging) {
      // Prevent iOS Safari pull-to-refresh and page scroll during drag
      const preventScroll = (e: TouchEvent) => {
        e.preventDefault();
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Must use { passive: false } to allow preventDefault on touchmove
      document.addEventListener("touchmove", preventScroll, { passive: false });
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ns-resize";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", preventScroll);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  // Update position when activeSnapPoint changes externally
  useEffect(() => {
    if (activeSnapPoint !== undefined && !dragState.isDragging && activeSnapPoint !== currentPosition) {
      animateToSnapPoint(activeSnapPoint);
    }
  }, [activeSnapPoint, currentPosition, dragState.isDragging, animateToSnapPoint]);

  // Calculate heights
  const bottomHeightPercent = Math.max(0, Math.min(1, currentPosition)) * 100;
  const topHeightPercent = 100 - bottomHeightPercent;

  // Check if we're at or near snap point 0 (full top panel view)
  const isAtTopFullScreen = currentPosition <= 0.05;

  // Check if we're at or near snap point 1 (full bottom panel view)
  const isAtBottomFullScreen = currentPosition >= 0.95;

  // Calculate status bar background color - use primary color with 10% black overlay when at snap point 1
  const statusBarBgColor = useMemo(() => {
    if (primaryColor) {
      return applyBlackOverlay(primaryColor);
    }
    return "rgba(0, 0, 0, 0.05)";
  }, [isAtBottomFullScreen, primaryColor]);

  // Full-screen mode: bottom content fills entire screen without split or handle
  if (fullScreenBottom) {
    return (
      <div className="h-full w-full overflow-hidden">
        {bottomContent}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col overflow-hidden overscroll-none"
      style={{ backgroundColor: statusBarBgColor }}
    >
      {/* Top content area */}
      <div
        className="overflow-hidden rounded-b-[32px]"
        style={{
          height: `calc(${topHeightPercent}% - ${handleHeight / 2}px)`,
          transition: isAnimating ? "height 0.3s cubic-bezier(0.32, 0.72, 0, 1)" : "none",
        }}
      >
        {topContent}
      </div>

      {/* Drag handle with extended touch area */}
      <div
        ref={handleRef}
        className="flex-shrink-0 flex items-center justify-center bg-transparent cursor-ns-resize touch-none relative z-10"
        style={{ height: handleHeight }}
      >
        {/* Extended touch safe area */}
        <div
          className="absolute inset-x-0 z-10"
          style={{ top: -20, bottom: -20 }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        />
        <div className="w-12 h-1 bg-white rounded-full pointer-events-none" />

        {/* "Ask anything" pill - positioned above the drag handle */}
        <AnimatePresence>
          {isAtTopFullScreen && onAskAnythingClick && (
            <AskAnythingPill onClick={onAskAnythingClick} />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom content area */}
      <div
        className="overflow-hidden rounded-t-[32px]"
        style={{
          height: `calc(${bottomHeightPercent}% - ${handleHeight / 2}px)`,
          transition: isAnimating ? "height 0.3s cubic-bezier(0.32, 0.72, 0, 1)" : "none",
        }}
      >
        {bottomContent}
      </div>
    </div>
  );
}
