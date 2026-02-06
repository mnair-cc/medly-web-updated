import { OpenOnboardingData, Step } from "../_types/types";
import { renderQuestion } from "./QuestionRenderer";
import type { University } from "../_types/universityApi";

const QuestionSection = ({
  currentStep,
  steps,
  onboardingData,
  handleAnswerChange,
  handleUniversitySelect,
}: {
  currentStep: number;
  steps: Step[];
  onboardingData: OpenOnboardingData;
  handleAnswerChange: (fieldName: string, value: string) => void;
  handleUniversitySelect?: (name: string, university?: University) => void;
}) => {
  return (
    <div className="flex flex-col gap-10 w-full flex-1 overflow-y-auto p-1 mt-4">
      {steps[currentStep].questions?.map((question, index) => (
        <div key={index} className="flex flex-col gap-3">
          {question.title && (
            <h3 className="font-medium text-center">{question.title}</h3>
          )}
          {renderQuestion({
            question,
            onboardingData,
            handleAnswerChange,
            handleUniversitySelect,
          })}
        </div>
      ))}
    </div>
  );
};

export default QuestionSection;
