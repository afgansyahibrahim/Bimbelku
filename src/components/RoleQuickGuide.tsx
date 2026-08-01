import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, X } from "lucide-react";
import { useLocation } from "react-router-dom";

import { getCached } from "@/lib/http";

type Role = "student" | "teacher";
type Callout = { selector?: string; target?: string } | string | null;
type Step = {
  id?: number;
  title: string;
  body: string;
  image_url?: string | null;
  callout?: Callout;
  target?: string;
};
type Tutorial = { id: number; title: string; description?: string | null; steps: Step[] };
type Spotlight = { top: number; left: number; width: number; height: number };

const fallback: Record<Role, Tutorial> = {
  student: {
    id: -1,
    title: "Panduan murid",
    description: "Pesan paket dengan urutan yang jelas, lalu bayar sebelum tutor dicari.",
    steps: [
      {
        title: "Mulai dari Cari Les",
        body: "Tekan Cari Les untuk memilih paket, mata pelajaran, pembagian sesi, dan jadwal.",
        target: '[data-tour="student-cari-les"]',
      },
      {
        title: "Periksa sebelum membayar",
        body: "Ringkasan pesanan akan muncul di tengah layar. Ubah data jika ada yang belum tepat, lalu konfirmasi dan bayar.",
        target: '[data-tour="student-cari-les"]',
      },
      {
        title: "Pantau di Kelas Saya",
        body: "Pencarian tutor dimulai setelah pembayaran diterima. Perkembangannya dapat dipantau dari Kelas Saya.",
        target: '[data-tour="student-kelas"]',
      },
      {
        title: "Kelola dari halaman Saya",
        body: "Profil, voucher, pembayaran, bantuan, tutorial, dan pengaturan akun tersedia di halaman Saya.",
        target: '[data-tour="student-saya"]',
      },
    ],
  },
  teacher: {
    id: -2,
    title: "Panduan tutor",
    description: "Periksa seluruh jadwal sebelum menerima paket.",
    steps: [
      { title: "Buka permintaan", body: "Periksa mapel, jenjang, mode, dan semua jadwal." },
      { title: "Berikan keputusan", body: "Terima hanya saat seluruh sesi dapat dijalankan." },
      { title: "Mulai kelas", body: "Jadwal aktif setelah semua tutor menerima paket yang sudah dibayar." },
    ],
  },
};

const packageBuilderTutorial: Tutorial = {
  id: -3,
  title: "Memesan dua atau lebih mata pelajaran",
  description: "Satu paket dapat dibagi ke beberapa mapel tanpa menambah jumlah sesi.",
  steps: [
    {
      title: "Pilih paket multi-mapel",
      body: "Pilih paket yang mendukung dua atau tiga mata pelajaran. Batas mapel tertulis pada setiap kartu.",
      target: '[data-tour="package-plan-picker"]',
    },
    {
      title: "Tentukan durasi pertemuan",
      body: "Pilih 1, 2, atau 3 jam. Durasi yang sama berlaku untuk seluruh pertemuan dalam paket.",
      target: '[data-tour="package-duration-picker"]',
    },
    {
      title: "Tambahkan mata pelajaran",
      body: "Tekan Tambah Mapel. Sistem langsung membagi seluruh sesi secara merata tanpa mengubah total paket.",
      target: '[data-tour="package-add-subject"]',
    },
    {
      title: "Atur pembagian sesi",
      body: "Gunakan tombol kurang dan tambah untuk memindahkan satu sesi. Bagi merata mengembalikan pembagian seimbang.",
      target: '[data-tour="package-allocation"]',
    },
    {
      title: "Periksa jadwal dan pesanan",
      body: "Pastikan jadwal mapel tidak bertumpang tindih. Buka ringkasan sebelum mengonfirmasi pembayaran.",
      target: '[data-tour="package-review-order"]',
    },
  ],
};

const contextForPath = (path: string) => {
  if (path.includes("/packages/new")) return "package-builder";
  if (path.includes("/packages")) return "packages";
  if (path.includes("/vouchers")) return "vouchers";
  if (path.includes("/my-classes") || path.includes("/kelas")) return "classes";
  if (path.includes("/account") || path.includes("/profile")) return "account";
  return "dashboard";
};

const tutorialFor = (role: Role, context: string) =>
  role === "student" && context === "package-builder" ? packageBuilderTutorial : fallback[role];

const selectorForStep = (activeStep: Step, role: Role) => {
  const callout = activeStep.callout;
  if (typeof callout === "string" && callout.trim()) return callout;
  if (callout && typeof callout === "object") return callout.selector || callout.target || null;
  if (activeStep.target) return activeStep.target;
  if (role !== "student") return null;
  const text = `${activeStep.title} ${activeStep.body}`.toLowerCase();
  if (text.includes("kelas saya") || text.includes("pantau")) return '[data-tour="student-kelas"]';
  if (text.includes("halaman saya") || text.includes("profil")) return '[data-tour="student-saya"]';
  if (text.includes("paket") || text.includes("mapel") || text.includes("jadwal")) return '[data-tour="student-cari-les"]';
  return null;
};

const visibleElement = (selector: string) => {
  try {
    return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < window.innerWidth
        && rect.top < window.innerHeight
        && style.display !== "none"
        && style.visibility !== "hidden";
    }) ?? null;
  } catch {
    return null;
  }
};

export default function RoleQuickGuide({ role }: { role: Role }) {
  const location = useLocation();
  const context = useMemo(() => contextForPath(location.pathname), [location.pathname]);
  const [tutorial, setTutorial] = useState<Tutorial>(() => tutorialFor(role, context));
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const touchStart = useRef<number | null>(null);
  const firstVisitKey = context === "package-builder"
    ? "bimbelku.tutorial.student.multi-subject.v1"
    : `bimbelku.tutorial.${role}.v5`;
  const dashboardPath = role === "student" ? "/student/dashboard" : "/guru";
  const activeStep = tutorial.steps[step] ?? fallback[role].steps[0];
  const selector = selectorForStep(activeStep, role);
  const last = step === tutorial.steps.length - 1;

  useEffect(() => {
    let mounted = true;
    setTutorial(tutorialFor(role, context));
    setStep(0);
    void getCached<Tutorial[]>("/content/tutorials", {
      params: { role, context },
      maxAgeMs: 60_000,
    })
      .then((response) => {
        if (!mounted) return;
        setTutorial(response.data[0]?.steps?.length ? response.data[0] : tutorialFor(role, context));
        setStep(0);
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
    const openTutorial = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("bimbelku:open-tutorial", openTutorial);
    return () => window.removeEventListener("bimbelku:open-tutorial", openTutorial);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") setStep((value) => Math.min(tutorial.steps.length - 1, value + 1));
      if (event.key === "ArrowLeft") setStep((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", closeOnKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      window.removeEventListener("keydown", closeOnKey);
    };
  }, [open, tutorial.steps.length]);

  useEffect(() => {
    if (!open || !selector) {
      setSpotlight(null);
      return;
    }
    let settleTimer = 0;
    const update = (scrollTarget = false) => {
      const target = visibleElement(selector);
      if (!target) {
        setSpotlight(null);
        return;
      }
      if (scrollTarget) {
        target.scrollIntoView({
          behavior: "smooth",
          block: window.innerWidth < 640 ? "start" : "center",
          inline: "nearest",
        });
      }
      const rect = target.getBoundingClientRect();
      const padding = 8;
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const top = Math.max(4, rect.top - padding);
      const left = Math.max(4, rect.left - padding);
      const right = Math.min(viewportWidth - 4, rect.right + padding);
      const bottom = Math.min(viewportHeight - 4, rect.bottom + padding);
      setSpotlight({
        top,
        left,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      });
    };
    const frame = window.requestAnimationFrame(() => {
      update(true);
      settleTimer = window.setTimeout(() => update(false), 320);
    });
    const updateWithoutScroll = () => update(false);
    window.addEventListener("resize", updateWithoutScroll);
    window.addEventListener("scroll", updateWithoutScroll, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", updateWithoutScroll);
      window.removeEventListener("scroll", updateWithoutScroll, true);
    };
  }, [open, selector, step]);

  const close = () => {
    setOpen(false);
    setStep(0);
    try {
      localStorage.setItem(firstVisitKey, "seen");
    } catch {
      // Tutorial tetap dapat ditutup saat penyimpanan browser dibatasi.
    }
  };

  const dialogStyle = useMemo<CSSProperties>(() => {
    if (!spotlight || typeof window === "undefined") return {};
    if (window.innerWidth < 640) {
      const targetCenter = spotlight.top + spotlight.height / 2;
      return targetCenter > window.innerHeight * 0.58
        ? { left: 12, right: 12, top: 12 }
        : { left: 12, right: 12, bottom: 12 };
    }
    const width = Math.min(640, window.innerWidth - 32);
    const left = Math.max(16, Math.min(window.innerWidth - width - 16, spotlight.left + spotlight.width / 2 - width / 2));
    if (window.innerHeight - (spotlight.top + spotlight.height) >= 390) {
      return { left, top: spotlight.top + spotlight.height + 16, width };
    }
    return { left, bottom: window.innerHeight - spotlight.top + 16, width };
  }, [spotlight]);

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
        <div className="fixed inset-0 z-[220] overflow-hidden overscroll-contain" aria-hidden={false}>
          {spotlight ? (
            <>
              <div data-spotlight-shade="top" className="fixed left-0 right-0 top-0 bg-slate-950/70" style={{ height: spotlight.top }} />
              <div data-spotlight-shade="left" className="fixed left-0 bg-slate-950/70" style={{ top: spotlight.top, width: spotlight.left, height: spotlight.height }} />
              <div data-spotlight-shade="right" className="fixed right-0 bg-slate-950/70" style={{ top: spotlight.top, left: spotlight.left + spotlight.width, height: spotlight.height }} />
              <div data-spotlight-shade="bottom" className="fixed bottom-0 left-0 right-0 bg-slate-950/70" style={{ top: spotlight.top + spotlight.height }} />
              <div
                aria-hidden="true"
                data-spotlight-ring
                className="pointer-events-none fixed z-[221] animate-pulse rounded-2xl ring-4 ring-amber-300 shadow-[0_0_0_5px_rgba(255,255,255,0.98),0_0_38px_rgba(251,191,36,1)] motion-reduce:animate-none"
                style={spotlight}
              />
            </>
          ) : (
            <div className="fixed inset-0 bg-slate-950/70" onMouseDown={close} />
          )}

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
            data-tutorial-context={context}
            className={`fixed z-[222] flex max-h-[min(20rem,calc(100dvh-1.5rem))] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:max-h-[min(34rem,calc(100dvh-1.5rem))] sm:rounded-[1.75rem] ${spotlight ? "" : "inset-x-3 bottom-3 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(40rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2"}`}
            style={dialogStyle}
            onTouchStart={(event) => {
              touchStart.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const end = event.changedTouches[0]?.clientX;
              if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 45) {
                setStep((value) => end > touchStart.current!
                  ? Math.max(0, value - 1)
                  : Math.min(tutorial.steps.length - 1, value + 1));
              }
              touchStart.current = null;
            }}
          >
            <div className="relative min-h-24 shrink-0 overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600 sm:min-h-36">
              {activeStep.image_url ? (
                <img src={activeStep.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full border-[24px] border-white/10" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
              <button type="button" aria-label="Tutup tutorial" onClick={close} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-slate-950/35 text-white">
                <X size={19} />
              </button>
              <div className="absolute bottom-4 left-5 right-16 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Langkah {step + 1} dari {tutorial.steps.length}</p>
                <h2 id="tutorial-title" className="mt-1 text-xl font-black sm:text-2xl">{activeStep.title}</h2>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
              <div className="flex gap-1.5">
                {tutorial.steps.map((item, index) => (
                  <button key={item.id ?? `${item.title}-${index}`} type="button" aria-label={`Buka langkah ${index + 1}`} onClick={() => setStep(index)} className={`h-2 rounded-full transition-all ${index === step ? "w-8 bg-indigo-600" : "w-2 bg-slate-200"}`} />
                ))}
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900">{tutorial.title}</h3>
              {step === 0 && tutorial.description && <p className="mt-1 text-sm text-slate-500">{tutorial.description}</p>}
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{activeStep.body}</p>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white p-4 sm:px-6">
              <button type="button" onClick={close} className="min-h-11 px-2 text-sm font-bold text-slate-400 hover:text-slate-700">Lewati</button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button type="button" onClick={() => setStep((value) => value - 1)} className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 text-slate-600" aria-label="Langkah sebelumnya">
                    <ChevronLeft size={20} />
                  </button>
                )}
                <button type="button" onClick={() => last ? close() : setStep((value) => value + 1)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700">
                  {last ? <><CheckCircle2 size={18} /> Selesai</> : <>Selanjutnya <ChevronRight size={18} /></>}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
