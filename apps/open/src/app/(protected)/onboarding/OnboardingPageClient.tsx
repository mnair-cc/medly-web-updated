"use client";

import { useEffect, useState } from "react";
import Spinner from "@/app/_components/Spinner";
import { steps } from "./_config/steps";
import { useOnboardingAnswers } from "./_hooks/useOnboardingAnswers";
import { isStepValid } from "./_utils/validation";
import QuestionSection from "./_components/QuestionSection";
import { OnboardingData, OnboardingSubject, StepType } from "./types";
import { useAllSubjects } from "../../_hooks/useAllSubjects";
import Secrets from "./_components/Secrets";
import ExamDates from "./_components/ExamDates";
import { useTracking } from "../../_lib/posthog/useTracking";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import ProgressBarSet from "./_components/ProgressBarSet";
import SubjectsSelect from "@/app/(protected)/onboarding/_components/SubjectsSelect";
import LoadingScreen from "@/app/_components/LoadingScreen";
import TickIcon from "@/app/_components/icons/TickIcon";

const OnboardingPageClient = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const {
    onboardingData,
    isLoading: isLoadingOnboardingData,
    handleAnswerChange,
    handleSubmit,
  } = useOnboardingAnswers();

  const { isLoading: isLoadingCourses } = useAllSubjects();
  const { track } = useTracking();

  // Mark this device as not needing to see the web v3 intro (new users)
  useEffect(() => {
    try {
      localStorage.setItem("web_v3_intro_seen", "true");
    } catch (error) {
      // ignore if storage unavailable
      console.warn("Failed to set web_v3_intro_seen", error);
    }
  }, []);

  // Derive course information from selected subjects for title placeholders
  const getPrimaryCourse = () => {
    if (onboardingData.selectedSubjects.length === 0) return "";

    // Group subjects by course to find the most common one
    const courseCounts = onboardingData.selectedSubjects.reduce(
      (acc, subject) => {
        acc[subject.course] = (acc[subject.course] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Return the course with the most subjects, or the first one if tied
    return (
      Object.keys(courseCounts).reduce((a, b) =>
        courseCounts[a] > courseCounts[b] ? a : b
      ) || ""
    );
  };

  const [createStudyPlanProgressValue, setCreateStudyPlanProgressValue] =
    useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNestedAnswerChange = (
    fieldName: string,
    value: string | number | boolean | string[] | OnboardingSubject
  ) => {
    // Pass through to the main handler with proper typing
    handleAnswerChange(
      fieldName as keyof OnboardingData,
      value as OnboardingData[keyof OnboardingData] | OnboardingSubject
    );
  };

  const createStudyPlan = () => {
    if (!isSubmitting) {
      // Start submission process
      setIsSubmitting(true);
      setCreateStudyPlanProgressValue(0);

      // First move to 50%
      const timer1 = setTimeout(() => {
        setCreateStudyPlanProgressValue(50);
      }, 500);

      // Submit data
      handleSubmit()
        .then(() => {
          // On success, complete the progress bar
          setCreateStudyPlanProgressValue(100);

          // Redirect after showing full progress
          const redirectTimer = setTimeout(() => {
            window.location.href = "/";
          }, 1500);

          return () => clearTimeout(redirectTimer);
        })
        .catch(() => {
          // On error, go back to previous step
          setIsSubmitting(false);
        });

      return () => {
        clearTimeout(timer1);
      };
    }
  };

  // Helper function to get relevant data for current step
  const getStepTrackingData = (currentStepIndex: number) => {
    const currentStep = steps[currentStepIndex];
    const baseData = {
      step: currentStepIndex,
      description: currentStep?.type,
      stepTitle: currentStep?.title,
    };

    // Add user selections based on step type and questions
    const stepData: Record<string, unknown> = { ...baseData };

    if (currentStep?.questions) {
      currentStep.questions.forEach((question) => {
        const fieldName = question.fieldName;
        const value = onboardingData[fieldName as keyof OnboardingData];

        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          fieldName in onboardingData
        ) {
          (stepData as Record<string, unknown>)[fieldName] = value;
        }
      });
    }

    // Special handling for subjects step
    if (
      currentStep?.type === StepType.SUBJECTS &&
      onboardingData.selectedSubjects.length > 0
    ) {
      (stepData as Record<string, unknown>).selectedSubjectsCount =
        onboardingData.selectedSubjects.length;
      (stepData as Record<string, unknown>).selectedSubjectNames =
        onboardingData.selectedSubjects.map((s) => s.title);
      (stepData as Record<string, unknown>).selectedCourses = [
        ...new Set(onboardingData.selectedSubjects.map((s) => s.course)),
      ];
      (stepData as Record<string, unknown>).selectedExamBoards = [
        ...new Set(onboardingData.selectedSubjects.map((s) => s.examBoard)),
      ];
    }

    return stepData;
  };

  const handleStepClick = (stepIndex: number) => {
    // Track step with enhanced data including user selections
    const trackingData = getStepTrackingData(currentStep);
    track("onboarding_step", trackingData);

    // Track specific step completion events when moving forward
    const isMovingForward = stepIndex > currentStep;
    if (isMovingForward) {
      const completedStep = steps[currentStep];

      // Track specific events based on what step was just completed
      if (completedStep?.questions) {
        completedStep.questions.forEach((question) => {
          const fieldName = question.fieldName;
          const value = onboardingData[fieldName as keyof OnboardingData];

          if (value !== undefined && value !== null && value !== "") {
            // Track specific field completions
            switch (fieldName) {
              case "userName":
                track("onboarding_profile_created", {
                  userName: onboardingData.userName,
                  avatar: onboardingData.avatar,
                });
                break;
              case "focusArea":
                track("onboarding_focus_selected", {
                  focusArea: value as string,
                });
                break;
              case "source":
                track("onboarding_source_selected", {
                  source: value as string,
                });
                break;
              case "year":
                track("onboarding_year_selected", {
                  year: Number(value),
                });
                break;
              case "parentEmail":
                track("onboarding_parent_email_provided", {
                  hasParentEmail: true,
                  parentEmailMarketingOptOut:
                    onboardingData.parentEmailMarketingOptOut,
                });
                break;
            }
          }
        });
      }

      // Special handling for subjects step
      if (
        completedStep?.type === StepType.SUBJECTS &&
        onboardingData.selectedSubjects.length > 0
      ) {
        track("onboarding_subjects_selected", {
          selectedSubjectsCount: onboardingData.selectedSubjects.length,
          selectedSubjectNames: onboardingData.selectedSubjects.map(
            (s) => s.title
          ),
          selectedCourses: [
            ...new Set(onboardingData.selectedSubjects.map((s) => s.course)),
          ],
          selectedExamBoards: [
            ...new Set(onboardingData.selectedSubjects.map((s) => s.examBoard)),
          ],
        });
      }
    }

    // Handle final step submission
    if (stepIndex >= steps.length) {
      createStudyPlan();
      return;
    }

    // When moving forward, validate the current step
    if (isMovingForward && !isStepValid(currentStep, steps, onboardingData)) {
      return; // Don't proceed if current step is invalid
    }

    // Go to the requested step
    setCurrentStep(stepIndex);
  };

  const isLoading = isLoadingOnboardingData || isLoadingCourses;

  if (isLoading && !isSubmitting) {
    return (
      <div className="flex flex-col h-screen bg-white md:p-4 justify-center items-center">
        <Spinner />
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <LoadingScreen
        avatar={onboardingData.avatar}
        progressValue={createStudyPlanProgressValue}
      />
    );
  }

  return (
    <div className="flex flex-col justify-between h-dvh w-full bg-white sm:pb-4">
      <div className="flex justify-center items-center bg-white w-full md:h-20 py-4 border-b border-gray-200">
        <div className="w-4 md:w-1/4" />
        <div className="flex justify-center items-center flex-1">
          <ProgressBarSet
            onboardingSteps={steps}
            currentOnboardingStep={currentStep}
            avatar={onboardingData.avatar}
          />
        </div>
        <div className="w-4 md:w-1/4" />
      </div>

      <div className="overflow-y-auto py-8 w-full">
        {/* Title section at top */}
        <div className="flex flex-col justify-center items-center text-center gap-2 w-full max-w-xl mx-auto px-4">
          {steps[currentStep].title && (
            <h1 className="text-4xl mb-4 font-rounded-bold w-full">
              {steps[currentStep].title.replace(/{(\w+)}/g, (match, key) => {
                if (key === "course") {
                  return getPrimaryCourse();
                }
                return (
                  onboardingData[key as keyof OnboardingData]?.toString() ||
                  match
                );
              })}
            </h1>
          )}
          {steps[currentStep].subtitle && (
            <h2 className="text-3xl mb-5 font-rounded-heavy w-full">
              {steps[currentStep].subtitle}
            </h2>
          )}
          {steps[currentStep].hint && (
            <p className="text-base max-w-[482px] mx-auto mb-5 -mt-2 text-black/50">
              {steps[currentStep].hint}
            </p>
          )}
          {steps[currentStep].description && (
            <p className="text-base max-w-[280px] mx-auto mb-5 -mt-2">
              {steps[currentStep].description
                .split(/(\*\*.*?\*\*)/)
                .map((part, index) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    // Remove the ** markers and render as bold
                    return (
                      <span key={index} className="font-bold">
                        {part.slice(2, -2)}
                      </span>
                    );
                  }
                  return part;
                })}
            </p>
          )}
        </div>

        {/* Content section */}
        <div
          className={
            steps[currentStep].type === StepType.SUBJECTS
              ? "w-full"
              : "max-w-xl mx-auto px-4"
          }
        >
          {steps[currentStep].questions && (
            <QuestionSection
              currentStep={currentStep}
              steps={steps}
              onboardingData={onboardingData}
              handleAnswerChange={handleNestedAnswerChange}
            />
          )}
          {steps[currentStep].type === StepType.SUBJECTS ? (
            <SubjectsSelect
              onContinue={() => handleStepClick(currentStep + 1)}
              onboardingData={onboardingData}
              handleAnswerChange={handleNestedAnswerChange}
            />
          ) : null}
          {steps[currentStep].type === StepType.EXAM_DATES ? (
            <ExamDates selectedSubjects={onboardingData.selectedSubjects} />
          ) : steps[currentStep].type === StepType.SECRETS ? (
            <Secrets />
          ) : steps[currentStep].type === StepType.SECRETS_FADED ? (
            <Secrets faded={true} />
          ) : steps[currentStep].type === StepType.SECRETS_MEDLY ? (
            <Secrets medly={true} />
          ) : null}
        </div>
      </div>

      {/* Button section at bottom */}
      <div className="flex flex-col gap-2 w-full md:w-[260px] mx-auto py-4 px-4">
        {steps[currentStep].questions?.some(
          (q) => q.fieldName === "parentEmail"
        ) ? (
          <div className="inline-flex items-center mb-2">
            <label className="flex cursor-pointer text-xs text-black/40">
              <div className="relative">
                <input
                  type="checkbox"
                  className="peer h-4 w-4 cursor-pointer transition-all appearance-none rounded border border-slate-300 checked:bg-[#05B0FF] checked:border-[#05B0FF]"
                  checked={Boolean(onboardingData.parentEmailMarketingOptOut)}
                  onChange={(e) =>
                    handleNestedAnswerChange(
                      "parentEmailMarketingOptOut",
                      e.target.checked
                    )
                  }
                />
                <span className="absolute top-[2.5px] left-1/2 transform -translate-x-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none">
                  <TickIcon fill="#fff" />
                </span>
              </div>
              <span className="ml-2">
                I do not want my parent or guardian to receive email updates
                from Medly.
              </span>
            </label>
          </div>
        ) : null}
        {steps[currentStep].primaryButtonText && (
          <PrimaryButtonClicky
            disabled={!isStepValid(currentStep, steps, onboardingData)}
            buttonState="filled"
            buttonText={steps[currentStep].primaryButtonText}
            onPress={() => handleStepClick(currentStep + 1)}
            showKeyboardShortcut={false}
            doesStretch={true}
          />
        )}
        {steps[currentStep].secondaryButtonText && (
          <button
            type="button"
            className="py-2 font-medium px-4 w-fit mx-auto mt-5"
            disabled={!isStepValid(currentStep, steps, onboardingData)}
            onClick={() => handleStepClick(currentStep + 1)}
          >
            {steps[currentStep].secondaryButtonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingPageClient;
