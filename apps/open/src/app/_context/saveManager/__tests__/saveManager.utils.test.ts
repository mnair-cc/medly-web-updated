import { describe, it, expect } from "vitest";
import {
  transformToAnswerRequest,
  deduplicateSaves,
  filterMeaningfulSaves,
  hasMarkedAnswers,
  hasCanvasContentChanged,
} from "../saveManager.utils";
import type { QuestionWithMarkingResult } from "@/app/types/types";
import type { SaveWithTimestamp } from "../saveManager.types";

// ============================================================================
// Test Helpers
// ============================================================================

const mockAnswer = (
  questionLegacyId: string,
  overrides: Partial<QuestionWithMarkingResult> = {}
): Partial<QuestionWithMarkingResult> => ({
  questionLegacyId,
  legacyId: questionLegacyId,
  userAnswer: "test",
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe("saveManager.utils", () => {
  describe("transformToAnswerRequest", () => {
    it("transforms camelCase to snake_case", () => {
      const answer = mockAnswer("q1", {
        userAnswer: "answer",
        userMark: 5,
        markMax: 10,
        isMarked: true,
        isMarkedForReview: false,
        annotatedAnswer: "annotated",
        markingTable: "table",
        desmosExpressions: ["expr1", "expr2"],
        isFoundationalGap: true,
        isQuickFix: false,
        isSolvedWithMedly: true,
        messageCount: 3,
        durationSpentInSeconds: 120,
        answerAttempts: 2,
      });

      const result = transformToAnswerRequest(answer);

      expect(result).toMatchObject({
        question_legacy_id: "q1",
        user_answer: "answer",
        user_mark: 5,
        mark_max: 10,
        is_marked: true,
        is_marked_for_review: false,
        annotated_answer: "annotated",
        marking_table: "table",
        desmos_expressions: ["expr1", "expr2"],
        is_foundational_gap: true,
        is_quick_fix: false,
        is_solved_with_medly: true,
        message_count: 3,
        duration_spent_in_seconds: 120,
        answer_attempts: 2,
      });
    });

    it("uses questionLegacyId when available", () => {
      const answer = mockAnswer("q1", {
        questionLegacyId: "q1",
        legacyId: "legacy-1",
      });

      const result = transformToAnswerRequest(answer);

      expect(result.question_legacy_id).toBe("q1");
    });

    it("falls back to legacyId when questionLegacyId is not available", () => {
      const answer = {
        legacyId: "legacy-1",
        userAnswer: "test",
      } as Partial<QuestionWithMarkingResult>;

      const result = transformToAnswerRequest(answer);

      expect(result.question_legacy_id).toBe("legacy-1");
    });

    it("removes undefined and null fields", () => {
      const answer = mockAnswer("q1", {
        userMark: undefined,
        isMarked: undefined,
        markMax: null as unknown as undefined,
      });

      const result = transformToAnswerRequest(answer);

      expect(result).not.toHaveProperty("user_mark");
      expect(result).not.toHaveProperty("is_marked");
      expect(result).not.toHaveProperty("mark_max");
      expect(result).toHaveProperty("question_legacy_id");
      expect(result).toHaveProperty("user_answer");
    });

    it("handles all field types", () => {
      const answer = mockAnswer("q1", {
        userAnswer: "string",
        canvas: { paths: [] },
        decorations: [{ type: "circle" }],
        highlights: ["highlight1"],
        annotations: ["annotation1"],
        ao_analysis: { ao1: "analysis" },
        messages: [{ text: "message" }],
      });

      const result = transformToAnswerRequest(answer);

      expect(result.user_answer).toBe("string");
      expect(result.canvas).toEqual({ paths: [] });
      expect(result.decorations).toEqual([{ type: "circle" }]);
      expect(result.highlights).toEqual(["highlight1"]);
      expect(result.annotations).toEqual(["annotation1"]);
      expect(result.ao_analysis).toEqual({ ao1: "analysis" });
      expect(result.messages).toEqual([{ text: "message" }]);
    });

    it("handles empty answer", () => {
      const answer = {
        questionLegacyId: "q1",
      } as Partial<QuestionWithMarkingResult>;

      const result = transformToAnswerRequest(answer);

      expect(result.question_legacy_id).toBe("q1");
      expect(Object.keys(result).length).toBe(1);
    });
  });

  describe("deduplicateSaves", () => {
    it("keeps only the newest save per question", () => {
      const saves: SaveWithTimestamp[] = [
        {
          ...mockAnswer("q1", { userAnswer: "v1" }),
          timestamp: 1000,
        } as SaveWithTimestamp,
        {
          ...mockAnswer("q1", { userAnswer: "v2" }),
          timestamp: 2000,
        } as SaveWithTimestamp,
        {
          ...mockAnswer("q1", { userAnswer: "v3" }),
          timestamp: 1500,
        } as SaveWithTimestamp,
        {
          ...mockAnswer("q2", { userAnswer: "answer" }),
          timestamp: 3000,
        } as SaveWithTimestamp,
      ];

      const result = deduplicateSaves(saves);

      expect(result).toHaveLength(2);
      const q1Save = result.find((s) => s.questionLegacyId === "q1");
      const q2Save = result.find((s) => s.questionLegacyId === "q2");
      expect(q1Save?.userAnswer).toBe("v2"); // Latest timestamp
      expect(q2Save?.userAnswer).toBe("answer");
    });

    it("keeps save without timestamp if no timestamped version exists", () => {
      const saves: SaveWithTimestamp[] = [
        {
          ...mockAnswer("q1", { userAnswer: "v1" }),
        } as SaveWithTimestamp,
        {
          ...mockAnswer("q2", { userAnswer: "v2" }),
          timestamp: 1000,
        } as SaveWithTimestamp,
      ];

      const result = deduplicateSaves(saves);

      expect(result).toHaveLength(2);
      expect(result.some((s) => s.questionLegacyId === "q1")).toBe(true);
      expect(result.some((s) => s.questionLegacyId === "q2")).toBe(true);
    });

    it("keeps save with timestamp 0 over save without timestamp", () => {
      const saves: SaveWithTimestamp[] = [
        {
          ...mockAnswer("q1", { userAnswer: "v1" }),
        } as SaveWithTimestamp,
        {
          ...mockAnswer("q1", { userAnswer: "v2" }),
          timestamp: 0,
        } as SaveWithTimestamp,
      ];

      const result = deduplicateSaves(saves);

      expect(result).toHaveLength(1);
      expect(result[0].userAnswer).toBe("v2");
    });

    it("handles saves with same timestamp (keeps last one)", () => {
      const saves: SaveWithTimestamp[] = [
        {
          ...mockAnswer("q1", { userAnswer: "v1" }),
          timestamp: 1000,
        } as SaveWithTimestamp,
        {
          ...mockAnswer("q1", { userAnswer: "v2" }),
          timestamp: 1000,
        } as SaveWithTimestamp,
      ];

      const result = deduplicateSaves(saves);

      expect(result).toHaveLength(1);
      expect(result[0].userAnswer).toBe("v2"); // Last one wins
    });

    it("handles empty array", () => {
      const result = deduplicateSaves([]);

      expect(result).toHaveLength(0);
    });

    it("handles single save", () => {
      const saves: SaveWithTimestamp[] = [
        {
          ...mockAnswer("q1", { userAnswer: "v1" }),
          timestamp: 1000,
        } as SaveWithTimestamp,
      ];

      const result = deduplicateSaves(saves);

      expect(result).toHaveLength(1);
      expect(result[0].userAnswer).toBe("v1");
    });

    it("handles saves for different questions", () => {
      const saves: SaveWithTimestamp[] = [
        {
          ...mockAnswer("q1", { userAnswer: "v1" }),
          timestamp: 1000,
        } as SaveWithTimestamp,
        {
          ...mockAnswer("q2", { userAnswer: "v2" }),
          timestamp: 2000,
        } as SaveWithTimestamp,
        {
          ...mockAnswer("q3", { userAnswer: "v3" }),
          timestamp: 3000,
        } as SaveWithTimestamp,
      ];

      const result = deduplicateSaves(saves);

      expect(result).toHaveLength(3);
    });
  });

  describe("filterMeaningfulSaves", () => {
    it("keeps saves with userAnswer", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", { userAnswer: "answer" }) as QuestionWithMarkingResult,
        mockAnswer("q2", { userAnswer: "" }) as QuestionWithMarkingResult,
        mockAnswer("q3", { userAnswer: undefined }) as QuestionWithMarkingResult,
      ];

      const result = filterMeaningfulSaves(saves);

      expect(result).toHaveLength(1);
      expect(result[0].questionLegacyId).toBe("q1");
    });

    it("keeps saves with canvas (even if empty, to persist erased strokes)", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", {
          userAnswer: undefined,
          canvas: { paths: [] },
        }) as QuestionWithMarkingResult,
        mockAnswer("q2", {
          userAnswer: undefined,
          canvas: undefined,
        }) as QuestionWithMarkingResult,
      ];

      const result = filterMeaningfulSaves(saves);

      expect(result).toHaveLength(1);
      expect(result[0].questionLegacyId).toBe("q1");
    });

    it("keeps saves with decorations", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", {
          userAnswer: undefined,
          canvas: undefined,
          decorations: [{ type: "circle" }],
        }) as QuestionWithMarkingResult,
        mockAnswer("q2", {
          userAnswer: undefined,
          canvas: undefined,
          decorations: [],
        }) as QuestionWithMarkingResult,
      ];

      const result = filterMeaningfulSaves(saves);

      expect(result).toHaveLength(1);
      expect(result[0].questionLegacyId).toBe("q1");
    });

    it("keeps saves with highlights", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", {
          userAnswer: undefined,
          highlights: [{ strong: ["test"], weak: [] }],
        }) as QuestionWithMarkingResult,
      ];
      expect(filterMeaningfulSaves(saves)).toHaveLength(1);
    });

    it("keeps saves with annotations", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", {
          userAnswer: undefined,
          annotations: [{ strong: ["test"], weak: [] }],
        }) as QuestionWithMarkingResult,
      ];
      expect(filterMeaningfulSaves(saves)).toHaveLength(1);
    });

    it("keeps saves with messages", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", {
          userAnswer: undefined,
          messages: [{ message: "hello", type: "userMessage" }],
        }) as QuestionWithMarkingResult,
      ];
      expect(filterMeaningfulSaves(saves)).toHaveLength(1);
    });

    it("keeps saves with flags (isSolvedWithMedly, etc.)", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", {
          userAnswer: undefined,
          isSolvedWithMedly: true,
        }) as QuestionWithMarkingResult,
        mockAnswer("q2", {
          userAnswer: undefined,
          isQuickFix: true,
        }) as QuestionWithMarkingResult,
        mockAnswer("q3", {
          userAnswer: undefined,
          isFoundationalGap: true,
        }) as QuestionWithMarkingResult,
      ];
      expect(filterMeaningfulSaves(saves)).toHaveLength(3);
    });

    it("keeps saves with marking results (annotatedAnswer, etc.)", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", {
          userAnswer: undefined,
          annotatedAnswer: "well done",
        }) as QuestionWithMarkingResult,
        mockAnswer("q2", {
          userAnswer: undefined,
          markingTable: "table-data",
        }) as QuestionWithMarkingResult,
        mockAnswer("q3", {
          userAnswer: undefined,
          ao_analysis: [{ ao_number: 1 } as any],
        }) as QuestionWithMarkingResult,
      ];
      expect(filterMeaningfulSaves(saves)).toHaveLength(3);
    });

    it("handles all meaningful content", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", { userAnswer: "answer" }) as QuestionWithMarkingResult,
        mockAnswer("q2", { canvas: { paths: [] } }) as QuestionWithMarkingResult,
        mockAnswer("q3", { decorations: [{ type: "circle" }] }) as QuestionWithMarkingResult,
        mockAnswer("q4", {
          userAnswer: undefined,
          canvas: undefined,
          decorations: [],
        }) as QuestionWithMarkingResult,
      ];

      const result = filterMeaningfulSaves(saves);

      expect(result).toHaveLength(3);
      expect(result.some((s) => s.questionLegacyId === "q1")).toBe(true);
      expect(result.some((s) => s.questionLegacyId === "q2")).toBe(true);
      expect(result.some((s) => s.questionLegacyId === "q3")).toBe(true);
      expect(result.some((s) => s.questionLegacyId === "q4")).toBe(false);
    });

    it("handles empty array", () => {
      const result = filterMeaningfulSaves([]);

      expect(result).toHaveLength(0);
    });

    it("handles empty string userAnswer as not meaningful", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", { userAnswer: "" }) as QuestionWithMarkingResult,
      ];

      const result = filterMeaningfulSaves(saves);

      expect(result).toHaveLength(0);
    });

    it("handles null userAnswer as not meaningful", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", { userAnswer: null as unknown as undefined }) as QuestionWithMarkingResult,
      ];

      const result = filterMeaningfulSaves(saves);

      expect(result).toHaveLength(0);
    });

    it("keeps saves with isMarkedForReview true", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", {
          userAnswer: undefined,
          canvas: undefined,
          decorations: [],
          isMarkedForReview: true,
        }) as QuestionWithMarkingResult,
        mockAnswer("q2", {
          userAnswer: undefined,
          canvas: undefined,
          decorations: [],
          isMarkedForReview: false,
        }) as QuestionWithMarkingResult,
      ];

      const result = filterMeaningfulSaves(saves);

      expect(result).toHaveLength(1);
      expect(result[0].questionLegacyId).toBe("q1");
    });

    it("keeps saves with isMarked true", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", {
          userAnswer: undefined,
          canvas: undefined,
          decorations: [],
          isMarked: true,
        }) as QuestionWithMarkingResult,
      ];

      const result = filterMeaningfulSaves(saves);

      expect(result).toHaveLength(1);
      expect(result[0].questionLegacyId).toBe("q1");
    });

    it("keeps saves with userMark set", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", {
          userAnswer: undefined,
          canvas: undefined,
          decorations: [],
          userMark: 5,
        }) as QuestionWithMarkingResult,
      ];

      const result = filterMeaningfulSaves(saves);

      expect(result).toHaveLength(1);
      expect(result[0].questionLegacyId).toBe("q1");
    });

    it("keeps saves with desmosExpressions", () => {
      const saves: QuestionWithMarkingResult[] = [
        mockAnswer("q1", {
          userAnswer: undefined,
          canvas: undefined,
          decorations: [],
          desmosExpressions: ["y=x^2", "y=2x+1"],
        }) as QuestionWithMarkingResult,
        mockAnswer("q2", {
          userAnswer: undefined,
          canvas: undefined,
          decorations: [],
          desmosExpressions: [],
        }) as QuestionWithMarkingResult,
      ];

      const result = filterMeaningfulSaves(saves);

      expect(result).toHaveLength(1);
      expect(result[0].questionLegacyId).toBe("q1");
    });
  });

  describe("hasMarkedAnswers", () => {
    it("returns true when isMarked is true", () => {
      const answers = [
        mockAnswer("q1", { isMarked: true }),
        mockAnswer("q2"),
      ];

      expect(hasMarkedAnswers(answers)).toBe(true);
    });

    it("returns true when userMark is a number", () => {
      const answers = [
        mockAnswer("q1", { userMark: 5 }),
        mockAnswer("q2"),
      ];

      expect(hasMarkedAnswers(answers)).toBe(true);
    });

    it("returns true when userMark is 0", () => {
      const answers = [
        mockAnswer("q1", { userMark: 0 }),
      ];

      expect(hasMarkedAnswers(answers)).toBe(true);
    });

    it("returns false when no answers are marked", () => {
      const answers = [
        mockAnswer("q1"),
        mockAnswer("q2"),
      ];

      expect(hasMarkedAnswers(answers)).toBe(false);
    });

    it("returns false when isMarked is false", () => {
      const answers = [
        mockAnswer("q1", { isMarked: false }),
        mockAnswer("q2"),
      ];

      expect(hasMarkedAnswers(answers)).toBe(false);
    });

    it("returns false when userMark is undefined", () => {
      const answers = [
        mockAnswer("q1", { userMark: undefined }),
      ];

      expect(hasMarkedAnswers(answers)).toBe(false);
    });

    it("returns false for empty array", () => {
      expect(hasMarkedAnswers([])).toBe(false);
    });

    it("returns true if any answer in batch is marked", () => {
      const answers = [
        mockAnswer("q1"),
        mockAnswer("q2", { isMarked: true }),
        mockAnswer("q3"),
      ];

      expect(hasMarkedAnswers(answers)).toBe(true);
    });
  });

  describe("hasCanvasContentChanged", () => {
    it("returns false if both are undefined", () => {
      expect(hasCanvasContentChanged(undefined, undefined)).toBe(false);
    });

    it("returns false if contents are identical", () => {
      const canvas = {
        textboxes: [{ text: "hello", x: 0, y: 0, fontSize: 12, color: "black" }],
        maths: [{ latex: "x^2", x: 10, y: 10, fontSize: 14, color: "red" }],
      };
      expect(hasCanvasContentChanged(canvas, { ...canvas })).toBe(false);
    });

    it("detects textbox text change", () => {
      const c1 = { textboxes: [{ text: "a", x: 0, y: 0, fontSize: 12, color: "black" }] };
      const c2 = { textboxes: [{ text: "b", x: 0, y: 0, fontSize: 12, color: "black" }] };
      expect(hasCanvasContentChanged(c1, c2)).toBe(true);
    });

    it("detects textbox fontSize change", () => {
      const c1 = { textboxes: [{ text: "a", x: 0, y: 0, fontSize: 12, color: "black" }] };
      const c2 = { textboxes: [{ text: "a", x: 0, y: 0, fontSize: 14, color: "black" }] };
      expect(hasCanvasContentChanged(c1, c2)).toBe(true);
    });

    it("detects math latex change", () => {
      const c1 = { maths: [{ latex: "x", x: 0, y: 0, fontSize: 12, color: "black" }] };
      const c2 = { maths: [{ latex: "y", x: 0, y: 0, fontSize: 12, color: "black" }] };
      expect(hasCanvasContentChanged(c1, c2)).toBe(true);
    });

    it("detects math color change", () => {
      const c1 = { maths: [{ latex: "x", x: 0, y: 0, fontSize: 12, color: "black" }] };
      const c2 = { maths: [{ latex: "x", x: 0, y: 0, fontSize: 12, color: "blue" }] };
      expect(hasCanvasContentChanged(c1, c2)).toBe(true);
    });

    it("detects math fontSize change", () => {
      const c1 = { maths: [{ latex: "x", x: 0, y: 0, fontSize: 12, color: "black" }] };
      const c2 = { maths: [{ latex: "x", x: 0, y: 0, fontSize: 14, color: "black" }] };
      expect(hasCanvasContentChanged(c1, c2)).toBe(true);
    });

    it("ignores empty textboxes", () => {
      const c1 = { textboxes: [] };
      const c2 = { textboxes: [{ text: "", x: 0, y: 0, fontSize: 12, color: "black" }] };
      const c3 = { textboxes: [{ text: "  ", x: 0, y: 0, fontSize: 12, color: "black" }] };
      expect(hasCanvasContentChanged(c1, c2)).toBe(false);
      expect(hasCanvasContentChanged(c1, c3)).toBe(false);
    });

    it("ignores empty maths", () => {
      const c1 = { maths: [] };
      const c2 = { maths: [{ latex: "", x: 0, y: 0, fontSize: 12, color: "black" }] };
      expect(hasCanvasContentChanged(c1, c2)).toBe(false);
    });
  });
});

