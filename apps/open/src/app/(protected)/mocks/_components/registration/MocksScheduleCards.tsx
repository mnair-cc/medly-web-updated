"use client";

import { useMockDates } from "../../_hooks/useMockDates";

const MocksScheduleCards = () => {
  const {
    mocksStart: mocksStartUTC,
    mocksEnd: mocksEndUTC,
    resultsDay,
  } = useMockDates();
  const mocksStart = mocksStartUTC.tz("Europe/London");
  const mocksEnd = mocksEndUTC.tz("Europe/London");
  const sameMonthAndYear =
    mocksStart.format("MMM YYYY") === mocksEnd.format("MMM YYYY");
  const rangeTop = sameMonthAndYear
    ? `${mocksStart.format("D")}–${mocksEnd.format("D")}`
    : `${mocksStart.format("D MMM")}`;
  const rangeBottom = sameMonthAndYear
    ? `${mocksStart.format("MMM")}`
    : `${mocksEnd.format("D MMM")}`;

  // Format the description text
  const startTime = mocksStart.format("ha");
  const startDate = mocksStart.format("Do MMMM");
  const endTime = mocksEnd.format("h:mma");
  const endDate = mocksEnd.format("Do MMMM");

  return (
    <div className="space-y-2 pt-20 max-w-6xl mx-auto">
      <div className="font-rounded-bold text-[32px] md:text-[38px] leading-[36px] md:leading-[48px] text-center text-black tracking-[-0.02em]">
        Medly Mocks Schedule
      </div>

      <p className="text-base text-center text-[rgba(0,0,0,0.5)] pb-10">
        All papers will be available between {startTime} on {startDate} and{" "}
        {endTime} on {endDate}.
      </p>

      <div className="bg-white rounded-xl overflow-hidden shadow-[0_4px_8px_rgba(0,0,0,0.08),0_0_1px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.1),0_0_1px_rgba(0,0,0,0.15)] transition-shadow duration-300">
        <div className="flex">
          <div className="w-24 h-24 bg-gradient-to-br from-[#FF7603] to-[#FF7603] text-white flex flex-col items-center justify-center">
            <span className="text-2xl font-rounded-heavy text-center leading-tight">
              {rangeTop}
            </span>
            <span className="text-base -mt-1">{rangeBottom}</span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-center">
            <h3 className="text-lg font-rounded-bold text-black">
              Christmas Medly Mocks Window
            </h3>
            <p className="text-sm text-[rgba(0,0,0,0.5)]">
              Opens {mocksStart.format("h:mma")} on {mocksStart.format("MMMM D")} and ends {mocksEnd.format("h:mma")} on{" "}
              {mocksEnd.format("MMMM D")}.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-[0_4px_8px_rgba(0,0,0,0.08),0_0_1px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.1),0_0_1px_rgba(0,0,0,0.15)] transition-shadow duration-300">
        <div className="flex">
          <div className="w-24 h-24 bg-gradient-to-br from-[#FF9292] to-[#4549F3] text-white flex flex-col items-center justify-center">
            <span className="text-5xl font-rounded-heavy">
              {resultsDay.tz("Europe/London").format("D")}
            </span>
            <span className="text-base -mt-1">
              {resultsDay.tz("Europe/London").format("MMM")}
            </span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-center">
            <h3 className="text-lg font-rounded-bold text-black">
              Medly Mocks Results Day
            </h3>
            <p className="text-sm text-[rgba(0,0,0,0.5)]">
              Predicted grades and exam report released for all subjects at 6pm.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MocksScheduleCards;
