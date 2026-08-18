import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  History,
  Loader2,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  UserRound,
  WifiOff,
} from "lucide-react";
import LearningSessionHub from "@/components/LearningSessionHub";
import TeacherLayout from "@/components/TeacherLayout";
import { Button } from "@/components/ui/button";
import http, { getApiError } from "@/lib/http";
import { notify } from "@/lib/notify";

type TopicStatus = "not_started" | "in_progress" | "completed" | "review_needed" | string;

type TeacherProgressData = {
  id: number;
  learning_package_id: number;
  package_code?: string | null;
  package_name: string;
  package_status?: string | null;
  subject_name: string;
  education_level?: string | null;
  grade?: string | null;
  student: { id?: number | null; name: string };
  allocated_sessions: number;
  progress_summary: {
    total_topics: number;
    completed_topics: number;
    in_progress_topics: number;
    progress_percent: number;
  };
  learning_topics: Array<{
    id: number;
    chapter?: string | null;
    title: string;
    status: TopicStatus;
    needs_review: boolean;
  }>;
  sessions: Array<{
    id: number;
    sequence: number;
    booking_id?: number | null;
    status: string;
    start_at?: string | null;
    end_at?: string | null;
    progress_report?: {
      id: number;
      session_number: number;
      material_covered: string;
      mastered_skills: string;
      difficulties?: string | null;
      next_exercise: string;
      notes?: string | null;
      progress_percent: number;
      no_material_change?: boolean;
      no_change_reason?: string | null;
      published_at: string;
      topics?: Array<{
        topic_id: number;
        chapter?: string | null;
        title?: string | null;
        activity_type?: string | null;
        status_before?: string | null;
        status_after?: string | null;
        needs_review?: boolean;
        notes?: string | null;
      }>;
    } | null;
  }>;
};

type Tab = "material" | "history";

const dateTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "Jadwal belum tersedia";

const statusLabel = (status?: string | null, needsReview = false) => {
  if (status === "completed" && needsReview) return "Selesai · perlu diulang";
  if (status === "completed") return "Selesai";
  if (status === "in_progress" || status === "review_needed") return "Sedang dipelajari";
  return "Belum dimulai";
};

const noChangeReasonLabel = (value?: string | null) => ({
  review: "Review materi",
  practice: "Latihan soal",
  evaluation: "Evaluasi / ujian",
  remedial: "Remedial",
  session_disrupted: "Sesi tidak berjalan penuh",
  other: "Lainnya",
}[value || ""] || "Tidak ada perubahan materi");

export default function TeacherLearningProgressDetail() {
  const { id } = useParams();
  const subjectId = Number(id);
  const [data, setData] = useState<TeacherProgressData | null>(null);
  const [tab, setTab] = useState<Tab>("material");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(subjectId)) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const response = await http.get<TeacherProgressData>(`/teacher/package-subjects/${subjectId}/progress`);
      setData(response.data);
    } catch (requestError) {
      setError(true);
      notify.error(getApiError(requestError, "Progress kelas belum dapat dimuat."));
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <TeacherLayout title="Progress Kelas">
        <div className="grid min-h-[60dvh] place-items-center">
          <div className="text-center"><Loader2 className="mx-auto animate-spin text-indigo-600" size={36} /><p className="mt-3 text-sm font-bold text-slate-500">Memuat progress kelas…</p></div>
        </div>
      </TeacherLayout>
    );
  }

  if (error || !data) {
    return (
      <TeacherLayout title="Progress Kelas">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-100 bg-white px-6 py-16 text-center">
          <WifiOff className="mx-auto text-rose-300" size={40} />
          <h1 className="mt-4 text-xl font-black text-slate-800">Progress kelas belum dapat dibuka</h1>
          <p className="mt-2 text-sm text-slate-500">Kelas mungkin sudah tidak menjadi tanggung jawab akun tutor ini atau koneksi sedang bermasalah.</p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => void load()} className="rounded-xl bg-indigo-600 hover:bg-indigo-700"><RefreshCw size={16} className="mr-2" />Coba lagi</Button>
            <Button asChild variant="outline" className="rounded-xl"><Link to="/guru/kelas">Kembali ke Kelas Saya</Link></Button>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  const summary = data.progress_summary;

  return (
    <TeacherLayout title="Progress Kelas">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-800 p-5 text-white shadow-[0_24px_64px_rgba(15,23,42,0.20)] sm:rounded-[2rem] sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-indigo-400/15 blur-3xl" />
          <div className="relative">
            <Link to="/guru/kelas" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-3 text-xs font-black text-white transition hover:bg-white/15"><ArrowLeft size={15} />Kelas Saya</Link>
            <div className="mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">{data.package_name} · {data.package_code}</p>
                <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">{data.subject_name}</h1>
                <div className="mt-3 inline-flex max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-400/15 text-blue-200"><UserRound size={17} /></span>
                  <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Murid</p><p className="truncate text-sm font-black text-white">{data.student.name}</p><p className="truncate text-[11px] text-slate-400">{[data.education_level, data.grade].filter(Boolean).join(" · ") || "Tingkat belajar"}</p></div>
                </div>
              </div>
              <div className="w-full rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm md:max-w-xs">
                <div className="flex items-end justify-between gap-3"><p className="text-xs font-black uppercase tracking-wider text-slate-300">Progress materi</p><p className="text-3xl font-black text-blue-200">{summary.progress_percent}%</p></div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${summary.progress_percent}%` }} /></div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Summary label="Subbab selesai" value={`${summary.completed_topics}/${summary.total_topics}`} icon={CheckCircle2} />
          <Summary label="Sedang dipelajari" value={summary.in_progress_topics} icon={BookOpen} />
          <Summary label="Sesi dilaporkan" value={`${data.sessions.filter((session) => session.progress_report).length}/${data.allocated_sessions}`} icon={History} />
          <Summary label="Sesi dialokasikan" value={data.allocated_sessions} icon={CalendarDays} />
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-1.5">
          <button type="button" onClick={() => setTab("material")} className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${tab === "material" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-indigo-700"}`}><BookOpen size={16} className="mr-2 inline" />Materi</button>
          <button type="button" onClick={() => setTab("history")} className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${tab === "history" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-indigo-700"}`}><History size={16} className="mr-2 inline" />Riwayat Sesi</button>
        </div>

        {tab === "material" ? <MaterialPanel data={data} /> : <HistoryPanel data={data} onOpenSession={setSelectedBookingId} />}
      </div>
      <LearningSessionHub bookingId={selectedBookingId} open={selectedBookingId !== null} onOpenChange={(open) => !open && setSelectedBookingId(null)} initialTab="progress" />
    </TeacherLayout>
  );
}

function MaterialPanel({ data }: { data: TeacherProgressData }) {
  const chapters = useMemo(() => {
    const grouped = new Map<string, TeacherProgressData["learning_topics"]>();
    for (const topic of data.learning_topics) {
      const chapter = topic.chapter?.trim() || "Materi belajar";
      grouped.set(chapter, [...(grouped.get(chapter) || []), topic]);
    }
    return [...grouped.entries()];
  }, [data.learning_topics]);

  return (
    <section className="rounded-[1.75rem] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/35 to-blue-50/45 p-4 shadow-[0_14px_36px_rgba(30,64,175,0.07)] sm:p-6">
      <div><h2 className="text-lg font-black text-slate-900">Kondisi materi saat ini</h2><p className="mt-1 text-sm leading-6 text-slate-500">Gunakan bagian ini untuk melihat posisi murid sekarang. Riwayat Sesi menjelaskan kapan setiap perubahan terjadi.</p></div>
      <div className="mt-5 space-y-3">
        {chapters.map(([chapter, topics], index) => {
          const completed = topics.filter((topic) => topic.status === "completed").length;
          const percent = topics.length ? Math.round((completed / topics.length) * 100) : 0;
          return (
            <details key={chapter} open={index === 0 && percent < 100} className="group overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/55">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
                <div className="min-w-0"><p className="break-words font-black text-slate-900">{chapter}</p><p className="mt-1 text-xs text-slate-500">{completed} dari {topics.length} subbab selesai</p></div>
                <div className="flex shrink-0 items-center gap-2"><span className="text-sm font-black text-indigo-700">{percent}%</span><ChevronDown size={17} className="text-slate-400 transition group-open:rotate-180" /></div>
              </summary>
              <div className="border-t border-indigo-100 bg-white p-3 sm:p-4">
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-indigo-50"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${percent}%` }} /></div>
                <div className="space-y-2">{topics.map((topic) => <TopicRow key={topic.id} topic={topic} />)}</div>
              </div>
            </details>
          );
        })}
        {chapters.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Subbab belum tersedia pada paket ini.</p>}
      </div>
    </section>
  );
}

function HistoryPanel({ data, onOpenSession }: { data: TeacherProgressData; onOpenSession: (bookingId: number) => void }) {
  return (
    <section className="rounded-[1.75rem] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/35 to-blue-50/45 p-4 shadow-[0_14px_36px_rgba(30,64,175,0.07)] sm:p-6">
      <div><h2 className="text-lg font-black text-slate-900">Riwayat progress per sesi</h2><p className="mt-1 text-sm leading-6 text-slate-500">Setiap kartu menunjukkan perubahan sebelum → sesudah yang dicatat pada sesi tersebut.</p></div>
      <div className="mt-5 space-y-3">
        {[...data.sessions].sort((a, b) => b.sequence - a.sequence).map((session) => {
          const report = session.progress_report;
          return (
            <article key={session.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/55 p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div><p className="text-xs font-black uppercase tracking-wider text-indigo-600">Sesi {session.sequence}</p><p className="mt-1 text-sm font-bold text-slate-800">{dateTime(session.start_at)}</p></div>
                <span className={`self-start rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${report ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-indigo-100 bg-white text-slate-500"}`}>{report ? `${report.progress_percent}% setelah sesi` : session.status === "completed" ? "Tanpa laporan" : "Belum dilaporkan"}</span>
              </div>
              {report ? (
                <>
                  <h3 className="mt-4 text-sm font-black text-slate-900">{report.material_covered}</h3>
                  {report.no_material_change && <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold text-amber-800">Tidak ada perubahan status materi · {noChangeReasonLabel(report.no_change_reason)}</div>}
                  {report.topics?.length ? (
                    <div className="mt-3 space-y-2">
                      {report.topics.map((topic) => (
                        <div key={`${session.id}-${topic.topic_id}`} className="rounded-xl border border-indigo-100 bg-white p-3">
                          <p className="text-sm font-black text-slate-900">{topic.title || "Subbab"}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{statusLabel(topic.status_before)} <span className="px-1 text-indigo-400">→</span> <span className="font-black text-indigo-700">{statusLabel(topic.status_after, Boolean(topic.needs_review))}</span></p>
                          {topic.notes && <p className="mt-2 text-xs leading-5 text-slate-500">{topic.notes}</p>}
                        </div>
                      ))}
                    </div>
                  ) : !report.no_material_change ? <p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-500">Tidak ada perubahan subbab terstruktur pada laporan ini.</p> : null}
                  {report.notes && <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-600"><b>Catatan:</b> {report.notes}</p>}
                  {session.booking_id && <Button type="button" variant="outline" onClick={() => onOpenSession(session.booking_id!)} className="mt-4 rounded-xl border-indigo-100 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"><MessageSquareText size={16} className="mr-2" />Lihat laporan lengkap</Button>}
                </>
              ) : <p className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-500">Progress sesi ini belum dicatat.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TopicRow({ topic }: { topic: TeacherProgressData["learning_topics"][number] }) {
  const done = topic.status === "completed";
  const active = topic.status === "in_progress" || topic.status === "review_needed";
  const Icon = done ? (topic.needs_review ? RotateCcw : CheckCircle2) : active ? BookOpen : Circle;
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${done ? "border-emerald-100 bg-emerald-50" : active ? "border-indigo-100 bg-indigo-50/80" : "border-slate-100 bg-slate-50"}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${done ? (topic.needs_review ? "text-amber-600" : "text-emerald-600") : active ? "text-indigo-600" : "text-slate-300"}`} />
      <div><p className="text-sm font-bold text-slate-800">{topic.title}</p><p className={`mt-1 text-xs font-bold ${done ? "text-emerald-700" : active ? "text-indigo-700" : "text-slate-400"}`}>{statusLabel(topic.status, topic.needs_review)}</p></div>
    </div>
  );
}

function Summary({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Clock3 }) {
  return <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"><div className="flex items-center gap-2 text-slate-400"><Icon size={16} /><span className="text-[10px] font-black uppercase tracking-wider">{label}</span></div><p className="mt-2 break-words text-lg font-black text-slate-900">{value}</p></div>;
}
