import GoldStarIcon from "@/app/_components/icons/GoldStarIcon";
import { SubLesson } from "@/app/types/types";
import { useEffect, useState } from "react";

const StarsProgressBar = ({
  subLessons,
  lessonMasteryScore,
  initialLessonMasteryScore,
}: {
  subLessons: SubLesson[];
  lessonMasteryScore: number;
  initialLessonMasteryScore: number;
}) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getStarPositions = () => {
    const starSpacing = subLessons.length / 3;
    const positions: number[] = [];

    for (let i = 0; i < 3; i++) {
      positions.push(Math.ceil(i * starSpacing));
    }

    return positions;
  };

  const getSubLessonProgress = (index: number) => {
    const totalSubLessons = subLessons.length;
    const filledSubLessons = Math.floor(lessonMasteryScore * totalSubLessons);

    if (index < filledSubLessons) {
      return 1; // Fully filled
    } else if (
      index === filledSubLessons &&
      (lessonMasteryScore * totalSubLessons) % 1 !== 0
    ) {
      // Partially filled for the last sublesson if there's a remainder
      return (lessonMasteryScore * totalSubLessons) % 1;
    } else {
      return 0; // Not filled
    }
  };

  const starPositions = getStarPositions();

  return (
    <div className="flex items-center gap-1 h-8 w-full">
      {Array.from({ length: subLessons.length }).map((_, index) => {
        const progress = getSubLessonProgress(index);

        return (
          <div
            key={index}
            className={`relative flex items-center justify-center bg-[#E6EFF2] overflow-hidden w-full h-full ${
              index === 0
                ? "rounded-l-full"
                : index === subLessons.length - 1
                ? "rounded-r-full"
                : "rounded-none"
            }`}
          >
            {starPositions.includes(index) && (
              <div className="z-10 relative">
                <GoldStarIcon fill="#ffffff80" />
              </div>
            )}
            <div
              className={`bg-[#06B0FF] absolute top-0 left-0 h-full transition-all duration-500 ease-out`}
              style={{
                width: animate ? `${progress * 100}%` : "0%",
                transitionDelay: `${index * 500}ms`,
              }}
            ></div>
          </div>
        );
      })}
    </div>
  );
};

export default StarsProgressBar;
