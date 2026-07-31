import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  MapPin,
  Monitor,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import TeacherLayout from "@/components/TeacherLayout";
import { getCached } from "@/lib/http";

type Participant = {
  student_id: number;
  name: string;
  status: string;
};

type TeacherClass = {
  id: number;
  subject: string;
  chapter?: string | null;
  subtopic?: string | null;
  method: "online" | "offline";
  type: "private" | "group";
  status: string;
  start_at: string;
  end_at: string;
  teacher_net_amount: number;
  participants: Participant[];
};

const activeStatuses = new Set([
  "confirmed",
  "in_progress",
  "awaiting_student_approval",
  "disputed",
  "admin_review_required",
]);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatSchedule = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function TeacherDashboard() {
  const [name, setName] = useState("Tutor");
  const [points, setPoints] = useState(150);
  const [salary, setSalary] = useState({ pending_amount: 0, ready_sessions: 0 });
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileResponse, salaryResponse, classesResponse] = await Promise.all([
          getCached("/teacher/profile", { maxAgeMs: 60_000 }),
          getCached("/teacher/salary", { maxAgeMs: 15_000 }),
          getCached<TeacherClass[]>("/teacher/classes", { maxAgeMs: 15_000 }),
        ]);

        setName(profileResponse.data.user?.name || "Tutor");
        setPoints(Number(profileResponse.data.profile?.points || 0));
        setSalary(salaryResponse.data);
        setClasses(classesResponse.data);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Dashboard tutor gagal dimuat.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const activeClasses = useMemo(
    () => classes.filter((item) => activeStatuses.has(item.status)),
    [classes],
  );
  const studentCount = useMemo(
    () =>
      new Set(
        activeClasses.flatMap((item) =>
          item.participants
            .filter((participant) => !["cancelled", "refunded"].includes(participant.status))
            .map((participant) => participant.student_id),
        ),
      ).size,
    [activeClasses],
  );
  const upcoming = useMemo(
    () =>
      [...activeClasses]
        .filter((item) => new Date(item.end_at).getTime() >= Date.now())
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
        .slice(0, 4),
    [activeClasses],
  );

  return (
    <TeacherLayout title="Dashboard Tutor">
      <div className="space-y-7 pb-16">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-8 text-white shadow-xl md:p-10">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-100">
                <ShieldCheck size={14} /> {points} poin performa
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
                Halo, {loading ? "…" : name.split(" ")[0]}!
              </h1>
              <p className="mt-2 max-w-xl text-indigo-100/75">
                Pantau sesi sesuai slot yang sudah dipesan, unggah bukti pelaksanaan, dan jaga respons tetap cepat.
              </p>
            </div>
            <Link
              to="/guru/permintaan"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-indigo-50"
            >
              Lihat permintaan <ArrowRight size={17} />
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric icon={Users} label="Murid aktif" value={`${studentCount}`} color="bg-orange-500" />
          <Metric icon={BookOpen} label="Sesi aktif" value={`${activeClasses.length}`} color="bg-indigo-600" />
          <Metric
            icon={TrendingUp}
            label={`${salary.ready_sessions || 0} sesi siap dicairkan`}
            value={formatCurrency(salary.pending_amount)}
            color="bg-emerald-600"
          />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                <CalendarDays className="text-indigo-600" /> Jadwal terdekat
              </h2>
              <p className="mt-1 text-sm text-slate-500">Waktu ini sudah dikunci dan tidak boleh bertabrakan.</p>
            </div>
            <Link to="/guru/kelas" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
              Kelola semua
            </Link>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">Memuat jadwal…</div>
          ) : upcoming.length ? (
            <div className="divide-y divide-slate-100">
              {upcoming.map((item) => (
                <Link
                  key={item.id}
                  to="/guru/kelas"
                  className="flex flex-col gap-4 p-6 transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className={`grid h-13 w-13 shrink-0 place-items-center rounded-2xl ${item.method === "online" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"}`}>
                      {item.method === "online" ? <Monitor size={22} /> : <MapPin size={22} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-slate-900">{item.subject}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {[item.chapter, item.subtopic].filter(Boolean).join(" · ") || "Materi sesuai permintaan murid"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                      <Clock3 size={13} className="mr-1 inline" /> {formatSchedule(item.start_at)} WIB
                    </span>
                    <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">
                      {item.type === "group" ? `${item.participants.length} murid` : "Privat"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <BookOpen className="mx-auto text-slate-300" size={36} />
              <p className="mt-3 font-bold text-slate-700">Belum ada sesi aktif.</p>
              <p className="mt-1 text-sm text-slate-400">Permintaan yang cocok akan muncul pada halaman permintaan.</p>
            </div>
          )}
        </section>
      </div>
    </TeacherLayout>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white ${color}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
