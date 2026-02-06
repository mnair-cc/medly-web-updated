import { Topic } from "@/app/(protected)/mocks/_types/types";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useResponsive } from "@/app/_hooks/useResponsive";

const StrongestTopicsSlide = ({
  strongestTopics = [],
  onMountainsAppear,
  onAnimationStart,
}: {
  strongestTopics?: Topic[];
  onMountainsAppear?: () => void;
  onAnimationStart?: (duration?: number) => void;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const { isBelowSm } = useResponsive();
  const isMobile = isBelowSm;

  // Magnifying glass position state
  const [position, setPosition] = useState({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  });
  const targetPosition = useRef({ x: position.x, y: position.y });
  const animationFrameId = useRef<number>();
  const introTimerRef = useRef<NodeJS.Timeout>();
  const animationStartedRef = useRef(false);

  // Function to skip intro and show mountains
  const skipToMountains = () => {
    if (!showIntro) return;
    if (introTimerRef.current) {
      clearTimeout(introTimerRef.current);
    }
    setShowIntro(false);
    // Delay the callback until after all peaks animate in
    setTimeout(() => {
      onMountainsAppear?.();
    }, 2500);
  };

  // Start progress animation immediately (covers intro + mountains animation)
  useEffect(() => {
    if (!animationStartedRef.current) {
      animationStartedRef.current = true;
      onAnimationStart?.(4500); // 2s intro + 2.5s mountains
    }
  }, []); // Only run once on mount

  // Transition from intro to peaks after 2 seconds
  useEffect(() => {
    introTimerRef.current = setTimeout(() => {
      setShowIntro(false);
      // Delay the callback until after all peaks animate in
      // Third peak: delay 1.3s + duration 0.8s = 2.1s, adding buffer
      setTimeout(() => {
        onMountainsAppear?.();
      }, 2500);
    }, 2000);
    return () => {
      if (introTimerRef.current) {
        clearTimeout(introTimerRef.current);
      }
    };
  }, [onMountainsAppear]);

  // Magnifying glass mouse tracking
  useEffect(() => {
    if (!showIntro) return;

    const edgePadding = 100;
    const bottomPadding = 100;
    const smoothing = 0.12;

    const handleMouseMove = (e: MouseEvent): void => {
      const isWithinBounds =
        e.clientX >= edgePadding &&
        e.clientX <= window.innerWidth - edgePadding &&
        e.clientY >= edgePadding &&
        e.clientY <= window.innerHeight - bottomPadding;

      if (isWithinBounds) {
        targetPosition.current = { x: e.clientX, y: e.clientY };
      }
    };

    const animate = () => {
      setPosition((prev) => ({
        x: prev.x + (targetPosition.current.x - prev.x) * smoothing,
        y: prev.y + (targetPosition.current.y - prev.y) * smoothing,
      }));
      animationFrameId.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [showIntro]);

  // Sort topics by marksPercentage in descending order
  const sortedStrongestTopics = [...strongestTopics].sort(
    (a, b) => b.marksPercentage - a.marksPercentage
  );

  // Reorder to achieve 2-1-3 pattern (second highest, highest, third highest)
  const reorderedStrongestTopics =
    sortedStrongestTopics.length >= 3
      ? [
          sortedStrongestTopics[1], // Second highest score
          sortedStrongestTopics[0], // Highest score
          sortedStrongestTopics[2], // Third highest score
        ]
      : sortedStrongestTopics;

  // Find the maximum marksPercentage to use as baseline (100% height)
  const maxScore = Math.max(
    ...reorderedStrongestTopics.map((topic) => topic.marksPercentage)
  );

  return (
    <div className="w-screen flex flex-col justify-center flex-1">
      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.div
            key="intro"
            className="flex flex-col items-center justify-center text-center px-8 -mt-48 cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={skipToMountains}
          >
            <motion.h1
              className="text-5xl font-rounded-bold leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Let&apos;s take a closer
            </motion.h1>
            <motion.h1
              className="text-5xl font-rounded-bold leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              look at your performance
            </motion.h1>
            {/* Magnifying glass */}
            <img
              src="/assets/magnifying_glass_emoji.png"
              alt="Magnifying glass"
              className="fixed z-50 w-auto h-auto cursor-pointer"
              style={{
                left: position.x,
                top: position.y,
                transform: "translate(-50%, -50%)",
              }}
              onClick={skipToMountains}
            />
          </motion.div>
        ) : (
          <motion.div
            key="peaks"
            className="w-full flex flex-col justify-center flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative flex flex-col justify-around items-center">
              <div
                className={`absolute transition-all duration-200 mb-0 ${
                  hoveredIndex === null
                    ? "opacity-100"
                    : "opacity-0 -translate-y-4"
                }`}
              >
                <motion.h1
                  className="text-4xl font-rounded-bold mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  Your strongest topics were...
                </motion.h1>
                <motion.p
                  className="text-white/50 mt-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  Hover over a peak
                </motion.p>
              </div>
              <AnimatePresence mode="wait">
                {hoveredIndex !== null && (
                  <motion.div
                    key={hoveredIndex}
                    className="absolute mt-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                  >
                    <h1 className="text-4xl font-rounded-bold mb-4">
                      {reorderedStrongestTopics[hoveredIndex].title}
                    </h1>
                    <p className="text-9xl font-rounded-bold text-white">
                      {Math.round(
                        reorderedStrongestTopics[hoveredIndex].marksPercentage
                      )}
                      %
                    </p>
                    <p className="text-white/50 mt-2">Marks achieved</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex-1">
              <div className="absolute bottom-0 left-0 right-0 flex flex-col w-full h-[60%] justify-center items-center p-0 sm:p-4">
                <div className="w-full h-full mt-auto overflow-hidden sm:rounded-2xl">
                  <div className="relative w-full h-[80%]">
                    {reorderedStrongestTopics.map((topic, index) => {
                      const scoreAsAPercentageOfMaxScore =
                        (topic.marksPercentage / maxScore) * 100;
                      const distanceFromTop =
                        100 - scoreAsAPercentageOfMaxScore;

                      // Mobile: centered and visible, Desktop: spread out
                      const left = isMobile
                        ? index === 0
                          ? "-15%"
                          : index === 1
                            ? "15%"
                            : "45%"
                        : index === 0
                          ? "-10%"
                          : index === 1
                            ? "22.5%"
                            : "55%";

                      return (
                        <motion.div
                          key={topic.title}
                          className="absolute"
                          style={{
                            left,
                            aspectRatio: 1 / 1,
                            height: isMobile ? "80%" : "200%",
                            pointerEvents: "none",
                          }}
                          variants={{
                            initial: {
                              top: "120%",
                            },
                            animate: {
                              // Mobile: push peaks lower, Desktop: original positioning
                              top: isMobile
                                ? `${distanceFromTop + 50}%`
                                : `${distanceFromTop - (index === 0 || index === 2 ? 10 : 0)}%`,
                              transition: {
                                duration: 0.8,
                                delay: 0.5 + index * 0.4,
                                ease: [0.4, 0, 0.2, 1],
                              },
                            },
                            exit: {
                              opacity: 0,
                              transition: {
                                duration: 0.4,
                                delay: 0,
                                ease: [0.4, 0, 0.2, 1],
                              },
                            },
                          }}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                        >
                          <div
                            className={`bg-[#F7CAFF]/80 hover:bg-[#F7CAFF] transition-all duration-500 rounded-[40px] sm:rounded-[100px] w-full h-full ${
                              hoveredIndex !== null && hoveredIndex !== index
                                ? "opacity-15"
                                : ""
                            }`}
                            style={{
                              transformOrigin: "top left",
                              pointerEvents:
                                hoveredIndex === null || hoveredIndex === index
                                  ? "auto"
                                  : "none",
                              transform:
                                "rotate(45deg) translateX(50%) translateY(-30%)",
                            }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          ></div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StrongestTopicsSlide;
