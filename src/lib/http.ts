import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
export const STORAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: "application/json",
  },
});

type CacheEntry = {
  expiresAt: number;
  response: AxiosResponse<unknown>;
};

type CachedGetConfig = AxiosRequestConfig & {
  maxAgeMs?: number;
  force?: boolean;
};

const responseCache = new Map<string, CacheEntry>();
const inFlightGets = new Map<string, Promise<AxiosResponse<unknown>>>();
const financialMutationKeys = new Map<string, { key: string; expiresAt: number }>();
const MAX_CACHE_ENTRIES = 80;
let cacheGeneration = 0;

type FinancialRequestConfig = AxiosRequestConfig & {
  bimbelkuFinanceKeySlot?: string;
};

const stableParams = (params: unknown): string => {
  if (!params || typeof params !== "object") return "";

  return JSON.stringify(
    Object.entries(params as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
};

const cacheKey = (url: string, config: AxiosRequestConfig): string => {
  const token = localStorage.getItem("token") || "public";
  return `${token}|${url}|${stableParams(config.params)}`;
};

const pruneCache = () => {
  const now = Date.now();
  for (const [key, entry] of responseCache) {
    if (entry.expiresAt <= now) responseCache.delete(key);
  }

  while (responseCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    responseCache.delete(oldestKey);
  }
};

export function clearApiCache(pathFragment?: string) {
  cacheGeneration += 1;
  if (!pathFragment) {
    responseCache.clear();
    inFlightGets.clear();
    return;
  }

  for (const key of responseCache.keys()) {
    if (key.includes(pathFragment)) responseCache.delete(key);
  }
  for (const key of inFlightGets.keys()) {
    if (key.includes(pathFragment)) inFlightGets.delete(key);
  }
}

export async function getCached<T = unknown>(
  url: string,
  config: CachedGetConfig = {},
): Promise<AxiosResponse<T>> {
  const {
    maxAgeMs = 30_000,
    force = false,
    ...requestConfig
  } = config;
  const key = cacheKey(url, requestConfig);
  const requestGeneration = cacheGeneration;
  const cached = responseCache.get(key);

  if (!force && cached && cached.expiresAt > Date.now()) {
    return cached.response as AxiosResponse<T>;
  }
  if (force) responseCache.delete(key);

  const pending = inFlightGets.get(key);
  if (pending) return pending as Promise<AxiosResponse<T>>;

  const request = http.get<T>(url, requestConfig)
    .then((response) => {
      if (requestGeneration === cacheGeneration) {
        responseCache.set(key, {
          expiresAt: Date.now() + Math.max(0, maxAgeMs),
          response,
        });
        pruneCache();
      }
      return response;
    })
    .finally(() => {
      inFlightGets.delete(key);
    });

  inFlightGets.set(key, request as Promise<AxiosResponse<unknown>>);
  return request;
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const method = config.method?.toLowerCase();
  const url = String(config.url || "");
  const financialMutation = method && !["get", "head", "options"].includes(method) && (
    /\/orders\/\d+\/pay$/.test(url)
    || url === "/student/packages"
    || url.includes("/teacher/bank")
    || url === "/teacher/payout-requests"
    || url.includes("/admin/verify-payment")
    || url.includes("/admin/payment-settings")
    || url.includes("/admin/commission-setting")
    || url.includes("/admin/payout")
    || url.includes("/admin/refunds/")
  );
  if (financialMutation && !config.headers["Idempotency-Key"]) {
    const slot = `${method}:${url}`;
    const existing = financialMutationKeys.get(slot);
    const key = existing && existing.expiresAt > Date.now()
      ? existing.key
      : typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `bimbelku-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    financialMutationKeys.set(slot, {
      key,
      expiresAt: Date.now() + 5 * 60_000,
    });
    config.headers["Idempotency-Key"] = key;
    (config as FinancialRequestConfig).bimbelkuFinanceKeySlot = slot;
  }
  return config;
});

const handleRejectedResponse = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const financeSlot = (error.config as FinancialRequestConfig | undefined)
      ?.bimbelkuFinanceKeySlot;
    if (financeSlot && error.response) {
      financialMutationKeys.delete(financeSlot);
    }
    const requestUrl = String(error.config?.url || "");
    const ignoresExpiredSession = requestUrl.endsWith("/login") || requestUrl.endsWith("/logout");
    if (
      error.response?.status === 401
      && localStorage.getItem("token")
      && !ignoresExpiredSession
    ) {
      clearApiCache();
      window.dispatchEvent(new Event("bimbelku:session-expired"));
    }
  }
  return Promise.reject(error);
};

http.interceptors.response.use(
  (response) => {
    const financeSlot = (response.config as FinancialRequestConfig)
      .bimbelkuFinanceKeySlot;
    if (financeSlot) financialMutationKeys.delete(financeSlot);
    const method = response.config.method?.toLowerCase();
    if (method && !["get", "head", "options"].includes(method)) {
      clearApiCache();
      window.dispatchEvent(new CustomEvent("bimbelku:data-changed", {
        detail: { url: String(response.config.url || "") },
      }));
    }
    return response;
  },
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
