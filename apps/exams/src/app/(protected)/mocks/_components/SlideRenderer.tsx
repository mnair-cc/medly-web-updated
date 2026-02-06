import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
import { slideVariants, WRAPPED_SEEN_KEY } from "../_constants/slides";
import WelcomeSlide from "./slides/WelcomeSlide";
import LoadingSlide from "./slides/LoadingSlide";
import CompletedPapersSlide from "./slides/CompletedPapersSlide";
import GradesSlide from "./slides/GradesSlide";
import TimeSpentSlide from "./slides/TimeSpentSlide";
import SummarySlide from "./slides/SummarySlide";
import { InsightsData, Slide } from "../_types/types";
import { useEffect, useState } from "react";
import WithOthersSlide from "./slides/WithOthersSlide";
import BestSubjectSlide from "./slides/BestSubjectSlide";
import PercentileSlide from "./slides/PercentileSlide";
import { UserDetails } from "@/app/types/types";
import LetsSeeSlide from "./slides/LetsSeeSlide";
import { deconstructSubjectLegacyId } from "@/app/_lib/utils/utils";
import StrongestTopicsSlide from "./slides/StrongestTopicsSlide";
import WeakestTopicsSlide from "./slides/WeakestTopicsSlide";
import SchoolLeaderboardSlide from "./slides/SchoolLeaderboardSlide";
import schools from "../_constants/schools.json";
import { useRouter } from "next/navigation";

import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";

type School = (typeof schools)[0];

const SlideRenderer = ({
  currentSlideIndex,
  handleNext,
  insightsData,
  user,
  onAnimationStart,
  slides,
}: {
  currentSlideIndex: number;
  handleNext: () => void;
  insightsData: InsightsData;
  user: UserDetails;
  onAnimationStart?: (duration?: number) => void;
  slides: Slide[];
}) => {
  const router = useRouter();
  const currentSlide = slides[currentSlideIndex];
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [envelopeOpened, setEnvelopeOpened] = useState(false);
  const [peaksAppeared, setPeaksAppeared] = useState(false);

  const handleSummaryFinish = () => {
    localStorage.setItem(WRAPPED_SEEN_KEY, "true");
    router.push("/");
  };

  // Reset envelope state when leaving grades slide
  useEffect(() => {
    if (currentSlide?.type !== "grades") {
      setEnvelopeOpened(false);
    }
  }, [currentSlide?.type]);

  // Reset peaks state when slide changes (so it resets between strongest and weakest topics too)
  useEffect(() => {
    setPeaksAppeared(false);
  }, [currentSlide?.type]);

  // Auto-transition from loading slide after animations complete
  useEffect(() => {
    if (currentSlide?.type === "loading") {
      const timer = setTimeout(() => {
        handleNext();
      }, 3500); // 2 seconds to account for all animations and a small buffer
      return () => clearTimeout(timer);
    }
  }, [currentSlide?.type, handleNext]);

  const handleSaveSchool = async () => {
    if (selectedSchool) {
      handleNext();
    }
  };

  if (!currentSlide) return null;

  const replacePlaceholders = (text: string | undefined) => {
    if (!text) return "";

    return text.replace(/{(\w+)}/g, (match, key) => {
      switch (key) {
        case "numberOfPapers":
          return insightsData.paperInsights.length.toString();
        case "paperOrPapers":
          return insightsData.paperInsights.length === 1 ? "Paper" : "Papers";
        case "hours":
          return Math.floor(
            insightsData.paperInsights.reduce((acc, paper) => acc + 90, 0) / 60
          ).toString();
        case "hourOrHours":
          return insightsData.paperInsights.reduce(
            (acc, paper) => acc + 90,
            0
          ) /
            60 ===
            1
            ? "hour"
            : "hours";
        case "hoursAndMinutes":
          const hours = Math.floor(insightsData.timeSpentInMinutes / 60);
          const minutes = insightsData.timeSpentInMinutes % 60;
          return `${hours}h ${minutes}m`;
        case "subject": {
          const { subjectTitle } = deconstructSubjectLegacyId(
            insightsData.subjectInsights[0]?.subjectId
          );
          return subjectTitle;
        }
        case "award":
          return insightsData.awards?.[0] || "";
        default:
          return match;
      }
    });
  };

  const renderSlide = (slide: Slide) => {
    const slideContent = (() => {
      switch (slide.type) {
        case "completed_papers":
          return (
            <CompletedPapersSlide paperInsights={insightsData.paperInsights} />
          );
        case "time_spent":
          return (
            <TimeSpentSlide
              timeSpentInMinutes={insightsData.paperInsights.reduce(
                (acc, paper) => acc + 90,
                0
              )}
            />
          );
        case "lets_see":
          return <LetsSeeSlide />;
        case "grades":
          return (
            <GradesSlide
              userName={user.userName}
              candidateId={insightsData.candidateId}
              paperResults={insightsData.paperInsights}
              onAnimationStart={onAnimationStart}
              onEnvelopeOpened={() => setEnvelopeOpened(true)}
            />
          );
        case "with_others":
          return <WithOthersSlide />;
        case "best_subject":
          return (
            <BestSubjectSlide bestSubject={insightsData.subjectInsights[0]} />
          );
        case "percentile":
          return (
            <PercentileSlide
              avatar={user.avatar}
              award={insightsData.awards?.[0] || ""}
            />
          );
        case "school_leaderboard":
          return <SchoolLeaderboardSlide onSchoolChange={setSelectedSchool} />;
        case "strongest_topics":
          return (
            <StrongestTopicsSlide
              strongestTopics={insightsData.strongestTopics}
              onMountainsAppear={() => setPeaksAppeared(true)}
              onAnimationStart={onAnimationStart}
            />
          );
        case "weakest_topics":
          return (
            <WeakestTopicsSlide
              weakestTopics={insightsData.weakestTopics}
              strongestTopics={insightsData.strongestTopics}
              onPeaksAppear={() => setPeaksAppeared(true)}
              onAnimationStart={onAnimationStart}
            />
          );
        case "summary":
          return <SummarySlide insightsData={insightsData} />;
      }
    })();

    // Return summary slide without any wrapper (it handles everything itself)
    if (slide.type === "summary") {
      return slideContent;
    }

    // Return slides without animation for topics slides
    if (slide.type === "strongest_topics" || slide.type === "weakest_topics") {
      return (
        <div className="flex flex-col flex-1 justify-center items-center">
          <div className="mt-12 sm:mt-24 z-10 text-center w-[65%] sm:w-auto">
            <h1 className="text-3xl sm:text-4xl font-rounded-bold">
              {replacePlaceholders(currentSlide.title1)}
            </h1>
            <h1 className="text-3xl sm:text-4xl font-rounded-bold">
              {replacePlaceholders(currentSlide.title2)}
            </h1>
            <h1 className="text-3xl sm:text-4xl font-rounded-bold">
              {replacePlaceholders(currentSlide.title3)}
            </h1>
            <p className="text-sm sm:text-lg font-medium text-white/50 sm:max-w-xl mt-2 sm:mt-4">
              {currentSlide.subtitle}
            </p>
          </div>
          <br />
          {slideContent}
        </div>
      );
    }

    // Special animation for first content slide (completed_papers)
    const isFirstContentSlide = slide.type === "completed_papers";

    return (
      <motion.div
        key={currentSlideIndex}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={
          isFirstContentSlide
            ? { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }
            : undefined
        }
        className="h-full flex flex-col items-center"
      >
        <motion.div
          className="mt-8 sm:mt-16 z-10 text-center w-[65%] sm:w-auto"
          initial={isFirstContentSlide ? { opacity: 0, y: 30 } : false}
          animate={isFirstContentSlide ? { opacity: 1, y: 0 } : undefined}
          transition={
            isFirstContentSlide
              ? { duration: 0.7, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }
              : undefined
          }
        >
          {slide.type === "best_subject" ? (
            <>
              {/* Mobile: separate lines */}
              <h1 className="text-3xl font-rounded-bold sm:hidden">
                {replacePlaceholders(currentSlide.title1)}
              </h1>
              <h1 className="text-3xl font-rounded-bold sm:hidden">
                {replacePlaceholders(currentSlide.title2)}
              </h1>
              {/* Desktop: single line */}
              <h1 className="hidden sm:block text-4xl font-rounded-bold">
                {replacePlaceholders(currentSlide.title1)}{" "}
                {replacePlaceholders(currentSlide.title2)}
              </h1>
            </>
          ) : (
            <>
              <h1
                className={`text-3xl sm:text-4xl font-rounded-bold ${
                  slide.type === "percentile" ? "max-w-md sm:max-w-2xl" : ""
                }`}
              >
                {replacePlaceholders(currentSlide.title1)}
              </h1>
              <h1 className="text-3xl sm:text-4xl font-rounded-bold">
                {replacePlaceholders(currentSlide.title2)}
              </h1>
              <h1 className="text-3xl sm:text-4xl font-rounded-bold">
                {replacePlaceholders(currentSlide.title3)}
              </h1>
            </>
          )}
          <p className="text-base sm:text-2xl font-medium text-white/50 sm:max-w-xl mt-2 sm:mt-4">
            {currentSlide.subtitle}
          </p>
        </motion.div>
        <br />
        {slideContent}
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col flex-1 justify-center items-center w-full">
      <AnimatePresence mode="wait">
        {currentSlide.type === "welcome" ? (
          <motion.div
            key={currentSlideIndex}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            className="h-full"
          >
            <WelcomeSlide onNext={handleNext} />
          </motion.div>
        ) : currentSlide.type === "loading" ? (
          <motion.div
            key={currentSlideIndex}
            variants={slideVariants}
            animate="center"
            initial="enter"
            exit="exit"
            className="h-full"
          >
            <LoadingSlide />
          </motion.div>
        ) : (
          renderSlide(currentSlide)
        )}
      </AnimatePresence>
      <AnimatePresence>
        {currentSlide.showNextButton !== false &&
          (currentSlide.type !== "grades" || envelopeOpened) &&
          (currentSlide.type !== "strongest_topics" || peaksAppeared) &&
          (currentSlide.type !== "weakest_topics" || peaksAppeared) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`absolute bottom-0 flex flex-col items-center gap-2 sm:gap-4 mb-4 sm:mb-8 ${
                currentSlide.type !== "school_leaderboard" && "z-[1000]"
              }`}
            >
              <PrimaryButtonClicky
                buttonText={currentSlide.buttonText || "Continue"}
                onPress={
                  currentSlide.type === "summary"
                    ? handleSummaryFinish
                    : currentSlide.type === "school_leaderboard"
                      ? handleSaveSchool
                      : handleNext
                }
                disabled={
                  currentSlide.type === "school_leaderboard" && !selectedSchool
                }
                showKeyboardShortcut={false}
                isLong={true}
              ></PrimaryButtonClicky>
              {currentSlide.type === "school_leaderboard" && (
                <button
                  className="flex items-center gap-2 hover:underline text-white z-[1000]"
                  onClick={handleNext}
                >
                  Skip
                </button>
              )}
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default SlideRenderer;
