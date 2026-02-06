import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { getSession, signOut } from "next-auth/react";
import * as Sentry from "@sentry/nextjs";

// Extended config type to store span reference
interface AxiosConfigWithSpan extends InternalAxiosRequestConfig {
  _sentrySpan?: ReturnType<typeof Sentry.startInactiveSpan>;
  _sentryStartTime?: number;
}

/**
 * Creates a Sentry span for an outgoing HTTP request.
 * The span is started but not ended - call endSpan in the response interceptor.
 */
function startHttpSpan(config: AxiosConfigWithSpan): void {
  // Skip if span already exists (e.g., this is a retry after token refresh)
  // Creating a new span would orphan the existing one, causing a resource leak
  if (config._sentrySpan) {
    return;
  }

  const method = config.method?.toUpperCase() ?? "GET";
  const url = config.url ?? "unknown";
  const baseURL = config.baseURL ?? "";
  const fullUrl = url.startsWith("http") ? url : `${baseURL}${url}`;

  // Parse URL to get a clean description
  let urlPath: string;
  try {
    const parsedUrl = new URL(fullUrl);
    urlPath = parsedUrl.pathname;
  } catch {
    urlPath = url;
  }

  const span = Sentry.startInactiveSpan({
    name: `${method} ${urlPath}`,
    op: "http.client",
    attributes: {
      "http.request.method": method,
      "http.url": fullUrl,
      "server.address": baseURL,
    },
  });

  config._sentrySpan = span;
  config._sentryStartTime = Date.now();
}

/**
 * Ends the Sentry span for an HTTP request with success status.
 */
function endHttpSpanSuccess(response: AxiosResponse): void {
  const config = response.config as AxiosConfigWithSpan;
  const span = config._sentrySpan;

  if (span) {
    span.setAttribute("http.response.status_code", response.status);
    span.setStatus({ code: 1, message: "ok" }); // SpanStatusCode.OK = 1
    span.end();
  }
}

/**
 * Ends the Sentry span for an HTTP request with error status.
 */
function endHttpSpanError(error: AxiosError): void {
  const config = error.config as AxiosConfigWithSpan | undefined;
  const span = config?._sentrySpan;

  if (span) {
    const statusCode = error.response?.status;
    if (statusCode) {
      span.setAttribute("http.response.status_code", statusCode);
    }
    span.setStatus({ code: 2, message: error.message }); // SpanStatusCode.ERROR = 2
    span.end();
  }
}

// Base axios instance for Next.js API routes
export const nextApiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 second timeout for internal API routes
});

// Add Sentry span interceptors for Next.js API client
nextApiClient.interceptors.request.use((config) => {
  startHttpSpan(config as AxiosConfigWithSpan);
  return config;
});

nextApiClient.interceptors.response.use(
  (response) => {
    endHttpSpanSuccess(response);
    return response;
  },
  (error: AxiosError) => {
    endHttpSpanError(error);
    return Promise.reject(error);
  }
);

// Base axios instance for external curriculum API (V1 - no /api prefix)
export const curriculumApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_CURRICULUM_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout for external curriculum API
});

// Track if a refresh is in progress to prevent concurrent refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Base axios instance for curriculum API v2
export const curriculumApiV2Client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_CURRICULUM_API_URL + "/api/v2",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout for external curriculum API
});

// Add auth token interceptor for curriculum API
curriculumApiClient.interceptors.request.use(async (config) => {
  // Start Sentry span for tracing
  startHttpSpan(config as AxiosConfigWithSpan);

  // Use broadcast: false to prevent triggering SessionProvider re-renders
  const session = await getSession({ broadcast: false });
  const token = session?.databaseApiAccessToken;

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Add response interceptor to end Sentry spans on success
curriculumApiClient.interceptors.response.use(
  (response) => {
    endHttpSpanSuccess(response);
    return response;
  },
  // Error handling is done in the next interceptor
  undefined
);

// Add response interceptor to handle 401 errors and refresh tokens
curriculumApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // End the Sentry span with error status (unless this is a retry)
    const originalRequest = error.config as AxiosConfigWithSpan & {
      _retry?: boolean;
    };

    // Only end span on final failure (not before retry attempts)
    const shouldEndSpan =
      error.response?.status !== 401 || originalRequest._retry;
    if (shouldEndSpan) {
      endHttpSpanError(error);
    }

    // If error is not 401, or request was already retried, reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return curriculumApiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Use broadcast: false to prevent triggering SessionProvider re-renders
      const session = await getSession({ broadcast: false });
      const refreshToken = session?.databaseApiRefreshToken;

      if (!refreshToken) {
        // No refresh token available - logout user
        await signOut({ redirect: true, callbackUrl: "/auth/login" });
        throw new Error("No refresh token available");
      }

      // Call refresh endpoint
      const refreshResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_CURRICULUM_API_URL}/auth/refresh`,
        {
          refresh_token: refreshToken,
        }
      );

      const newAccessToken = refreshResponse.data.access_token;

      if (!newAccessToken) {
        throw new Error("No access token in refresh response");
      }

      // Update the original request with the new token
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      // Process queued requests
      processQueue(null, newAccessToken);

      // Retry the original request
      return curriculumApiClient(originalRequest);
    } catch (refreshError) {
      // If refresh fails, reject all queued requests
      processQueue(refreshError as Error, null);

      // If refresh endpoint returned 401, the refresh token is invalid/expired - logout user
      if (
        axios.isAxiosError(refreshError) &&
        refreshError.response?.status === 401
      ) {
        // Refresh token is invalid/expired - logout user
        await signOut({ redirect: true, callbackUrl: "/auth/login" });
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Add auth token interceptor for curriculum API v2
curriculumApiV2Client.interceptors.request.use(async (config) => {
  // Start Sentry span for tracing
  startHttpSpan(config as AxiosConfigWithSpan);

  // Use broadcast: false to prevent triggering SessionProvider re-renders
  const session = await getSession({ broadcast: false });
  const token = session?.databaseApiAccessToken;

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Add response interceptor to end Sentry spans for v2 client
curriculumApiV2Client.interceptors.response.use(
  (response) => {
    endHttpSpanSuccess(response);
    return response;
  },
  (error: AxiosError) => {
    endHttpSpanError(error);
    return Promise.reject(error);
  }
);
