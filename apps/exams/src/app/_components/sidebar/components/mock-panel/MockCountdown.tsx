"use client";

import { useState, useEffect } from "react";
import moment from "moment";
import { useMockDates } from "@/app/(protected)/mocks/_hooks/useMockDates";

const MockCountdown = ({ targetDate }: { targetDate?: string }) => {
  const { mocksEnd } = useMockDates();
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = moment().utc();
      const endDate = targetDate ? moment(targetDate) : mocksEnd;
      const diff = endDate.diff(now);

      if (diff > 0) {
        const duration = moment.duration(diff);
        setCountdown({
          days: Math.floor(duration.asDays()),
          hours: duration.hours(),
          minutes: duration.minutes(),
          seconds: duration.seconds(),
        });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div>
      <div className="text-black/40 text-[14px] font-rounded-bold">
        {countdown.days} : {countdown.hours.toString().padStart(2, "0")} :{" "}
        {countdown.minutes.toString().padStart(2, "0")} :{" "}
        {countdown.seconds.toString().padStart(2, "0")}
      </div>
    </div>
  );
};

export default MockCountdown;
