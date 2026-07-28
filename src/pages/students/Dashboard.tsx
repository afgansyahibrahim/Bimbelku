import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  MapPin,
  Monitor,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import StudentLayout from "@/components/StudentLayout";
import http from "@/lib/http";

type StudentClass = {
  id: number;
  title: string;
  subject: string;
  mentor: string;
  type: "Privat" | "Kelompok";
  method: "online" | "offline";
  status: string;
  participant_status?: string;
  start_at: string;
  end_at: string;
};

const visibleStatuses = new Set([
  "confirmed",
  "in_progress",
  "awaiting_student_approval",
  "disputed",
  "admin_review_required",
  "refund_pending",
]);

const statusLabels: Record<string, string> = {
  confirmed: "Terkonfirmasi",
  in_progress: "Sedang berlangsung",
  awaiting_student_approval: "Perlu persetujuan",
  disputed: "Keberatan diperiksa",
  admin_review_required: "Diperiksa admin",
  refund_pending: "Refund diproses",
};

const formatSchedule = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function Dashboard() {
  const [name, setName] = useState("Murid");
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [userResponse, classResponse] = await Promise.all([
          http.get("/user"),
          http.get<StudentClass[]>("/student/classes"),
        ]);
        setName(userResponse.data.name || "Murid");
        setClasses(classResponse.data);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Dashboard murid gagal dimuat.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const activeClasses = useMemo(
    () =>
      classes
        .filter((item) => visibleStatuses.has(item.status))
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [classes],
  );
  const nextClass = activeClasses.find((item) => new Date(item.end_at).getTime() >= Date.now());
  const pendingActions = activeClasses.filter((item) =>
    ["awaiting_student_approval", "disputed", "admin_review_required", "refund_pending"].includes(item.status),
  ).length;

  return (
    <StudentLayout title="Dashboard Murid">
      <div className="space-y-7 pb-16">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-8 text-white shadow-xl md:p-10">
          <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-100">
                <ShieldCheck size={14} /> Pencocokan otomatis
              </span>
              <h1 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
                Halo, {loading ? "…" : name.split(" ")[0]}!
              </h1>
              <p className="mt-2 max-w-xl text-blue-100/75">
                Tentukan materi dan jam belajar. Radar akan mencari tutor yang sesuai tanpa katalog pilih-pilih.
              </p>
            </div>
            <Link
              to="/student/find"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-blue-50"
            >
              <Radar size={18} /> Cari tutor
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Summary icon={BookOpen} label="Kelas aktif" value={`${activeClasses.length}`} color="bg-indigo-600" />
          <Summary icon={CalendarDays} label="Jadwal berikutnya" value={nextClass ? new Date(nextClass.start_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Belum ada"} color="bg-emerald-600" />
          <Summary icon={ShieldCheck} label="Perlu perhatian" value={`${pendingActions}`} color="bg-orange-500" />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Jadwal belajarmu</h2>
              <p className="mt-1 text-sm text-slate-500">Buka detail untuk tautan online, lokasi, bukti, dan persetujuan sesi.</p>
            </div>
            <Link to="/student/my-classes" className="hidden items-center gap-1 text-sm font-bold text-indigo-600 sm:flex">
              Lihat semua <ArrowRight size={15} />
            </Link>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">Memuat kelas…</div>
          ) : activeClasses.length ? (
            <div className="divide-y divide-slate-100">
              {activeClasses.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  to="/student/my-classes"
                  className="flex flex-col gap-4 p-6 transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className={`grid h-13 w-13 shrink-0 place-items-center rounded-2xl ${item.method === "online" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"}`}>
                      {item.method === "online" ? <Monitor size={22} /> : <MapPin size={22} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-slate-900">{item.title}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">Tutor {item.mentor} · {item.type}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                      <Clock3 size={13} className="mr-1 inline" /> {formatSchedule(item.start_at)} WIB
                    </span>
                    <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">
                      {statusLabels[item.status] || item.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <BookOpen className="mx-auto text-slate-300" size={36} />
              <p className="mt-3 font-bold text-slate-700">Belum ada kelas aktif.</p>
              <Link to="/student/find" className="mt-4 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
                Mulai pencarian
              </Link>
            </div>
          )}
        </section>
      </div>
    </StudentLayout>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof BookOpen;
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
