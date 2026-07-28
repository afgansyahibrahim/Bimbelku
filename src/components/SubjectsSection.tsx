import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import http from "@/lib/http";

const fallbackSubjects = [
  "Matematika",
  "Bahasa Inggris",
  "Fisika",
  "Kimia",
  "Biologi",
  "Bahasa Indonesia",
  "Ekonomi",
  "Akuntansi",
];

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
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState(fallbackSubjects);

  useEffect(() => {
    let active = true;
    void http.get<{ subjects?: string[] }>("/learning-catalog")
      .then((response) => {
        const available = response.data.subjects?.filter(Boolean).slice(0, 8);
        if (active && available?.length) setSubjects(available);
      })
      .catch(() => {
        // Daftar bawaan tetap ditampilkan jika API publik belum aktif.
      });

    return () => {
      active = false;
    };
  }, []);

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

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {subjects.map((subject, index) => (
            <Reveal key={subject} delay={index * 0.08} direction="up" width="100%">
              <button
                type="button"
                onClick={() => navigate(`/search?subject=${encodeURIComponent(subject)}`)}
                className="group w-full rounded-2xl border border-border bg-card p-6 text-left transition-all duration-300 hover:border-primary hover:shadow-card-hover"
              >
                <span className="mb-4 block text-4xl transition-transform duration-300 group-hover:scale-110">
                  {subjectIcons[subject] || "🎓"}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground transition-colors group-hover:text-primary">
                    {subject}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                </span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  Atur kebutuhan belajar
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubjectsSection;
