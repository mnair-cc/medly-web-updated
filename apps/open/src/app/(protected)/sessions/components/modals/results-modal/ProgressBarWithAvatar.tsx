import { useUser } from "@/app/_context/UserProvider";
import { useEffect, useState } from "react";

interface ProgressBarWithAvatarProps {
  userPosition: number; // 0-100 percentage
  averagePosition: number; // 0-100 percentage
  background?: string;
  progressColor?: string;
  showGradient?: boolean;
  averageLabel?: string;
  className?: string;
  animationDelay?: number; // Delay in milliseconds
  gradientBoundaries?: number[]; // Array of boundary values (0-100 scale)
}

const ProgressBarWithAvatar = ({
  userPosition,
  averagePosition,
  background = "#F2F2F7",
  progressColor = "#7CC500",
  showGradient = false,
  averageLabel,
  className = "",
  animationDelay = 0,
  gradientBoundaries = [0, 40, 70],
}: ProgressBarWithAvatarProps) => {
  const { user } = useUser();

  // Create dynamic average label based on user's year
  const defaultAverageLabel = `Y${user?.year || 10} Average`;
  const displayAverageLabel = averageLabel || defaultAverageLabel;
  const [isAnimated, setIsAnimated] = useState(false);

  // Ensure positions are within bounds
  const safeUserPosition = Math.min(Math.max(userPosition, 0), 100);
  const safeAveragePosition = Math.min(Math.max(averagePosition, 0), 100);

  // Create dynamic gradient based on boundaries
  const createDynamicGradient = () => {
    const colors = ["#F8C856", "#8ADB00", "#06B0FF"];

    // Use boundaries directly as they are already on 0-100 scale
    const cssStops = gradientBoundaries.map((boundary, index) => {
      return `${colors[index]} ${boundary}%`;
    });

    // Add the final color at 100%
    cssStops.push(`${colors[colors.length - 1]} 100%`);

    return `linear-gradient(to right, ${cssStops.join(", ")})`;
  };

  // Trigger animation on mount with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimated(true);
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [animationDelay]);

  return (
    <div className={`relative ${className}`}>
      {/* Progress bar background */}
      <div className="h-2 rounded-full overflow-hidden relative">
        {showGradient ? (
          /* Dynamic gradient background for grade scale */
          <div
            className="h-full w-full"
            style={{ background: createDynamicGradient() }}
          ></div>
        ) : (
          <>
            {/* Solid background */}
            <div
              className="h-full w-full"
              style={{ backgroundColor: background }}
            ></div>
            {/* Progress fill */}
            <div
              className="h-full absolute top-0 left-0 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: isAnimated ? `${safeUserPosition}%` : "0%",
                backgroundColor: progressColor,
              }}
            ></div>
          </>
        )}
      </div>

      {/* Average marker with label */}
      <div
        className="absolute top-3 -translate-x-1/2 z-5 flex flex-col items-center"
        style={{
          left: `${safeAveragePosition}%`,
        }}
      >
        <svg
          width="4"
          height="4"
          viewBox="0 0 4 4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-3.21324e-07 3.67551C-3.11777e-07 3.56631 0.0479278 3.47893 0.105442 3.36972L1.63259 0.305772C1.75081 0.0686424 1.85624 -1.87414e-07 2.00001 -1.74845e-07C2.14377 -1.62276e-07 2.24921 0.0686425 2.36742 0.305772L3.89457 3.36972C3.95208 3.48206 4 3.56941 4 3.67861C4 3.8783 3.84345 4 3.60703 4L0.392979 3.99687C0.15337 3.99687 -3.38781e-07 3.8752 -3.21324e-07 3.67551Z"
            fill="black"
            fillOpacity="0.2"
          />
        </svg>
        <div className="text-[10px] text-[#00000033] font-rounded-bold whitespace-nowrap">
          {displayAverageLabel}
        </div>
      </div>

      {/* User avatar positioned based on user position */}
      {user?.avatar && (
        <div
          className="absolute top-1 -translate-y-1/2 -translate-x-1/2 text-xl z-10 transition-all duration-1000 ease-out"
          style={{
            left: isAnimated ? `${safeUserPosition}%` : "0%",
          }}
        >
          <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-[0px_0px_4px_0px_rgba(0,0,0,0.10)]">
            {user.avatar}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressBarWithAvatar;
