import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import axios, { AxiosError, AxiosHeaders } from "axios";
import {
  curriculumApiFetch,
  CurriculumApiError,
  RetryExhaustedError,
  DeadlineBudgetExhaustedError,
} from "../index";

// Mock next/headers - return no deadline by default for existing tests
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// Mock axios - keep isAxiosError as the real function
vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof axios>("axios");
  return {
    ...actual,
    default: Object.assign(vi.fn(), {
      isAxiosError: actual.isAxiosError,
    }),
  };
});

const mockedAxios = axios as unknown as ReturnType<typeof vi.fn> & {
  isAxiosError: typeof axios.isAxiosError;
};

// Helper to create AxiosError
function createAxiosError(
  status: number | undefined,
  code?: string,
  headers?: Record<string, string>
): AxiosError {
  const error = new AxiosError(
    `Request failed with status ${status}`,
    code,
    {
      headers: new AxiosHeaders(),
    } as never,
    undefined,
    status !== undefined
      ? {
          status,
          statusText: "Error",
          headers: headers ?? {},
          config: { headers: new AxiosHeaders() } as never,
          data: { error: "Test error" },
        }
      : undefined
  );
  return error;
}

describe("curriculumApiFetch", () => {
  const originalEnv = process.env.NEXT_PUBLIC_CURRICULUM_API_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    process.env.NEXT_PUBLIC_CURRICULUM_API_URL = "https://api.example.com";
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.NEXT_PUBLIC_CURRICULUM_API_URL = originalEnv;
  });

  describe("successful requests", () => {
    it("returns parsed JSON data on success", async () => {
      const mockData = { data: { id: 1, name: "Test User" } };
      mockedAxios.mockResolvedValueOnce({ data: mockData });

      const result = await curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledWith({
        url: "https://api.example.com/api/v2/users/me",
        method: "GET",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        timeout: 3000,
        data: undefined,
      });
    });

    it("uses custom method and body for non-GET requests", async () => {
      const mockData = { data: { success: true } };
      mockedAxios.mockResolvedValueOnce({ data: mockData });

      const body = { name: "New Name" };
      const result = await curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
        method: "POST",
        body,
      });

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "POST",
          data: body,
        })
      );
    });
  });

  describe("retry behavior for GET requests", () => {
    it("retries on 429 with Retry-After header (seconds)", async () => {
      const error429 = createAxiosError(429, undefined, { "retry-after": "2" });
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      // Advance time past the retry delay
      await vi.advanceTimersByTimeAsync(2100);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on 429 with backoff when Retry-After is missing", async () => {
      const error429 = createAxiosError(429);
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      // Advance time past the backoff delay (base 1000ms + jitter)
      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on 502 with exponential backoff", async () => {
      const error502 = createAxiosError(502);
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(error502)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on 503 with exponential backoff", async () => {
      const error503 = createAxiosError(503);
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(error503)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on 504 with exponential backoff", async () => {
      const error504 = createAxiosError(504);
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(error504)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on network timeout (ECONNABORTED)", async () => {
      const timeoutError = createAxiosError(undefined, "ECONNABORTED");
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on connection timeout (ETIMEDOUT)", async () => {
      const timeoutError = createAxiosError(undefined, "ETIMEDOUT");
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on connection refused (ECONNREFUSED)", async () => {
      const connRefusedError = createAxiosError(undefined, "ECONNREFUSED");
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(connRefusedError)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on connection reset (ECONNRESET)", async () => {
      const connResetError = createAxiosError(undefined, "ECONNRESET");
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(connResetError)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on DNS lookup failure (ENOTFOUND)", async () => {
      const dnsError = createAxiosError(undefined, "ENOTFOUND");
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(dnsError)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on network unreachable (ENETUNREACH)", async () => {
      const netUnreachError = createAxiosError(undefined, "ENETUNREACH");
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(netUnreachError)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on host unreachable (EHOSTUNREACH)", async () => {
      const hostUnreachError = createAxiosError(undefined, "EHOSTUNREACH");
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(hostUnreachError)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on broken pipe (EPIPE)", async () => {
      const pipeError = createAxiosError(undefined, "EPIPE");
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(pipeError)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("retries on Axios network error (ERR_NETWORK)", async () => {
      const networkError = createAxiosError(undefined, "ERR_NETWORK");
      const mockData = { data: { id: 1 } };

      mockedAxios
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: mockData });

      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      });

      await vi.advanceTimersByTimeAsync(1600);

      const result = await promise;

      expect(result).toEqual(mockData);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });
  });

  describe("non-retryable errors", () => {
    it("does not retry non-GET methods", async () => {
      const error503 = createAxiosError(503);

      mockedAxios.mockRejectedValueOnce(error503);

      await expect(
        curriculumApiFetch("/api/v2/users/me", {
          token: "test-token",
          method: "POST",
          body: { name: "Test" },
        })
      ).rejects.toBeInstanceOf(CurriculumApiError);

      expect(mockedAxios).toHaveBeenCalledTimes(1);
    });

    it("fails immediately on 400 Bad Request", async () => {
      const error400 = createAxiosError(400);

      mockedAxios.mockRejectedValueOnce(error400);

      await expect(
        curriculumApiFetch("/api/v2/users/me", { token: "test-token" })
      ).rejects.toBeInstanceOf(CurriculumApiError);

      expect(mockedAxios).toHaveBeenCalledTimes(1);
    });

    it("fails immediately on 401 Unauthorized", async () => {
      const error401 = createAxiosError(401);

      mockedAxios.mockRejectedValueOnce(error401);

      await expect(
        curriculumApiFetch("/api/v2/users/me", { token: "test-token" })
      ).rejects.toBeInstanceOf(CurriculumApiError);

      expect(mockedAxios).toHaveBeenCalledTimes(1);
    });

    it("fails immediately on 403 Forbidden", async () => {
      const error403 = createAxiosError(403);

      mockedAxios.mockRejectedValueOnce(error403);

      await expect(
        curriculumApiFetch("/api/v2/users/me", { token: "test-token" })
      ).rejects.toBeInstanceOf(CurriculumApiError);

      expect(mockedAxios).toHaveBeenCalledTimes(1);
    });

    it("fails immediately on 404 Not Found", async () => {
      const error404 = createAxiosError(404);

      mockedAxios.mockRejectedValueOnce(error404);

      await expect(
        curriculumApiFetch("/api/v2/users/me", { token: "test-token" })
      ).rejects.toBeInstanceOf(CurriculumApiError);

      expect(mockedAxios).toHaveBeenCalledTimes(1);
    });

    it("fails immediately on 500 Internal Server Error", async () => {
      const error500 = createAxiosError(500);

      mockedAxios.mockRejectedValueOnce(error500);

      await expect(
        curriculumApiFetch("/api/v2/users/me", { token: "test-token" })
      ).rejects.toBeInstanceOf(CurriculumApiError);

      expect(mockedAxios).toHaveBeenCalledTimes(1);
    });
  });

  describe("retry exhaustion", () => {
    it("throws RetryExhaustedError after max retries on 503", async () => {
      const error503 = createAxiosError(503);

      mockedAxios
        .mockRejectedValueOnce(error503)
        .mockRejectedValueOnce(error503);

      let caughtError: unknown;
      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      }).catch((e) => {
        caughtError = e;
      });

      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      expect(caughtError).toMatchObject({
        name: "RetryExhaustedError",
        attempts: 2,
        statusCode: 503,
      });
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("throws RetryExhaustedError after max retries on timeout", async () => {
      const timeoutError = createAxiosError(undefined, "ECONNABORTED");

      mockedAxios
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValueOnce(timeoutError);

      let caughtError: unknown;
      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      }).catch((e) => {
        caughtError = e;
      });

      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      expect(caughtError).toMatchObject({
        name: "RetryExhaustedError",
        attempts: 2,
      });
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it("respects custom maxRetries config", async () => {
      const error503 = createAxiosError(503);

      mockedAxios
        .mockRejectedValueOnce(error503)
        .mockRejectedValueOnce(error503)
        .mockRejectedValueOnce(error503);

      let caughtError: unknown;
      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
        retryConfig: { maxRetries: 2 },
      }).catch((e) => {
        caughtError = e;
      });

      await vi.advanceTimersByTimeAsync(5000);
      await promise;

      expect(caughtError).toMatchObject({
        name: "RetryExhaustedError",
        attempts: 3,
      });
      expect(mockedAxios).toHaveBeenCalledTimes(3);
    });
  });

  describe("error details", () => {
    it("includes response data in CurriculumApiError", async () => {
      const error400 = createAxiosError(400);

      mockedAxios.mockRejectedValueOnce(error400);

      await expect(
        curriculumApiFetch("/api/v2/users/me", { token: "test-token" })
      ).rejects.toMatchObject({
        statusCode: 400,
        response: { error: "Test error" },
      });
    });

    it("includes original error as cause", async () => {
      const error400 = createAxiosError(400);

      mockedAxios.mockRejectedValueOnce(error400);

      try {
        await curriculumApiFetch("/api/v2/users/me", { token: "test-token" });
      } catch (e) {
        expect(e).toBeInstanceOf(CurriculumApiError);
        expect((e as CurriculumApiError).cause).toBe(error400);
      }
    });
  });

  describe("configuration validation", () => {
    it("throws if NEXT_PUBLIC_CURRICULUM_API_URL is not set", async () => {
      delete process.env.NEXT_PUBLIC_CURRICULUM_API_URL;

      await expect(
        curriculumApiFetch("/api/v2/users/me", { token: "test-token" })
      ).rejects.toMatchObject({
        message: "NEXT_PUBLIC_CURRICULUM_API_URL is not configured",
      });
    });

    it("uses custom timeout from retryConfig", async () => {
      const mockData = { data: { id: 1 } };
      mockedAxios.mockResolvedValueOnce({ data: mockData });

      await curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
        retryConfig: { timeoutMs: 5000 },
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });
  });

  describe("unexpected errors", () => {
    it("wraps non-Axios errors in CurriculumApiError", async () => {
      const unexpectedError = new Error("Unexpected failure");
      mockedAxios.mockRejectedValueOnce(unexpectedError);

      await expect(
        curriculumApiFetch("/api/v2/users/me", { token: "test-token" })
      ).rejects.toMatchObject({
        name: "CurriculumApiError",
        message: expect.stringContaining("Unexpected failure"),
      });
    });
  });

  describe("deadline-aware retry behavior", () => {
    it("fast-fails when budget exhausted during delay calculation instead of sleeping", async () => {
      // Set up a deadline that will expire during delay calculation
      const { headers } = await import("next/headers");
      const mockedHeaders = vi.mocked(headers);
      const startTime = Date.now();
      // Deadline is 100ms from now - enough for first request but not for full backoff delay
      const deadline = startTime + 100;
      mockedHeaders.mockResolvedValue({
        get: vi.fn().mockReturnValue(String(deadline)),
      } as never);

      const error503 = createAxiosError(503);
      mockedAxios.mockRejectedValue(error503);

      const promiseStart = Date.now();
      let caughtError: unknown;
      const promise = curriculumApiFetch("/api/v2/users/me", {
        token: "test-token",
      }).catch((e) => {
        caughtError = e;
      });

      // Advance time past the deadline (but less than full backoff delay)
      // The first request should fail, then when calculating delay,
      // getRemainingBudget should return null and we should fast-fail
      await vi.advanceTimersByTimeAsync(150);
      await promise;

      // Should throw DeadlineBudgetExhaustedError, not sleep for full backoff
      expect(caughtError).toBeInstanceOf(DeadlineBudgetExhaustedError);
      expect((caughtError as DeadlineBudgetExhaustedError).attemptsMade).toBe(1);

      // Should NOT have waited for full backoff delay (which would be 1000-1500ms)
      // This verifies the fast-fail behavior
      const elapsed = Date.now() - promiseStart;
      expect(elapsed).toBeLessThan(500); // Well under the 1000ms base backoff

      // Reset mock to default (no deadline)
      mockedHeaders.mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as never);
    });
  });
});
