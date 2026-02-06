import { SessionType } from "@/app/(protected)/sessions/types";
import SessionStructure from "@/app/(protected)/sessions/components/SessionStructure";
import { fetchSessionData } from "./data/orchestrator";
import SessionMessageShell from "@/app/(protected)/sessions/components/SessionMessageShell";
import {
  getMockDateInUTCAsync,
  getMockSubjectDateAsync,
} from "@/app/(protected)/mocks/_utils/utils";
import { deconstructSubjectLegacyId } from "@/app/_lib/utils/utils";
import moment from "moment-timezone";

const MockSessionPage = async ({
  params,
}: {
  params: Promise<{ id: string; paperId: string }>;
}) => {
  const { id: subjectId, paperId } = await params;

  // Check key dates (PostHog scenario is handled internally by these async functions)
  const resultsDay = await getMockDateInUTCAsync("results_day");
  const mocksEnd = await getMockDateInUTCAsync("mocks_end");

  const now = moment().utc();
  const isAfterResultsDay = now.isAfter(resultsDay);
  const isAfterMocksEnd = now.isAfter(mocksEnd);
  const isBeforeResultsDay = now.isBefore(resultsDay);

  // After results day: all mocks are accessible for review
  if (!isAfterResultsDay) {
    // Check if we're after mocks end but before results day
    if (isAfterMocksEnd && isBeforeResultsDay) {
      const formattedDate = resultsDay.format("MMMM Do");
      const formattedTime = resultsDay.format("ha");
      return (
        <SessionMessageShell
          sessionType={SessionType.MockSession}
          sessionTitle={"Mock"}
          title="Results Coming Soon! 🎉"
          line1="Your mock results will be released on Results Day."
          line2={`Check back on ${formattedDate} at ${formattedTime} to see your results and insights!`}
        />
      );
    }

    // Check subject-specific date during mocks period
    // Each mock is available for 24 hours: from 9am to 8:59:59am the next day
    const { subjectTitle } = deconstructSubjectLegacyId(subjectId);
    const subjectStart = await getMockSubjectDateAsync(subjectTitle);
    const subjectEnd = subjectStart
      .clone()
      .add(24, "hours")
      .subtract(1, "second");
    const nowLondon = moment.tz("Europe/London");

    if (nowLondon.isBefore(subjectStart)) {
      const formattedDate = subjectStart.format("dddd, D MMMM [at] h:mma");
      return (
        <SessionMessageShell
          sessionType={SessionType.MockSession}
          sessionTitle={"Mock"}
          title="Not Available Yet"
          line1={`This mock is scheduled for ${formattedDate}.`}
          line2="Please come back at the scheduled time to take this exam."
        />
      );
    }

    if (nowLondon.isAfter(subjectEnd)) {
      return (
        <SessionMessageShell
          sessionType={SessionType.MockSession}
          sessionTitle={"Mock"}
          title="This Mock Has Closed"
          line1="The scheduled time for this mock has passed."
          line2="Your results will be available on Results Day."
        />
      );
    }
  }

  try {
    // Validate that paperId contains "mock" (handles medlymock..., xmas_mock_..., etc.)
    if (!paperId.includes("mock")) {
      throw new Error("Invalid paper ID");
    }

    // Validate that paperId matches the subject by checking it contains the subjectId
    if (!paperId.includes(subjectId)) {
      throw new Error("Paper ID does not match subject");
    }

    const sessionData = await fetchSessionData(subjectId, paperId);

    return (
      <div className="flex flex-col flex-1 overflow-y-auto w-full h-full">
        <SessionStructure
          returnUrl="/"
          subjectId={subjectId}
          paperId={paperId}
          sessionType={SessionType.MockSession}
          initialSessionData={sessionData}
        />
      </div>
    );
  } catch {
    return (
      <SessionMessageShell
        sessionType={SessionType.MockSession}
        sessionTitle={"Mock"}
      />
    );
  }
};

export default MockSessionPage;
