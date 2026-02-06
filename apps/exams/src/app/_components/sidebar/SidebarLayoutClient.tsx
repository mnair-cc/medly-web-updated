"use client";

import {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
  useRef,
} from "react";
import Sidebar from "@/app/_components/sidebar/Sidebar";
import MobileBottomNav from "@/app/_components/MobileBottomNav";
import { usePathname, useRouter } from "next/navigation";
import {} from "@/app/_lib/utils/utils";
import TrialPrompt from "@/app/(protected)/(with-sidebar)/_components/TrialPrompt";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import PromoPopup from "@/app/_components/PromoPopup";
import { useLastLesson } from "@/app/_hooks/useLastLesson";
import { useResponsive } from "@/app/_hooks/useResponsive";
import ManageAccountModal from "@/app/_components/sidebar/components/ManageAccountModal";
import FeatureReleaseModal from "@/app/_components/FeatureReleaseModal";
import { SaveManagerProvider } from "@/app/_context/SaveManagerProvider";
import { useFeatureReleaseModal } from "@/app/_hooks/useFeatureReleaseModal";
import type { MocksData } from "./_lib/mocks.types";
import { MedlyMondaysProvider } from "@/app/_context/MedlyMondaysProvider";
import type { MedlyMondaysFeature } from "@/app/_lib/medlyMondays/utils";

// Create context for sidebar state
type SidebarState = "closed" | "semi-open" | "open";

const SidebarContext = createContext<{
  sidebarState: SidebarState;
  isSidebarOpen: boolean; // for backward compatibility
  toggleSidebar: () => void;
  openSidebar: () => void;
  semiOpenSidebar: () => void;
  closeSidebar: () => void;
  selectedSubject: string | null;
  setSelectedSubject: (subject: string | null) => void;
  leftSidebarWidth: number;
  setLeftSidebarWidth: (width: number) => void;
  isManageAccountOpen: boolean;
  setIsManageAccountOpen: (open: boolean) => void;
} | null>(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
};

interface UserSubject {
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

interface SidebarLayoutClientProps {
  children: React.ReactNode;
  initialUserSubjects: UserSubject[];
  initialMocksData: MocksData | null;
  initialMedlyMondaysFeature: MedlyMondaysFeature;
}

export default function SidebarLayoutClient({
  children,
  initialUserSubjects,
  initialMocksData,
  initialMedlyMondaysFeature,
}: SidebarLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { getLastLesson, consumeIntentionalHomeVisit } = useLastLesson();
  const isMockView = pathname.includes("/mocks/");
  const { hasActivePlan } = useHasActivePlan();
  const { isBelowSm, isMeasured } = useResponsive();

  // Sidebar state - open by default on home screen
  const isHomePage = pathname === "/" || pathname === "";
  const [sidebarState, setSidebarState] = useState<SidebarState>(
    isHomePage ? "open" : "closed"
  );
  const isSidebarOpen = sidebarState !== "closed"; // for backward compatibility

  // Selected subject state
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Left sidebar width state
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(200);

  // Manage account modal state - lifted here so it persists when sidebar closes
  const [isManageAccountOpen, setIsManageAccountOpen] = useState(false);

  // Feature release announcement modal
  const {
    activeFeature,
    showModal: showFeatureModal,
    resolvedUrl: featureResolvedUrl,
    dismissModal: dismissFeatureModal,
  } = useFeatureReleaseModal({
    userSubjects: initialUserSubjects,
    hasActivePlan,
  });

  const PREFERRED_STATE_KEY = "sidebarPreferredState";

  const persistPreferredState = useCallback((state: SidebarState) => {
    try {
      localStorage.setItem(PREFERRED_STATE_KEY, state);
    } catch {
      // no-op if storage unavailable
    }
  }, []);

  const getPreferredState = useCallback((): SidebarState | null => {
    try {
      const value = localStorage.getItem(PREFERRED_STATE_KEY);
      if (value === "open" || value === "semi-open" || value === "closed") {
        return value;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const toggleSidebar = () => {
    if (isHomePage) {
      // Always keep fully open on home
      return;
    }

    const newState = sidebarState === "closed" ? "semi-open" : "closed";
    setSidebarState(newState);
    persistPreferredState(newState);
  };

  const openSidebar = useCallback(() => {
    setSidebarState("open");
    // Persist preference only on non-home pages
    if (!isHomePage) {
      persistPreferredState("open");
    }
  }, [isHomePage, persistPreferredState]);

  const semiOpenSidebar = useCallback(() => {
    setSidebarState("semi-open");
    if (!isHomePage) {
      persistPreferredState("semi-open");
    }
  }, [isHomePage, persistPreferredState]);

  const closeSidebar = useCallback(() => {
    // Never close on home
    if (isHomePage) return;
    setSidebarState("closed");
    persistPreferredState("closed");
  }, [isHomePage, persistPreferredState]);

  // Prevent overscroll on mock pages
  useEffect(() => {
    if (!isMockView) return;

    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    const prevHtmlOverflow = htmlEl.style.overflow;
    const prevBodyOverflow = bodyEl.style.overflow;
    const prevHtmlOverscroll = (
      htmlEl.style as unknown as { overscrollBehavior?: string }
    ).overscrollBehavior;
    const prevBodyOverscroll = (
      bodyEl.style as unknown as { overscrollBehavior?: string }
    ).overscrollBehavior;

    htmlEl.style.overflow = "hidden";
    (
      htmlEl.style as unknown as { overscrollBehavior?: string }
    ).overscrollBehavior = "none";
    bodyEl.style.overflow = "hidden";
    (
      bodyEl.style as unknown as { overscrollBehavior?: string }
    ).overscrollBehavior = "none";

    return () => {
      htmlEl.style.overflow = prevHtmlOverflow;
      (
        htmlEl.style as unknown as { overscrollBehavior?: string }
      ).overscrollBehavior = prevHtmlOverscroll;
      bodyEl.style.overflow = prevBodyOverflow;
      (
        bodyEl.style as unknown as { overscrollBehavior?: string }
      ).overscrollBehavior = prevBodyOverscroll;
    };
  }, [isMockView]);

  // Mouse position tracking to close sidebar when leaving the area
  // Only applies to semi-open state, not fully open state
  useEffect(() => {
    if (sidebarState !== "semi-open") return;

    const handleMouseMove = (e: MouseEvent) => {
      // Only close from semi-open state when mouse leaves the area
      const sidebarAreaWidth = 400;

      if (e.clientX > sidebarAreaWidth + 50) {
        // Add 50px buffer
        closeSidebar();
      }
    };

    // Add mouse move listener to document
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [sidebarState, closeSidebar]);

  // Track previous pathname to detect navigation changes
  const prevPathnameRef = useRef<string>("");

  // Manage sidebar state per route
  useEffect(() => {
    const onHome = pathname === "/" || pathname === "";
    const onLesson = pathname.startsWith("/lessons/");

    if (!isMeasured) {
      return;
    }

    if (onHome) {
      setSelectedSubject(null);
      setSidebarState("open");
    } else if (prevPathnameRef.current !== pathname) {
      if (onLesson && isBelowSm) {
        closeSidebar();
      } else if (!onHome) {
        const preferred = getPreferredState();
        if (preferred) {
          setSidebarState(preferred);
        } else {
          setSidebarState("semi-open");
        }
      }
    }

    prevPathnameRef.current = pathname;
  }, [
    pathname,
    isMeasured,
    isBelowSm,
    getPreferredState,
    closeSidebar,
    getLastLesson,
    consumeIntentionalHomeVisit,
    router,
  ]);

  return (
    <MedlyMondaysProvider feature={initialMedlyMondaysFeature}>
    <SidebarContext.Provider
      value={{
        sidebarState,
        isSidebarOpen,
        toggleSidebar,
        openSidebar,
        semiOpenSidebar,
        closeSidebar,
        selectedSubject,
        setSelectedSubject,
        leftSidebarWidth,
        setLeftSidebarWidth,
        isManageAccountOpen,
        setIsManageAccountOpen,
      }}
    >
      <SaveManagerProvider>
      <div
        className={`flex flex-col h-dvh md:h-dvh ${
          isMockView ? "overflow-y-auto" : "overflow-hidden"
        } overscroll-none`}
      >
        {!hasActivePlan && <TrialPrompt subjectLegacyId={selectedSubject} />}
        <main
          className={`flex flex-col w-full flex-1 ${
            isMockView ? "overflow-y-auto" : "overflow-hidden"
          } bg-[#FBFBFF] relative`}
        >
          <div
            className={`flex-1 md:pt-0 ${
              isMockView ? "overflow-y-auto" : "overflow-auto"
            } ${sidebarState === "open" ? "pl-[0px]" : ""}`}
          >
            {children}
          </div>
          <MobileBottomNav />

          {/* Sidebar overlay limited to main area so it doesn't cover the trial prompt */}
          <div
            className={`absolute inset-0 overflow-hidden flex-row p-0 sm:p-2 z-[1200] pointer-events-none pt-0
              ${
                !hasActivePlan
                  ? sidebarState !== "open"
                    ? "sm:pt-16"
                    : "sm:pt-2"
                  : sidebarState !== "open"
                    ? "sm:pt-16"
                    : "sm:pt-2"
              }
                `}
          >
            {sidebarState === "open" && (
              <div
                className="absolute inset-0 pointer-events-auto"
                onClick={() => {
                  closeSidebar();
                }}
              />
            )}
            <Sidebar
              initialUserSubjects={initialUserSubjects}
              initialMocksData={initialMocksData}
            />
          </div>
        </main>
      </div>
      {/* Render modal at layout level so it persists when sidebar closes */}
      {isManageAccountOpen && (
        <ManageAccountModal
          isOpen={isManageAccountOpen}
          onClose={() => setIsManageAccountOpen(false)}
        />
      )}
      {/* Feature release announcement modal */}
      {activeFeature && (
        <FeatureReleaseModal
          isOpen={showFeatureModal}
          config={activeFeature}
          onClose={dismissFeatureModal}
          onCTA={() => {
            const lastSlide = activeFeature.slides[activeFeature.slides.length - 1];
            const action = lastSlide.ctaAction;

            if (action?.type === "navigate") {
              // Set learn mode before navigating so the page opens in learn mode
              if (activeFeature.dynamicUrl === "firstUnstartedMathsLesson") {
                try {
                  localStorage.setItem(
                    "lastLessonMode",
                    JSON.stringify({
                      mode: "learn-page",
                      timestamp: Date.now(),
                    })
                  );
                } catch {
                  // Ignore localStorage errors
                }
              }

              const url = featureResolvedUrl || action.url;
              if (url) {
                router.push(url);
              }
            }
            // For "dismiss" and "custom" actions, the modal just closes
          }}
        />
      )}
      {/* Medly Mondays promo popup */}
      <PromoPopup
        storageKey="medly_mondays_promo_dismissed"
        imageUrl="/assets/medly-mondays-promo.png"
        title="Free access every Monday!"
        description={(() => {
          const baseText = "Every Monday, we unlock premium features for free.";
          if (initialMedlyMondaysFeature === "textbook-view") {
            return (
              <>
                {baseText} This week: <span className="font-semibold">Textbook access for all subjects</span>.
              </>
            );
          }
          if (typeof initialMedlyMondaysFeature === "object" && "subjects" in initialMedlyMondaysFeature) {
            // Extract subject names from legacy IDs
            const subjectMap: Record<string, string> = {
              Bio: "Biology",
              Chem: "Chemistry",
              Phys: "Physics",
              Maths: "Maths",
            };
            const subjectNames = new Set<string>();
            for (const legacyId of initialMedlyMondaysFeature.subjects) {
              for (const [key, name] of Object.entries(subjectMap)) {
                if (legacyId.includes(key)) {
                  subjectNames.add(name);
                  break;
                }
              }
            }
            const subjects = Array.from(subjectNames);
            if (subjects.length > 0) {
              return (
                <>
                  {baseText} This week: <span className="font-semibold">{subjects.join(", ")}</span>.
                </>
              );
            }
            return (
              <>
                {baseText} This week: <span className="font-semibold">Selected premium subjects</span>.
              </>
            );
          }
          return baseText;
        })()}
        isVisible={!hasActivePlan && initialMedlyMondaysFeature !== "none"}
      />
      </SaveManagerProvider>
    </SidebarContext.Provider>
    </MedlyMondaysProvider>
  );
}
