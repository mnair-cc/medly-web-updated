"use client";

import { useMockDates } from "../../_hooks/useMockDates";

const HowMedlyMocksWork = () => {
  const { mocksStart, mocksEnd, resultsDay: resultsDayDate } = useMockDates();

  const startDay = mocksStart.format("D");
  const startMonth = mocksStart.format("MMMM");
  const startTime = mocksStart.format("ha"); // e.g., "12am" or "4pm"

  const endDay = mocksEnd.format("D");
  const dateRange = `${startDay}-${endDay} ${startMonth}`;

  const resultsDay = resultsDayDate.format("D MMMM");

  return (
    <div className="w-full py-10 flex flex-col items-center gap-2 mt-8">
      <div className="font-rounded-bold text-[32px] md:text-[38px] leading-[36px] md:leading-[48px] text-center text-black tracking-[-0.02em] mb-5">
        How Medly Mocks Work
      </div>

      <div className="text-xl text-center text-[rgba(0,0,0,0.5)] max-w-2xl px-8">
        <ol className="list-decimal list-inside space-y-5 mx-auto text-center">
          <li>
            All papers for each subject (e.g. Paper 1 and Paper 2) will be
            released simultaneously at {startTime} on {startDay} {startMonth}
          </li>
          <li>You can complete all papers at any time between {dateRange}</li>
          <li>
            Exams are timed, with additional grace periods available if you
            experience internet connectivity issues
          </li>
          <li>All papers must be completed directly on the Medly platform</li>
          <li>Each paper can only be attempted once</li>
          <li>Papers will be marked by Medly&apos;s AI Examiner</li>
          <li>
            Results will be released on {resultsDay}, when you&apos;ll gain
            access to your marked papers with personalised feedback and
            explanations
          </li>
        </ol>
      </div>
    </div>
  );
};

export default HowMedlyMocksWork;
