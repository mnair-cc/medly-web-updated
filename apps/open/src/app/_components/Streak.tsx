import StreakIcon from "./icons/StreakIcon";

export const Streak = ({ countDailyStreak }: { countDailyStreak: number }) => {
  if (countDailyStreak < 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      <StreakIcon />
      <span className="text-sm text-black">{countDailyStreak + 1}</span>
    </div>
  );
};
