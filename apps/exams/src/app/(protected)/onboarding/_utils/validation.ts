import { Step, OnboardingData, StepType } from "../types";

// Get validation error message for a specific question
export const getValidationError = (
  question: { fieldName: string; type: string; placeholder?: string },
  answer: string | number | string[] | null | undefined
): string | null => {
  switch (question.type) {
    case "multiple-choice":
      if (!answer) return "Please select an option";
      break;
    case "text":
      // Special handling for parent email - no validation required
      if (question.fieldName === "parentEmail") {
        return null;
      }

      if (!answer || answer.toString().trim() === "") {
        return question.placeholder
          ? `Please enter ${question.placeholder.toLowerCase()}`
          : "This field is required";
      }
      break;
    case "avatar":
      if (!answer) return "Please choose an avatar";
      break;
  }
  return null;
};

export const isStepValid = (
  currentStep: number,
  steps: Step[],
  answers: OnboardingData
): boolean => {
  const currentStepData = steps[currentStep];

  // Special validation for subjects step
  if (currentStepData.type === StepType.SUBJECTS) {
    return answers.selectedSubjects && answers.selectedSubjects.length > 0;
  }

  // If there are no questions (like welcome/finish steps), it's valid
  if (!currentStepData.questions) return true;

  // Check if all required fields in current step are filled
  return currentStepData.questions.every((question) => {
    const answer = answers[question.fieldName as keyof OnboardingData];

    switch (question.type) {
      case "multiple-choice":
        return !!answer;
      case "text":
        // Special handling for parent email - always valid, no validation
        if (question.fieldName === "parentEmail") {
          return true;
        }
        return !!answer && answer.toString().trim() !== "";
      case "avatar":
        return !!answer;
      default:
        return true;
    }
  });
};
