"use client";

import React from "react";

interface AwaitingChipProps {
  message: string;
}

export function AwaitingChip({ message }: AwaitingChipProps) {
  return (
    <div className="inline-flex items-start gap-1.5 rounded-full text-sm font-rounded-semibold text-[#595959] mb-5">
      {/* Icon slot - add custom icon here */}
      <span className="w-3.5 h-3.5 mt-[3px] shrink-0" />
      <span className="flex-1">{message}</span>
    </div>
  );
}
