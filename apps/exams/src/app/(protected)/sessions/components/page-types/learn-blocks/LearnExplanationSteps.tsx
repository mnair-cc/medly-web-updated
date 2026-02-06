"use client";

import React from "react";
import { LearnFlowStep } from "../../../types";
import "katex/dist/katex.min.css";
import ArrowRightIcon from "@/app/_components/icons/ArrowRightIcon";
import MemoizedMarkdown from "./MemoizedMarkdown";

interface LearnExplanationStepsProps {
  steps: LearnFlowStep[];
  onExplainClick?: (stepIndex: number, stepMath: string) => void;
}

const LearnExplanationSteps: React.FC<LearnExplanationStepsProps> = React.memo(
  ({ steps, onExplainClick }) => {
    return (
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="py-2">
            <div className="prose prose-sm max-w-none">
              <MemoizedMarkdown
                content={step.step_text}
                className="!text-[12px] !font-rounded-bold !text-[#05b0ff] [&_p]:!m-0 [&_p]:!leading-normal"
              />
            </div>
            {step.step_math && (
              <div className="mt-2 relative">
                <div className="flex justify-center">
                  <div className="relative inline-block group cursor-pointer">
                    {/* Floating action above math - appears only on hover, no layout shift */}
                    {onExplainClick && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 translate-y-px z-20 hidden group-hover:flex">
                        <button
                          onClick={() =>
                            onExplainClick(index, step.step_math as string)
                          }
                          className="bg-white text-black px-2 py-1.5 rounded-full font-rounded-bold text-xs shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:bg-gray-100 transition-colors whitespace-nowrap flex items-center gap-1.5"
                        >
                          Explain to me
                          <div className="bg-[#06b0ff] rounded-full p-0.5 flex items-center justify-center">
                            <div className="w-3 h-3 flex items-center justify-center">
                              <ArrowRightIcon fill="white" />
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                    <div className="text-lg font-mono">
                      <MemoizedMarkdown content={step.step_math} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

LearnExplanationSteps.displayName = "LearnExplanationSteps";

export default LearnExplanationSteps;
