import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Ban, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, History, Loader2, Repeat2, Trash2, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import http, { getApiError } from "@/lib/http";
import { notify } from "@/lib/notify";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";

type ViewMode = "packages" | "sessions";
type ScheduleScope = "active" | "history";
type SortDirection = "asc" | "desc";
type Teacher = { id: number; name: string } | null;
type PackageSession = { id: number; session_number: number; starts_at: string; ends_at: string; status: string; teacher_started_at?: string | null; progress_recorded_at?: string | null; attended_participants_count?: number | null; report_submitted_at?: string | null; admin_review_notes?: string | null; admin_reviewed_at?: string | null; report_revision_count?: number };
type PackageItem = {
  id: number;
  package_code?: string;
  template_code?: string;
  package_kind?: "recurring" | "one_time";
  recurrence_active?: boolean;
  next_publish_at?: string | null;
  subject_name: string;
  education_level: string;
  grade: string;
  chapter: string;
  status: string;
  session_count: number;
  first_session_at: string;
  last_session_at: string;
  teacher: Teacher;
  participant_count: number;
  occupied_seat_count: number;
  confirmed_participant_count: number;
  pending_payment_count: number;
  minimum_participants: number;
  maximum_participants: number;
  price_per_student: number;
  price_per_session: number;
  custom_price_per_student?: number | null;
  topic?: string | null;
  registration_opens_at: string;
  registration_deadline: string;
  teacher_status_message: string;
  can_delete: boolean;
  delete_block_reason?: string | null;
  can_cancel: boolean;
  cancel_block_reason?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  sessions: PackageSession[];
};
type SessionItem = {
  id: number;
  package_id: number;
  session_number: number;
  starts_at: string;
  ends_at: string;
  session_status: string;
  teacher_started_at?: string | null;
  subject_name: string;
  education_level: string;
  grade: string;
  chapter: string;
  package_status: string;
  cancellation_reason?: string | null;
  package_session_count: number;
  teacher: Teacher;
  participant_count: number;
  occupied_seat_count: number;
  confirmed_participant_count: number;
  pending_payment_count: number;
  maximum_participants: number;
  progress_updates?: Array<{ subject_index: number; chapter?: string; status_before?: string; status_after?: string; needs_review_after?: boolean; notes?: string | null }>;
  progress_notes?: string | null;
  progress_recorded_at?: string | null;
  attended_participants_count?: number | null;
  report_submitted_at?: string | null;
  admin_review_notes?: string | null;
  admin_reviewed_at?: string | null;
  report_revision_count?: number;
};
type Meta = { view: ViewMode; scope: ScheduleScope; sort: SortDirection; page: number; per_page: number; total: number; last_page: number };

const initialMeta: Meta = { view: "packages", scope: "active", sort: "asc", page: 1, per_page: 10, total: 0, last_page: 1 };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const fullDate = (value: string) => new Date(value).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const dateTime = (value: string) => new Date(value).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const timeRange = (start: string, end: string) => `${new Date(start).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}–${new Date(end).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;

const statusText: Record<string, string> = {
  waiting_teacher: "Mencari tutor",
  open: "Pendaftaran dibuka",
  registration_closed: "Pendaftaran ditutup",
  awaiting_verification: "Menunggu verifikasi",
  confirmed: "Dikonfirmasi",
  cancelled: "Dibatalkan",
  scheduled: "Terjadwal",
  in_progress: "Sedang berlangsung",
  report_required: "Laporan tutor wajib",
  awaiting_admin_verification: "Menunggu verifikasi admin",
  revision_requested: "Perlu perbaikan",
  completed: "Selesai",
};

const teacherAttendanceText = (startsAt: string, checkedInAt?: string | null) => {
  if (!checkedInAt) return "Tutor belum absen";
  const delayMinutes = Math.max(0, Math.round((new Date(checkedInAt).getTime() - new Date(startsAt).getTime()) / 60_000));
  return `${dateTime(checkedInAt)} · ${delayMinutes > 0 ? `terlambat ${delayMinutes} menit` : "tepat waktu"}`;
};

export default function CheapClassSchedule() {
  const confirm = useConfirmDialog();
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get("view") === "sessions" ? "sessions" : "packages";
  const initialScope = searchParams.get("scope") === "history" ? "history" : "active";
  const [view, setView] = useState<ViewMode>(initialView);
  const [scope, setScope] = useState<ScheduleScope>(initialScope);
  const [sort, setSort] = useState<SortDirection>("asc");
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [subject, setSubject] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get("/admin/cheap-classes/schedule", {
        params: {
          view,
          scope,
          sort,
          status: status === "all" ? undefined : status,
          subject: subject === "all" ? undefined : subject,
          page,
          per_page: 10,
        },
      });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      if (view === "packages") {
        setPackages(rows);
        setSessions([]);
      } else {
        setSessions(rows);
        setPackages([]);
      }
      setMeta(response.data?.meta || { ...initialMeta, view, scope, sort, page });
      setSubjects(Array.isArray(response.data?.filters?.subjects) ? response.data.filters.subjects : []);
    } catch (error) {
      notify.error(getApiError(error, "Jadwal Kelas Kelompok belum dapat dimuat."));
      setPackages([]);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [page, scope, sort, status, subject, view]);

  useEffect(() => { void load(); }, [load]);

  const changeView = (next: ViewMode) => {
    setView(next);
    setPage(1);
    setExpandedId(null);
  };

  const changeScope = (next: ScheduleScope) => {
    setScope(next);
    setStatus("all");
    setPage(1);
    setExpandedId(null);
  };

  const cancelPackage = async (item: PackageItem) => {
    const paymentNote = item.confirmed_participant_count > 0
      ? ` ${item.confirmed_participant_count} pembayaran terverifikasi akan masuk proses refund penuh.`
      : item.pending_payment_count > 0
        ? ` ${item.pending_payment_count} pembayaran/kursi yang masih menunggu akan diselesaikan sesuai statusnya; bukti yang sudah dikirim tetap diperiksa.`
        : "";
    const approved = await confirm({
      title: "Batalkan paket Kelas Kelompok?",
      description: `${item.subject_name} · ${item.grade} beserta seluruh sesinya akan dibatalkan.${paymentNote} Paket yang memiliki riwayat peserta tetap disimpan sebagai arsip.`,
      confirmText: "Batalkan paket",
      tone: "danger",
    });
    if (!approved) return;

    setCancellingId(item.id);
    try {
      const response = await http.post(`/admin/cheap-classes/${item.id}/cancel`, { reason: "Paket dibatalkan admin." });
      notify.success(`${response.data.message} Paket dipindahkan ke Riwayat.`);
      await load();
    } catch (error) {
      notify.error(getApiError(error, "Paket belum dapat dibatalkan."));
      await load();
    } finally {
      setCancellingId(null);
    }
  };

  const deletePackage = async (item: PackageItem) => {
    const approved = await confirm({
      title: "Hapus paket Kelas Kelompok?",
      description: `${item.subject_name} · ${item.grade} beserta seluruh ${item.session_count} sesinya akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Hapus paket",
      tone: "danger",
    });
    if (!approved) return;

    setDeletingId(item.id);
    try {
      const response = await http.delete(`/admin/cheap-classes/${item.id}`);
      notify.success(response.data.message);
      setExpandedId((current) => current === item.id ? null : current);
      if (packages.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        await load();
      }
    } catch (error) {
      notify.error(getApiError(error, "Paket belum dapat dihapus."));
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  return <AdminLayout title="Jadwal Kelas Kelompok">
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/admin/kelas-murah" className="inline-flex items-center gap-2 text-sm font-black text-indigo-600 hover:text-indigo-800"><ArrowLeft size={16} /> Kembali ke pengaturan</Link><Link to="/admin/kelas-murah/berulang" className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-50 px-4 text-xs font-black text-violet-700 hover:bg-violet-100"><Repeat2 size={15} /> Kelola Paket Berulang</Link></div>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">Kalender operasional</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Jadwal Kelas Kelompok</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Jadwal aktif hanya memuat paket yang masih berjalan. Paket batal dan selesai disimpan terpisah dalam Riwayat.</p>
          </div>
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => changeView("packages")} className={`rounded-lg px-4 py-2.5 text-sm font-black transition ${view === "packages" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>Per Paket</button>
            <button type="button" onClick={() => changeView("sessions")} className={`rounded-lg px-4 py-2.5 text-sm font-black transition ${view === "sessions" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>Semua Sesi</button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button type="button" onClick={() => changeScope("active")} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black transition ${scope === "active" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}><CalendarDays size={16} /> Jadwal Aktif</button>
          <button type="button" onClick={() => changeScope("history")} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black transition ${scope === "history" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}><History size={16} /> Riwayat</button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Select value={subject} onValueChange={(value) => { setSubject(value); setPage(1); }}><SelectTrigger><SelectValue placeholder="Semua mata pelajaran" /></SelectTrigger><SelectContent><SelectItem value="all">Semua mata pelajaran</SelectItem>{subjects.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}><SelectTrigger><SelectValue placeholder="Semua status" /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem>{view === "sessions" ? <><SelectItem value="scheduled">Terjadwal</SelectItem><SelectItem value="report_required">Laporan tutor wajib</SelectItem><SelectItem value="awaiting_admin_verification">Menunggu verifikasi admin</SelectItem><SelectItem value="revision_requested">Perlu perbaikan</SelectItem><SelectItem value="completed">Selesai</SelectItem></> : scope === "active" ? <><SelectItem value="waiting_teacher">Mencari tutor</SelectItem><SelectItem value="open">Pendaftaran dibuka</SelectItem><SelectItem value="registration_closed">Pendaftaran ditutup</SelectItem><SelectItem value="awaiting_verification">Menunggu verifikasi</SelectItem><SelectItem value="confirmed">Dikonfirmasi</SelectItem></> : <><SelectItem value="cancelled">Dibatalkan</SelectItem><SelectItem value="completed">Selesai</SelectItem></>}</SelectContent></Select>
          <Select value={sort} onValueChange={(value) => { setSort(value as SortDirection); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="asc">Terdekat dahulu</SelectItem><SelectItem value="desc">Terjauh dahulu</SelectItem></SelectContent></Select>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500"><span><b className="text-slate-900">{meta.total}</b> {view === "packages" ? "paket" : "sesi"} ditemukan</span><span>{sort === "asc" ? "Terdekat → terjauh" : "Terjauh → terdekat"}</span></div>

        {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>
          : view === "packages"
            ? <PackageList scope={scope} items={packages} expandedId={expandedId} deletingId={deletingId} cancellingId={cancellingId} onToggle={(id) => setExpandedId((current) => current === id ? null : id)} onDelete={deletePackage} onCancel={cancelPackage} />
            : <SessionList scope={scope} items={sessions} onChanged={load} />}

        {!loading && meta.total > 0 && <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
          <Button type="button" variant="outline" disabled={meta.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl"><ChevronLeft size={16} className="mr-1" /> Sebelumnya</Button>
          <span className="text-xs font-bold text-slate-500">Halaman {meta.page} dari {meta.last_page}</span>
          <Button type="button" variant="outline" disabled={meta.page >= meta.last_page} onClick={() => setPage((current) => current + 1)} className="rounded-xl">Berikutnya <ChevronRight size={16} className="ml-1" /></Button>
        </div>}
      </section>
    </div>
  </AdminLayout>;
}

function PackageList({ scope, items, expandedId, deletingId, cancellingId, onToggle, onDelete, onCancel }: { scope: ScheduleScope; items: PackageItem[]; expandedId: number | null; deletingId: number | null; cancellingId: number | null; onToggle: (id: number) => void; onDelete: (item: PackageItem) => void; onCancel: (item: PackageItem) => void }) {
  if (!items.length) return <Empty text={scope === "history" ? "Belum ada paket batal atau selesai dalam riwayat." : "Belum ada paket aktif yang cocok dengan filter."} />;
  return <div className="mt-4 space-y-3">{items.map((item) => {
    const expanded = expandedId === item.id;
    return <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="grid gap-4 p-4 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-950">{item.subject_name} · {item.grade}</h2><StatusBadge status={item.status} /><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${item.package_kind === "recurring" ? (item.recurrence_active ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600") : "bg-slate-50 text-slate-500"}`}>{item.package_kind === "recurring" ? `Berulang · ${item.recurrence_active ? "Aktif" : "Nonaktif"}` : "Sekali dibuat"}</span></div><p className="mt-1 text-xs text-slate-500">{item.chapter}</p><p className="mt-2 text-xs font-bold text-indigo-600">1 paket · {item.session_count} sesi · {money(Number(item.price_per_student))} sekali bayar</p>{item.package_code && <p className="mt-1 text-[11px] font-bold text-slate-400">Kode paket {item.package_code}{item.template_code ? ` · template ${item.template_code}` : ""}</p>}</div>
        <div className="grid grid-cols-2 gap-3 text-xs"><Info icon={<CalendarDays size={15} />} label="Rentang jadwal" value={item.first_session_at === item.last_session_at ? fullDate(item.first_session_at) : `${fullDate(item.first_session_at)} – ${fullDate(item.last_session_at)}`} /><Info icon={<Users size={15} />} label="Tutor & kursi" value={`${item.teacher?.name || "Belum ada tutor"} · ${item.occupied_seat_count}/${item.maximum_participants} kursi`} /></div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Button type="button" variant="outline" onClick={() => onToggle(item.id)} className="h-10 rounded-xl font-black">{expanded ? "Tutup detail" : "Lihat detail"}{expanded ? <ChevronUp className="ml-2" size={16} /> : <ChevronDown className="ml-2" size={16} />}</Button>
          {item.status === "waiting_teacher" && <span className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-50 px-3 text-xs font-black text-amber-700">Sistem mencari otomatis</span>}
          {item.can_delete
            ? <Button type="button" variant="outline" disabled={deletingId === item.id} onClick={() => onDelete(item)} className="h-10 rounded-xl border-rose-200 font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700">{deletingId === item.id ? <Loader2 className="mr-2 animate-spin" size={15} /> : <Trash2 className="mr-2" size={15} />}Hapus paket</Button>
            : item.can_cancel
              ? <Button type="button" variant="outline" disabled={cancellingId === item.id} onClick={() => onCancel(item)} className="h-10 rounded-xl border-amber-200 font-black text-amber-700 hover:bg-amber-50 hover:text-amber-800">{cancellingId === item.id ? <Loader2 className="mr-2 animate-spin" size={15} /> : <Ban className="mr-2" size={15} />}Batalkan paket</Button>
              : null}
          {!item.can_delete && !item.can_cancel && item.status !== "cancelled" && item.cancel_block_reason && <p className="max-w-48 text-[10px] font-bold leading-4 text-slate-400">{item.cancel_block_reason}</p>}
          {item.status === "cancelled" && !item.can_delete && item.delete_block_reason && <p className="max-w-48 text-[10px] font-bold leading-4 text-slate-400">{item.delete_block_reason}</p>}
        </div>
      </div>
      {expanded && <div className="space-y-4 border-t border-slate-100 bg-slate-50/80 p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Detail label="Materi" value={item.chapter} /><Detail label="Harga paket" value={`${money(item.price_per_student)} sekali bayar`} /><Detail label="Pendaftaran" value={`${dateTime(item.registration_opens_at)} – ${dateTime(item.registration_deadline)}`} /><Detail label="Kuota" value={`${item.occupied_seat_count}/${item.maximum_participants} kursi terisi · ${item.confirmed_participant_count} pembayaran terverifikasi · minimum ${item.minimum_participants}`} /></div>{item.status === "cancelled" && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-700"><b>Alasan pembatalan:</b> {item.cancellation_reason || "Paket dibatalkan."}{item.cancelled_at ? ` · ${dateTime(item.cancelled_at)}` : ""}</div>}{item.package_kind === "recurring" && <div className={`rounded-xl p-3 text-xs font-bold leading-5 ${item.recurrence_active ? "bg-violet-50 text-violet-800" : "bg-slate-200 text-slate-700"}`}>{item.recurrence_active ? <>Pengulangan mingguan aktif.{item.next_publish_at ? ` Paket berikutnya dijadwalkan terbit ${dateTime(item.next_publish_at)}.` : ""}</> : "Pengulangan mingguan nonaktif. Paket yang sudah terbit tetap berjalan."}</div>}{item.topic && <div className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600"><b className="text-slate-900">Catatan materi:</b> {item.topic}</div>}{item.status !== "cancelled" && <div className={`rounded-xl p-3 text-xs font-bold leading-5 ${item.teacher ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{item.teacher_status_message}</div>}<div><p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Seluruh jadwal sesi</p><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{item.sessions.map((session) => <div key={session.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-700">{session.session_number}</span><div><p className="text-xs font-black text-slate-900">Sesi {session.session_number} · {fullDate(session.starts_at)}</p><p className="mt-1 text-[11px] text-slate-500">{timeRange(session.starts_at, session.ends_at)} · {statusText[session.status] || session.status}</p><p className={`mt-1 text-[11px] font-bold ${session.teacher_started_at ? "text-emerald-700" : "text-amber-700"}`}>{teacherAttendanceText(session.starts_at, session.teacher_started_at)}</p></div></div>)}</div></div></div>}
    </article>;
  })}</div>;
}

function SessionList({ scope, items, onChanged }: { scope: ScheduleScope; items: SessionItem[]; onChanged: () => Promise<void> }) {
  const confirm = useConfirmDialog();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [revisionNotes, setRevisionNotes] = useState<Record<number, string>>({});
  const [workingId, setWorkingId] = useState<number | null>(null);
  if (!items.length) return <Empty text={scope === "history" ? "Belum ada sesi dalam riwayat." : "Belum ada sesi aktif yang cocok dengan filter."} />;

  const verify = async (item: SessionItem) => {
    const approved = await confirm({ title: "Konfirmasi sesi Kelas Kelompok?", description: `Sesi ${item.session_number} ${item.subject_name} akan dinyatakan selesai dan progress tutor menjadi progress resmi murid.`, confirmText: "Konfirmasi sesi", tone: "default" });
    if (!approved) return;
    setWorkingId(item.id);
    try {
      const response = await http.post(`/admin/cheap-classes/${item.package_id}/sessions/${item.id}/verify`, {});
      notify.success(response.data.message);
      await onChanged();
    } catch (error) { notify.error(getApiError(error, "Sesi belum dapat diverifikasi.")); }
    finally { setWorkingId(null); }
  };

  const requestRevision = async (item: SessionItem) => {
    const reason = (revisionNotes[item.id] || "").trim();
    if (reason.length < 5) { notify.error("Tulis alasan perbaikan minimal 5 karakter."); return; }
    setWorkingId(item.id);
    try {
      const response = await http.post(`/admin/cheap-classes/${item.package_id}/sessions/${item.id}/request-revision`, { reason });
      notify.success(response.data.message);
      setRevisionNotes((current) => ({ ...current, [item.id]: "" }));
      await onChanged();
    } catch (error) { notify.error(getApiError(error, "Permintaan perbaikan belum dapat dikirim.")); }
    finally { setWorkingId(null); }
  };

  return <div className="mt-4 space-y-3">{items.map((item) => {
    const expanded = expandedId === item.id;
    const needsReview = item.session_status === "awaiting_admin_verification";
    return <article key={item.id} className={`overflow-hidden rounded-2xl border ${needsReview ? "border-amber-200 bg-amber-50/30" : "border-slate-200 bg-white"}`}>
      <div className="grid gap-3 p-4 sm:grid-cols-[155px_1fr_auto] sm:items-center">
        <div><p className="text-xs font-black text-indigo-700">{fullDate(item.starts_at)}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13} /> {timeRange(item.starts_at, item.ends_at)}</p></div>
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-black text-slate-950">{item.subject_name} · {item.grade}</h2><StatusBadge status={item.session_status} /></div><p className="mt-1 text-xs text-slate-500">Sesi {item.session_number} dari {item.package_session_count} · {item.chapter}</p><p className={`mt-1 text-xs font-bold ${item.teacher_started_at ? "text-emerald-700" : "text-amber-700"}`}>{teacherAttendanceText(item.starts_at, item.teacher_started_at)}</p>{needsReview && <p className="mt-2 text-xs font-black text-amber-700">Laporan tutor siap diperiksa.</p>}</div>
        <div className="flex items-center gap-2 sm:justify-end"><div className="text-right"><p className="text-xs font-black text-slate-800">{item.teacher?.name || "Belum ada tutor"}</p><p className="mt-1 text-[11px] text-slate-500">{item.confirmed_participant_count} peserta terverifikasi</p></div>{item.report_submitted_at && <Button type="button" variant="outline" onClick={() => setExpandedId(expanded ? null : item.id)} className="h-9 rounded-xl px-3 text-xs font-black">{expanded ? "Tutup" : "Periksa"}</Button>}</div>
      </div>
      {expanded && item.report_submitted_at && <div className="border-t border-slate-100 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Detail label="Absensi tutor" value={teacherAttendanceText(item.starts_at, item.teacher_started_at)} /><Detail label="Kehadiran murid" value={`${item.attended_participants_count ?? 0}/${item.confirmed_participant_count} murid hadir`} /><Detail label="Laporan dikirim" value={dateTime(item.report_submitted_at)} /><Detail label="Status" value={statusText[item.session_status] || item.session_status} /></div>
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><b className="text-slate-900">Catatan tutor:</b> {item.progress_notes || "Tidak ada catatan sesi."}</div>
        <div className="mt-3 space-y-2">{item.progress_updates?.length ? item.progress_updates.map((change) => <div key={`${item.id}-${change.subject_index}`} className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"><p className="text-xs font-black text-violet-950">{change.chapter || "Bab"}</p><p className="mt-1 text-[11px] font-bold text-violet-700">{statusText[change.status_before || ""] || change.status_before || "Belum dimulai"} → {change.status_after === "completed" ? "Selesai" : change.status_after === "in_progress" ? "Sedang dipelajari" : "Belum dimulai"}</p>{change.notes && <p className="mt-1 text-xs text-slate-500">{change.notes}</p>}</div>) : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Tutor melaporkan sesi tanpa perubahan status bab.</p>}</div>
        {needsReview && <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]"><div><Textarea value={revisionNotes[item.id] || ""} onChange={(event) => setRevisionNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1000} className="min-h-20 rounded-xl" placeholder="Alasan perbaikan jika laporan belum cukup jelas" /><Button type="button" variant="outline" disabled={workingId === item.id} onClick={() => void requestRevision(item)} className="mt-2 h-10 rounded-xl border-amber-200 font-black text-amber-700"><AlertTriangle size={15} className="mr-2" />Minta Perbaikan</Button></div><Button type="button" disabled={workingId === item.id} onClick={() => void verify(item)} className="h-11 self-end rounded-xl bg-emerald-600 font-black hover:bg-emerald-700">{workingId === item.id ? <Loader2 className="mr-2 animate-spin" size={16} /> : <CheckCircle2 className="mr-2" size={16} />}Konfirmasi Sesi</Button></div>}
        {item.session_status === "revision_requested" && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">Menunggu tutor memperbaiki laporan. Catatan admin: {item.admin_review_notes || "-"}</div>}
      </div>}
    </article>;
  })}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const warning = ["waiting_teacher", "awaiting_verification", "report_required", "awaiting_admin_verification", "revision_requested"].includes(status);
  const danger = status === "cancelled";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${danger ? "bg-rose-50 text-rose-700" : warning ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{statusText[status] || status}</span>;
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="min-w-0"><p className="flex items-center gap-1.5 font-bold text-slate-400">{icon}{label}</p><p className="mt-1 line-clamp-2 font-bold text-slate-700">{value}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xs font-bold leading-5 text-slate-700">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="mt-5 grid min-h-52 place-items-center rounded-2xl bg-slate-50 p-6 text-center"><div><CalendarDays className="mx-auto text-slate-300" size={34} /><p className="mt-3 text-sm font-bold text-slate-500">{text}</p></div></div>;
}
