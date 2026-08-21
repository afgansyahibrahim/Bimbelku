import { CalendarCheck2, CreditCard, Laptop2, ShieldCheck } from "lucide-react";

const items = [
  [ShieldCheck, "Tutor diverifikasi"],
  [CalendarCheck2, "Jadwal sejak awal"],
  [CreditCard, "Pembayaran tercatat"],
  [Laptop2, "Online & offline"],
] as const;

export default function TrustStrip() {
  return (
    <section className="border-b border-slate-100 bg-white" aria-label="Keunggulan utama BimbelKu">
      <div className="container mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-100 px-0 md:grid-cols-4">
        {items.map(([Icon, label]) => (
          <div key={label} className="flex min-h-16 items-center justify-center gap-2 bg-white px-3 py-4 text-center text-[11px] font-black text-slate-700 sm:text-xs md:text-sm">
            <Icon className="h-4 w-4 shrink-0 text-primary sm:h-[18px] sm:w-[18px]" /> {label}
          </div>
        ))}
      </div>
    </section>
  );
}
