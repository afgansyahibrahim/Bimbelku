import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Reveal from "@/components/Reveal";

const packages = [
  ["Coba Belajar", "1 sesi", "7 hari", "Coba layanan"],
  ["Paket Dasar", "4 sesi", "30 hari", "Fokus satu mapel"],
  ["Paket Reguler", "8 sesi", "30 hari", "Maksimal dua mapel"],
] as const;

export default function PackagePreviewSection() {
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

          <Link
            to="/student/packages/new"
            className="text-sm font-black text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
          >
            Lihat semua paket →
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {packages.map(([name, sessions, validity, note], index) => (
            <Reveal key={name} delay={index * 0.1} width="100%">
              <Link
                to="/student/packages/new"
                aria-label={`Pilih ${name}`}
                className={`group relative block h-full overflow-hidden rounded-[2rem] border p-6 transition duration-200 ease-out hover:-translate-y-1 hover:shadow-xl active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-4 ${
                  index === 1
                    ? "border-primary bg-orange-50/60 shadow-xl shadow-orange-100"
                    : "border-slate-100 bg-white shadow-sm"
                }`}
              >
                {index === 1 && (
                  <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-black text-white">
                    <Sparkles size={12} aria-hidden="true" /> Favorit
                  </span>
                )}

                <h3 className="text-lg font-black text-slate-900">{name}</h3>
                <p className="mt-5 text-4xl font-black text-slate-950">{sessions}</p>

                <div className="mt-5 space-y-3 text-sm font-bold text-slate-600">
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-500" aria-hidden="true" />
                    Masa aktif {validity}
                  </p>
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-500" aria-hidden="true" />
                    {note}
                  </p>
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-500" aria-hidden="true" />
                    Tutor terverifikasi
                  </p>
                </div>

                <span
                  className={`mt-7 flex h-12 items-center justify-center rounded-2xl text-sm font-black transition group-hover:brightness-105 ${
                    index === 1 ? "bg-primary text-white" : "bg-slate-950 text-white"
                  }`}
                >
                  Pilih Paket
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
