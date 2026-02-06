"use client";

import { useState } from "react";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import Scale from "@/app/(protected)/onboarding/_components/Scale";
import SketchCanvas from "../question-components/canvas/SketchCanvas";
import { InputMode } from "../../types";
import { Canvas } from "@/app/types/types";
import SketchToolbar from "../footer/SketchToolbar";

const PaperTutorialModal = ({
  isOpen,
  onClose,
  onClickStartSession,
  showGradeInput,
  currentGrade,
  targetGrade,
  setCurrentGrade,
  setTargetGrade,
  gradeOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onClickStartSession: (currentGrade: string, targetGrade: string) => void;
  showGradeInput: boolean;
  currentGrade: string;
  targetGrade: string;
  setCurrentGrade: (currentGrade: string) => void;
  setTargetGrade: (targetGrade: string) => void;
  gradeOptions: string[];
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Local state to drive the session SketchCanvas just for the tutorial modal
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [canvasPage2, setCanvasPage2] = useState<Canvas>({
    paths: [],
    textboxes: [
      {
        x: 80,
        y: 120.5,
        text: "Switch between text \nand maths\n       ↓ ",
        fontSize: 16,
        color: "#000000",
        isMath: false,
      },
    ],
    maths: [],
  });
  const [canvasPage3, setCanvasPage3] = useState<Canvas>({
    paths: [],
    textboxes: [
      {
        x: 40,
        y: 48.5,
        text: "Drag me!",
        fontSize: 16,
        color: "#000000",
        isMath: false,
      },
      {
        x: 91,
        y: 157.5,
        text: "double\\: click\\: to\\: edit\\: \\to\\frac{2025}{5}",
        fontSize: 16,
        color: "#000000",
        isMath: true,
      },
    ],
    maths: [],
  });

  if (!isOpen) return null;

  // Only show multiple pages for start-paper
  const totalPages = showGradeInput ? 6 : 5;

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else {
      onClose();
      onClickStartSession(currentGrade, targetGrade);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Check if grades are selected on the grade input page
  const isGradePageComplete =
    !showGradeInput ||
    currentPage !== 5 ||
    (currentGrade !== "" && targetGrade !== "");

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-[16px] text-center shadow-[0_0_32px_rgba(0,0,0,0.2)] overflow-hidden relative flex flex-col items-center w-[640px]">
        <button onClick={onClose} className="absolute top-8 right-8">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="cursor-pointer"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12.0001 13.0607L6.53039 18.5304L5.46973 17.4697L10.9394 12.0001L5.46973 6.53039L6.53039 5.46973L12.0001 10.9394L17.4697 5.46973L18.5304 6.53039L13.0607 12.0001L18.5304 17.4697L17.4697 18.5304L12.0001 13.0607Z"
              fill="black"
            />
          </svg>
        </button>

        <div className="flex-1 flex flex-col p-10 pb-6 pt-12 justify-center items-start w-full ">
          {currentPage === 1 && (
            <>
              <h1 className="text-2xl mb-4 font-rounded-heavy mx-4 md:mx-0 text-left">
                Welcome to Medly Mocks!
              </h1>

              <div className="text-left w-[95%]">
                <p className="text-base mb-2 text-gray-700">
                  The Christmas Medly Mocks are designed to help you understand
                  where you stand after your first term back, and help you
                  identify your strengths and areas for growth.
                </p>
                <p className="text-base mb-2 text-gray-700">
                  Here are some tips for the this mock exam:
                </p>
              </div>
              <div className="w-full px-16">
                <div className="flex flex-col gap-4 bg-[#E6F7FF] rounded-3xl p-6 text-[#05B0FF] text-[14px] mb-2">
                  <div className="flex flex-col gap-3 mx-auto font-rounded-bold">
                    <div className="flex justify-start items-center gap-3">
                      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M4.33838 18.4929C4.33838 19.1691 4.75663 19.4929 5.24332 19.4929C5.46385 19.4929 5.68439 19.4281 5.90492 19.313L13.8973 14.9101C14.4677 14.5935 14.6882 14.3561 14.6882 13.9964C14.6882 13.6367 14.4677 13.3993 13.8973 13.0827L5.90492 8.67986C5.68439 8.55755 5.46385 8.5 5.24332 8.5C4.75663 8.5 4.33838 8.81655 4.33838 9.49281V18.4929ZM14.6501 18.4929C14.6501 19.1691 15.0608 19.4929 15.5551 19.4929C15.768 19.4929 15.9962 19.4281 16.2167 19.313L24.2015 14.9101C24.7794 14.5935 25 14.3561 25 13.9964C25 13.6367 24.7794 13.3993 24.2015 13.0827L16.2167 8.67986C15.9962 8.55755 15.768 8.5 15.5551 8.5C15.0608 8.5 14.6501 8.81655 14.6501 9.49281V18.4929Z"
                            fill="#06B0FF"
                          />
                        </svg>
                      </div>
                      <div>Skip any topics you haven&apos;t learned</div>
                    </div>

                    <div className="flex justify-start items-center gap-3">
                      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M13.3457 18.0088C14.0293 18.0088 14.3418 17.54 14.3418 16.915C14.3418 16.8076 14.3418 16.6904 14.3418 16.583C14.3613 15.2939 14.8203 14.7568 16.3828 13.6826C18.0625 12.5498 19.1269 11.2412 19.1269 9.35643C19.1269 6.42674 16.7441 4.74706 13.7754 4.74706C11.5684 4.74706 9.63477 5.79198 8.80469 7.67674C8.59961 8.13573 8.51172 8.58495 8.51172 8.95604C8.51172 9.51268 8.83398 9.90331 9.42969 9.90331C9.92774 9.90331 10.2598 9.61034 10.4062 9.13182C10.9043 7.27635 12.1348 6.57323 13.707 6.57323C15.6113 6.57323 17.1055 7.64745 17.1055 9.34667C17.1055 10.7431 16.2363 11.5244 14.9863 12.4033C13.4531 13.4678 12.3301 14.6103 12.3301 16.3291C12.3301 16.5342 12.3301 16.7392 12.3301 16.9443C12.3301 17.5693 12.6719 18.0088 13.3457 18.0088ZM13.3457 23.3506C14.1269 23.3506 14.7422 22.7256 14.7422 21.9639C14.7422 21.1924 14.1269 20.5771 13.3457 20.5771C12.584 20.5771 11.959 21.1924 11.959 21.9639C11.959 22.7256 12.584 23.3506 13.3457 23.3506Z"
                            fill="#06B0FF"
                          />
                        </svg>
                      </div>
                      <div>Take your best guess at everything else</div>
                    </div>

                    <div className="flex justify-start items-center gap-3">
                      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M13.8193 23.9561C19.3174 23.9561 23.7803 19.4932 23.7803 13.9952C23.7803 8.4971 19.3174 4.03421 13.8193 4.03421C8.32129 4.03421 3.8584 8.4971 3.8584 13.9952C3.8584 19.4932 8.32129 23.9561 13.8193 23.9561ZM13.8193 22.2959C9.22949 22.2959 5.51856 18.585 5.51856 13.9952C5.51856 9.4053 9.22949 5.69437 13.8193 5.69437C18.4092 5.69437 22.1201 9.4053 22.1201 13.9952C22.1201 18.585 18.4092 22.2959 13.8193 22.2959Z"
                            fill="#06B0FF"
                          />
                          <path
                            d="M8.71192 15.0498H13.8096C14.1904 15.0498 14.4932 14.7569 14.4932 14.3662V7.78421C14.4932 7.40335 14.1904 7.11038 13.8096 7.11038C13.4287 7.11038 13.1357 7.40335 13.1357 7.78421V13.6924H8.71192C8.32129 13.6924 8.02832 13.9854 8.02832 14.3662C8.02832 14.7569 8.32129 15.0498 8.71192 15.0498Z"
                            fill="#06B0FF"
                          />
                        </svg>
                      </div>
                      <div>
                        The exam is timed, but take longer if you need it
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentPage === 2 && (
            <>
              <h1 className="text-2xl mb-4 font-rounded-heavy mx-4 md:mx-0 text-left">
                About Medly Mocks
              </h1>
              <div className="text-left w-[90%]">
                <p className="text-base mb-2 text-gray-700">
                  These Medly Mock papers have been written by our team to be as
                  close to your real exams as possible.
                </p>
                <p className="text-base mb-2 text-gray-700">
                  These papers have not been endorsed, or written by Exam
                  Boards.
                </p>
                <p className="text-base mb-2 text-gray-700">
                  These are for practice purposes only and do not predict or
                  guarantee your performance in official examinations.
                </p>
                <p className="text-base mb-2 text-gray-700">
                  By using our mock exams, you acknowledge that results may vary
                  from actual exam outcomes.
                </p>
              </div>
            </>
          )}

          {currentPage === 3 && (
            <>
              <h1 className="text-2xl mb-4 font-rounded-heavy mx-4 md:mx-0 ">
                Using Medly Canvas
              </h1>
              <div className="text-left mb-6">
                <p className="text-base mb-4 text-gray-700 w-[90%]">
                  To write your answers, just click anywhere on the Medly
                  Canvas. Try it below!
                </p>

                <div
                  className="w-full h-[300px] bg-[white] rounded-lg relative"
                  style={{
                    ...(typeof window !== "undefined" &&
                    window.innerWidth >= 768
                      ? {
                          backgroundImage:
                            "radial-gradient(#f2f2f7 2px, transparent 0)",
                          backgroundSize: "32px 32px",
                          backgroundPosition: "0 0",
                          position: "relative",
                          overflow: "hidden",
                        }
                      : {}),
                  }}
                >
                  <SketchCanvas
                    inputMode={inputMode}
                    setInputMode={setInputMode}
                    isReadOnly={false}
                    isQuestionMarked={false}
                    canvas={canvasPage2}
                    canvasMessage={undefined}
                    updateQuestionCanvas={(_, __, newCanvas) =>
                      setCanvasPage2(newCanvas)
                    }
                    questionGroupId={0}
                    questionLegacyId={"tutorial_canvas_1"}
                    questionAnnotations={undefined}
                    handleSendMessage={() => {}}
                    shimmerTextboxIndices={[]}
                    fadeInTextboxIndices={[]}
                  />
                  <SketchToolbar
                    mode={inputMode}
                    onSelectMode={() => setInputMode("select")}
                    onTextMode={() => setInputMode("text")}
                    onMathMode={() => setInputMode("math")}
                    onMessageMode={() => setInputMode("message")}
                  />
                </div>
              </div>
            </>
          )}

          {((!showGradeInput && currentPage === 4) ||
            (showGradeInput && currentPage === 4)) && (
            <>
              <h1 className="text-2xl mb-4 font-rounded-heavy mx-4 md:mx-0">
                Using Medly Canvas
              </h1>
              <div className="text-left mb-6 w-full">
                <p className="text-base mb-4 text-gray-700">
                  Click and drag text to move, double click to edit text.
                </p>

                <div
                  className="w-full h-[300px] bg-[white] rounded-lg relative"
                  style={{
                    ...(typeof window !== "undefined" &&
                    window.innerWidth >= 768
                      ? {
                          backgroundImage:
                            "radial-gradient(#f2f2f7 2px, transparent 0)",
                          backgroundSize: "32px 32px",
                          backgroundPosition: "0 0",
                          position: "relative",
                          overflow: "hidden",
                        }
                      : {}),
                  }}
                >
                  <SketchCanvas
                    inputMode={inputMode}
                    setInputMode={setInputMode}
                    isReadOnly={false}
                    isQuestionMarked={false}
                    canvas={canvasPage3}
                    canvasMessage={undefined}
                    updateQuestionCanvas={(_, __, newCanvas) =>
                      setCanvasPage3(newCanvas)
                    }
                    questionGroupId={0}
                    questionLegacyId={"tutorial_canvas_2"}
                    questionAnnotations={undefined}
                    handleSendMessage={() => {}}
                    shimmerTextboxIndices={[]}
                    fadeInTextboxIndices={[]}
                  />
                  <SketchToolbar
                    mode={inputMode}
                    onSelectMode={() => setInputMode("select")}
                    onTextMode={() => setInputMode("text")}
                    onMathMode={() => setInputMode("math")}
                    onMessageMode={() => setInputMode("message")}
                  />
                </div>
              </div>
            </>
          )}

          {/* Only render page 5 if showGradeInput is true */}
          {showGradeInput && currentPage === 5 && (
            <>
              <h1 className="text-2xl mb-4 font-rounded-heavy mx-4 md:mx-0 text-left">
                Before you start
              </h1>
              <div className="text-left w-[100%]">
                <p className="text-base mb-4 text-gray-700">
                  What is your current or most recent grade?
                </p>
                <Scale
                  options={gradeOptions}
                  value={currentGrade}
                  onChange={(value) => setCurrentGrade(value)}
                />

                <p className="text-base mt-10 mb-4 text-gray-700">
                  What is your predicted grade?
                </p>
                <Scale
                  options={gradeOptions}
                  value={targetGrade}
                  onChange={(value) => setTargetGrade(value)}
                />
              </div>
            </>
          )}

          {/* Adjust the final page to be either 5 or 6 depending on showGradeInput */}
          {currentPage === (showGradeInput ? 6 : 5) && (
            <>
              <h1 className="text-2xl mb-4 font-rounded-heavy mx-4 md:mx-0 text-left">
                Ready to start?
              </h1>
              <div className="text-left w-[90%]">
                <p className="text-base mb-2 text-gray-700">
                  Your mock exam will begin once you click &apos;Start&apos;.
                </p>
                <p className="text-base mb-2 text-gray-700">
                  We will save your answers as you progress.
                </p>
                <p className="text-base mb-2 text-gray-700">Good luck!</p>
              </div>
            </>
          )}

          <div className="w-full gap-2 flex flex-col pt-5">
            <div className="flex justify-between items-center w-full mb-4">
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <PrimaryButtonClicky
                    buttonText="Back"
                    showKeyboardShortcut={false}
                    doesStretch={false}
                    onPress={prevPage}
                    isLong={true}
                  />
                )}
                <PrimaryButtonClicky
                  buttonText={currentPage === totalPages ? "Start" : "Next"}
                  showKeyboardShortcut={false}
                  doesStretch={false}
                  buttonState={isGradePageComplete ? "filled" : "greyed"}
                  disabled={!isGradePageComplete}
                  onPress={isGradePageComplete ? nextPage : undefined}
                  isLong={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperTutorialModal;
