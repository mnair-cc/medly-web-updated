import { Question, QuestionType, OpenOnboardingData } from "../_types/types";
import CharacterCarousel from "./CharacterCarousel";
import SearchableSelect from "./SearchableSelect";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import FlowSelectCard from "./FlowSelectCard";
import type { University } from "../_types/universityApi";

interface QuestionRendererProps {
  question: Question;
  onboardingData: OpenOnboardingData;
  handleAnswerChange: (fieldName: string, value: string) => void;
  handleUniversitySelect?: (name: string, university?: University) => void;
}

export const renderQuestion = ({
  question,
  onboardingData,
  handleAnswerChange,
  handleUniversitySelect,
}: QuestionRendererProps) => {
  const currentValue =
    onboardingData[question.fieldName as keyof OpenOnboardingData] ?? "";

  switch (question.type) {
    case QuestionType.MULTIPLE_CHOICE:
      return (
        <div className="flex flex-col gap-2">
          {question.options?.map((option, index) => {
            const value =
              question.values && question.values[index] !== undefined
                ? String(question.values[index])
                : option;
            return (
              <PrimaryButtonClicky
                key={value}
                buttonState={currentValue === value ? "selected" : undefined}
                buttonText={option}
                onPress={() => handleAnswerChange(question.fieldName, value)}
                showKeyboardShortcut={false}
              />
            );
          })}
        </div>
      );

    case QuestionType.TEXT:
      return (
        <div className="w-full">
          <input
            type="text"
            className="w-full py-5 border rounded-2xl text-center bg-[#F9F9FB] focus:outline-[#05B0FF] font-medium border-[#E6E6E6]"
            value={currentValue}
            placeholder={question.placeholder}
            onChange={(e) =>
              handleAnswerChange(question.fieldName, e.target.value)
            }
          />
        </div>
      );

    case QuestionType.AVATAR:
      return (
        <div className="w-full">
          <CharacterCarousel
            options={question.options || []}
            value={currentValue}
            onChange={(value) => handleAnswerChange(question.fieldName, value)}
          />
        </div>
      );

    case QuestionType.SEARCHABLE_SELECT:
      return (
        <div className="w-full">
          <SearchableSelect
            value={String(currentValue)}
            onChange={(value, university) => {
              if (handleUniversitySelect) {
                handleUniversitySelect(value, university);
              } else {
                handleAnswerChange(question.fieldName, value);
              }
            }}
            placeholder={question.placeholder}
            logo={onboardingData.universityLogo}
          />
        </div>
      );

    case QuestionType.FLOW_SELECT: {
      // Map focusArea to recommended flowType
      const focusToFlowMap: Record<string, string> = {
        stay_organised: "organize",
        prepare_exams: "exam",
        help_assignments: "assignment",
        keep_up_lectures: "lecture",
      };
      const recommendedFlow = focusToFlowMap[onboardingData.focusArea] || "";

      return (
        <div className="grid grid-cols-2 gap-3">
          {question.options?.map((option, index) => {
            const value =
              question.values && question.values[index] !== undefined
                ? String(question.values[index])
                : option;
            const isRecommended = value === recommendedFlow;
            return (
              <FlowSelectCard
                key={value}
                label={option}
                isSelected={currentValue === value}
                isRecommended={isRecommended}
                onPress={() => handleAnswerChange(question.fieldName, value)}
              />
            );
          })}
        </div>
      );
    }

    default:
      return null;
  }
};
