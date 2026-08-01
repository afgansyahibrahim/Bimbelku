import { useNavigate } from "react-router-dom";
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

export default function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-orange-500 to-coral-dark pb-24 pt-16 md:pb-32 md:pt-24">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-violet-700 blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto grid items-center gap-14 px-4 lg:grid-cols-[1.05fr_.95fr]">
        <div className="text-center lg:text-left">
          <Reveal delay={0.05}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur">
              <ShieldCheck size={16} /> Tutor diperiksa admin · Jadwal sejak awal
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-white md:text-6xl">
              Tentukan kebutuhanmu,
              <span className="mt-2 block text-orange-100">biarkan radar mencari tutor</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/80 lg:mx-0">
              Pilih paket, durasi 1–3 jam, mapel, dan jadwal. Periksa pesanan, bayar, lalu sistem mencari tutor yang cocok.
            </p>
          </Reveal>
          <Reveal delay={0.28}>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button type="button" size="xl" onClick={() => navigate("/student/packages/new")} className="h-14 rounded-2xl bg-white px-7 font-black text-primary shadow-xl hover:bg-orange-50">
                Cari Bimbingan <Radar className="ml-2 h-5 w-5" />
              </Button>
              <Button type="button" size="xl" variant="outline" onClick={() => document.getElementById("cara-kerja")?.scrollIntoView({ behavior: "smooth" })} className="h-14 rounded-2xl border-white/25 bg-white/10 px-7 font-black text-white backdrop-blur hover:bg-white/20 hover:text-white">
                <PlayCircle className="mr-2 h-5 w-5" /> Lihat Cara Kerja
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.36}>
            <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-white/75 lg:justify-start">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Harga per sesi</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Online dan offline</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Pembayaran tercatat</span>
            </div>
          </Reveal>
        </div>

        <Reveal direction="left" delay={0.2} width="100%">
          <div className="relative mx-auto max-w-xl">
            <div className="absolute inset-8 rounded-full border border-white/20" />
            <div className="absolute inset-20 rounded-full border border-white/20" />
            <div className="absolute inset-2 animate-spin-slow rounded-full border border-dashed border-white/30 motion-reduce:animate-none" />
            <div className="relative mx-auto aspect-square max-w-[490px] rounded-full bg-slate-950/10 p-8 backdrop-blur-[2px]">
              <div className="absolute inset-[18%] grid place-items-center rounded-full bg-white/15 shadow-2xl backdrop-blur-md">
                <div className="grid h-28 w-28 place-items-center rounded-[2rem] bg-white text-primary shadow-2xl">
                  <Radar size={50} />
                </div>
              </div>
              <FloatingTag className="left-2 top-16" icon={BookOpenCheck} text="Matematika" />
              <FloatingTag className="right-0 top-24" icon={Monitor} text="Online" delay />
              <FloatingTag className="bottom-16 left-5" icon={CalendarClock} text="Jadwal cocok" delay />
              <div className="absolute bottom-7 right-1 animate-float rounded-[1.8rem] bg-white p-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-700"><UserRoundCheck size={23} /></div>
                  <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tutor ditemukan</p><p className="mt-1 font-black text-slate-900">Kak Nanda</p></div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Jadwal tersedia <CheckCircle2 size={15} /></div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 90" fill="none" aria-hidden="true"><path d="M0 90V62C220 8 422 18 628 52C870 92 1106 11 1440 37V90H0Z" className="fill-background" /></svg>
      </div>
    </section>
  );
}

function FloatingTag({ icon: Icon, text, className, delay = false }: { icon: typeof ArrowRight; text: string; className: string; delay?: boolean }) {
  return <div className={`absolute flex items-center gap-2 rounded-2xl border border-white/60 bg-white/95 px-4 py-3 text-sm font-black text-slate-800 shadow-xl ${delay ? "animate-[float_3.4s_ease-in-out_infinite]" : "animate-float"} ${className}`}><Icon size={18} className="text-primary" /> {text}</div>;
}
