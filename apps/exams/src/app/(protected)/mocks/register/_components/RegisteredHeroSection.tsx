"use client";

import SnowfallEffect from "./christmas/SnowfallEffect";
import Countdown from "./Countdown";
import ChristmasCountdown from "./christmas/ChristmasCountdown";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import TickIcon from "@/app/_components/icons/TickIcon";
import { MockRegistrationData } from "@/app/types/types";
import { useMockDates } from "../../_hooks/useMockDates";

interface RegisteredHeroSectionProps {
  isUserOnWaitlist?: boolean;
  data: MockRegistrationData; // Add data prop
}

export default function RegisteredHeroSection({
  isUserOnWaitlist,
  data,
}: RegisteredHeroSectionProps) {
  const router = useRouter();
  const [isCopyingCode, setIsCopyingCode] = useState(false);
  const [referralLink, setReferralLink] = useState("");
  const { mocksStart, mocksEnd } = useMockDates();

  useEffect(() => {
    if (data.referralCode && typeof window !== "undefined") {
      setReferralLink(
        `${window.location.origin}/mocks/register?ref=${data.referralCode}`
      );
    }
  }, [data.referralCode]);

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

  const handleCopyReferralCode = async () => {
    if (isCopyingCode || !data.referralCode) return;

    setIsCopyingCode(true);
    try {
      await navigator.clipboard.writeText(data.referralCode);
      toast.success("Referral code copied!", {
        description: "Share this code with your friends to skip the waitlist.",
      });
    } catch (error) {
      console.error("Failed to copy referral code:", error);
      toast.error("Failed to copy referral code. Please try again.");
    } finally {
      setTimeout(() => setIsCopyingCode(false), 1000);
    }
  };

  return (
    <div className="relative w-full shrink-0 bg-gradient-to-b from-[#1D9AEE] from-20% via-[#B2E0FF] via-80% to-white">
      {/* Content */}
      <div className="relative flex size-full flex-col items-center justify-center">
        <div className="relative flex w-full flex-col items-center justify-center gap-[40px] px-[94px] pb-[288px] pt-[40px]">
          {/* Snowfall */}
          <div className="absolute inset-0 z-0">
            <SnowfallEffect />
          </div>

          {/* Back button */}
          <div className="relative z-10 w-full px-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white font-medium"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center">
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
            <div className="font-rounded-black mb-6 text-center text-[64px] leading-[60px] tracking-[-1.12px] text-white [text-shadow:rgba(0,0,0,0.15)_0px_0px_15px]">
              <p>
                {isUserOnWaitlist
                  ? "You're on the waitlist for the"
                  : "You're registered for the"}
              </p>
              <p>Christmas Mocks!</p>
            </div>

            {/* Date */}
            <p className="font-rounded-black mb-6 text-center text-[20px] leading-[28.5px] text-white [text-shadow:rgba(0,0,0,0.25)_0px_0px_15px]">
              {dateRange}
            </p>

            {isUserOnWaitlist ? (
              <div className="mt-6 w-full max-w-md">
                <p className="text-base text-center text-white font-medium mb-3">
                  Share with 3 friends to skip the waitlist:
                </p>
                {/* Referral Code Card */}
                <div className="bg-white/20 rounded-[16px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-white/80 font-medium mb-1 select-none">
                        Your referral code
                      </p>
                      <p className="text-2xl font-rounded-heavy text-white tracking-[0.08em] select-all">
                        {data.referralCode}
                      </p>
                    </div>
                    <button
                      onClick={handleCopyReferralCode}
                      disabled={isCopyingCode}
                      className={`flex items-center justify-center w-12 h-12 rounded-[12px] transition-all duration-200 ${
                        isCopyingCode
                          ? "bg-[#7CC500] text-white"
                          : "bg-[white]/30 hover:bg-[#FF7603] text-white"
                      }`}
                    >
                      {isCopyingCode ? (
                        <TickIcon fill="#ffffff" />
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M13.5 3H7.5C6.67 3 6 3.67 6 4.5v9c0 .83.67 1.5 1.5 1.5h6c.83 0 1.5-.67 1.5-1.5v-9C15 3.67 14.33 3 13.5 3zm0 10.5h-6v-9h6v9zM11.5 1H5.5C4.67 1 4 1.67 4 2.5V12h1.5V2.5h6V1z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <ChristmasCountdown />
            )}
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
