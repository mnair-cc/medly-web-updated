import { SessionType } from "@/app/(protected)/sessions/types";
import SessionStructure from "@/app/(protected)/sessions/components/SessionStructure";
import { fetchSessionData } from "./data/orchestrator";
import SessionMessageShell from "@/app/(protected)/sessions/components/SessionMessageShell";
import { isForbiddenError } from "@/app/(protected)/sessions/utils/errors";
import { redirect } from "next/navigation";
import { getMockDateInUTCAsync } from "@/app/(protected)/mocks/_utils/utils";
import { isActivePlan } from "@/app/_lib/utils/planUtils";
import { getCachedUser } from "@/app/_lib/server/getCachedUser";
import moment from "moment-timezone";

const PracticeNewPage = async ({
  params,
}: {
  params: Promise<{ id: string; paperId: string }>;
}) => {
  const { id: subjectId, paperId } = await params;

  // Check subscription status - papers require active plan
  const user = await getCachedUser();
  if (!isActivePlan(user?.subscription)) {
    redirect("/plan");
  }

  try {
    // Check if this is a mock paper
    const isMockPaper = paperId.toLowerCase().includes("mock");

    if (isMockPaper) {
      // Mock papers can only be done as regular papers if:
      // 1. User is premium (already checked above) AND
      // 2. Date is after results day
      const resultsDay = await getMockDateInUTCAsync("results_day");

      const now = moment().utc();
      const isAfterResultsDay = now.isAfter(resultsDay);

      if (!isAfterResultsDay) {
        throw new Error("Mock papers cannot be done as regular papers");
      }
    }

    // Validate paper ID prefix
    if (!paperId.startsWith("medlypaper") && !isMockPaper) {
      throw new Error("Invalid paper ID");
    }

    const sessionData = await fetchSessionData(subjectId, paperId);

    return (
      <div className="flex flex-col flex-1 overflow-hidden w-full h-full">
        <SessionStructure
          returnUrl="/"
          subjectId={subjectId}
          paperId={paperId}
          sessionType={SessionType.PaperSession}
          initialSessionData={sessionData}
        />
      </div>
    );
  } catch (error) {
    if (isForbiddenError(error)) {
      redirect("/forbidden-redirect");
    }
    return (
      <SessionMessageShell
        sessionType={SessionType.PaperSession}
        sessionTitle={"Paper"}
      />
    );
  }
};

export default PracticeNewPage;
