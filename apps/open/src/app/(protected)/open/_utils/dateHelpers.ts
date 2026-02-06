/**
 * Format a deadline date for display.
 * - If >7 days away: "Jan 15"
 * - If <=7 days away: "3 days", "tomorrow", "today"
 * - If past: "Jan 15" (short date format)
 */
export function formatDeadline(isoDate: string): string {
  const deadline = new Date(isoDate);
  const now = new Date();

  // Reset time to compare dates only
  const deadlineDay = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate()
  );
  const todayDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const diffMs = deadlineDay.getTime() - todayDay.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} days`;

  // >7 days or past: short date format "Jan 15"
  const month = deadline.toLocaleDateString("en-US", { month: "short" });
  const day = deadline.getDate();
  return `${month} ${day}`;
}
