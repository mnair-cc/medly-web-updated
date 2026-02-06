import { SubjectWithUnits } from "@/app/types/types";
import { Question, QuestionType } from "../types";
import { OnboardingData } from "../types";
import GridSelect from "./GridSelect";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import { getValidationError } from "../_utils/validation";

// Helper function to get nested field value
const getNestedFieldValue = (obj: any, fieldName: string): any => {
  if (fieldName.includes(".")) {
    const [parentField, childField] = fieldName.split(".");
    return obj[parentField]?.[childField];
  }
  return obj[fieldName];
};

interface QuestionRendererProps {
  question: Question & { fieldName: keyof OnboardingData };
  onboardingData: OnboardingData;
  handleAnswerChange: (
    questionFieldName: keyof OnboardingData,
    value: OnboardingData[keyof OnboardingData]
  ) => void;
  subject?: SubjectWithUnits | null;
  expandedUnits?: number[];
  toggleUnit?: (unitIndex: number, unitTopics?: string[]) => void;
}

export const renderQuestion = ({
  question,
  onboardingData,
  handleAnswerChange,
  subject,
  expandedUnits,
  toggleUnit,
}: QuestionRendererProps) => {
  switch (question.type) {
    case QuestionType.MULTIPLE_CHOICE:
      return (
        <div className="flex flex-col gap-2">
          {question.options?.map(
            (
              option: string | { label: string; value: string },
              index: number
            ) => {
              const label = typeof option === "string" ? option : option.label;
              // Use the values array if available, otherwise fall back to the option itself
              const value =
                question.values && question.values[index] !== undefined
                  ? question.values[index]
                  : typeof option === "string"
                    ? option
                    : option.value;
              return (
                <PrimaryButtonClicky
                  key={typeof value === "string" ? value : String(value)}
                  buttonState={
                    getNestedFieldValue(onboardingData, question.fieldName) ===
                    value
                      ? "selected"
                      : undefined
                  }
                  buttonText={label}
                  onPress={() => handleAnswerChange(question.fieldName, value)}
                  showKeyboardShortcut={false}
                />
              );
            }
          )}
        </div>
      );
    case QuestionType.TEXT:
      const currentValue = getNestedFieldValue(
        onboardingData,
        question.fieldName
      );
      const validationError = getValidationError(question, currentValue);
      const hasError =
        validationError && currentValue && String(currentValue).trim() !== "";

      return (
        <div className="w-full">
          <input
            type={question.fieldName === "parentEmail" ? "email" : "text"}
            className={`w-full py-5 border rounded-2xl text-center bg-[#F9F9FB] focus:outline-[#05B0FF] font-medium ${
              hasError
                ? "border-red-400 focus:outline-red-400"
                : "border-[#E6E6E6]"
            }`}
            value={String(currentValue ?? "")}
            placeholder={question.placeholder}
            onChange={(e) =>
              handleAnswerChange(question.fieldName, e.target.value)
            }
          />
          {hasError && (
            <p className="text-red-500 text-sm mt-2 text-center">
              {validationError}
            </p>
          )}
        </div>
      );
    case QuestionType.AVATAR:
      const avatarValue = getNestedFieldValue(
        onboardingData,
        question.fieldName
      );
      // Don't show validation errors for avatar selection immediately
      // The step validation (button disabled state) handles validation feedback

      return (
        <div className="w-full">
          <GridSelect
            options={question.options || []}
            value={String(avatarValue ?? "")}
            onChange={(value) => handleAnswerChange(question.fieldName, value)}
          />
        </div>
      );
    default:
      return null;
  }
};
