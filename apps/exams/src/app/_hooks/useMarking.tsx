import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  nextApiClient,
  curriculumApiV2Client,
} from "../_lib/utils/axiosHelper";
import { MarkingContext, MarkingResult, AnswerPair } from "@/app/types/types";
import { SessionType } from "@/app/(protected)/sessions/types";
import { useUser } from "../_context/UserProvider";
import { useHasActivePlan } from "../_context/PlanProvider";
import { useMedlyMondays } from "./useMedlyMondays";
import { toast } from "sonner";
import { queryKeys } from "../_lib/query-keys";
interface UseMarkingProps {
  socket: Socket | null;
  socketError: Error | null;
  setSocketError: (error: Error | null) => void;
  sessionType: SessionType;
  subjectId?: string;
  lessonId?: string;
  paperId?: string;
}

export const useMarking = ({
  socket,
  socketError,
  setSocketError,
  sessionType,
  subjectId,
  lessonId,
  paperId,
}: UseMarkingProps) => {
  const { user, setUser } = useUser();
  const { hasActivePlan } = useHasActivePlan();
  const { isSubjectUnlocked } = useMedlyMondays();
  const queryClient = useQueryClient();
  const [isMarking, setIsMarking] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [markingContext, setMarkingContext] = useState<MarkingContext>();
  const [markingResult, setMarkingResult] = useState<MarkingResult | null>(
    null
  );
  const [error] = useState<Error | null>(null);
  const [markingTimeoutId, setMarkingTimeoutId] =
    useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (markingTimeoutId) {
        clearTimeout(markingTimeoutId);
      }
    };
  }, [markingTimeoutId]);

  useEffect(() => {
    if (!socket || socketError) return;

    socket.on("error_message", () => {
      setIsMarking(false);
      setMarkingResult(null);
      if (markingTimeoutId) {
        clearTimeout(markingTimeoutId);
        setMarkingTimeoutId(null);
      }
      toast.error("Failed to mark question. Please try again.");
    });

    socket.on("annotated_answer", () => {
      // console.info("Received annotation:", data);
    });

    socket.on("finished_annotating", () => {
      // console.info("Finished annotating:", data);
    });

    socket.on("marking_table", () => {
      // console.info("Received marking table:", data);
    });

    socket.on("mark", () => {
      // console.info("Received mark:", data);
    });

    socket.on("final_response", async (data) => {
      if (markingTimeoutId) {
        clearTimeout(markingTimeoutId);
        setMarkingTimeoutId(null);
      }

      if (
        markingContext?.userAnswer &&
        (data.weak_sentences || data.strong_sentences)
      ) {
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
        !markingContext ||
        !markingContext?.questionLegacyId ||
        !markingContext?.userAnswer ||
        !markingContext?.markMax ||
        !data.marking_table
      ) {
        toast.error("Marking failed. Please try again.");
        setIsMarking(false);
        return;
      }
      saveMarkingResult(
        {
          questionLegacyId: markingContext.questionLegacyId,
          userAnswer: String(markingContext.userAnswer),
          canvas: markingContext.canvas || [],
          annotatedAnswer: data.annotated_answer || " ",
          markingTable: data.marking_table,
          markMax: markingContext.markMax,
          userMark: Number(data.mark),
        },
        sessionType
      );
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
    markingTimeoutId,
  ]);

  const handleMarkQuestion = async (markingContext: MarkingContext) => {
    setIsMarking(true);
    let userAnswer: string | string[] | { left?: string; right?: string } = "";
    let annotatedAnswer: string | AnswerPair[] = "";
    let userMark = 0;
    let markingTable = "";

    if (markingTimeoutId) {
      clearTimeout(markingTimeoutId);
    }

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
          toast.error("Failed to mark question. Please try again.");
          return;
        }
        setMarkingContext(markingContext);

        const data = {
          answer: String(markingContext.userAnswer).replace(/"/g, "'"),
          canvas: markingContext.canvas || [],
          question: String(markingContext.question),
          markscheme: String(markingContext.correctAnswer),
          markmax: Number(markingContext.markMax),
          id: markingContext.questionLegacyId,
        };

        const timeoutId = setTimeout(() => {
          setIsMarking(false);
          toast.error("Marking failed. Please try again.");
          if (socket) {
            socket.disconnect();
            socket.connect();
          }
        }, 100000);

        setMarkingTimeoutId(timeoutId);

        if (markingContext.questionLegacyId.includes("aqaGCSEEngLang")) {
          socket.emit("markAnswerEngLang", JSON.stringify(data));
        } else if (markingContext.questionLegacyId.includes("aqaGCSEEngLit")) {
          socket.emit("markAnswerEngLit", JSON.stringify(data));
        } else if (markingContext.questionLegacyId.includes("Maths")) {
          socket.emit("markAnswerMaths", JSON.stringify(data));
        } else if (markingContext.markMax > 6) {
          socket.emit("markAnswerLongAnswer", JSON.stringify(data));
        } else {
          socket.emit("markAnswerV2", JSON.stringify(data));
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

    const markingResult: MarkingResult = {
      questionLegacyId: markingContext.questionLegacyId,
      userAnswer,
      annotatedAnswer,
      markingTable,
      markMax: markingContext.markMax,
      userMark,
      canvas: markingContext.canvas || [],
    };

    await saveMarkingResult(markingResult, sessionType);
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
    try {
      switch (sessionType) {
        case SessionType.PracticeSession:
        case SessionType.LessonSession: {
          await curriculumApiV2Client.put(`/lessons/${lessonId}/answers`, {
            answers: [markingResult],
          });
          break;
        }
        case SessionType.PaperSession: {
          await nextApiClient.post(
            `/user/subjects/${subjectId}/papers/${paperId}`,
            markingResult
          );
          break;
        }
      }

      if (user) {
        // Skip optimistic increment for premium users or Medly Mondays unlocked subjects
        // Papers should always count (no subject unlock for papers)
        const isPaperSession = sessionType === SessionType.PaperSession;
        const shouldSkipIncrement =
          hasActivePlan ||
          (!isPaperSession && isSubjectUnlocked(subjectId));

        if (!shouldSkipIncrement) {
          const updatedUser = { ...user };
          updatedUser.featuresUsedToday =
            (updatedUser.featuresUsedToday || 0) + 1;
          setUser(updatedUser);
        }
      }

      // Invalidate subject progress cache if subjectId is available
      if (subjectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.subjectProgress(subjectId),
        });
      }

      setMarkingResult(markingResult);
      setIsMarking(false);
      setIsMarked(true);
    } catch (error) {
      console.error("Error saving marking result:", error);
      toast.error("Error saving your answer. Please try again.");
      setIsMarking(false);
    }
  };

  return {
    handleMarkQuestion,
    isMarking,
    isMarked,
    setIsMarked,
    markingResult,
    error,
  };
};
