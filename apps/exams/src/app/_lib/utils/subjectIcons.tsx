import React from "react";
import DefaultIcon from "@/app/_components/icons/subject-icons/DefaultIcon";
import { getSubjectThemes } from "@/app/_hooks/useSubjectTheme";
import BiologyIcon from "@/app/_components/icons/subject-icons/BiologyIcon";
import ChemistryIcon from "@/app/_components/icons/subject-icons/ChemistryIcon";
import PhysicsIcon from "@/app/_components/icons/subject-icons/PhysicsIcon";
import GeographyIcon from "@/app/_components/icons/subject-icons/GeographyIcon";
import MathsIcon from "@/app/_components/icons/subject-icons/MathsIcon";
import EconomicsIcon from "@/app/_components/icons/subject-icons/EconomicsIcon";
import ComputerScienceIcon from "@/app/_components/icons/subject-icons/ComputerScienceIcon";
import PsychologyIcon from "@/app/_components/icons/subject-icons/PsychologyIcon";
import ReligiousStudiesIcon from "@/app/_components/icons/subject-icons/ReligiousStudiesIcon";
import SociologyIcon from "@/app/_components/icons/subject-icons/SociologyIcon";
import EnglishLanguageIcon from "@/app/_components/icons/subject-icons/EnglishLanguageIcon";
import EnglishLiteratureIcon from "@/app/_components/icons/subject-icons/EnglishLiteratureIcon";
import FoodTechIcon from "@/app/_components/icons/subject-icons/FoodTechIcon";
import HistoryIcon from "@/app/_components/icons/subject-icons/HistoryIcon";
import DesignAndTechnologyIcon from "@/app/_components/icons/subject-icons/DesignAndTechnologyIcon";
import DramaIcon from "@/app/_components/icons/subject-icons/DramaIcon";
import BusinessIcon from "@/app/_components/icons/subject-icons/BusinessIcon";
import DesignIcon from "@/app/_components/icons/subject-icons/DesignIcon";
import FoodIcon from "@/app/_components/icons/subject-icons/FoodIcon";
import MediaIcon from "@/app/_components/icons/subject-icons/MediaIcon";
import PEIcon from "@/app/_components/icons/subject-icons/PEIcon";

// Subject icon component mappings
const subjectIconMap: Record<
  string,
  React.ComponentType<{ fill?: string; width?: number; height?: number }>
> = {
  Biology: BiologyIcon,
  "Biology (Combined)": BiologyIcon,
  "Biology A": BiologyIcon,
  "Biology A (Combined)": BiologyIcon,
  Chemistry: ChemistryIcon,
  "Chemistry (Combined)": ChemistryIcon,
  "Chemistry A": ChemistryIcon,
  "Chemistry A (Combined)": ChemistryIcon,
  Physics: PhysicsIcon,
  "Physics A": PhysicsIcon,
  "Physics A (Combined)": PhysicsIcon,
  "Physics (Combined)": PhysicsIcon,
  "English Literature": EnglishLiteratureIcon,
  "English Language": EnglishLanguageIcon,
  Geography: GeographyIcon,
  "Geography A": GeographyIcon,
  Maths: MathsIcon,
  "Maths A": MathsIcon,
  "Maths A (Combined)": MathsIcon,
  "Maths AI": MathsIcon,
  "Maths AA": MathsIcon,
  Economics: EconomicsIcon,
  "Computer Science": ComputerScienceIcon,
  Psychology: PsychologyIcon,
  "Religious Studies": ReligiousStudiesIcon,
  "Business Studies": BusinessIcon,
  "Business": BusinessIcon,
  Sociology: SociologyIcon,
  FoodTech: FoodTechIcon,
  History: HistoryIcon,
  DesignAndTechnology: DesignAndTechnologyIcon,
  Drama: DramaIcon,
  "Design and Technology": DesignIcon,
  "Food and Nutrition": FoodIcon,
  "Media Studies": MediaIcon,
  "Physical Education": PEIcon,
  "Environment Systems and Societies": GeographyIcon,
};

export interface SubjectIconProps {
  subjectTitle: string;
  fill?: string; // Override color
  width?: number;
  height?: number;
}

/**
 * Returns the appropriate icon component for a subject with its default or custom fill color
 * @param subjectTitle - The title of the subject
 * @param fill - Optional custom fill color (overrides default subject color)
 * @param width - Optional width (default: 24)
 * @param height - Optional height (default: 24)
 * @returns React component for the subject icon
 */
export const getSubjectIcon = ({
  subjectTitle,
  fill,
  width = 28,
  height = 28,
}: SubjectIconProps): React.ReactElement => {
  // Get the icon component for this subject (fallback to default)
  const IconComponent = subjectIconMap[subjectTitle] || DefaultIcon;

  // Use provided fill, else theme iconColor, else let the icon's own default take effect
  const themeIconColor = getSubjectThemes()[subjectTitle]?.iconColor;
  const iconFill = fill ?? themeIconColor;

  return <IconComponent fill={iconFill} width={width} height={height} />;
};

/**
 * Checks if a subject has a custom icon defined
 * @param subjectTitle - The title of the subject
 * @returns boolean indicating if the subject has a custom icon
 */
export const hasCustomIcon = (subjectTitle: string): boolean => {
  return subjectTitle in subjectIconMap;
};

/**
 * Gets all available subject titles that have custom icons
 * @returns Array of subject titles with custom icons
 */
export const getSubjectsWithCustomIcons = (): string[] => {
  return Object.keys(subjectIconMap);
};

/**
 * Gets all available subject colors
 * @returns Record of subject titles to their colors
 */
export const getAllSubjectColors = (): Record<string, string> => {
  const themes = getSubjectThemes();
  const colors: Record<string, string> = {};
  for (const [subject, theme] of Object.entries(themes)) {
    if (theme.iconColor) colors[subject] = theme.iconColor;
  }
  return colors;
};
