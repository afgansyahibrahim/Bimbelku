import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Loader2,
  MessageCircle,
  RefreshCw,
  UserRound,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import LearningSessionHub from "@/components/LearningSessionHub";
import StudentLayout from "@/components/StudentLayout";
import { Button } from "@/components/ui/button";
import http, { getApiError } from "@/lib/http";

type WorkspaceMode = "messages" | "progress";

type WorkspaceClass = {
  id: number;
  title: string;
  subject: string;
  mentor: string;
  mentor_avatar?: string | null;
  start_at: string;
  status: string;
  order?: { status?: string } | null;
  workspace?: {
    can_open?: boolean;
    latest_message?: {
      body: string;
      sender_name: string;
      created_at: string;
    } | null;
    progress_percent?: number;
    progress_status?: string | null;
    report_count?: number;
    latest_report?: {
      session_number: number;
      material_covered: string;
      progress_percent: number;
      published_at: string;
    } | null;
  };
};

const dateTime = (value?: string) => value
  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "-";

export default function StudentWorkspaceList({ mode }: { mode: WorkspaceMode }) {
  const isMessages = mode === "messages";
  const [classes, setClasses] = useState<WorkspaceClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await http.get<WorkspaceClass[]>("/student/classes");
      setClasses(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(true);
      toast.error(getApiError(requestError, isMessages ? "Percakapan gagal dimuat." : "Perkembangan belajar gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, [isMessages]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableClasses = useMemo(
    () => classes.filter((item) => item.workspace?.can_open || item.order?.status === "paid"),
    [classes],
  );

  const title = isMessages ? "Pesan" : "Perkembangan Belajar";
  const Icon = isMessages ? MessageCircle : BarChart3;

  return (
    <StudentLayout title={title}>
      <div className="mx-auto max-w-5xl space-y-5 pb-8">
        <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-blue-200"><Icon size={24} /></span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">Ruang belajar</p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                {isMessages
                  ? "Percakapan dibuka setelah pembayaran disetujui dan hanya dapat diakses murid serta tutor kelas tersebut."
                  : "Target, laporan setiap sesi, materi, dan persentase kemajuan disimpan pada ruang belajar yang sama."}
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div role="status" className="grid min-h-64 place-items-center rounded-[1.75rem] border border-slate-100 bg-white">
            <div className="text-center"><Loader2 className="mx-auto animate-spin text-indigo-600" size={34} /><p className="mt-3 text-sm font-bold text-slate-500">Memuat {isMessages ? "percakapan" : "perkembangan"}…</p></div>
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-rose-100 bg-white px-5 py-14 text-center">
            <WifiOff className="mx-auto text-rose-300" size={38} />
            <h2 className="mt-4 font-black text-slate-800">Data belum berhasil dimuat</h2>
            <p className="mt-2 text-sm text-slate-500">Periksa koneksi dan coba kembali.</p>
            <Button onClick={() => void load()} className="mt-5 rounded-xl bg-indigo-600"><RefreshCw size={16} className="mr-2" />Coba lagi</Button>
          </div>
        ) : availableClasses.length === 0 ? (
          <div className="rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-white px-5 py-14 text-center sm:py-20">
            <BookOpenCheck className="mx-auto text-slate-300" size={42} />
            <h2 className="mt-4 text-lg font-black text-slate-800">Belum ada ruang belajar yang dapat dibuka</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Ruang tersedia setelah pembayaran disetujui dan tutor telah terhubung dengan kelas.</p>
            <Button asChild className="mt-5 rounded-xl bg-indigo-600"><Link to="/student/packages">Periksa Paket Saya</Link></Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {availableClasses.map((item) => {
              const workspace = item.workspace;
              const progress = Math.max(0, Math.min(100, Number(workspace?.progress_percent || 0)));
              return (
                <article key={item.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-indigo-50 text-indigo-600">
                      {item.mentor_avatar ? <img src={item.mentor_avatar} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <UserRound size={21} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">{item.subject}</p>
                      <h2 className="mt-1 break-words text-base font-black text-slate-900 sm:text-lg">{item.title}</h2>
                      <p className="mt-1 text-xs font-medium text-slate-500">Tutor {item.mentor} · {dateTime(item.start_at)}</p>
                    </div>
                  </div>

                  {isMessages ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      {workspace?.latest_message ? (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-black text-slate-700">{workspace.latest_message.sender_name}</span><span className="text-slate-400">{dateTime(workspace.latest_message.created_at)}</span></div>
                          <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-slate-600">{workspace.latest_message.body}</p>
                        </>
                      ) : <p className="text-sm leading-6 text-slate-500">Belum ada pesan. Percakapan dapat dimulai dari kelas ini.</p>}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3"><span className="text-xs font-black text-slate-700">Progres target</span><span className="text-sm font-black text-indigo-700">{progress}%</span></div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${progress}%` }} /></div>
                      {workspace?.latest_report ? (
                        <div className="mt-3 border-t border-slate-200 pt-3"><p className="text-xs font-black text-slate-700">Laporan sesi {workspace.latest_report.session_number}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{workspace.latest_report.material_covered}</p></div>
                      ) : <p className="mt-3 text-xs leading-5 text-slate-500">Tutor belum menerbitkan laporan perkembangan.</p>}
                      <p className="mt-2 text-[11px] font-bold text-slate-400">{workspace?.report_count || 0} laporan tersimpan</p>
                    </div>
                  )}

                  <Button onClick={() => setSelectedBookingId(item.id)} className="mt-4 h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 sm:w-auto sm:px-6">
                    {isMessages ? <MessageCircle size={16} className="mr-2" /> : <BarChart3 size={16} className="mr-2" />}
                    {isMessages ? "Buka chat" : "Lihat laporan lengkap"}
                  </Button>
                </article>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-500">
          <span className="flex items-center gap-2"><CalendarDays size={15} className="text-indigo-500" />Semua data tetap terikat pada kelas.</span>
          <button type="button" onClick={() => void load()} className="shrink-0 font-black text-indigo-600">Muat ulang</button>
        </div>
      </div>

      <LearningSessionHub
        bookingId={selectedBookingId}
        open={selectedBookingId !== null}
        onOpenChange={(open) => !open && setSelectedBookingId(null)}
        initialTab={isMessages ? "chat" : "progress"}
      />
    </StudentLayout>
  );
}
