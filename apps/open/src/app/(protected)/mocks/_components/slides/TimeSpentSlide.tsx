import { motion, useAnimation } from "framer-motion";
import { useEffect, useState, useRef } from "react";

const TimeSpentSlide = ({
  timeSpentInMinutes,
}: {
  timeSpentInMinutes?: number;
}) => {
  const [displayHours, setDisplayHours] = useState(0);
  const [displayMinutes, setDisplayMinutes] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const controls = useAnimation();
  const isMounted = useRef(true);
  const hours = timeSpentInMinutes ? Math.floor(timeSpentInMinutes / 60) : 0;
  const minutes = timeSpentInMinutes ? timeSpentInMinutes % 60 : 0;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!timeSpentInMinutes) return;

    const animationTimer = setTimeout(() => {
      if (!isMounted.current) return;
      setIsVisible(true);
      animateNumbers();
    }, 700);

    return () => {
      clearTimeout(animationTimer);
    };
  }, [timeSpentInMinutes]);

  const animateNumbers = () => {
    const duration = 3;
    const steps = 30;
    const totalSteps = duration * steps;
    let currentStep = 0;
    let currentHour = 0;
    let currentMinute = 0;

    const easeOutQuart = (x: number): number => {
      // Creates a curve that starts fast and slows down toward the end
      return 1 - Math.pow(1 - x, 1.5);
    };

    const interval = setInterval(() => {
      if (!isMounted.current) {
        clearInterval(interval);
        return;
      }

      currentStep++;
      const linearProgress = currentStep / totalSteps;
      // Apply easing function to create non-linear progress
      const progress = easeOutQuart(linearProgress);

      const totalMinutes = Math.floor((hours * 60 + minutes) * progress);
      const newHour = Math.floor(totalMinutes / 60);
      const newMinute = totalMinutes % 60;

      if (newHour !== currentHour || newMinute !== currentMinute) {
        currentHour = newHour;
        currentMinute = newMinute;
        setDisplayHours(currentHour);
        setDisplayMinutes(currentMinute);

        if (isMounted.current) {
          controls.start({
            scale: [1, 1.2, 0.95, 1.1, 1],
            rotate: [-2, 2, -3, 3, -2, 2, 0],
            transition: {
              duration: 0.3,
              ease: "easeInOut",
            },
          });
        }
      }

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        if (isMounted.current) {
          setDisplayHours(hours);
          setDisplayMinutes(minutes);

          // Add final expand-contract animation when counter completes
          controls.start({
            scale: [1, 1.4, 0.9, 1.1, 1],
            transition: {
              duration: 0.8,
              ease: "easeInOut",
            },
          });
        }
      }
    }, 1000 / steps);

    return () => clearInterval(interval);
  };

  if (!timeSpentInMinutes) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={
        isVisible
          ? {
              scale: [0, 1.2, 0.9, 1],
            }
          : { scale: 0 }
      }
      transition={{
        duration: 0.5,
        times: [0, 0.3, 0.7, 1],
        ease: "easeOut",
      }}
    >
      <motion.h2
        className="text-[72px] sm:text-[200px] font-rounded-bold mt-8"
        animate={controls}
      >
        {hours > 0 && (
          <>
            <span className="inline-block text-center">{displayHours}</span>
            h{" "}
          </>
        )}
        <span className="inline-block text-center">{displayMinutes}</span>m
      </motion.h2>
    </motion.div>
  );
};

export default TimeSpentSlide;
