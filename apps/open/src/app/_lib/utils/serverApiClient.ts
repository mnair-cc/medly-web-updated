import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

type CreateServerClientParams = {
  backendUrl: string;
  accessToken: string;
  refreshToken?: string;
};

export function createServerCurriculumApiClient({
  backendUrl,
  accessToken,
  refreshToken,
}: CreateServerClientParams): AxiosInstance {
  let currentAccessToken = accessToken;
  let isRefreshing = false;
  let refreshPromise: Promise<string> | null = null;

  const client = axios.create({
    baseURL: backendUrl,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | (AxiosRequestConfig & {
            _retry?: boolean;
          })
        | undefined;

      if (
        error.response?.status === 401 &&
        refreshToken &&
        originalRequest &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;
        try {
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = axios
              .post<{ access_token: string }>(`${backendUrl}/auth/refresh`, {
                refresh_token: refreshToken,
              })
              .then((res) => {
                const newToken = res.data?.access_token;
                if (!newToken)
                  throw new Error("No access token returned on refresh");
                currentAccessToken = newToken;
                return newToken;
              })
              .finally(() => {
                isRefreshing = false;
              });
          }

          const newToken = await refreshPromise!;
          originalRequest.headers = originalRequest.headers ?? {};
          const headers = originalRequest.headers as Record<string, string>;
          headers.Authorization = `Bearer ${newToken}`;
          return client(originalRequest);
        } catch (refreshErr) {
          return Promise.reject(refreshErr);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}
