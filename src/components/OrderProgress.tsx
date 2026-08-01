import { Check, Circle } from "lucide-react";

const steps = ["Pesanan", "Ringkasan", "Pembayaran", "Cari Tutor", "Tutor Ditemukan", "Aktif", "Selesai"];

const stageForStatus = (status: string) => {
  if (["awaiting_payment", "payment_rejected", "payment_submitted", "submitted"].includes(status)) return 2;
  if (["matching", "teacher_pending", "no_teacher"].includes(status)) return 3;
  if (["accepted", "teacher_selected"].includes(status)) return 4;
  if (["active", "confirmed", "in_progress"].includes(status)) return 5;
  if (["completed"].includes(status)) return 6;
  return 0;
};

export default function OrderProgress({ status }: { status: string }) {
  const current = stageForStatus(status);
  const stopped = ["cancelled", "payment_expired", "refund_pending", "refunded"].includes(status);

  return (
    <div aria-label="Progres pesanan">
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tahap pesanan</p>
            <p className={`mt-1 text-sm font-black ${stopped ? "text-amber-700" : "text-indigo-700"}`}>{steps[current]}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${stopped ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}`}>{current + 1} / {steps.length}</span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5" aria-hidden="true">
          {steps.map((label, index) => <span key={label} className={`h-2 rounded-full ${stopped && index === current ? "bg-amber-500" : index <= current ? "bg-indigo-600" : "bg-slate-200"}`} />)}
        </div>
      </div>
      <ol className="hidden grid-cols-7 sm:grid">
        {steps.map((label, index) => {
          const complete = !stopped && index < current;
          const active = index === current;
          return (
            <li key={label} className="relative flex flex-col items-center text-center">
              {index > 0 && <span aria-hidden="true" className={`absolute right-1/2 top-3 h-0.5 w-full ${complete || active ? "bg-indigo-500" : "bg-slate-200"}`} />}
              <span className={`relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 ${complete ? "border-indigo-600 bg-indigo-600 text-white" : active ? stopped ? "border-amber-500 bg-amber-50 text-amber-600" : "border-indigo-600 bg-white text-indigo-600" : "border-slate-200 bg-white text-slate-300"}`}>
                {complete ? <Check size={14} /> : <Circle size={10} fill="currentColor" />}
              </span>
              <span className={`mt-2 text-[10px] font-black ${active ? stopped ? "text-amber-700" : "text-indigo-700" : complete ? "text-slate-700" : "text-slate-400"}`}>{label}</span>
            </li>
          );
        })}
      </ol>
      {stopped && <p className="mt-3 text-left text-xs font-bold text-amber-700 sm:text-center">Alur berhenti pada status: {status.replaceAll("_", " ")}.</p>}
    </div>
  );
}
