import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Monitor,
  PlayCircle,
  Radar,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import Reveal from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import StudentPackageLink from "@/components/StudentPackageLink";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-orange-500 to-coral-dark pb-24 pt-16 md:pb-32 md:pt-24">
      <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-violet-700 blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
        <div className="text-center lg:text-left">
          <Reveal delay={0.05}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white sm:text-sm">
              <ShieldCheck size={16} /> Tutor diperiksa admin · Jadwal sejak awal
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:mx-0">
              Tentukan kebutuhanmu,
              <span className="mt-2 block text-orange-100">biarkan BimbelKu mencari tutor.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-7 text-white/85 sm:text-lg sm:leading-8 lg:mx-0">
              Pilih mata pelajaran, Bab, durasi 1 atau 2 jam, mode belajar, dan jadwal. Lihat harga sejak awal, bayar, lalu sistem mencari tutor yang sesuai.
            </p>
          </Reveal>

          <Reveal delay={0.28}>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <StudentPackageLink to="/student/packages/new">
                <Button type="button" size="xl" className="h-14 w-full rounded-2xl bg-white px-7 font-black text-primary shadow-xl shadow-orange-900/15 hover:bg-orange-50 sm:w-auto">
                  Cari Bimbingan <Radar className="ml-2 h-5 w-5" />
                </Button>
              </StudentPackageLink>
              <Button
                type="button"
                size="xl"
                variant="outline"
                onClick={() => document.getElementById("cara-kerja")?.scrollIntoView({ behavior: "smooth" })}
                className="h-14 w-full rounded-2xl border-white/25 bg-white/10 px-7 font-black text-white hover:bg-white/20 hover:text-white sm:w-auto"
              >
                <PlayCircle className="mr-2 h-5 w-5" /> Lihat Cara Kerja
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.36}>
            <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-white/75 lg:justify-start">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Harga terlihat sejak awal</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Online & offline</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Progress tercatat per Bab</span>
            </div>
          </Reveal>
        </div>

        <Reveal direction="left" delay={0.2} width="100%">
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-8 rounded-full border border-white/20" aria-hidden="true" />
            <div className="absolute inset-20 rounded-full border border-white/20" aria-hidden="true" />
            <div className="absolute inset-2 rounded-full border border-dashed border-white/30 motion-safe:animate-spin-slow" aria-hidden="true" />
            <div className="relative mx-auto aspect-square max-w-[490px] rounded-full bg-slate-950/10 p-8">
              <div className="absolute inset-[18%] grid place-items-center rounded-full bg-white/15 shadow-2xl">
                <div className="grid h-28 w-28 place-items-center rounded-[2rem] bg-white text-primary shadow-2xl">
                  <Radar size={50} />
                </div>
              </div>
              <FloatingTag className="left-2 top-16" icon={BookOpenCheck} text="Matematika" />
              <FloatingTag className="right-0 top-24" icon={Monitor} text="Online" delayClass="motion-safe:[animation-delay:.45s]" />
              <FloatingTag className="bottom-16 left-5" icon={CalendarClock} text="Jadwal cocok" delayClass="motion-safe:[animation-delay:.85s]" />
              <div className="absolute bottom-7 right-1 rounded-[1.8rem] bg-white p-4 shadow-2xl motion-safe:animate-float">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-700"><UserRoundCheck size={23} /></div>
                  <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tutor ditemukan</p><p className="mt-1 font-black text-slate-900">Tutor yang sesuai</p></div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Jadwal tersedia <CheckCircle2 size={15} /></div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
        <svg viewBox="0 0 1440 90" fill="none"><path d="M0 90V62C220 8 422 18 628 52C870 92 1106 11 1440 37V90H0Z" className="fill-background" /></svg>
      </div>
    </section>
  );
}

function FloatingTag({ icon: Icon, text, className, delayClass = "" }: { icon: typeof ArrowRight; text: string; className: string; delayClass?: string }) {
  return (
    <div className={`absolute z-20 flex items-center gap-2 rounded-2xl border border-white/60 bg-white/95 px-4 py-3 text-sm font-black text-slate-800 shadow-xl motion-safe:animate-float ${delayClass} ${className}`}>
      <Icon size={18} className="text-primary" /> {text}
    </div>
  );
}
