import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import Reveal from "@/components/Reveal";
import { getCached } from "@/lib/http";
import StudentPackageLink from "@/components/StudentPackageLink";

type LandingSubject = { id: number; name: string };

const subjectIcons: Record<string, string> = {
  Matematika: "📐",
  "Bahasa Inggris": "🌐",
  Fisika: "⚡",
  Kimia: "🧪",
  Biologi: "🧬",
  "Bahasa Indonesia": "📚",
  Ekonomi: "📊",
  Akuntansi: "🧾",
  IPA: "🔬",
  IPS: "🗺️",
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
    return () => {
      mounted.current = false;
    };
  }, [loadSubjects]);

  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex flex-col items-center text-center">
          <Reveal>
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Pilih Mata Pelajaran
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Lanjutkan dengan jenjang, bab, submateri, tujuan, dan jadwal yang ingin dipelajari.
            </p>
          </Reveal>
        </div>

        {loading ? (
          <div className="grid min-h-40 place-items-center rounded-2xl border border-border bg-card">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat mata pelajaran...</span>
          </div>
        ) : failed ? (
          <div className="grid min-h-40 place-items-center rounded-2xl border border-border bg-card px-6 text-center">
            <div><p className="font-bold text-foreground">Daftar mata pelajaran belum dapat dimuat.</p><button type="button" onClick={() => loadSubjects(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><RefreshCw className="h-4 w-4" />Coba lagi</button></div>
          </div>
        ) : subjects.length === 0 ? (
          <div className="grid min-h-40 place-items-center rounded-2xl border border-border bg-card px-6 text-center text-sm font-semibold text-muted-foreground">
            Mata pelajaran aktif belum tersedia.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {subjects.map((subject, index) => (
              <Reveal key={subject.id} delay={index * 0.08} direction="up" width="100%" className="h-full min-w-0">
                <StudentPackageLink
                  to={`/student/packages/new?subject_name=${encodeURIComponent(subject.name)}`}
                  className="group relative block h-full min-h-[154px] min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-[166px] sm:p-5 md:min-h-[190px] md:p-6"
                >
                  <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-muted-foreground transition group-hover:text-primary sm:right-4 sm:top-4" aria-hidden="true" />
                  <span className="mb-4 block pr-7 text-[2rem] leading-none transition-transform duration-300 group-hover:scale-110 sm:text-4xl">
                    {subjectIcons[subject.name] || "🎓"}
                  </span>
                  <span className="block min-w-0 pr-1">
                    <span className="line-clamp-2 min-h-[2.5rem] break-words text-[13px] font-bold leading-5 text-foreground transition-colors group-hover:text-primary sm:text-sm md:text-base">
                      {subject.name}
                    </span>
                    <span className="mt-2 block text-[11px] leading-4 text-muted-foreground sm:text-xs">
                      Atur kebutuhan belajar
                    </span>
                  </span>
                </StudentPackageLink>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SubjectsSection;
