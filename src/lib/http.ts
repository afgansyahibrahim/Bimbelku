import axios from "axios";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
export const STORAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: "application/json",
  },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleRejectedResponse = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const requestUrl = String(error.config?.url || "");
    const ignoresExpiredSession = requestUrl.endsWith("/login") || requestUrl.endsWith("/logout");
    if (
      error.response?.status === 401
      && localStorage.getItem("token")
      && !ignoresExpiredSession
    ) {
      window.dispatchEvent(new Event("bimbelku:session-expired"));
    }
  }
  return Promise.reject(error);
};

http.interceptors.response.use(
  (response) => response,
  handleRejectedResponse,
);

// Beberapa halaman lama masih memakai axios langsung. Interceptor global ini
// menjaga perilaku sesi tetap konsisten sampai seluruh pemanggilan dimigrasikan.
axios.interceptors.response.use(
  (response) => response,
  handleRejectedResponse,
);

export function getApiError(error: unknown, fallback = "Terjadi kesalahan. Silakan coba lagi."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    if (data?.message) return data.message;
    const firstError = data?.errors ? Object.values(data.errors).flat()[0] : undefined;
    if (firstError) return firstError;
  }
  return fallback;
}

export default http;
