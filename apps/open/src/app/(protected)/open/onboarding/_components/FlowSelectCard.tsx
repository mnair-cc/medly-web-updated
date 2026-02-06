"use client";

import { useState } from "react";

interface FlowSelectCardProps {
  label: string;
  isSelected: boolean;
  isRecommended?: boolean;
  imagePath?: string;
  onPress: () => void;
}

export default function FlowSelectCard({
  label,
  isSelected,
  isRecommended = false,
  imagePath,
  onPress,
}: FlowSelectCardProps) {
  const [isPressedDown, setIsPressedDown] = useState(false);

  return (
    <div className="pb-[3px]">
      <button
        onClick={onPress}
        onMouseDown={() => setIsPressedDown(true)}
        onMouseUp={() => setIsPressedDown(false)}
        onMouseLeave={() => setIsPressedDown(false)}
        onTouchStart={() => setIsPressedDown(true)}
        onTouchEnd={() => setIsPressedDown(false)}
        className={`
          relative flex flex-col items-center justify-center
          w-full aspect-square
          rounded-[20px] border
          transition-transform duration-100
          ${isPressedDown ? "translate-y-[3px]" : ""}
        `}
        style={{
          backgroundColor: isSelected ? "#DBF3FF" : "white",
          borderColor: isSelected ? "#06B0FF" : "#F0F0F0",
          borderWidth: "1px",
          borderBottomWidth: isPressedDown ? "1px" : "4px",
        }}
      >
        {/* Image placeholder for future */}
        {imagePath && (
          <div className="mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePath}
              alt={label}
              className="w-16 h-16 object-contain"
            />
          </div>
        )}

        {/* Label */}
        <span className={`font-rounded-bold text-base text-center leading-tight px-4 text-black`}>
          {label}
        </span>

        {/* Recommended badge */}
        {isRecommended && (
          <div className="mt-2 px-3 py-2 bg-[#05B0FF] rounded-[10px] flex items-center justify-center">
            <span className="text-white text-[12px] font-rounded-semibold leading-none">Recommended</span>
          </div>
        )}
      </button>
    </div>
  );
}
