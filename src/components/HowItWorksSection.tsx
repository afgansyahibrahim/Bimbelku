import { BookOpenCheck, CreditCard, GraduationCap, Radar } from "lucide-react";
import Reveal from "@/components/Reveal";

const steps = [
  [BookOpenCheck, "Pilih kebutuhan", "Tentukan paket, mapel, jenjang, dan metode belajar."],
  [Radar, "Radar mencari tutor", "Kecocokan kompetensi dan semua jadwal diperiksa otomatis."],
  [CreditCard, "Bayar setelah cocok", "Satu tagihan dibuka ketika seluruh tutor menerima."],
  [GraduationCap, "Mulai belajar", "Sesi, laporan, dan progres tersimpan dalam Kelas Saya."],
] as const;

export default function HowItWorksSection() {
  return <section id="cara-kerja" className="bg-slate-50 py-20"><div className="container mx-auto px-4"><div className="mx-auto max-w-2xl text-center"><h2 className="text-3xl font-black text-slate-900 md:text-4xl">Alur belajar yang jelas</h2><p className="mt-3 text-slate-500">Kebutuhan dipilih sebelum tutor menerima permintaan.</p></div><div className="relative mt-12 grid gap-4 md:grid-cols-4"><div className="absolute left-[12%] right-[12%] top-9 hidden h-px bg-gradient-to-r from-orange-300 via-violet-300 to-indigo-300 md:block" />{steps.map(([Icon, title, description], index) => <Reveal key={title} delay={index * .1} width="100%"><div className="relative h-full rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-orange-50 to-violet-50 text-primary shadow-sm"><Icon size={26} /></div><span className="absolute right-5 top-5 text-3xl font-black text-slate-100">0{index + 1}</span><h3 className="mt-5 text-lg font-black text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div></Reveal>)}</div></div></section>;
}
