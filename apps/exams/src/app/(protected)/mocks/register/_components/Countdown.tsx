"use client";

import { useEffect, useState } from "react";
import { useMockDates } from "../../_hooks/useMockDates";

// Countdown Component
const Countdown = ({
  countDownTo,
  type = "light",
  size = "large",
}: {
  countDownTo:
    | "registration_opens"
    | "mocks_start"
    | "results_day"
    | "mocks_end";
  type: "dark" | "light";
  size: "small" | "medium" | "large";
}) => {
  const {
    registrationOpens,
    mocksStart,
    resultsDay,
    mocksEnd,
  } = useMockDates();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate =
      countDownTo === "registration_opens"
        ? registrationOpens.tz("Europe/London").toDate()
        : countDownTo === "mocks_start"
          ? mocksStart.tz("Europe/London").toDate()
          : countDownTo === "results_day"
            ? resultsDay.tz("Europe/London").toDate()
            : mocksEnd.tz("Europe/London").toDate();

    const target = targetDate.getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor(
            (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          ),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    // Update immediately then set interval
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    // Clean up interval
    return () => clearInterval(interval);
  }, [countDownTo]);

  // Function to format numbers with leading zero
  const formatNumber = (num: number): string => {
    return num < 10 ? `0${num}` : `${num}`;
  };

  return (
    <div
      className={`w-full max-w-full overflow-x-hidden flex flex-col items-center gap-4 ${
        size === "small" || size === "medium" ? "py-0" : "py-20"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        {size !== "small" && size !== "medium" && (
          <>
            {countDownTo === "registration_opens" ? (
              <>
                <div className="font-rounded-bold text-[36px] md:text-[48px] leading-[40px] md:leading-[56px] text-center text-black tracking-[-0.02em]">
                  Registration opens{" "}
                  {registrationOpens.tz("Europe/London").format("MMMM D")}
                </div>

                <p className="text-base text-center text-[rgba(0,0,0,0.5)]">
                  Only 1000 spots available. Register early to secure your
                  place.
                </p>
              </>
            ) : (
              <div
                className={`font-rounded-bold text-[32px] leading-[36px] md:leading-[56px] text-center ${
                  type === "dark" ? "text-white" : "text-black"
                } tracking-[-0.02em]`}
              >
                Countdown to Exam
              </div>
            )}
          </>
        )}

        <div
          className={`flex flex-row flex-wrap sm:flex-nowrap justify-center items-center w-full ${
            size === "small" ? "gap-1 mt-2" : size === "medium" ? "gap-2 mt-2" : "gap-2 sm:gap-3 mt-3 sm:mt-4"
          }`}
        >
          <div className="flex flex-col items-center">
            <div
              className={`rounded-lg ${
                type === "dark"
                  ? "bg-gradient-to-br from-[#111] to-[#111]"
                  : size === "small" || size === "medium"
                  ? "bg-white/20"
                  : "bg-[#FF7603]"
              } ${
                size === "small"
                  ? "py-3 px-3"
                  : size === "medium"
                  ? "py-5 px-5"
                  : "py-3 px-3 sm:py-6 sm:px-5 md:py-8 md:px-6"
              }`}
            >
              <span
                className={`font-mono font-bold text-white ${
                  size === "small" ? "text-lg" : size === "medium" ? "text-3xl" : "text-3xl sm:text-5xl"
                }`}
              >
                {formatNumber(timeLeft.days)}
              </span>
            </div>
            <span
              className={`mt-1 ${
                type === "light" && (size === "small" || size === "medium")
                  ? "font-rounded-heavy text-[14px] uppercase text-white"
                  : type === "dark"
                  ? "text-[rgba(255,255,255,0.7)]"
                  : "text-[rgba(0,0,0,0.7)]"
              } ${
                (size === "small" || size === "medium") && type === "light"
                  ? ""
                  : size === "small"
                  ? "text-xs"
                  : "text-sm mt-2"
              }`}
            >
              {type === "light" && (size === "small" || size === "medium") ? "D" : "Days"}
            </span>
          </div>

          <div
            className={`font-light ${
              type === "light" && (size === "small" || size === "medium")
                ? "text-[rgba(255,255,255,0.5)]"
                : type === "dark"
                ? "text-[rgba(255,255,255,0.5)]"
                : "text-[rgba(0,0,0,0.5)]"
            } ${
              size === "small"
                ? "text-base mb-2"
                : size === "medium"
                ? "text-2xl mb-3"
                : "text-3xl sm:text-5xl mb-3 sm:mb-5 md:mb-8"
            }`}
          >
            :
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`rounded-lg ${
                type === "dark"
                  ? "bg-gradient-to-br from-[#111] to-[#111]"
                  : size === "small" || size === "medium"
                  ? "bg-white/20"
                  : "bg-[#FF7603]"
              } ${
                size === "small"
                  ? "py-3 px-3"
                  : size === "medium"
                  ? "py-5 px-5"
                  : "py-3 px-3 sm:py-6 sm:px-5 md:py-8 md:px-6"
              }`}
            >
              <span
                className={`font-mono font-bold text-white ${
                  size === "small" ? "text-lg" : size === "medium" ? "text-3xl" : "text-3xl sm:text-5xl"
                }`}
              >
                {formatNumber(timeLeft.hours)}
              </span>
            </div>
            <span
              className={`mt-1 ${
                type === "light" && (size === "small" || size === "medium")
                  ? "font-rounded-heavy text-[14px] uppercase text-white"
                  : type === "dark"
                  ? "text-[rgba(255,255,255,0.7)]"
                  : "text-[rgba(0,0,0,0.7)]"
              } ${
                (size === "small" || size === "medium") && type === "light"
                  ? ""
                  : size === "small"
                  ? "text-xs"
                  : "text-sm mt-2"
              }`}
            >
              {type === "light" && (size === "small" || size === "medium") ? "H" : "Hours"}
            </span>
          </div>

          <div
            className={`font-light ${
              type === "light" && (size === "small" || size === "medium")
                ? "text-[rgba(255,255,255,0.5)]"
                : type === "dark"
                ? "text-[rgba(255,255,255,0.5)]"
                : "text-[rgba(0,0,0,0.5)]"
            } ${
              size === "small"
                ? "text-base mb-2"
                : size === "medium"
                ? "text-2xl mb-3"
                : "text-3xl sm:text-5xl mb-3 sm:mb-5 md:mb-8"
            }`}
          >
            :
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`rounded-lg ${
                type === "dark"
                  ? "bg-gradient-to-br from-[#111] to-[#111]"
                  : size === "small" || size === "medium"
                  ? "bg-white/20"
                  : "bg-[#FF7603]"
              } ${
                size === "small"
                  ? "py-3 px-3"
                  : size === "medium"
                  ? "py-5 px-5"
                  : "py-3 px-3 sm:py-6 sm:px-5 md:py-8 md:px-6"
              }`}
            >
              <span
                className={`font-mono font-bold text-white ${
                  size === "small" ? "text-lg" : size === "medium" ? "text-3xl" : "text-3xl sm:text-5xl"
                }`}
              >
                {formatNumber(timeLeft.minutes)}
              </span>
            </div>
            <span
              className={`mt-1 ${
                type === "light" && (size === "small" || size === "medium")
                  ? "font-rounded-heavy text-[14px] uppercase text-white"
                  : type === "dark"
                  ? "text-[rgba(255,255,255,0.7)]"
                  : "text-[rgba(0,0,0,0.7)]"
              } ${
                (size === "small" || size === "medium") && type === "light"
                  ? ""
                  : size === "small"
                  ? "text-xs"
                  : "text-sm mt-2"
              }`}
            >
              {type === "light" && (size === "small" || size === "medium") ? "M" : "Minutes"}
            </span>
          </div>

          <div
            className={`font-light ${
              type === "light" && (size === "small" || size === "medium")
                ? "text-[rgba(255,255,255,0.5)]"
                : type === "dark"
                ? "text-[rgba(255,255,255,0.5)]"
                : "text-[rgba(0,0,0,0.5)]"
            } ${
              size === "small"
                ? "text-base mb-2"
                : size === "medium"
                ? "text-2xl mb-3"
                : "text-3xl sm:text-5xl mb-3 sm:mb-5 md:mb-8"
            }`}
          >
            :
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`rounded-lg ${
                type === "dark"
                  ? "bg-gradient-to-br from-[#111] to-[#111]"
                  : size === "small" || size === "medium"
                  ? "bg-white/20"
                  : "bg-[#FF7603]"
              } ${
                size === "small"
                  ? "py-3 px-3"
                  : size === "medium"
                  ? "py-5 px-5"
                  : "py-3 px-3 sm:py-6 sm:px-5 md:py-8 md:px-6"
              }`}
            >
              <span
                className={`font-mono font-bold text-white ${
                  size === "small" ? "text-lg" : size === "medium" ? "text-3xl" : "text-3xl sm:text-5xl"
                }`}
              >
                {formatNumber(timeLeft.seconds)}
              </span>
            </div>
            <span
              className={`mt-1 ${
                type === "light" && (size === "small" || size === "medium")
                  ? "font-rounded-heavy text-[14px] uppercase text-white"
                  : type === "dark"
                  ? "text-[rgba(255,255,255,0.7)]"
                  : "text-[rgba(0,0,0,0.7)]"
              } ${
                (size === "small" || size === "medium") && type === "light"
                  ? ""
                  : size === "small"
                  ? "text-xs"
                  : "text-sm mt-2"
              }`}
            >
              {type === "light" && (size === "small" || size === "medium") ? "S" : "Seconds"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Countdown;
