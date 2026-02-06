import { SubjectTheme } from "@/app/_hooks/useSubjectTheme";

const Header = ({ theme }: { theme: SubjectTheme }) => {
  return (
    <div
      className="flex flex-col pt-10 px-10 h-40"
      style={{
        backgroundColor: theme?.color ? `${theme.color}5A` : "#0001A",
      }}
    >
      <div className="absolute top-24 left-2 md:left-10 flex flex-row justify-between items-center text-[80px] px-4 rounded-full">
        {theme.emoji}
      </div>
    </div>
  );
};

export default Header;
