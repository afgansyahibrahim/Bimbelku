import { notify } from "@/lib/notify";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Bell, CalendarClock, ChevronRight, CircleHelp, Landmark, Loader2, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import TeacherLayout from "@/components/TeacherLayout";
import { getCached } from "@/lib/http";

type ProfileData = {
  user?: { name?: string; email?: string; status?: string };
  profile?: { photo_url?: string | null; expertise?: string; points?: number; is_accepting_requests?: boolean };
};

const links = [
  { to: "/guru/profil", label: "Profil tutor", detail: "Identitas, kompetensi, dan dokumen", icon: UserRound, color: "bg-indigo-50 text-indigo-600" },
  { to: "/guru/jadwal", label: "Jadwal tersedia", detail: "Atur hari dan rentang waktu menerima kelas", icon: CalendarClock, color: "bg-violet-50 text-violet-600" },
  { to: "/guru/gaji", label: "Pendapatan & pencairan", detail: "Saldo ditahan, tersedia, diajukan, dan dibayar", icon: WalletCards, color: "bg-emerald-50 text-emerald-600" },
  { to: "/guru/rekening", label: "Rekening pencairan", detail: "Ubah rekening dengan perlindungan keamanan", icon: Landmark, color: "bg-cyan-50 text-cyan-600" },
  { to: "/guru/performa", label: "Performa & banding", detail: "Nilai, poin, penalti, dan status banding", icon: BarChart3, color: "bg-amber-50 text-amber-600" },
  { to: "/guru/notifikasi", label: "Notifikasi", detail: "Semua pemberitahuan pekerjaan tutor", icon: Bell, color: "bg-rose-50 text-rose-600" },
  { to: "/guru/bantuan", label: "Pusat bantuan", detail: "Panduan dan bantuan penggunaan", icon: CircleHelp, color: "bg-slate-100 text-slate-600" },
];

export default function TeacherAccount() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCached<ProfileData>("/teacher/profile", { maxAgeMs: 60_000 })
      .then((response) => setData(response.data))
      .catch(() => notify.error("Data akun tutor gagal dimuat."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <TeacherLayout title="Saya">
      <div className="space-y-5 pb-8 sm:space-y-7">
        <section className="overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8">
          {loading ? <div className="grid min-h-32 place-items-center"><Loader2 className="animate-spin" /></div> : <div className="flex min-w-0 items-center gap-4 sm:gap-5"><span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[1.4rem] border border-white/15 bg-white/10 text-xl font-black sm:h-20 sm:w-20">{data?.profile?.photo_url ? <img src={data.profile.photo_url} alt="Foto profil tutor" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : data?.user?.name?.charAt(0) || "T"}</span><div className="min-w-0 flex-1"><p className="truncate text-xl font-black sm:text-2xl">{data?.user?.name || "Tutor BimbelKu"}</p><p className="mt-1 truncate text-xs text-indigo-100/75 sm:text-sm">{data?.user?.email}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider"><ShieldCheck size={12} className="mr-1 inline" />{data?.profile?.points || 0} poin</span><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${data?.profile?.is_accepting_requests ? "bg-emerald-400/20 text-emerald-100" : "bg-amber-400/20 text-amber-100"}`}>{data?.profile?.is_accepting_requests ? "Menerima permintaan" : "Permintaan dijeda"}</span></div></div></div>}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {links.map(({ to, label, detail, icon: Icon, color }) => <Link key={to} to={to} className="group flex min-w-0 items-center gap-3 rounded-[1.4rem] border border-slate-100 bg-white p-4 shadow-sm transition hover-rise-half hover:border-indigo-100 hover-shadow-lg sm:p-5"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${color}`}><Icon size={19} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-slate-900">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></span><ChevronRight size={18} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" /></Link>)}
        </section>
      </div>
    </TeacherLayout>
  );
}
