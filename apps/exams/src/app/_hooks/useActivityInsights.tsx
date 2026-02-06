import { useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { curriculumApiV2Client } from "../_lib/utils/axiosHelper";
import { queryKeys } from "../_lib/query-keys";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useSubject } from "./useSubject";
import { LessonProgressData } from "./useSubjectTypes";
import {
  knowledgeModelEvents,
  KnowledgeModelUpdateEvent,
} from "../_lib/utils/knowledgeModelEvents";

interface ProgressChartData {
  week: string; // Week commencement date like "25/1"
  value: number; // Number of lessons mastered that week
}

interface ActivityGridData {
  date: string; // ISO date string
  questionCount: number;
}

interface TimelineActivity {
  lessonId: string;
  title: string;
  subtitle: string;
  n_questions: number;
  grade: number;
  delta: number;
}

interface TimelineData {
  date: Date;
  activities: TimelineActivity[];
}

export interface PlanItem {
  lessonId: string;
  title: string;
  subtitle: string;
  grade: string;
  gradeColor: string;
  progress?: number; // p_mastery as percentage (0-100)
}

export interface LessonGridItem {
  lessonId: string;
  title: string;
  topicTitle: string;
  pMastery: number | null; // p_mastery value (0-1) or null if no data
  answeredQuestions: number;
  totalQuestions: number;
}

export interface UnitLessonGrid {
  unitId: string;
  unitTitle: string;
  unitIndex: number;
  lessons: LessonGridItem[];
}

export interface ActivityInsightsData {
  progressChart: ProgressChartData[];
  activityGrid: ActivityGridData[];
  timeline: TimelineData[];
  // Computed values
  totalProgress: number;
  weekStreak: number;
  activityCalendar: number[][]; // 14 weeks × 7 days
  totalSpecPointsCovered: number; // unique lessons with at least 1 question attempted
  progressChartCovered: ProgressChartData[]; // weekly spec points covered over time
  planData: PlanItem[];
  totalSpecPoints: number;
  lessonGrid: UnitLessonGrid[]; // lesson grid organized by units
}

// Minimal shape used in Insights for per-lesson mastery/progress
type LessonStoreProgress = {
  lesson_id: string;
  p_mastery: number;
  questions_answered?: number;
  total_questions?: number;
  // Optional KM fields when updates come from practice sessions
  mu?: number;
  sigma?: number;
  mastery_tier?: number;
  rank?: number;
};

const generateEmptyProgressChart = (): ProgressChartData[] => {
  const today = new Date();
  const emptyData: ProgressChartData[] = [];

  // Generate last 5 weeks with 0 values to show empty axes
  for (let i = 4; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - i * 7);

    // Format as "day/month" to match the expected format
    const formattedDate = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;

    emptyData.push({
      week: formattedDate,
      value: 0,
    });
  }

  return emptyData;
};

const generateEmptyActivityCalendar = (): number[][] => {
  const weeks = [];
  for (let week = 0; week < 14; week++) {
    const weekData = [];
    for (let day = 0; day < 7; day++) {
      weekData.push(0);
    }
    weeks.push(weekData);
  }
  return weeks;
};

interface RawActivityInsightsData {
  progressChart: ProgressChartData[];
  activityGrid: ActivityGridData[];
  timeline: TimelineData[];
}

export const useActivityInsights = (subjectId: string | null) => {
  const queryClient = useQueryClient();

  // Fetch curriculum data
  const {
    data: subjectData,
    isLoading: subjectLoading,
    error: subjectError,
    refetch: refetchSubject,
    progressLessons,
  } = useSubject(subjectId || "");

  // Fetch insights data via React Query
  const {
    data: rawData,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights,
  } = useQuery({
    queryKey: queryKeys.subjectInsights(subjectId!),
    queryFn: async () => {
      const insightsResponse = await curriculumApiV2Client.get<{
        data: RawActivityInsightsData;
      }>(`/subjects/${subjectId}/insights`);

      // Process timeline dates (convert string dates back to Date objects)
      return {
        ...insightsResponse.data.data,
        timeline: insightsResponse.data.data.timeline.map((item) => ({
          ...item,
          date: new Date(item.date),
        })),
      } as RawActivityInsightsData;
    },
    enabled: !!subjectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Return empty data on 404 (no insights yet)
    retry: (failureCount, error) => {
      const axiosError = error as AxiosError;
      if (
        axiosError.response?.status === 404 ||
        axiosError.response?.status === 401
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Provide fallback empty data when there's a 404
  const effectiveRawData = useMemo(() => {
    if (rawData) return rawData;
    if (insightsError) {
      const axiosError = insightsError as AxiosError;
      if (axiosError.response?.status === 404) {
        return {
          progressChart: generateEmptyProgressChart(),
          activityGrid: [],
          timeline: [],
        } as RawActivityInsightsData;
      }
    }
    return null;
  }, [rawData, insightsError]);

  // Show error toast for non-recoverable errors (not 401/404)
  useEffect(() => {
    if (insightsError) {
      const axiosError = insightsError as AxiosError;
      if (
        axiosError.response?.status !== 401 &&
        axiosError.response?.status !== 404
      ) {
        toast.error("Failed to load activity insights");
      }
    }
  }, [insightsError]);

  // Build lesson mastery map from already-fetched subject progress (no extra API call)
  const lessonStores = useMemo(() => {
    if (!subjectId) return {};

    const lessons = progressLessons || {};
    const mapped: Record<string, LessonStoreProgress> = {};
    Object.entries(lessons).forEach(([lessonId, p]) => {
      const progress = p as LessonProgressData;
      const masteryScore =
        typeof progress?.mastery_score === "number" ? progress.mastery_score : 0;
      const questionsAnswered = progress?.answered_question_legacy_ids?.length ?? 0;

      // Only include lessons that have actual activity (mastery > 0 OR questions answered > 0)
      if (masteryScore > 0 || questionsAnswered > 0) {
        mapped[lessonId] = {
          lesson_id: lessonId,
          p_mastery: masteryScore,
          questions_answered: questionsAnswered,
        };
      }
    });

    return mapped;
  }, [subjectId, progressLessons]);

  // Helper function to flatten curriculum into ordered lessons
  const getFlattenedLessons = useCallback(() => {
    if (!subjectData) return [];

    const lessons: Array<{
      lessonId: string;
      title: string;
      unitTitle: string;
      topicTitle: string;
      unitIndex: number;
      topicIndex: number;
      lessonIndex: number;
    }> = [];

    subjectData.units.forEach((unit, unitIndex) => {
      unit.topics.forEach((topic, topicIndex) => {
        topic.lessons.forEach((lesson, lessonIndex) => {
          lessons.push({
            lessonId: lesson.legacyId,
            title: lesson.title,
            unitTitle: unit.title,
            topicTitle: topic.title,
            unitIndex,
            topicIndex,
            lessonIndex,
          });
        });
      });
    });

    return lessons;
  }, [subjectData]);

  // Helper function to enrich timeline data with lesson titles from curriculum
  const enrichTimelineData = useCallback(
    (timeline: TimelineData[]) => {
      const flattenedLessons = getFlattenedLessons();
      if (!flattenedLessons.length) return timeline;

      return timeline.map((dayData) => ({
        ...dayData,
        activities: dayData.activities.map((activity) => {
          const lessonInfo = flattenedLessons.find(
            (l) => l.lessonId === activity.lessonId
          );

          if (lessonInfo) {
            return {
              ...activity,
              title: lessonInfo.title,
              subtitle: `Unit ${lessonInfo.unitIndex + 1} · ${lessonInfo.topicTitle}`,
            };
          }

          // Fallback if lesson not found in curriculum
          return activity;
        }),
      }));
    },
    [getFlattenedLessons]
  );

  const refetch = useCallback(() => {
    refetchInsights();
  }, [refetchInsights]);

  // Track last processed event to prevent React Strict Mode double-processing
  const lastProcessedEvent = useRef<string | null>(null);
  // Debounce timer for subject refetch to update question progress
  const subjectRefetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for knowledge model updates and apply them optimistically
  useEffect(() => {
    const handleKnowledgeModelUpdate = (event: KnowledgeModelUpdateEvent) => {
      // Skip if no subject is selected - can't update cache without valid subjectId
      if (!subjectId) return;

      // Create unique event ID based on lesson and p_mastery (which changes per question)
      const eventId = `${event.lessonId}-${event.updates.p_mastery}`;

      // Skip if we just processed this exact event (React Strict Mode duplicate)
      if (lastProcessedEvent.current === eventId) {
        return;
      }
      lastProcessedEvent.current = eventId;

      // Optimistically update subject progress (mastery) in cache
      // This ensures lessonStores, totalSpecPointsCovered, planData, and lessonGrid.pMastery
      // update immediately without waiting for the debounced refetch
      queryClient.setQueryData<Record<string, LessonProgressData>>(
        queryKeys.subjectProgress(subjectId),
        (prev) => {
          if (!prev) {
            // If no previous data, create minimal entry for this lesson
            return {
              [event.lessonId]: {
                answered_question_legacy_ids: [],
                mastery_score: event.updates.p_mastery,
              },
            };
          }

          const existingLesson = prev[event.lessonId];
          return {
            ...prev,
            [event.lessonId]: {
              // Preserve existing answered questions, or empty array if new lesson
              answered_question_legacy_ids:
                existingLesson?.answered_question_legacy_ids ?? [],
              // Update mastery score from event
              mastery_score: event.updates.p_mastery,
            },
          };
        }
      );

      // Optimistically update timeline in cache
      if (event.sessionInfo) {
        const sessionInfo = event.sessionInfo as NonNullable<
          KnowledgeModelUpdateEvent["sessionInfo"]
        >;

        queryClient.setQueryData<RawActivityInsightsData>(
          queryKeys.subjectInsights(subjectId),
          (prev) => {
            if (!prev) return prev;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const newTimeline = [...prev.timeline];

            // Find or create today's entry
            let todayIndex = newTimeline.findIndex((day) => {
              const dayDate = new Date(day.date);
              dayDate.setHours(0, 0, 0, 0);
              return dayDate.getTime() === today.getTime();
            });

            if (todayIndex === -1) {
              // Create new day entry at the beginning
              newTimeline.unshift({
                date: today,
                activities: [],
              });
              todayIndex = 0;
            }

            // Find or create activity for this lesson today
            const activities = [...newTimeline[todayIndex].activities];
            const activityIndex = activities.findIndex(
              (a) => a.lessonId === event.lessonId
            );

            if (activityIndex >= 0) {
              // Update existing activity - ADD to the question count from this session
              const existingActivity = activities[activityIndex];
              const newCount =
                existingActivity.n_questions + sessionInfo.questionCount;
              activities[activityIndex] = {
                ...existingActivity,
                n_questions: newCount,
              };
            } else {
              // Add new activity at the beginning
              const newActivity = {
                lessonId: event.lessonId,
                title: sessionInfo.title,
                subtitle: sessionInfo.subtitle,
                n_questions: sessionInfo.questionCount,
                grade: 0,
                delta: 0,
              };
              activities.unshift(newActivity);
            }

            newTimeline[todayIndex] = {
              ...newTimeline[todayIndex],
              activities,
            };

            return {
              ...prev,
              timeline: newTimeline,
            };
          }
        );
      }

      // Debounced refetch of both subject progress and insights data
      // Clear any existing timer
      if (subjectRefetchTimerRef.current) {
        clearTimeout(subjectRefetchTimerRef.current);
      }

      // Set new timer to refetch after 1 second of inactivity
      // This ensures we don't spam the API if user marks multiple questions quickly
      subjectRefetchTimerRef.current = setTimeout(() => {
        // Refetch subject progress (for "Next Up" and question counts)
        refetchSubject();
        // Refetch insights (for "This Week" chart and streak data)
        refetchInsights();
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
  }, [subjectId, refetchSubject, refetchInsights, queryClient]);

  // Helper function to get weakness-based plan data
  const getPlanData = useCallback(
    (lessonStoresData: Record<string, LessonStoreProgress>): PlanItem[] => {
      const flattenedLessons = getFlattenedLessons();
      if (!flattenedLessons.length) return [];

      const gradeColors = ["#FFA935", "#F0F0F0", "#7CC500"];

      // Filter lessons with p_mastery <= 0.8 and sort by p_mastery (ascending)
      const weakLessons = Object.entries(lessonStoresData)
        .filter(
          ([, store]) =>
            store.p_mastery !== undefined &&
            store.p_mastery !== null &&
            store.p_mastery <= 0.8
        )
        .sort(([, storeA], [, storeB]) => storeA.p_mastery - storeB.p_mastery)
        .map(([lessonId]) => lessonId);

      // If we have weak lessons, use them
      if (weakLessons.length > 0) {
        // Map to plan items and filter out lessons not in curriculum
        const planItems = weakLessons
          .map((lessonId, index) => {
            const lessonInfo = flattenedLessons.find(
              (l) => l.lessonId === lessonId
            );

            if (lessonInfo) {
              const store = lessonStoresData[lessonId];
              const progress =
                store?.p_mastery !== undefined && store?.p_mastery !== null
                  ? Math.round(store.p_mastery * 100)
                  : 0;

              return {
                lessonId,
                title: lessonInfo.title,
                subtitle: `Unit ${lessonInfo.unitIndex + 1} · ${lessonInfo.topicTitle}`,
                grade: `Grade ${6 + index}`,
                gradeColor: gradeColors[index % gradeColors.length],
                progress,
              };
            }

            // Return null if lesson not found in curriculum
            return null;
          })
          .filter((item): item is Required<PlanItem> => item !== null)
          .slice(0, 3); // Get first 3 valid items

        if (planItems.length > 0) {
          return planItems;
        }
      }

      // Fallback: if no weak lessons or no lesson stores, return first 3 lessons from curriculum
      return flattenedLessons.slice(0, 3).map((lesson, index) => ({
        lessonId: lesson.lessonId,
        title: lesson.title,
        subtitle: `Unit ${lesson.unitIndex + 1} · ${lesson.topicTitle}`,
        grade: `Grade ${6 + index}`,
        gradeColor: gradeColors[index % gradeColors.length],
        progress: 0, // No mastery data available for fallback lessons
      }));
    },
    [getFlattenedLessons]
  );

  // Calculate total spec points
  const totalSpecPoints = useMemo(() => {
    return (
      subjectData?.units
        .flatMap((unit) => unit.topics)
        .flatMap((topic) => topic.lessons).length || 0
    );
  }, [subjectData]);

  // Compute derived values with memoization for stable references
  const data = useMemo((): ActivityInsightsData | null => {
    if (!effectiveRawData) return null;

    // Ensure chart has axes even when empty
    const finalProgressChart =
      effectiveRawData.progressChart.length === 0
        ? generateEmptyProgressChart()
        : effectiveRawData.progressChart;

    // Calculate total progress
    const totalProgress = finalProgressChart.reduce(
      (sum, week) => sum + week.value,
      0
    );

    // Calculate week streak - consecutive weeks with any activity
    let weekStreak = 0;
    if (effectiveRawData.activityGrid.length > 0) {
      // Group activities by week (7-day chunks)
      const weeksWithActivity: boolean[] = [];

      // Process in 7-day chunks (weeks)
      for (
        let weekStart = 0;
        weekStart < effectiveRawData.activityGrid.length;
        weekStart += 7
      ) {
        let hasActivityThisWeek = false;

        // Check if any day in this week has activity
        for (
          let day = 0;
          day < 7 && weekStart + day < effectiveRawData.activityGrid.length;
          day++
        ) {
          if (effectiveRawData.activityGrid[weekStart + day].questionCount > 0) {
            hasActivityThisWeek = true;
            break;
          }
        }

        weeksWithActivity.push(hasActivityThisWeek);
      }

      // Count consecutive weeks with activity from most recent week backwards
      for (let i = weeksWithActivity.length - 1; i >= 0; i--) {
        if (weeksWithActivity[i]) {
          weekStreak++;
        } else {
          break; // Stop at first week with no activity
        }
      }
    }

    // Calculate total spec points covered (unique lessons with p_mastery > 0.1)
    const totalSpecPointsCovered = Object.entries(lessonStores).filter(
      ([, store]) =>
        store.p_mastery !== undefined &&
        store.p_mastery !== null &&
        store.p_mastery > 0
    ).length;

    // Calculate weekly spec points covered over time with consistent 12-week structure
    // Start with same 12-week template as progressChart
    const progressChartCovered = generateEmptyProgressChart();

    // For each week in the template, find activities within that week's date range
    progressChartCovered.forEach((weekItem) => {
      // Parse the week start from the label (e.g., "25/1" → January 25)
      const [day, month] = weekItem.week.split("/").map(Number);
      const currentYear = new Date().getFullYear();

      // Create the week start date
      let weekStart = new Date(currentYear, month - 1, day);

      // If the parsed date is in the future, it's likely from the previous year
      const now = new Date();
      if (weekStart > now) {
        weekStart = new Date(currentYear - 1, month - 1, day);
      }

      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Find activities within this week
      const lessonsThisWeek = new Set<string>();
      effectiveRawData.timeline.forEach((dayData) => {
        if (dayData.date >= weekStart && dayData.date < weekEnd) {
          dayData.activities.forEach((activity) => {
            if (activity.lessonId) {
              lessonsThisWeek.add(activity.lessonId);
            }
          });
        }
      });

      weekItem.value = lessonsThisWeek.size;
    });

    // Generate activity calendar (14 weeks × 7 days)
    const activityCalendar = generateEmptyActivityCalendar();
    if (effectiveRawData.activityGrid.length > 0) {
      // Group by weeks (7 days each)
      for (let week = 0; week < 14; week++) {
        for (let day = 0; day < 7; day++) {
          const dataIndex = week * 7 + day;
          if (dataIndex < effectiveRawData.activityGrid.length) {
            const questionCount =
              effectiveRawData.activityGrid[dataIndex].questionCount;
            // Normalize to 0-1 range (0 = no questions, higher values = more activity)
            const activity =
              questionCount > 0 ? Math.min(questionCount / 10, 1) : 0;
            activityCalendar[week][day] = activity;
          }
        }
      }
    }

    // Calculate plan data based on weakness (lowest p_mastery)
    const planData = getPlanData(lessonStores);

    // Generate lesson grid organized by units
    const lessonGrid: UnitLessonGrid[] = [];
    if (subjectData) {
      subjectData.units.forEach((unit, unitIndex) => {
        const unitLessons: LessonGridItem[] = [];

        unit.topics.forEach((topic) => {
          topic.lessons.forEach((lesson) => {
            const lessonStore = lessonStores[lesson.legacyId];
            const pMastery =
              lessonStore?.p_mastery !== undefined &&
              lessonStore?.p_mastery !== null
                ? lessonStore.p_mastery
                : null;

            unitLessons.push({
              lessonId: lesson.legacyId,
              title: lesson.title,
              topicTitle: topic.title,
              pMastery,
              answeredQuestions: lesson.answeredQuestions || 0,
              totalQuestions: lesson.totalQuestions || 0,
            });
          });
        });

        lessonGrid.push({
          unitId: unit.legacyId,
          unitTitle: unit.title,
          unitIndex,
          lessons: unitLessons,
        });
      });
    }

    // Enrich timeline after curriculum is available
    const enrichedTimeline = enrichTimelineData(effectiveRawData.timeline);

    return {
      progressChart: finalProgressChart,
      activityGrid: effectiveRawData.activityGrid,
      timeline: enrichedTimeline,
      totalProgress,
      weekStreak,
      activityCalendar,
      totalSpecPointsCovered,
      progressChartCovered,
      planData,
      totalSpecPoints,
      lessonGrid,
    };
  }, [
    effectiveRawData,
    lessonStores,
    getPlanData,
    totalSpecPoints,
    subjectData,
    enrichTimelineData,
  ]);

  const combinedLoading = insightsLoading || subjectLoading;

  // Map error appropriately
  const error = useMemo(() => {
    if (!insightsError) return null;
    const axiosError = insightsError as AxiosError;
    if (axiosError.response?.status === 401) {
      return new Error("Unauthorized");
    }
    if (axiosError.response?.status === 404) {
      return null; // Not an error - just no data yet
    }
    return insightsError as Error;
  }, [insightsError]);

  return {
    isLoading: combinedLoading,
    error,
    data,
    refetch,
  };
};
