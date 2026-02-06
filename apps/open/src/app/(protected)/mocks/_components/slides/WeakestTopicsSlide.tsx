import { Topic } from "@/app/(protected)/mocks/_types/types";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useResponsive } from "@/app/_hooks/useResponsive";

const WeakestTopicsSlide = ({
  weakestTopics = [],
  strongestTopics = [],
  onPeaksAppear,
  onAnimationStart,
}: {
  weakestTopics?: Topic[];
  strongestTopics?: Topic[];
  onPeaksAppear?: () => void;
  onAnimationStart?: (duration?: number) => void;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const { isBelowSm } = useResponsive();
  const isMobile = isBelowSm;
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
      onPeaksAppear?.();
    }, 2500);
  };

  // Start progress animation immediately (covers intro + peaks animation)
  useEffect(() => {
    if (!animationStartedRef.current) {
      animationStartedRef.current = true;
      onAnimationStart?.(4500); // 1s intro + 3.5s peaks (with buffer)
    }
  }, []); // Only run once on mount

  // Transition from intro to peaks after 1 second
  useEffect(() => {
    introTimerRef.current = setTimeout(() => {
      setShowIntro(false);
      // Delay the callback until after all peaks animate in
      // Third peak: delay 1.3s + duration 0.8s = 2.1s, adding buffer
      setTimeout(() => {
        onPeaksAppear?.();
      }, 2500);
    }, 1000);
    return () => {
      if (introTimerRef.current) {
        clearTimeout(introTimerRef.current);
      }
    };
  }, [onPeaksAppear]);

  // Filter out topics where subjectId contains 'Eng'
  const filteredWeakestTopics = weakestTopics.filter(
    (topic) => !topic.subjectId?.includes("Eng")
  );

  // Sort topics by marksLost (weakest) and marksPercentage (strongest) in descending order
  const sortedWeakestTopics = [...filteredWeakestTopics].sort(
    (a, b) => b.marksLost - a.marksLost
  );
  const sortedStrongestTopics = [...strongestTopics].sort(
    (a, b) => b.marksPercentage - a.marksPercentage
  );

  // Reorder to achieve 2-1-3 pattern (second highest, highest, third highest)
  const reorderedWeakestTopics =
    sortedWeakestTopics.length >= 3
      ? [
          sortedWeakestTopics[1], // Second highest score
          sortedWeakestTopics[0], // Highest score
          sortedWeakestTopics[2], // Third highest score
        ]
      : sortedWeakestTopics;

  const reorderedStrongestTopics =
    sortedStrongestTopics.length >= 3
      ? [
          sortedStrongestTopics[1], // Second highest score
          sortedStrongestTopics[0], // Highest score
          sortedStrongestTopics[2], // Third highest score
        ]
      : sortedStrongestTopics;

  // Find the maximum marksPercentage to use as baseline (100% height) for strongest topics
  const maxScore = Math.max(
    ...reorderedStrongestTopics.map((topic) => topic.marksPercentage)
  );

  // Find the maximum marksLost to use as baseline (100% height) for weakest topics
  const maxMarksLost = Math.max(
    ...reorderedWeakestTopics.map((topic) => topic.marksLost)
  );

  return (
    <div className="w-screen flex flex-col justify-center flex-1">
      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.div
            key="intro"
            className="flex flex-col items-center justify-center text-center px-8 -mt-32 cursor-pointer"
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
              Let&apos;s see where
            </motion.h1>
            <motion.h1
              className="text-5xl font-rounded-bold leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              you can improve...
            </motion.h1>
            {/* Chart emoji */}
            <motion.div
              className="relative mt-8"
              initial={{ scale: 0, rotate: -10 }}
              animate={{
                scale: 1,
                rotate: 4,
                transition: {
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: 0.5,
                  duration: 0.6,
                },
              }}
            >
              <Image
                src="/chart-emoji.png"
                alt="Chart showing increase"
                width={240}
                height={240}
              />
            </motion.div>
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
                  variants={{
                    initial: { opacity: 0, y: 20 },
                    animate: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.6, delay: 0.2 },
                    },
                    exit: {
                      opacity: 0,
                      y: -20,
                      transition: { duration: 0.6 },
                    },
                  }}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  You lost the most marks in
                </motion.h1>
                <motion.p
                  className="text-white/50 mt-4"
                  variants={{
                    initial: { opacity: 0, y: 20 },
                    animate: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.6, delay: 0.4 },
                    },
                    exit: {
                      opacity: 0,
                      y: -20,
                      transition: { duration: 0.6 },
                    },
                  }}
                  initial="initial"
                  animate="animate"
                  exit="exit"
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
                      {reorderedWeakestTopics[hoveredIndex].title}
                    </h1>
                    <p className="text-9xl font-rounded-bold text-white">
                      {Math.round(
                        reorderedWeakestTopics[hoveredIndex].marksLost
                      )}
                    </p>
                    <p className="text-white/50 mt-2">Marks lost</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex-1">
              <div className="absolute bottom-0 left-0 right-0 flex flex-col w-full h-[60%] justify-center items-center p-0 sm:p-4">
                <div className="relative w-full h-full mt-auto overflow-hidden sm:rounded-2xl">
                  <div className="relative w-full h-[80%]">
                    {/* Background strongest topics */}
                    {reorderedStrongestTopics.map((topic, index) => {
                      const scoreAsAPercentageOfMaxScore =
                        (topic.marksPercentage / maxScore) * 100;
                      const distanceFromTop =
                        100 - scoreAsAPercentageOfMaxScore;

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
                        <div
                          key={topic.title}
                          className="absolute"
                          style={{
                            left,
                            aspectRatio: 1 / 1,
                            height: isMobile ? "80%" : "200%",
                            top: isMobile
                              ? `${distanceFromTop + 40}%`
                              : `${distanceFromTop}%`,
                            pointerEvents: "none",
                            opacity: 0.15,
                          }}
                        >
                          <div
                            className="bg-[#F7CAFF] transition-all duration-500 rounded-[40px] sm:rounded-[100px] w-full h-full rotate-45 translate-x-[50%]"
                            style={{
                              transformOrigin: "top left",
                              pointerEvents:
                                hoveredIndex === null || hoveredIndex === index
                                  ? "auto"
                                  : "none",
                            }}
                          ></div>
                        </div>
                      );
                    })}

                    {/* Foreground weakest topics */}
                    {reorderedWeakestTopics.map((topic, index) => {
                      const scoreAsAPercentageOfMaxScore =
                        (topic.marksLost / maxMarksLost) * 100;
                      const distanceFromTop =
                        100 - scoreAsAPercentageOfMaxScore;

                      const left = isMobile
                        ? index === 0
                          ? "-15%"
                          : index === 1
                            ? "15%"
                            : "45%"
                        : index === 0
                          ? "-25%"
                          : index === 1
                            ? "10%"
                            : "40%";

                      return (
                        <motion.div
                          key={topic.title}
                          className="absolute"
                          style={{
                            left,
                            aspectRatio: isMobile ? 1 / 1 : 2.5 / 1,
                            height: isMobile ? "80%" : "150%",
                            pointerEvents: "none",
                          }}
                          variants={{
                            initial: {
                              y: "100%",
                            },
                            animate: {
                              // Mobile: push peaks higher, Desktop: original positioning
                              y: isMobile
                                ? `${distanceFromTop + 40}%`
                                : `${distanceFromTop / 2 - 20 - (index === 0 || index === 2 ? 10 : 0)}%`,
                              transition: {
                                duration: 0.8,
                                delay: 0.5 + index * 0.4,
                                ease: [0.4, 0, 0.2, 1],
                              },
                            },
                            exit: {
                              y: "120%",
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
                                ? "opacity-30"
                                : ""
                            }`}
                            style={{
                              transformOrigin: "top left",
                              pointerEvents:
                                hoveredIndex === null || hoveredIndex === index
                                  ? "auto"
                                  : "none",
                              transform:
                                "rotate(45deg) translateX(40%) translateY(-50%)",
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

export default WeakestTopicsSlide;
