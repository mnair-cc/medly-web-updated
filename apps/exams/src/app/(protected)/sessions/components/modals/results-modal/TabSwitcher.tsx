interface TabSwitcherProps {
  activeTab: "feedback" | "review";
  onTabChange: (tab: "feedback" | "review") => void;
}

const TabSwitcher = ({ activeTab, onTabChange }: TabSwitcherProps) => {
  return (
    <div className="rounded-full bg-[#F7F7FA] p-1 flex flex-row items-center my-10">
      <button
        className={`font-rounded-bold text-[14px] px-6 py-2 rounded-full transition-all duration-200 whitespace-nowrap ${
          activeTab === "feedback"
            ? "text-black bg-white shadow-sm"
            : "text-[#8E8E93] bg-transparent"
        }`}
        onClick={() => onTabChange("feedback")}
      >
        Feedback
      </button>
      <button
        className={`font-rounded-bold text-[14px] px-6 py-2 rounded-full transition-all duration-200 whitespace-nowrap ${
          activeTab === "review"
            ? "text-black bg-white shadow-sm"
            : "text-[#8E8E93] bg-transparent"
        }`}
        onClick={() => onTabChange("review")}
      >
        Review
      </button>
    </div>
  );
};

export default TabSwitcher;
