import { QuestionGroup, LessonData } from "@/app/types/types";
import {
  QuestionSessionPageType,
  SessionData,
  SessionType,
  LearnContent,
  LearnFlowProgress,
} from "@/app/(protected)/sessions/types";
import { QuestionWithMarkingResult } from "@/app/types/types";
import { KnowledgeModelData } from "@/app/types/types";

export function assembleSessionData(
  lessonId: string,
  questionsWithMarkingResults: QuestionWithMarkingResult[],
  lessonDetails: LessonData,
  gcseHigher?: boolean,
  knowledgeModel?: KnowledgeModelData,
  learnFlowProgress?: LearnFlowProgress | null
): SessionData {
  // TEMPORARY WORKAROUND: Move diagram to options.passage for spot questions
  const processedQuestions = questionsWithMarkingResults.map((question) => {
    if (question.questionType === "spot") {
      type SpotCorrectMatches = Record<string, string | string[]>;
      const spotOptions = question.options as {
        correct_matches?: SpotCorrectMatches;
        correct_words_or_phrases?: string[];
      };

      const trimCategory = (value: string) => value.replace(/ \(.*?\)$/g, "");
      const sortCategories = (values: string[]) =>
        [...values].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

      let correctAnswers: Record<string, string | string[]> = {};
      const correctMatches = spotOptions.correct_matches;

      if (correctMatches) {
        correctAnswers = Object.keys(correctMatches).reduce(
          (newObj, selectionOption) => {
            const matchValue = correctMatches[selectionOption];
            if (!matchValue) {
              return newObj;
            }
            const categories = Array.isArray(matchValue)
              ? matchValue
              : [matchValue];
            const sanitizedCategories = sortCategories(
              categories.map((item) => trimCategory(item))
            );
            return {
              ...newObj,
              [selectionOption]: sanitizedCategories,
            };
          },
          {} as Record<string, string[]>
        );
      } else {
        const correctWordsOrPhrases = spotOptions.correct_words_or_phrases ?? [];
        correctAnswers = correctWordsOrPhrases.reduce(
          (acc: Record<string, string>, curr) => ({ ...acc, [curr]: curr }),
          {}
        );
      }
      return {
        ...question,
        correctAnswer: correctAnswers as unknown as QuestionWithMarkingResult["correctAnswer"],
        passageText: question.passageText || question.questionStemDiagram,
        questionStemDiagram: "",
      };
    }
    return question;
  });

  // Group questions by questionGroupId
  const questionGroupsMap = new Map<number, QuestionWithMarkingResult[]>();
  const questionsWithoutGroupId: QuestionWithMarkingResult[] = [];

  processedQuestions.forEach((question) => {
    const groupId = question.questionGroupId;
    if (!groupId) {
      console.warn(`Question ${question.legacyId} missing questionGroupId`);
      questionsWithoutGroupId.push(question);
      return;
    }

    if (!questionGroupsMap.has(groupId)) {
      questionGroupsMap.set(groupId, []);
    }
    questionGroupsMap.get(groupId)?.push(question);
  });

  // Convert grouped questions to QuestionGroups
  const questionGroups: QuestionGroup[] = Array.from(
    questionGroupsMap.entries()
  ).map(([groupId, questions]) => {
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
      stage: sortedQuestions[0].stage,
    };
  });

  // Add individual groups for questions without questionGroupId
  questionsWithoutGroupId.forEach((question, index) => {
    questionGroups.push({
      id: question.id, // Use question id as group id
      legacyId: question.legacyId,
      questionStem: question.questionStem || "",
      order: question.order || index,
      questions: [question],
      stage: question.stage,
    });
  });

  // Sort all groups by the order of their first question
  questionGroups.sort((a, b) => a.order - b.order);

  // Create pages array with textbook as first page
  const pages = [];

  // Always add textbook page as first page for practice sessions
  // If content is missing, the TextbookPage component will show an error message
  pages.push({
    type: QuestionSessionPageType.Textbook,
    content: lessonDetails.textbookContent || null,
    progress: 0,
  });

  // Add learn page after textbook if learn content exists
  if (lessonDetails.learnContent) {
    pages.push({
      type: QuestionSessionPageType.Learn,
      content: lessonDetails.learnContent,
      progress: 0,
    });
  }

  // Add question pages
  pages.push(
    ...questionGroups.map((questionGroup) => ({
      type: QuestionSessionPageType.Question,
      content: questionGroup,
      progress: 0,
    }))
  );

  const totalMarksPossible = processedQuestions.reduce(
    (sum, q) => sum + q.maxMark,
    0
  );

  const totalMarksAwarded = processedQuestions.reduce(
    (sum, q) => sum + (q.userMark || 0),
    0
  );

  return {
    id: `lesson-${lessonId}-${Date.now()}`,
    sessionType: SessionType.LessonSession,
    sessionTitle: lessonDetails.title,
    sessionSubtitle: "",
    gcseHigher,
    hasInsert: false,
    insertType: null,
    insertText: null,
    inputMode: lessonId.includes("Math") ? "math" : "text",
    isTimed: false,
    durationInMinutes: null,
    currentGrade: null,
    targetGrade: null,
    totalMarksAwarded,
    totalMarksPossible,
    questionCount: processedQuestions.length,
    timeStarted: new Date().toISOString(),
    timeFinished: null,
    isMarked: false,
    pages,
    questionHistory: [],
    masteryScores: undefined,
    mu: knowledgeModel?.mu ?? 0,
    sigma: knowledgeModel?.sigma ?? 1,
    p_mastery: knowledgeModel?.p_mastery ?? 0,
    mastery_tier: knowledgeModel?.mastery_tier ?? 1,
    rank: knowledgeModel?.rank ?? 0,
    learnFlowProgress: learnFlowProgress || null,
  };
}
