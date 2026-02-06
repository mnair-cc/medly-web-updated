import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { useMockDates } from "@/app/(protected)/mocks/_hooks/useMockDates";
import { WRAPPED_SEEN_KEY } from "@/app/(protected)/mocks/_constants/slides";

interface MocksBannerProps {
  isCompact?: boolean;
  onOpenMockPanel?: () => void;
  isRegisteredForMocks?: boolean;
}

const MocksBanner = ({
  isCompact = false,
  onOpenMockPanel,
  isRegisteredForMocks,
}: MocksBannerProps) => {
  const { track } = useTracking();
  const router = useRouter();

  // Get mock dates state
  const {
    isAfterResultsDay,
    isMocksPeriod,
    isAfterMocksEnd,
    isRegistrationOpen,
    mocksStart,
  } = useMockDates();

  // Derive states from hook values
  const isBeforeRegistrationOpens = !isRegistrationOpen;
  const isAfterMockStart = isMocksPeriod || isAfterMocksEnd;

  // Hide banner if after results day AND user has not registered
  const shouldHideBanner = isAfterResultsDay && !isRegisteredForMocks;

  const handleClick = () => {
    // Don't allow clicks if banner should be hidden
    if (shouldHideBanner) return;

    if (isAfterMockStart) {
      track("clicked_mock_panel_button_sidebar");

      // After results day, redirect to wrapped flow if user hasn't completed it
      if (isAfterResultsDay) {
        const hasSeenWrapped = localStorage.getItem(WRAPPED_SEEN_KEY);
        if (!hasSeenWrapped) {
          router.push("/mocks/insights");
          return;
        }
      }

      onOpenMockPanel?.();
    } else {
      track("clicked_mock_registration_button_sidebar");
    }
  };

  // Get the mock start date for display
  const displayMonth = mocksStart.format("MMM").toUpperCase();
  const displayDay = mocksStart.format("D");

  const content = (
    <div
      data-mocks-banner-root
      className="bg-[#F9F9FB] w-full rounded-lg p-4 hover:bg-[#F5F5FA] transition-colors"
    >
      <div
        className={`flex items-center ${
          isCompact ? "justify-center gap-0" : "gap-3"
        }`}
      >
        <div className="text-right flex-shrink-0 flex flex-col items-center justify-center">
          <div className="text-[8px] font-medium text-[#FF3B30]">
            {displayMonth}
          </div>
          <div className="text-2xl leading-none font-rounded-heavy text-black">
            {displayDay}
          </div>
        </div>
        <div className={`flex-1 min-w-0 ${isCompact ? "hidden" : ""}`}>
          <h3
            className={
              "font-rounded-bold text-sm text-black whitespace-nowrap truncate"
            }
          >
            Christmas Medly Mocks
          </h3>
          <p
            className={
              "text-xs text-black/60 leading-tight whitespace-nowrap truncate"
            }
          >
            {isAfterResultsDay
              ? "Results are out!"
              : isAfterMockStart
                ? "Take your Mocks"
                : isBeforeRegistrationOpens
                  ? "Register soon"
                  : "Register today"}
          </p>
        </div>
      </div>
    </div>
  );

  // Don't render anything if banner should be hidden
  if (shouldHideBanner) {
    return null;
  }

  if (isAfterMockStart) {
    return (
      <button
        onClick={handleClick}
        className="inline-block border-b border-[#F2F2F7] pb-4 w-full text-left"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href="/mocks/register"
      onClick={handleClick}
      className="inline-block border-b border-[#F2F2F7] pb-4 w-full"
    >
      {content}
    </Link>
  );
};

export default MocksBanner;
