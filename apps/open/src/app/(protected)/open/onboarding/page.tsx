"use client";

import { useState, useEffect } from "react";
import Spinner from "@/app/_components/Spinner";
import { steps } from "./_config/steps";
import { useOpenOnboardingAnswers } from "./_hooks/useOpenOnboardingAnswers";
import { isStepValid } from "./_utils/validation";
import QuestionSection from "./_components/QuestionSection";
import { StepType, FlowType } from "./_types/types";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import ProgressBarSet from "./_components/ProgressBarSet";
import OpenLoadingScreen from "./_components/OpenLoadingScreen";
import MotivationalStep from "./_components/MotivationalStep";
import InfoPage from "./_components/InfoPage";
import CarouselStep from "./_components/CarouselStep";
import {
  carouselContentByFlow,
  introCarouselSlides,
} from "./_config/carouselContent";
import { useTracking } from "@/app/_lib/posthog/useTracking";

const STEP_NAMES = [
  "welcome",
  "focus_area",
  "intro_carousel",
  "avatar_name",
  "university",
  "degree",
  "year",
  "all_set_up",
  "loading_redirect",
];

const OpenOnboardingPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const {
    onboardingData,
    moduleData,
    isLoading: isLoadingOnboardingData,
    handleAnswerChange,
    handleUniversitySelect,
    handleModuleDataChange,
    handleSubmit,
  } = useOpenOnboardingAnswers();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carouselSlide, setCarouselSlide] = useState(0);
  const [isNotUniversityModalOpen, setIsNotUniversityModalOpen] = useState(false);
  const { track } = useTracking();

  // Auto-submit when reaching LOADING_REDIRECT step
  useEffect(() => {
    const currentStepData = steps[currentStep];
    if (currentStepData?.type === StepType.LOADING_REDIRECT && !isSubmitting) {
      handleComplete();
    }
  }, [currentStep]);

  const handleComplete = () => {
    if (!isSubmitting) {
      setIsSubmitting(true);

      handleSubmit()
        .then(() => {
          setTimeout(() => {
            window.location.href = "/open";
          }, 1500);
        })
        .catch(() => {
          setIsSubmitting(false);
        });
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Handle final step submission
    if (stepIndex >= steps.length) {
      handleComplete();
      return;
    }

    // When moving forward, validate the current step
    const isMovingForward = stepIndex > currentStep;
    if (isMovingForward && !isStepValid(currentStep, steps, onboardingData)) {
      return;
    }

    // Reset carousel slide when changing steps
    setCarouselSlide(0);
    setCurrentStep(stepIndex);
  };

  // Get slides for current carousel step
  const getCarouselSlides = () => {
    if (currentStepData.carouselKey === "intro") {
      return introCarouselSlides;
    }
    return carouselContentByFlow[(onboardingData.flowType as FlowType) || "organize"];
  };

  const handlePrimaryButtonClick = () => {
    // Handle carousel navigation
    if (currentStepData.type === StepType.CAROUSEL) {
      const slides = getCarouselSlides();
      if (carouselSlide < slides.length - 1) {
        setCarouselSlide(carouselSlide + 1);
        return;
      }
    }
    // Track step completion
    track("onboarding_step_completed", {
      step_index: currentStep,
      step_name: STEP_NAMES[currentStep] || `step_${currentStep}`,
      action: "continue",
    });
    handleStepClick(currentStep + 1);
  };

  const handleSecondaryButtonClick = () => {
    // If on university step, show "not in university" modal
    if (currentStep === 4) {
      setIsNotUniversityModalOpen(true);
      return;
    }

    // Track step skip
    track("onboarding_step_completed", {
      step_index: currentStep,
      step_name: STEP_NAMES[currentStep] || `step_${currentStep}`,
      action: "skip",
    });
    // Track step completion with user choices
    const trackingProperties: Record<string, any> = {
      step_index: currentStep,
      step_name: STEP_NAMES[currentStep] || `step_${currentStep}`,
      action: "continue",
    };

    // Add specific user choices based on the step
    const stepName = STEP_NAMES[currentStep];
    if (stepName === "focus_area" && onboardingData.focusArea) {
      trackingProperties.focus_area = onboardingData.focusArea;
    } else if (stepName === "university" && onboardingData.university) {
      trackingProperties.university = onboardingData.university;
      trackingProperties.university_id = onboardingData.universityId;
    } else if (stepName === "degree" && onboardingData.degree) {
      trackingProperties.degree = onboardingData.degree;
      trackingProperties.course_id = onboardingData.courseId;
    } else if (stepName === "year" && onboardingData.year) {
      trackingProperties.year = onboardingData.year;
    }

    track("onboarding_step_completed", trackingProperties);
    handleStepClick(currentStep + 1);
  };

  const handleGoToExamsPlatform = () => {
    window.open("https://app.medlyai.com", "_blank");
    setIsNotUniversityModalOpen(false);
  };

  // Get step title
  const getStepTitle = (step: number): string => {
    const stepData = steps[step];
    return stepData.title || "";
  };

  if (isLoadingOnboardingData && !isSubmitting) {
    return (
      <div className="flex flex-col h-screen bg-white md:p-4 justify-center items-center">
        <Spinner />
      </div>
    );
  }

  if (isSubmitting) {
    return <OpenLoadingScreen avatar={onboardingData.avatar} />;
  }

  const currentStepData = steps[currentStep];
  const isCarouselStep = currentStepData.type === StepType.CAROUSEL;
  const isIntroCarousel = isCarouselStep && currentStepData.carouselKey === "intro";

  // Get carousel slides and current slide data
  const carouselSlides = isCarouselStep ? getCarouselSlides() : [];
  const currentCarouselSlide = isCarouselStep ? carouselSlides[carouselSlide] : null;
  const isLastCarouselSlide = isCarouselStep && carouselSlide === carouselSlides.length - 1;

  // Check if primary button should be disabled
  const isPrimaryButtonDisabled =
    !isStepValid(currentStep, steps, onboardingData);

  return (
    <div className="flex flex-col justify-between h-dvh w-full bg-white sm:pb-4">
      <div className="flex justify-center items-center bg-white w-full h-16 md:h-20 border-b border-gray-200">
        <div className="w-4 md:w-1/4" />
        <div className="flex justify-center items-center flex-1 gap-2">
          <div className="w-10 flex justify-center flex-shrink-0">
            {(currentStep > 0 || (isCarouselStep && carouselSlide > 0)) && (
              <button
                onClick={() => {
                  if (isCarouselStep && carouselSlide > 0) {
                    setCarouselSlide(carouselSlide - 1);
                  } else {
                    setCurrentStep(currentStep - 1);
                  }
                }}
                className="p-2 cursor-pointer"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
          <ProgressBarSet
            steps={steps}
            currentStep={currentStep}
            avatar={onboardingData.avatar}
            onStepClick={handleStepClick}
          />
          <div className="w-10 flex-shrink-0" />
        </div>
        <div className="w-4 md:w-1/4" />
      </div>

      {/* Intro carousel - side-by-side layout on desktop, stacked on tablet/mobile */}
      {isIntroCarousel && currentCarouselSlide && (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 justify-center gap-2 lg:gap-20 items-center w-full px-4 lg:px-0 overflow-y-auto">
          {/* Image - shown first on tablet/mobile (stacked above text) */}
          <div className="flex-shrink-0 flex justify-center items-center lg:order-2 lg:w-[400px] lg:h-[400px] mt-8 lg:mt-0">
            {currentCarouselSlide.imagePath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentCarouselSlide.imagePath}
                alt={currentCarouselSlide.title || "Onboarding illustration"}
                className="max-w-[300px] max-h-[300px] lg:max-w-[400px] lg:max-h-[400px] object-contain"
              />
            )}
          </div>
          {/* Text content - shown second on tablet/mobile (below image) */}
          <div className="w-full max-w-md lg:max-w-none lg:w-[360px] lg:h-[400px] flex-shrink-0 flex flex-col py-4 lg:py-0 justify-center items-center lg:items-start text-center lg:text-left lg:order-1">
            <h1 className="text-2xl lg:text-4xl mb-4 font-rounded-bold">
              {currentCarouselSlide.title}
            </h1>
            {currentCarouselSlide.description && (
              <p className="text-gray-600 mb-5 -mt-2">
                {currentCarouselSlide.description}
              </p>
            )}
            {/* Slide indicators - below text, mobile only */}
            <div className="flex lg:hidden gap-2 bg-[#F2F2F7] p-2 rounded-full w-fit pr-3">
              {carouselSlides.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === carouselSlide ? "bg-black" : "bg-gray-300"
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop slide indicators - centered above button */}
      {isIntroCarousel && (
        <div className="hidden lg:flex justify-center mb-6">
          <div className="flex gap-2 bg-[#F2F2F7] p-2 rounded-full w-fit pr-3">
            {carouselSlides.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${index === carouselSlide ? "bg-black" : "bg-gray-300"
                  }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular content layout (non-intro carousel steps) */}
      {!isIntroCarousel && (
        <div
          className={`overflow-y-auto py-8 w-full flex-1 flex flex-col min-h-0 ${currentStep === 0 || currentStepData.type === StepType.INFO_DYNAMIC
              ? "justify-center"
              : ""
            }`}
        >
          {/* Title section */}
          <div className="flex flex-col justify-center items-center text-center gap-2 w-full max-w-lg mx-auto px-4 flex-shrink-0">
            {/* Carousel title/description from current slide */}
            {isCarouselStep && currentCarouselSlide && (
              <>
                <h1 className="text-2xl md:text-4xl mb-4 font-rounded-bold w-full">
                  {currentCarouselSlide.title}
                </h1>
                {currentCarouselSlide.description && (
                  <p className="text-gray-600 mb-5 -mt-2">
                    {currentCarouselSlide.description}
                  </p>
                )}
              </>
            )}
            {/* Regular step title */}
            {!isCarouselStep && getStepTitle(currentStep) && (
              <h1 className={`mb-4 font-rounded-bold w-full ${currentStep === 0 ? "text-4xl" : "text-2xl md:text-4xl"}`}>
                {currentStep === 4 ? (
                  <>
                    What university do
                    <br className="hidden md:inline" />
                    {" "}you go to?
                  </>
                ) : (
                  getStepTitle(currentStep)
                )}
              </h1>
            )}
            {!isCarouselStep && currentStepData.hint && (
              <p className="text-base mx-auto mb-5 -mt-2 text-black/50">
                {currentStepData.hint}
              </p>
            )}
            {/* Show description for INFO_DYNAMIC (All set up step) */}
            {!isCarouselStep &&
              currentStepData.type === StepType.INFO_DYNAMIC && (
                <p className="text-base mx-auto mb-5 -mt-2 text-gray-600">
                  {onboardingData.university
                    ? `Join ${onboardingData.university} students using Medly as their thinking partner.`
                    : "Join thousands of students using Medly as their thinking partner."}
                </p>
              )}
            {/* Show description for other non-INFO steps */}
            {!isCarouselStep &&
              currentStepData.description &&
              currentStepData.type !== StepType.INFO &&
              currentStepData.type !== StepType.INFO_DYNAMIC && (
                <p className="text-base mx-auto mb-5 -mt-2">
                  {currentStepData.description}
                </p>
              )}
          </div>

          {/* Content section */}
          <div className={`max-w-lg mx-auto px-4 w-full ${isCarouselStep ? "flex-1 flex flex-col justify-center" : ""
            }`}>
            {/* Question steps */}
            {currentStepData.questions && (
              <QuestionSection
                currentStep={currentStep}
                steps={steps}
                onboardingData={onboardingData}
                handleAnswerChange={handleAnswerChange}
                handleUniversitySelect={handleUniversitySelect}
              />
            )}

            {/* Not a university student button - shown below university input */}
            {currentStep === 4 && (
              <button
                className="w-full text-center text-[#06B0FF] hover:text-[#05a0e8] py-2 text-sm transition-colors mt-2"
                onClick={handleSecondaryButtonClick}
              >
                Not a university student?
              </button>
            )}

            {/* Info steps */}
            {(currentStepData.type === StepType.INFO ||
              currentStepData.type === StepType.INFO_DYNAMIC) && (
                <InfoPage
                  title=""
                  description={currentStepData.type === StepType.INFO ? currentStepData.description : undefined}
                  showImagePlaceholder={currentStepData.imagePlaceholder}
                  imagePath={currentStepData.imagePath}
                  universityLogo={currentStepData.type === StepType.INFO_DYNAMIC ? onboardingData.universityLogo : undefined}
                />
              )}

            {/* Motivational steps */}
            {currentStepData.type === StepType.MOTIVATIONAL && (
              <MotivationalStep />
            )}
            {currentStepData.type === StepType.MOTIVATIONAL_FADED && (
              <MotivationalStep faded />
            )}
            {currentStepData.type === StepType.MOTIVATIONAL_MEDLY && (
              <MotivationalStep medly />
            )}

            {/* Carousel step (non-intro) */}
            {isCarouselStep && (
              <CarouselStep
                slides={carouselSlides}
                currentSlide={carouselSlide}
              />
            )}

            {/* Loading redirect step - shows loading screen */}
            {currentStepData.type === StepType.LOADING_REDIRECT && (
              <div className="flex flex-col items-center gap-6">
                <Spinner />
                <p className="text-gray-600">Setting up your workspace...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Button section */}
      {currentStepData.type !== StepType.LOADING_REDIRECT && (
        <div className="flex flex-col gap-2 w-full md:w-[260px] mx-auto py-4 px-4">
          <div
            className={
              isPrimaryButtonDisabled
                ? "opacity-50 transition-opacity"
                : "transition-opacity"
            }
          >
            <PrimaryButtonClicky
              disabled={isPrimaryButtonDisabled}
              buttonState="filled"
              buttonText={
                isCarouselStep
                  ? isLastCarouselSlide
                    ? "Continue"
                    : "Next"
                  : currentStepData.primaryButtonText || "Continue"
              }
              onPress={handlePrimaryButtonClick}
              showKeyboardShortcut={false}
              doesStretch={true}
            />
          </div>
          {currentStepData.secondaryButtonText && currentStep !== 4 && (
            <button
              className="text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors"
              onClick={handleSecondaryButtonClick}
            >
              {currentStepData.secondaryButtonText}
            </button>
          )}
        </div>
      )}

      {/* Not in university modal */}
      {isNotUniversityModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-[16px] text-center shadow-[0_0_32px_rgba(0,0,0,0.2)] overflow-hidden relative flex flex-col items-center w-[400px] max-w-[90vw]">
            <button
              onClick={() => setIsNotUniversityModalOpen(false)}
              className="absolute top-5 right-5"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="flex-1 flex flex-col p-5 pb-6 pt-12 justify-center items-center">
              <h1 className="text-2xl md:text-3xl mb-4 font-rounded-bold mx-4 md:mx-0 text-black">
                Not a university student?
              </h1>
              <p className="text-base mb-4 w-[80%] text-gray-500">
                Studying for GCSEs, A-Levels, IB, or IGCSEs? We've got a platform just for you.
              </p>
              <div className="w-full gap-2 flex flex-col pt-5">
                <PrimaryButtonClicky
                  buttonText="Go to Medly Exams"
                  showKeyboardShortcut={false}
                  doesStretch={true}
                  buttonState="filled"
                  onPress={handleGoToExamsPlatform}
                />
                <PrimaryButtonClicky
                  buttonText="Cancel"
                  showKeyboardShortcut={false}
                  doesStretch={true}
                  onPress={() => setIsNotUniversityModalOpen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenOnboardingPage;
