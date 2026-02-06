import { QuestionGroup } from "@/app/types/types";
import {
  QuestionSessionPageType,
  SessionData,
  SessionType,
} from "@/app/(protected)/sessions/types";
import { QuestionWithMarkingResult } from "@/app/types/types";
import { PaperData } from "../fetchers/curriculum";

export function assembleSessionData(
  paperId: string,
  questionsWithMarkingResults: QuestionWithMarkingResult[],
  paperDetails: PaperData,
  existingSessionData?: Partial<SessionData> | null
): SessionData {
  // Group questions by questionGroupId
  // Note: All questions from the backend should have a questionGroupId
  const questionGroupsMap = new Map<number, QuestionWithMarkingResult[]>();

  questionsWithMarkingResults.forEach((question) => {
    const groupId = question.questionGroupId;
    if (!groupId) {
      // This shouldn't happen as all questions should have a groupId from the backend
      console.warn(`Question ${question.legacyId} missing questionGroupId`);
      return;
    }

    if (!questionGroupsMap.has(groupId)) {
      questionGroupsMap.set(groupId, []);
    }
    // TODO: Fix potential null reference - Map.get() could return undefined even after has() check
    questionGroupsMap.get(groupId)?.push(question);
  });

  // Convert map to array and sort questions within each group
  const questionGroups: QuestionGroup[] = Array.from(
    questionGroupsMap.entries()
  )
    .map(([groupId, questions]) => {
      // Sort questions within the group by their order
      const sortedQuestions = questions.sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      );

      return {
        id: groupId,
        legacyId: sortedQuestions[0].legacyId,
        questionStem: sortedQuestions[0].questionStem || "",
        order: sortedQuestions[0].order || 0,
        questions: sortedQuestions,
      };
    })
    // Sort groups by the order of their first question
    .sort((a, b) => a.order - b.order);

  const pages = questionGroups.map((questionGroup) => ({
    type: QuestionSessionPageType.Question,
    content: questionGroup,
    progress: 0,
  }));

  const totalMarksPossible = questionsWithMarkingResults.reduce(
    (sum, q) => sum + q.maxMark,
    0
  );

  const totalMarksAwarded = questionsWithMarkingResults.reduce(
    (sum, q) => sum + (q.userMark || 0),
    0
  );

  return {
    id: existingSessionData?.id || `paper-${paperId}-${Date.now()}`,
    sessionType: SessionType.PaperSession,
    sessionTitle: paperDetails.title || `Paper ${paperDetails.number}`,
    sessionSubtitle: `${paperDetails.examBoard} • ${paperDetails.course}`,
    gcseHigher: existingSessionData?.gcseHigher,
    hasInsert: false,
    insertType: null,
    insertText: null,
    inputMode: "text",
    isTimed: true,
    durationInMinutes: existingSessionData?.durationInMinutes || 90, // Use existing duration or default to 90 minutes
    currentGrade: existingSessionData?.currentGrade || null,
    targetGrade: existingSessionData?.targetGrade || null,
    totalMarksAwarded,
    totalMarksPossible,
    questionCount: questionsWithMarkingResults.length,
    timeStarted: existingSessionData?.timeStarted || null, // Use existing timeStarted or null if not set
    timeFinished: existingSessionData?.timeFinished || null, // Use existing timeFinished or null if not set
    isMarked: existingSessionData?.isMarked || false,
    pages,
    questionHistory: existingSessionData?.questionHistory || [],
    masteryScores: existingSessionData?.masteryScores,
  };
}
