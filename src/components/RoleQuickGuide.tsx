import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, X } from "lucide-react";
import { useLocation } from "react-router-dom";

import { getCached } from "@/lib/http";

type Role = "student" | "teacher";
type Step = { id?: number; title: string; body: string; image_url?: string | null };
type Tutorial = { id: number; title: string; description?: string | null; steps: Step[] };

const fallback: Record<Role, Tutorial> = {
  student: {
    id: -1,
    title: "Panduan murid",
    description: "Paket belajar disusun sebelum radar mencari tutor.",
    steps: [
      { title: "Pilih paket", body: "Tentukan jumlah sesi yang sesuai dengan targetmu." },
      { title: "Atur mapel dan jadwal", body: "Bagikan sesi lalu pilih slot satu jam untuk setiap pertemuan." },
      { title: "Bayar setelah tutor cocok", body: "Tagihan dibuka setelah seluruh tutor menerima permintaan." },
    ],
  },
  teacher: {
    id: -2,
    title: "Panduan tutor",
    description: "Periksa seluruh jadwal sebelum menerima paket.",
    steps: [
      { title: "Buka permintaan", body: "Periksa mapel, jenjang, mode, dan semua jadwal." },
      { title: "Berikan keputusan", body: "Terima hanya saat seluruh sesi dapat dijalankan." },
      { title: "Mulai kelas", body: "Jadwal aktif setelah pembayaran murid diverifikasi." },
    ],
  },
};

const contextForPath = (path: string) => {
  if (path.includes("/packages/new")) return "package-builder";
  if (path.includes("/packages")) return "packages";
  if (path.includes("/vouchers")) return "vouchers";
  if (path.includes("/my-classes") || path.includes("/kelas")) return "classes";
  if (path.includes("/profile")) return "account";
  return "dashboard";
};

export default function RoleQuickGuide({ role }: { role: Role }) {
  const location = useLocation();
  const context = useMemo(() => contextForPath(location.pathname), [location.pathname]);
  const [tutorial, setTutorial] = useState<Tutorial>(fallback[role]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const touchStart = useRef<number | null>(null);
  const firstVisitKey = `bimbelku.tutorial.${role}.v3`;
  const dashboardPath = role === "student" ? "/student/dashboard" : "/guru";

  useEffect(() => {
    let mounted = true;
    void getCached<Tutorial[]>("/content/tutorials", {
      params: { role, context },
      maxAgeMs: 60_000,
    })
      .then((response) => {
        if (mounted && response.data[0]?.steps?.length) {
          setTutorial(response.data[0]);
          setStep(0);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [context, role]);

  useEffect(() => {
    if (location.pathname !== dashboardPath) return;
    try {
      if (!localStorage.getItem(firstVisitKey)) setOpen(true);
    } catch {
      setOpen(false);
    }
  }, [dashboardPath, firstVisitKey, location.pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") setStep((value) => Math.min(tutorial.steps.length - 1, value + 1));
      if (event.key === "ArrowLeft") setStep((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, tutorial.steps.length]);

  const close = () => {
    setOpen(false);
    setStep(0);
    try {
      localStorage.setItem(firstVisitKey, "seen");
    } catch {
      // Tutorial tetap dapat ditutup saat penyimpanan browser dibatasi.
    }
  };
  const activeStep = tutorial.steps[step] ?? fallback[role].steps[0];
  const last = step === tutorial.steps.length - 1;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
        aria-label="Buka tutorial"
        className="rounded-full p-2.5 text-slate-400 transition hover:bg-white hover:text-indigo-600 hover:shadow-md"
      >
        <HelpCircle size={20} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-title"
          className="fixed inset-0 z-[220] flex items-end justify-center bg-slate-950/65 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            className="max-h-[94vh] w-full overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[2rem]"
            onTouchStart={(event) => {
              touchStart.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const end = event.changedTouches[0]?.clientX;
              if (touchStart.current !== null && end !== undefined) {
                const delta = end - touchStart.current;
                if (Math.abs(delta) > 45) {
                  setStep((value) => delta > 0
                    ? Math.max(0, value - 1)
                    : Math.min(tutorial.steps.length - 1, value + 1));
                }
              }
              touchStart.current = null;
            }}
          >
            <div className="relative min-h-48 overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600">
              {activeStep.image_url ? (
                <img src={activeStep.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0">
                  <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full border-[28px] border-white/10" />
                  <div className="absolute bottom-7 left-8 text-7xl font-black text-white/20">
                    {String(step + 1).padStart(2, "0")}
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
              <button
                type="button"
                aria-label="Tutup tutorial"
                onClick={close}
                className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-slate-950/35 text-white backdrop-blur"
              >
                <X size={19} />
              </button>
              <div className="absolute bottom-5 left-6 right-6 text-white">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/65">Langkah {step + 1} dari {tutorial.steps.length}</p>
                <h2 id="tutorial-title" className="mt-2 text-2xl font-black">{activeStep.title}</h2>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="mb-5 flex gap-1.5">
                {tutorial.steps.map((item, index) => (
                  <button
                    key={item.id ?? `${item.title}-${index}`}
                    type="button"
                    aria-label={`Buka langkah ${index + 1}`}
                    onClick={() => setStep(index)}
                    className={`h-2 rounded-full transition-all ${index === step ? "w-8 bg-indigo-600" : "w-2 bg-slate-200"}`}
                  />
                ))}
              </div>
              <h3 className="text-xl font-black text-slate-900">{tutorial.title}</h3>
              {step === 0 && tutorial.description && (
                <p className="mt-1 text-sm text-slate-500">{tutorial.description}</p>
              )}
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-700">{activeStep.body}</p>

              <div className="mt-7 flex items-center justify-between gap-3">
                <button type="button" onClick={close} className="text-sm font-bold text-slate-400 hover:text-slate-700">
                  Lewati
                </button>
                <div className="flex gap-2">
                  {step > 0 && (
                    <button
                      type="button"
                      onClick={() => setStep((value) => value - 1)}
                      className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 text-slate-600"
                      aria-label="Langkah sebelumnya"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => last ? close() : setStep((value) => value + 1)}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700"
                  >
                    {last ? <><CheckCircle2 size={18} /> Selesai</> : <>Selanjutnya <ChevronRight size={18} /></>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
