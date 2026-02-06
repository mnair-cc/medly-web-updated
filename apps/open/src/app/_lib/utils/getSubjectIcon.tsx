import React from "react";
import { getSubjectIcon } from "./subjectIcons";

/**
 * Simple helper function to get a subject icon with optional color override
 * This is the main function you should use throughout the app for subject icons
 *
 * @param subjectTitle - The title of the subject (e.g., "Biology", "Maths", etc.)
 * @param fill - Optional custom fill color (if not provided, uses the subject's default color)
 * @param width - Optional width in pixels (default: 24)
 * @param height - Optional height in pixels (default: 24)
 * @returns React component for the subject icon
 *
 * @example
 * // Use default color for Biology
 * const icon = getSubjectIconWithColor("Biology");
 *
 * @example
 * // Use white color override
 * const icon = getSubjectIconWithColor("Biology", "white");
 *
 * @example
 * // Use custom size and color
 * const icon = getSubjectIconWithColor("Maths", "#000000", 32, 32);
 */
export const getSubjectIconWithColor = (
  subjectTitle: string,
  fill?: string,
  width?: number,
  height?: number
): React.ReactElement => {
  return getSubjectIcon({ subjectTitle, fill, width, height });
};

export default getSubjectIconWithColor;
