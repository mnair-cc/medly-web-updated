"use client";

import SnowfallEffect from "./SnowfallEffect";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { WAITLIST_THRESHOLD } from "../../../_utils/utils";
import { useMockDates } from "../../../_hooks/useMockDates";
import Countdown from "../Countdown";

interface RedesignedHeroSectionProps {
  onClick: () => void;
  isRegistrationOpen: boolean;
}

export default function RedesignedHeroSection({
  onClick,
  isRegistrationOpen,
}: RedesignedHeroSectionProps) {
  const router = useRouter();
  const { mocksStart, mocksEnd, registrationOpens } = useMockDates();

  const dateRange = (() => {
    const startDay = mocksStart.format("D");
    const startMonth = mocksStart.format("MMM");
    const startYear = mocksStart.format("YYYY");
    const endDay = mocksEnd.format("D");
    const endMonth = mocksEnd.format("MMM");
    const endYear = mocksEnd.format("YYYY");

    // Same month and year: "22-30 Dec 2025"
    if (startMonth === endMonth && startYear === endYear) {
      return `${startDay}-${endDay} ${endMonth} ${endYear}`;
    }

    // Different months, same year: "27 Dec - 2 Jan 2025"
    if (startMonth !== endMonth && startYear === endYear) {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`;
    }

    // Different years: "27 Dec 2025 - 2 Jan 2026"
    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
  })();

  const registrationDate = registrationOpens.format("D MMM YYYY, HH:mm");

  return (
    <div className="relative w-full shrink-0 bg-gradient-to-b from-[#1D9AEE] from-20% via-[#B2E0FF] via-80% to-white">
      {/* Content */}
      <div className="relative flex size-full flex-col items-center justify-center">
        {/* Back button - absolutely positioned */}
        <div className="absolute left-6 top-[40px] z-20 sm:left-8 lg:left-[94px]">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white font-medium"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="relative flex w-full flex-col items-center justify-center gap-[40px] px-[94px] pb-[200px] pt-[40px]">
          {/* Snowfall */}
          <div className="absolute inset-0 z-0">
            <SnowfallEffect />
          </div>

          {/* Main content */}
          <div className="relative z-10 mt-[60px] flex flex-col items-center">
            {/* Logo */}
            <div className="relative mb-4 inline-grid place-items-start leading-[0]">
              <p className="font-rounded-bold ml-[62.984px] mt-[0.968px] h-[64px] translate-x-[-50%] text-center text-[32px] leading-[61.6px] tracking-[-1.12px] text-white">
                medly
              </p>
              <div className="absolute left-[8px] top-[5px] flex size-[44px] -rotate-[10deg] items-center justify-center">
                <img
                  src="/santa-logo.png"
                  alt="Medly Logo"
                  className="size-[44px] object-contain"
                />
              </div>
            </div>

            {/* Title */}
            <div className="font-rounded-black mb-6 text-center text-[65px] md:text-[80px] leading-[60px] md:leading-[72px] tracking-[-1.12px] text-white [text-shadow:rgba(0,0,0,0.15)_0px_0px_15px]">
              <p>Christmas</p>
              <p>Mocks</p>
            </div>

            {/* Date */}
            <p className="font-rounded-black mb-6 text-center text-[20px] leading-[28.5px] text-white [text-shadow:rgba(0,0,0,0.25)_0px_0px_15px]">
              {dateRange}
            </p>

            {/* Description */}
            <p className="mb-6 h-[64px] w-[429px] text-center text-[16px] font-medium leading-[24px] text-white/90 [text-shadow:rgba(0,0,0,0.08)_0px_0px_15px]">
              Practice under real GCSE or A Level exam conditions with students
              nationwide. Free. Only {WAITLIST_THRESHOLD} spaces available.
            </p>

            {/* CTA Section */}
            <div className="flex min-h-[120px] w-[600px] flex-col items-center justify-end gap-[12px]">
              {isRegistrationOpen ? (
                <>
                  {/* Button */}
                  <button
                    onClick={onClick}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "translateY(2px)";
                      e.currentTarget.style.borderBottomWidth = "1px";
                      e.currentTarget.style.marginBottom = "3px";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderBottomWidth = "4px";
                      e.currentTarget.style.marginBottom = "0px";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderBottomWidth = "4px";
                      e.currentTarget.style.marginBottom = "0px";
                    }}
                    onTouchStart={(e) => {
                      e.currentTarget.style.transform = "translateY(2px)";
                      e.currentTarget.style.borderBottomWidth = "1px";
                      e.currentTarget.style.marginBottom = "3px";
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderBottomWidth = "4px";
                      e.currentTarget.style.marginBottom = "0px";
                    }}
                    className="relative flex h-[72px] w-[280px] items-center justify-center gap-[8px] overflow-visible rounded-[16px] border border-[#1CA4FF] bg-[#05B0FF] px-4 py-4 text-center text-[20px] font-rounded-bold leading-[24px] text-white transition-all duration-100 hover:border-[#32ADFF] hover:bg-[#1EB8FF]"
                    style={{
                      borderBottomWidth: "4px",
                      marginBottom: "0px",
                    }}
                  >
                    {/* Snow decoration image */}
                    <img
                      src="/Button-snow.png"
                      alt=""
                      className="pointer-events-none absolute left-0 top-0 h-auto w-[150px]"
                      style={{
                        transform: "translate(-8px, -22px)",
                      }}
                    />

                    <span className="relative z-10">Secure my place</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Caption */}
                  <p className="min-w-full text-center text-[15px] font-medium leading-[22.5px] text-white [text-shadow:rgba(0,0,0,0.1)_0px_0px_12px]">
                    Registration opens{" "}
                    <span className="font-bold">{registrationDate}</span>
                  </p>
                  {/* Countdown when registration is closed */}
                  <div className="w-full">
                    <Countdown
                      countDownTo="registration_opens"
                      type="light"
                      size="medium"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Decorative snowflakes */}
          <div className="pointer-events-none absolute right-[100px] top-[148px] z-0 -rotate-[20.818deg]">
            <p className="text-center text-[112px] leading-[60px] tracking-[-1.12px] text-white/60 blur-[2px]">
              ❄️
            </p>
          </div>
          <div className="pointer-events-none absolute left-[100px] top-[-90px] z-0 -rotate-[36.52deg]">
            <p className="text-center text-[200px] leading-[60px] tracking-[-1.12px] text-white/60 blur-sm">
              ❄️
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
