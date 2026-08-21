import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Atom,
  BookOpenText,
  Calculator,
  ChartNoAxesCombined,
  Dna,
  FlaskConical,
  Languages,
  Loader2,
  Map,
  Microscope,
  RefreshCw,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import { getCached } from "@/lib/http";
import StudentPackageLink from "@/components/StudentPackageLink";

type LandingSubject = { id: number; name: string };

type SubjectVisual = {
  icon: LucideIcon;
  subtitle: string;
  accent: string;
  iconClass: string;
};

const subjectVisuals: Record<string, SubjectVisual> = {
  Matematika: { icon: Calculator, subtitle: "Logika & pemecahan masalah", accent: "from-indigo-50 to-violet-50", iconClass: "bg-indigo-100 text-indigo-700" },
  "Bahasa Inggris": { icon: Languages, subtitle: "Vocabulary & communication", accent: "from-sky-50 to-cyan-50", iconClass: "bg-sky-100 text-sky-700" },
  Fisika: { icon: Atom, subtitle: "Konsep, gaya & energi", accent: "from-orange-50 to-amber-50", iconClass: "bg-orange-100 text-orange-700" },
  Kimia: { icon: FlaskConical, subtitle: "Materi & reaksi kimia", accent: "from-fuchsia-50 to-pink-50", iconClass: "bg-fuchsia-100 text-fuchsia-700" },
  Biologi: { icon: Dna, subtitle: "Makhluk hidup & lingkungan", accent: "from-emerald-50 to-green-50", iconClass: "bg-emerald-100 text-emerald-700" },
  "Bahasa Indonesia": { icon: BookOpenText, subtitle: "Bahasa, teks & literasi", accent: "from-rose-50 to-orange-50", iconClass: "bg-rose-100 text-rose-700" },
  Ekonomi: { icon: ChartNoAxesCombined, subtitle: "Konsep ekonomi & analisis", accent: "from-cyan-50 to-teal-50", iconClass: "bg-cyan-100 text-cyan-700" },
  Akuntansi: { icon: Shapes, subtitle: "Pencatatan & laporan keuangan", accent: "from-slate-50 to-zinc-50", iconClass: "bg-slate-200 text-slate-700" },
  IPA: { icon: Microscope, subtitle: "Sains terpadu & eksperimen", accent: "from-teal-50 to-emerald-50", iconClass: "bg-teal-100 text-teal-700" },
  IPS: { icon: Map, subtitle: "Masyarakat, ruang & ekonomi", accent: "from-amber-50 to-yellow-50", iconClass: "bg-amber-100 text-amber-700" },
};

const fallbackVisual: SubjectVisual = {
  icon: BookOpenText,
  subtitle: "Atur kebutuhan belajar",
  accent: "from-slate-50 to-orange-50",
  iconClass: "bg-orange-100 text-orange-700",
};

const SubjectsSection = () => {
  const [subjects, setSubjects] = useState<LandingSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  const loadSubjects = useCallback((force = false) => {
    setLoading(true);
    setFailed(false);
    void getCached<{ landing_subjects?: LandingSubject[] }>("/learning-catalog", {
      params: { compact: 1 },
      maxAgeMs: 5 * 60_000,
      force,
    })
      .then((response) => {
        if (!mounted.current) return;
        const available = (response.data.landing_subjects || [])
          .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.name?.trim())
          .slice(0, 8);
        setSubjects(available);
      })
      .catch(() => {
        if (mounted.current) setFailed(true);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadSubjects();
    return () => { mounted.current = false; };
  }, [loadSubjects]);

  return (
    <section className="bg-background py-20 sm:py-24">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col items-center text-center sm:mb-12">
          <Reveal>
            <p className="rounded-full bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-orange-700">Mulai dari yang ingin dipelajari</p>
            <h2 className="mt-4 text-balance text-3xl font-black text-foreground md:text-4xl">Pilih Mata Pelajaran</h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Setelah memilih mapel, lanjutkan dengan jenjang, Bab, tujuan belajar, mode, dan jadwal yang kamu butuhkan.
            </p>
          </Reveal>
        </div>

        {loading ? (
          <div className="grid min-h-44 place-items-center rounded-3xl border border-border bg-card">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat mata pelajaran...</span>
          </div>
        ) : failed ? (
          <div className="grid min-h-44 place-items-center rounded-3xl border border-border bg-card px-6 text-center">
            <div><p className="font-bold text-foreground">Daftar mata pelajaran belum dapat dimuat.</p><button type="button" onClick={() => loadSubjects(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><RefreshCw className="h-4 w-4" />Coba lagi</button></div>
          </div>
        ) : subjects.length === 0 ? (
          <div className="grid min-h-44 place-items-center rounded-3xl border border-border bg-card px-6 text-center text-sm font-semibold text-muted-foreground">
            Mata pelajaran aktif belum tersedia.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {subjects.map((subject, index) => {
              const visual = subjectVisuals[subject.name] || fallbackVisual;
              const Icon = visual.icon;
              return (
                <Reveal key={subject.id} delay={index * 0.06} direction="up" width="100%" className="h-full min-w-0">
                  <StudentPackageLink
                    to={`/student/packages/new?subject_name=${encodeURIComponent(subject.name)}`}
                    className={`group relative block h-full min-h-[166px] min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br ${visual.accent} p-4 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-[182px] sm:p-5 md:min-h-[204px] md:p-6`}
                  >
                    <div className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full border-[18px] border-white/35" aria-hidden="true" />
                    <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-slate-400 transition group-hover:text-primary sm:right-4 sm:top-4" aria-hidden="true" />
                    <span className={`mb-5 grid h-11 w-11 place-items-center rounded-2xl ${visual.iconClass} shadow-sm transition-transform duration-300 group-hover:scale-105 sm:h-12 sm:w-12`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                    </span>
                    <span className="relative block min-w-0 pr-1">
                      <span className="line-clamp-2 min-h-[2.5rem] break-words text-[13px] font-black leading-5 text-slate-900 sm:text-sm md:text-base">{subject.name}</span>
                      <span className="mt-2 block line-clamp-2 text-[10px] font-semibold leading-4 text-slate-500 sm:text-xs">{visual.subtitle}</span>
                    </span>
                  </StudentPackageLink>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default SubjectsSection;
