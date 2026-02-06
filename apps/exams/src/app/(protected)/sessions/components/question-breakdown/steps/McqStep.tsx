import { useState, useMemo } from "react";
import { MarkingResult, MarkingContext, QuestionWithMarkingResult, StrategyStep } from "@/app/types/types";
import ButtonSet from "../../question-components/answer-section/ButtonSet";

interface McqStepProps {
    step: StrategyStep;
    userAnswer: string;
    updateAnswer: (stepId: string, answer: string) => void;
    isMarking: boolean;
    isMarked: boolean;
    markingResult: MarkingResult | null;
    // New props for handling last step with original question options
    questionContext?: QuestionWithMarkingResult;
    allStrategySteps?: StrategyStep[];
    currentStepIndex?: number;
}

export default function McqStep({
    step,
    userAnswer,
    updateAnswer,
    isMarking,
    isMarked,
    markingResult,
    questionContext,
    allStrategySteps = [],
    currentStepIndex = 0,
}: McqStepProps) {
    const [selectedAnswer, setSelectedAnswer] = useState<string>(userAnswer || "");

    const handleAnswerSelect = (answer: string | string[] | { left?: string; right?: string }) => {
        // For MCQ questions, we only handle string answers
        if (typeof answer === 'string') {
            setSelectedAnswer(answer);
            updateAnswer(step.legacyId || `step-${step.index}`, answer);
        }
    };
    // Check if this is the last strategy step with MCQ type AND previous step was a sort AND current MCQ has fewer options than sort step
    const isLastStrategyStep = useMemo(() => {
        if (!allStrategySteps.length) return false;

        // Find the last non-strategy, non-debrief step
        const strategyStepsOnly = allStrategySteps.filter(s =>
            s.questionType !== "strategy" && s.questionType !== "debrief"
        );

        if (strategyStepsOnly.length === 0) return false;

        const lastStrategyStep = strategyStepsOnly[strategyStepsOnly.length - 1];
        const isLastStep = lastStrategyStep.index === step.index && step.questionType === "mcq";

        // Check if previous step was a sort
        const currentStepInStrategySteps = strategyStepsOnly.findIndex(s => s.index === step.index);
        const previousStep = currentStepInStrategySteps > 0 ? strategyStepsOnly[currentStepInStrategySteps - 1] : null;
        const isPreviousStepSort = previousStep?.questionType === "sort";

        // Check if current MCQ step has fewer options than the sort step
        const currentMcqOptionsLength = Array.isArray(step.options) ? step.options.length : 0;
        const sortStepOptionsLength = Array.isArray(previousStep?.options) ? previousStep.options.length : 0;
        const hasFewerOptions = currentMcqOptionsLength < sortStepOptionsLength;

        return isLastStep && isPreviousStepSort && hasFewerOptions;
    }, [allStrategySteps, step.index, step.questionType, step.options]);

    // Check if this is the last strategy step with MCQ type AND previous step was a sort AND current MCQ has same number of options
    const isLastStrategyStepSameOptions = useMemo(() => {
        if (!allStrategySteps.length) return false;

        // Find the last non-strategy, non-debrief step
        const strategyStepsOnly = allStrategySteps.filter(s =>
            s.questionType !== "strategy" && s.questionType !== "debrief"
        );

        if (strategyStepsOnly.length === 0) return false;

        const lastStrategyStep = strategyStepsOnly[strategyStepsOnly.length - 1];
        const isLastStep = lastStrategyStep.index === step.index && step.questionType === "mcq";

        // Check if previous step was a sort
        const currentStepInStrategySteps = strategyStepsOnly.findIndex(s => s.index === step.index);
        const previousStep = currentStepInStrategySteps > 0 ? strategyStepsOnly[currentStepInStrategySteps - 1] : null;
        const isPreviousStepSort = previousStep?.questionType === "sort";

        // Check if current MCQ step has same number of options as the sort step
        const currentMcqOptionsLength = Array.isArray(step.options) ? step.options.length : 0;
        const sortStepOptionsLength = Array.isArray(previousStep?.options) ? previousStep.options.length : 0;
        const hasSameOptions = currentMcqOptionsLength === sortStepOptionsLength;

        return isLastStep && isPreviousStepSort && hasSameOptions;
    }, [allStrategySteps, step.index, step.questionType, step.options]);

    // Handle both string[] and object[] formats for options
    const stepOptions = Array.isArray(step.options) && step.options.length > 0
        ? typeof step.options[0] === 'object'
            ? step.options as { option: string; explanation: string }[]
            : (step.options as string[]).map(opt => ({ option: opt, explanation: "" }))
        : [];

    // Get previous sort step options for comparison
    const previousSortOptions = useMemo(() => {
        if (!allStrategySteps.length) return [];

        const strategyStepsOnly = allStrategySteps.filter(s =>
            s.questionType !== "strategy" && s.questionType !== "debrief"
        );

        const currentStepInStrategySteps = strategyStepsOnly.findIndex(s => s.index === step.index);
        const previousStep = currentStepInStrategySteps > 0 ? strategyStepsOnly[currentStepInStrategySteps - 1] : null;

        // If previous step is a sort, use its options, otherwise fall back to question context
        if (previousStep?.questionType === "sort" && previousStep.options) {
            const options = Array.isArray(previousStep.options) ? previousStep.options : [];
            return options.map(opt =>
                typeof opt === 'string'
                    ? { option: opt, explanation: "" }
                    : opt as { option: string; explanation: string }
            );
        }

        // Fall back to original question options if no previous sort step
        if (!questionContext?.options || !Array.isArray(questionContext.options)) return [];

        return questionContext.options.map(opt =>
            typeof opt === 'string'
                ? { option: opt, explanation: "" }
                : opt as { option: string; explanation: string }
        );
    }, [allStrategySteps, step.index, questionContext?.options]);

    // Determine which options to show and which to rule out initially
    const { optionsToShow, initiallyRuledOut } = useMemo(() => {
        // Case 1: Last step with fewer options - show step options + ruled out previous sort options
        if (isLastStrategyStep && questionContext) {
            const stepOptionTexts = stepOptions.map(opt => opt.option);
            const ruledOutOptions: { option: string; explanation: string }[] = [];

            previousSortOptions.forEach(opt => {
                // Use similarity-based matching to find if this original option matches any step option
                const isMatched = stepOptionTexts.some(stepOpt => {
                    // First try exact match
                    if (stepOpt === opt.option) return true;

                    // Check if lengths are similar (within 10% difference)
                    const lengthDiff = Math.abs(stepOpt.length - opt.option.length);
                    const maxLength = Math.max(stepOpt.length, opt.option.length);
                    const lengthSimilarity = 1 - (lengthDiff / maxLength);

                    if (lengthSimilarity < 0.9) return false; // Less than 90% length similarity

                    // Calculate string similarity using simple character matching
                    const calculateSimilarity = (str1: string, str2: string) => {
                        const minLength = Math.min(str1.length, str2.length);
                        let matches = 0;

                        for (let i = 0; i < minLength; i++) {
                            if (str1[i].toLowerCase() === str2[i].toLowerCase()) {
                                matches++;
                            }
                        }

                        return matches / Math.max(str1.length, str2.length);
                    };

                    const similarity = calculateSimilarity(stepOpt, opt.option);
                    return similarity >= 0.8; // 80% or more character match
                });

                // If no match found, this original option should be ruled out
                if (!isMatched) {
                    ruledOutOptions.push(opt);
                }
            });

            // Combine step options (not ruled out) with ruled out original options
            const allOptionsToShow = [...stepOptions, ...ruledOutOptions];
            const ruledOutSet = new Set(ruledOutOptions.map(opt => opt.option));

            return {
                optionsToShow: allOptionsToShow,
                initiallyRuledOut: ruledOutSet
            };
        }

        // Case 2: Last step with same number of options - show step options with incorrect answers ruled out
        if (isLastStrategyStepSameOptions) {
            const incorrectAnswersSet = new Set<string>();

            // Find all incorrect options to rule out (keep only correct answer not ruled out)
            if (step.correctAnswer) {
                stepOptions.forEach(opt => {
                    if (opt.option !== step.correctAnswer) {
                        incorrectAnswersSet.add(opt.option);
                    }
                });
            }

            return {
                optionsToShow: stepOptions,
                initiallyRuledOut: incorrectAnswersSet
            };
        }

        // Default case: no special handling
        return {
            optionsToShow: stepOptions,
            initiallyRuledOut: new Set<string>()
        };
    }, [isLastStrategyStep, isLastStrategyStepSameOptions, questionContext, stepOptions, previousSortOptions, step.correctAnswer]);

    // Randomize the options using Fisher-Yates shuffle algorithm, stable per question
    const randomizedOptions = useMemo(() => {
        // Create a deterministic seed based on the step ID to ensure consistent ordering
        const stepId = step.legacyId || `step-${step.index}`;
        const seed = stepId.split('').reduce((acc: number, char: string, index: number) => {
            return acc + char.charCodeAt(0) * (index + 1);
        }, 0);

        // Seeded random function for consistent shuffling
        let seedValue = seed;
        const seededRandom = () => {
            seedValue = (seedValue * 9301 + 49297) % 233280;
            return seedValue / 233280;
        };

        const shuffled = [...optionsToShow];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, [optionsToShow, step.legacyId]);

    // Transform the step to match what ButtonSet expects
    const transformedQuestionData: QuestionWithMarkingResult = {
        // Required QuestionWithMarkingResult fields
        id: 0,
        legacyId: step.legacyId || `step-${step.index}`,
        subLessonId: "",
        correctAnswer: step.correctAnswer,
        createdAt: "",
        maxMark: step.maxMark || 1,
        options: step.options,
        order: step.index,
        difficulty: "medium" as any,
        markScheme: [],
        questionGroupId: 0,
        irtParameters: { a: 0, b: 0, c: 0 },
        strategy: { steps: [], feedback: "" },
        questionText: step.heading,
        questionType: step.questionType,
        diagram: "",
        questionStem: "",
        questionStemDiagram: "",
        updatedAt: "",
        questionLegacyId: step.legacyId || `step-${step.index}`,
        userAnswer: selectedAnswer,
        // Only show marking results after the question has been marked
        userMark: isMarked ? markingResult?.userMark : undefined,
        isMarked: isMarked,
        annotatedAnswer: (isMarked || isMarking) ? "disabled" : undefined // ButtonSet uses this to determine if questions are disabled
    };

    return (
        <div className="">
            <ButtonSet
                currentQuestionWithMarkingResult={transformedQuestionData}
                userAnswer={selectedAnswer}
                setUserAnswer={handleAnswerSelect}
                options={randomizedOptions}
                canPickMultiple={false}
                initiallyRuledOut={initiallyRuledOut}
            />
        </div>
    );
} 