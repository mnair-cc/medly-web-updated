import ProgressBar from "@/app/_components/ProgressBar";
import { useUser } from "../_context/UserProvider";
import { useEffect, useState } from "react";

const facts = [
  "Did you know? Medly was made by two doctors who wanted to make personal tutoring available to everyone!",
];

const chosenFact = facts[Math.floor(Math.random() * facts.length)];

const LoadingScreen = ({
  hideLoadingBar = false,
  loadingText = "Loading",
  factText,
  duration = 1000,
  progressValue,
  handleNextOnboardingStep,
  avatar,
}: {
  hideLoadingBar?: boolean;
  loadingText?: string;
  factText?: string;
  duration?: number;
  progressValue?: number;
  handleNextOnboardingStep?: () => void;
  avatar?: string;
}) => {
  const { user } = useUser();
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  // Animate progress when no progressValue is provided
  useEffect(() => {
    if (progressValue !== undefined) {
      setAnimatedProgress(progressValue);
      return;
    }

    if (hideLoadingBar) {
      setAnimatedProgress(100);
      return;
    }

    // Set to 50 after 1 second
    const firstTimeout = setTimeout(() => {
      setAnimatedProgress(50);
    }, duration / 2);

    // Set to 100 after another second
    const secondTimeout = setTimeout(() => {
      setAnimatedProgress(100);
    }, duration);

    let thirdTimeout: NodeJS.Timeout;

    if (handleNextOnboardingStep) {
      thirdTimeout = setTimeout(() => {
        handleNextOnboardingStep();
      }, duration + 1000);
    }

    return () => {
      clearTimeout(firstTimeout);
      clearTimeout(secondTimeout);
      if (handleNextOnboardingStep) {
        clearTimeout(thirdTimeout);
      }
    };
  }, [progressValue, duration, handleNextOnboardingStep, hideLoadingBar]);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col justify-center items-center bg-white">
      <div className="text-center max-w-[250px] mx-auto">
        {!hideLoadingBar && (
          <div className="w-full border-[6px] border-[#05B0FF]/30 rounded-full p-[6px]">
            <ProgressBar
              progress={animatedProgress}
              avatar={avatar || user?.avatar}
              type="tall"
            />
          </div>
        )}
        <p className="text-[#BFBFCC] font-rounded-heavy mt-8">
          {loadingText}
          <span className="inline-block w-6 text-left">
            {".".repeat(dotCount)}
          </span>
        </p>
        <p className="text-[#A5A5AE] text-sm mt-2">{factText || chosenFact}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
