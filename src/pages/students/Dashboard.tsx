import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  Monitor,
  Radar,
  RefreshCw,
  Tag,
  UserRound,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import DynamicBannerCarousel from "@/components/DynamicBannerCarousel";
import StudentLayout from "@/components/StudentLayout";
import { getApiError, getCached } from "@/lib/http";

type Subject = {
  id: number;
  name: string;
  allocated_sessions: number;
  teacher?: { name: string; avatar_url?: string | null } | null;
  sessions: Array<{ start_at: string; status: string }>;
};
type PackageData = {
  id: number;
  status: string;
  plan: { name: string };
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  expires_at?: string | null;
  payment_due_at?: string | null;
  subjects: Subject[];
  latest_order?: { id: number; status: string } | null;
};
type DashboardData = {
  packages: PackageData[];
  voucher_count: number;
  next_session?: {
    id: number;
    subject: string;
    chapter?: string | null;
    teacher_name: string;
    learning_mode: "online" | "offline";
    status: string;
    start_at: string;
    end_at: string;
  } | null;
};

const activeStatuses = ["active", "payment_submitted", "awaiting_payment", "payment_rejected", "matching", "teacher_pending", "no_teacher", "refund_pending"];

export default function Dashboard() {
  const [name, setName] = useState("Murid");
  const [data, setData] = useState<DashboardData>({ packages: [], voucher_count: 0, next_session: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [userResponse, dashboardResponse] = await Promise.all([
        getCached<{ name: string }>("/user", { maxAgeMs: 60_000 }),
        getCached<DashboardData>("/student/dashboard-v2", { maxAgeMs: 10_000 }),
      ]);
      setName(userResponse.data.name || "Murid");
      setData(dashboardResponse.data);
      setError(null);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          setError("network");
        } else if (error.response.status === 401) {
          setError("unauthorized");
        } else if (error.response.status === 403) {
          setError("forbidden");
        } else if (error.response.status === 404) {
          setError("not_found");
        } else {
          setError("generic");
        }
      } else {
        setError("generic");
      }
      toast.error(getApiError(error, "Dashboard murid gagal dimuat."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const retry = () => {
    setError(null);
    setLoading(true);
    void load();
  };

  const activePackage = useMemo(
    () => data.packages.find((item) => activeStatuses.includes(item.status)),
    [data.packages],
  );
  const allSubjects = data.packages.flatMap((item) => item.subjects);
  const nearestSubjectSessions = allSubjects
    .flatMap((subject) => subject.sessions.map((session) => ({ ...session, subject: subject.name })))
    .filter((session) => new Date(session.start_at).getTime() >= Date.now())
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 3);

  return (
    <StudentLayout title="Beranda">
      <div className="space-y-6 pb-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-500">Beranda murid</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Halo, {loading ? "…" : name.split(" ")[0]}!</h1>
          </div>
          <Link to="/student/packages/new" className="hidden items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white sm:flex">
            <Radar size={17} /> Cari Les
          </Link>
        </div>

        <DynamicBannerCarousel audience="student" />

        {loading ? (
          <div className="grid min-h-48 place-items-center"><Loader2 className="animate-spin text-indigo-600" size={34} /></div>
        ) : error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : (
          <>
            <AdaptiveCard packageData={activePackage} nextSession={data.next_session} />

            {activePackage && (
              <section className="grid gap-3 sm:grid-cols-3">
                <Summary icon={BookOpenCheck} label="Sisa sesi" value={`${activePackage.remaining_sessions}`} color="bg-indigo-600" />
                <Summary icon={UserRound} label="Mata pelajaran" value={`${activePackage.subjects.length}`} color="bg-emerald-600" />
                <Summary icon={CalendarDays} label="Masa aktif" value={activePackage.expires_at ? `${Math.max(0, Math.ceil((new Date(activePackage.expires_at).getTime() - Date.now()) / 86_400_000))} hari` : "Belum aktif"} color="bg-orange-500" />
              </section>
            )}

            {activePackage?.subjects.length ? (
              <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div><h2 className="text-xl font-black text-slate-900">Mata pelajaran saya</h2><p className="mt-1 text-sm text-slate-500">Tutor dan progres dipisahkan untuk setiap mapel.</p></div>
                  <Link to="/student/packages" className="text-sm font-black text-indigo-600">Detail</Link>
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {activePackage.subjects.map((subject) => {
                    const completed = subject.sessions.filter((session) => session.status === "completed").length;
                    const progress = Math.round(completed / Math.max(1, subject.allocated_sessions) * 100);
                    return (
                      <div key={subject.id} className="rounded-3xl bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white text-indigo-600 shadow-sm">
                            {subject.teacher?.avatar_url ? <img src={subject.teacher.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound size={19} />}
                          </div>
                          <div className="min-w-0 flex-1"><h3 className="truncate font-black text-slate-900">{subject.name}</h3><p className="truncate text-xs text-slate-500">{subject.teacher ? `Tutor ${subject.teacher.name}` : "Tutor sedang dicari"}</p></div>
                          <span className="text-sm font-black text-indigo-700">{progress}%</span>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500" style={{ width: `${progress}%` }} /></div>
                        <p className="mt-2 text-[11px] font-bold text-slate-400">{completed} dari {subject.allocated_sessions} sesi selesai</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
                <BookOpenCheck className="mx-auto text-slate-300" size={38} />
                <h2 className="mt-3 text-xl font-black text-slate-800">Belum ada paket aktif</h2>
                <p className="mt-2 text-sm text-slate-500">Mulai dari satu sesi atau pilih paket bulanan.</p>
                <Link to="/student/packages/new" className="mt-5 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white">Pilih Paket Belajar</Link>
              </section>
            )}

            <section className="grid gap-5 lg:grid-cols-[1fr_330px]">
              <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between">
                  <div><h2 className="text-xl font-black text-slate-900">Jadwal minggu ini</h2><p className="mt-1 text-sm text-slate-500">Tiga sesi terdekat.</p></div>
                  <Link to="/student/my-classes" className="text-sm font-black text-indigo-600">Semua</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {nearestSubjectSessions.length ? nearestSubjectSessions.map((session) => (
                    <div key={`${session.subject}-${session.start_at}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm"><Clock3 size={18} /></div>
                      <div><p className="font-black text-slate-800">{session.subject}</p><p className="mt-1 text-xs text-slate-500">{new Date(session.start_at).toLocaleString("id-ID", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
                    </div>
                  )) : <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">Belum ada jadwal aktif.</p>}
                </div>
              </div>

              <Link to="/student/vouchers" className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-500 to-rose-600 p-6 text-white shadow-lg">
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full border-[24px] border-white/10" />
                <Tag className="relative" size={28} />
                <p className="relative mt-7 text-4xl font-black">{data.voucher_count}</p>
                <h2 className="relative mt-1 text-lg font-black">Voucher tersedia</h2>
                <p className="relative mt-2 text-sm text-white/75">Gunakan sebelum masa penawaran berakhir.</p>
                <span className="relative mt-5 inline-flex items-center gap-1 text-sm font-black">Lihat Voucher <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span>
              </Link>
            </section>
          </>
        )}
      </div>
    </StudentLayout>
  );
}

function AdaptiveCard({ packageData, nextSession }: { packageData?: PackageData; nextSession?: DashboardData["next_session"] }) {
  if (!packageData) {
    return <ActionCard icon={Radar} eyebrow="Mulai belajar" title="Pilih Paket Belajar" description="Tentukan jumlah sesi, mapel, dan jadwal sejak awal." to="/student/packages/new" action="Lihat Paket" />;
  }
  if (["matching", "teacher_pending"].includes(packageData.status)) {
    const accepted = packageData.subjects.filter((item) => item.teacher).length;
    return <ActionCard icon={Radar} eyebrow="Radar aktif" title="Pencarian Tutor Berlangsung" description={`${accepted} dari ${packageData.subjects.length} tutor mapel sudah menerima.`} to="/student/packages" action="Lihat Progres" pulse />;
  }
  if (packageData.status === "no_teacher") {
    return <ActionCard icon={Radar} eyebrow="Pencarian dijeda" title="Tutor Belum Tersedia" description="Perluas pencarian atau batalkan paket tanpa kehilangan voucher." to="/student/packages" action="Atur Pencarian" />;
  }
  if (["awaiting_payment", "payment_rejected"].includes(packageData.status) && packageData.latest_order) {
    return <ActionCard icon={CreditCard} eyebrow={packageData.status === "payment_rejected" ? "Bukti perlu diperbaiki" : "Tutor sudah cocok"} title="Selesaikan Pembayaran" description="Slot seluruh tutor ditahan selama 48 jam." to="/payment" action="Bayar Sekarang" />;
  }
  if (packageData.status === "payment_submitted") {
    return <ActionCard icon={RefreshCw} eyebrow="Bukti sudah masuk" title="Pembayaran Diperiksa Admin" description="Jadwal tetap ditahan selama pemeriksaan berlangsung." to="/student/history" action="Lihat Status" />;
  }
  if (packageData.status === "refund_pending") {
    return <ActionCard icon={RefreshCw} eyebrow="Dana aman" title="Refund Sedang Diproses" description="Admin akan mengirim pengembalian dana dan bukti transfer." to="/student/history" action="Lihat Status" />;
  }
  if (nextSession) {
    const modeIcon = nextSession.learning_mode === "online" ? Monitor : MapPin;
    return <ActionCard icon={modeIcon} eyebrow="Kelas berikutnya" title={`${nextSession.subject} bersama ${nextSession.teacher_name}`} description={new Date(nextSession.start_at).toLocaleString("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} to="/student/my-classes" action="Lihat Detail" />;
  }
  return <ActionCard icon={BookOpenCheck} eyebrow="Paket aktif" title={`${packageData.remaining_sessions} sesi masih tersedia`} description="Buka Kelas Saya untuk melihat tutor, jadwal, dan laporan." to="/student/packages" action="Buka Kelas Saya" />;
}

function ActionCard({ icon: Icon, eyebrow, title, description, to, action, pulse = false }: { icon: typeof Radar; eyebrow: string; title: string; description: string; to: string; action: string; pulse?: boolean }) {
  return <section className="flex flex-col justify-between gap-5 rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-white to-indigo-50 p-5 shadow-sm sm:flex-row sm:items-center sm:p-6"><div className="flex items-center gap-4"><div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 ${pulse ? "animate-pulse" : ""}`}><Icon size={24} /></div><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-indigo-500">{eyebrow}</p><h2 className="mt-1 text-xl font-black text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div></div><Link to={to} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">{action} <ArrowRight size={16} /></Link></section>;
}

function Summary({ icon: Icon, label, value, color }: { icon: typeof BookOpenCheck; label: string; value: string; color: string }) {
  return <div className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className={`grid h-12 w-12 place-items-center rounded-2xl text-white ${color}`}><Icon size={21} /></div><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p></div></div>;
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  if (error === "network") {
    return (
      <div className="grid min-h-[400px] place-items-center px-4 text-center">
        <div>
          <WifiOff className="mx-auto text-slate-300" size={48} />
          <h2 className="mt-4 text-xl font-black text-slate-800">Koneksi Terputus</h2>
          <p className="mt-2 text-sm text-slate-500">Periksa koneksi internet Anda dan coba lagi.</p>
          <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-colors">
            <RefreshCw size={16} /> Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (error === "forbidden") {
    return (
      <div className="grid min-h-[400px] place-items-center px-4 text-center">
        <div>
          <AlertCircle className="mx-auto text-amber-500" size={48} />
          <h2 className="mt-4 text-xl font-black text-slate-800">Akses Ditolak</h2>
          <p className="mt-2 text-sm text-slate-500">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          <Link to="/student/profile" className="mt-5 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 transition-colors">
            Kembali ke Profil
          </Link>
        </div>
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div className="grid min-h-[400px] place-items-center px-4 text-center">
        <div>
          <AlertCircle className="mx-auto text-slate-300" size={48} />
          <h2 className="mt-4 text-xl font-black text-slate-800">Data Tidak Ditemukan</h2>
          <p className="mt-2 text-sm text-slate-500">Dashboard tidak dapat dimuat saat ini.</p>
          <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-colors">
            <RefreshCw size={16} /> Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (error === "unauthorized") {
    return (
      <div className="grid min-h-[400px] place-items-center px-4 text-center">
        <div>
          <AlertCircle className="mx-auto text-orange-500" size={48} />
          <h2 className="mt-4 text-xl font-black text-slate-800">Sesi Berakhir</h2>
          <p className="mt-2 text-sm text-slate-500">Sesi Anda telah berakhir. Silakan login kembali.</p>
          <Link to="/login" className="mt-5 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-colors">
            Login Kembali
          </Link>
        </div>
      </div>
    );
  }

  // Generic error
  return (
    <div className="grid min-h-[400px] place-items-center px-4 text-center">
      <div>
        <AlertCircle className="mx-auto text-rose-500" size={48} />
        <h2 className="mt-4 text-xl font-black text-slate-800">Terjadi Kesalahan</h2>
        <p className="mt-2 text-sm text-slate-500">Dashboard tidak dapat dimuat. Silakan coba lagi.</p>
        <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-colors">
          <RefreshCw size={16} /> Coba Lagi
        </button>
      </div>
    </div>
  );
}

