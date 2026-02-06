"use client";

import SidebarLessonLayout from "./components/SidebarLessonLayout";
import SidebarInsightsLayout from "./components/SidebarInsightsLayout";
import SidebarPracticePapersLayout from "./components/SidebarPracticePapersLayout";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import EditSubjectsModal from "./components/EditSubjectsModal";
import type { UserSubject as ApiUserSubject } from "../../types/types";
import { lessonIdToSubjectId } from "../../_lib/utils/utils";
import { useSidebar } from "./SidebarLayoutClient";
import { useUpdateSubjects } from "../../_hooks/useUpdateSubjects";
import { getSubjectTheme } from "../../_lib/utils/subjectTheme";
import { getGradeScale } from "../../(protected)/onboarding/_utils/gradeScales";
import { CourseType } from "../../types/types";
import CrossInCircleIcon from "../icons/CrossInCircleIcon";
import EditIcon from "../icons/EditIcon";
import LogoutIcon from "../icons/LogoutIcon";

import SidebarUserSection from "./components/SidebarUserSection";
import { deconstructSubjectLegacyId } from "@/app/_lib/utils/utils";
import GradeSelection from "./components/GradeSelection";
import SidebarHeader from "./components/SidebarHeader";
import SidebarSubjectsList from "./components/SidebarSubjectsList";
import MockPanel from "./components/mock-panel/MockPanel";
import SidebarPanelHeader from "./components/SidebarPanelHeader";
// import { useGettingStartedProgress } from "@/app/_hooks/useGettingStartedSteps"; // Not currently used
import { useUser } from "../../_context/UserProvider";
import { useAuth } from "../../_context/AuthProvider";
import { useResponsive } from "../../_hooks/useResponsive";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { useLastLesson } from "../../_hooks/useLastLesson";
import { useUserSubjects } from "../../_hooks/useUserSubjects";
import { SubjectWithUnits } from "../../types/types";
import type { MocksData } from "./_lib/mocks.types";
import { useMocksData } from "../../_hooks/useMocksData";

interface SubjectForGradeSelection {
  id: number;
  legacyId: string;
  title: string;
  course: string;
  examBoard: string;
  currentGrade?: string;
  targetGrade?: string;
  priorQualificationGrade?: string;
  gcseHigher?: boolean;
  units?: { topics?: { lessons?: { legacyId: string }[] }[] }[];
}

interface SidebarUserSubject {
  id: number;
  legacyId: string;
  title: string;
  course: string;
  examBoard: string;
  currentGrade?: string;
  targetGrade?: string;
  gcseHigher?: boolean;
  priorQualificationGrade?: string;
  weakTopics?: string[];
}

interface SidebarProps {
  initialUserSubjects: SidebarUserSubject[];
  initialMocksData: MocksData | null;
}

export default function Sidebar({
  initialUserSubjects,
  initialMocksData,
}: SidebarProps) {
  const {
    sidebarState,
    selectedSubject,
    setSelectedSubject,
    leftSidebarWidth,
    setLeftSidebarWidth,
    setIsManageAccountOpen,
  } = useSidebar();

  const { track } = useTracking();
  const [shouldAnimate] = useState(true);
  const [isEditSubjectsModalOpen, setIsEditSubjectsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileAvatarBtnRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isLessonView = pathname.startsWith("/lessons/");
  const isSubjectView = pathname.startsWith("/subjects/");
  const isPracticePage = pathname.includes("/practice");
  const isPracticePapersPage = pathname.includes("papers");
  const isMockRouteView = pathname.includes("/mocks/");
  const isHomePage = pathname === "/" || pathname === "";

  // Extract current paper ID from URL for /papers/ routes
  const currentPaperIdFromUrl =
    pathname.match(/\/papers\/([^/]+)/)?.[1] || null;

  const lessonId = isLessonView ? pathname.split("/")[2] : null;
  const subjectId = isLessonView
    ? lessonIdToSubjectId(lessonId ?? "")
    : isSubjectView
      ? pathname.split("/")[2]
      : null;
  const editSubjectsModalRef = useRef<HTMLDivElement>(
    null
  ) as React.RefObject<HTMLDivElement>;

  // When true, we avoid auto-syncing selected subject from the URL.
  // This preserves manual selections (e.g., after adding grades) until the route changes.
  const suppressUrlSyncRef = useRef<boolean>(false);

  // const { markComplete } = useGettingStartedProgress(); // Not currently used
  const { isBelowSm } = useResponsive();
  const { user } = useUser();
  const { logout } = useAuth();

  // Use React Query for mocks data with server-provided initial data
  const { mocksData } = useMocksData(initialMocksData);

  // Check if current paper is a mock paper (for /papers/ route used after results day)
  const isCurrentPaperMock = useMemo(() => {
    if (!currentPaperIdFromUrl || !mocksData?.exams) return false;
    return mocksData.exams.some((exam) =>
      exam.papers.some((paper) => paper.paperId === currentPaperIdFromUrl)
    );
  }, [currentPaperIdFromUrl, mocksData?.exams]);

  // Consider it a mock view if on /mocks/ route OR on /papers/ route with a mock paper
  const isMockView = isMockRouteView || isCurrentPaperMock;

  // Transform initialUserSubjects (SidebarUserSubject[]) to SubjectWithUnits[] for the hook
  const initialDataAsSubjectWithUnits = useMemo<SubjectWithUnits[]>(
    () =>
      initialUserSubjects.map((s) => ({
        id: s.id,
        legacyId: s.legacyId,
        title: s.title,
        examBoard: s.examBoard,
        course: s.course,
        currentGrade: s.currentGrade,
        targetGrade: s.targetGrade,
        gcseHigher: s.gcseHigher,
        priorQualificationGrade: s.priorQualificationGrade,
        weakTopics: s.weakTopics || [],
        units: [],
        exams: [],
        totalQuestions: 0,
        answeredQuestions: 0,
        totalMarksPossible: 0,
        totalMarksAwarded: 0,
        totalMarksMissed: 0,
      })),
    [initialUserSubjects]
  );

  // Use the hook with initial data from server-side props
  const {
    data: userSubjectsAsSubjectWithUnits,
    isLoading: isLoadingSubjects,
    updateSubjects: updateSubjectsInHook,
    updateSubjectGrades: updateSubjectGradesInHook,
  } = useUserSubjects(initialDataAsSubjectWithUnits);

  // Transform SubjectWithUnits[] back to SidebarUserSubject[] for component usage
  const userSubjects = useMemo<SidebarUserSubject[]>(
    () =>
      userSubjectsAsSubjectWithUnits.map((s) => ({
        id: s.id,
        legacyId: s.legacyId,
        title: s.title,
        course: s.course,
        examBoard: s.examBoard,
        currentGrade: s.currentGrade,
        targetGrade: s.targetGrade,
        gcseHigher: s.gcseHigher,
        priorQualificationGrade: s.priorQualificationGrade,
        weakTopics: s.weakTopics || [],
      })),
    [userSubjectsAsSubjectWithUnits]
  );

  // Hook for getting and clearing last lesson
  const { getLastLesson, clearLastLesson } = useLastLesson();

  // Check if selected subject has valid grades
  const selectedSubjectHasValidGrades = useMemo(() => {
    if (!selectedSubject) return false;
    const subject = userSubjects?.find((s) => s.legacyId === selectedSubject);
    if (!subject) return false;

    const isValidGrade = (grade?: string) => {
      if (!grade || grade.trim() === "") return false;
      if (!subject.course || !subject.examBoard)
        return grade.trim() !== "" && grade !== "0";
      const gradeScale = getGradeScale(
        subject.course as CourseType,
        subject.examBoard
      );
      return gradeScale.options.includes(grade);
    };

    return (
      isValidGrade(subject.currentGrade) && isValidGrade(subject.targetGrade)
    );
  }, [selectedSubject, userSubjects]);

  // Track if we've navigated for the current subject to avoid duplicate navigations
  const lastNavigatedSubjectRef = useRef<string | null>(null);
  // Track pending navigation to prevent multiple simultaneous navigations
  const pendingNavigationSubjectRef = useRef<string | null>(null);

  // Navigate to first lesson when subject is selected
  useEffect(() => {
    // Only navigate if:
    // 1. We have a selected subject
    // 2. Subject has valid grades
    // 3. We haven't already navigated for this subject
    // 4. We're not already on a lesson page for this subject (to avoid unnecessary navigation)
    if (!selectedSubject) {
      return;
    }

    // Don't navigate if grades are missing
    if (!selectedSubjectHasValidGrades) {
      return;
    }

    // If we're already on a lesson page for this subject, mark as navigated and clear pending
    if (isLessonView && subjectId === selectedSubject) {
      lastNavigatedSubjectRef.current = selectedSubject;
      pendingNavigationSubjectRef.current = null;
      return;
    }

    // If we're on a paper page for this subject, don't navigate (user is viewing a paper)
    if (isPracticePapersPage && subjectId === selectedSubject) {
      lastNavigatedSubjectRef.current = selectedSubject;
      pendingNavigationSubjectRef.current = null;
      return;
    }

    // If there's a pending navigation for a different subject, cancel it and reset tracking
    if (
      pendingNavigationSubjectRef.current &&
      pendingNavigationSubjectRef.current !== selectedSubject
    ) {
      // If we were navigating to a different subject, reset its tracking
      if (
        lastNavigatedSubjectRef.current === pendingNavigationSubjectRef.current
      ) {
        lastNavigatedSubjectRef.current = null;
      }
      pendingNavigationSubjectRef.current = null;
    }

    // Skip if we've already navigated for this subject (and there's no pending navigation conflict)
    if (
      lastNavigatedSubjectRef.current === selectedSubject &&
      !pendingNavigationSubjectRef.current
    ) {
      return;
    }

    // Skip if there's already a pending navigation for this subject
    if (pendingNavigationSubjectRef.current === selectedSubject) {
      return;
    }

    // Mark this subject as having a pending navigation
    pendingNavigationSubjectRef.current = selectedSubject;

    // Check if there's a last lesson for this subject first
    const lastLesson = getLastLesson();
    if (lastLesson && lastLesson.lessonId) {
      const lastLessonSubjectId = lessonIdToSubjectId(lastLesson.lessonId);
      if (lastLessonSubjectId === selectedSubject) {
        // Navigate to last lesson
        lastNavigatedSubjectRef.current = selectedSubject;
        router.push(lastLesson.lessonUrl);
        return;
      }
    }

    // Navigate to first lesson (always follows pattern: {subjectLegacyId}0.0.0)
    lastNavigatedSubjectRef.current = selectedSubject;
    router.push(`/lessons/${selectedSubject}0.0.0/practice`);
  }, [
    selectedSubject,
    isLessonView,
    isPracticePapersPage,
    subjectId,
    getLastLesson,
    router,
    selectedSubjectHasValidGrades,
  ]);

  // Clear pending navigation when navigation completes (URL matches selected subject)
  // Also handle case where URL changes to a different subject (navigation was cancelled)
  useEffect(() => {
    if (isLessonView) {
      if (subjectId === selectedSubject) {
        // We're on the correct page for the selected subject
        if (pendingNavigationSubjectRef.current === selectedSubject) {
          // Navigation completed successfully
          pendingNavigationSubjectRef.current = null;
        }
      } else {
        // We're on a different subject's page than selected
        // This means either:
        // 1. A previous navigation completed for a different subject (user clicked multiple subjects quickly)
        // 2. User navigated manually to a different subject
        // In either case, clear any pending navigation for the selected subject
        if (pendingNavigationSubjectRef.current === selectedSubject) {
          pendingNavigationSubjectRef.current = null;
          // Reset tracking for the selected subject since we're not on its page
          if (lastNavigatedSubjectRef.current === selectedSubject) {
            lastNavigatedSubjectRef.current = null;
          }
        }
      }
    }
  }, [isLessonView, subjectId, selectedSubject]);

  // Update subjects directly from the data we just saved (no refetch needed)
  const handleSubjectsUpdated = useCallback(
    (updatedSubjects: ApiUserSubject[]) => {
      // Transform ApiUserSubject[] to UserSubject[] format for the hook
      const subjectsForHook: ApiUserSubject[] = updatedSubjects.map(
        (subject) => {
          const subjectWithCourse = subject as ApiUserSubject & {
            course?: string;
          };
          return {
            id: subject.id,
            legacyId: subject.legacyId,
            title: subject.title,
            examBoard: subject.examBoard,
            currentGrade: subject.currentGrade || "0",
            targetGrade: subject.targetGrade || "0",
            weakTopics: subject.weakTopics || [],
            gcseHigher: subject.gcseHigher,
            priorQualificationGrade: subject.priorQualificationGrade,
            course: subjectWithCourse.course,
          } as ApiUserSubject & { course?: string };
        }
      );
      updateSubjectsInHook(subjectsForHook);

      // If the current route references a subject the user no longer has,
      // redirect them to home to prevent access to restricted content.
      try {
        const updatedIds = new Set(subjectsForHook.map((s) => s.legacyId));
        const currentSubjectFromUrl = subjectId;
        const currentSelected = selectedSubject;

        const currentSubjectInvalid =
          (currentSubjectFromUrl && !updatedIds.has(currentSubjectFromUrl)) ||
          (currentSelected && !updatedIds.has(currentSelected));

        if (currentSubjectInvalid) {
          // If the stored last lesson belongs to the removed subject, clear it locally
          try {
            const last = getLastLesson();
            if (last && last.lessonId) {
              const lastLessonSubjectId = lessonIdToSubjectId(last.lessonId);
              if (
                lastLessonSubjectId === currentSubjectFromUrl ||
                lastLessonSubjectId === currentSelected
              ) {
                clearLastLesson();
              }
            }
          } catch {}

          setSelectedSubject(null);
          setIsMockPanelOpen(false);
          // Use dedicated route that clears cookies and prevents redirect loops
          router.push("/forbidden-redirect");
        }
      } catch (err) {
        // Swallow any errors to avoid blocking the update flow
        // (e.g., router not available in some rare cases)
        console.error("Sidebar redirect after subject removal failed", err);
      }
    },
    [
      updateSubjectsInHook,
      subjectId,
      selectedSubject,
      setSelectedSubject,
      router,
      getLastLesson,
      clearLastLesson,
    ]
  );

  // Hook for getting last lesson

  // Hook for updating subject grades
  const { updateSubjectGrades } = useUpdateSubjects();

  // State for sidebar mode - "learn" or "practice"
  const [sidebarMode, setSidebarMode] = useState<
    "learn" | "practice" | "insights"
  >("learn");

  // State for grade selection
  const [subjectNeedingGrades, setSubjectNeedingGrades] =
    useState<SubjectForGradeSelection | null>(null);

  // State for search functionality
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // State for mock panel
  const [isMockPanelOpen, setIsMockPanelOpen] = useState(isMockView);

  // Right panel sizing (desktop): fixed width via Tailwind classes

  // Handle opening mock panel
  const handleOpenMockPanel = useCallback(() => {
    setIsMockPanelOpen(true);
    // Clear selected subject when opening mock panel so no subjects appear selected
    setSelectedSubject(null);
    // Clear any pending grade selection when opening mock panel
    setSubjectNeedingGrades(null);
  }, [setSelectedSubject]);

  // Update mock panel state based on route
  useEffect(() => {
    setIsMockPanelOpen(isMockView);
    // Clear selected subject when mock panel opens via route navigation
    if (isMockView) {
      setSelectedSubject(null);
    }
  }, [isMockView, setSelectedSubject]);

  // Removed dynamic right panel measurement; width is fixed on desktop

  // Theme for the currently selected subject (used for search styling)
  const selectedTheme = getSubjectTheme(
    userSubjects?.find((s) => s.legacyId === selectedSubject)?.title || ""
  );

  // On home:
  // - When a subject is selected (grade selection shown), allow resizing
  // - When no subject is selected, keep it wide for readability: min 400px
  const effectiveLeftSidebarWidth = isHomePage
    ? selectedSubject
      ? leftSidebarWidth
      : Math.max(leftSidebarWidth, 400)
    : leftSidebarWidth;
  const leftWidthForRender = isBelowSm
    ? isHomePage && !selectedSubject
      ? 360
      : 72
    : effectiveLeftSidebarWidth;

  // Handle subject selection with navigation
  const handleSubjectSelect = useCallback(
    (subject: SubjectForGradeSelection) => {
      // Preserve manual selection until route changes
      suppressUrlSyncRef.current = true;
      // Check if grades are missing
      const isValidGrade = (grade?: string) => {
        if (!grade || grade.trim() === "") return false;
        if (!subject.course || !subject.examBoard)
          return grade.trim() !== "" && grade !== "0";
        const gradeScale = getGradeScale(
          subject.course as CourseType,
          subject.examBoard
        );
        return gradeScale.options.includes(grade);
      };

      const hasValidGrades =
        isValidGrade(subject.currentGrade) && isValidGrade(subject.targetGrade);

      if (!hasValidGrades) {
        // Show grade selection instead of navigating
        setSubjectNeedingGrades(subject);
        setSelectedSubject(subject.legacyId);
        // Close mock panel when showing grade selection
        setIsMockPanelOpen(false);
        return;
      }

      // Clear any existing grade selection state when switching to a subject with valid grades
      setSubjectNeedingGrades(null);

      // Set selected subject to open curriculum view in sidebar
      setSelectedSubject(subject.legacyId);

      // Close mock panel when selecting a subject to show curriculum view
      setIsMockPanelOpen(false);

      // Navigation will be handled by the useEffect that watches selectedSubject
      // It will navigate immediately to the first lesson (pattern: {subjectLegacyId}0.0.0)
    },
    [setSelectedSubject, setIsMockPanelOpen, setSubjectNeedingGrades]
  );

  // Handle saving grades and proceeding with navigation
  const handleGradeComplete = useCallback(
    async (
      currentGrade: string,
      targetGrade: string,
      priorQualificationGrade?: string
    ) => {
      if (!subjectNeedingGrades) return;

      try {
        // Save grades via curriculum API
        const result = await updateSubjectGrades(
          subjectNeedingGrades.legacyId,
          {
            currentGrade,
            targetGrade,
            priorQualificationGrade,
            gcseHigher: subjectNeedingGrades.gcseHigher ?? null,
          }
        );

        if (!result) {
          // Error was already handled by the hook (toast shown)
          return;
        }

        // Update the subject's grades directly in state (no refetch needed)
        updateSubjectGradesInHook(subjectNeedingGrades.legacyId, {
          currentGrade,
          targetGrade,
          priorQualificationGrade,
          gcseHigher: subjectNeedingGrades.gcseHigher ?? null,
        });

        // Grades saved successfully

        // Keep the newly graded subject selected and preserve manual selection
        suppressUrlSyncRef.current = true;
        setSelectedSubject(subjectNeedingGrades.legacyId);

        // Clear grade selection state
        setSubjectNeedingGrades(null);

        // Navigation will be handled by the useEffect that watches selectedSubject
        // It will navigate immediately to the first lesson (pattern: {subjectLegacyId}-0.0.0)
      } catch (error) {
        console.error("Error saving grades:", error);
      }
    },
    [
      subjectNeedingGrades,
      updateSubjectGrades,
      updateSubjectGradesInHook,
      setSelectedSubject,
      setSubjectNeedingGrades,
    ]
  );

  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);
  const leftWidthRef = useRef<number>(leftSidebarWidth);

  // Keep a ref of leftSidebarWidth to avoid re-running resize effect on every width change
  useEffect(() => {
    leftWidthRef.current = leftSidebarWidth;
  }, [leftSidebarWidth]);

  // Load saved width from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebarLeftWidth");
    if (savedWidth) {
      setLeftSidebarWidth(Number(savedWidth));
    }
  }, [setLeftSidebarWidth]);

  // Load saved sidebar mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("sidebarMode");
    if (savedMode === "insights" || savedMode === "learn") {
      setSidebarMode(savedMode as "insights" | "learn");
    }
  }, []);

  // Clear suppression BEFORE syncing selection from the URL when the route's subject changes
  // This ensures that on first render after navigation (e.g., from home → lesson/practice),
  // the auto-sync effect below is allowed to set the selected subject immediately.
  useEffect(() => {
    suppressUrlSyncRef.current = false;
  }, [subjectId]);

  // Removed auto-resize based on mocks banner to allow truncation instead

  // Set initial selected subject based on current page
  // Note: Do NOT depend on selectedSubject here, so manual selections (e.g. grade select)
  // are not overridden by the current URL when staying on the same page.
  useEffect(() => {
    // Respect manual selection (e.g., after grade entry) until the route changes
    if (suppressUrlSyncRef.current) return;

    if (userSubjects && userSubjects.length > 0) {
      // If we're on a subject/lesson page, find matching subject
      // But don't set selectedSubject if we're in mock view (mock panel should be shown instead)
      if (subjectId && !isMockView) {
        const matchingSubject = userSubjects.find(
          (s) => s.legacyId === subjectId
        );
        if (matchingSubject) {
          setSelectedSubject(matchingSubject.legacyId);
          return;
        }
      }
      // Default to first subject if no match or not on subject page
      // if (!selectedSubject) {
      //   setSelectedSubject(userSubjects[0].title);
      // }
    }
  }, [userSubjects, subjectId, setSelectedSubject, isMockView]);

  // Handle drag events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (sidebarState !== "open" || isBelowSm) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartWidth.current = leftSidebarWidth;
    },
    [sidebarState, leftSidebarWidth, isBelowSm]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX.current;
      // When no subject is selected, allow wider resizing up to 400px
      // When subject is selected, limit to 200px to leave room for the right panel
      const maxWidth = selectedSubject ? 300 : 300;
      const newWidth = Math.min(
        maxWidth,
        Math.max(72, dragStartWidth.current + deltaX)
      );
      setLeftSidebarWidth(newWidth);
    },
    [isDragging, selectedSubject, setLeftSidebarWidth]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    // Save to localStorage
    localStorage.setItem("sidebarLeftWidth", leftSidebarWidth.toString());
  }, [isDragging, leftSidebarWidth]);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Close mobile account menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        mobileAvatarBtnRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !mobileAvatarBtnRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  // Focus search input when opening the overlay
  useEffect(() => {
    if (isSearchOpen) {
      // Delay to ensure visibility before focusing
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isSearchOpen]);

  // Disable search in Insights: auto-close overlay if switching to insights
  useEffect(() => {
    if (sidebarMode === "insights" && isSearchOpen) {
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  }, [sidebarMode, isSearchOpen]);

  // When closing the sidebar, reset state to match the current page
  const prevSidebarStateRef = useRef(sidebarState);
  useEffect(() => {
    const prev = prevSidebarStateRef.current;
    if (
      (prev === "open" || prev === "semi-open") &&
      sidebarState === "closed"
    ) {
      // Clear URL sync suppression to allow normal URL-based selection
      suppressUrlSyncRef.current = false;

      // Clear any pending grade selection when the sidebar is closed
      setSubjectNeedingGrades(null);

      // Reset state based on current page type (prioritize mock view over practice)
      if (isMockView) {
        // If on mock page, restore mock panel and clear selected subject
        setIsMockPanelOpen(true);
        setSelectedSubject(null);
        setSidebarMode("insights"); // Default to insights for mocks
      } else if (isPracticePapersPage) {
        // If on practice papers page
        setIsMockPanelOpen(false);
        setSidebarMode("practice");
        // Set selected subject if we have a subject ID
        if (subjectId && userSubjects) {
          const matchingSubject = userSubjects.find(
            (s) => s.legacyId === subjectId
          );
          if (matchingSubject) {
            setSelectedSubject(matchingSubject.legacyId);
          }
        }
      } else if (isPracticePage) {
        // If on other practice pages (lessons/practice)
        setIsMockPanelOpen(false);
        // Respect saved mode from localStorage, default to insights if not set
        const savedMode = localStorage.getItem("sidebarMode");
        if (savedMode === "insights" || savedMode === "learn") {
          setSidebarMode(savedMode as "insights" | "learn");
        } else {
          setSidebarMode("insights");
        }
        // Set selected subject if we have a subject ID
        if (subjectId && userSubjects) {
          const matchingSubject = userSubjects.find(
            (s) => s.legacyId === subjectId
          );
          if (matchingSubject) {
            setSelectedSubject(matchingSubject.legacyId);
          }
        }
      } else {
        // Default case (home, subjects, etc.)
        setIsMockPanelOpen(false);
        setSidebarMode("insights");
        // Selected subject will be handled by the URL sync effect
      }
    }
    prevSidebarStateRef.current = sidebarState;
  }, [
    sidebarState,
    isPracticePage,
    isPracticePapersPage,
    isMockView,
    subjectId,
    userSubjects,
    setSubjectNeedingGrades,
    setSelectedSubject,
  ]);

  return (
    <>
      {isEditSubjectsModalOpen && (
        <EditSubjectsModal
          editSubjectsModalRef={editSubjectsModalRef}
          setIsEditSubjectsModalOpen={setIsEditSubjectsModalOpen}
          userSubjects={
            (userSubjects || []).map((s) => ({
              id: s.id,
              legacyId: s.legacyId,
              title: s.title,
              examBoard: s.examBoard,
              currentGrade: s.currentGrade || "0",
              targetGrade: s.targetGrade || "0",
              weakTopics: s.weakTopics || [],
              gcseHigher: s.gcseHigher,
              priorQualificationGrade: s.priorQualificationGrade,
            })) as ApiUserSubject[]
          }
          onSubjectsUpdated={handleSubjectsUpdated}
        />
      )}
      <div
        className={`bg-white/95 backdrop-blur-[16px] h-full overflow-visible rounded-none sm:rounded-[32px] shadow-[0_0_16px_rgba(0,0,0,0.16)] flex flex-col border-0 sm:border border-white relative z-[1106]
          ${
            sidebarState === "closed"
              ? `opacity-0 -translate-x-full pointer-events-none`
              : sidebarState === "semi-open"
                ? `opacity-100 scale-100 translate-x-0 pointer-events-auto`
                : "opacity-100 scale-100 translate-x-0 mt-0 pointer-events-auto"
          }
          `}
        style={{
          width: isBelowSm
            ? "100vw"
            : sidebarState === "closed"
              ? "400px"
              : sidebarState === "semi-open"
                ? "420px"
                : selectedSubject || isMockPanelOpen
                  ? `${Math.max(340, effectiveLeftSidebarWidth + 420)}px`
                  : `${Math.max(340, effectiveLeftSidebarWidth)}px`,
          transform: sidebarState === "closed" ? "scale(0.93)" : "scale(1)",
          transformOrigin: "top left",
          transition: shouldAnimate
            ? isDragging
              ? "transform 150ms ease-out, opacity 150ms ease-out"
              : "transform 150ms ease-out, opacity 150ms ease-out"
            : "none",
        }}
      >
        {isBelowSm && (
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-9" />
            <div className="font-rounded-heavy text-[22px]">medly</div>
            <div className="relative">
              <button
                ref={mobileAvatarBtnRef}
                className="w-9 h-9 rounded-full bg-[#DBDEEA] flex items-center justify-center"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
              >
                <span className="text-xl">{user?.avatar}</span>
              </button>
              {isMobileMenuOpen && (
                <div
                  ref={mobileMenuRef}
                  className="absolute top-full right-0 mt-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 min-w-64 z-[15000]"
                >
                  <div className="flex flex-col gap-0 p-2">
                    <div
                      onClick={() => {
                        window.open(
                          "https://medlyai.tawk.help/article/frequently-asked-questions"
                        );
                        setIsMobileMenuOpen(false);
                      }}
                      className="cursor-pointer flex w-full px-4 py-3 justify-between items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg-[rgba(0,0,0,0.05)]"
                    >
                      <span>Provide feedback</span>
                      <EditIcon fill="rgba(0,0,0,0.8)" />
                    </div>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsManageAccountOpen(true);
                      }}
                      className="cursor-pointer flex w-full px-4 py-3 justify-between items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg-[rgba(0,0,0,0.05)]"
                    >
                      <span>Manage account</span>
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 28 28"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M14 13.8477C16.127 13.8477 17.8496 11.9668 17.8496 9.66406C17.8496 7.39648 16.127 5.59473 14 5.59473C11.8818 5.59473 10.1416 7.42285 10.1504 9.68164C10.1592 11.9756 11.873 13.8477 14 13.8477ZM14 12.3096C12.7871 12.3096 11.7588 11.1582 11.7588 9.68164C11.75 8.24023 12.7783 7.13281 14 7.13281C15.2305 7.13281 16.2412 8.22266 16.2412 9.66406C16.2412 11.1406 15.2217 12.3096 14 12.3096ZM8.51562 22.0215H19.4756C20.9961 22.0215 21.7256 21.5381 21.7256 20.501C21.7256 18.084 18.7109 14.8672 14 14.8672C9.28906 14.8672 6.26562 18.084 6.26562 20.501C6.26562 21.5381 6.99512 22.0215 8.51562 22.0215ZM8.24316 20.4834C8.03223 20.4834 7.95312 20.4131 7.95312 20.2549C7.95312 18.9102 10.124 16.4053 14 16.4053C17.8672 16.4053 20.0381 18.9102 20.0381 20.2549C20.0381 20.4131 19.959 20.4834 19.748 20.4834H8.24316Z"
                          fill="rgba(0,0,0,0.8)"
                        />
                      </svg>
                    </button>
                    <div
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="cursor-pointer flex w-full px-4 py-3 justify-between items-center rounded-[10px] text-sm font-rounded-bold text-black hover:bg...[TRUNCATED]"
                    >
                      <span>Log out</span>
                      <LogoutIcon fill="rgba(0,0,0,0.8)" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-row flex-1 min-h-0 overflow-visible">
          {/* Left side - visible in semi-open and open states */}
          <div
            className={`flex flex-col h-full relative ${
              sidebarState === "closed" || sidebarState === "semi-open"
                ? "opacity-0 -translate-x-full w-0 overflow-visible "
                : "opacity-100 translate-x-0 overflow-visible z-10"
            }`}
            style={{
              width:
                sidebarState === "closed"
                  ? "0px"
                  : sidebarState === "semi-open"
                    ? "0px"
                    : isBelowSm
                      ? isHomePage && !selectedSubject
                        ? "100vw"
                        : `${leftWidthForRender}px`
                      : selectedSubject || isMockPanelOpen
                        ? `${effectiveLeftSidebarWidth}px`
                        : "100%",
            }}
          >
            <div className="sm:pt-4 gap-2 flex flex-col flex-1 min-h-0">
              {/* Header */}
              <SidebarHeader
                leftSidebarWidth={
                  isBelowSm
                    ? leftWidthForRender
                    : isHomePage
                      ? effectiveLeftSidebarWidth
                      : leftSidebarWidth
                }
                onOpenMockPanel={handleOpenMockPanel}
                isRegisteredForMocks={mocksData?.isRegistered}
              />

              {/* Subjects List - Scrollable */}
              <SidebarSubjectsList
                userSubjects={userSubjects}
                isLoadingSubjects={isLoadingSubjects}
                selectedSubject={selectedSubject}
                leftSidebarWidth={
                  isBelowSm
                    ? leftWidthForRender
                    : isHomePage
                      ? effectiveLeftSidebarWidth
                      : leftSidebarWidth
                }
                onSubjectSelect={(subject) =>
                  handleSubjectSelect(subject as SubjectForGradeSelection)
                }
                onAddSubjects={() => setIsEditSubjectsModalOpen(true)}
              />
            </div>

            {/* Draggable border - show when right panel is present */}
            {!isBelowSm &&
              sidebarState === "open" &&
              (selectedSubject || isMockPanelOpen) && (
                <div
                  className={`absolute top-0 right-0 h-full w-[4px] ${
                    sidebarState === "open"
                      ? "cursor-ew-resize"
                      : "cursor-default"
                  } hover:bg-[#F2F2F7] active:bg-[#F2F2F7]`}
                  style={{
                    borderRight: "1px solid #F2F2F7",
                    transition: isDragging
                      ? "none"
                      : "background-color 150ms ease-out",
                  }}
                  onMouseDown={handleMouseDown}
                />
              )}
          </div>

          {/* Right side */}
          {(isBelowSm || selectedSubject || isMockPanelOpen) &&
            !(isHomePage && !selectedSubject && !isMockPanelOpen) && (
              <div
                className={`flex flex-col h-full min-h-0 pt-2 overflow-x-hidden sm:w-[420px] ${
                  isBelowSm
                    ? "border-t border-l border-[#F2F2F7] rounded-tl-3xl"
                    : ""
                }`}
                style={{
                  width: isBelowSm
                    ? `calc(100vw - ${leftWidthForRender + 1}px)`
                    : undefined,
                }}
              >
                <div className="flex flex-col h-full min-h-0">
                  <SidebarPanelHeader
                    isHomePage={isHomePage}
                    isMockPanelOpen={isMockPanelOpen}
                    title={
                      isMockPanelOpen
                        ? "Christmas 2025"
                        : selectedSubject && userSubjects
                          ? (() => {
                              const subject = userSubjects.find(
                                (s) => s.legacyId === selectedSubject
                              );
                              if (subject) {
                                const higherFoundationText =
                                  subject.gcseHigher === undefined ||
                                  subject.gcseHigher === null
                                    ? ""
                                    : subject.gcseHigher
                                      ? " Higher"
                                      : subject.course ===
                                          "IB (International Baccalaureate)"
                                        ? " Standard"
                                        : " Foundation";
                                // Hide duplicated IB course name when exam board is already IB
                                const isIbdDuplicate =
                                  subject.examBoard === "IB" &&
                                  subject.course ===
                                    "IB (International Baccalaureate)";
                                const parts = [
                                  subject.examBoard,
                                  isIbdDuplicate ? undefined : subject.course,
                                  subject.title,
                                ].filter(Boolean) as string[];
                                return `${parts.join(" ")}${higherFoundationText}`;
                              }
                              // Fallback when selectedSubject not in userSubjects: format from legacy id
                              try {
                                const { examBoard, course, subjectTitle } =
                                  deconstructSubjectLegacyId(selectedSubject);
                                if (examBoard || course || subjectTitle) {
                                  // Hide duplicated IB course name when exam board is already IB
                                  const isIbdDuplicate =
                                    examBoard === "IB" &&
                                    course ===
                                      "IB (International Baccalaureate)";
                                  const parts = [
                                    examBoard,
                                    isIbdDuplicate ? undefined : course,
                                    subjectTitle,
                                  ].filter(Boolean) as string[];
                                  return parts.join(" ");
                                }
                              } catch {}
                              return selectedSubject;
                            })()
                          : "Select a subject"
                    }
                  />

                  {isMockPanelOpen && !subjectNeedingGrades ? (
                    <div className="flex-1 min-h-0">
                      <MockPanel
                        subjectId={selectedSubject}
                        initialMocksData={mocksData}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="pt-2 gap-2 flex flex-col">
                        {!subjectNeedingGrades &&
                          (selectedSubject || !isBelowSm) && (
                            <div className="rounded-full bg-[#F7F7FA] mx-4 p-1 px-2 sm:px-1 sm:pr-4 flex flex-row items-center relative overflow-visible">
                              {selectedSubject ? (
                                (() => {
                                  const selected = userSubjects?.find(
                                    (s) => s.legacyId === selectedSubject
                                  );
                                  const theme = getSubjectTheme(
                                    selected?.title || ""
                                  );
                                  return (
                                    <>
                                      <div className="flex items-center flex-1 min-w-0 sm:pr-2">
                                        <button
                                          className={`flex-1 flex flex-row items-center justify-center gap-2 font-rounded-bold text-[14px] px-4 sm:px-4 py-2 rounded-full transition-colors duration-0 whitespace-nowrap ${
                                            sidebarMode === "learn"
                                              ? "text-white"
                                              : "bg-transparent"
                                          }`}
                                          style={{
                                            backgroundColor:
                                              sidebarMode === "insights"
                                                ? theme.primaryColor
                                                : "transparent",
                                            color:
                                              sidebarMode === "insights"
                                                ? "white"
                                                : theme.primaryColor,
                                          }}
                                          onClick={() => {
                                            setSidebarMode("insights");
                                            localStorage.setItem(
                                              "sidebarMode",
                                              "insights"
                                            );
                                            track(
                                              "clicked_insights_in_sidebar"
                                            );
                                          }}
                                        >
                                          Insights
                                        </button>
                                        <button
                                          className={`flex-1 font-rounded-bold text-[14px] px-4 sm:px-4 py-2 rounded-full transition-colors duration-0 whitespace-nowrap ${
                                            sidebarMode === "learn"
                                              ? "text-white"
                                              : "bg-transparent"
                                          }`}
                                          style={{
                                            backgroundColor:
                                              sidebarMode === "learn"
                                                ? theme.primaryColor
                                                : "transparent",
                                            color:
                                              sidebarMode === "learn"
                                                ? "white"
                                                : theme.primaryColor,
                                          }}
                                          onClick={() => {
                                            setSidebarMode("learn");
                                            localStorage.setItem(
                                              "sidebarMode",
                                              "learn"
                                            );
                                            track(
                                              "clicked_learn_and_practice_in_sidebar"
                                            );
                                          }}
                                        >
                                          {isBelowSm ? "Practice" : "Practice"}
                                        </button>
                                        <button
                                          className={`flex-1 font-rounded-bold text-[14px] px-4 sm:px-4 py-2 rounded-full transition-colors duration-0 whitespace-nowrap ${
                                            sidebarMode === "practice"
                                              ? "text-white"
                                              : "bg-transparent"
                                          }`}
                                          style={{
                                            backgroundColor:
                                              sidebarMode === "practice"
                                                ? theme.primaryColor
                                                : "transparent",
                                            color:
                                              sidebarMode === "practice"
                                                ? "white"
                                                : theme.primaryColor,
                                          }}
                                          onClick={() => {
                                            setSidebarMode("practice");
                                            track(
                                              "clicked_practice_in_sidebar"
                                            );
                                          }}
                                        >
                                          {isBelowSm ? "Papers" : "Papers"}
                                        </button>
                                      </div>
                                      {/* Search icon - hidden on mobile */}
                                      {!isBelowSm && (
                                        <button
                                          className={`shrink-0 rounded-[8px] p-1 sm:p-2 transition-colors duration-150 ${
                                            sidebarMode === "insights"
                                              ? "opacity-40"
                                              : "hover:bg-[#F7F7FA]"
                                          }`}
                                          disabled={sidebarMode === "insights"}
                                          onClick={() => {
                                            if (sidebarMode === "insights")
                                              return;
                                            setIsSearchOpen(!isSearchOpen);
                                            if (!isSearchOpen) {
                                              // Clear search when opening
                                              setSearchQuery("");
                                            }
                                          }}
                                        >
                                          <svg
                                            width="28"
                                            height="28"
                                            viewBox="0 0 28 28"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              d="M12.5322 19.0332C13.9297 19.0332 15.2393 18.6113 16.3291 17.8906L20.1787 21.749C20.4336 21.9951 20.7588 22.1182 21.1104 22.1182C21.8398 22.1182 22.376 21.5469 22.376 20.8262C22.376 20.4922 22.2617 20.167 22.0156 19.9209L18.1924 16.0801C18.9834 14.9551 19.4492 13.5928 19.4492 12.1162C19.4492 8.31055 16.3379 5.19922 12.5322 5.19922C8.73535 5.19922 5.61523 8.31055 5.61523 12.1162C5.61523 15.9219 8.72656 19.0332 12.5322 19.0332ZM12.5322 17.1875C9.74609 17.1875 7.46094 14.9023 7.46094 12.1162C7.46094 9.33008 9.74609 7.04492 12.5322 7.04492C15.3184 7.04492 17.6035 9.33008 17.6035 12.1162C17.6035 14.9023 15.3184 17.1875 12.5322 17.1875Z"
                                              fill={
                                                sidebarMode === "insights"
                                                  ? "#C7C7CC"
                                                  : theme.primaryColor
                                              }
                                            />
                                          </svg>
                                        </button>
                                      )}
                                    </>
                                  );
                                })()
                              ) : (
                                <>
                                  <div
                                    className={`flex items-center flex-1 min-w-0 overflow-hidden pr-2 ${
                                      isBelowSm
                                        ? "justify-start gap-6"
                                        : "gap-2"
                                    }`}
                                  >
                                    <button
                                      className="font-rounded-bold text-[14px] bg-gray-300 text-white px-4 sm:px-4 py-2 rounded-full whitespace-nowrap"
                                      disabled
                                    >
                                      Insights
                                    </button>
                                    <button
                                      className="font-rounded-bold text-[14px] bg-gray-300 text-white px-4 sm:px-4 py-2 rounded-full whitespace-nowrap"
                                      disabled
                                    >
                                      Practice
                                    </button>
                                    <button
                                      className="font-rounded-bold text-[14px] bg-transparent text-gray-300 px-4 sm:px-4 py-2 rounded-full whitespace-nowrap"
                                      disabled
                                    >
                                      Papers
                                    </button>
                                  </div>
                                  <svg
                                    className="shrink-0"
                                    width="28"
                                    height="28"
                                    viewBox="0 0 28 28"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M12.5322 19.0332C13.9297 19.0332 15.2393 18.6113 16.3291 17.8906L20.1787 21.749C20.4336 21.9951 20.7588 22.1182 21.1104 22.1182C21.8398 22.1182 22.376 21.5469 22.376 20.8262C22.376 20.4922 22.2617 20.167 22.0156 19.9209L18.1924 16.0801C18.9834 14.9551 19.4492 13.5928 19.4492 12.1162C19.4492 8.31055 16.3379 5.19922 12.5322 5.19922C8.73535 5.19922 5.61523 8.31055 5.61523 12.1162C5.61523 15.9219 8.72656 19.0332 12.5322 19.0332ZM12.5322 17.1875C9.74609 17.1875 7.46094 14.9023 7.46094 12.1162C7.46094 9.33008 9.74609 7.04492 12.5322 7.04492C15.3184 7.04492 17.6035 9.33008 17.6035 12.1162C17.6035 14.9023 15.3184 17.1875 12.5322 17.1875Z"
                                      fill="#999999"
                                    />
                                  </svg>
                                </>
                              )}
                              {/* Overlay search input expanding from the magnifier */}
                              <div
                                className={`absolute inset-0 z-[1200] flex items-center rounded-full bg-[#F7F7FA] transform origin-right transition-all duration-200 ease-out ${
                                  isSearchOpen && sidebarMode !== "insights"
                                    ? "opacity-100 scale-x-100 pointer-events-auto"
                                    : "opacity-0 scale-x-0 pointer-events-none"
                                }`}
                              >
                                <div className="relative w-full mx-2 sm:mx-2">
                                  <input
                                    type="text"
                                    placeholder={`Search ${
                                      sidebarMode === "learn"
                                        ? "units, topics, or lessons"
                                        : "practice papers"
                                    }...`}
                                    value={searchQuery}
                                    onChange={(e) =>
                                      setSearchQuery(e.target.value)
                                    }
                                    className="w-full px-3 py-2 pr-10 text-[14px] bg-[#F7F7FA] border-0 rounded-[8px] focus:outline-none focus:ring-0 placeholder-[#8E8E93]"
                                    style={{
                                      color: selectedTheme.primaryColor,
                                      caretColor: selectedTheme.primaryColor,
                                    }}
                                    autoFocus={isSearchOpen}
                                    tabIndex={isSearchOpen ? 0 : -1}
                                    ref={searchInputRef}
                                  />
                                  <button
                                    onClick={() => {
                                      if (searchQuery) {
                                        setSearchQuery("");
                                      } else {
                                        setIsSearchOpen(false);
                                      }
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-[#E5E5EA] rounded-full p-0.5 transition-colors duration-150 flex items-center justify-center"
                                    aria-label="Clear or close search"
                                  >
                                    <CrossInCircleIcon
                                      fill={selectedTheme.primaryColor}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Mobile search bar - only shows on mobile when not in insights mode */}
                        {isBelowSm && selectedSubject && sidebarMode !== "insights" && (
                          <div className="mx-4 mt-2">
                            <div className="relative w-full">
                              <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                width="20"
                                height="20"
                                viewBox="0 0 28 28"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M12.5322 19.0332C13.9297 19.0332 15.2393 18.6113 16.3291 17.8906L20.1787 21.749C20.4336 21.9951 20.7588 22.1182 21.1104 22.1182C21.8398 22.1182 22.376 21.5469 22.376 20.8262C22.376 20.4922 22.2617 20.167 22.0156 19.9209L18.1924 16.0801C18.9834 14.9551 19.4492 13.5928 19.4492 12.1162C19.4492 8.31055 16.3379 5.19922 12.5322 5.19922C8.73535 5.19922 5.61523 8.31055 5.61523 12.1162C5.61523 15.9219 8.72656 19.0332 12.5322 19.0332ZM12.5322 17.1875C9.74609 17.1875 7.46094 14.9023 7.46094 12.1162C7.46094 9.33008 9.74609 7.04492 12.5322 7.04492C15.3184 7.04492 17.6035 9.33008 17.6035 12.1162C17.6035 14.9023 15.3184 17.1875 12.5322 17.1875Z"
                                  fill="#8E8E93"
                                />
                              </svg>
                              <input
                                type="text"
                                placeholder={`Search ${
                                  sidebarMode === "learn"
                                    ? "units, topics, or lessons"
                                    : "practice papers"
                                }...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 text-[14px] bg-[#F7F7FA] border-0 rounded-full focus:outline-none focus:ring-0 placeholder-[#8E8E93]"
                                style={{
                                  color: selectedTheme.primaryColor,
                                  caretColor: selectedTheme.primaryColor,
                                }}
                              />
                              {searchQuery && (
                                <button
                                  onClick={() => setSearchQuery("")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-[#E5E5EA] rounded-full p-0.5 transition-colors duration-150 flex items-center justify-center"
                                  aria-label="Clear search"
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                      d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM5.35355 4.64645C5.15829 4.45118 4.84171 4.45118 4.64645 4.64645C4.45118 4.84171 4.45118 5.15829 4.64645 5.35355L7.29289 8L4.64645 10.6464C4.45118 10.8417 4.45118 11.1583 4.64645 11.3536C4.84171 11.5488 5.15829 11.5488 5.35355 11.3536L8 8.70711L10.6464 11.3536C10.8417 11.5488 11.1583 11.5488 11.3536 11.3536C11.5488 11.1583 11.5488 10.8417 11.3536 10.6464L8.70711 8L11.3536 5.35355C11.5488 5.15829 11.5488 4.84171 11.3536 4.64645C11.1583 4.45118 10.8417 4.45118 10.6464 4.64645L8 7.29289L5.35355 4.64645Z"
                                      fill="#8E8E93"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="w-full overflow-y-auto flex-1 min-h-0 pt-4">
                        {subjectNeedingGrades ? (
                          <GradeSelection
                            subject={subjectNeedingGrades}
                            onComplete={handleGradeComplete}
                          />
                        ) : selectedSubject && userSubjects ? (
                          sidebarMode === "insights" ? (
                            <SidebarInsightsLayout
                              subjectId={selectedSubject || undefined}
                              searchQuery={searchQuery}
                              primaryColor={selectedTheme.primaryColor}
                            />
                          ) : sidebarMode === "learn" ? (
                            <SidebarLessonLayout
                              subjectId={selectedSubject || undefined}
                              searchQuery={searchQuery}
                            />
                          ) : (
                            <SidebarPracticePapersLayout
                              subjectId={selectedSubject || undefined}
                              searchQuery={searchQuery}
                            />
                          )
                        ) : (
                          isBelowSm && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-center px-6">
                                <p className="font-rounded-bold text-[16px]">
                                  Let&apos;s Start Learning
                                </p>
                                <p className="text-[13px] text-[#808080] mt-1">
                                  Tap on a subject to start your first lesson
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* User section */}
        {sidebarState !== "closed" && (
          <SidebarUserSection leftSidebarWidth={leftSidebarWidth} />
        )}
      </div>
    </>
  );
}
