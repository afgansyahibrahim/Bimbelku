import { useEffect, useMemo, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Sparkles, X } from "lucide-react";

type GuideTarget = {
  ref: RefObject<HTMLElement>;
  eyebrow: string;
  title: string;
  description: string;
};

interface PackageBuilderGuideProps {
  open: boolean;
  step: number;
  targets: GuideTarget[];
  onNext: () => void;
  onSkip: () => void;
}

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);

export default function PackageBuilderGuide({ open, step, targets, onNext, onSkip }: PackageBuilderGuideProps) {
  const [rect, setRect] = useState<TargetRect | null>(null);
  const target = targets[step];

  useEffect(() => {
    if (!open || !target?.ref.current) return;
    const element = target.ref.current;
    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    const update = () => {
      const next = element.getBoundingClientRect();
      setRect({
        top: next.top,
        left: next.left,
        width: next.width,
        height: next.height,
        bottom: next.bottom,
      });
    };

    const timer = window.setTimeout(update, 360);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step, target]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSkip, open]);

  const bubbleStyle = useMemo(() => {
    if (!rect || typeof window === "undefined") return undefined;
    const width = Math.min(360, window.innerWidth - 32);
    if (window.innerWidth < 640) {
      return { width, left: 16, bottom: 16 } as const;
    }

    const estimatedHeight = 245;
    const belowFits = rect.bottom + estimatedHeight + 24 < window.innerHeight;
    const top = belowFits ? rect.bottom + 16 : Math.max(16, rect.top - estimatedHeight - 16);
    const left = clamp(rect.left + rect.width / 2 - width / 2, 16, window.innerWidth - width - 16);
    return { width, left, top } as const;
  }, [rect]);

  if (!open || !target) return null;

  const isLast = step === targets.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[380]" role="dialog" aria-modal="true" aria-label="Panduan paket multi-mapel">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" />
      {rect && (
        <div
          className="pointer-events-none fixed rounded-2xl ring-4 ring-amber-300 ring-offset-4 ring-offset-white shadow-[0_0_0_9999px_rgba(15,23,42,0.08)]"
          style={{
            top: Math.max(8, rect.top - 4),
            left: Math.max(8, rect.left - 4),
            width: Math.max(40, rect.width + 8),
            height: Math.max(40, rect.height + 8),
          }}
        />
      )}

      <div className="fixed rounded-[1.75rem] border border-amber-200 bg-white p-5 shadow-2xl" style={bubbleStyle}>
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <Sparkles size={19} />
          </span>
          <button type="button" onClick={onSkip} aria-label="Lewati panduan" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[.18em] text-amber-700">{target.eyebrow}</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">{target.title}</h3>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{target.description}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={onSkip} className="text-sm font-black text-slate-500 hover:text-slate-900">Lewati</button>
          <button type="button" onClick={onNext} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800">
            {isLast ? "Selesai" : "Lanjutkan"}
            {!isLast && <ArrowRight size={16} />}
          </button>
        </div>
        <div className="mt-4 flex gap-1.5">
          {targets.map((_, index) => (
            <span key={index} className={`h-1.5 rounded-full transition-all ${index === step ? "w-7 bg-amber-500" : "w-2 bg-slate-200"}`} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
