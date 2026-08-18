export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
export const STORAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

export function publicMediaUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(?:data:|blob:)/i.test(trimmed)) return trimmed;

  let path = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const publicMediaMarker = "/api/public-media/";
      const storageMarker = "/storage/";
      if (parsed.pathname.includes(publicMediaMarker)) {
        path = parsed.pathname.split(publicMediaMarker)[1] || "";
      } else if (parsed.pathname.includes(storageMarker)) {
        path = parsed.pathname.split(storageMarker)[1] || "";
      } else {
        return trimmed;
      }
    } catch {
      return trimmed;
    }
  }

  path = path
    .replace(/^\/+/, "")
    .replace(/^(?:api\/public-media\/|storage\/)/, "");
  if (!path || path.includes("..")) return null;

  const encoded = path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
  return encoded ? `${API_BASE_URL}/public-media/${encoded}` : null;
}
