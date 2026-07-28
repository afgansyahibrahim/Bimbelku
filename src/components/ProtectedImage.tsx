import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import http from "@/lib/http";

interface ProtectedImageProps {
  source: string;
  alt: string;
  className?: string;
}

const apiPath = (source: string) => source
  .replace(/^https?:\/\/[^/]+\/api\//, "")
  .replace(/^\/api\//, "")
  .replace(/^\//, "");

export async function openProtectedFile(source: string, filename = "bukti"): Promise<void> {
  if (/^https?:\/\//.test(source) && !source.includes("/api/")) {
    window.open(source, "_blank", "noopener,noreferrer");
    return;
  }

  const response = await http.get(apiPath(source), { responseType: "blob" });
  const objectUrl = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}

export default function ProtectedImage({ source, alt, className }: ProtectedImageProps) {
  const [resolved, setResolved] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    setResolved("");
    setFailed(false);

    if (/^https?:\/\//.test(source) && !source.includes("/api/")) {
      setResolved(source);
      return () => undefined;
    }

    void http.get(apiPath(source), { responseType: "blob" })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
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

  return <img src={resolved} alt={alt} className={className} />;
}
