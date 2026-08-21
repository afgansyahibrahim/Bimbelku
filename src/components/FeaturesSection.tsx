import { BookOpenCheck, CalendarCheck2, CreditCard, ShieldCheck } from "lucide-react";
import Reveal from "@/components/Reveal";

const trustItems = [
  { icon: ShieldCheck, title: "Tutor terverifikasi", description: "Identitas, profil, dan kesiapan tutor diperiksa sebelum mengajar.", className: "bg-indigo-50 text-indigo-700" },
  { icon: CreditCard, title: "Pembayaran tercatat", description: "Tagihan, verifikasi pembayaran, saldo, dan riwayat tersimpan dalam sistem.", className: "bg-orange-50 text-orange-700" },
  { icon: BookOpenCheck, title: "Progress terdokumentasi", description: "Perkembangan materi dicatat per Bab supaya murid mudah melihat apa yang sudah dipelajari.", className: "bg-emerald-50 text-emerald-700" },
  { icon: CalendarCheck2, title: "Jadwal sesuai kebutuhan", description: "Hari dan jam dipilih sejak awal dan menjadi bagian dari proses pencocokan tutor.", className: "bg-sky-50 text-sky-700" },
] as const;

export default function FeaturesSection() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-start gap-8 lg:grid-cols-[.82fr_1.18fr] lg:gap-12">
          <Reveal direction="right">
            <div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">Kenapa BimbelKu?</p>
              <h2 className="mt-4 text-balance text-3xl font-black leading-tight sm:text-4xl">Bukan cuma menemukan tutor, tetapi membuat proses belajar lebih terarah.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-300 sm:text-base">Dari transaksi sampai progress belajar, informasi penting tetap tercatat tanpa membuat alur murid dan tutor terasa berat.</p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {trustItems.map(({ icon: Icon, title, description, className }, index) => (
              <Reveal key={title} delay={index * 0.07} direction="up" width="100%" className="h-full">
                <article className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md">
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl ${className}`}><Icon className="h-6 w-6" /></div>
                  <h3 className="mt-5 text-lg font-black text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
