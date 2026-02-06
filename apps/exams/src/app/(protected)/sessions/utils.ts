import React from "react";
import {
  QuestionGroup,
  QuestionWithMarkingResult,
  UserDetails,
} from "@/app/types/types";
import moment from "moment";

export const calculateQuestionGroupProgress = (
  group: QuestionGroup
): number => {
  const totalQuestions = group.questions.length;
  if (totalQuestions === 0) return 0;

  const answeredQuestions = (
    group.questions as QuestionWithMarkingResult[]
  ).filter(
    (question) =>
      question.userAnswer ||
      (question.canvas &&
        ((question.canvas.paths && question.canvas.paths.length > 0) ||
          (question.canvas.textboxes &&
            question.canvas.textboxes.length > 0 &&
            question.canvas.textboxes.some(
              (textbox) => textbox.text.trim().length > 0
            ))))
  ).length;

  return (answeredQuestions / totalQuestions) * 100;
};

const formatTime = (durationInMinutes: number) => {
  const isNegative = durationInMinutes < 0;
  const absMinutes = Math.abs(durationInMinutes);
  const minutes = Math.floor(absMinutes);
  const seconds = Math.floor((absMinutes - minutes) * 60);
  return `${isNegative ? "-" : ""}${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

const formatTimeAsHAndMin = (durationInMinutes: number) => {
  const absMinutes = Math.abs(durationInMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = Math.floor(absMinutes % 60);

  if (hours > 0 && minutes > 0) {
    return `${hours} h ${minutes} min`;
  } else if (hours > 0) {
    return `${hours} h`;
  } else {
    return `${minutes} min`;
  }
};

export const updateFeaturesUsedToday = (
  user: UserDetails,
  setUser: React.Dispatch<React.SetStateAction<UserDetails | null>>
) => {
  setUser((prevUser) => {
    if (!prevUser) return prevUser;
    return {
      ...prevUser,
      featuresUsedToday: (prevUser.featuresUsedToday || 0) + 1,
    };
  });
};

export const updateStreak = (
  user: UserDetails,
  setUser: React.Dispatch<React.SetStateAction<UserDetails | null>>
) => {
  setUser((prevUser) => {
    if (!prevUser) return prevUser;
    return {
      ...prevUser,
      streak:
        (prevUser.streak || 0) +
        (prevUser.dateOfMostRecentUse &&
        moment(prevUser.dateOfMostRecentUse).isAfter(
          moment().subtract(1, "day")
        )
          ? 1
          : 0),
    };
  });
};

export const updateNumberOfStars = (
  user: UserDetails,
  setUser: React.Dispatch<React.SetStateAction<UserDetails | null>>,
  initialLessonMasteryScore: number,
  newLessonMasteryScore: number
) => {
  // Define star thresholds
  const starThresholds = [0, 0.33, 0.66];

  // Calculate how many stars the user had before
  const previousStars = starThresholds.filter(
    (threshold) => initialLessonMasteryScore > threshold
  ).length;

  // Calculate how many stars the user has now
  const currentStars = starThresholds.filter(
    (threshold) => newLessonMasteryScore > threshold
  ).length;

  // Return the difference (new stars to award)
  const starsToAdd = currentStars - previousStars;

  setUser((prevUser) => {
    if (!prevUser) return prevUser;
    return {
      ...prevUser,
      numberOfStars: prevUser.numberOfStars + starsToAdd,
    };
  });
};

export { formatTime, formatTimeAsHAndMin };

/**
 * Sorts lesson IDs in the format "unit.topic.lesson" with proper numerical ordering.
 * For example: "sat2.2.3" comes before "sat10.0.2"
 */
export const sortLessonIds = (lessonIds: string[]): string[] => {
  return [...lessonIds].sort((a, b) => {
    const partsA = a.split(".").map((part) => {
      // Extract the numeric part from strings like "sat10" -> 10
      const numericMatch = part.match(/\d+/);
      return numericMatch ? parseInt(numericMatch[0], 10) : 0;
    });

    const partsB = b.split(".").map((part) => {
      const numericMatch = part.match(/\d+/);
      return numericMatch ? parseInt(numericMatch[0], 10) : 0;
    });

    // Compare each part (unit, topic, lesson)
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;

      if (partA !== partB) {
        return partA - partB;
      }
    }

    // If all parts are equal, maintain original order
    return 0;
  });
};
