import { CalendarCheck2, CreditCard, Laptop2, ShieldCheck } from "lucide-react";

const items = [
  [ShieldCheck, "Tutor diperiksa admin"],
  [CalendarCheck2, "Jadwal dipilih sejak awal"],
  [CreditCard, "Pembayaran tercatat"],
  [Laptop2, "Online dan offline"],
] as const;

export default function TrustStrip() {
  return <section className="border-y border-slate-100 bg-white"><div className="container mx-auto grid grid-cols-2 gap-px bg-slate-100 md:grid-cols-4">{items.map(([Icon, label]) => <div key={label} className="flex items-center justify-center gap-2 bg-white px-3 py-5 text-center text-xs font-black text-slate-700 sm:text-sm"><Icon size={18} className="shrink-0 text-primary" /> {label}</div>)}</div></section>;
}
