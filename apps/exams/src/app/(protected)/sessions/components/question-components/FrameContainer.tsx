import { useState, useEffect, useRef } from "react";
import DesmosStep from "../question-breakdown/steps/DesmosStep";
import InsertPage from "../page-types/InsertPage";

export default function FrameContainer({
  type,
  group,
  highlightedText,
  triggerCenter,
  triggerHide,
  onClose,
  onDesmosExpressionsChange,
  showMedlyLayer,
  onPressCheckDesmos,
  isAwaitingResponse = false,
  hideScientificCalculator = false,
  isPracticeMode = false,
  insertText,
}: {
  type: string;
  group: any;
  highlightedText: any;
  triggerCenter: boolean;
  triggerHide: boolean;
  onClose?: () => void;
  onDesmosExpressionsChange?: (expressions: any[]) => void;
  showMedlyLayer?: boolean;
  onPressCheckDesmos?: () => void;
  isAwaitingResponse?: boolean;
  hideScientificCalculator?: boolean;
  isPracticeMode?: boolean;
  insertText?: string;
}) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(0); // Start with 0 opacity (hidden)
  const [isVisible, setIsVisible] = useState(true);

  // State for calculator type (only used when type is "calculator")
  const [calculatorType, setCalculatorType] = useState<"graph" | "scientific">(
    "graph"
  );

  // State for dragging functionality
  const [position, setPosition] = useState({ x: 0, y: 100 }); // Start below viewport
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [lastTimestamp, setLastTimestamp] = useState(0);
  const animationRef = useRef<number | null>(null);
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });
  // Track previous hidden state to detect changes
  const prevHiddenRef = useRef(true); // Start as true (hidden by default)
  // Ref to track if we've already logged the beyond 50% threshold
  const beyondThresholdRef = useRef(false);

  // Effect to handle triggerCenter prop
  useEffect(() => {
    if (triggerCenter && windowSize.width > 0) {
      // Cancel any ongoing animation
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Calculate target position - different for reference sheet vs calculator
      let targetX: number;
      if (type === "reference") {
        // Position reference sheet on the right side - 40px from right edge
        targetX = windowSize.width - 800 - 40;
      } else {
        // Position calculator on the left side - 40px from left edge (shifted by -80 for positioning)
        targetX = -80;
      }
      const targetY = windowSize.height / 2 - 380;

      // If element was previously hidden, animate from bottom
      if (prevHiddenRef.current) {
        const offscreenY = windowSize.height + 800;
        setPosition({ x: targetX, y: offscreenY });
        setOpacity(1);

        // After a brief delay, animate to target position
        setTimeout(() => {
          setPosition({ x: targetX, y: targetY });
          setScale(0.75);
        }, 50);

        prevHiddenRef.current = false;
      } else {
        // Just move it directly with animation
        setPosition({ x: targetX, y: targetY });
        setScale(0.75);
        setOpacity(1);
      }

      setIsVisible(true);
    }
  }, [triggerCenter, windowSize, type]);

  // Effect to handle triggerHide prop
  useEffect(() => {
    if (triggerHide) {
      // Cancel any ongoing animation
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Clear expressions when hiding calculator
      if (type === "calculator" && onDesmosExpressionsChange) {
        onDesmosExpressionsChange([]);
      }

      // Move the element off-screen to the bottom
      let targetX: number;
      if (type === "reference") {
        targetX = windowSize.width - 800 - 40; // Maintain consistent right-side X position
      } else {
        targetX = 40; // Maintain consistent left-side X position for calculator
      }
      const offscreenY = windowSize.height + 800;

      setPosition({ x: targetX, y: offscreenY });
      setOpacity(0);
      setIsVisible(false);
      prevHiddenRef.current = true;
    }
  }, [
    triggerHide,
    windowSize,
    type,
    calculatorType,
    onDesmosExpressionsChange,
  ]);

  // Handle close button click
  const handleClose = () => {
    // Cancel any ongoing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Clear expressions when closing calculator
    if (type === "calculator" && onDesmosExpressionsChange) {
      onDesmosExpressionsChange([]);
    }

    // Move the element off-screen to the bottom
    let targetX: number;
    if (type === "reference") {
      targetX = windowSize.width - 800 - 40; // Maintain consistent right-side X position
    } else {
      targetX = 40; // Maintain consistent left-side X position for calculator
    }
    const offscreenY = windowSize.height + 800;

    setPosition({ x: targetX, y: offscreenY });
    setOpacity(0);
    setIsVisible(false);
    prevHiddenRef.current = true;

    // Call the onClose callback if provided
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    // Set initial position and below screen
    let targetX: number;
    if (type === "reference") {
      // For reference sheet, calculate right-side position once window is available
      targetX = window.innerWidth - 800 - 40;
    } else {
      // For calculator, use left-side position
      targetX = 40;
    }
    const offscreenY = window.innerHeight + 1600; // Start below the screen

    setPosition({ x: targetX, y: offscreenY });

    // Don't automatically show the insert when component mounts
    // Instead, leave it hidden by default
    setOpacity(0);
    setIsVisible(false);
  }, [type]);

  // Initialize window size on mount
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Initial update
    updateWindowSize();

    // Listen for window resize
    window.addEventListener("resize", updateWindowSize);

    // Cleanup
    return () => window.removeEventListener("resize", updateWindowSize);
  }, []);

  // Handle drag operations
  const handleDragStart = (clientX: number, clientY: number) => {
    if (!paperRef.current) return;

    // Cancel any ongoing momentum animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setInitialPosition({ ...position });
    setLastPosition({ ...position });
    setLastTimestamp(Date.now());
    setVelocity({ x: 0, y: 0 });
  };

  const handleDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;

    const newPosition = {
      x: initialPosition.x + deltaX,
      y: initialPosition.y + deltaY,
    };

    // Calculate velocity more simply and accurately
    const now = Date.now();
    const elapsed = now - lastTimestamp;

    if (elapsed > 0 && elapsed < 100) {
      // Ignore large gaps to avoid spikes
      const velocityX = ((newPosition.x - lastPosition.x) / elapsed) * 16; // normalize to 16ms frame
      const velocityY = ((newPosition.y - lastPosition.y) / elapsed) * 16;

      // Simple velocity update without problematic smoothing
      setVelocity({
        x: velocityX,
        y: velocityY,
      });

      setLastTimestamp(now);
      setLastPosition(newPosition);
    }

    setPosition(newPosition);

    // Check distance from center after position update
    checkDistanceFromCenter(newPosition);
  };

  // Function to calculate distance from center as percentage
  const checkDistanceFromCenter = (pos = position) => {
    if (!windowSize.width || !windowSize.height) return;

    // Calculate center of the screen
    const centerX = windowSize.width / 2;
    const centerY = windowSize.height / 2;

    // Get current element position relative to center
    const elementWidth = paperRef.current
      ? paperRef.current.offsetWidth * scale
      : 800 * scale;
    const elementHeight = paperRef.current
      ? paperRef.current.offsetHeight * scale
      : 0;

    // Calculate center of element
    const elementCenterX = pos.x + elementWidth / 2;
    const elementCenterY = pos.y + elementHeight / 2;

    // Calculate distances from center as percentage of max dimension
    const maxDimension = Math.max(windowSize.width, windowSize.height);
    const distanceX = Math.abs(elementCenterX - centerX) / (maxDimension / 2);
    const distanceY = Math.abs(elementCenterY - centerY) / (maxDimension / 2);

    // Overall distance percentage (0-1)
    const distancePercentage = Math.sqrt(
      distanceX * distanceX + distanceY * distanceY
    );

    // Log when crossing the 50% threshold
    if (distancePercentage > 0.5 && !beyondThresholdRef.current) {
      beyondThresholdRef.current = true;
    } else if (distancePercentage <= 0.5 && beyondThresholdRef.current) {
      beyondThresholdRef.current = false;
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);

    // Apply inertia only if there's significant velocity
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (speed > 0.2) {
      // Lower threshold to make momentum more responsive
      applyInertia();
    }
  };

  // Apply inertia/momentum after drag ends
  const applyInertia = () => {
    const friction = 0; // More gradual friction - lose 5% velocity per frame
    let currentVelocity = { ...velocity };

    const animate = () => {
      // Apply friction to slow down gradually
      currentVelocity = {
        x: currentVelocity.x * friction,
        y: currentVelocity.y * friction,
      };

      // Update position based on velocity
      setPosition((prev) => {
        const newPos = {
          x: prev.x + currentVelocity.x,
          y: prev.y + currentVelocity.y,
        };

        // Check distance from center with the new position
        checkDistanceFromCenter(newPos);

        return newPos;
      });

      // Continue animation until velocity becomes negligible
      const speed = Math.sqrt(
        currentVelocity.x * currentVelocity.x +
        currentVelocity.y * currentVelocity.y
      );
      if (speed > 0.05) {
        // Lower threshold for smoother stop
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Effect to check distance when position changes
  useEffect(() => {
    checkDistanceFromCenter();
  }, [position, windowSize]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore mouse down on the close button
    if ((e.target as HTMLElement).closest(".insert-close-button")) {
      return;
    }
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleDrag(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Ignore touch start on the close button
    if ((e.target as HTMLElement).closest(".insert-close-button")) {
      return;
    }
    e.preventDefault();
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    handleDrag(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Calculate rotation based on distance from center
  const getRotation = () => {
    if (!windowSize.width || !windowSize.height) return 0;

    // Calculate center of the screen
    const centerX = windowSize.width / 2;
    const centerY = windowSize.height / 2;

    // Get current element position relative to center
    // We need to account for the paperRef's dimensions to find its center
    const elementWidth = paperRef.current
      ? paperRef.current.offsetWidth * scale
      : 800 * scale;
    const elementHeight = paperRef.current
      ? paperRef.current.offsetHeight * scale
      : 0;

    // Calculate offsets from center of screen to center of element
    const offsetX = position.x + elementWidth / 2 - centerX;
    const offsetY = position.y + elementHeight / 2 - centerY;

    // Calculate normalized distance from center (0 at center, increases as moves away)
    const maxDistance = Math.min(windowSize.width, windowSize.height) / 2;
    const normalizedX = offsetX / maxDistance;
    const normalizedY = offsetY / maxDistance;

    // Calculate angle and distance
    const angle = Math.atan2(normalizedY, normalizedX);
    const distance = Math.min(
      1,
      Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY)
    );

    // Maximum rotation (degrees)
    const maxRotation = 2;

    return maxRotation * distance * Math.sin(angle + Math.PI / 2);
  };

  // Add and remove event listeners based on dragging state
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  // Wrapper function to safely handle expression changes
  const handleExpressionsChange = (expressions: any[]) => {
    if (onDesmosExpressionsChange) {
      onDesmosExpressionsChange(expressions);
    }
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full z-[1005] pointer-events-none overflow-hidden">
      <div
        ref={paperRef}
        className={`pb-14 bg-white w-[800px] h-[100dvh] overflow-hidden absolute top-0 left-0 rounded-[16px] z-[1001] shadow-[0_0_24px_rgba(0,0,0,0.24)] pointer-events-auto select-none`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging
            ? "none"
            : "transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s ease-in-out",
          opacity: opacity,
          userSelect: isDragging ? "none" : "auto",
          visibility: opacity > 0 ? "visible" : "hidden", // Hide element when opacity is 0
        }}
      >
        {/* Top bar */}
        <div
          className="h-14 w-full flex items-center justify-center px-4 cursor-grab active:cursor-grabbing"
          style={{
            backgroundColor: "#FAFAFD",
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {type === "calculator" && !hideScientificCalculator && (
            <div className="absolute left-2 flex items-center justify-center bg-[#F2F2F7] rounded-full px-1 py-1">
              <button
                className={`text-[15px] font-rounded-bold rounded-full px-3 py-1 transition-colors ${calculatorType === "graph"
                  ? "bg-[white] text-black"
                  : "bg-[#F2F2F7] text-gray-600"
                  }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (calculatorType !== "graph") {
                    console.log(
                      "🔄 Switching to graphing calculator, clearing expressions"
                    );
                    if (onDesmosExpressionsChange) {
                      onDesmosExpressionsChange([]);
                    }
                    setCalculatorType("graph");
                  }
                }}
              >
                Graphing
              </button>
              <button
                className={`text-[15px] font-rounded-bold rounded-full px-3 py-1 transition-colors ${calculatorType === "scientific"
                  ? "bg-[white] text-black"
                  : "bg-[#F2F2F7] text-gray-600"
                  }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (calculatorType !== "scientific") {
                    console.log(
                      "🔄 Switching to scientific calculator, clearing expressions"
                    );
                    if (onDesmosExpressionsChange) {
                      onDesmosExpressionsChange([]);
                    }
                    setCalculatorType("scientific");
                  }
                }}
              >
                Scientific
              </button>
            </div>
          )}
          {type === "reference" && (
            <div className="absolute left-5 text-[15px] font-rounded-bold text-black">
              Reference Sheet
            </div>
          )}
          <div className="h-2 w-20 rounded-full bg-[#E6E6E6]" />
          <button className="absolute right-0 w-12 h-12" onClick={handleClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.5 3.5L3.5 12.5M3.5 3.5L12.5 12.5"
                stroke="#1C1C1E"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {type === "calculator" && (
          <>
            {/* Only render the active calculator type */}
            {calculatorType === "graph" ? (
              <DesmosStep
                key="calculator-graph"
                desmos_type="graph"
                onExpressionsChange={handleExpressionsChange}
                showMedlyLayer={showMedlyLayer}
                onPressCheckDesmos={onPressCheckDesmos}
                isAwaitingResponse={isAwaitingResponse}
                isPracticeMode={isPracticeMode}
              />
            ) : (
              <DesmosStep
                key="calculator-scientific"
                desmos_type="scientific"
                onExpressionsChange={handleExpressionsChange}
                showMedlyLayer={showMedlyLayer}
                onPressCheckDesmos={onPressCheckDesmos}
                isAwaitingResponse={isAwaitingResponse}
                isPracticeMode={isPracticeMode}
              />
            )}
          </>
        )}

        {type === "insert" && (
          <div className="w-full h-full p-4 overflow-auto bg-white">
            <InsertPage insertText={insertText || ""} highlightedText={[]} hideLineNumbers={true} />
          </div>
        )}
        {type === "reference" && (
          <div className="w-full h-full p-4 overflow-auto bg-white">
            {/* Only show formula sheet for SAT - file doesn't exist yet */}
            {/* <img
              src="/assets/sat/sat_formula_sheet.svg"
              alt="SAT Formula Sheet"
              className="w-full h-auto"
            /> */}
            <p className="text-gray-500">Reference sheet coming soon</p>
          </div>
        )}


      </div>
      {/* <div className="absolute top-0 left-0 w-full h-full z-[100] pointer-events-none overflow-hidden bg-[#FAF6F0]" /> */}
    </div>
  );
}
