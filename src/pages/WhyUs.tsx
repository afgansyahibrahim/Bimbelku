import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Reveal from "@/components/Reveal";
import StudentPackageLink from "@/components/StudentPackageLink";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  GraduationCap,
  Laptop2,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

const journey = [
  {
    icon: Target,
    title: "Tentukan kebutuhan",
    description: "Pilih mata pelajaran, materi, tujuan, jumlah sesi, dan jadwal yang memang kamu butuhkan.",
  },
  {
    icon: Radar,
    title: "Pilih cara belajar",
    description: "Gunakan Paket Belajar untuk kebutuhan yang lebih personal atau bergabung ke Kelas Kelompok yang jadwalnya sudah tersedia.",
  },
  {
    icon: GraduationCap,
    title: "Belajar bersama tutor",
    description: "Tutor menerima konteks kebutuhan belajar sebelum sesi sehingga pembahasan tidak dimulai dari nol.",
  },
  {
    icon: BarChart3,
    title: "Lihat perkembangannya",
    description: "Progress materi dan riwayat sesi membantu murid serta tutor melihat apa yang sudah selesai dan apa yang masih perlu dilanjutkan.",
  },
];

const benefits = [
  {
    icon: ShieldCheck,
    title: "Tutor melalui verifikasi",
    description: "Profil tutor ditinjau sebelum dapat mengajar sehingga identitas dan bidang ajarnya lebih jelas.",
  },
  {
    icon: CalendarDays,
    title: "Jadwal ditentukan sejak awal",
    description: "Murid memilih jadwal pada saat membuat Paket Belajar sehingga pencocokan tutor mengikuti kebutuhan waktu yang sudah dipilih.",
  },
  {
    icon: BookOpenCheck,
    title: "Progress berbasis materi",
    description: "Paket Belajar dan Kelas Kelompok memantau perkembangan per Bab. Progress materi tidak disamakan dengan jumlah sesi yang terpakai.",
  },
  {
    icon: Clock3,
    title: "Ada riwayat per sesi",
    description: "Catatan setiap pertemuan memperlihatkan materi yang dibahas dan perubahan progress dari sesi ke sesi.",
  },
  {
    icon: Laptop2,
    title: "Online atau offline",
    description: "Pilih bentuk pertemuan yang tersedia sesuai kebutuhan kelas tanpa mengubah alur belajar utama.",
  },
  {
    icon: CreditCard,
    title: "Status transaksi lebih jelas",
    description: "Pembayaran, pencocokan tutor, pelaksanaan sesi, hingga penyelesaian ditampilkan dengan status yang dapat dipantau dari dashboard.",
  },
];

export default function WhyUs() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8fb] selection:bg-orange-100 selection:text-orange-950">
      <Navbar />

      <main>
        <section className="relative overflow-hidden bg-[#071426] px-4 pb-20 pt-20 text-white sm:px-6 sm:pb-24 sm:pt-24 lg:pb-28 lg:pt-28">
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
            <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#0b1729]/80" />
          </div>

          <div className="relative mx-auto max-w-7xl">
            <Reveal direction="up">
              <Link
                to="/"
                className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-black text-slate-100 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              >
                <ArrowLeft size={17} aria-hidden="true" />
                Kembali ke Beranda
              </Link>
            </Reveal>

            <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
              <div className="min-w-0">
              <Reveal direction="up">
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[.2em] text-orange-200 sm:text-xs">
                  <Sparkles size={15} aria-hidden="true" />
                  Belajar yang lebih terarah
                </span>
              </Reveal>

              <Reveal delay={0.08} direction="up">
                <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                  Belajar lebih mudah ketika kamu tahu
                  <span className="block bg-gradient-to-r from-orange-300 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                    tujuan dan progress-nya.
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={0.16} direction="up">
                <p className="mt-6 max-w-2xl text-base font-medium leading-7 text-slate-300 sm:text-lg sm:leading-8">
                  BimbelKu membantu menyusun kebutuhan belajar dari awal: pilih materi dan jadwal, gunakan cara belajar yang sesuai, jalani sesi bersama tutor, lalu pantau perkembangan tanpa mencampur progress materi dengan jumlah pertemuan.
                </p>
              </Reveal>

              <Reveal delay={0.24} direction="up">
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <StudentPackageLink
                    to="/student/packages/new"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]"
                  >
                    Cari Bimbingan <ArrowRight size={17} aria-hidden="true" />
                  </StudentPackageLink>
                  <Link
                    to="/register"
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 text-sm font-black text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]"
                  >
                    Daftar Gratis
                  </Link>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.18} direction="left" width="100%">
              <div className="relative mx-auto w-full max-w-xl">
                <div aria-hidden="true" className="absolute -inset-8 rounded-[3rem] bg-orange-400/10 blur-3xl" />
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d1b2e] p-4 shadow-2xl shadow-black/30 sm:p-6">
                  <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Alur belajar</p>
                      <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Dari kebutuhan sampai progress</h2>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-300/15 bg-orange-400/10 text-orange-300">
                      <Target size={21} aria-hidden="true" />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {journey.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="relative min-w-0 rounded-2xl border border-white/10 bg-white/[.045] p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300">
                              <Icon size={19} aria-hidden="true" />
                            </div>
                            <span className="text-xs font-black text-slate-500">0{index + 1}</span>
                          </div>
                          <h3 className="mt-4 text-sm font-black text-white sm:text-base">{item.title}</h3>
                          <p className="mt-2 text-xs font-medium leading-5 text-slate-400 sm:text-[13px] sm:leading-6">{item.description}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-300/10 bg-emerald-400/5 px-4 py-3 text-xs font-bold leading-5 text-emerald-200">
                    <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
                    Setiap langkah punya status yang bisa dilihat kembali dari dashboard.
                  </div>
                </div>
              </div>
            </Reveal>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-xs font-black uppercase tracking-[.2em] text-orange-600">Pilih sesuai kebutuhan</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">Dua cara belajar, satu tujuan.</h2>
                <p className="mt-5 text-base font-medium leading-7 text-slate-600 sm:text-lg">
                  Tidak semua kebutuhan belajar harus memakai format yang sama. Karena itu BimbelKu memisahkan Paket Belajar dan Kelas Kelompok dengan alur yang mudah dibedakan.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <Reveal direction="right" width="100%">
                <article className="relative h-full overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
                  <div aria-hidden="true" className="absolute right-0 top-0 h-48 w-48 rounded-full bg-orange-100/60 blur-3xl" />
                  <div className="relative">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                        <Target size={23} aria-hidden="true" />
                      </div>
                      <span className="rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-orange-700">Lebih personal</span>
                    </div>
                    <h3 className="mt-6 text-2xl font-black text-slate-950 sm:text-3xl">Paket Belajar</h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7">
                      Cocok saat kamu ingin menentukan sendiri mata pelajaran, jumlah sesi, kebutuhan materi, dan jadwal sebelum pencocokan tutor berjalan.
                    </p>
                    <div className="mt-6 space-y-3">
                      {[
                        "Jadwal dipilih sejak awal saat membuat paket.",
                        "Progress materi dicatat per Bab agar mudah dipahami murid dan tutor.",
                        "Riwayat sesi membantu melihat perubahan progress dari waktu ke waktu.",
                      ].map((text) => (
                        <div key={text} className="flex gap-3 text-sm font-semibold leading-6 text-slate-700">
                          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-orange-600" aria-hidden="true" />
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                    <StudentPackageLink to="/student/packages/new" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800">
                      Buat Paket Belajar <ArrowRight size={16} aria-hidden="true" />
                    </StudentPackageLink>
                  </div>
                </article>
              </Reveal>

              <Reveal direction="left" width="100%">
                <article className="relative h-full overflow-hidden rounded-[2rem] border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
                  <div aria-hidden="true" className="absolute right-0 top-0 h-48 w-48 rounded-full bg-indigo-100/60 blur-3xl" />
                  <div className="relative">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                        <Users size={23} aria-hidden="true" />
                      </div>
                      <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-indigo-700">Belajar bersama</span>
                    </div>
                    <h3 className="mt-6 text-2xl font-black text-slate-950 sm:text-3xl">Kelas Kelompok</h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7">
                      Cocok kalau kamu ingin bergabung ke kelas bersama dengan jadwal dan materi yang sudah tersedia, lalu belajar dengan peserta lain dalam satu kelas.
                    </p>
                    <div className="mt-6 space-y-3">
                      {[
                        "Jadwal dan harga terlihat dari penawaran kelas.",
                        "Progress dibuat sederhana per Bab agar cocok untuk kelas bersama.",
                        "Riwayat pertemuan tetap tersedia untuk melihat materi yang sudah dibahas.",
                      ].map((text) => (
                        <div key={text} className="flex gap-3 text-sm font-semibold leading-6 text-slate-700">
                          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-indigo-600" aria-hidden="true" />
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                    <StudentPackageLink to="/student/kelas-murah" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 text-sm font-black text-indigo-700 transition hover:bg-indigo-100">
                      Lihat Kelas Kelompok <ArrowRight size={16} aria-hidden="true" />
                    </StudentPackageLink>
                  </div>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="max-w-3xl">
                <p className="text-xs font-black uppercase tracking-[.2em] text-orange-600">Bukan sekadar pesan sesi</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">Hal yang membantu belajar tetap jelas.</h2>
                <p className="mt-5 text-base font-medium leading-7 text-slate-600 sm:text-lg">
                  Fitur yang dipakai sekarang dirancang supaya murid dan tutor sama-sama tahu apa yang harus dilakukan sebelum, saat, dan setelah sesi belajar.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.title} delay={0.06 * index} width="100%">
                    <article className="h-full min-w-0 rounded-[1.5rem] border border-slate-200 bg-[#fbfbfd] p-5 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg sm:p-6">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-orange-300">
                        <Icon size={21} aria-hidden="true" />
                      </div>
                      <h3 className="mt-5 text-lg font-black text-slate-950 sm:text-xl">{item.title}</h3>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.description}</p>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#0f172a] px-5 py-8 text-white shadow-xl sm:px-8 sm:py-10 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
              <Reveal direction="right">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.2em] text-orange-300">Alur sederhana</p>
                  <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Tidak perlu menebak langkah berikutnya.</h2>
                  <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-300 sm:text-base">
                    Dashboard membimbing murid dan tutor lewat status yang relevan, dari kebutuhan belajar sampai progress setelah sesi.
                  </p>
                </div>
              </Reveal>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["01", "Pilih kebutuhan", "Mapel, materi, jumlah sesi, dan jadwal."],
                  ["02", "Selesaikan pemesanan", "Ikuti status pembayaran dan proses kelas dari dashboard."],
                  ["03", "Jalani sesi", "Tutor mengelola kehadiran dan penyelesaian sesi."],
                  ["04", "Pantau progress", "Lihat materi terkini dan riwayat perkembangan per sesi."],
                ].map(([number, title, description]) => (
                  <div key={number} className="rounded-2xl border border-white/10 bg-white/[.045] p-4 sm:p-5">
                    <span className="text-xs font-black text-orange-300">{number}</span>
                    <h3 className="mt-3 text-sm font-black text-white sm:text-base">{title}</h3>
                    <p className="mt-2 text-xs font-medium leading-5 text-slate-400 sm:text-sm sm:leading-6">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 sm:pb-28">
          <Reveal width="100%">
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center overflow-hidden rounded-[2rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
                <Sparkles size={22} aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Mulai dari kebutuhan belajarmu.</h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7">
                Tidak harus mengambil semua hal sekaligus. Pilih mata pelajaran dan jadwal yang memang ingin dipelajari, lalu lanjutkan sesuai alur yang tersedia.
              </p>
              <div className="mt-6 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                <StudentPackageLink to="/student/packages/new" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 text-sm font-black text-white transition hover:bg-orange-700">
                  Cari Bimbingan <ArrowRight size={17} aria-hidden="true" />
                </StudentPackageLink>
                <Link to="/register" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-800 transition hover:bg-slate-50">
                  Buat Akun Murid
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
