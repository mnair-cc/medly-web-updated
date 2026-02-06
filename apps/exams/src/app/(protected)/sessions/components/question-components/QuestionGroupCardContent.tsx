import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import {
  preprocessLaTeX,
  removeAltText,
} from "@/app/_hooks/useLatexPreprocessing";
import { Decoration, QuestionWithMarkingResult } from "@/app/types/types";
import "katex/dist/katex.min.css";
import { ReactNode, useEffect, useRef, useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkEmoji from "remark-gemoji";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import supersub from "remark-supersub";
import styles from "../practice.module.css";
import QuestionGroupCardStem from "./QuestionGroupCardStem";
import { QuestionTextRenderer } from "./QuestionTextRenderer";

const QuestionGroupCardContent = ({
  paperId,
  currentQuestionIndex,
  currentQuestionPartIndex,
  currentQuestionWithMarkingResult,
  userAnswer,
  updateQuestionUserAnswer,
  highlightedText,
  showLineNumbers = false,
  combinedDecorations,
  selectedDecorationIndex,
  isAnnotating = false,
}: {
  paperId?: string;
  currentQuestionIndex: number;
  currentQuestionPartIndex: number;
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  userAnswer: string | string[] | { left?: string; right?: string } | undefined;
  updateQuestionUserAnswer: (
    questionGroupId: number,
    questionLegacyId: string,
    answer: string | string[] | { left?: string; right?: string },
  ) => void;
  highlightedText: string[];
  showLineNumbers: boolean;
  combinedDecorations: Decoration[];
  selectedDecorationIndex?: number | null;
  isAnnotating?: boolean;
}) => {
  // Line number state management
  const questionTextRef = useRef<HTMLDivElement>(null);
  const [lineNumbers, setLineNumbers] = useState<
    { number: number; top: number }[]
  >([]);
  const [lineHeight, setLineHeight] = useState(21); // Default line height

  // Calculate visual line numbers for QuestionTextRenderer
  const calculateVisualLineNumbers = () => {
    if (!questionTextRef.current) return;

    const contentElement = questionTextRef.current;
    const paragraphs = contentElement.querySelectorAll("p");
    const calculatedLineNumbers: { number: number; top: number }[] = [];

    // Get the computed style for font size and line height from the content
    let computedLineHeight = lineHeight;
    if (paragraphs.length > 0) {
      const computedStyle = window.getComputedStyle(paragraphs[0]);
      const fontSize = parseInt(computedStyle.fontSize);
      let styleLineHeight = parseInt(computedStyle.lineHeight);

      if (isNaN(styleLineHeight) || styleLineHeight === 0) {
        styleLineHeight = Math.round(fontSize * 1.4);
      }

      if (!isNaN(styleLineHeight) && styleLineHeight > 0) {
        computedLineHeight = styleLineHeight;
        setLineHeight(styleLineHeight);
      }
    }

    let lineCount = 1;

    paragraphs.forEach((paragraph) => {
      const paragraphRect = paragraph.getBoundingClientRect();
      const contentRect = contentElement.getBoundingClientRect();
      const paragraphTop = paragraphRect.top - contentRect.top;
      const paragraphHeight = paragraph.offsetHeight;

      const linesInParagraph = Math.max(
        1,
        Math.round(paragraphHeight / computedLineHeight),
      );

      // Add line numbers for each line in this paragraph
      for (let i = 0; i < linesInParagraph; i++) {
        calculatedLineNumbers.push({
          number: lineCount + i,
          top: paragraphTop + i * computedLineHeight,
        });
      }

      lineCount += linesInParagraph;
    });

    setLineNumbers(calculatedLineNumbers);
  };

  // Calculate line numbers when question text changes
  useEffect(() => {
    if (
      questionTextRef.current &&
      currentQuestionWithMarkingResult.questionType !==
        "fill_in_the_gaps_text" &&
      currentQuestionWithMarkingResult.questionType !==
        "fill_in_the_gaps_number"
    ) {
      setTimeout(() => {
        calculateVisualLineNumbers();
      }, 300);
    }
  }, [
    currentQuestionWithMarkingResult.questionText,
    currentQuestionWithMarkingResult.questionType,
  ]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (
        currentQuestionWithMarkingResult.questionType !==
          "fill_in_the_gaps_text" &&
        currentQuestionWithMarkingResult.questionType !==
          "fill_in_the_gaps_number"
      ) {
        calculateVisualLineNumbers();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentQuestionWithMarkingResult.questionType]);

  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights || !highlights.length) {
      return text;
    }

    // Escape all regex special characters, including colons
    const escapedHighlights = highlights.map((h) =>
      h.replace(/[[\]{}()*+?.\\^$|]/g, "\\$&"),
    );

    // Create a regex that matches any of the highlight strings (removed 'i' flag)
    const highlightRegex = new RegExp(`(${escapedHighlights.join("|")})`, "g");

    const parts = text.split(highlightRegex);
    return parts.map((part, index) => {
      // Case-sensitive comparison (removed toLowerCase)
      const isHighlighted = highlights.some((highlight) => part === highlight);

      return isHighlighted ? (
        <span
          key={`${part}-${index}`}
          className="bg-[#CDEFFF] px-1 -mx-1 py-0.5 -my-0.5 rounded-[4px] text-black underline underline-offset-2 decoration-[2px] decoration-[#05B0FF]"
        >
          {part}
        </span>
      ) : (
        part
      );
    });
  };

  return (
    <div
      className={`overflow-y-scroll overflow-y-scroll-question leading-6 relative px-0 pb-4 ${
        currentQuestionWithMarkingResult.legacyId?.includes("EngLang")
          ? "md:pt-0"
          : "md:pt-0"
      }`}
    >
      {/* <div className="flex flex-row gap-1 px-4 pt-5 font-rounded-heavy items-center text-[#05B0FF]">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M23.0879 13.6543C23.0879 18.6289 18.9746 22.7422 13.9912 22.7422C9.0166 22.7422 4.90332 18.6289 4.90332 13.6543C4.90332 8.67969 9.00781 4.56641 13.9824 4.56641C18.9658 4.56641 23.0879 8.67969 23.0879 13.6543Z" fill="#05B0FF" />
          <path d="M13.7979 17.1348C13.6133 17.4248 13.3408 17.583 13.0156 17.583C12.6904 17.583 12.4355 17.4424 12.1982 17.1436L10.124 14.6211C9.97461 14.4277 9.89551 14.2344 9.89551 14.0234C9.89551 13.584 10.2383 13.2324 10.6777 13.2324C10.9326 13.2324 11.1436 13.3291 11.3545 13.6016L12.9893 15.667L16.4873 10.0859C16.6719 9.78711 16.9092 9.6377 17.1729 9.6377C17.5947 9.6377 17.9814 9.92773 17.9814 10.3672C17.9814 10.5693 17.8848 10.7803 17.7617 10.9648L13.7979 17.1348Z" fill="white" />
        </svg>

        <p>
          Multiple Choice
        </p>
      </div> */}
      {false &&
        currentQuestionPartIndex == 0 &&
        !currentQuestionWithMarkingResult.legacyId?.includes("EngLang") && (
          <QuestionGroupCardStem
            currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
            currentQuestionIndex={currentQuestionIndex}
            decorations={combinedDecorations}
            isAnnotating={isAnnotating}
          />
        )}
      <div className="flex flex-row md:pt-5 px-2 md:px-5">
        {/* {currentQuestionWithMarkingResult.legacyId?.includes("aqa") ? (
          <div className="flex flex-row gap-0 -ml-10 mr-4">
            <div
              className={`text-[15px] mt-[-2px] h-6 w-6 flex items-center justify-center border border-r-0 border-black font-medium ${currentQuestionWithMarkingResult.annotatedAnswer
                ? currentQuestionWithMarkingResult.userMark ===
                  currentQuestionWithMarkingResult.maxMark
                  ? "text-[#7CC500]" // Green for full marks
                  : currentQuestionWithMarkingResult.userMark === 0
                    ? "text-[#FF4B4C]" // Red for zero marks
                    : "text-[#FFA935]" // Orange for partial marks
                : "text-[black]" // Blue if not yet answered
                } text-black`}
            >
              {(currentQuestionIndex + 1).toString().length === 1
                ? `0`
                : (currentQuestionIndex + 1).toString()[0]}
            </div>
            <div
              className={`text-[15px] mt-[-2px] h-6 w-6 flex items-center justify-center border border-black font-medium ${currentQuestionWithMarkingResult.annotatedAnswer
                ? currentQuestionWithMarkingResult.userMark ===
                  currentQuestionWithMarkingResult.maxMark
                  ? "text-[#7CC500]" // Green for full marks
                  : currentQuestionWithMarkingResult.userMark === 0
                    ? "text-[#FF4B4C]" // Red for zero marks
                    : "text-[#FFA935]" // Orange for partial marks
                : "text-[black]" // Blue if not yet answered
                } text-black`}
            >
              {(currentQuestionIndex + 1).toString().length === 1
                ? currentQuestionIndex + 1
                : (currentQuestionIndex + 1).toString()[1]}
            </div>
            <div className="px-1">.</div>
            <div
              className={`text-[15px] mt-[-2px] h-6 w-6 flex items-center justify-center border border-black font-medium ${currentQuestionWithMarkingResult.annotatedAnswer
                ? currentQuestionWithMarkingResult.userMark ===
                  currentQuestionWithMarkingResult.maxMark
                  ? "text-[#7CC500]" // Green for full marks
                  : currentQuestionWithMarkingResult.userMark === 0
                    ? "text-[#FF4B4C]" // Red for zero marks
                    : "text-[#FFA935]" // Orange for partial marks
                : "text-[black]" // Blue if not yet answered
                } text-black`}
            >
              {currentQuestionPartIndex + 1}
            </div>
          </div>
        ) : (
          <div
            className={`text-[15px] mt-[-2px] font-medium mr-5 ${currentQuestionWithMarkingResult.annotatedAnswer
              ? currentQuestionWithMarkingResult.userMark ===
                currentQuestionWithMarkingResult.maxMark
                ? "text-[#7CC500]" // Green for full marks
                : currentQuestionWithMarkingResult.userMark === 0
                  ? "text-[#FF4B4C]" // Red for zero marks
                  : "text-[#FFA935]" // Orange for partial marks
              : "text-[black]" // Blue if not yet answered
              } text-black`}
          >
            {"(" + String.fromCharCode(97 + currentQuestionPartIndex) + ")"}
          </div>
        )} */}

        {
          <div className="flex-1">
            {currentQuestionWithMarkingResult.questionType ===
              "fill_in_the_gaps_text" ||
            currentQuestionWithMarkingResult.questionType ===
              "fill_in_the_gaps_number" ? (
              <div className="inline">
                {currentQuestionWithMarkingResult.questionText
                  .split(/(\{[A-Z]\})/)
                  .map((part, index) => {
                    if (part.match(/\{[A-Z]\}/)) {
                      const answerKey = part.replace(/[{}]/g, "");

                      const answerIndex = answerKey.charCodeAt(0) - 65; // Convert A->0, B->1, etc.

                      const userAnswerForThisGap = Array.isArray(userAnswer)
                        ? userAnswer[answerIndex]
                        : undefined;

                      const isMarked =
                        currentQuestionWithMarkingResult.userMark !== undefined;

                      const isCorrect =
                        isMarked &&
                        currentQuestionWithMarkingResult.annotatedAnswer &&
                        typeof currentQuestionWithMarkingResult.annotatedAnswer[
                          answerIndex
                        ] === "object" &&
                        "isCorrect" in
                          currentQuestionWithMarkingResult.annotatedAnswer[
                            answerIndex
                          ] &&
                        currentQuestionWithMarkingResult.annotatedAnswer[
                          answerIndex
                        ].isCorrect;

                      return (
                        <span
                          key={index}
                          className="inline-block m-0.5 leading-5"
                        >
                          {userAnswerForThisGap ? (
                            <PrimaryButtonClicky
                              buttonText={userAnswerForThisGap}
                              disabled={isMarked}
                              onPress={() => {
                                if (Array.isArray(userAnswer)) {
                                  const newAnswer = [...userAnswer];

                                  newAnswer[answerIndex] = "";

                                  updateQuestionUserAnswer(
                                    currentQuestionWithMarkingResult.questionGroupId,
                                    currentQuestionWithMarkingResult.legacyId,
                                    newAnswer,
                                  );
                                }
                              }}
                              buttonState={
                                isCorrect
                                  ? "correct"
                                  : isMarked
                                    ? "incorrect"
                                    : undefined
                              }
                              showKeyboardShortcut={false}
                            />
                          ) : (
                            <span className="border-b-2 border-gray-300 px-4">
                              &nbsp;
                            </span>
                          )}
                        </span>
                      );
                    }

                    return (
                      <span key={index}>
                        {highlightText(part, highlightedText)}
                      </span>
                    );
                  })}
              </div>
            ) : (
              <div className="relative flex flex-row">
                {/* Line numbers column */}
                {showLineNumbers && (
                  <div className="hidden md:flex absolute left-4 top-0 bottom-0">
                    {lineNumbers.map((line, idx) => (
                      <div
                        key={idx}
                        className="text-[rgba(0,0,0,0.1)] text-right pr-5 absolute"
                        style={{
                          top: `${line.top}px`,
                          height: `${lineHeight}px`,
                          display: "flex",
                          alignItems: "flex-start",
                          paddingTop: "0px",
                          justifyContent: "flex-end",
                          width: "100%",
                        }}
                      >
                        {line.number}
                      </div>
                    ))}
                  </div>
                )}

                {/* Content with left padding to make room for line numbers */}
                <div
                  ref={questionTextRef}
                  className={`${showLineNumbers ? "md:pl-12" : "pl-2"}`}
                >
                  <QuestionTextRenderer
                    text={(() => {
                      // TODO: update database to split question
                      if (
                        currentQuestionWithMarkingResult.subLessonId?.includes(
                          "sat0",
                        ) ||
                        paperId?.includes("Reading")
                      ) {
                        const questionText =
                          currentQuestionWithMarkingResult.questionStem || "";
                        return questionText;
                      }
                      return "";
                    })()}
                    decorations={combinedDecorations}
                    selectedDecorationIndex={selectedDecorationIndex}
                    isAnnotating={isAnnotating}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-row justify-center pr-10 w-full max-w-full overflow-hidden">
              {currentQuestionWithMarkingResult.diagram && (
                <div className="w-full max-w-[640px] overflow-hidden">
                  <ReactMarkdown
                    className={styles.markdownContent}
                    remarkPlugins={[
                      remarkGfm,
                      [remarkMath, { singleDollarTextMath: true }],
                      remarkEmoji,
                      supersub,
                    ]}
                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                    disallowedElements={["strikethrough"]}
                    components={
                      {
                        p: ({ children }: { children: ReactNode }) => (
                          <p
                            className={`${
                              highlightedText.length > 0
                                ? "text-[rgba(0,0,0,0.8)]"
                                : "text-black"
                            }`}
                          >
                            {typeof children === "string"
                              ? highlightText(children, highlightedText)
                              : children}
                          </p>
                        ),
                        img: ({
                          src,
                          alt,
                          title,
                        }: {
                          src?: string;
                          alt?: string;
                          title?: string;
                        }) => (
                          <figure className="my-4">
                            <img
                              src={src}
                              alt={alt || ""}
                              className="max-w-full h-auto max-h-[400px] mx-auto block object-contain"
                            />
                            {title && (
                              <figcaption className="text-center text-sm text-gray-500 mt-2">
                                {title}
                              </figcaption>
                            )}
                          </figure>
                        ),
                        svg: ({
                          children,
                          ...props
                        }: {
                          children: ReactNode;
                          [key: string]: unknown;
                        }) => (
                          <svg
                            {...props}
                            className="max-w-full h-auto mx-auto block"
                            style={{
                              maxHeight: "400px",
                              width: "auto",
                              height: "auto",
                            }}
                          >
                            {children}
                          </svg>
                        ),
                        td: ({ children }: { children: ReactNode }) => (
                          <td className="px-4 border-r border-[#f2f2f7] text-center">
                            {typeof children === "string"
                              ? highlightText(children, highlightedText)
                              : children}
                          </td>
                        ),
                        th: ({ children }: { children: ReactNode }) => (
                          <th className="px-4 border-b border-r bg-[#F8F8FB] border-[#f2f2f7] font-medium text-center">
                            {typeof children === "string"
                              ? highlightText(children, highlightedText)
                              : children}
                          </th>
                        ),
                      } as Components
                    }
                  >
                    {removeAltText(
                      preprocessLaTeX(currentQuestionWithMarkingResult.diagram),
                    )}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            <div
              className={`hidden -mt-2 text-[15px] font-medium flex flex-row justify-end items-end text-black
                ${
                  currentQuestionWithMarkingResult.annotatedAnswer
                    ? currentQuestionWithMarkingResult.userMark ===
                      currentQuestionWithMarkingResult.maxMark
                      ? "text-[#7CC500]" // Green for full marks
                      : currentQuestionWithMarkingResult.userMark === 0
                        ? "text-[#FF4B4C]" // Red for zero marks
                        : "text-[#FFA935]" // Orange for partial marks
                    : "text-[black]" // Blue if not yet answered
                }
                `}
            >
              {currentQuestionWithMarkingResult.markMax === null ||
                ((currentQuestionWithMarkingResult.markMax ?? 0) < 8 && (
                  <div className="flex flex-row items-center mr-3">
                    {false && currentQuestionWithMarkingResult.userMark
                      ? [
                          ...Array(
                            Math.max(
                              0,
                              Math.floor(
                                currentQuestionWithMarkingResult.userMark ?? 0,
                              ),
                            ),
                          ),
                        ].map((_, i) => (
                          <svg
                            key={i}
                            width="24"
                            height="24"
                            viewBox="0 0 47 47"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="-mr-[12px]"
                          >
                            <path
                              d="M38.2546 22.9197C38.2546 30.9935 31.5743 37.6744 23.4851 37.6744C15.411 37.6744 8.73047 30.9938 8.73047 22.9197C8.73047 14.845 15.3969 8.16504 23.4704 8.16504C31.5602 8.16504 38.2546 14.8466 38.2546 22.9197Z"
                              fill={
                                currentQuestionWithMarkingResult.annotatedAnswer
                                  ? currentQuestionWithMarkingResult.userMark ===
                                    currentQuestionWithMarkingResult.maxMark
                                    ? "#7CC500" // Green for full marks
                                    : currentQuestionWithMarkingResult.userMark ===
                                        0
                                      ? "#FF4B4C" // Red for zero marks
                                      : "#FFA935" // Orange for partial marks
                                  : "#00AEFF"
                              } // Blue if not yet answered
                              stroke="white"
                            />
                            <path
                              d="M23.1607 28.7619C22.8509 29.2487 22.3936 29.5143 21.8477 29.5143C21.3018 29.5143 20.874 29.2782 20.4757 28.7766L16.9939 24.5425C16.7431 24.2179 16.6104 23.8933 16.6104 23.5393C16.6104 22.8016 17.1857 22.2115 17.9234 22.2115C18.3512 22.2115 18.7053 22.3738 19.0594 22.8311L21.8034 26.2981L27.6752 16.9299C27.985 16.4283 28.3833 16.1775 28.8259 16.1775C29.534 16.1775 30.1832 16.6643 30.1832 17.402C30.1832 17.7413 30.0209 18.0954 29.8143 18.4052L23.1607 28.7619Z"
                              fill="white"
                            />
                          </svg>
                        ))
                      : null}
                  </div>
                ))}

              {currentQuestionWithMarkingResult?.annotatedAnswer &&
              currentQuestionWithMarkingResult?.maxMark !== null ? (
                <>
                  {"["}
                  {currentQuestionWithMarkingResult.userMark}/
                  {currentQuestionWithMarkingResult.maxMark}{" "}
                  {currentQuestionWithMarkingResult.maxMark === 1
                    ? "mark"
                    : "marks"}
                  {"]"}
                </>
              ) : (
                <>
                  {"["}
                  {currentQuestionWithMarkingResult.maxMark}{" "}
                  {currentQuestionWithMarkingResult.maxMark === 1
                    ? "mark"
                    : "marks"}
                  {"]"}
                </>
              )}
            </div>
          </div>
        }
      </div>
    </div>
  );
};

export default QuestionGroupCardContent;
