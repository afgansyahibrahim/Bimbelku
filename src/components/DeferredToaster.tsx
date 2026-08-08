import { lazy, Suspense, useEffect, useState } from "react";
import { scheduleNonCriticalTask } from "@/lib/schedule";

const Toaster = lazy(() => import("@/components/ui/sonner").then((module) => ({ default: module.Toaster })));

export default function DeferredToaster() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    const activate = () => setReady(true);
    const cancelScheduledActivation = scheduleNonCriticalTask(activate);
    window.addEventListener("bimbelku:toast-needed", activate, { once: true });
    window.addEventListener("pointerdown", activate, { once: true, passive: true });
    window.addEventListener("keydown", activate, { once: true });

    return () => {
      cancelScheduledActivation();
      window.removeEventListener("bimbelku:toast-needed", activate);
      window.removeEventListener("pointerdown", activate);
      window.removeEventListener("keydown", activate);
    };
  }, [ready]);

  return ready ? (
    <Suspense fallback={null}>
      <Toaster position="top-center" richColors closeButton />
    </Suspense>
  ) : null;
}
