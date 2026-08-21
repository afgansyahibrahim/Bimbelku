import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import StudentPackageLink from "@/components/StudentPackageLink";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-[#fffaf5] px-4 py-20 sm:px-6 sm:py-24 lg:py-28">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-px w-[min(90%,72rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-200 to-transparent" />
        <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="absolute -right-24 top-8 h-64 w-64 rounded-full bg-indigo-100/55 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <Reveal width="100%">
          <div className="relative mx-auto flex min-h-[330px] w-full flex-col items-center justify-center overflow-hidden rounded-[2.25rem] border border-orange-100/90 bg-white px-6 py-12 text-center shadow-[0_22px_70px_rgba(124,45,18,0.08)] sm:min-h-[370px] sm:px-10 sm:py-16 lg:px-16">
            <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-1 w-24 rounded-b-full bg-gradient-to-r from-orange-500 via-orange-400 to-indigo-500" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full border border-orange-100" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full border border-indigo-100" aria-hidden="true" />

            <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600 sm:text-xs">Langkah berikutnya</p>
              <h2 className="mx-auto mt-4 max-w-3xl text-balance text-3xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Belajar lebih terarah, mulai dari kebutuhanmu.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base sm:leading-8 lg:text-lg">
                Tentukan mata pelajaran dan jadwalmu. BimbelKu membantu mencarikan tutor yang sesuai, lalu progress belajarmu tetap tercatat.
              </p>

              <div className="mt-8 flex w-full justify-center sm:mt-9">
                <StudentPackageLink to="/student/packages/new" className="w-full max-w-[19rem] sm:w-auto sm:max-w-none">
                  <Button
                    size="xl"
                    className="h-14 w-full rounded-2xl bg-slate-950 px-7 font-black text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto"
                  >
                    Cari Bimbingan <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </StudentPackageLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
