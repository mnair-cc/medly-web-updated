import { MarkingContext, QuestionWithMarkingResult } from "@/app/types/types";
import Open from "./Open";
import MatchPair from "./MatchPair";
import ButtonSet from "./ButtonSet";
import FillInTheGaps from "./FillInTheGaps";
import Calculate from "./Calculate";
import Spr from "./Spr";
import ReorderQuestion from "./ReorderQuestion";
import GroupQuestion from "./GroupQuestion";
import NumberQuestion from "./NumberQuestion";
import SpotQuestion from "./SpotQuestion";
import FixSentenceQuestion from "./FixSentenceQuestion";

const QuestionCardAnswerSection = ({
  isMarking,
  userAnswer,
  setUserAnswer,
  onPressPrimaryButton,
  setIsTextareaFocused,
  currentQuestionWithMarkingResult,
  handleMarkQuestion,
  hideElimination,
  handleSendMessage,
  isAwaitingResponse,
}: {
  isMarking: boolean;
  userAnswer: string | string[] | { left?: string; right?: string } | undefined;
  setUserAnswer: (
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
  onPressPrimaryButton: () => void;
  setIsTextareaFocused: (focused: boolean) => void;
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  handleMarkQuestion: (markingContext: MarkingContext) => void;
  hideElimination?: boolean;
  handleSendMessage?: (message: string) => void;
  isAwaitingResponse?: boolean;
}) => {
  switch (currentQuestionWithMarkingResult.questionType) {
    case "calculate":
      return (
        <Calculate
          isMarking={isMarking}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          onPressPrimaryButton={onPressPrimaryButton}
          setIsTextareaFocused={setIsTextareaFocused}
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
        />
      );
    case "compare":
    case "define":
    case "describe":
    case "explain":
    case "long_answer":
    case "state":
    case "short_answer":
    case "write":
      if (currentQuestionWithMarkingResult.legacyId?.includes("Maths")) {
        return (
          <Calculate
            isMarking={isMarking}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            onPressPrimaryButton={onPressPrimaryButton}
            setIsTextareaFocused={setIsTextareaFocused}
            currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          />
        );
      }
      return (
        <Open
          isMarking={isMarking}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          onPressPrimaryButton={onPressPrimaryButton}
          setIsTextareaFocused={setIsTextareaFocused}
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
        />
      );
    // case "drawing":
    // case "fill_in_the_gaps_number":
    case "fill_in_the_gaps_text":
      return (
        <FillInTheGaps
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          handleMarkQuestion={handleMarkQuestion}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          options={
            Array.isArray(currentQuestionWithMarkingResult.options)
              ? currentQuestionWithMarkingResult.options.map((option) =>
                typeof option === "string" ? option : option.option
              )
              : []
          }
        />
      );
    case "match_pair":
      return (
        <MatchPair
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          handleMarkQuestion={handleMarkQuestion}
        />
      );
    case "reorder":
      return (
        <ReorderQuestion
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          handleMarkQuestion={handleMarkQuestion}
          setUserAnswer={setUserAnswer}
        />
      );
    case "group":
      return (
        <GroupQuestion
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          handleMarkQuestion={handleMarkQuestion}
          setUserAnswer={setUserAnswer}
        />
      );
    case "number":
      return (
        <NumberQuestion
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          handleMarkQuestion={handleMarkQuestion}
          setUserAnswer={setUserAnswer}
        />
      );
    case "mcq":
      return (
        <ButtonSet
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          options={
            Array.isArray(currentQuestionWithMarkingResult.options)
              ? currentQuestionWithMarkingResult.options
              : []
          }
          hideElimination={hideElimination}
        />
      );
    case "mcq_multiple":
      return (
        <ButtonSet
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          options={
            Array.isArray(currentQuestionWithMarkingResult.options)
              ? currentQuestionWithMarkingResult.options
              : []
          }
          canPickMultiple={true}
          hideElimination={hideElimination}
        />
      );
    // case "rearrange":
    case "true_false":
      return (
        <ButtonSet
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          options={["True", "False"]}
        />
      );
    case "spr":
      return (
        <Spr
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          isMarked={currentQuestionWithMarkingResult?.isMarked || false}
          correctAnswer={currentQuestionWithMarkingResult?.correctAnswer || ""}
          explanation={""}
        />
      );
    case "spot":
      return (
        <SpotQuestion
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          handleMarkQuestion={handleMarkQuestion}
          setUserAnswer={setUserAnswer}
          handleSendMessage={handleSendMessage}
          isAwaitingResponse={isAwaitingResponse}
        />
      );
    case "fix_sentence":
      return (
        <FixSentenceQuestion
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          handleMarkQuestion={handleMarkQuestion}
          setUserAnswer={setUserAnswer}
        />
      );
    default:
      return null;
  }
};

export default QuestionCardAnswerSection;
