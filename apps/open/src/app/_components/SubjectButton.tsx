interface SubjectButtonProps {
  title: string;
  isSelected: boolean;
  onClick?: () => void;
}

const SubjectButton = ({ title, isSelected, onClick }: SubjectButtonProps) => {
  return (
    <button
      className={`cursor-pointer flex px-4 py-2 gap-2 justify-between items-center text-black rounded-full text-sm font-medium border border-[#F2F2F7] hover:bg-[#F7F7FB] ${
        isSelected && "bg-[#F2F2F7]"
      }`}
      onClick={onClick}
    >
      {title}
      {!isSelected ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2.81623 8.8162H7.18374V13.1838C7.18374 13.6277 7.54895 14 8.00001 14C8.45108 14 8.81628 13.6277 8.81628 13.1838V8.8162H13.1838C13.6277 8.8162 14 8.45108 14 8.00002C14 7.54895 13.6277 7.18375 13.1838 7.18375H8.81628V2.81624C8.81628 2.37231 8.45108 2 8.00001 2C7.54895 2 7.18374 2.37231 7.18374 2.81624V7.18375H2.81623C2.37232 7.18375 2 7.54895 2 8.00002C2 8.45108 2.37232 8.8162 2.81623 8.8162Z"
            fill="black"
          />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.99662 15C11.8333 15 15 11.8317 15 8C15 4.16828 11.8265 1 7.98985 1C4.15998 1 1 4.16828 1 8C1 11.8317 4.16675 15 7.99662 15ZM5.33736 8.67698C4.91107 8.67698 4.60657 8.4265 4.60657 8.01354C4.60657 7.60058 4.89753 7.33656 5.33736 7.33656H10.6559C11.0957 7.33656 11.3799 7.60058 11.3799 8.01354C11.3799 8.4265 11.0822 8.67698 10.6559 8.67698H5.33736Z"
            fill="black"
          />
        </svg>
      )}
    </button>
  );
};

export default SubjectButton;
