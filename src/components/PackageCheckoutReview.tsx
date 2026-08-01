import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CalendarCheck2, Loader2, X } from "lucide-react";

export type CheckoutPlan = {
  name: string;
  session_count: number;
  validity_days: number;
};

export type CheckoutQuote = {
  lines: Array<{
    curriculum_subject_id: number;
    subject_name: string;
    session_count: number;
    unit_price: number;
    subtotal_amount: number;
  }>;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  promotion?: { title: string } | null;
  schedule_reviewed?: boolean;
};

export type CheckoutScheduleRow = {
  key: string;
  subjectName: string;
  schedule: string;
};

interface PackageCheckoutReviewProps {
  open: boolean;
  busy: boolean;
  plan: CheckoutPlan | undefined;
  quote: CheckoutQuote | null;
  level: string;
  grade: string;
  mode: "online" | "offline";
  schedules: CheckoutScheduleRow[];
  onCancel: () => void;
  onPay: () => void;
}

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatSchedule = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Jadwal belum valid";
  return date.toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function PackageCheckoutReview({
  open,
  busy,
  plan,
  quote,
  level,
  grade,
  mode,
  schedules,
  onCancel,
  onPay,
}: PackageCheckoutReviewProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onCancel, open]);

  if (!open || !plan || !quote) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[360] grid place-items-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="package-checkout-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white">
              <CalendarCheck2 size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">Pengecekan terakhir</p>
              <h2 id="package-checkout-title" className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
                Pastikan paket dan jadwal sudah benar
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Tutup pengecekan pesanan"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Paket</p>
              <p className="mt-1 font-black text-slate-900">{plan.name}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{plan.session_count} sesi · berlaku {plan.validity_days} hari</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Jenjang</p>
              <p className="mt-1 font-black text-slate-900">{level} · {grade}</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Metode</p>
              <p className="mt-1 font-black text-slate-900">{mode === "online" ? "Online" : "Offline"}</p>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-black text-slate-900">Pembagian mata pelajaran</h3>
            <div className="mt-3 space-y-2">
              {quote.lines.map((line) => (
                <div key={line.curriculum_subject_id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-800">{line.subject_name}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{line.session_count} sesi × {rupiah(line.unit_price)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-slate-900">{rupiah(line.subtotal_amount)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-900">Jadwal seluruh sesi</h3>
              {quote.schedule_reviewed && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">Jadwal sudah diperiksa ulang</span>
              )}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {schedules
                .slice()
                .sort((left, right) => new Date(left.schedule).getTime() - new Date(right.schedule).getTime())
                .map((row, index) => (
                  <div key={row.key} className="flex gap-3 rounded-2xl border border-slate-100 p-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-600">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-800">{row.subjectName}</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{formatSchedule(row.schedule)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4 text-slate-300"><span>Harga normal</span><span>{rupiah(quote.subtotal_amount)}</span></div>
              {quote.discount_amount > 0 && (
                <div className="flex justify-between gap-4 text-emerald-300"><span>Potongan</span><span>-{rupiah(quote.discount_amount)}</span></div>
              )}
            </div>
            <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
              <div>
                <p className="text-xs font-bold text-slate-400">Total pembayaran</p>
                <p className="mt-1 text-2xl font-black sm:text-3xl">{rupiah(quote.total_amount)}</p>
              </div>
              {quote.promotion && (
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-black text-emerald-300">{quote.promotion.title}</span>
              )}
            </div>
          </div>

          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-900">
            Setelah kamu menekan Bayar, sistem mulai mencari tutor. Tagihan transfer akan tersedia setelah seluruh tutor menerima jadwal paket.
          </p>
        </div>

        <div className="grid gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:grid-cols-2 sm:px-7">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-12 rounded-2xl border border-slate-200 font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onPay}
            disabled={busy}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 font-black text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy && <Loader2 size={18} className="animate-spin" />}
            {busy ? "Memproses…" : "Bayar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
