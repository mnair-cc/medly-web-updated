import { useSubjectTheme } from "@/app/_hooks/useSubjectTheme";

const AddSubjectCard = ({
  onClick,
  subject,
  isSelected,
  courseName,
  examBoardName,
}: {
  onClick: () => void;
  subject: any;
  isSelected: boolean;
  courseName: string;
  examBoardName: string;
}) => {
  const theme = useSubjectTheme(subject.title);
  return (
    <button onClick={onClick}>
      <div
        className="flex flex-col gap-20 p-4 rounded-2xl w-[240px] h-[280px] relative overflow-hidden ml-1"
        style={{
          background: `linear-gradient(to bottom, ${theme.color} 0%, ${theme.color}30 100%)`,
          outline: isSelected ? `3px solid #007BFF` : "none",
          outlineOffset: "0px",
        }}
      >
        <div className="flex justify-between">
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between ">
              <p className="text-xl font-heavy opacity-100 text-left">{subject.title}</p>

              <div>
                {isSelected ? (
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_308_107)">
                      <path
                        d="M14 22.7334C18.9658 22.7334 23.0791 18.6289 23.0791 13.6543C23.0791 8.68848 18.9658 4.5752 13.9912 4.5752C9.02539 4.5752 4.9209 8.68848 4.9209 13.6543C4.9209 18.6289 9.03418 22.7334 14 22.7334ZM10.5459 14.5244C9.99219 14.5244 9.60547 14.208 9.60547 13.6719C9.60547 13.1357 9.97461 12.8018 10.5459 12.8018H17.4629C18.0342 12.8018 18.3945 13.1357 18.3945 13.6719C18.3945 14.208 18.0166 14.5244 17.4629 14.5244H10.5459Z"
                        fill="#007BFF"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_308_107">
                        <rect width="28" height="28" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                ) : (
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_308_95)">
                      <path
                        d="M14 22.7334C18.9658 22.7334 23.0791 18.6289 23.0791 13.6543C23.0791 8.68848 18.9658 4.5752 13.9912 4.5752C9.02539 4.5752 4.9209 8.68848 4.9209 13.6543C4.9209 18.6289 9.03418 22.7334 14 22.7334ZM14 20.9492C9.95703 20.9492 6.71387 17.6973 6.71387 13.6543C6.71387 9.61133 9.94824 6.36816 13.9912 6.36816C18.0342 6.36816 21.2861 9.61133 21.2949 13.6543C21.2949 17.6973 18.043 20.9492 14 20.9492ZM9.93066 13.6543C9.93066 14.1289 10.2734 14.4629 10.7656 14.4629H13.1738V16.8799C13.1738 17.3633 13.5078 17.7061 13.9824 17.7061C14.4746 17.7061 14.8174 17.3633 14.8174 16.8799V14.4629H17.2344C17.7178 14.4629 18.0518 14.1289 18.0518 13.6543C18.0518 13.1621 17.7178 12.8193 17.2344 12.8193H14.8174V10.4111C14.8174 9.91895 14.4746 9.58496 13.9824 9.58496C13.5078 9.58496 13.1738 9.91895 13.1738 10.4111V12.8193H10.7656C10.2734 12.8193 9.93066 13.1621 9.93066 13.6543Z"
                        fill="#007BFF"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_308_95">
                        <rect width="28" height="28" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                )}
              </div>
            </div>
            <p className="text-sm opacity-50 text-left ">
              {examBoardName !== "IB " ? `${examBoardName} ${courseName}` : courseName}
            </p>
          </div>
        </div>
        <div className="absolute -bottom-[48px] right-4">
          <p className="text-[120px] font-heavy">{theme.emoji}</p>
        </div>
      </div>
    </button>
  );
};

export default AddSubjectCard;
