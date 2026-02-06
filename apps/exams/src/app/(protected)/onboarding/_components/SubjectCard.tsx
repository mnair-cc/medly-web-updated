import { useSubjectTheme } from "@/app/_hooks/useSubjectTheme";
import { Subject } from "@/app/types/types";

interface SubjectCardProps {
  onClick: () => void;
  subject: Subject & { examBoard: string; courseName: string };
  isSelected: boolean;
  courseName: string;
  examBoardName: string;
}

const SubjectCard = ({
  onClick,
  subject,
  isSelected,
  courseName,
  examBoardName,
}: SubjectCardProps) => {
  const theme = useSubjectTheme(subject.title);

  return (
    <button onClick={onClick} className="w-full h-full">
      <div
        className="flex flex-col justify-between p-4 rounded-2xl w-full h-[160px] relative overflow-hidden transition-all hover:scale-105"
        style={{
          background: `linear-gradient(to bottom, ${theme.color} 0%, ${theme.color}30 100%)`,
          outline: isSelected ? `3px solid #007BFF` : "none",
          outlineOffset: "0px",
        }}
      >
        <div className="flex justify-between items-start w-full">
          <div className="flex flex-col text-left flex-1 mr-2">
            <p className="text-sm font-bold text-black leading-tight">
              {subject.title}
            </p>
            <p className="text-xs opacity-60 text-black mt-1">
              {examBoardName !== "IB"
                ? `${examBoardName} ${courseName}`
                : courseName}
            </p>
          </div>

          <div className="flex-shrink-0">
            {isSelected ? (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M10 3L4.5 8.5L2 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-6 h-6 border-2 border-black border-opacity-30 rounded-full"></div>
            )}
          </div>
        </div>

        <div className="absolute -bottom-4 -right-2">
          <p className="text-4xl font-heavy opacity-40">{theme.emoji}</p>
        </div>
      </div>
    </button>
  );
};

export default SubjectCard;
