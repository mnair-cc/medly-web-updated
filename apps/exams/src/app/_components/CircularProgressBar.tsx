interface CircularProgressBarProps {
  progress: number; // Progress as a percentage (0-100)
  size?: number; // Size of the progress bar in pixels
  strokeWidth?: number; // Width of the progress ring
  className?: string;
  strokeColor?: string;
  backgroundStrokeColor?: string; // Background circle color
  hidePercentage?: boolean;
}

export default function CircularProgressBar({
  progress,
  size = 24,
  strokeWidth = 2,
  className = "",
  strokeColor = "#00AEFF",
  backgroundStrokeColor = "#f2f2f7",
  hidePercentage = false,
}: CircularProgressBarProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundStrokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progress === 100 ? strokeColor : strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-out"
        />
      </svg>
      {/* Optional percentage text in center */}
      {!hidePercentage && size >= 32 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] font-medium text-[#595959]">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}
