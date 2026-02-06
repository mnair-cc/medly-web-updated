import { Lesson } from "@/app/types/types";
import LessonPrimaryButton from "@/app/_components/PrimaryButtonClicky";

const StartPracticeToolTip = ({
  lesson,
  lessonButtonRef,
}: {
  lesson: Lesson;
  lessonButtonRef: React.RefObject<HTMLDivElement | null>;
}) => {
  return (
    <div className="mobile-lesson-button absolute top-20 md:top-16 left-0 right-0 w-full z-10 block drop-shadow-[0_0_10px_rgba(0,0,0,0.15)] animate-float md:max-w-[480px]">
      <div className={`absolute rotate-180 -mt-3 top-0 left-1/2`}>
        <svg width="13" height="17" viewBox="0 0 13 17" fill="none">
          <path
            d="M11.4055 -9.29314e-08L1.59452 -6.64733e-07C0.625301 -7.21221e-07 1.88129e-07 1.02035 2.4074e-08 2.2714C-2.47933e-08 2.64405 0.0687827 3.02557 0.206349 3.38048L5.12121 15.8377C5.42136 16.6096 5.95911 17 6.49687 17C7.03463 17 7.57864 16.6096 7.87879 15.8377L12.7874 3.38048C12.925 3.0167 13 2.64405 13 2.2714C13 1.02036 12.3747 -3.64437e-08 11.4055 -9.29314e-08Z"
            fill="black"
          />
        </svg>
      </div>

      <div className="flex flex-col justify-between bg-black rounded-[16px] p-4">
        <div className="text-white text-[17px] font-heavy">{lesson.title}</div>
        <div className="text-white text-base md:text-sm mb-4">
          Question {lesson.answeredQuestions + 1} of {lesson.totalQuestions}
        </div>
        <LessonPrimaryButton
          buttonText="Start practice"
          showKeyboardShortcut={false}
          colorScheme={{
            backgroundColor: "#00AEFF", //theme?.color || "#00AEFF",
            primaryColor: "rgba(0,0,0,0.1)",
            textColor: "white",
          }}
        ></LessonPrimaryButton>
      </div>
      <div ref={lessonButtonRef} className="mt-20 cursor-none" />
    </div>
  );
};

export default StartPracticeToolTip;
