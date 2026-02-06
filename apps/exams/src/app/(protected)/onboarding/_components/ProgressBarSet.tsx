import ProgressBar from "@/app/_components/ProgressBar";
import { OnboardingStep } from "./steps";
import { Step } from "@/app/(protected)/onboarding/types";

const ProgressBarSet = ({
  onboardingSteps,
  currentOnboardingStep,
  avatar,
}: {
  onboardingSteps: OnboardingStep[] | Step[];
  currentOnboardingStep: number;
  avatar?: string;
}) => {
  // Find the last step that should be shown in progress bar
  const lastProgressBarStepIndex =
    onboardingSteps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => step.shouldCountInProgressBar)
      .pop()?.index ?? -1;

  return (
    <div className="w-full flex flex-row justify-center items-center gap-2">
      {onboardingSteps.map(
        (step, index) =>
          step.shouldCountInProgressBar && (
            <ProgressBar
              key={index}
              progress={
                currentOnboardingStep > index
                  ? 100
                  : currentOnboardingStep === index
                    ? 50
                    : 0
              }
              avatar={
                currentOnboardingStep === index ||
                (currentOnboardingStep > lastProgressBarStepIndex &&
                  index === lastProgressBarStepIndex)
                  ? avatar
                  : undefined
              }
              shouldAnimate={false}
            />
          )
      )}
    </div>
  );
};

export default ProgressBarSet;
