"use client";

import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import { useUser } from "@/app/_context/UserProvider";
import Stars3Icon from "@/app/_components/icons/Stars3Icon";
import Stars2Icon from "@/app/_components/icons/Stars2Icon";
import Stars1Icon from "@/app/_components/icons/Stars1Icon";
import StarsEmptyIcon from "@/app/_components/icons/StarsEmptyIcon";
import { MasteryScore } from "@/app/(protected)/sessions/types";
import LighteningFilledIcon from "@/app/_components/icons/LighteningFilledIcon";
import StarsProgressBar from "../../../_components/StarsProgressBar";

const PostPracticeModal = ({
  isOpen,
  onClickConfirm,
  lessonLegacyId,
  lessonMasteryScore,
  subLessonMasteryScores,
  initialLessonMasteryScore,
  initialSubLessonMasteryScores,
}: {
  isOpen: boolean;
  onClickConfirm: () => void;
  lessonLegacyId: string;
  lessonMasteryScore: number;
  subLessonMasteryScores: MasteryScore[];
  initialLessonMasteryScore: number;
  initialSubLessonMasteryScores: MasteryScore[];
}) => {
  const { user } = useUser();

  if (!isOpen) return null;

  if (!user) return null;

  return (
    <div className="absolute top-0 left-0 flex items-center justify-center w-full h-full z-[10000] bg-white overflow-y-auto py-16">
      <div className="flex-1 max-w-[350px] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <span className="text-[120px]">{user.avatar}</span>
          <div className="-mt-[75px]">
            {lessonMasteryScore > 0.66 ? (
              <Stars3Icon />
            ) : lessonMasteryScore > 0.33 ? (
              <Stars2Icon />
            ) : lessonMasteryScore > 0 ? (
              <Stars1Icon />
            ) : (
              <StarsEmptyIcon />
            )}
          </div>
        </div>
        <h1 className="text-4xl font-rounded-medium font-rounded-heavy text-center">
          Lesson Complete!
        </h1>

        <div className="flex flex-col items-center justify-center mt-8">
          <p className="relative text-sm text-black/30 font-medium">
            Skill mastery
          </p>
          <div className="flex items-center gap-2 mb-4">
            <LighteningFilledIcon size="xl" />
            <div className="flex items-end">
              <p className="text-7xl font-extrabold font-rounded-heavy whitespace-nowrap">
                {Math.round(lessonMasteryScore * 100)}
              </p>
              <p className="text-4xl font-rounded-heavy whitespace-nowrap text-[#CFD8DB]">
                /100
              </p>
            </div>
          </div>
        </div>
        {/* TODO: Re-enable progress bar when subLessons data is available from API */}
        {/* <div className="mb-20 w-full">
          <StarsProgressBar
            subLessons={[]}
            lessonMasteryScore={lessonMasteryScore}
            initialLessonMasteryScore={initialLessonMasteryScore}
          />
        </div> */}

        <PrimaryButtonClicky
          buttonText="Collect Stars"
          buttonState="filled"
          onPress={onClickConfirm}
          isLoading={false}
          doesStretch={true}
          showKeyboardShortcut={false}
        />
      </div>
    </div>
  );
};

export default PostPracticeModal;
