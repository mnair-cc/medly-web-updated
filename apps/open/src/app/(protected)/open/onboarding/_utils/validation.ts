import {
  Step,
  StepType,
  OpenOnboardingData,
  QuestionType,
} from "../_types/types";

export const isStepValid = (
  currentStep: number,
  steps: Step[],
  answers: OpenOnboardingData
): boolean => {
  const currentStepData = steps[currentStep];

  // Info steps (including dynamic), loading steps, and redirect steps are always valid
  if (
    currentStepData.type === StepType.INFO ||
    currentStepData.type === StepType.INFO_DYNAMIC ||
    currentStepData.type === StepType.MODULE_LOADING ||
    currentStepData.type === StepType.LOADING_REDIRECT ||
    !currentStepData.type
  ) {
    return true;
  }

  // Carousel steps are always valid (internal navigation)
  if (currentStepData.type === StepType.CAROUSEL) {
    return true;
  }

  // Module name/color step - validation handled separately in page.tsx
  if (currentStepData.type === StepType.MODULE_NAME_COLOR) {
    return true;
  }

  // Legacy: Module setup and course upload steps are always valid (can skip)
  if (
    currentStepData.type === StepType.MODULE_SETUP ||
    currentStepData.type === StepType.COURSE_UPLOAD
  ) {
    return true;
  }

  // If there are no questions (like welcome/motivational steps), it's valid
  if (!currentStepData.questions) return true;

  // Check if all required fields in current step are filled
  return currentStepData.questions.every((question) => {
    const answer = answers[question.fieldName as keyof OpenOnboardingData];

    switch (question.type) {
      case QuestionType.MULTIPLE_CHOICE:
        return !!answer;
      case QuestionType.FLOW_SELECT:
        return !!answer;
      case QuestionType.TEXT:
        return !!answer && answer.toString().trim() !== "";
      case QuestionType.AVATAR:
        return !!answer;
      case QuestionType.SEARCHABLE_SELECT:
        return !!answer && answer.toString().trim() !== "";
      default:
        return true;
    }
  });
};
