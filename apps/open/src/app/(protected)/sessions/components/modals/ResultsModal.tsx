"use client";

import React from "react";
import { useState, useEffect } from "react";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import { Socket } from "socket.io-client";
import ProgressBar from "@/app/_components/ProgressBar";
import { useUser } from "@/app/_context/UserProvider";
import MockCountdown from "@/app/_components/sidebar/components/mock-panel/MockCountdown";

const ResultsModal = ({
  isOpen,
  onClose,
  pages,
  socket,
  socketError,
  subjectId,
  paperId,
  initialInsights,
  isAwaitingResponse,
  generateInsights,
}: {
  isOpen: boolean;
  onClose: () => void;
  pages: any;
  socket: Socket | null;
  socketError: Error | null;
  subjectId?: string;
  paperId?: string;
  initialInsights?: any;
  isAwaitingResponse: boolean;
  generateInsights: () => void;
}) => {
  const { user } = useUser();
  if (!isOpen) return null;

  // Parse initialInsights if it's a string, otherwise use as-is
  const parsedInsights = React.useMemo(() => {
    if (!initialInsights) return null;
    if (typeof initialInsights === "string") {
      try {
        return JSON.parse(initialInsights);
      } catch (error) {
        console.error("Failed to parse initialInsights:", error);
        return null;
      }
    }
    return initialInsights;
  }, [initialInsights]);

  // Use parsed insights if available, otherwise use placeholder data
  const insights = parsedInsights;

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    setIsLoading(isAwaitingResponse);

    if (isAwaitingResponse) {
      // Reset progress and countdown when loading starts
      setProgress(0);
      setCountdown(30);

      const interval = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown <= 1) {
            clearInterval(interval);
            return 0;
          }

          const newCountdown = prevCountdown - 1;
          const elapsed = 30 - newCountdown;

          // Pareto principle: 80% of progress in first 20% of time (12 seconds)
          let newProgress;
          if (elapsed <= 12) {
            // First 20% of time: progress from 0 to 80%
            newProgress = (elapsed / 12) * 80;
          } else {
            // Remaining 80% of time: progress from 80% to 100%
            const remainingTime = elapsed - 12;
            const remainingDuration = 48; // 30 - 12
            newProgress = 80 + (remainingTime / remainingDuration) * 20;
          }

          setProgress(Math.min(newProgress, 100));
          return newCountdown;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      // Reset states when not loading
      setProgress(0);
      setCountdown(30);
    }
  }, [isAwaitingResponse]);

  if (!isAwaitingResponse && !insights) {
    return (
      <div className="bg-[#FBFBFD] overflow-y-auto z-[9]">
        <div className="flex items-start justify-center w-full h-full pt-6 md:pt-8 pb-10">
          <div className="w-full">
            <div className="w-full md:max-w-[800px] bg-white mx-auto rounded-[16px] py-8 min-h-[60vh] relative mt-10 flex flex-col justify-center items-center border border-[#F2F2F7]">
              <div className="w-1/2 flex flex-col justify-center items-center">
                <h2 className="text-2xl font-rounded-heavy text-center">
                  Oops. Failed to load insights.
                </h2>
                <p className="mt-2 mb-5 text-center text-[15px]">
                  Please try again. You must stay on this page until the
                  insights are generated.
                </p>
                <PrimaryButtonClicky
                  buttonText="Try again"
                  onPress={generateInsights}
                  showKeyboardShortcut={false}
                  isLong={true}
                  buttonState="filled"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !insights) {
    return (
      <div className="bg-[#FBFBFD] overflow-y-auto z-[9]">
        <div className="flex items-start justify-center w-full h-full pt-6 md:pt-8 pb-10">
          <div className="w-full">
            <div className="w-full md:max-w-[800px] bg-white mx-auto rounded-[16px] py-8 min-h-[60vh] relative mt-10 flex flex-col justify-center items-center border border-[#F2F2F7]">
              <div className="w-1/2 flex flex-col justify-center items-center">
                <ProgressBar
                  progress={progress}
                  type="tall"
                  avatar={user?.avatar}
                />
                <p className="text-[#BFBFCC] font-rounded-heavy mt-8">
                  Generating Insights
                </p>
                <p className="text-[#A5A5AE] text-sm mt-2 font-rounded">
                  Your insights will be available in {countdown} seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBFBFD] overflow-y-auto z-[9]">
      <div className="flex items-start justify-center w-full h-full pb-10">
        <div className="w-full">
          <div className="w-full md:max-w-[800px] bg-white mx-auto rounded-[16px] py-8 min-h-[60vh] relative mt-10 pb-20 border border-[#F2F2F7]">
            <div className="flex flex-col items-center justify-center h-full space-y-6 px-20 pt-10">
              <div className="flex flex-col items-center justify-center gap-2 mb-5">
                <div className="flex flex-row items-center justify-center gap-2">
                  <p className="text-[15px] font-medium text-[#818181]">
                    Christmas Medly Mock
                  </p>
                </div>
                <h2 className="text-4xl font-rounded-heavy">
                  {pages[0].content?.subject} Paper {pages[0].content?.paper}
                </h2>
                <div className="flex flex-row items-center justify-center gap-2">
                  <p className="text-[15px] font-medium mt-1">
                    {pages[0].content?.examBoard} {pages[0].content?.course}
                  </p>
                </div>
              </div>

              <div className="w-full items-center justify-center pb-5">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex flex-row items-center justify-center mb-2 gap-1">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 32 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g clipPath="url(#clip0_134_155)">
                        <path
                          d="M15.8193 25.9561C21.3174 25.9561 25.7803 21.4932 25.7803 15.9951C25.7803 10.4971 21.3174 6.03418 15.8193 6.03418C10.3213 6.03418 5.8584 10.4971 5.8584 15.9951C5.8584 21.4932 10.3213 25.9561 15.8193 25.9561ZM15.8193 24.2959C11.2295 24.2959 7.51856 20.585 7.51856 15.9951C7.51856 11.4053 11.2295 7.69434 15.8193 7.69434C20.4092 7.69434 24.1201 11.4053 24.1201 15.9951C24.1201 20.585 20.4092 24.2959 15.8193 24.2959Z"
                          fill="black"
                          fillOpacity="0.4"
                        />
                        <path
                          d="M10.7119 17.0498H15.8096C16.1904 17.0498 16.4932 16.7569 16.4932 16.3662V9.78418C16.4932 9.40332 16.1904 9.11035 15.8096 9.11035C15.4287 9.11035 15.1357 9.40332 15.1357 9.78418V15.6924H10.7119C10.3213 15.6924 10.0283 15.9854 10.0283 16.3662C10.0283 16.7569 10.3213 17.0498 10.7119 17.0498Z"
                          fill="black"
                          fillOpacity="0.4"
                        />
                      </g>
                    </svg>
                    <p className="text-[15px] text-[#818181] font-rounded-bold text-center">
                      Full results and insights will be released on Oct 3rd 6pm.
                    </p>
                  </div>
                  {/* <MockCountdown targetDate={getMockDateInUTC("results_day")} /> */}
                </div>
              </div>

              <div className="w-full bg-[#FBFBFD] rounded-[24px] p-6 flex flex-col space-y-4">
                <div className="flex flex-col ">
                  <p className="text-[15px] text-[#818181]">Your level</p>
                  <div className="font-rounded-heavy text-2xl">
                    {insights?.level || "Processing..."}
                  </div>
                </div>
                <p className="text-[15px]">
                  {insights?.summary || "Insights are being generated..."}
                </p>
              </div>

              <div className="flex flex-col gap-4 w-full">
                <div className="font-rounded-heavy text-2xl">Strengths</div>
                <div className="flex flex-col gap-2">
                  {(insights?.strengths || []).map((strength, index) => (
                    <div className="p-6 border border-[#F2F2F7] rounded-[24px] flex flex-col gap-2">
                      <div className="flex flex-row items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#ECFFCC] flex items-center justify-center font-rounded-bold text-[12px] text-[#7CC500]">
                          {index + 1}
                        </div>
                        <div
                          key={strength.topic_title}
                          className="text-[15px] font-rounded-bold"
                        >
                          {strength.topic_title}
                        </div>
                      </div>
                      <div className="text-[15px]">{strength.feedback}</div>

                      {/* <button className="flex flex-row items-center gap-0">
                        <div className="text-[15px] font-rounded-semibold text-[#06B0FF]">
                          Continue {strength.topic_title}
                        </div>
                        <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9.02686 15.355L13.9111 10.5775C14.0868 10.4143 14.1685 10.2197 14.1685 9.99998C14.1685 9.78026 14.0806 9.57936 13.9111 9.41614L9.02686 4.64493C8.88874 4.50682 8.71296 4.43148 8.50579 4.43148C8.08517 4.43148 7.75872 4.75794 7.75872 5.17228C7.75872 5.37317 7.83405 5.56778 7.98472 5.71218L12.3855 9.9937L7.98472 14.2878C7.84033 14.4259 7.75872 14.6205 7.75872 14.8277C7.75872 15.242 8.08517 15.5685 8.50579 15.5685C8.70668 15.5685 8.88874 15.4931 9.02686 15.355Z" fill="#06B0FF" />
                        </svg>
                      </button> */}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full">
                <div className="font-rounded-heavy text-2xl">Focus Areas</div>
                <div className="flex flex-col gap-2">
                  {(insights?.improvements || []).map((improvement, index) => (
                    <div className="p-6 border border-[#F2F2F7] rounded-[24px] flex flex-col gap-2">
                      <div className="flex flex-row items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#FDEBD7] flex items-center justify-center font-rounded-bold text-[12px] text-[#FF882B]">
                          {index + 1}
                        </div>
                        <div
                          key={improvement.topic_title}
                          className="text-[15px] font-rounded-bold"
                        >
                          {improvement.topic_title}
                        </div>
                      </div>
                      <div className="text-[15px]">{improvement.feedback}</div>

                      {/* <button className="flex flex-row items-center gap-0">
                        <div className="text-[15px] font-rounded-semibold text-[#06B0FF]">
                          Continue {improvement.topic_title}
                        </div>
                        <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9.02686 15.355L13.9111 10.5775C14.0868 10.4143 14.1685 10.2197 14.1685 9.99998C14.1685 9.78026 14.0806 9.57936 13.9111 9.41614L9.02686 4.64493C8.88874 4.50682 8.71296 4.43148 8.50579 4.43148C8.08517 4.43148 7.75872 4.75794 7.75872 5.17228C7.75872 5.37317 7.83405 5.56778 7.98472 5.71218L12.3855 9.9937L7.98472 14.2878C7.84033 14.4259 7.75872 14.6205 7.75872 14.8277C7.75872 15.242 8.08517 15.5685 8.50579 15.5685C8.70668 15.5685 8.88874 15.4931 9.02686 15.355Z" fill="#06B0FF" />
                        </svg>
                      </button> */}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsModal;
