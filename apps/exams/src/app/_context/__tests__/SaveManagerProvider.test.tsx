import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  useSaveManager,
  SaveState,
  DEBOUNCE_MS,
  MAX_WAIT_MS,
  SaveManagerProvider,
} from "../SaveManagerProvider";
import { SessionType } from "@/app/(protected)/sessions/types";
import type { QuestionWithMarkingResult } from "@/app/types/types";
import type { ReactNode } from "react";

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

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("../UserProvider", () => ({
  useUser: () => ({
    refetchUser: mockRefetchUser,
    user: null,
    setUser: vi.fn(),
    loading: false,
    error: undefined,
    updateUser: vi.fn(),
  }),
}));

// ============================================================================
// Test Helpers
// ============================================================================

/** Minimal mock - only specify what you need */
const mockSave = (
  questionLegacyId: string,
  overrides: Partial<QuestionWithMarkingResult> = {}
): QuestionWithMarkingResult =>
  ({
    questionLegacyId,
    legacyId: questionLegacyId,
    userAnswer: "test",
    ...overrides,
  }) as QuestionWithMarkingResult;

/** Advance timers and wait for React to settle */
const advanceTimers = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

/** Wait for debounce to trigger */
const waitForDebounce = () => advanceTimers(DEBOUNCE_MS);

const defaultParams = {
  lessonId: "lesson-123",
  sessionType: SessionType.LessonSession,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <SaveManagerProvider>{children}</SaveManagerProvider>
  </QueryClientProvider>
);

// ============================================================================
// Tests
// ============================================================================

describe("useSaveManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockPut.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with SAVED state and no pending saves", () => {
    const { result } = renderHook(() => useSaveManager(defaultParams), {
      wrapper,
    });

    expect(result.current.saveState).toBe(SaveState.SAVED);
    expect(result.current.hasPendingSaves).toBe(false);
  });

  describe("debounce behavior", () => {
    it("does not call API before debounce timeout", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => result.current.addPendingSave(mockSave("q1")));

      // Wait just under debounce time - should NOT have called
      await advanceTimers(DEBOUNCE_MS - 100);
      expect(mockPut).not.toHaveBeenCalled();

      // Complete the debounce
      await advanceTimers(100);
      expect(mockPut).toHaveBeenCalledTimes(1);
    });

    it("resets debounce timer on new save", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => result.current.addPendingSave(mockSave("q1")));
      await advanceTimers(DEBOUNCE_MS - 100);

      // Add another save - resets the debounce
      act(() => result.current.addPendingSave(mockSave("q2")));
      await advanceTimers(DEBOUNCE_MS - 100);

      // Still hasn't fired (debounce reset)
      expect(mockPut).not.toHaveBeenCalled();

      // Complete the second debounce
      await advanceTimers(100);
      expect(mockPut).toHaveBeenCalledTimes(1);
      expect(mockPut.mock.calls[0][1].answers).toHaveLength(2);
    });

    it("sends at max wait regardless of debounce resets", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      // Keep resetting debounce by adding saves frequently
      const interval = DEBOUNCE_MS - 500;
      const iterations = Math.ceil(MAX_WAIT_MS / interval) + 1;

      for (let i = 0; i < iterations; i++) {
        act(() => result.current.addPendingSave(mockSave(`q${i}`)));
        await advanceTimers(interval);
      }

      // Should have fired due to max wait
      expect(mockPut).toHaveBeenCalledTimes(1);
    });
  });

  describe("deduplication", () => {
    it("keeps only newest save per question", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => {
        result.current.addPendingSave(mockSave("q1", { userAnswer: "v1" }));
        result.current.addPendingSave(mockSave("q1", { userAnswer: "v2" }));
        result.current.addPendingSave(mockSave("q1", { userAnswer: "v3" }));
      });

      await waitForDebounce();

      expect(mockPut).toHaveBeenCalledTimes(1);
      const answers = mockPut.mock.calls[0][1].answers;
      expect(answers).toHaveLength(1);
      expect(answers[0].user_answer).toBe("v3");
    });

    it("keeps saves for different questions", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => {
        result.current.addPendingSave(mockSave("q1"));
        result.current.addPendingSave(mockSave("q2"));
        result.current.addPendingSave(mockSave("q3"));
      });

      await waitForDebounce();

      expect(mockPut.mock.calls[0][1].answers).toHaveLength(3);
    });
  });

  describe("flush", () => {
    it("saves immediately when flushed", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => result.current.addPendingSave(mockSave("q1")));
      expect(mockPut).not.toHaveBeenCalled();

      await act(async () => result.current.flushPendingSaves());

      expect(mockPut).toHaveBeenCalledTimes(1);
      expect(result.current.hasPendingSaves).toBe(false);
    });

    it("clears debounce timers after flush", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => result.current.addPendingSave(mockSave("q1")));
      await act(async () => result.current.flushPendingSaves());

      await advanceTimers(10000);
      expect(mockPut).toHaveBeenCalledTimes(1);
    });

    it("does nothing when no pending saves", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      await act(async () => result.current.flushPendingSaves());
      expect(mockPut).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("restores saves to queue and sets ERROR state on failure", async () => {
      mockPut.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => result.current.addPendingSave(mockSave("q1")));
      await waitForDebounce();

      expect(result.current.saveState).toBe(SaveState.ERROR);
      expect(result.current.hasPendingSaves).toBe(true);
    });
  });

  describe("state transitions", () => {
    it("transitions SAVED → SAVING → SAVED on successful save", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      expect(result.current.saveState).toBe(SaveState.SAVED);

      act(() => result.current.addPendingSave(mockSave("q1")));
      expect(result.current.saveState).toBe(SaveState.SAVING);
      expect(result.current.hasPendingSaves).toBe(true);

      await waitForDebounce();

      expect(result.current.saveState).toBe(SaveState.SAVED);
      expect(result.current.hasPendingSaves).toBe(false);
    });
  });

  describe("filtering empty saves", () => {
    it("filters saves without meaningful content", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => {
        result.current.addPendingSave(
          mockSave("q1", {
            userAnswer: undefined,
            canvas: undefined,
            decorations: [],
          })
        );
      });

      await waitForDebounce();
      expect(mockPut).not.toHaveBeenCalled();
    });

    it("includes saves with canvas or decorations", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => {
        result.current.addPendingSave(
          mockSave("q1", {
            userAnswer: undefined,
            canvas: { paths: [] },
          })
        );
      });

      await waitForDebounce();
      expect(mockPut).toHaveBeenCalledTimes(1);
    });
  });

  describe("session types", () => {
    it.each([
      [SessionType.LessonSession, true],
      [SessionType.PracticeSession, true],
      [SessionType.MockSession, true],
      [SessionType.LearnSession, false],
    ])("sessionType %s saves = %s", async (sessionType, shouldSave) => {
      const { result } = renderHook(
        () => useSaveManager({ ...defaultParams, sessionType }),
        { wrapper }
      );

      act(() => result.current.addPendingSave(mockSave("q1")));
      await waitForDebounce();

      expect(mockPut).toHaveBeenCalledTimes(shouldSave ? 1 : 0);
    });

    it("uses paper endpoint for PaperSession", async () => {
      const { result } = renderHook(
        () =>
          useSaveManager({
            ...defaultParams,
            paperId: "paper-123",
            lessonId: undefined,
            sessionType: SessionType.PaperSession,
          }),
        { wrapper }
      );

      act(() => result.current.addPendingSave(mockSave("q1")));
      await waitForDebounce();

      // Paper endpoints include ?update_statistics=false when no saves have isFirstAnswer=true
      expect(mockPut).toHaveBeenCalledWith(
        "/papers/paper-123/answers?update_statistics=false",
        {
          answers: [expect.objectContaining({ question_legacy_id: "q1" })],
        }
      );
    });
  });

  describe("visibility change", () => {
    it("flushes when document becomes hidden", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => result.current.addPendingSave(mockSave("q1")));

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });

      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        // Allow microtasks to flush
        await Promise.resolve();
      });

      expect(mockPut).toHaveBeenCalledTimes(1);
    });
  });

  describe("API payload", () => {
    it("transforms camelCase to snake_case", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => {
        result.current.addPendingSave(
          mockSave("q1", {
            userMark: 3,
            isMarked: true,
            isMarkedForReview: false,
          })
        );
      });

      await waitForDebounce();

      expect(mockPut.mock.calls[0][1].answers[0]).toMatchObject({
        question_legacy_id: "q1",
        user_mark: 3,
        is_marked: true,
        is_marked_for_review: false,
      });
    });

    it("excludes undefined fields", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => {
        result.current.addPendingSave(
          mockSave("q1", { userMark: undefined, isMarked: undefined })
        );
      });

      await waitForDebounce();

      const answer = mockPut.mock.calls[0][1].answers[0];
      expect(answer).not.toHaveProperty("user_mark");
      expect(answer).not.toHaveProperty("is_marked");
    });
  });

  describe("refetchUser", () => {
    it("calls refetchUser when saving marked answer", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() =>
        result.current.addPendingSave(mockSave("q1", { isMarked: true }))
      );
      await waitForDebounce();

      expect(mockRefetchUser).toHaveBeenCalled();
    });

    it("does not call refetchUser for unmarked answers", async () => {
      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => result.current.addPendingSave(mockSave("q1")));
      await waitForDebounce();

      expect(mockRefetchUser).not.toHaveBeenCalled();
    });
  });

  describe("in-flight handling", () => {
    it("accumulates saves during in-flight request", async () => {
      let resolveApi: () => void;
      mockPut.mockImplementationOnce(
        () => new Promise<void>((r) => (resolveApi = r))
      );

      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => result.current.addPendingSave(mockSave("q1")));
      await waitForDebounce();
      expect(mockPut).toHaveBeenCalledTimes(1);

      // Add saves while in-flight
      act(() => {
        result.current.addPendingSave(mockSave("q2"));
        result.current.addPendingSave(mockSave("q3"));
      });

      await act(async () => resolveApi!());
      await waitForDebounce();

      expect(mockPut).toHaveBeenCalledTimes(2);
      expect(mockPut.mock.calls[1][1].answers).toHaveLength(2);
    });

    it("flushes immediately after completion when flush was called during in-flight", async () => {
      let resolveApi: () => void;
      mockPut.mockImplementationOnce(
        () => new Promise<void>((r) => (resolveApi = r))
      );

      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      act(() => result.current.addPendingSave(mockSave("q1")));
      await waitForDebounce();

      act(() => result.current.addPendingSave(mockSave("q2")));
      await act(async () => result.current.flushPendingSaves());

      expect(mockPut).toHaveBeenCalledTimes(1);

      // Resolve and let microtasks flush
      await act(async () => {
        resolveApi!();
        await Promise.resolve();
      });

      expect(mockPut).toHaveBeenCalledTimes(2);
    });

    it("prevents request pileup during slow API", async () => {
      const resolvers: (() => void)[] = [];
      mockPut.mockImplementation(
        () => new Promise<void>((r) => resolvers.push(r))
      );

      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      // Add first save and let debounce fire
      act(() => result.current.addPendingSave(mockSave("q1")));
      await waitForDebounce();
      expect(mockPut).toHaveBeenCalledTimes(1);

      // Add more saves while first is in-flight
      act(() => result.current.addPendingSave(mockSave("q2")));
      await waitForDebounce(); // Timer fires but should not start new request

      act(() => result.current.addPendingSave(mockSave("q3")));
      await waitForDebounce(); // Timer fires but should not start new request

      // Still only 1 in-flight (no pileup)
      expect(mockPut).toHaveBeenCalledTimes(1);

      // Resolve first request
      await act(async () => resolvers[0]());
      await waitForDebounce();

      // Now second batch should be sent
      expect(mockPut).toHaveBeenCalledTimes(2);
      expect(mockPut.mock.calls[1][1].answers).toHaveLength(2); // q2 and q3
    });

    it("timer callback does not start request when one is already in-flight", async () => {
      let resolveApi: () => void;
      mockPut.mockImplementationOnce(
        () => new Promise<void>((r) => (resolveApi = r))
      );

      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      // Start first save
      act(() => result.current.addPendingSave(mockSave("q1")));
      await waitForDebounce();
      expect(mockPut).toHaveBeenCalledTimes(1);

      // Add another save - this would schedule a timer
      act(() => result.current.addPendingSave(mockSave("q2")));

      // Even if debounce fires while first is in-flight, should not start new request
      await waitForDebounce();
      expect(mockPut).toHaveBeenCalledTimes(1); // Still only 1

      // After completion, accumulated saves should be sent
      await act(async () => resolveApi!());
      await waitForDebounce();
      expect(mockPut).toHaveBeenCalledTimes(2);
    });

    it("keeps SAVING state when pending saves exist after in-flight completes", async () => {
      let resolveApi: () => void;
      mockPut.mockImplementationOnce(
        () => new Promise<void>((r) => (resolveApi = r))
      );

      const { result } = renderHook(() => useSaveManager(defaultParams), {
        wrapper,
      });

      // Start first save
      act(() => result.current.addPendingSave(mockSave("q1")));
      await waitForDebounce();
      expect(result.current.saveState).toBe(SaveState.SAVING);

      // Add save while in-flight
      act(() => result.current.addPendingSave(mockSave("q2")));
      expect(result.current.hasPendingSaves).toBe(true);

      // Resolve first request - should NOT set to SAVED because pending saves exist
      // This prevents a window where beforeunload wouldn't warn about unsaved changes
      await act(async () => resolveApi!());

      // State should remain SAVING (not SAVED) because there are pending saves
      expect(result.current.saveState).toBe(SaveState.SAVING);
      expect(result.current.hasPendingSaves).toBe(true);

      // After the pending saves are sent and completed, state should be SAVED
      await waitForDebounce();
      expect(result.current.saveState).toBe(SaveState.SAVED);
      expect(result.current.hasPendingSaves).toBe(false);
    });
  });
});
