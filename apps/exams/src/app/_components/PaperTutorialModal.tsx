"use client";

import { useState } from "react";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import SketchCanvas from "@/app/(protected)/sessions/components/question-components/canvas/SketchCanvas";
import { QuestionWithMarkingResult } from "../types/types";
import Scale from "@/app/(protected)/onboarding/_components/Scale";

interface PaperTutorialModalProps {
  status: "end-paper" | "quit-paper" | "start-paper";
  isOpen: boolean;
  onClose: () => void;
  onClickStartPaper: (currentGrade: string, predictedGrade: string) => void;
  currentQuestionWithMarkingResult: QuestionWithMarkingResult | null;
  showGradeInput: boolean;
}

const PaperTutorialModal = ({
  status,
  isOpen,
  onClose,
  onClickStartPaper,
  currentQuestionWithMarkingResult,
  showGradeInput,
}: PaperTutorialModalProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentGrade, setCurrentGrade] = useState("");
  const [predictedGrade, setPredictedGrade] = useState("");

  if (!isOpen) return null;

  // Only show multiple pages for start-paper
  const showMultiplePages = status === "start-paper";
  const totalPages = showMultiplePages ? (showGradeInput ? 5 : 4) : 1;

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else {
      onClickStartPaper(currentGrade, predictedGrade);
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
    currentPage !== 4 ||
    (currentGrade !== "" && predictedGrade !== "");

  // For demonstration purposes in the modal, we don't need a complete QuestionWithMarkingResult
  // Just provide the minimum needed properties for the SketchCanvas
  const safeCurrentQuestion = {
    id: 0,
    legacyId: "",
    questionId: "",
    questionText: "",
    questionType: "shortAnswer",
    correctAnswer: "",
    createdAt: "",
    maxMark: 0,
    options: [],
    order: 0,
    diagram: "",
    questionStem: "",
    questionStemDiagram: "",
    updatedAt: "",
    questionLegacyId: "",
    annotatedAnswer: undefined,
    markingTable: undefined,
    markMax: 0,
    userAnswer: undefined,
    userMark: undefined,
    canvas: { paths: [], textboxes: [] },
  };

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
          {showMultiplePages ? (
            <>
              {currentPage === 1 && (
                <>
                  <h1 className="text-2xl mb-4 font-rounded-bold mx-4 md:mx-0 text-left">
                    Welcome to Medly Mocks!
                  </h1>
                  <div className="text-left w-[90%]">
                    <p className="text-base mb-2 text-gray-700">
                      The Medly 2025 papers have been written by our team to be
                      as close to your real exams as possible.
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
                      By using our mock exams, you acknowledge that results may
                      vary from actual exam outcomes.
                    </p>
                  </div>
                </>
              )}

              {currentPage === 2 && (
                <>
                  <h1 className="text-2xl mb-4 font-rounded-bold mx-4 md:mx-0 ">
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
                        currentQuestionWithMarkingResult={
                          currentQuestionWithMarkingResult?.canvas
                        }
                        canvas={{
                          paths: [],
                          textboxes: [
                            {
                              id: 1744322386519,
                              x: 258,
                              y: 141.5,
                              text: "Switch between text \nand maths\n       ↓ ",
                              isMath: false,
                            },
                          ],
                        }}
                        onChangeCanvas={(updatedCanvas) => {
                          console.log(updatedCanvas);
                        }}
                        isMarking={false}
                        showToolbar={true}
                        isReadOnly={false}
                      />
                    </div>
                  </div>
                </>
              )}

              {currentPage === 3 && (
                <>
                  <h1 className="text-2xl mb-4 font-rounded-bold mx-4 md:mx-0">
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
                        currentQuestionWithMarkingResult={
                          currentQuestionWithMarkingResult?.canvas
                        }
                        canvas={{
                          paths: [],
                          textboxes: [
                            {
                              id: 1744322428569,
                              x: 40,
                              y: 48.5,
                              text: "Drag me!",
                              isMath: false,
                            },
                            {
                              id: 1744322438628,
                              x: 91,
                              y: 157.5,
                              text: "double\\:click\\:to\\:edit\\:\\to\\frac{2025}{5}",
                              isMath: true,
                            },
                          ],
                        }}
                        onChangeCanvas={(updatedCanvas) => {
                          console.log(updatedCanvas);
                        }}
                        isMarking={false}
                        showToolbar={true}
                        isReadOnly={false}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Only render page 4 if showGradeInput is true */}
              {showGradeInput && currentPage === 4 && (
                <>
                  <h1 className="text-2xl mb-4 font-rounded-bold mx-4 md:mx-0 text-left">
                    Before you start
                  </h1>
                  <div className="text-left w-[100%]">
                    <p className="text-base mb-4 text-gray-700">
                      What is your current or most recent grade?
                    </p>
                    <Scale
                      options={["9", "8", "7", "6", "5", "4", "3", "2", "1"]}
                      value={currentGrade}
                      onChange={(value) => setCurrentGrade(value)}
                    />

                    <p className="text-base mt-10 mb-4 text-gray-700">
                      What is your predicted grade?
                    </p>
                    <Scale
                      options={["9", "8", "7", "6", "5", "4", "3", "2", "1"]}
                      value={predictedGrade}
                      onChange={(value) => setPredictedGrade(value)}
                    />
                  </div>
                </>
              )}

              {/* Adjust the final page to be either 4 or 5 depending on showGradeInput */}
              {currentPage === (showGradeInput ? 5 : 4) && (
                <>
                  <h1 className="text-2xl mb-4 font-rounded-bold mx-4 md:mx-0 text-left">
                    Ready to start?
                  </h1>
                  <div className="text-left w-[90%]">
                    <p className="text-base mb-2 text-gray-700">
                      Your mock exam will begin once you click 'Start'.
                    </p>
                    <p className="text-base mb-2 text-gray-700">
                      We will save your answers as you progress.
                    </p>
                    <p className="text-base mb-2 text-gray-700">Good luck!</p>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <h1 className="text-3xl mb-4 font-rounded-bold mx-4 md:mx-0">
                {status === "end-paper" ? "Finish paper?" : "Exit paper?"}
              </h1>
              <p className="text-base mb-4 w-[80%] text-gray-500">
                {status === "end-paper"
                  ? "Submit your answers for marking. You will be unable to change your answers after you finish."
                  : "You will be unable to change your answers after you exit."}
              </p>
            </>
          )}

          <div className="w-full gap-2 flex flex-col pt-5">
            {showMultiplePages ? (
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
            ) : (
              <>
                <PrimaryButtonClicky
                  buttonText={status === "end-paper" ? "Finish" : "Exit"}
                  showKeyboardShortcut={false}
                  doesStretch={true}
                  buttonState="filled"
                  onPress={onClickConfirm}
                  isLong={true}
                />
                <PrimaryButtonClicky
                  buttonText="Cancel"
                  showKeyboardShortcut={false}
                  doesStretch={true}
                  onPress={onClose}
                  isLong={true}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperTutorialModal;
