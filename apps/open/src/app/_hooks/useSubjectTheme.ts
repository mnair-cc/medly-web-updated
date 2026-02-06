import React from "react";
import { getSubjectIcon } from "@/app/_lib/utils/subjectIcons";

export type SubjectTheme = {
  color: string;
  emoji: string;
  iconColor: string;
  getIcon: (
    fill?: string,
    width?: number,
    height?: number
  ) => React.ReactElement;
};

export type SubjectThemeMap = {
  [key: string]: SubjectTheme;
};

const subjectThemes: SubjectThemeMap = {
  Biology: {
    color: "#7CC500",
    emoji: "🌿",
    iconColor: "#7CC500",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Biology", fill, width, height }),
  },
  "Biology (Combined)": {
    color: "#7CC500",
    emoji: "🌿",
    iconColor: "#7CC500",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Biology", fill, width, height }),
  },
  "Biology A": {
    color: "#7CC500",
    emoji: "🌿",
    iconColor: "#7CC500",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Biology", fill, width, height }),
  },
  "Biology A (Combined)": {
    color: "#7CC500",
    emoji: "🌿",
    iconColor: "#7CC500",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Biology", fill, width, height }),
  },
  Chemistry: {
    color: "#06B0FF",
    emoji: "🧪",
    iconColor: "#06B0FF",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Chemistry", fill, width, height }),
  },
  "Chemistry (Combined)": {
    color: "#06B0FF",
    emoji: "🧪",
    iconColor: "#06B0FF",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Chemistry", fill, width, height }),
  },
  "Chemistry A": {
    color: "#06B0FF",
    emoji: "🧪",
    iconColor: "#06B0FF",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Chemistry", fill, width, height }),
  },
  "Chemistry A (Combined)": {
    color: "#06B0FF",
    emoji: "🧪",
    iconColor: "#06B0FF",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Chemistry", fill, width, height }),
  },
  Physics: {
    color: "#FAD33A",
    emoji: "🔭",
    iconColor: "#FAD33A",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Physics", fill, width, height }),
  },
  "Physics (Combined)": {
    color: "#FAD33A",
    emoji: "🔭",
    iconColor: "#FAD33A",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Physics", fill, width, height }),
  },
  "Physics A": {
    color: "#FAD33A",
    emoji: "🔭",
    iconColor: "#FAD33A",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Physics", fill, width, height }),
  },
  "Physics A (Combined)": {
    color: "#FAD33A",
    emoji: "🔭",
    iconColor: "#FAD33A",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Physics", fill, width, height }),
  },
  "English Literature": {
    color: "#FF339F",
    emoji: "🎭",
    iconColor: "#FF339F",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({
        subjectTitle: "English Literature",
        fill,
        width,
        height,
      }),
  },
  "English Language": {
    color: "#FF339F",
    emoji: "📰",
    iconColor: "#FF339F",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "English Language", fill, width, height }),
  },
  Geography: {
    color: "#7CC500",
    emoji: "🏔️",
    iconColor: "#7CC500",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Geography", fill, width, height }),
  },
  "Geography A": {
    color: "#7CC500",
    emoji: "🏔️",
    iconColor: "#7CC500",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Geography", fill, width, height }),
  },
  MathsAA: {
    color: "#FE2B3C",
    emoji: "🧮",
    iconColor: "#FE2B3C",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Maths", fill, width, height }),
  },
  MathsAI: {
    color: "#FE2B3C",
    emoji: "📊",
    iconColor: "#FE2B3C",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Maths", fill, width, height }),
  },
  Maths: {
    color: "#FE2B3C",
    emoji: "🧮",
    iconColor: "#FE2B3C",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Maths", fill, width, height }),
  },
  "Maths A": {
    color: "#FE2B3C",
    emoji: "🧮",
    iconColor: "#FE2B3C",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Maths", fill, width, height }),
  },
  Economics: {
    color: "#F7F7FB",
    emoji: "🪙",
    iconColor: "#FFD700",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Economics", fill, width, height }),
  },
  "Computer Science": {
    color: "#51C240",
    emoji: "💻",
    iconColor: "#51C240",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Computer Science", fill, width, height }),
  },
  Psychology: {
    color: "#FFC4EC",
    emoji: "🧠",
    iconColor: "#FF69B4",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Psychology", fill, width, height }),
  },
  "Religious Studies": {
    color: "#FAD33A",
    emoji: "🙏",
    iconColor: "#FAD33A",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({
        subjectTitle: "Religious Studies",
        fill,
        width,
        height,
      }),
  },
  "Business Studies": {
    color: "#885EF7",
    emoji: "💼",
    iconColor: "#885EF7",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Business", fill, width, height }),
  },
  Sociology: {
    color: "#885EF7",
    emoji: "👥",
    iconColor: "#885EF7",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Sociology", fill, width, height }),
  },
  "Environment Systems and Societies": {
    color: "#7CC500",
    emoji: "🏔️",
    iconColor: "#7CC500",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Environment Systems and Societies", fill, width, height }),
  },
  "Design and Technology": {
    color: "#885EF7",
    emoji: "🎨",
    iconColor: "#885EF7",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "DesignAndTechnology", fill, width, height }),
  },
  "Food and Nutrition": {
    color: "#06B0FF",
    emoji: "🧪",
    iconColor: "#06B0FF",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Food and Nutrition", fill, width, height }),
  },
  History: {
    color: "#FE2B3C",
    emoji: "🔍",
    iconColor: "#FE2B3C",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "History", fill, width, height }),
  },
  "Media Studies": {
    color: "#06B0FF",
    emoji: "🔍",
    iconColor: "#06B0FF",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Media Studies", fill, width, height }),
  },
  "Physical Education": {
    color: "#FE2B3C",
    emoji: "🔍",
    iconColor: "#FE2B3C",
    getIcon: (fill?: string, width?: number, height?: number) =>
      getSubjectIcon({ subjectTitle: "Physical Education", fill, width, height }),
  },
};

// D8B4F2, ,
const defaultTheme: SubjectTheme = {
  color: "#F7F7FB",
  emoji: "📚",
  iconColor: "#6B7280",
  getIcon: (fill?: string, width?: number, height?: number) =>
    getSubjectIcon({
      subjectTitle: "",
      fill: fill || "#6B7280",
      width,
      height,
    }),
};

export function useSubjectTheme(subjectTitle: string): SubjectTheme {
  return subjectThemes[subjectTitle] || defaultTheme;
}

// Export the themes map directly if needed elsewhere
export const getSubjectThemes = () => subjectThemes;
