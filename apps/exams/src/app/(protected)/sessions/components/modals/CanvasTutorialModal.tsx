"use client";

import { useState } from "react";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import Scale from "@/app/(protected)/onboarding/_components/Scale";
import SketchCanvas from "../question-components/canvas/SketchCanvas";
import { InputMode } from "../../types";
import { Canvas } from "@/app/types/types";
import SketchToolbar from "../footer/SketchToolbar";

const CanvasTutorialModal = ({
  isOpen,
  onClose,
  showGradeInput,
  currentGrade,
  targetGrade,
  setCurrentGrade,
  setTargetGrade,
  gradeOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
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
  const [mathCanvasMode, setMathCanvasMode] = useState<"drawing" | "textbox">(
    "textbox"
  );
  const [canvasPage2, setCanvasPage2] = useState<Canvas>({
    paths: [],
    textboxes: [
      {
        x: 220,
        y: 130.5,
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
  const totalPages = 2;

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else {
      onClose();
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
              <h1 className="text-2xl mb-2 font-rounded-heavy mx-4 md:mx-0 ">
                Medly Canvas Tutorial
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
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-row z-[1000]">
                    <SketchToolbar
                      mode={inputMode}
                      type="toolbar"
                      hideGrabMode={true}
                      hidePenEraser={true}
                      onSelectMode={() => setInputMode("select")}
                      onTextMode={() => setInputMode("text")}
                      onMathMode={() => setInputMode("math")}
                      onPenMode={() => setInputMode("pen")}
                      onEraserMode={() => setInputMode("eraser")}
                      onGrabMode={() => setInputMode("grab")}
                      mathCanvasMode={mathCanvasMode}
                      onMathCanvasModeChange={setMathCanvasMode}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {((!showGradeInput && currentPage === 2) ||
            (showGradeInput && currentPage === 2)) && (
            <>
              <h1 className="text-2xl mb-2 font-rounded-heavy mx-4 md:mx-0">
                Medly Canvas Tutorial
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
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-row z-[1000]">
                    <SketchToolbar
                      mode={inputMode}
                      type="toolbar"
                      hideGrabMode={true}
                      hidePenEraser={true}
                      onSelectMode={() => setInputMode("select")}
                      onTextMode={() => setInputMode("text")}
                      onMathMode={() => setInputMode("math")}
                      onPenMode={() => setInputMode("pen")}
                      onEraserMode={() => setInputMode("eraser")}
                      onGrabMode={() => setInputMode("grab")}
                      mathCanvasMode={mathCanvasMode}
                      onMathCanvasModeChange={setMathCanvasMode}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="w-full gap-2 flex flex-col pt-5">
            <div className="flex justify-between items-center w-full mb-4">
              <span className="text-sm text-gray-500 font-rounded-bold">
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
                  buttonText={
                    currentPage === totalPages ? "I'm Ready!" : "Next"
                  }
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

export default CanvasTutorialModal;
