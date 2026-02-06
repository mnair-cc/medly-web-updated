import { SubjectWithUnits } from "@/app/types/types";
import { OnboardingData, Question, Step } from "../types";
import { renderQuestion } from "./QuestionRenderer";

const QuestionSection = ({
  currentStep,
  steps,
  onboardingData,
  handleAnswerChange,
  subject,
  expandedUnits,
  toggleUnit,
}: {
  currentStep: number;
  steps: Step[];
  onboardingData: OnboardingData;
  handleAnswerChange: (
    fieldName: string,
    value: string | number | string[]
  ) => void;
  subject?: SubjectWithUnits | null;
  expandedUnits?: number[];
  toggleUnit?: (unitIndex: number, unitTopics?: string[]) => void;
}) => {
  return (
    <div className="flex flex-col gap-10 w-full flex-1 overflow-y-auto p-1 mt-4">
      {steps[currentStep].questions?.map((question, index) => (
        <div key={index} className="flex flex-col gap-3 ">
          {question.title && (
            <h3 className="font-medium text-center">{question.title}</h3>
          )}
          {renderQuestion({
            question: question as Question & {
              fieldName: keyof OnboardingData;
            },
            onboardingData,
            handleAnswerChange: (fieldName, value) =>
              handleAnswerChange(
                fieldName,
                value as string | number | string[]
              ),
            subject,
            expandedUnits,
            toggleUnit,
          })}
          {question.note && (
            <p className="text-sm mt-4 text-[#52525b]">{question.note}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default QuestionSection;
