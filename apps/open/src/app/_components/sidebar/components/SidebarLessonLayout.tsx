import { useSubject } from "@/app/_hooks/useSubject";
import { lessonIdToSubjectId } from "@/app/_lib/utils/utils";
import { UnitWithTopics, TopicWithLessons, Lesson } from "@/app/types/types";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
// import ChevronUpSmallIcon from "../../icons/ChevronUpSmallIcon";
// import ChevronDownSmallIcon from "../../icons/ChevronDownSmallIcon";
import { usePathname } from "next/navigation";
import { useFeatureUsage } from "@/app/_hooks/useFeatureUsage";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import CircularProgressBar from "../../CircularProgressBar";
import { getSubjectTheme } from "@/app/_lib/utils/subjectTheme";
import Spinner from "../../Spinner";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import {
  knowledgeModelEvents,
  KnowledgeModelUpdateEvent,
} from "@/app/_lib/utils/knowledgeModelEvents";

interface SidebarLessonLayoutProps {
  subjectId?: string;
  searchQuery?: string;
}

function SidebarLessonLayout({
  subjectId: propSubjectId,
  searchQuery = "",
}: SidebarLessonLayoutProps) {
  const { track } = useTracking();
  const pathname = usePathname();
  const pathParts = pathname.split("/");
  const lessonId = pathParts.length > 2 ? pathParts[2] : "";
  const urlSubjectId = lessonIdToSubjectId(lessonId);
  // Use prop subjectId if provided, otherwise fall back to URL-based subjectId
  const subjectId = propSubjectId || urlSubjectId;
  const [expandedTopics, setExpandedTopics] = useState<boolean[][]>([]);
  const { featureUsage, isLoading: featureUsageLoading } = useFeatureUsage();
  const {
    hasActivePlan,
    isLoading: planDetailsLoading,
    error: planDetailsError,
  } = useHasActivePlan();

  const {
    data: subjectData,
    isLoading: isSubjectLoading,
    refetch: refetchSubject,
  } = useSubject(subjectId, undefined);

  // Track if we've loaded data at least once (to avoid spinner on refetches)
  const hasLoadedOnce = useRef(false);
  const previousSubjectId = useRef<string | null>(null);

  // Reset hasLoadedOnce when subject changes
  useEffect(() => {
    if (previousSubjectId.current !== subjectId) {
      hasLoadedOnce.current = false;
      previousSubjectId.current = subjectId;
    }
  }, [subjectId]);

  // Debounce timer for subject refetch to update question progress
  const subjectRefetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for knowledge model updates and refetch subject progress
  useEffect(() => {
    const handleKnowledgeModelUpdate = (event: KnowledgeModelUpdateEvent) => {
      // Only refetch if the event is for a lesson in this subject
      const eventSubjectId = lessonIdToSubjectId(event.lessonId);
      if (eventSubjectId !== subjectId) {
        return;
      }

      // Debounced refetch of subject progress
      // Clear any existing timer
      if (subjectRefetchTimerRef.current) {
        clearTimeout(subjectRefetchTimerRef.current);
      }

      // Set new timer to refetch after 1 second of inactivity
      // This ensures we don't spam the API if user marks multiple questions quickly
      subjectRefetchTimerRef.current = setTimeout(() => {
        refetchSubject();
      }, 1000);
    };

    // Subscribe to events
    const unsubscribe = knowledgeModelEvents.subscribe(
      handleKnowledgeModelUpdate
    );

    // Cleanup on unmount
    return () => {
      unsubscribe();
      if (subjectRefetchTimerRef.current) {
        clearTimeout(subjectRefetchTimerRef.current);
      }
    };
  }, [subjectId, refetchSubject]);

  useEffect(() => {
    if (!subjectData) return;

    // Mark that we've loaded data at least once
    hasLoadedOnce.current = true;

    // Check if this is an English Language subject
    const isEnglishLanguageSubject = subjectData.title === "English Language";

    const newExpandedTopics = subjectData.units.map(
      (unit: UnitWithTopics, unitIndex: number) =>
        unit.topics.map((topic: TopicWithLessons, topicIndex: number) => {
          // For English Language subjects, expand all topics by default
          if (isEnglishLanguageSubject) {
            return true;
          }
          // Always expand the first topic of the first unit
          if (unitIndex === 0 && topicIndex === 0) {
            return true;
          }
          // Also expand topics that contain the current lesson
          return topic.lessons.some(
            (lesson: Lesson) => lesson.legacyId === lessonId
          );
        })
    );
    setExpandedTopics(newExpandedTopics);
  }, [subjectData, lessonId]);

  const handleToggleExpandTopic =
    (unitIndex: number, topicIndex: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      const newExpandedTopics = [...expandedTopics];
      if (!newExpandedTopics[unitIndex]) {
        newExpandedTopics[unitIndex] = [];
      }
      newExpandedTopics[unitIndex][topicIndex] =
        !newExpandedTopics[unitIndex]?.[topicIndex];
      setExpandedTopics(newExpandedTopics);
    };

  // Only show loading spinner on initial load, not on refetches
  const isInitialLoading =
    !hasLoadedOnce.current &&
    (expandedTopics.length === 0 ||
      isSubjectLoading ||
      !subjectData ||
      featureUsageLoading ||
      planDetailsLoading);

  if (isInitialLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Spinner size="normal" style="dark" />
      </div>
    );
    // (
    //   <div className="overflow-y-hidden text-sm">
    //     <div className="flex flex-col">
    //       <div className={`flex flex-col gap-1 mt-4`}>
    //         <div className="flex w-full px-2 py-2 gap-1 items-center text-[#00AEFF] rounded-xl text-sm font-rounded-bold">
    //           <div className="h-6 w-6 bg-[#F3F3FB] rounded-full animate-pulse"></div>
    //           <div className="h-5 w-36 bg-[#F3F3FB] rounded-xl animate-pulse"></div>
    //         </div>

    //         <div className="flex w-full px-4 py-2 justify-between items-center text-black rounded-xl text-sm font-medium">
    //           <div className="h-5 w-48 bg-[#F3F3FB] rounded-xl animate-pulse"></div>
    //         </div>
    //       </div>

    //       <div>
    //         {[1, 2, 3].map((i) => (
    //           <div key={i} className="flex flex-col gap-1">
    //             <div className="flex w-full px-4 py-2 justify-between items-center text-black rounded-xl text-sm font-medium">
    //               <div className="h-5 w-36 bg-[#F3F3FB] rounded-xl animate-pulse"></div>
    //               <div className="h-5 w-5 bg-[#F3F3FB] rounded-xl animate-pulse"></div>
    //             </div>
    //           </div>
    //         ))}
    //       </div>
    //     </div>
    //   </div>
    // );
  }

  if (planDetailsError) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Error loading subject content</p>
      </div>
    );
  }

  const showLock = !hasActivePlan && featureUsage.isFreeUseFinished;

  // Find which unit contains the current lesson
  const currentUnitIndex =
    subjectData?.units.findIndex((unit: UnitWithTopics) =>
      unit.topics.some((topic: TopicWithLessons) =>
        topic.lessons.some((lesson: Lesson) => lesson.legacyId === lessonId)
      )
    ) ?? -1;

  // Get the theme for the current subject
  const theme = subjectData?.title ? getSubjectTheme(subjectData.title) : null;

  // Helper function to filter out lessons with 0 questions and empty topics/units
  const filterEmptyLessons = (data: typeof subjectData) => {
    if (!data) return data;
    return {
      ...data,
      units: data.units
        .map((unit: UnitWithTopics) => {
          const filteredTopics = unit.topics
            .map((topic: TopicWithLessons) => {
              // Filter out lessons with 0 total questions
              const validLessons = topic.lessons.filter(
                (lesson: Lesson) => lesson.totalQuestions > 0
              );
              if (validLessons.length === 0) return null;
              return { ...topic, lessons: validLessons };
            })
            .filter(Boolean) as TopicWithLessons[];
          if (filteredTopics.length === 0) return null;
          return { ...unit, topics: filteredTopics };
        })
        .filter(Boolean) as UnitWithTopics[],
    };
  };

  // Filter lessons based on search query - search across units, topics, and lessons
  const filteredSubjectData = (() => {
    // First apply the empty lessons filter
    const dataWithValidLessons = filterEmptyLessons(subjectData);
    
    if (!dataWithValidLessons || !searchQuery) {
      return dataWithValidLessons;
    }

    return {
      ...dataWithValidLessons,
      units: dataWithValidLessons.units
        .map((unit: UnitWithTopics) => {
          // Check if unit title matches
          const unitMatches = unit.title
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

          // Filter topics and lessons
          const filteredTopics = unit.topics
            .map((topic: TopicWithLessons) => {
              // Check if topic title matches
              const topicMatches = topic.title
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

              // Filter lessons
              const filteredLessons = topic.lessons.filter(
                (lesson: Lesson) =>
                  lesson.title
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
              );

              // Include topic if:
              // 1. Topic title matches (show all lessons)
              // 2. Unit title matches (show all lessons)
              // 3. At least one lesson matches
              if (topicMatches || unitMatches) {
                return topic; // Return original topic with all lessons
              } else if (filteredLessons.length > 0) {
                return { ...topic, lessons: filteredLessons }; // Return topic with filtered lessons
              }
              return null;
            })
            .filter(Boolean) as TopicWithLessons[];

          // Include unit if it has any matching topics or if unit title matches
          if (unitMatches) {
            return unit; // Return original unit with all topics
          } else if (filteredTopics.length > 0) {
            return { ...unit, topics: filteredTopics }; // Return unit with filtered topics
          }
          return null;
        })
        .filter(Boolean) as UnitWithTopics[],
    };
  })();

  return (
    <div className="px-4 flex flex-col overflow-x-hidden">
      {searchQuery && filteredSubjectData?.units.length === 0 && (
        <div className="flex justify-center items-center h-32">
          <p className="text-sm text-gray-500">
            No units, topics, or lessons found for "{searchQuery}"
          </p>
        </div>
      )}
      {filteredSubjectData?.units.map(
        (unit: UnitWithTopics, unitIndex: number) => {
          const isCurrentUnit = unitIndex === currentUnitIndex;

          return (
            <div
              key={unitIndex}
              className="flex flex-col mb-4 border border-[#F2F2F7] rounded-[16px] overflow-hidden"
            >
              <div
                className="flex flex-col p-4"
                style={{
                  backgroundColor:
                    isCurrentUnit && theme
                      ? `${theme.primaryColor}1A` // 10% opacity (1A in hex)
                      : "#F7F7FA",
                }}
              >
                <div
                  className="text-[10px]"
                  style={{
                    color: isCurrentUnit && theme ? theme.primaryColor : "#000",
                  }}
                >
                  UNIT {unitIndex + 1}
                </div>
                <div
                  className="font-rounded-bold text-[15px]"
                  style={{
                    color: isCurrentUnit && theme ? theme.primaryColor : "#000",
                  }}
                >
                  {unit.title}
                </div>
              </div>

              <div className="flex flex-col p-4 gap-2">
                {unit.topics.map(
                  (topic: TopicWithLessons, topicIndex: number) => {
                    const isTopicOpen =
                      expandedTopics[unitIndex]?.[topicIndex] || false;
                    return (
                      <div key={topicIndex} className="flex flex-col">
                        <button
                          className={`cursor-pointer flex w-full gap-2 justify-between items-center text-black text-sm font-medium pb-2`}
                          onClick={handleToggleExpandTopic(
                            unitIndex,
                            topicIndex
                          )}
                        >
                          <div className="flex flex-1 flex-row gap-1 items-center truncate opacity-80 font-rounded-bold text-[14px]">
                            {topic.title}
                            {showLock && (
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 28 28"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="flex-shrink-0"
                              >
                                <g clipPath="url(#clip0_298_837)">
                                  <path
                                    d="M9.87793 22.2148H18.1133C19.4668 22.2148 20.1436 21.5381 20.1436 20.0615V13.8389C20.1436 12.5381 19.6162 11.8613 18.5527 11.7207V9.66406C18.5527 6.32422 16.3291 4.71582 13.9912 4.71582C11.6621 4.71582 9.43848 6.32422 9.43848 9.66406V11.7207C8.375 11.8613 7.84766 12.5381 7.84766 13.8389V20.0615C7.84766 21.5381 8.51562 22.2148 9.87793 22.2148ZM11.1084 9.49707C11.1084 7.43164 12.418 6.31543 13.9912 6.31543C15.5645 6.31543 16.8828 7.43164 16.8828 9.49707V11.6943H11.1084V9.49707ZM10.1328 20.6504C9.74609 20.6504 9.55273 20.4658 9.55273 20V13.9004C9.55273 13.4346 9.74609 13.2676 10.1328 13.2676H17.8672C18.2539 13.2676 18.4385 13.4346 18.4385 13.9004V20C18.4385 20.4658 18.2539 20.6504 17.8672 20.6504H10.1328Z"
                                    fill="rgba(0,0,0,0.5)"
                                  />
                                </g>
                                <defs>
                                  <clipPath id="clip0_298_837">
                                    <rect width="28" height="28" fill="white" />
                                  </clipPath>
                                </defs>
                              </svg>
                            )}
                          </div>
                          {isTopicOpen ? (
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M11.9999 8.15289C11.7363 8.16043 11.4952 8.25836 11.2993 8.4693L5.57387 14.3303C5.40813 14.4961 5.31773 14.707 5.31773 14.9556C5.31773 15.4528 5.70947 15.8521 6.20668 15.8521C6.44775 15.8521 6.68129 15.7542 6.85456 15.5809L11.9924 10.2999L17.1453 15.5809C17.3186 15.7466 17.5446 15.8521 17.7932 15.8521C18.2904 15.8521 18.6821 15.4528 18.6821 14.9556C18.6821 14.707 18.5917 14.4961 18.426 14.3303L12.693 8.4693C12.4896 8.25836 12.2636 8.15289 11.9999 8.15289Z"
                                fill="#1C1C1E"
                              />
                            </svg>
                          ) : (
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12.0001 15.8471C12.2637 15.8396 12.5048 15.7416 12.7007 15.5307L18.4261 9.66965C18.5919 9.50391 18.6823 9.29298 18.6823 9.04437C18.6823 8.54716 18.2905 8.14789 17.7933 8.14789C17.5522 8.14789 17.3187 8.24582 17.1454 8.41909L12.0076 13.7001L6.8547 8.41909C6.68143 8.25336 6.45543 8.14789 6.20682 8.14789C5.70961 8.14789 5.31787 8.54716 5.31787 9.04437C5.31787 9.29298 5.40827 9.50391 5.57401 9.66965L11.307 15.5307C11.5104 15.7416 11.7364 15.8471 12.0001 15.8471Z"
                                fill="#1C1C1E"
                              />
                            </svg>
                          )}
                        </button>

                        {isTopicOpen && (
                          <div className="flex flex-col">
                            {topic.lessons.map(
                              (lesson: Lesson, lessonIndex: number) => {
                                return (
                                  <Link
                                    key={lessonIndex}
                                    className={`cursor-pointer flex justify-between items-center text-black text-[13px] py-2 group transition-none duration-150`}
                                    href={`/lessons/${
                                      lesson.legacyId
                                    }/${(() => {
                                      const pathSegment =
                                        pathname.split("/")[3];
                                      // Default to practice if the path segment is not valid for lessons
                                      return pathSegment === "practice" ||
                                        pathSegment === "learn"
                                        ? pathSegment
                                        : "practice";
                                    })()}`}
                                    onClick={() => {
                                      localStorage.setItem(
                                        "sidebarMode",
                                        "learn"
                                      );
                                      track("clicked_lesson", {
                                        lesson_id: lesson.legacyId,
                                      });
                                    }}
                                  >
                                    <div
                                      className={`flex flex-row gap-1 items-center truncate transition-all duration-150 ${
                                        lesson.legacyId === lessonId
                                          ? "text-[#595959] font-medium"
                                          : "text-[#595959]/50 group-hover:text-[#595959] group-hover:font-medium"
                                      }`}
                                    >
                                      {lesson.title}
                                      {showLock && (
                                        <svg
                                          width="24"
                                          height="24"
                                          viewBox="0 0 28 28"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="flex-shrink-0"
                                        >
                                          <g clipPath="url(#clip0_298_837)">
                                            <path
                                              d="M9.87793 22.2148H18.1133C19.4668 22.2148 20.1436 21.5381 20.1436 20.0615V13.8389C20.1436 12.5381 19.6162 11.8613 18.5527 11.7207V9.66406C18.5527 6.32422 16.3291 4.71582 13.9912 4.71582C11.6621 4.71582 9.43848 6.32422 9.43848 9.66406V11.7207C8.375 11.8613 7.84766 12.5381 7.84766 13.8389V20.0615C7.84766 21.5381 8.51562 22.2148 9.87793 22.2148ZM11.1084 9.49707C11.1084 7.43164 12.418 6.31543 13.9912 6.31543C15.5645 6.31543 16.8828 7.43164 16.8828 9.49707V11.6943H11.1084V9.49707ZM10.1328 20.6504C9.74609 20.6504 9.55273 20.4658 9.55273 20V13.9004C9.55273 13.4346 9.74609 13.2676 10.1328 13.2676H17.8672C18.2539 13.2676 18.4385 13.4346 18.4385 13.9004V20C18.4385 20.4658 18.2539 20.6504 17.8672 20.6504H10.1328Z"
                                              fill="rgba(0,0,0,0.5)"
                                            />
                                          </g>
                                          <defs>
                                            <clipPath id="clip0_298_837">
                                              <rect
                                                width="28"
                                                height="28"
                                                fill="white"
                                              />
                                            </clipPath>
                                          </defs>
                                        </svg>
                                      )}
                                    </div>

                                    <div className="flex flex-row items-center">
                                      <div
                                        className={`ml-2 transition-all duration-150 ${
                                          lesson.legacyId === lessonId
                                            ? "text-black"
                                            : "text-[#595959]/50 group-hover:text-black"
                                        }`}
                                      >
                                        <span className="font-rounded-bold text-[15px]">
                                          {lesson.answeredQuestions ?? 0}
                                        </span>
                                        <span className="font-rounded-bold text-[10px]">
                                          /{lesson.totalQuestions ?? 0}
                                        </span>
                                      </div>
                                      <div className="ml-2">
                                        <CircularProgressBar
                                          progress={
                                            lesson.totalQuestions > 0
                                              ? (lesson.answeredQuestions /
                                                  lesson.totalQuestions) *
                                                100
                                              : 0
                                          }
                                          size={20}
                                          strokeWidth={4}
                                          strokeColor={theme?.primaryColor}
                                        />
                                      </div>
                                    </div>
                                  </Link>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}

export default SidebarLessonLayout;
