import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  executeSaveAnswers,
  executeSaveAnswersBatch,
  buildSavePayloadByEndpoint,
} from "../saveManager.api";
import type { QuestionWithMarkingResult } from "@/app/types/types";

// ============================================================================
// Mocks
// ============================================================================

const { mockPut, mockRefetchUser } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockRefetchUser: vi.fn(),
}));

vi.mock("@/app/_lib/utils/axiosHelper", () => ({
  curriculumApiV2Client: { put: mockPut },
}));

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

describe("saveManager.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPut.mockResolvedValue({ data: { success: true } });
    mockRefetchUser.mockResolvedValue(undefined);
  });

  describe("executeSaveAnswers", () => {
    it("sends answers to the correct endpoint", async () => {
      const answers = [mockAnswer("q1"), mockAnswer("q2")];

      await executeSaveAnswers(answers, "/lessons/lesson-123/answers");

      expect(mockPut).toHaveBeenCalledTimes(1);
      expect(mockPut).toHaveBeenCalledWith("/lessons/lesson-123/answers", {
        answers: expect.arrayContaining([
          expect.objectContaining({ question_legacy_id: "q1" }),
          expect.objectContaining({ question_legacy_id: "q2" }),
        ]),
      });
    });

    it("does nothing when answers array is empty", async () => {
      await executeSaveAnswers([], "/lessons/lesson-123/answers");

      expect(mockPut).not.toHaveBeenCalled();
    });

    it("transforms answers to snake_case format", async () => {
      const answers = [
        mockAnswer("q1", {
          userAnswer: "answer",
          userMark: 5,
          isMarked: true,
          isMarkedForReview: false,
          markMax: 10,
        }),
      ];

      await executeSaveAnswers(answers, "/lessons/lesson-123/answers");

      expect(mockPut.mock.calls[0][1].answers[0]).toMatchObject({
        question_legacy_id: "q1",
        user_answer: "answer",
        user_mark: 5,
        is_marked: true,
        is_marked_for_review: false,
        mark_max: 10,
      });
    });

    it("handles API errors", async () => {
      const error = new Error("Network error");
      mockPut.mockRejectedValue(error);

      const answers = [mockAnswer("q1")];

      await expect(
        executeSaveAnswers(answers, "/lessons/lesson-123/answers")
      ).rejects.toThrow("Network error");
    });
  });

  describe("executeSaveAnswersBatch", () => {
    it("executes saves for multiple endpoints in parallel", async () => {
      const savesByEndpoint = new Map([
        [
          "/lessons/lesson-1/answers",
          { saves: [mockAnswer("q1"), mockAnswer("q2")] },
        ],
        ["/lessons/lesson-2/answers", { saves: [mockAnswer("q3")] }],
        ["/papers/paper-1/answers", { saves: [mockAnswer("q4")] }],
      ]);

      await executeSaveAnswersBatch(savesByEndpoint);

      expect(mockPut).toHaveBeenCalledTimes(3);
      expect(mockPut).toHaveBeenCalledWith("/lessons/lesson-1/answers", {
        answers: expect.arrayContaining([
          expect.objectContaining({ question_legacy_id: "q1" }),
          expect.objectContaining({ question_legacy_id: "q2" }),
        ]),
      });
      expect(mockPut).toHaveBeenCalledWith("/lessons/lesson-2/answers", {
        answers: expect.arrayContaining([
          expect.objectContaining({ question_legacy_id: "q3" }),
        ]),
      });
      // Paper endpoints include ?update_statistics=false when no saves have isFirstAnswer=true
      expect(mockPut).toHaveBeenCalledWith(
        "/papers/paper-1/answers?update_statistics=false",
        {
          answers: expect.arrayContaining([
            expect.objectContaining({ question_legacy_id: "q4" }),
          ]),
        }
      );
    });

    it("calls refetchUser when any answer is marked", async () => {
      const savesByEndpoint = new Map([
        [
          "/lessons/lesson-1/answers",
          { saves: [mockAnswer("q1", { isMarked: true })] },
        ],
        ["/lessons/lesson-2/answers", { saves: [mockAnswer("q2")] }],
      ]);

      await executeSaveAnswersBatch(savesByEndpoint, mockRefetchUser);

      expect(mockRefetchUser).toHaveBeenCalledTimes(1);
    });

    it("calls refetchUser when userMark is set", async () => {
      const savesByEndpoint = new Map([
        [
          "/lessons/lesson-1/answers",
          { saves: [mockAnswer("q1", { userMark: 5 })] },
        ],
      ]);

      await executeSaveAnswersBatch(savesByEndpoint, mockRefetchUser);

      expect(mockRefetchUser).toHaveBeenCalledTimes(1);
    });

    it("does not call refetchUser when no answers are marked", async () => {
      const savesByEndpoint = new Map([
        ["/lessons/lesson-1/answers", { saves: [mockAnswer("q1")] }],
      ]);

      await executeSaveAnswersBatch(savesByEndpoint, mockRefetchUser);

      expect(mockRefetchUser).not.toHaveBeenCalled();
    });

    it("does not call refetchUser when refetchUser is not provided", async () => {
      const savesByEndpoint = new Map([
        [
          "/lessons/lesson-1/answers",
          { saves: [mockAnswer("q1", { isMarked: true })] },
        ],
      ]);

      await executeSaveAnswersBatch(savesByEndpoint);

      expect(mockRefetchUser).not.toHaveBeenCalled();
    });

    it("calls refetchUser only once even if multiple endpoints have marked answers", async () => {
      const savesByEndpoint = new Map([
        [
          "/lessons/lesson-1/answers",
          { saves: [mockAnswer("q1", { isMarked: true })] },
        ],
        [
          "/lessons/lesson-2/answers",
          { saves: [mockAnswer("q2", { userMark: 5 })] },
        ],
        [
          "/papers/paper-1/answers",
          { saves: [mockAnswer("q3", { isMarked: true })] },
        ],
      ]);

      await executeSaveAnswersBatch(savesByEndpoint, mockRefetchUser);

      expect(mockRefetchUser).toHaveBeenCalledTimes(1);
    });

    it("handles errors from individual endpoints", async () => {
      mockPut
        .mockResolvedValueOnce({ data: { success: true } })
        .mockRejectedValueOnce(new Error("Network error"));

      const savesByEndpoint = new Map([
        ["/lessons/lesson-1/answers", { saves: [mockAnswer("q1")] }],
        ["/lessons/lesson-2/answers", { saves: [mockAnswer("q2")] }],
      ]);

      await expect(executeSaveAnswersBatch(savesByEndpoint)).rejects.toThrow(
        "Network error"
      );
    });

    it("handles empty savesByEndpoint map", async () => {
      await executeSaveAnswersBatch(new Map());

      expect(mockPut).not.toHaveBeenCalled();
    });
  });

  describe("buildSavePayloadByEndpoint", () => {
    it("builds payload for lesson saves", () => {
      const pendingLessonSaves = new Map([
        [
          "lesson-1",
          [
            mockAnswer("q1") as QuestionWithMarkingResult,
            mockAnswer("q2") as QuestionWithMarkingResult,
          ],
        ],
        ["lesson-2", [mockAnswer("q3") as QuestionWithMarkingResult]],
      ]);
      const pendingPaperSaves = new Map();

      const result = buildSavePayloadByEndpoint(
        pendingLessonSaves,
        pendingPaperSaves
      );

      expect(result.size).toBe(2);
      expect(result.get("/lessons/lesson-1/answers")).toEqual({
        saves: expect.arrayContaining([
          expect.objectContaining({ questionLegacyId: "q1" }),
          expect.objectContaining({ questionLegacyId: "q2" }),
        ]),
      });
      expect(result.get("/lessons/lesson-2/answers")).toEqual({
        saves: expect.arrayContaining([
          expect.objectContaining({ questionLegacyId: "q3" }),
        ]),
      });
    });

    it("builds payload for paper saves", () => {
      const pendingLessonSaves = new Map();
      const pendingPaperSaves = new Map([
        [
          "paper-1",
          [
            mockAnswer("q1") as QuestionWithMarkingResult,
            mockAnswer("q2") as QuestionWithMarkingResult,
          ],
        ],
        ["paper-2", [mockAnswer("q3") as QuestionWithMarkingResult]],
      ]);

      const result = buildSavePayloadByEndpoint(
        pendingLessonSaves,
        pendingPaperSaves
      );

      expect(result.size).toBe(2);
      expect(result.get("/papers/paper-1/answers")).toEqual({
        saves: expect.arrayContaining([
          expect.objectContaining({ questionLegacyId: "q1" }),
          expect.objectContaining({ questionLegacyId: "q2" }),
        ]),
      });
      expect(result.get("/papers/paper-2/answers")).toEqual({
        saves: expect.arrayContaining([
          expect.objectContaining({ questionLegacyId: "q3" }),
        ]),
      });
    });

    it("builds payload for both lesson and paper saves", () => {
      const pendingLessonSaves = new Map([
        ["lesson-1", [mockAnswer("q1") as QuestionWithMarkingResult]],
      ]);
      const pendingPaperSaves = new Map([
        ["paper-1", [mockAnswer("q2") as QuestionWithMarkingResult]],
      ]);

      const result = buildSavePayloadByEndpoint(
        pendingLessonSaves,
        pendingPaperSaves
      );

      expect(result.size).toBe(2);
      expect(result.has("/lessons/lesson-1/answers")).toBe(true);
      expect(result.has("/papers/paper-1/answers")).toBe(true);
    });

    it("skips empty save arrays", () => {
      const pendingLessonSaves = new Map([
        ["lesson-1", []],
        ["lesson-2", [mockAnswer("q1") as QuestionWithMarkingResult]],
      ]);
      const pendingPaperSaves = new Map([["paper-1", []]]);

      const result = buildSavePayloadByEndpoint(
        pendingLessonSaves,
        pendingPaperSaves
      );

      expect(result.size).toBe(1);
      expect(result.has("/lessons/lesson-2/answers")).toBe(true);
      expect(result.has("/lessons/lesson-1/answers")).toBe(false);
      expect(result.has("/papers/paper-1/answers")).toBe(false);
    });

    it("deduplicates saves by questionLegacyId", () => {
      const pendingLessonSaves = new Map([
        [
          "lesson-1",
          [
            {
              ...mockAnswer("q1", { userAnswer: "v1" }),
              timestamp: 1000,
            } as QuestionWithMarkingResult & { timestamp: number },
            {
              ...mockAnswer("q1", { userAnswer: "v2" }),
              timestamp: 2000,
            } as QuestionWithMarkingResult & { timestamp: number },
            {
              ...mockAnswer("q1", { userAnswer: "v3" }),
              timestamp: 1500,
            } as QuestionWithMarkingResult & { timestamp: number },
          ],
        ],
      ]);
      const pendingPaperSaves = new Map();

      const result = buildSavePayloadByEndpoint(
        pendingLessonSaves,
        pendingPaperSaves
      );

      const saves = result.get("/lessons/lesson-1/answers")?.saves || [];
      expect(saves).toHaveLength(1);
      expect(saves[0].userAnswer).toBe("v2"); // Latest timestamp
    });

    it("filters out saves without meaningful content", () => {
      const pendingLessonSaves = new Map([
        [
          "lesson-1",
          [
            mockAnswer("q1", {
              userAnswer: undefined,
              canvas: undefined,
              decorations: [],
            }) as QuestionWithMarkingResult,
            mockAnswer("q2", {
              userAnswer: "answer",
            }) as QuestionWithMarkingResult,
            mockAnswer("q3", {
              canvas: { paths: [] },
            }) as QuestionWithMarkingResult,
          ],
        ],
      ]);
      const pendingPaperSaves = new Map();

      const result = buildSavePayloadByEndpoint(
        pendingLessonSaves,
        pendingPaperSaves
      );

      const saves = result.get("/lessons/lesson-1/answers")?.saves || [];
      expect(saves).toHaveLength(2);
      expect(saves.some((s) => s.questionLegacyId === "q2")).toBe(true);
      expect(saves.some((s) => s.questionLegacyId === "q3")).toBe(true);
      expect(saves.some((s) => s.questionLegacyId === "q1")).toBe(false);
    });

    it("handles empty maps", () => {
      const result = buildSavePayloadByEndpoint(new Map(), new Map());

      expect(result.size).toBe(0);
    });
  });
});
