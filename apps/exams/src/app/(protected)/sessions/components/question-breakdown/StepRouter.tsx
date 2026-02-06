import { MarkingResult, MarkingContext, QuestionWithMarkingResult, StrategyStep } from "@/app/types/types";
import McqStep from "./steps/McqStep";
import OpenStep from "./steps/OpenStep";
import CalculateStep from "./steps/CalculateStep";
import SortStep from "./steps/SortStep";
import BreakdownStrategy from "./BreakdownStrategy";
import BreakdownDebrief from "./BreakdownDebrief";
import DesmosStep from "./steps/DesmosStep";

interface StepRouterProps {
    questionContext: QuestionWithMarkingResult;
    step: StrategyStep;
    userAnswer: any;
    updateAnswer: (stepId: string, answer: any) => void;
    isMarking: boolean;
    isMarked: boolean;
    markingResult: MarkingResult | null;
    breakdownStrategy?: string[];
    onExpressionsChange?: (expressions: any[]) => void;
    setIsMarked?: (isMarked: boolean) => void;
    // Add new props to help determine if this is the last strategy step
    allStrategySteps?: StrategyStep[];
    currentStepIndex?: number;
    onTargetLetterChange?: (letter: string | null) => void;
}

export default function StepRouter({
    questionContext,
    step,
    userAnswer,
    updateAnswer,
    isMarking,
    isMarked,
    markingResult,
    breakdownStrategy = [],
    onExpressionsChange,
    setIsMarked,
    allStrategySteps = [],
    currentStepIndex = 0,
    onTargetLetterChange,
}: StepRouterProps) {
    switch (step.questionType) {
        case "strategy":
            return <BreakdownStrategy strategy={breakdownStrategy} />;
        case "debrief":
            return <BreakdownDebrief />;
        case "mcq":
            return (
                <McqStep
                    step={step}
                    userAnswer={userAnswer}
                    updateAnswer={updateAnswer}
                    isMarking={isMarking}
                    isMarked={isMarked}
                    markingResult={markingResult}
                    questionContext={questionContext}
                    allStrategySteps={allStrategySteps}
                    currentStepIndex={currentStepIndex}
                />
            );
        case "calculate":
            return (
                <CalculateStep
                    step={step}
                    userAnswer={userAnswer}
                    updateAnswer={updateAnswer}
                    isMarking={isMarking}
                    isMarked={isMarked}
                    markingResult={markingResult}
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
            return (
                <OpenStep
                    step={step}
                    userAnswer={userAnswer}
                    updateAnswer={updateAnswer}
                    isMarking={isMarking}
                    isMarked={isMarked}
                    markingResult={markingResult}
                    setIsMarked={setIsMarked}
                />
            );
        case "sort":
            return (
                <SortStep
                    step={step}
                    userAnswer={userAnswer}
                    updateAnswer={updateAnswer}
                    isMarking={isMarking}
                    isMarked={isMarked}
                    markingResult={markingResult}
                    onTargetLetterChange={onTargetLetterChange}
                />
            );
        case "solve_with_desmos":
        case "math_step":
            return <DesmosStep onExpressionsChange={onExpressionsChange} />;
        default:
            return (
                <div className="text-center py-8">
                    <p className="text-gray-500">
                        Unsupported question type: {step.questionType}
                    </p>
                </div>
            );
    }
} 