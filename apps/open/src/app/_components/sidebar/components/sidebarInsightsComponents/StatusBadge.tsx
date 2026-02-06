import React from 'react';
import CircularProgressBar from '@/app/_components/CircularProgressBar';

interface StatusBadgeProps {
  type: 'grade' | 'progress' | 'circular' | 'simple' | 'bar';
  // For grade type
  grade?: number;
  delta?: number;

  // For progress type
  currentGrade?: number;
  targetGrade?: number;

  // For circular type
  progress?: number;
  strokeColor?: string;

  // For simple type
  text?: string;
  value?: number;
  progressText?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  grade,
  delta,
  currentGrade,
  targetGrade,
  progress,
  strokeColor,
  text,
  value,
  progressText
}) => {
  const getGradeColor = (gradeValue: number) => {
    if (gradeValue > 5) return '#7CC500';
    if (gradeValue > 0) return '#FFA935';
    return '#F2F2F7';
  };

  const baseClasses = "border border-[#F2F2F7] bg-white rounded-full px-2 py-1.5 text-[12px] font-rounded-bold flex flex-row items-center gap-2 text-black/50";

  switch (type) {
    case 'simple':
      return (
        <div className={baseClasses}>
          {value} {text}
        </div>
      );

    case 'bar':
      return (
        <div className="border border-[#F2F2F7] bg-white rounded-full px-2 py-1.5 text-[12px] font-rounded-bold flex flex-row items-center gap-1 text-black/50">
          <div className="w-8 h-1.5 bg-[#F2F2F7] rounded-full">
            {value > 5 && (
              <div
                className="h-1.5 rounded-full"
                style={{
                  backgroundColor: strokeColor,
                  width: `${Math.min(100, ((value || 0) / 100) * 100)}%`
                }}
              />
            )}
          </div>
          {progressText}
        </div>
      );

    case 'grade':
      return (
        <div className={baseClasses}>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getGradeColor(grade || 0) }}
          />
          Grade {grade}
          {delta && (
            <div className="flex items-center gap-1">
              <svg width="6" height="6" viewBox="0 0 4 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 3.67552C4 3.56631 3.95207 3.47893 3.89456 3.36972L2.36741 0.305772C2.24919 0.0686426 2.14376 0 1.99999 0C1.85623 0 1.75079 0.0686426 1.63258 0.305772L0.105431 3.36972C0.0479231 3.48206 0 3.56941 0 3.67861C0 3.8783 0.156549 4 0.392969 4L3.60702 3.99687C3.84663 3.99687 4 3.8752 4 3.67552Z" fill="#7CC500" />
              </svg>
              <span className="text-[12px] font-rounded-bold text-[#7CC500]">
                {delta}
              </span>
            </div>
          )}
        </div>
      );

    case 'progress':
      return (
        <div className="border border-[#F2F2F7] bg-white rounded-full px-2 py-1.5 text-[12px] font-rounded-bold flex flex-row items-center gap-1 text-black/50">
          <div className="w-8 h-1.5 bg-[#F2F2F7] rounded-full">
            <div
              className="h-1.5 rounded-full"
              style={{
                backgroundColor: getGradeColor(currentGrade || 0),
                width: `${Math.min(100, ((currentGrade || 0) / (targetGrade || 10)) * 100)}%`
              }}
            />
          </div>
          {currentGrade} → {targetGrade}
        </div>
      );

    case 'circular':
      return (
        <div className="border border-[#F2F2F7] bg-white rounded-full px-2 pr-3 py-1.5 text-[12px] font-rounded-bold flex flex-row items-center gap-2 text-black/50">
          <CircularProgressBar
            progress={progress || 0}
            size={16}
            strokeWidth={3}
            strokeColor={strokeColor}
          />
          <span className="text-[12px] font-rounded-bold text-black/50">
            {progressText}
          </span>
        </div>
      );

    default:
      return null;
  }
};

export default StatusBadge;