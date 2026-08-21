import { BookOpenCheck, GraduationCap, Radar } from "lucide-react";
import Reveal from "@/components/Reveal";

const steps = [
  { icon: BookOpenCheck, title: "Tentukan kebutuhan", description: "Pilih mapel, Bab, durasi, mode belajar, serta jadwal. Harga paket terlihat sebelum kamu melanjutkan pembayaran." },
  { icon: Radar, title: "Sistem mencari tutor", description: "Setelah pembayaran diterima, BimbelKu mencocokkan kebutuhan dan jadwalmu dengan tutor yang tersedia." },
  { icon: GraduationCap, title: "Mulai belajar", description: "Jalani sesi sesuai jadwal dan lihat perkembangan materi dari Progress yang dicatat per Bab." },
] as const;

export default function HowItWorksSection() {
  return (
    <section id="cara-kerja" className="bg-slate-50 py-20 sm:py-24">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Cara kerja BimbelKu</p>
            <h2 className="mt-4 text-balance text-3xl font-black text-slate-900 md:text-4xl">Tiga langkah sampai mulai belajar</h2>
            <p className="mt-3 text-base leading-7 text-slate-500 sm:text-lg">Sederhana dari awal: tentukan kebutuhan, biarkan sistem mencarikan tutor, lalu mulai belajar.</p>
          </Reveal>
        </div>

        <div className="relative mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          <div className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-orange-200 via-violet-300 to-indigo-200 md:block" aria-hidden="true" />
          {steps.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} delay={index * 0.08} width="100%">
              <article className="relative flex h-full gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:block md:p-6">
                <div className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orange-50 to-violet-50 text-primary shadow-sm md:h-16 md:w-16">
                  <Icon className="h-6 w-6 md:h-7 md:w-7" />
                </div>
                <span className="absolute right-5 top-4 text-3xl font-black text-slate-100 md:top-5">0{index + 1}</span>
                <div className="min-w-0 pr-5 md:pr-0">
                  <h3 className="text-base font-black text-slate-900 md:mt-5 md:text-lg">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500 md:mt-2">{description}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
