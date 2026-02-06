"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { slides as allSlides } from "../_constants/slides";
import TopBar from "./TopBar";
import StepRenderer from "./SlideRenderer";
import { useUser } from "@/app/_context/UserProvider";
import { InsightsData } from "../_types/types";

interface ResultsProps {
  insightsData: InsightsData;
}

const Results = ({ insightsData }: ResultsProps) => {
  const { user, loading } = useUser();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter slides based on available data
  const slides = useMemo(() => {
    // Check if strongest topics have usable data (at least one non-zero marksPercentage)
    const hasUsableStrongestTopics =
      insightsData.strongestTopics &&
      insightsData.strongestTopics.length > 0 &&
      insightsData.strongestTopics.some((topic) => topic.marksPercentage > 0);

    // Check if weakest topics have usable data (at least one non-zero marksLost)
    const hasUsableWeakestTopics =
      insightsData.weakestTopics &&
      insightsData.weakestTopics.length > 0 &&
      insightsData.weakestTopics.some((topic) => topic.marksLost > 0);

    return allSlides.filter((slide) => {
      // Skip percentile slide if no awards
      if (
        slide.type === "percentile" &&
        (!insightsData.awards || insightsData.awards.length === 0)
      ) {
        return false;
      }
      // Skip strongest_topics slide if no usable data
      if (slide.type === "strongest_topics" && !hasUsableStrongestTopics) {
        return false;
      }
      // Skip weakest_topics slide if no usable data
      if (slide.type === "weakest_topics" && !hasUsableWeakestTopics) {
        return false;
      }
      return true;
    });
  }, [
    insightsData.awards,
    insightsData.strongestTopics,
    insightsData.weakestTopics,
  ]);

  // Handle slide transitions
  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
      setProgress(0);
    }
  };

  // Handle navigating to a specific slide
  const handleSlideChange = (index: number) => {
    setCurrentSlideIndex(index);
    setProgress(0);
  };

  // Slides that are purely interactive (no timed animation) - skip progress to 100
  const interactiveOnlySlides: string[] = [];

  // Slides that require a click/event to start the animation
  const clickToStartSlides = ["grades", "strongest_topics", "weakest_topics"];

  // Start progress animation (called by interactive slides when animation begins)
  const startProgressAnimation = (duration: number = 5000) => {
    // Clear any existing timer to prevent multiple animations running
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    const startTime = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const newProgress = Math.min((elapsedTime / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      }
    }, 16);
  };

  // Animate progress bar for each slide
  useEffect(() => {
    // Skip for welcome and loading slides
    if (
      currentSlideIndex === 0 ||
      slides[currentSlideIndex].type === "loading"
    ) {
      return;
    }

    const currentSlideType = slides[currentSlideIndex].type;

    // For interactive-only slides, set progress to 100 immediately
    if (interactiveOnlySlides.includes(currentSlideType)) {
      setProgress(100);
      return;
    }

    // For click-to-start slides, don't auto-animate (will be triggered by SlideRenderer)
    if (clickToStartSlides.includes(currentSlideType)) {
      return;
    }

    const ANIMATION_DURATION = 5000; // 5 seconds for the progress bar to fill
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const newProgress = Math.min(
        (elapsedTime / ANIMATION_DURATION) * 100,
        100
      );
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(timer);
      }
    }, 16); // Update approximately every frame

    return () => clearInterval(timer);
  }, [currentSlideIndex]);

  if (loading || !user) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex flex-col items-center justify-center bg-black text-white text-center h-full p-8">
          <div className="animate-pulse text-2xl font-rounded-bold">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: slides[currentSlideIndex].backgroundColor }}
    >
      <div className="flex flex-col items-center text-white text-center h-full p-0 pt-4 sm:p-8 sm:pt-8 overflow-hidden">
        {/* Hide top bar on welcome and loading slides */}
        {currentSlideIndex > 1 && (
          <TopBar
            currentSlideIndex={currentSlideIndex}
            progress={progress}
            user={user}
            onSlideChange={handleSlideChange}
            slides={slides}
          />
        )}

        <StepRenderer
          currentSlideIndex={currentSlideIndex}
          handleNext={handleNext}
          insightsData={insightsData}
          user={user}
          onAnimationStart={startProgressAnimation}
          slides={slides}
        />
      </div>
    </div>
  );
};

export default Results;
