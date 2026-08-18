import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import Reveal from "@/components/Reveal";
import { getCached } from "@/lib/http";
import StudentPackageLink from "@/components/StudentPackageLink";

type PackagePlan = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  session_count: number;
  validity_days: number;
  maximum_subjects: number;
  sort_order: number;
};

const fallbackPlans: PackagePlan[] = [
  { id: -1, name: "Coba Belajar", slug: "coba-belajar", description: "Satu sesi untuk mencoba alur belajar BimbelKu.", session_count: 1, validity_days: 7, maximum_subjects: 1, sort_order: 10 },
  { id: -2, name: "Bulanan Dasar", slug: "bulanan-dasar", description: "Empat sesi selama 30 hari untuk fokus pada satu mapel.", session_count: 4, validity_days: 30, maximum_subjects: 1, sort_order: 20 },
  { id: -3, name: "Bulanan Reguler", slug: "bulanan-reguler", description: "Delapan sesi selama 30 hari untuk maksimal dua mapel.", session_count: 8, validity_days: 30, maximum_subjects: 2, sort_order: 30 },
  { id: -4, name: "Bulanan Intensif", slug: "bulanan-intensif", description: "Dua belas sesi selama 30 hari untuk maksimal tiga mapel.", session_count: 12, validity_days: 30, maximum_subjects: 3, sort_order: 40 },
];

export default function PackagePreviewSection() {
  const [plans, setPlans] = useState<PackagePlan[]>(fallbackPlans);

  useEffect(() => {
    let mounted = true;
    void getCached<PackagePlan[]>("/package-plans", { maxAgeMs: 60_000, force: true })
      .then((response) => {
        if (!mounted || !Array.isArray(response.data) || response.data.length === 0) return;
        setPlans(response.data);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-primary">
              Paket belajar
            </p>
            <h2 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">
              Mulai sesuai kebutuhanmu
            </h2>
            <p className="mt-3 text-slate-500">
              Harga dihitung per sesi dan dapat berbeda menurut mapel.
            </p>
          </div>

          <StudentPackageLink
            to="/student/packages/new"
            className="text-sm font-black text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
          >
            Lihat semua paket →
          </StudentPackageLink>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, index) => {
            const favorite = plan.session_count === 4;
            const subjectText = plan.maximum_subjects === 1
              ? "Maksimal satu mapel"
              : `Maksimal ${plan.maximum_subjects} mapel`;
            return (
            <Reveal key={plan.id} delay={index * 0.08} width="100%">
              <StudentPackageLink
                to="/student/packages/new"
                aria-label={`Pilih ${plan.name}`}
                className={`group relative block h-full overflow-hidden rounded-[2rem] border p-6 transition duration-200 ease-out hover-rise hover-shadow-xl active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-4 ${
                  favorite
                    ? "border-primary bg-orange-50/60 shadow-xl shadow-orange-100"
                    : "border-slate-100 bg-white shadow-sm"
                }`}
              >
                {favorite && (
                  <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-black text-white">
                    <Sparkles size={12} aria-hidden="true" /> Favorit
                  </span>
                )}

                <h3 className="pr-16 text-lg font-black text-slate-900">{plan.name}</h3>
                <p className="mt-5 text-4xl font-black text-slate-950">{plan.session_count} <span className="text-base text-slate-500">sesi</span></p>

                <div className="mt-5 space-y-3 text-sm font-bold text-slate-600">
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-500" aria-hidden="true" />
                    Masa aktif {plan.validity_days} hari
                  </p>
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-500" aria-hidden="true" />
                    {subjectText}
                  </p>
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-500" aria-hidden="true" />
                    Tutor terverifikasi
                  </p>
                </div>

                <span
                  className={`mt-7 flex h-12 items-center justify-center rounded-2xl text-sm font-black transition group-hover:brightness-105 ${
                    favorite ? "bg-primary text-white" : "bg-slate-950 text-white"
                  }`}
                >
                  Pilih Paket
                </span>
              </StudentPackageLink>
            </Reveal>
          );})}
        </div>
      </div>
    </section>
  );
}
