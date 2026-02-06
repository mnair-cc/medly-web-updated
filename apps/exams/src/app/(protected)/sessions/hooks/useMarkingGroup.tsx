import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { nextApiClient, curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import { MarkingContext, MarkingResult, AnswerPair } from "@/app/types/types";
import { SessionType } from "@/app/(protected)/sessions/types";
import { toast } from "sonner";
import {
  buildCanvasLatexSummary,
  renderLinesToPngBase64,
} from "@/app/_lib/utils/utils";
import { checkAnswerMatch } from "@/app/(protected)/sessions/components/question-components/answer-section/SpotQuestion";
import { queryKeys } from "@/app/_lib/query-keys";
interface UseMarkingGroupProps {
  socket: Socket | null;
  socketError: Error | null;
  setSocketError: (error: Error | null) => void;
  sessionType: SessionType;
  subjectId?: string;
  lessonId?: string;
  paperId?: string;
  skipMarking?: boolean;
  isSolvedWithMedly?: boolean;
  getMessages?: () => any[];
}

export const useMarkingGroup = ({
  socket,
  socketError,
  setSocketError,
  sessionType,
  subjectId,
  lessonId,
  paperId,
  skipMarking = false,
  isSolvedWithMedly = false,
  getMessages,
}: UseMarkingGroupProps) => {
  const queryClient = useQueryClient();
  const [isMarking, setIsMarking] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [markingContext, setMarkingContext] = useState<MarkingContext>();
  const [markingResult, setMarkingResult] = useState<MarkingResult | null>(
    null
  );
  const [error] = useState<Error | null>(null);
  const [markingTimeoutsMap, setMarkingTimeoutsMap] = useState<
    Record<string, NodeJS.Timeout>
  >({});
  const [groupTimeoutId, setGroupTimeoutId] = useState<NodeJS.Timeout | null>(
    null
  );
  const [expectedResponses, setExpectedResponses] = useState(0);
  const [receivedResponses, setReceivedResponses] = useState(0);

  useEffect(() => {
    return () => {
      // Clear all timeouts on unmount
      Object.values(markingTimeoutsMap).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });

      if (groupTimeoutId) {
        clearTimeout(groupTimeoutId);
      }
    };
  }, [markingTimeoutsMap, groupTimeoutId]);

  useEffect(() => {
    if (!socket || socketError) return;

    socket.on("error_message", () => {
      setIsMarking(false);
      setMarkingResult(null);

      // Reset response counters
      setExpectedResponses(0);
      setReceivedResponses(0);

      // Clear all timeouts on error
      Object.values(markingTimeoutsMap).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      setMarkingTimeoutsMap({});

      if (groupTimeoutId) {
        clearTimeout(groupTimeoutId);
        setGroupTimeoutId(null);
      }

      toast.error("Failed to mark question. Please try again.");
    });

    socket.on("ao_analysis", (data) => {
      // console.log("ao_analysis", data);
    });

    socket.on("feedback_points", (data) => {
      // console.log("feedback_points", data);
    });

    socket.on("annotations", (data) => {
      // console.log("annotations", data);

      // Emit partial marking result with just annotations
      if (data.annotations && markingContext?.questionLegacyId) {
        const partialMarkingResult: MarkingResult = {
          questionLegacyId: markingContext.questionLegacyId,
          annotations: data.annotations,
          // userAnswer: data.userAnswer || "",
          annotatedAnswer: "",
          markingTable: "",
          markMax: markingContext.markMax || 0,
          userMark: undefined,
          canvas: markingContext.canvas || [],
          messages: [],
          messageCount: 0,
          isSolvedWithMedly,
          isMarked: false, // Still being marked
        };
        setMarkingResult(partialMarkingResult);
      }
    });

    socket.on("annotated_answer", () => {
      // console.info("Received annotation:", data);
    });

    socket.on("finished_annotating", () => {
      // console.info("Finished annotating:", data);
    });

    socket.on("marking_table", (data) => {
      // console.log("marking_table", data);

      // Emit partial marking result with marking table
      // Merge with existing marking result if annotations already received
      if (typeof data === "string" && markingContext?.questionLegacyId) {
        setMarkingResult((prev) => {
          const updatedResult: MarkingResult = {
            questionLegacyId: markingContext.questionLegacyId,
            annotations: prev?.annotations || { strong: [], weak: [] },
            // userAnswer: prev?.userAnswer || "",
            annotatedAnswer: prev?.annotatedAnswer || "",
            markingTable: data, // New marking table
            markMax: markingContext.markMax || 0,
            userMark: undefined, // Don't have mark yet
            canvas: markingContext.canvas || [],
            messages: prev?.messages || [],
            messageCount: prev?.messageCount || 0,
            isSolvedWithMedly,
            isMarked: false, // Still being marked
          };
          return updatedResult;
        });
      }
    });

    socket.on("mark", () => {
      // console.info("Received mark:", data);
    });

    socket.on("final_response", async (data) => {
      // Clear the specific timeout for this question ID
      if (data.question_id && markingTimeoutsMap[data.question_id]) {
        clearTimeout(markingTimeoutsMap[data.question_id]);
        setMarkingTimeoutsMap((prev) => {
          const updated = { ...prev };
          delete updated[data.question_id];
          return updated;
        });
      }

      if (markingContext?.userAnswer) {
        let processedAnswer = String(markingContext.userAnswer);

        if (data.weak_sentences && data.weak_sentences.length > 0) {
          data.weak_sentences.forEach((sentence: string) => {
            if (processedAnswer.includes(sentence)) {
              processedAnswer = processedAnswer.replace(
                new RegExp(
                  sentence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  "g"
                ),
                `**${sentence}**`
              );
            }
          });
        }

        if (data.strong_sentences && data.strong_sentences.length > 0) {
          data.strong_sentences.forEach((sentence: string) => {
            if (processedAnswer.includes(sentence)) {
              processedAnswer = processedAnswer.replace(
                new RegExp(
                  sentence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  "g"
                ),
                `\`${sentence}\``
              );
            }
          });
        }

        data.annotated_answer = processedAnswer;
      }

      if (
        // !markingContext ||
        // !markingContext?.questionLegacyId ||
        // !(markingContext?.userAnswer || markingContext?.canvas) ||
        // !markingContext?.markMax ||
        !data.marking_table
      ) {
        // toast.error("Marking failed. Please try again.");
        setIsMarking(false);
        return;
      }
      // console.log("final_result", data, markingContext);
      const messages = (() => {
        try {
          return getMessages ? getMessages() : [];
        } catch (error) {
          console.error("Error getting messages:", error);
          return [];
        }
      })();
      const markingResultData = {
        questionLegacyId: data.question_id,
        // userAnswer: String(data.userAnswer || ""),
        // canvas: data.canvas || [],
        // annotatedAnswer: data.annotated_answer || "",
        markingTable: data.marking_table,
        // markMax: data.markMax || 0,
        userMark: Number(data.mark),
        annotations: data.annotations || { strong: [], weak: [] },
        messages,
        messageCount: messages.length,
        isSolvedWithMedly,
        isMarked: true,
        ao_analysis: data.ao_analysis || undefined,
      };
      saveMarkingResult(markingResultData, sessionType);

      // Increment received responses and check if all are done
      setReceivedResponses((prev) => {
        const newCount = prev + 1;
        // console.log(`Received ${newCount}/${expectedResponses} responses`);

        // If all responses received, mark as complete
        if (newCount >= expectedResponses && expectedResponses > 0) {
          setIsMarking(false);
          setExpectedResponses(0);
          setReceivedResponses(0);
        }

        return newCount;
      });
    });

    return () => {
      socket.off("annotated_answer");
      socket.off("finished_annotating");
      socket.off("marking_table");
      socket.off("mark");
      socket.off("final_response");
      socket.off("error_message");
    };
  }, [
    socket,
    socketError,
    markingContext,
    lessonId,
    paperId,
    subjectId,
    markingTimeoutsMap,
    expectedResponses,
  ]);

  const handleMarkQuestion = async (markingContext: MarkingContext) => {
    let userAnswer: string | string[] | { left?: string; right?: string } = "";
    let annotatedAnswer: string | AnswerPair[] = "";
    let userMark = 0;
    let markingTable = "";

    if (skipMarking) {
      const messages = (() => {
        try {
          return getMessages ? getMessages() : [];
        } catch (error) {
          console.error("Error getting messages:", error);
          return [];
        }
      })();
      await saveMarkingResult(
        {
          questionLegacyId: markingContext.questionLegacyId,
          userAnswer: String(markingContext.userAnswer || " "),
          canvas: markingContext.canvas || [],
          annotatedAnswer: "",
          markingTable: "",
          markMax: markingContext.markMax,
          userMark: undefined,
          annotations: [],
          messages,
          messageCount: messages.length,
          isSolvedWithMedly,
          isMarked: false,
        },
        sessionType
      );
      return;
    }

    // Clear any existing timeout for this question
    if (
      markingContext.questionLegacyId &&
      markingTimeoutsMap[markingContext.questionLegacyId]
    ) {
      clearTimeout(markingTimeoutsMap[markingContext.questionLegacyId]);
      setMarkingTimeoutsMap((prev) => {
        const updated = { ...prev };
        delete updated[markingContext.questionLegacyId];
        return updated;
      });
    }

    const normalizeWhitespace = (text: string) =>
      text.trim().replace(/\s+/g, " ");

    const normalizeDashes = (text: string) =>
      text.replace(/[\u2013\u2014]/g, "-");

    switch (markingContext.questionType) {
      case "calculate":
      case "compare":
      case "define":
      case "describe":
      case "explain":
      case "long_answer":
      case "state":
      case "short_answer":
      case "write": {
        if (socket && socket.connected === false) {
          socket.disconnect();
          socket.connect();

          // Give the socket a moment to reconnect before proceeding
          const isConnected = await new Promise<boolean>((resolve) => {
            // Set a timeout in case connection takes too long
            const timeoutId = setTimeout(() => resolve(false), 3000);

            // Listen for successful connection
            socket.once("connect", () => {
              clearTimeout(timeoutId);
              setSocketError(null);
              resolve(true);
            });
          });

          if (!isConnected) {
            setIsMarking(false);
            toast.error(
              "Failed to connect to marking service. Please try again."
            );
            return;
          }
        }

        if (!socket || !markingContext || socketError) {
          setIsMarking(false);
          toast.error(
            "Poor network connection. Please refresh the page and try again."
          );
          return;
        }

        setMarkingContext(markingContext);

        // Process canvas data (both Desmos expressions and sketch canvas maths)
        let canvasLatexSummary = "";
        let canvasStrokesPngBase64 = "";

        // Collect all expressions from both Desmos and sketch canvas
        const allExpressions: any[] = [];

        // Add Desmos expressions if they exist
        if (
          markingContext.desmosExpressions &&
          markingContext.desmosExpressions.length > 0
        ) {
          allExpressions.push(...markingContext.desmosExpressions);
        }

        // Add sketch canvas maths if they exist
        if (
          markingContext.canvas?.maths &&
          markingContext.canvas.maths.length > 0
        ) {
          allExpressions.push(...markingContext.canvas.maths);
        }

        // Check if canvas paths exist
        const hasCanvasPaths =
          markingContext.canvas?.paths &&
          markingContext.canvas.paths.length > 0;

        // Build question text with stem if available (needed for header)
        const questionWithStem = markingContext.questionStem
          ? `${markingContext.questionStem}\n\n${markingContext.question}`
          : String(markingContext.question);

        // Build canvas latex summary and PNG from combined expressions and canvas paths
        if (allExpressions.length > 0 || hasCanvasPaths) {
          // Build canvas latex summary from all expressions
          const canvasLatexSummaryArr = buildCanvasLatexSummary(allExpressions);
          canvasLatexSummary = JSON.stringify(canvasLatexSummaryArr);

          // Build PNG base64 with question text header, canvas paths at the top, followed by expression strokes
          try {
            const combinedStrokes: any[] = [];

            // Add canvas paths first (transformed to expected format)
            if (hasCanvasPaths && markingContext.canvas?.paths) {
              combinedStrokes.push({
                strokes: {
                  paths: markingContext.canvas.paths.map((path: any) => ({
                    paths: path.points || path.paths,
                  })),
                },
              });
            }

            // Add expressions second
            if (allExpressions.length > 0) {
              combinedStrokes.push(
                ...allExpressions.map((l: any) => ({
                  strokes: l?.strokes,
                }))
              );
            }

            canvasStrokesPngBase64 = await renderLinesToPngBase64(
              combinedStrokes,
              {
                headers: [questionWithStem],
                headerMarginBottom: 16, // slight gap between question and answer
                padding: 8,
                background: "#ffffff",
                strokeColor: "#2563eb",
                lineWidth: 4,
                maxWidth: 900,
              }
            );
          } catch (e) {
            console.error("Failed to render strokes PNG", e);
            // Continue without base64 data
          }
        }

        // Filter out paths from canvas data before emitting
        const canvasWithoutPaths = markingContext.canvas
          ? (() => {
            const { paths, ...rest } = markingContext.canvas;
            return rest;
          })()
          : {};

        const data = {
          answer: String(markingContext.userAnswer).replace(/"/g, "'"),
          canvas: JSON.stringify([canvasWithoutPaths]), // Array format for consistency with practice group
          canvasLatex: canvasLatexSummary,
          canvasStrokes: canvasStrokesPngBase64,
          question: questionWithStem,
          lessonId:
            markingContext.lessonLegacyIds &&
              markingContext.lessonLegacyIds.length > 0
              ? markingContext.lessonLegacyIds[0]
              : lessonId || "",
          markscheme: String(markingContext.correctAnswer),
          markmax: Number(markingContext.markMax),
          id: markingContext.questionLegacyId,
          specification_id: subjectId || "",
        };

        const timeoutId = setTimeout(() => {
          setIsMarking(false);
          // toast.error("Marking failed. Please try again.");
          if (socket) {
            socket.disconnect();
            socket.connect();
          }

          // Remove this specific timeout from the map
          setMarkingTimeoutsMap((prev) => {
            const updated = { ...prev };
            delete updated[markingContext.questionLegacyId];
            return updated;
          });
        }, 60000);

        // Save the timeout in the map with the question ID as the key
        setMarkingTimeoutsMap((prev) => ({
          ...prev,
          [markingContext.questionLegacyId]: timeoutId,
        }));

        if (!subjectId?.includes("Math") && typeof markingContext.correctAnswer === 'string' && (markingContext.correctAnswer.includes("AO") || markingContext.correctAnswer.includes("Level 1"))) {
          socket.emit("markAnswerAO", JSON.stringify(data));
        } else {
          socket.emit("markAnswer", JSON.stringify(data));
        }

        return;
      }

      case "drawing":
        break;
      case "fill_in_the_gaps_number":
        break;
      case "fill_in_the_gaps_text": {
        const userAnswers = markingContext.userAnswer as Array<string>;
        const correctAnswerValues = Object.values(markingContext.correctAnswer);

        const answerPairs: AnswerPair[] = correctAnswerValues.map(
          (correctAnswer, index) => ({
            correctAnswer,
            userAnswer: userAnswers[index],
            isCorrect: compareAnswers(userAnswers[index], correctAnswer),
          })
        );

        userAnswer = userAnswers;
        annotatedAnswer = answerPairs;
        markingTable = generateMarkingTable(answerPairs);
        userMark = answerPairs.filter((pair) => pair.isCorrect).length;
        break;
      }

      case "match_pair": {
        const userAnswers = markingContext.userAnswer as Record<string, string>;

        const answerPairs: AnswerPair[] = Object.entries(userAnswers).map(
          ([left, right]) => ({
            correctAnswer: left,
            userAnswer: right,
            isCorrect: true,
          })
        );

        userAnswer = markingContext.userAnswer;
        userMark = markingContext.markMax;
        markingTable = generateMarkingTable(answerPairs);
        annotatedAnswer = markingTable;
        break;
      }

      case "spot": {
        const userAnswers = markingContext.userAnswer as string[];
        const correctAnswers = markingContext.correctAnswer as {
          [key: string]: string | string[];
        };

        const formatCategories = (value: string | string[]) => {
          const categories = Array.isArray(value) ? value : [value];
          return categories
            .filter((category) => !!category)
            .map((category) => category.trim())
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
            .join(", ");
        };

        const isSpotWithCategories = Object.entries(correctAnswers).every(
          ([key, value]) => (Array.isArray(value) || value !== key)
        );

        // Get unique correct answer patterns (for matching)
        const uniqueCorrectPatterns: string[] = Object.keys(
          correctAnswers
        ).map((key) => {
          const answerValue = correctAnswers[key];
          if (isSpotWithCategories) {
            return `${key} [${formatCategories(answerValue)}]`;
          }
          return Array.isArray(answerValue) ? answerValue[0] : answerValue;
        });

        // Count how many user answers match ANY correct pattern
        // This handles cases like ["...", "...", "...", "..."] where all 4 are the same pattern
        // Each unique user answer that matches counts as 1 correct (up to markMax)
        const matchingUserAnswers = userAnswers.filter((userAnswer) =>
          uniqueCorrectPatterns.some((correctPattern) =>
            checkAnswerMatch(userAnswer, correctPattern)
          )
        );

        // Count unique matching answers (avoid counting duplicates)
        const uniqueMatchingAnswers = [...new Set(matchingUserAnswers)];
        const correctCount = uniqueMatchingAnswers.length;

        // Surplus is any extra selections beyond markMax
        const surplusAnswers = Math.max(0, userAnswers.length - markingContext.markMax);

        // Build answer pairs for display
        // For questions with duplicate correct answers (like 4x "..."), show each user answer
        const answerPairs: AnswerPair[] = userAnswers.map((answer) => {
          const matchingPattern = uniqueCorrectPatterns.find((pattern) =>
            checkAnswerMatch(answer, pattern)
          );
          return {
            correctAnswer: matchingPattern || uniqueCorrectPatterns[0] || "",
            userAnswer: answer,
            isCorrect: !!matchingPattern,
          };
        });

        // Add any missing correct patterns that weren't matched
        const unmatchedPatterns = uniqueCorrectPatterns.filter(
          (pattern) =>
            !userAnswers.some((answer) => checkAnswerMatch(answer, pattern))
        );
        unmatchedPatterns.forEach((pattern) => {
          answerPairs.push({
            correctAnswer: pattern,
            userAnswer: "",
            isCorrect: false,
          });
        });

        userAnswer = userAnswers;
        // Mark = correct unique answers (up to markMax) minus surplus selections
        userMark = Math.min(
          markingContext.markMax,
          Math.max(0, correctCount - surplusAnswers)
        );
        markingTable = generateMarkingTable(answerPairs);
        annotatedAnswer = markingTable;
        break;
      }

      case "fix_sentence": {
        const userText = String(markingContext.userAnswer);
        const correctText = String(markingContext.correctAnswer);

        // Normalize whitespace for comparison (same as component logic)
        const normalizedUser = normalizeDashes(normalizeWhitespace(userText));
        const normalizedCorrect = normalizeDashes(normalizeWhitespace(correctText));

        const isCorrect = normalizedUser === normalizedCorrect;

        userAnswer = userText;
        annotatedAnswer = correctText;
        userMark = isCorrect ? markingContext.markMax : 0;
        markingTable = generateMarkingTable([
          {
            correctAnswer: correctText,
            userAnswer: userText,
            isCorrect,
          },
        ]);
        break;
      }

      case "mcq_multiple": {
        const userAnswers = markingContext.userAnswer as Array<string>;
        const correctAnswerValues = Object.values(markingContext.correctAnswer);

        const surplusAnswers = userAnswers.filter(
          (answer) => !correctAnswerValues.includes(answer)
        ).length;

        const answerPairs: AnswerPair[] = correctAnswerValues.map(
          (correctAnswer) => ({
            correctAnswer,
            userAnswer:
              userAnswers.find((answer) => answer === correctAnswer) || "",
            isCorrect: !!userAnswers.find((answer) => answer === correctAnswer),
          })
        );

        userAnswer = userAnswers;
        userMark = Math.max(
          0,
          answerPairs.filter((pair) => pair.isCorrect).length - surplusAnswers
        );
        markingTable = generateMarkingTable(answerPairs);
        annotatedAnswer = markingTable;
        break;
      }

      case "reorder": {
        const userOrder = markingContext.userAnswer as string[];
        const correctOrder = markingContext.correctAnswer as string[];

        // Award 1 mark for each item in the correct position
        let correctPositions = 0;
        for (let i = 0; i < correctOrder.length; i++) {
          if (userOrder[i] === correctOrder[i]) {
            correctPositions++;
          }
        }

        userAnswer = userOrder;
        userMark = correctPositions;
        markingTable = "";
        annotatedAnswer = "";
        break;
      }

      case "group": {
        const userGroups = markingContext.userAnswer as Record<
          string,
          string[]
        >;
        const correctGroups =
          typeof markingContext.correctAnswer === "string"
            ? JSON.parse(markingContext.correctAnswer)
            : (markingContext.correctAnswer as Record<string, string[]>);

        // Award 1 mark for each item correctly placed in the right category
        let correctPlacements = 0;

        // Iterate through each category in the user's answer
        for (const category in userGroups) {
          const userItems = userGroups[category] || [];
          const correctItems = correctGroups[category] || [];

          // Check each item in the user's category
          for (const item of userItems) {
            if (correctItems.includes(item)) {
              correctPlacements++;
            }
          }
        }

        userAnswer = userGroups;
        userMark = correctPlacements;
        markingTable = "";
        annotatedAnswer = "";
        break;
      }

      case "number": {
        const correctDigits = String(markingContext.correctAnswer);
        const userDigitsArray = markingContext.userAnswer as string[];
        const userAnswerString = userDigitsArray.join("");

        const isCorrect = userAnswerString === correctDigits;

        userAnswer = userDigitsArray;
        userMark = isCorrect ? markingContext.markMax : 0;
        annotatedAnswer = correctDigits;
        markingTable = generateMarkingTable([
          {
            correctAnswer: correctDigits,
            userAnswer: userAnswerString,
            isCorrect,
          },
        ]);
        break;
      }

      case "rearrange":
        break;
      case "mcq":
      case "true_false": {
        userAnswer = String(markingContext.userAnswer);
        annotatedAnswer = String(markingContext.correctAnswer);
        userMark = compareAnswers(
          userAnswer,
          annotatedAnswer,
          markingContext.questionType === "true_false"
        )
          ? markingContext.markMax
          : 0;
        markingTable = generateMarkingTable([
          {
            correctAnswer: String(markingContext.correctAnswer),
            userAnswer,
            isCorrect: compareAnswers(
              String(markingContext.userAnswer),
              String(markingContext.correctAnswer),
              markingContext.questionType === "true_false"
            ),
          },
        ]);
        break;
      }
      default: {
        setIsMarking(false);
        toast.error("This question type is not supported for marking.");
        return;
      }
    }
    const messages = (() => {
      try {
        return getMessages ? getMessages() : [];
      } catch (error) {
        console.error("Error getting messages:", error);
        return [];
      }
    })();
    const markingResult: MarkingResult = {
      questionLegacyId: markingContext.questionLegacyId,
      userAnswer,
      annotatedAnswer,
      markingTable,
      markMax: markingContext.markMax,
      userMark,
      canvas: markingContext.canvas || [],
      messages,
      messageCount: messages.length,
      isSolvedWithMedly,
      isMarked: true,
    };
    await saveMarkingResult(markingResult, sessionType);
  };

  const handleMarkQuestionGroup = async (markingContext: MarkingContext[]) => {
    const markingContextArray = Array.isArray(markingContext)
      ? markingContext
      : [markingContext];

    setIsMarking(true);

    // Count expected socket responses (questions that use socket-based marking)
    const socketBasedQuestions = markingContextArray.filter((context) =>
      [
        "calculate",
        "compare",
        "define",
        "describe",
        "explain",
        "long_answer",
        "state",
        "short_answer",
        "write",
      ].includes(context.questionType)
    );

    const expectedSocketResponses = socketBasedQuestions.length;
    // console.log(
    //   `Expecting ${expectedSocketResponses} socket responses out of ${markingContextArray.length} total questions`
    // );

    setExpectedResponses(expectedSocketResponses);
    setReceivedResponses(0);

    // Set a 30-second timeout for the entire marking process
    if (groupTimeoutId) {
      clearTimeout(groupTimeoutId);
    }

    const timeoutId = setTimeout(() => {
      setIsMarking(false);
      setExpectedResponses(0);
      setReceivedResponses(0);
      // toast.error("Marking timed out after 30 seconds. Please try again.");

      // Clear all question-specific timeouts
      Object.values(markingTimeoutsMap).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      setMarkingTimeoutsMap({});
    }, 60000);

    setGroupTimeoutId(timeoutId);

    try {
      // Process all questions in parallel
      const results = await Promise.allSettled(
        markingContextArray.map((context) => handleMarkQuestion(context))
      );

      // Log any rejected promises for debugging
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`Question ${index} marking failed:`, result.reason);
        }
      });

      // Clear the group timeout once all questions are processed
      if (groupTimeoutId) {
        clearTimeout(groupTimeoutId);
        setGroupTimeoutId(null);
      }

      // If no socket responses expected, mark as complete immediately
      if (expectedSocketResponses === 0) {
        setIsMarking(false);
      }
      // Otherwise, setIsMarking(false) will be called when all socket responses are received
    } catch (error) {
      // Clear the group timeout and handle error
      if (groupTimeoutId) {
        clearTimeout(groupTimeoutId);
        setGroupTimeoutId(null);
      }

      // Clear all question-specific timeouts
      Object.values(markingTimeoutsMap).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      setMarkingTimeoutsMap({});

      // Reset response counters
      setExpectedResponses(0);
      setReceivedResponses(0);

      console.error("Error marking question group:", error);
      toast.error("Error marking questions. Please try again.");
      setIsMarking(false);
    }
  };

  const compareAnswers = (
    userAnswer: string,
    correctAnswer: string,
    toLowerCase = false
  ) => {
    return toLowerCase
      ? userAnswer.toLowerCase() === correctAnswer.toLowerCase()
      : userAnswer === correctAnswer;
  };

  const generateMarkingTable = (answers: AnswerPair[]) => {
    return `| Mark Scheme Point | Student Response | Mark Awarded |
|:-|:-|:-|
${answers
        .map(
          ({ correctAnswer, userAnswer, isCorrect }) =>
            ` |${correctAnswer}|${userAnswer}|${isCorrect ? 1 : 0}|`
        )
        .join("\n")}`;
  };

  const saveMarkingResult = async (
    markingResult: MarkingResult,
    sessionType: SessionType
  ) => {
    // Optimistic UI update - set marking result immediately
    setMarkingResult(markingResult);

    try {
      switch (sessionType) {
        case SessionType.PracticeSession: {
          await curriculumApiV2Client.put(`/lessons/${lessonId}/answers`, {
            answers: [markingResult],
          });

          // Invalidate subject progress cache after successful save
          if (subjectId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.subjectProgress(subjectId),
            });
          }
          break;
        }
        // LessonSession, PaperSession and MockSession saving handled by useSession.debouncedSave, not here
      }
      // setIsMarking(false);
      // setIsMarked(true);
    } catch (error) {
      console.error("Error saving marking result:", error);
      toast.error("Error saving your answer. Please try again.");
      setIsMarking(false);
    }
  };

  const clearMarkingResult = () => {
    setMarkingResult(null);
  };

  return {
    handleMarkQuestionGroup,
    isMarking,
    isMarked,
    setIsMarked,
    markingResult,
    clearMarkingResult,
    error,
  };
};
