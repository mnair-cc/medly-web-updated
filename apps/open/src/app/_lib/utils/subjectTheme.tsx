import { getSubjectThemes } from "@/app/_hooks/useSubjectTheme";
import { getSubjectIcon } from "@/app/_lib/utils/subjectIcons";

// Consolidated getter for sidebar/theme consumers
// Always returns a consistent shape expected by sidebar components
export type SubjectThemeUI = {
  primaryColor: string;
  icon: React.ReactElement;
};

export function getSubjectTheme(subjectTitle: string): SubjectThemeUI {
  const themes = getSubjectThemes();
  const theme = themes[subjectTitle];

  const primaryColor = theme?.iconColor || "#000000";
  const icon = getSubjectIcon({
    subjectTitle,
    fill: "currentColor",
    width: 28,
    height: 28,
  });

  return {
    primaryColor,
    icon,
  };
}
