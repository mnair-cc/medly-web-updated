"use client";

import TickCircleIcon from "@/app/_components/icons/TickCircleIcon";
import { useMockDates } from "../../../_hooks/useMockDates";

interface HowItWorksRedesignedProps {
  onButtonClick?: () => void;
  isRegistered?: boolean;
}

// Helper function to get ordinal suffix for day
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

export default function HowItWorksRedesigned({
  onButtonClick,
  isRegistered,
}: HowItWorksRedesignedProps) {
  const { registrationOpens, resultsDay } = useMockDates();

  const registrationInfo = registrationOpens.format("D MMM YYYY, HH:mm");

  const resultsInfo = (() => {
    const time = resultsDay.format("HH:mm");
    const day = resultsDay.format("D");
    const dayNumber = parseInt(day);
    const ordinalSuffix = getOrdinalSuffix(dayNumber);
    const month = resultsDay.format("MMMM");
    const year = resultsDay.format("YYYY");

    return {
      time,
      date: `${day}${ordinalSuffix} of ${month}, ${year}`,
    };
  })();
  return (
    <div className="flex w-full max-w-[960px] flex-col items-center gap-[40px]">
      <p className="font-rounded-bold w-full text-center text-[40px] leading-[54px] tracking-[-0.36px] text-neutral-950">
        How It Works
      </p>

      <div className="flex w-full shrink-0 flex-col items-start justify-center gap-[15px]">
        {/* Step 1 */}
        <div
          className={`relative w-full shrink-0 overflow-hidden rounded-[24px] bg-[#f4f9fd] ${isRegistered ? "opacity-30" : ""}`}
        >
          <div className="overflow-clip rounded-[inherit] size-full">
            <div className="flex w-full flex-col items-start gap-[8px] p-[24px] lg:h-[248px]">
              <p className="font-rounded-bold text-nowrap whitespace-pre text-center text-[14px] leading-[14px] text-black/60">
                Step 1
              </p>
              <p className="font-rounded-bold text-[28px] leading-[40px] text-neutral-950">
                Select your subjects
              </p>
              <p className="max-w-[320px] text-[15px] leading-[22.5px] text-black/60">
                Register for as many subjects you'd like to do a mock in.
                Registration opens{" "}
                <span className="font-semibold">{registrationInfo}</span>.
              </p>

              {/* Register subjects image */}
              <img
                src="/register_subjects.png"
                alt="Subject Selection"
                className="mt-4 w-full rounded-[16px] object-contain shadow-[0px_0px_15px_0px_rgba(0,0,0,0.1)] lg:absolute lg:left-[474px] lg:top-12 lg:mt-0 lg:w-[400px] lg:rounded-[24px]"
              />
            </div>
            {isRegistered && (
              <div className="absolute right-4 top-4">
                <TickCircleIcon className="size-8" />
              </div>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div className="relative w-full shrink-0 overflow-hidden rounded-[24px] bg-[#f4f9fd]">
          <div className="overflow-clip rounded-[inherit] size-full">
            <div className="flex w-full flex-col items-start gap-[8px] p-[24px] lg:h-[638px]">
              <p className="font-rounded-bold text-nowrap whitespace-pre text-center text-[14px] leading-[14px] text-black/60">
                Step 2
              </p>
              <p className="font-rounded-bold text-[28px] leading-[40px] text-neutral-950">
                Take your mocks
              </p>
              <p className="lg:max-w-[320px] text-[15px] leading-[22.5px] text-black/60">
                Each subject&apos;s papers will be available for attempt{" "}
                <span className="font-bold">
                  between 9:00am and 8:59am the following day.
                </span>
              </p>

              {/* Exam timetable card - responsive positioning */}
              <div className="mt-4 w-full flex flex-col items-center justify-end gap-[9.166px] overflow-clip rounded-[27.499px] bg-white pb-0 pt-[9.166px] px-0 shadow-[0px_0px_17.187px_0px_rgba(0,0,0,0.1)] lg:absolute lg:left-[477px] lg:top-[38.03px] lg:mt-0 lg:w-[393px]">
                {/* Biology */}
                <ExamDateItem month="DEC" day="27" subject="Biology" />
                {/* Chemistry */}
                <ExamDateItem month="DEC" day="28" subject="Chemistry" />
                {/* Physics */}
                <ExamDateItem month="DEC" day="29" subject="Physics" />
                {/* English Language */}
                <ExamDateItem month="DEC" day="30" subject="English Language" />
                {/* Mathematics */}
                <ExamDateItem month="DEC" day="31" subject="Mathematics" />
                {/* English Literature */}
                <ExamDateItem
                  month="JAN"
                  day="1"
                  subject="English Literature"
                  isLast
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="relative w-full shrink-0 overflow-hidden rounded-[24px] bg-[#f4f9fd]">
          <div className="overflow-clip rounded-[inherit] size-full">
            <div className="flex w-full flex-col items-start gap-[8px] p-[24px] lg:h-[341px]">
              <p className="font-rounded-bold text-nowrap whitespace-pre text-center text-[14px] leading-[14px] text-black/60">
                Step 3
              </p>
              <p className="font-rounded-bold text-[28px] leading-[40px] text-neutral-950">
                Get your results
              </p>
              <p className="max-w-[320px] text-[15px] leading-[22.5px] text-black/60">
                Results will be released at{" "}
                <span className="font-bold">{resultsInfo.time}</span> on the{" "}
                <span className="font-bold">{resultsInfo.date}.</span> You will
                receive a personalised, detailed breakdown of your performance.
              </p>

              {/* Results preview image */}
              <img
                src="/get-your-results.png"
                alt="Results Preview"
                className="mt-4 w-full rounded-[16px] object-contain shadow-[0px_0px_15px_0px_rgba(0,0,0,0.1)] lg:absolute lg:left-[474px] lg:top-12 lg:mt-0 lg:w-[400px] lg:rounded-[24px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExamDateItemProps {
  month: string;
  day: string;
  subject: string;
  isLast?: boolean;
}

function ExamDateItem({ month, day, subject, isLast }: ExamDateItemProps) {
  return (
    <div className="relative w-full shrink-0">
      {!isLast && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border-b border-[#f2f2f7]"
        />
      )}
      <div className="flex size-full flex-row items-center">
        <div className="flex w-full items-center gap-[4.583px] px-[18.332px] py-[9.166px] pb-[18.332px]">
          <div className="flex h-full flex-row items-center self-stretch">
            <div className="flex h-full w-[73.329px] flex-col items-start pl-0 pr-[18.332px] py-0 text-center">
              <p className="font-rounded-bold w-full text-[13.749px] leading-[13.749px] text-[#ff4b4c]">
                {month}
              </p>
              <p className="font-rounded-black w-full text-[32.082px] leading-[43.539px] text-black">
                {day}
              </p>
            </div>
          </div>
          <div className="flex min-h-px min-w-px grow basis-0 flex-col items-start justify-center gap-[4.583px]">
            <div className="flex flex-col justify-center leading-[0] text-nowrap text-[16.041px] text-black">
              <p className="font-rounded-bold leading-normal">{subject}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
