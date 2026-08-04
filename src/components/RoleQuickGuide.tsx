import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
      { title: "Buka permintaan", body: "Periksa mapel, jenjang, mode, tarif bersih, dan semua jadwal sebelum menjawab.", target: '[href="/guru/permintaan"]' },
      { title: "Kelola pelaksanaan", body: "Check-in, kehadiran murid, check-out, laporan perkembangan, dan bukti kamera berada di Kelas.", target: '[href="/guru/kelas"]' },
      { title: "Gunakan Pesan kelas", body: "Chat hanya terbuka untuk kelas berbayar. Lampiran dan status baca tersimpan pada percakapan.", target: '[href="/guru/pesan"]' },
      { title: "Periksa halaman Saya", body: "Pendapatan, rekening, performa, banding, notifikasi, profil, dan bantuan ada di halaman Saya.", target: '[href="/guru/saya"]' },
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

const viewport = () => ({
  width: window.visualViewport?.width ?? window.innerWidth,
  height: window.visualViewport?.height ?? window.innerHeight,
});

const isRendered = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return element.isConnected
    && rect.width > 0
    && rect.height > 0
    && style.display !== "none"
    && style.visibility !== "hidden";
};

const findTargetElement = (selector: string) => {
  try {
    return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(isRendered) ?? null;
  } catch {
    return null;
  }
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

export default function RoleQuickGuide({ role }: { role: Role }) {
  const location = useLocation();
  const context = useMemo(() => contextForPath(location.pathname), [location.pathname]);
  const [tutorial, setTutorial] = useState<Tutorial>(() => tutorialFor(role, context));
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const touchStart = useRef<number | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const firstVisitKey = context === "package-builder"
    ? "bimbelku.tutorial.student.multi-subject.v1"
    : `bimbelku.tutorial.${role}.v5`;
  const dashboardPath = role === "student" ? "/student/dashboard" : "/guru";
  const activeStep = tutorial.steps[step] ?? fallback[role].steps[0];
  const selector = selectorForStep(activeStep, role);
  const last = step >= Math.max(0, tutorial.steps.length - 1);

  const openGuide = useCallback(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setStep(0);
    setSpotlight(null);
    setOpen(true);
  }, []);

  const closeGuide = useCallback(() => {
    // Tutup portal lebih dahulu. Step baru direset saat tutorial dibuka kembali agar
    // tidak ada pembaruan posisi yang beradu dengan proses unmount.
    setOpen(false);
    setSpotlight(null);
    window.requestAnimationFrame(() => restoreFocusRef.current?.focus());
    try {
      localStorage.setItem(firstVisitKey, "seen");
    } catch {
      // Tutorial tetap dapat ditutup saat penyimpanan browser dibatasi.
    }
  }, [firstVisitKey]);

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
      if (!localStorage.getItem(firstVisitKey)) openGuide();
    } catch {
      // Jangan memaksa tutorial tampil bila storage browser tidak tersedia.
    }
  }, [dashboardPath, firstVisitKey, location.pathname, openGuide]);

  useEffect(() => {
    window.addEventListener("bimbelku:open-tutorial", openGuide);
    return () => window.removeEventListener("bimbelku:open-tutorial", openGuide);
  }, [openGuide]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGuide();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ));
        if (focusable.length) {
          const first = focusable[0];
          const lastFocusable = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            lastFocusable.focus();
          } else if (!event.shiftKey && document.activeElement === lastFocusable) {
            event.preventDefault();
            first.focus();
          }
        }
      }
      if (event.key === "ArrowRight") setStep((value) => Math.min(tutorial.steps.length - 1, value + 1));
      if (event.key === "ArrowLeft") setStep((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeGuide, open, tutorial.steps.length]);

  useEffect(() => {
    if (!open || !selector) {
      setSpotlight(null);
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    const measure = () => {
      if (cancelled) return;
      const target = findTargetElement(selector);
      if (!target) {
        setSpotlight(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      const currentViewport = viewport();
      const padding = currentViewport.width < 640 ? 6 : 9;
      const top = clamp(rect.top - padding, 4, currentViewport.height - 4);
      const left = clamp(rect.left - padding, 4, currentViewport.width - 4);
      const right = clamp(rect.right + padding, 4, currentViewport.width - 4);
      const bottom = clamp(rect.bottom + padding, 4, currentViewport.height - 4);

      if (right <= left || bottom <= top) {
        setSpotlight(null);
        return;
      }

      setSpotlight({ top, left, width: right - left, height: bottom - top });
    };

    const locateAndScroll = () => {
      if (cancelled) return;
      const target = findTargetElement(selector);
      if (!target) {
        setSpotlight(null);
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      [0, 90, 220, 420, 700].forEach((delay) => {
        timers.push(window.setTimeout(measure, delay));
      });
    };

    const frame = window.requestAnimationFrame(locateAndScroll);
    const retry = window.setInterval(() => {
      if (findTargetElement(selector)) {
        locateAndScroll();
        window.clearInterval(retry);
      }
    }, 120);
    const stopRetry = window.setTimeout(() => window.clearInterval(retry), 1_500);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearInterval(retry);
      window.clearTimeout(stopRetry);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, [open, selector, step]);

  const dialogStyle = useMemo<CSSProperties>(() => {
    if (typeof window === "undefined") return {};
    const currentViewport = viewport();
    const margin = 12;

    if (!spotlight) {
      return currentViewport.width < 768
        ? { left: margin, right: margin, bottom: margin }
        : { left: "50%", top: "50%", width: Math.min(440, currentViewport.width - 32), transform: "translate(-50%, -50%)" };
    }

    if (currentViewport.width < 768) {
      const targetCenter = spotlight.top + spotlight.height / 2;
      return targetCenter > currentViewport.height / 2
        ? { left: margin, right: margin, top: margin }
        : { left: margin, right: margin, bottom: margin };
    }

    const width = Math.min(440, currentViewport.width - 32);
    const targetCenterX = spotlight.left + spotlight.width / 2;
    const top = clamp(spotlight.top + spotlight.height / 2 - 210, margin, currentViewport.height - 440);
    return targetCenterX > currentViewport.width / 2
      ? { left: margin, top, width }
      : { right: margin, top, width };
  }, [spotlight]);

  const tutorialOverlay = open && typeof document !== "undefined" ? (
    <div
      className="fixed inset-0 z-[220] overflow-hidden overscroll-contain"
      data-tutorial-portal
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeGuide();
      }}
    >
      {!spotlight && <div className="pointer-events-none fixed inset-0 bg-slate-950/80" />}

      {spotlight && (
        <div
          aria-hidden="true"
          data-spotlight-ring
          className="pointer-events-none fixed rounded-2xl ring-4 ring-amber-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.82),0_0_0_6px_rgba(255,255,255,0.98),0_0_38px_rgba(251,191,36,0.95)] transition-[top,left,width,height] duration-200 ease-out"
          style={spotlight}
        />
      )}

      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        data-tutorial-context={context}
        className="fixed z-[222] flex max-h-[calc(100dvh-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl outline-none sm:rounded-[1.75rem]"
        style={dialogStyle}
        onMouseDown={(event) => event.stopPropagation()}
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
        <header className="relative min-h-24 shrink-0 overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600 sm:min-h-36">
          {activeStep.image_url ? (
            <img src={activeStep.image_url} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain" />
          ) : (
            <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full border-[24px] border-white/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
          <button type="button" aria-label="Tutup tutorial" onClick={closeGuide} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-slate-950/35 text-white">
            <X size={19} />
          </button>
          <div className="absolute bottom-4 left-5 right-16 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Langkah {step + 1} dari {tutorial.steps.length}</p>
            <h2 id="tutorial-title" className="mt-1 text-xl font-black sm:text-2xl">{activeStep.title}</h2>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          <div className="flex gap-1.5">
            {tutorial.steps.map((item, index) => (
              <button key={item.id ?? `${item.title}-${index}`} type="button" aria-label={`Buka langkah ${index + 1}`} onClick={() => setStep(index)} className={`h-2 rounded-full transition-all ${index === step ? "w-8 bg-indigo-600" : "w-2 bg-slate-200"}`} />
            ))}
          </div>
          <h3 className="mt-4 text-lg font-black text-slate-900">{tutorial.title}</h3>
          {step === 0 && tutorial.description && <p className="mt-1 text-sm text-slate-500">{tutorial.description}</p>}
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{activeStep.body}</p>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white p-4 sm:px-6">
          <button type="button" onClick={closeGuide} className="min-h-11 px-2 text-sm font-bold text-slate-400 hover:text-slate-700">Lewati</button>
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep((value) => value - 1)} className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 text-slate-600" aria-label="Langkah sebelumnya">
                <ChevronLeft size={20} />
              </button>
            )}
            <button type="button" onClick={() => last ? closeGuide() : setStep((value) => value + 1)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700">
              {last ? <><CheckCircle2 size={18} /> Selesai</> : <>Selanjutnya <ChevronRight size={18} /></>}
            </button>
          </div>
        </footer>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openGuide}
        aria-label="Buka tutorial"
        className="rounded-full p-2.5 text-slate-400 transition hover:bg-white hover:text-indigo-600 hover:shadow-md"
      >
        <HelpCircle size={20} />
      </button>

      {tutorialOverlay ? createPortal(tutorialOverlay, document.body) : null}
    </>
  );
}
