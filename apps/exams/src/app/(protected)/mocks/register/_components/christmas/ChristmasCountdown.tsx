"use client";

import { useEffect, useState } from "react";
import { useMockDates } from "../../../_hooks/useMockDates";

const ChristmasCountdown = () => {
  const { mocksStart } = useMockDates();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const targetDate = mocksStart.tz("Europe/London").toDate();

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
        setHasStarted(false);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setHasStarted(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    return num < 10 ? `0${num}` : `${num}`;
  };

  // Hide countdown if mocks have started
  if (hasStarted) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 py-0">
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-row flex-wrap sm:flex-nowrap justify-center items-center w-full gap-1 mt-2">
          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-white/20 py-3 px-3">
              <span className="font-mono font-bold text-white text-lg">
                {formatNumber(timeLeft.days)}
              </span>
            </div>
            <span className="mt-1 font-rounded-heavy text-[12px] uppercase text-white">
              D
            </span>
          </div>

          <div className="font-light text-[rgba(255,255,255,0.5)] text-base mb-2">
            :
          </div>

          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-white/20 py-3 px-3">
              <span className="font-mono font-bold text-white text-lg">
                {formatNumber(timeLeft.hours)}
              </span>
            </div>
            <span className="mt-1 font-rounded-heavy text-[12px] uppercase text-white">
              H
            </span>
          </div>

          <div className="font-light text-[rgba(255,255,255,0.5)] text-base mb-2">
            :
          </div>

          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-white/20 py-3 px-3">
              <span className="font-mono font-bold text-white text-lg">
                {formatNumber(timeLeft.minutes)}
              </span>
            </div>
            <span className="mt-1 font-rounded-heavy text-[12px] uppercase text-white">
              M
            </span>
          </div>

          <div className="font-light text-[rgba(255,255,255,0.5)] text-base mb-2">
            :
          </div>

          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-white/20 py-3 px-3">
              <span className="font-mono font-bold text-white text-lg">
                {formatNumber(timeLeft.seconds)}
              </span>
            </div>
            <span className="mt-1 font-rounded-heavy text-[12px] uppercase text-white">
              S
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChristmasCountdown;
