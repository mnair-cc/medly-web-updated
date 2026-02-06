import ProgressBar from "@/app/_components/ProgressBar";
import { Step } from "../_types/types";

const ProgressBarSet = ({
  steps,
  currentStep,
  avatar,
  onStepClick,
}: {
  steps: Step[];
  currentStep: number;
  avatar?: string;
  onStepClick?: (stepIndex: number) => void;
}) => {
  // Find the last step that should be shown in progress bar
  const lastProgressBarStepIndex =
    steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => step.shouldCountInProgressBar)
      .pop()?.index ?? -1;

  return (
    <div className="w-full flex flex-row justify-center items-center gap-2">
      {steps.map(
        (step, index) =>
          step.shouldCountInProgressBar && (
            <button
              key={index}
              type="button"
              onClick={() => onStepClick?.(index)}
              disabled={index >= currentStep}
              className={`flex-1 max-w-16 ${index < currentStep ? "cursor-pointer" : "cursor-default"}`}
            >
              <ProgressBar
                progress={
                  currentStep > index
                    ? 100
                    : currentStep === index
                      ? 50
                      : 0
                }
                avatar={
                  currentStep === index ||
                  (currentStep > lastProgressBarStepIndex &&
                    index === lastProgressBarStepIndex)
                    ? avatar
                    : undefined
                }
                shouldAnimate={false}
              />
            </button>
          )
      )}
    </div>
  );
};

export default ProgressBarSet;
