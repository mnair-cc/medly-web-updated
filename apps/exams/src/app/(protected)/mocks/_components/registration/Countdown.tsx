import { useEffect, useState } from "react";

// Countdown Component
const Countdown = ({
  targetDate,
  type = "light",
  title = "Countdown to First Exam",
  showTitle = true,
}: {
  targetDate: Date;
  type: "dark" | "light";
  title?: string;
  showTitle?: boolean;
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
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
  }, [targetDate]);

  // Function to format numbers with leading zero
  const formatNumber = (num: number): string => {
    return num < 10 ? `0${num}` : `${num}`;
  };

  return (
    <div className={`${showTitle ? "mt-10" : ""}`}>
      <div
        className={`font-heading text-[24px] md:text-[32px] leading-[30px] md:leading-[38px] text-center ${type === "dark" ? "text-white" : "text-black"} tracking-[-0.02em]`}
      >
        {title}
      </div>
      <div className={`${showTitle ? "mt-6" : ""}`}>
        <div className="flex flex-row justify-center items-center gap-3 w-full">
          <div className="flex flex-col items-center">
            <div
              className={`bg-gradient-to-br py-7 px-5 rounded-lg ${type === "dark" ? "from-[#111] to-[#111] text-white" : "bg-[#4549F3] text-white"}`}
            >
              <span className="text-4xl sm:text-5xl font-mono">
                {formatNumber(timeLeft.days)}
              </span>
            </div>
            <span
              className={`text-sm mt-2 ${type === "dark" ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.7)]"}`}
            >
              Days
            </span>
          </div>

          <div
            className={`text-2xl sm:text-3xl font-light ${type === "dark" ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"} mb-7`}
          >
            :
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`bg-gradient-to-br py-7 px-5 rounded-lg ${type === "dark" ? "from-[#111] to-[#111] text-white" : "bg-[#4549F3] text-white"}`}
            >
              <span className="text-4xl sm:text-5xl font-mono">
                {formatNumber(timeLeft.hours)}
              </span>
            </div>
            <span
              className={`text-sm mt-2 ${type === "dark" ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.7)]"}`}
            >
              Hours
            </span>
          </div>

          <div
            className={`text-2xl sm:text-3xl font-light ${type === "dark" ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"} mb-7`}
          >
            :
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`bg-gradient-to-br py-7 px-5 rounded-lg ${type === "dark" ? "from-[#111] to-[#111] text-white" : "bg-[#4549F3] text-white"}`}
            >
              <span className="text-4xl sm:text-5xl font-mono">
                {formatNumber(timeLeft.minutes)}
              </span>
            </div>
            <span
              className={`text-sm mt-2 ${type === "dark" ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.7)]"}`}
            >
              Minutes
            </span>
          </div>

          <div
            className={`text-2xl sm:text-3xl font-light ${type === "dark" ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"} mb-7`}
          >
            :
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`bg-gradient-to-br py-7 px-5 rounded-lg ${type === "dark" ? "from-[#111] to-[#111] text-white" : "bg-[#4549F3] text-white"}`}
            >
              <span className="text-4xl sm:text-5xl font-mono">
                {formatNumber(timeLeft.seconds)}
              </span>
            </div>
            <span
              className={`text-sm mt-2 ${type === "dark" ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.7)]"}`}
            >
              Seconds
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Countdown;
