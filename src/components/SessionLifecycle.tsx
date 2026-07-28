import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";

export const SESSION_EXPIRED_EVENT = "bimbelku:session-expired";

export default function SessionLifecycle() {
  const navigate = useNavigate();
  const handledRef = useRef(false);
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const handleExpired = () => {
      if (handledRef.current) return;
      handledRef.current = true;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("bimbelku_payment_order");
      toast.warning("Sesi telah berakhir. Silakan masuk kembali.");
      navigate("/login", { replace: true });
      window.setTimeout(() => {
        handledRef.current = false;
      }, 1500);
    };
    const handleOffline = () => setOffline(true);
    const handleOnline = () => {
      setOffline(false);
      toast.success("Koneksi internet tersambung kembali.");
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [navigate]);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-x-3 top-3 z-[300] mx-auto flex max-w-xl items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-900 shadow-xl"
    >
      <WifiOff size={17} className="shrink-0" />
      Koneksi terputus. Data yang belum dikirim tetap berada di formulir.
    </div>
  );
}
