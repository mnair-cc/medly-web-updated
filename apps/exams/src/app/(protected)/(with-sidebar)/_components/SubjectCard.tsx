import Link from "next/link";
import { SubjectWithUnits } from "@/app/types/types";
import { useSubjectTheme } from "@/app/_hooks/useSubjectTheme";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import LockIcon from "@/app/_components/icons/LockIcon";
import { useTutorialTooltip } from "@/app/_hooks/useTutorialTooltip";

const SubjectCard = ({
  subject,
  showLock,
}: {
  subject: SubjectWithUnits;
  showLock: boolean;
}) => {
  const theme = useSubjectTheme(subject.title);
  const { track } = useTracking();
  const { showTooltip, handleDismiss } =
    useTutorialTooltip("subjectCardTooltip");

  const handleSubjectClick = () => {
    track("subject_card_clicked", {
      subject_id: subject.legacyId,
      subject_title: subject.title,
      exam_board: subject.examBoard,
      course: subject.course,
    });
    handleDismiss();
  };

  return (
    <Link
      href={`/subjects/${subject.legacyId}/learn-and-practice`}
      onClick={handleSubjectClick}
    >
      <div
        className="flex flex-col gap-20 p-4 rounded-2xl w-[240px] h-[280px] relative overflow-hidden"
        style={{
          background: `linear-gradient(to bottom, ${theme.color} 0%, ${theme.color}30 100%)`,
        }}
      >
        <div className="flex justify-between">
          <div className="flex flex-col ">
            <div className="flex items-center gap-2">
              <p className="text-xl font-heavy opacity-100 -mr-2">
                {subject.title}
              </p>

              {showLock && <LockIcon />}
            </div>
            <p className="text-sm opacity-50">
              {subject.examBoard !== "IB"
                ? `${subject.examBoard} ${subject.course}`
                : subject.examBoard}
            </p>
          </div>
        </div>
        <div className="absolute -bottom-[48px] right-4">
          <p className="text-[120px] font-heavy">{theme.emoji}</p>
        </div>
      </div>
    </Link>
  );
};

export default SubjectCard;
