import { useRef, useEffect } from "react";

const ProgressBar = ({
  progress,
  avatar,
  colorEmpty = "rgba(0,0,0,0.05)",
  colorFilled = "#00AEFF",
  type = "short",
  shouldAnimate = true,
}: {
  progress: number;
  avatar?: string;
  colorEmpty?: string;
  colorFilled?: string;
  type?: "short" | "tall" | "thin";
  shouldAnimate?: boolean;
}) => {
  const cappedProgress = Math.min(Math.round(progress), 100);
  const prevProgressRef = useRef(cappedProgress);

  // Only animate when progress increases, not when going backwards
  const isIncreasing = cappedProgress >= prevProgressRef.current;
  const shouldTransition = shouldAnimate && isIncreasing;

  useEffect(() => {
    prevProgressRef.current = cappedProgress;
  }, [cappedProgress]);

  return (
    <div
      className={`rounded-full bg-[${colorEmpty}] relative ${
        type === "tall"
          ? "h-3 w-full"
          : type === "thin"
            ? "h-6 w-2"
            : "h-2 w-full"
      }`}
      style={{ backgroundColor: colorEmpty }}
    >
      <div
        className={`h-full rounded-full absolute top-0 left-0`}
        style={{
          width: `${cappedProgress}%`,
          backgroundColor: colorFilled,
          transition: shouldTransition ? 'width 0.1s linear, opacity 0.2s ease-out' : 'opacity 0.2s ease-out',
        }}
      />
      {avatar && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 ${
            type === "tall"
              ? "text-5xl sm:text-6xl"
              : type === "thin"
                ? "text-6xl"
                : "text-4xl"
          }`}
          style={{
            left: `${cappedProgress}%`,
            transition: shouldTransition ? 'left 0.1s linear' : 'none',
            opacity: 1,
          }}
        >
          {avatar}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
