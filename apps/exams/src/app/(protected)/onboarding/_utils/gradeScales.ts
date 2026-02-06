import { CourseType } from "@/app/types/types";

// Define the various grade scale formats
export type GradeScaleOptions = {
  options: string[];
  values: number[] | string[];
};

export const getGradeScale = (
  course: CourseType,
  examBoard: string
): GradeScaleOptions => {
  // A-level -> A* to E
  if (course.includes("A-Level")) {
    return {
      options: ["A*", "A", "B", "C", "D", "E", "U"],
      values: ["A*", "A", "B", "C", "D", "E", "U"],
    };
  }

  // GCSE -> 1 to 9
  if (course.includes("GCSE") && !course.includes("IGCSE")) {
    return {
      options: ["9", "8", "7", "6", "5", "4", "3", "2", "1"],
      values: [9, 8, 7, 6, 5, 4, 3, 2, 1],
    };
  }

  // IGCSE and exam board is CIE -> A* to E
  if (course.includes("IGCSE") && examBoard === "CIE") {
    return {
      options: ["A*", "A", "B", "C", "D", "E", "U"],
      values: ["A*", "A", "B", "C", "D", "E", "U"],
    };
  }

  // IGCSE and exam board is not CIE -> 1 to 9
  if (course.includes("IGCSE") && examBoard !== "CIE") {
    return {
      options: ["9", "8", "7", "6", "5", "4", "3", "2", "1"],
      values: [9, 8, 7, 6, 5, 4, 3, 2, 1],
    };
  }

  // IB -> 1 to 7
  if (course.includes("IB") || examBoard === "IB") {
    return {
      options: ["7", "6", "5", "4", "3", "2", "1"],
      values: [7, 6, 5, 4, 3, 2, 1],
    };
  }

  // AP -> 1 to 5
  if (course.includes("AP") || examBoard === "AP") {
    return {
      options: ["5", "4", "3", "2", "1"],
      values: [5, 4, 3, 2, 1],
    };
  }

  // Default to GCSE scale if no matching course/exam board is found
  return {
    options: ["9", "8", "7", "6", "5", "4", "3", "2", "1"],
    values: [9, 8, 7, 6, 5, 4, 3, 2, 1],
  };
};
