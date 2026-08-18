import { useEffect, useState } from "react";
import { ImageOff, Loader2, ScanSearch } from "lucide-react";
import http from "@/lib/http";
import {
  inferContentType,
  showFilePreview,
} from "@/lib/filePreview";

interface ProtectedImageProps {
  source: string;
  alt: string;
  className?: string;
  previewable?: boolean;
}

const apiPath = (source: string) => source
  .replace(/^https?:\/\/[^/]+\/api\//, "")
  .replace(/^\/api\//, "")
  .replace(/^\//, "");

export async function openProtectedFile(source: string, filename = "berkas"): Promise<void> {
  if (/^https?:\/\//.test(source) && !source.includes("/api/")) {
    showFilePreview({
      url: source,
      filename,
      contentType: inferContentType(source),
    });
    return;
  }

  const response = await http.get<Blob>(apiPath(source), { responseType: "blob" });
  const responseType = String(response.headers["content-type"] || "").split(";")[0];
  const blob = response.data.type || !responseType
    ? response.data
    : response.data.slice(0, response.data.size, responseType);
  const objectUrl = URL.createObjectURL(blob);

  showFilePreview({
    url: objectUrl,
    filename,
    contentType: blob.type || responseType || inferContentType(source),
    release: () => URL.revokeObjectURL(objectUrl),
  });
}

export default function ProtectedImage({
  source,
  alt,
  className,
  previewable = true,
}: ProtectedImageProps) {
  const [resolved, setResolved] = useState("");
  const [contentType, setContentType] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    setResolved("");
    setFailed(false);

    if (/^https?:\/\//.test(source) && !source.includes("/api/")) {
      setResolved(source);
      setContentType(inferContentType(source));
      return () => undefined;
    }

    void http.get(apiPath(source), { responseType: "blob" })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setContentType(
          response.data.type
          || String(response.headers["content-type"] || "").split(";")[0]
          || inferContentType(source),
        );
        setResolved(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);

  if (failed) {
    return <div className={`grid place-items-center bg-slate-100 text-slate-400 ${className || ""}`}><ImageOff /></div>;
  }

  if (!resolved) {
    return <div className={`grid place-items-center bg-slate-100 text-indigo-500 ${className || ""}`}><Loader2 className="animate-spin" /></div>;
  }

  if (!previewable) {
    return <img src={resolved} alt={alt} loading="lazy" decoding="async" className={className} />;
  }

  return (
    <button
      type="button"
      className={`group relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${className || ""}`}
      onClick={() => showFilePreview({
        url: resolved,
        filename: alt,
        contentType: contentType || inferContentType(source) || "image/jpeg",
      })}
      aria-label={`Perbesar ${alt}`}
    >
      <img src={resolved} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-contain" />
      <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-950/75 px-2.5 py-1.5 text-[11px] font-bold text-white opacity-90 shadow-lg backdrop-blur transition group-hover:bg-indigo-700">
        <ScanSearch size={14} /> Perbesar
      </span>
    </button>
  );
}
