import { lessonIdToSubjectId } from "@/app/_lib/utils/utils";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useFeatureUsage } from "@/app/_hooks/useFeatureUsage";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import Spinner from "../../Spinner";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import PrimaryButtonClicky from "../../PrimaryButtonClicky";
import React from "react";
import { createPortal } from "react-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  useActivityInsights,
  PlanItem,
  LessonGridItem,
  UnitLessonGrid,
} from "@/app/_hooks/useActivityInsights";
import { useSidebar } from "@/app/_components/sidebar/SidebarLayoutClient";
import CircularProgressBar from "../../CircularProgressBar";
import StatusBadge from "./sidebarInsightsComponents/StatusBadge";
import ChevronDownIcon from "../../icons/ChevronDownIcon";
import ChevronUpIcon from "../../icons/ChevronUpIcon";

interface UnitReadiness {
  unitId: string;
  unitTitle: string;
  completionPercentage: number;
  currentGrade: number;
  targetGrade: number;
  questionsAnswered: number;
  totalQuestions: number;
}

interface ExamPaperData {
  paperId: string;
  paperNumber: string;
  paperTitle: string;
  examDate: string;
  examBoard: string;
  overallReadiness: number;
  units: UnitReadiness[];
}

interface SidebarInsightsLayoutProps {
  subjectId?: string;
  searchQuery?: string;
  primaryColor?: string;
}

const MonthlyBarChart = React.memo(
  ({ fill, data }: { fill: string; data: any }) => {
    const formatYAxisLabel = (value: number) => {
      return value.toString();
    };

    return (
      <div className="w-full">
        <div className="h-[180px] relative pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              barCategoryGap="20%"
              margin={{
                top: 20,
                right: -20,
                left: 8,
                bottom: 20,
              }}
            >
              <CartesianGrid
                strokeDasharray="none"
                stroke="#f2f2f7"
                horizontal={true}
                vertical={true}
              />
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "rgba(0,0,0,0.2)",
                  fontSize: 12,
                  dy: 10,
                }}
              />
              <YAxis
                orientation="right"
                domain={[0, 20]}
                ticks={[0, 5, 10, 15, 20]}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "rgba(0,0,0,0.2)",
                  fontSize: 12,
                  dx: 10,
                }}
                tickFormatter={formatYAxisLabel}
              />
              <Bar
                dataKey="value"
                fill={fill}
                radius={[4, 4, 0, 0]}
                stroke="none"
                animationDuration={0}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
);

interface LessonGridProps {
  lessonGrid: UnitLessonGrid[];
  primaryColor: string;
  currentLessonId: string;
  isGridExpanded: boolean;
  setIsGridExpanded: (expanded: boolean) => void;
  hoveredLesson: { lessonId: string; unitIndex: number } | null;
  setHoveredLesson: (
    lesson: { lessonId: string; unitIndex: number } | null
  ) => void;
  setLessonTooltip: (tooltip: any) => void;
  updateLessonTooltip: (
    e: React.MouseEvent,
    lesson: LessonGridItem,
    unitIndex: number
  ) => void;
  updateLessonTooltipForMobile: (
    element: HTMLElement,
    lesson: LessonGridItem,
    unitIndex: number
  ) => void;
  selectedLesson: string | null;
  setSelectedLesson: (lessonId: string | null) => void;
  getLessonHref: (lessonId: string) => string;
  track: (event: string, properties: any) => void;
  closeSidebar: () => void;
  getMasteryColor: (pMastery: number | null) => string;
  animationDuration?: number;
  waveDelayMultiplier?: number;
  maxBounceScale?: number;
  minBounceScale?: number;
  minShrinkScale?: number;
  bounceDecayRate?: number;
  shrinkDecayRate?: number;
}

const LessonGrid = ({
  lessonGrid,
  primaryColor,
  currentLessonId,
  isGridExpanded,
  setIsGridExpanded,
  hoveredLesson,
  setHoveredLesson,
  setLessonTooltip,
  updateLessonTooltip,
  updateLessonTooltipForMobile,
  selectedLesson,
  setSelectedLesson,
  getLessonHref,
  track,
  closeSidebar,
  getMasteryColor,
  animationDuration = 350,
  waveDelayMultiplier = 80,
  maxBounceScale = 1.08,
  minBounceScale = 1.01,
  minShrinkScale = 0.75,
  bounceDecayRate = 0.004,
  shrinkDecayRate = 0.015,
}: LessonGridProps) => {
  const [hasAnimated, setHasAnimated] = useState(false);
  const gridRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lessonGrid.length > 0 && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [lessonGrid, hasAnimated]);

  // Click outside handler to dismiss tooltip on mobile
  useEffect(() => {
    if (!selectedLesson) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is inside the lesson grid
      if (gridRef.current?.contains(target)) {
        return;
      }

      // Check if click is inside the tooltip (portal)
      const tooltip = document.querySelector('[data-lesson-tooltip]');
      if (tooltip?.contains(target)) {
        return;
      }

      // Click was outside - dismiss the tooltip
      setSelectedLesson(null);
      setHoveredLesson(null);
      setLessonTooltip(null);
    };

    // Use setTimeout to avoid the current click event triggering this
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [selectedLesson, setSelectedLesson, setHoveredLesson, setLessonTooltip]);

  const LESSONS_PER_ROW = 5;
  const UNITS_PER_BAND = 3;
  const MAX_ROWS = 15;

  interface Band {
    units: UnitLessonGrid[];
    maxRowsInBand: number;
  }

  const bands: Band[] = [];
  for (let i = 0; i < lessonGrid.length; i += UNITS_PER_BAND) {
    const bandUnits = lessonGrid.slice(i, i + UNITS_PER_BAND);
    const maxRowsInBand = Math.max(
      ...bandUnits.map((unit) =>
        Math.ceil(unit.lessons.length / LESSONS_PER_ROW)
      )
    );
    bands.push({ units: bandUnits, maxRowsInBand });
  }

  const totalRows = bands.reduce((sum, band) => sum + band.maxRowsInBand, 0);
  const hasMoreRows = totalRows > MAX_ROWS;

  let lessonsToShow: UnitLessonGrid[] = [];
  if (!isGridExpanded && hasMoreRows) {
    let rowsShown = 0;
    for (const band of bands) {
      if (rowsShown + band.maxRowsInBand <= MAX_ROWS) {
        lessonsToShow.push(...band.units);
        rowsShown += band.maxRowsInBand;
      } else {
        const rowsAvailable = MAX_ROWS - rowsShown;
        if (rowsAvailable > 0) {
          const lessonsToShowInBand = rowsAvailable * LESSONS_PER_ROW;
          lessonsToShow.push(
            ...band.units.map((unit) => ({
              ...unit,
              lessons: unit.lessons.slice(0, lessonsToShowInBand),
            }))
          );
        }
        break;
      }
    }
  } else {
    lessonsToShow = lessonGrid;
  }

  return (
    <>
      <style>{`
        @keyframes lessonBoxAnimation {
          0% {
            transform: scale(1);
            background-color: #f2f2f7;
          }
          20% {
            transform: scale(var(--shrink-scale));
            background-color: #f2f2f7;
          }
          60% {
            transform: scale(var(--bounce-scale));
            background-color: var(--final-color);
          }
          100% {
            transform: scale(1);
            background-color: var(--final-color);
          }
        }
      `}</style>

      <div ref={gridRef} className="flex flex-wrap sm:grid sm:grid-cols-3 gap-3 mt-4 mb-4">
        {lessonsToShow.map((unit, unitIndexInDisplay) => {
          const unitColumn = unitIndexInDisplay % UNITS_PER_BAND;
          const unitBandRow = Math.floor(unitIndexInDisplay / UNITS_PER_BAND);

          // Calculate cumulative rows from all previous bands
          const cumulativeRowsBeforeBand = bands
            .slice(0, unitBandRow)
            .reduce((sum, band) => sum + band.maxRowsInBand, 0);

          return (
            <div key={unit.unitId} className="flex flex-col gap-1">
              <h3 className="text-[14px] font-rounded-bold text-black">
                Unit {unit.unitIndex + 1}
              </h3>

              <div className="grid grid-cols-5 gap-1 relative">
                {unit.lessons.map((lesson, lessonIndex) => {
                  const lessonColumn = lessonIndex % LESSONS_PER_ROW;
                  const lessonRow = Math.floor(lessonIndex / LESSONS_PER_ROW);
                  const globalColumn =
                    unitColumn * LESSONS_PER_ROW + lessonColumn;
                  const globalRow = cumulativeRowsBeforeBand + lessonRow;

                  const animationDelay =
                    (globalColumn + globalRow) * waveDelayMultiplier;

                  const distance = globalColumn + globalRow;
                  const bounceScale = Math.max(
                    minBounceScale,
                    maxBounceScale - distance * bounceDecayRate
                  );
                  const shrinkScale = Math.min(
                    1,
                    minShrinkScale + distance * shrinkDecayRate
                  );

                  // Check if this is a touch device
                  const isTouchDevice =
                    typeof window !== "undefined" &&
                    window.matchMedia("(pointer: coarse)").matches;

                  return (
                    <div key={lesson.lessonId} className="relative">
                      <Link
                        href={getLessonHref(lesson.lessonId)}
                        onClick={(e) => {
                          // On touch devices, implement two-tap behavior
                          if (isTouchDevice) {
                            if (selectedLesson === lesson.lessonId) {
                              // Second tap - navigate
                              track("clicked_lesson", {
                                lesson_id: lesson.lessonId,
                              });
                              setSelectedLesson(null);
                              setHoveredLesson(null);
                              setLessonTooltip(null);
                              closeSidebar();
                            } else {
                              // First tap - show tooltip, prevent navigation
                              e.preventDefault();
                              setSelectedLesson(lesson.lessonId);
                              setHoveredLesson({
                                lessonId: lesson.lessonId,
                                unitIndex: unit.unitIndex,
                              });
                              updateLessonTooltipForMobile(
                                e.currentTarget as HTMLElement,
                                lesson,
                                unit.unitIndex
                              );
                            }
                          } else {
                            // Desktop - navigate immediately
                            track("clicked_lesson", {
                              lesson_id: lesson.lessonId,
                            });
                            setHoveredLesson(null);
                            setLessonTooltip(null);
                            closeSidebar();
                          }
                        }}
                        onMouseEnter={(e) => {
                          setHoveredLesson({
                            lessonId: lesson.lessonId,
                            unitIndex: unit.unitIndex,
                          });
                          updateLessonTooltip(e, lesson, unit.unitIndex);
                        }}
                        onMouseMove={(e) =>
                          updateLessonTooltip(e, lesson, unit.unitIndex)
                        }
                        onMouseLeave={() => {
                          // Don't clear tooltip on mobile if a lesson is selected (two-tap mode)
                          if (!selectedLesson) {
                            setHoveredLesson(null);
                            setLessonTooltip(null);
                          }
                        }}
                        className="w-[18px] h-[18px] rounded-[5px] cursor-pointer block"
                        style={{
                          // @ts-ignore
                          "--final-color": getMasteryColor(lesson.pMastery),
                          // @ts-ignore
                          "--bounce-scale": bounceScale,
                          // @ts-ignore
                          "--shrink-scale": shrinkScale,
                          backgroundColor: hasAnimated ? undefined : "#F2F2F7",
                          transform: hasAnimated ? undefined : "scale(1)",
                          boxShadow:
                            hoveredLesson?.lessonId === lesson.lessonId ||
                            selectedLesson === lesson.lessonId ||
                            lesson.lessonId === currentLessonId
                              ? `0 0 0 -2px white, 0 0 0 2px ${primaryColor}`
                              : "none",
                          animation: hasAnimated
                            ? `lessonBoxAnimation ${animationDuration}ms ease-out ${animationDelay}ms both`
                            : "none",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {hasMoreRows && (
          <button
            onClick={() => setIsGridExpanded(!isGridExpanded)}
            className="my-2 w-full flex justify-center cursor-pointer col-span-2 sm:col-span-3"
          >
            <svg
              width="40"
              height="12"
              viewBox="0 0 28 9"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                transform: isGridExpanded ? "scaleY(-1)" : "none",
              }}
            >
              <g clipPath="url(#clip0_406_19401_grid)">
                <path
                  d="M0.969232 3.10968L11.477 7.50273C12.1846 7.7989 13.0308 8.16087 13.7231 8.16087C14.4 8.16087 15.2616 7.7989 15.9692 7.50273L26.4616 3.10968C27.0463 2.86289 27.4308 2.30348 27.4308 1.6947C27.4308 0.723949 26.7693 0 25.877 0C25.4154 0 24.8001 0.279708 24.4154 0.427787L12.6308 5.38025H14.8L3.01539 0.427787C2.63077 0.279708 2.03077 0 1.55385 0C0.66154 0 0 0.723949 0 1.6947C0 2.30348 0.384617 2.86289 0.969232 3.10968Z"
                  fill="#F2F2F7"
                />
              </g>
              <defs></defs>
            </svg>
          </button>
        )}
      </div>
    </>
  );
};

function SidebarInsightsLayout({
  subjectId: propSubjectId,
  searchQuery = "",
  primaryColor = "#000000",
}: SidebarInsightsLayoutProps) {
  const { track } = useTracking();
  const { closeSidebar } = useSidebar();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>(
    {}
  );
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);
  const [isGridExpanded, setIsGridExpanded] = useState(false);
  const [hoveredLesson, setHoveredLesson] = useState<{
    lessonId: string;
    unitIndex: number;
  } | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [lessonTooltip, setLessonTooltip] = useState<{
    top: number;
    left: number;
    lesson: any;
    unitIndex: number;
    primaryColor: string;
    masteryColor: string;
  } | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const pathParts = pathname.split("/");
  const lessonId = pathParts.length > 2 ? pathParts[2] : "";
  const urlSubjectId = lessonIdToSubjectId(lessonId);
  const subjectId = propSubjectId || urlSubjectId;
  const { featureUsage, isLoading: featureUsageLoading } = useFeatureUsage();

  const {
    hasActivePlan,
    isLoading: planDetailsLoading,
    error: planDetailsError,
  } = useHasActivePlan();

  const {
    data: insightsData,
    isLoading: insightsLoading,
    error: insightsError,
  } = useActivityInsights(subjectId);

  // Block UI while ANY insights-related data is loading; render spinner until all are ready
  const isLoading =
    featureUsageLoading || planDetailsLoading || insightsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Spinner size="normal" style="dark" />
      </div>
    );
  }

  if (planDetailsError || insightsError) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Error loading subject content</p>
      </div>
    );
  }

  const getMasteryColor = (pMastery: number | null) => {
    if (pMastery === null || pMastery === 0) {
      return "#F2F2F7";
    }
    const opacity = Math.min(1, Math.max(0.1, pMastery * 1.2));
    return `${primaryColor}${Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0")}`;
  };

  const updateLessonTooltip = (
    e: React.MouseEvent,
    lesson: any,
    unitIndex: number
  ) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setLessonTooltip({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
      lesson,
      unitIndex,
      primaryColor,
      masteryColor: getMasteryColor(lesson.pMastery),
    });
  };

  const updateLessonTooltipForMobile = (
    element: HTMLElement,
    lesson: any,
    unitIndex: number
  ) => {
    const rect = element.getBoundingClientRect();
    const tooltipWidth = 300;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Position tooltip below the element and centered horizontally
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.bottom + 12;

    // Keep tooltip within viewport horizontally
    if (left < 16) {
      left = 16;
    } else if (left + tooltipWidth > viewportWidth - 16) {
      left = viewportWidth - tooltipWidth - 16;
    }

    // If tooltip would go off bottom, position it above the element
    if (top + 150 > viewportHeight) {
      top = rect.top - 150 - 12;
    }

    setLessonTooltip({
      top,
      left,
      lesson,
      unitIndex,
      primaryColor,
      masteryColor: getMasteryColor(lesson.pMastery),
    });
  };

  const renderProgressCard = () => {
    return (
      <div>
        <h1 className="text-[17px] font-rounded-bold mb-2">Your Progress</h1>

        <div className="border border-[#F2F2F7] rounded-2xl p-4 flex flex-col">
          <div className="flex flex-row items-center gap-2">
            <CircularProgressBar
              progress={
                insightsData && insightsData.totalSpecPoints
                  ? Math.round(
                      (((insightsData?.totalProgress ?? 0) > 0
                        ? (insightsData?.totalProgress ?? 0)
                        : (insightsData?.totalSpecPointsCovered ?? 0)) /
                        insightsData.totalSpecPoints) *
                        100
                    )
                  : 0
              }
              size={30}
              strokeWidth={5}
              strokeColor={primaryColor}
              hidePercentage={true}
            />
            <div className="flex flex-row items-baseline">
              <p className="text-3xl font-rounded-heavy">
                {(insightsData?.totalProgress ?? 0) > 0
                  ? (insightsData?.totalProgress ?? 0)
                  : (insightsData?.totalSpecPointsCovered ?? 0)}
              </p>
              <p className="text-[15px] font-rounded-heavy">
                /{insightsData?.totalSpecPoints || 0}
              </p>
            </div>
          </div>
          <div className="text-[13px] font-medium text-black/20">
            {(insightsData?.totalProgress ?? 0) > 0
              ? "Spec points mastered"
              : "Spec points covered"}
          </div>

          {/* Lesson Grid Section */}
          <LessonGrid
            lessonGrid={insightsData?.lessonGrid || []}
            primaryColor={primaryColor}
            currentLessonId={lessonId}
            isGridExpanded={isGridExpanded}
            setIsGridExpanded={setIsGridExpanded}
            hoveredLesson={hoveredLesson}
            setHoveredLesson={setHoveredLesson}
            setLessonTooltip={setLessonTooltip}
            updateLessonTooltip={updateLessonTooltip}
            updateLessonTooltipForMobile={updateLessonTooltipForMobile}
            selectedLesson={selectedLesson}
            setSelectedLesson={setSelectedLesson}
            getLessonHref={getLessonHref}
            track={track}
            closeSidebar={closeSidebar}
            getMasteryColor={getMasteryColor}
          />

          <PrimaryButtonClicky
            buttonText="Start Next Lesson"
            buttonState="filled"
            doesStretch={true}
            showKeyboardShortcut={false}
            onPress={() => {
              const firstLesson = insightsData?.planData?.[0];
              if (
                firstLesson &&
                insightsData.planData &&
                insightsData.planData.length > 0
              ) {
                track("clicked_lesson", {
                  lesson_id: firstLesson.lessonId,
                });
                router.push(getLessonHref(firstLesson.lessonId));
                closeSidebar();
              }
            }}
          />
        </div>
      </div>
    );
  };

  const renderActivityCard = () => {
    const thisWeekActivities = insightsData?.timeline || [];

    // Flatten all activities with their day info
    const allActivities = thisWeekActivities.flatMap((dayData, dayIndex) =>
      dayData.activities.map((activity, activityIndex) => ({
        dayData,
        activity,
        dayIndex,
        activityIndex,
      }))
    );

    // Show max 5 by default, max 15 when expanded
    const displayLimit = isActivityExpanded ? 15 : 5;
    const displayedActivities = allActivities.slice(0, displayLimit);
    const hasMore = allActivities.length > 5;

    return (
      <div>
        <h1 className="text-[17px] font-rounded-bold mb-2">Your Activities</h1>

        <div className="border border-[#F2F2F7] rounded-2xl p-4 flex flex-col gap-0 relative">
          {/* Week Streak Section */}
          <div className="flex flex-col gap-0">
            <div className="flex items-center gap-1">
              <svg
                width="20"
                height="28"
                viewBox="0 0 17 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8.01471 22.5C13.3979 22.5 17 18.8551 17 13.3727C17 4.29553 9.26545 0.5 3.92231 0.5C2.90171 0.5 2.23131 0.881561 2.23131 1.61456C2.23131 1.89571 2.36139 2.19694 2.58152 2.45801C3.81224 3.94409 4.96292 5.57074 4.97293 7.49863C4.97293 7.69945 4.96292 7.88019 4.9229 8.08101C4.33255 6.84596 3.35197 6.123 2.46145 6.123C1.99117 6.123 1.67098 6.45436 1.67098 6.97649C1.67098 7.27773 1.74102 7.84003 1.74102 8.33204C1.74102 10.6314 0 11.8263 0 15.5215C0 19.7086 3.19188 22.5 8.01471 22.5ZM8.25486 19.4073C6.39376 19.4073 5.16304 18.2928 5.16304 16.6159C5.16304 14.8688 6.38375 14.2864 6.54385 13.0815C6.56386 12.961 6.65391 12.9108 6.76398 13.0011C7.20424 13.4028 7.49441 13.9048 7.73455 14.5073C8.24485 13.7341 8.44497 12.2782 8.26486 10.7118C8.24485 10.5812 8.34491 10.511 8.46498 10.5612C10.6263 11.5552 11.7869 13.704 11.7869 15.7122C11.7869 17.7204 10.5862 19.4073 8.25486 19.4073Z"
                  fill="url(#paint0_linear_406_19155)"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear_406_19155"
                    x1="8.5"
                    y1="0.5"
                    x2="8.5"
                    y2="22.5"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#FFA935" />
                    <stop offset="1" stopColor="#FF7300" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-3xl font-rounded-black text-[#1F1F1F] leading-[33px]">
                {insightsData?.weekStreak || 0}
              </span>
            </div>
            <span className="text-[13px] font-medium text-black/20">
              week streak
            </span>
          </div>

          {/* Bar Chart Section */}
          <MonthlyBarChart
            fill={primaryColor}
            data={
              (insightsData?.totalProgress || 0) > 0
                ? insightsData?.progressChart || []
                : insightsData?.progressChartCovered || []
            }
          />

          {/* This Week Section */}
          {displayedActivities.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-[17px] font-rounded-bold text-black">
                This Week
              </h2>

              <div className="flex flex-col gap-0">
                {displayedActivities.map(
                  ({ dayData, activity, dayIndex, activityIndex }, index) => (
                    <Link
                      key={`${dayIndex}-${activityIndex}`}
                      href={getLessonHref(activity.lessonId)}
                      onClick={() => {
                        track("clicked_lesson", {
                          lesson_id: activity.lessonId,
                        });
                        closeSidebar();
                      }}
                      className="flex items-start gap-4 p-3 py-2 rounded-xl relative cursor-pointer hover:bg-[#F2F2F7]/50"
                    >
                      {/* Timeline - only show on first activity of the day */}
                      {activityIndex === 0 && (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[14px] font-rounded-bold text-[#595959]">
                            {dayData.date.toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </span>
                          <div className="w-6 h-6 bg-[#F2F2F7] rounded-full flex items-center justify-center">
                            <span className="text-[14px] font-rounded-bold text-[#595959]">
                              {dayData.date.getDate()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Empty space for additional activities on the same day */}
                      {activityIndex > 0 && <div className="w-6"></div>}

                      {/* Content */}
                      <div className="flex-1 flex flex-col gap-1 mt-1">
                        <h3 className="text-[14px] font-rounded-bold text-[#595959] leading-tight">
                          {activity.title}
                        </h3>
                        <p className="text-[13px] text-black/30 leading-tight">
                          {activity.subtitle}
                        </p>

                        <div className="flex items-center gap-1 mt-1">
                          {/* Questions badge */}
                          <StatusBadge
                            type="simple"
                            value={activity.n_questions}
                            text="Questions"
                          />

                          {/* Grade badge
                        {activity.grade > 0 && (
                          <StatusBadge
                            type="grade"
                            grade={activity.grade}
                            delta={activity.delta}
                          />
                        )} */}
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </div>
          )}

          {/* Chevron expand/collapse button */}
          {hasMore && (
            <button
              onClick={() => setIsActivityExpanded(!isActivityExpanded)}
              className="my-2 w-full flex justify-center cursor-pointer"
            >
              <svg
                width="40"
                height="12"
                viewBox="0 0 28 9"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  transform: isActivityExpanded ? "scaleY(-1)" : "none",
                }}
              >
                <g clipPath="url(#clip0_406_19401)">
                  <path
                    d="M0.969232 3.10968L11.477 7.50273C12.1846 7.7989 13.0308 8.16087 13.7231 8.16087C14.4 8.16087 15.2616 7.7989 15.9692 7.50273L26.4616 3.10968C27.0463 2.86289 27.4308 2.30348 27.4308 1.6947C27.4308 0.723949 26.7693 0 25.877 0C25.4154 0 24.8001 0.279708 24.4154 0.427787L12.6308 5.38025H14.8L3.01539 0.427787C2.63077 0.279708 2.03077 0 1.55385 0C0.66154 0 0 0.723949 0 1.6947C0 2.30348 0.384617 2.86289 0.969232 3.10968Z"
                    fill="#F2F2F7"
                  />
                </g>
                <defs></defs>
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  const getLessonHref = (lessonId: string) => {
    const pathParts = pathname.split("/");
    const pathSegment = pathParts.length > 3 ? pathParts[3] : undefined;
    // Default to practice if the path segment is not valid for lessons
    const mode =
      pathSegment === "practice" || pathSegment === "learn"
        ? pathSegment
        : "practice";
    return `/lessons/${lessonId}/${mode}`;
  };

  // Calculate which plan card should be highlighted based on current lesson
  const getHighlightedIndex = () => {
    if (!lessonId) return 0; // Not on a lesson page, highlight first

    const planData = insightsData?.planData || [];
    const currentIndex = planData.findIndex(
      (item) => item.lessonId === lessonId
    );

    return currentIndex; // Returns -1 if not found (no highlighting)
  };

  const renderPlanCard = (data: PlanItem[], highlightedIndex: number) => {
    return (
      <div>
        <h1 className="text-[17px] font-rounded-bold mb-2">Next Up</h1>

        <div className="border border-[#F2F2F7] rounded-2xl p-2 flex flex-col items-center">
          {data.map((item, index) => (
            <Link
              key={index}
              href={getLessonHref(item.lessonId)}
              onClick={() => {
                track("clicked_lesson", {
                  lesson_id: item.lessonId,
                });
                closeSidebar();
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`w-full p-4 flex flex-col items-center cursor-pointer ${
                index === highlightedIndex ? "rounded-xl" : "rounded-2xl"
              }`}
              style={{
                backgroundColor:
                  (hoveredIndex !== null && index === hoveredIndex) ||
                  (hoveredIndex === null && index === highlightedIndex)
                    ? `${primaryColor}0D`
                    : "transparent",
              }}
            >
              <div className="flex flex-row justify-between items-center w-full">
                <div className="flex-1 truncate mr-2">
                  <p
                    className="text-[14px] font-rounded-bold truncate dots"
                    style={{
                      color:
                        (hoveredIndex !== null && index === hoveredIndex) ||
                        (hoveredIndex === null && index === highlightedIndex)
                          ? primaryColor
                          : "#595959",
                    }}
                  >
                    {item.title}
                  </p>
                  <p className="text-[13px] text-black/20 truncate dots">
                    {item.subtitle}
                  </p>
                </div>

                <StatusBadge
                  type="circular"
                  progress={item.progress || 0}
                  strokeColor={primaryColor}
                  progressText={`${Math.round(item.progress || 0)}% mastered`}
                />
              </div>

              {/* {index === highlightedIndex && (
                <div className="w-full mt-4">
                  <PrimaryButtonClicky
                    buttonText="Start Next Lesson"
                    buttonState="filled"
                    doesStretch={true}
                    showKeyboardShortcut={false}
                  />
                </div>
              )} */}
            </Link>
          ))}

          {data.length > 3 && (
            <div className="my-2">
              <svg
                width="40"
                height="12"
                viewBox="0 0 28 9"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_406_19401)">
                  <path
                    d="M0.969232 3.10968L11.477 7.50273C12.1846 7.7989 13.0308 8.16087 13.7231 8.16087C14.4 8.16087 15.2616 7.7989 15.9692 7.50273L26.4616 3.10968C27.0463 2.86289 27.4308 2.30348 27.4308 1.6947C27.4308 0.723949 26.7693 0 25.877 0C25.4154 0 24.8001 0.279708 24.4154 0.427787L12.6308 5.38025H14.8L3.01539 0.427787C2.63077 0.279708 2.03077 0 1.55385 0C0.66154 0 0 0.723949 0 1.6947C0 2.30348 0.384617 2.86289 0.969232 3.10968Z"
                    fill="#F2F2F7"
                  />
                </g>
                <defs></defs>
              </svg>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Dummy exam data
  const dummyExamData: ExamPaperData[] = [
    {
      paperId: "aqaGCSEBio2024A1",
      paperNumber: "1",
      paperTitle: "Biology Paper 1",
      examDate: "2025-03-24",
      examBoard: "AQA",
      overallReadiness: 64,
      units: [
        {
          unitId: "aqaGCSEBio0",
          unitTitle: "Cell biology",
          completionPercentage: 75,
          currentGrade: 5,
          targetGrade: 9,
          questionsAnswered: 145,
          totalQuestions: 193,
        },
        {
          unitId: "aqaGCSEBio1",
          unitTitle: "Organisation",
          completionPercentage: 45,
          currentGrade: 4,
          targetGrade: 9,
          questionsAnswered: 89,
          totalQuestions: 198,
        },
        {
          unitId: "aqaGCSEBio2",
          unitTitle: "Infection and response",
          completionPercentage: 82,
          currentGrade: 7,
          targetGrade: 9,
          questionsAnswered: 156,
          totalQuestions: 190,
        },
        {
          unitId: "aqaGCSEBio3",
          unitTitle: "Bioenergetics",
          completionPercentage: 60,
          currentGrade: 6,
          targetGrade: 9,
          questionsAnswered: 102,
          totalQuestions: 170,
        },
      ],
    },
    {
      paperId: "aqaGCSEBio2024A2",
      paperNumber: "2",
      paperTitle: "Biology Paper 2",
      examDate: "2025-05-15",
      examBoard: "AQA",
      overallReadiness: 42,
      units: [
        {
          unitId: "aqaGCSEBio4",
          unitTitle: "Homeostasis and response",
          completionPercentage: 35,
          currentGrade: 3,
          targetGrade: 9,
          questionsAnswered: 67,
          totalQuestions: 191,
        },
        {
          unitId: "aqaGCSEBio5",
          unitTitle: "Inheritance, variation and evolution",
          completionPercentage: 50,
          currentGrade: 5,
          targetGrade: 9,
          questionsAnswered: 110,
          totalQuestions: 220,
        },
        {
          unitId: "aqaGCSEBio6",
          unitTitle: "Ecology",
          completionPercentage: 40,
          currentGrade: 4,
          targetGrade: 9,
          questionsAnswered: 72,
          totalQuestions: 180,
        },
      ],
    },
  ];

  const renderExamsCard = () => {
    if (!dummyExamData.length) return null;

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const toggleExamExpansion = (paperId: string) => {
      setExpandedExams((prev) => ({
        ...prev,
        [paperId]: !prev[paperId],
      }));
    };

    return (
      <div>
        <h1 className="text-[17px] font-rounded-bold mb-2">Your Exams</h1>

        <div className="flex flex-col gap-2">
          {dummyExamData.map((exam, examIndex) => {
            const examDate = new Date(exam.examDate);
            const isExpanded = expandedExams[exam.paperId];

            return (
              <div
                key={exam.paperId}
                className="border border-[#F2F2F7] rounded-2xl p-4 flex flex-col items-center gap-4"
              >
                <div className="flex flex-row items-center justify-between w-full gap-4">
                  <div className="flex flex-row items-center gap-4">
                    <div className="flex flex-col items-center px-2">
                      <div className="text-[14px] font-bold text-[#FF4B4C] uppercase">
                        {monthNames[examDate.getMonth()]}
                      </div>
                      <div className="text-3xl font-rounded-heavy">
                        {examDate.getDate()}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 items-start">
                      <div className="font-rounded-bold text-[15px]">
                        {exam.paperTitle}
                      </div>

                      <StatusBadge
                        type="circular"
                        progress={exam.overallReadiness}
                        strokeColor={primaryColor}
                      />
                    </div>
                  </div>

                  <button
                    className="p-1 flex items-center justify-center"
                    onClick={() => toggleExamExpansion(exam.paperId)}
                  >
                    {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </button>
                </div>

                {/* Units list */}
                {isExpanded && (
                  <div className="flex flex-col items-start w-full gap-3">
                    {exam.units.map((unit, index) => (
                      <div key={unit.unitId} className="w-full">
                        <div className="flex flex-row items-center justify-between w-full mb-2">
                          <p className="text-[15px] font-rounded-bold truncate dots">
                            {unit.unitTitle}
                          </p>

                          <StatusBadge type="grade" grade={unit.currentGrade} />
                        </div>

                        <div className="flex flex-row items-center justify-start w-full relative">
                          <div className="w-full h-1.5 bg-[#F2F2F7] rounded-full" />
                          <div
                            className="absolute top-0 left-0 h-1.5 rounded-full"
                            style={{
                              width: `${unit.completionPercentage}%`,
                              backgroundColor: primaryColor,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="px-4 flex flex-col overflow-x-hidden gap-5 pb-5">
        {renderProgressCard()}
        {renderPlanCard(insightsData?.planData || [], getHighlightedIndex())}
        {/* {renderExamsCard()} */}
        {renderActivityCard()}
        {/* <WarmStartExample subjectId={subjectId} /> */}
      </div>

      {/* Global portal tooltip for lesson grid */}
      {lessonTooltip &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            data-lesson-tooltip
            className={`fixed z-[9999] bg-white rounded-2xl p-4 shadow-[0px_4px_10px_0px_rgba(0,0,0,0.1)] w-[300px] ${
              selectedLesson ? "cursor-pointer" : "pointer-events-none"
            }`}
            style={{
              top: lessonTooltip.top,
              left: lessonTooltip.left,
              transform: "translateY(0%)",
            }}
            onClick={() => {
              if (selectedLesson) {
                track("clicked_lesson", {
                  lesson_id: lessonTooltip.lesson.lessonId,
                });
                router.push(getLessonHref(lessonTooltip.lesson.lessonId));
                setSelectedLesson(null);
                setHoveredLesson(null);
                setLessonTooltip(null);
                closeSidebar();
              }
            }}
          >
            <div className="flex flex-row gap-2">
              <div
                className="w-[18px] h-[18px] rounded-[5px]"
                style={{ backgroundColor: lessonTooltip.masteryColor }}
              />
              <div className="flex flex-col flex-1">
                <h3 className="text-[15px] font-rounded-bold text-black leading-tight mb-1">
                  {lessonTooltip.lesson.title}
                </h3>
                <p className="text-[13px] text-black/30 leading-tight mb-2">
                  Unit {lessonTooltip.unitIndex + 1} ·{" "}
                  {lessonTooltip.lesson.topicTitle}
                </p>
                <div className="flex items-center gap-1">
                  {lessonTooltip.lesson.totalQuestions > 0 && (
                    <StatusBadge
                      type="circular"
                      progress={Math.round(
                        (lessonTooltip.lesson.answeredQuestions /
                          lessonTooltip.lesson.totalQuestions) *
                          100
                      )}
                      strokeColor={lessonTooltip.primaryColor}
                      progressText={`${lessonTooltip.lesson.answeredQuestions}/${lessonTooltip.lesson.totalQuestions}`}
                    />
                  )}
                  {lessonTooltip.lesson.pMastery !== null &&
                    lessonTooltip.lesson.pMastery > 0 && (
                      <StatusBadge
                        type="bar"
                        value={Math.round(lessonTooltip.lesson.pMastery * 100)}
                        strokeColor={lessonTooltip.primaryColor}
                        progressText={`${Math.round(lessonTooltip.lesson.pMastery * 100)}% mastered`}
                      />
                    )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default SidebarInsightsLayout;
