import { notify } from "@/lib/notify";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CalendarClock,
  Clock3,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  WifiOff,
  XCircle,
  UserRound,
} from "lucide-react";
import axios from "axios";

import OrderProgress from "@/components/OrderProgress";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import http, { getApiError, getCached } from "@/lib/http";
import { validateUpload } from "@/lib/validation";

type PackageData = {
  id: number;
  package_code: string;
  renewal_of_id?: number | null;
  status: string;
  plan?: { name?: string; validity_days?: number } | null;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  duration_hours: number;
  total_learning_hours: number;
  expires_at?: string | null;
  payment_due_at?: string | null;
  can_renew: boolean;
  learning_mode: string;
  subjects?: Array<{
    id: number;
    curriculum_subject_id: number;
    name: string;
    allocated_sessions: number;
    status: string;
    teacher?: { id: number; name: string; avatar_url?: string | null } | null;
    can_request_teacher_replacement?: boolean;
    teacher_replacement?: {
      id: number;
      replacement_code: string;
      status: string;
      reason_code: string;
      reason_detail: string;
      review_notes?: string | null;
      remaining_sessions: number;
      can_cancel: boolean;
      can_retry: boolean;
      can_reschedule: boolean;
      can_request_refund: boolean;
      sessions: Array<{ id: number; start_at?: string | null; end_at?: string | null; status: string }>;
    } | null;
    sessions?: Array<{ id: number; start_at?: string | null; status?: string; booking_id?: number | null }> | null;
    matching?: {
      reason_code?: string | null;
      message?: string | null;
      recommended_action?: string | null;
      search_radius_km?: number;
      next_radius_km?: number | null;
      search_expires_at?: string | null;
      next_matching_at?: string | null;
      teacher_response_deadline?: string | null;
      active_offer_count?: number;
      search_state?: "offers_pending" | "matching" | "retry_scheduled" | "action_required";
      can_retry?: boolean;
      retry_label?: string | null;
      can_change_schedule?: boolean;
      manual_restart_used?: boolean;
    } | null;
  }> | null;
  latest_order?: {
    id: number;
    order_id: string;
    status: string;
    amount: number;
    subtotal_amount?: number;
    discount_amount?: number;
    payment_rejection_reason?: string | null;
    subject: string;
    type: string;
    tutor_name: string;
    package_name?: string | null;
    order_kind: "package";
  } | null;
};

const labels: Record<string, string> = {
  matching: "Mencari tutor",
  teacher_pending: "Menunggu tutor",
  no_teacher: "Tutor belum tersedia",
  awaiting_payment: "Belum dibayar",
  payment_rejected: "Bukti ditolak",
  payment_submitted: "Diperiksa admin",
  active: "Aktif",
  completed: "Selesai",
  refund_pending: "Refund diproses",
  refunded: "Dana dikembalikan",
  payment_expired: "Pembayaran berakhir",
  cancelled: "Dibatalkan",
};

const replacementLabels: Record<string, string> = {
  pending_review: "Menunggu pemeriksaan admin",
  matching: "Mencari guru pengganti",
  teacher_pending: "Menunggu jawaban guru",
  no_teacher: "Guru belum tersedia",
  completed: "Guru pengganti ditemukan",
  rejected: "Pengajuan tidak disetujui",
  cancelled: "Pengajuan dibatalkan",
  refund_pending: "Refund sesi tersisa diproses",
  refunded: "Refund sesi tersisa selesai",
};

type PackageListResponse = PackageData[] | { data?: PackageData[] };
type PackageScope = "active" | "history";

const historyPackageStatuses = new Set(["completed", "cancelled", "payment_expired", "refunded"]);
const packageDisplayStatus = (item: PackageData) => item.status === "refund_pending" && item.latest_order?.status === "refunded" ? "refunded" : item.status;

const readPackageRows = (payload: PackageListResponse): PackageData[] | null => {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : null;
};

const validDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatShortDate = (value?: string | null): string => {
  const date = validDate(value);
  return date
    ? date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "Setelah pembayaran";
};

const formatSessionDate = (value?: string | null): string | null => {
  const date = validDate(value);
  return date
    ? date.toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;
};

export default function PackageProcessList({ scope }: { scope: PackageScope }) {
  const confirm = useConfirmDialog();
  const [items, setItems] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Set<number>>(new Set());
  const [replacementTarget, setReplacementTarget] = useState<{ packageId: number; subject: NonNullable<PackageData["subjects"]>[number] } | null>(null);
  const [replacementReason, setReplacementReason] = useState("communication");
  const [replacementDetail, setReplacementDetail] = useState("");
  const [replacementEvidence, setReplacementEvidence] = useState<File | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<NonNullable<NonNullable<PackageData["subjects"]>[number]["teacher_replacement"]> | null>(null);
  const [replacementSchedules, setReplacementSchedules] = useState<string[]>([]);

  const load = useCallback(async (force = false) => {
    setError(null);
    try {
      const [activeResponse, historyResponse] = await Promise.all([
        getCached<PackageListResponse>("/student/packages", { params: { scope: "active", per_page: 100 }, maxAgeMs: 10_000, force }),
        getCached<PackageListResponse>("/student/packages", { params: { scope: "history", per_page: 100 }, maxAgeMs: 10_000, force }),
      ]);
      const activeRows = readPackageRows(activeResponse.data);
      const historyRows = readPackageRows(historyResponse.data);
      if (!activeRows || !historyRows) throw new Error("Format daftar paket tidak dikenali.");
      setItems([...activeRows, ...historyRows]);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError("network");
        } else if (err.response.status === 401) {
          setError("unauthorized");
        } else if (err.response.status === 403) {
          setError("forbidden");
        } else if (err.response.status === 404) {
          setError("not_found");
        } else {
          setError("generic");
        }
      } else {
        setError("generic");
      }
      notify.error(getApiError(err, "Paket gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, []);

  const retryLoad = useCallback(() => {
    setError(null);
    setLoading(true);
    void load(true);
  }, [load]);

  useEffect(() => {
    void load()
  }, [load]);

  const retry = async (packageId: number) => {
    setProcessing(packageId);
    try {
      const response = await http.post(`/student/packages/${packageId}/retry`);
      notify.success(response.data.message);
      await load(true);
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(null);
    }
  };

  const cancel = async (item: PackageData) => {
    const approved = await confirm({
      title: "Hentikan pencarian tutor?",
      description: "Penawaran tutor akan dihentikan dan pengembalian dana masuk antrean pemeriksaan admin.",
      confirmText: "Hentikan & ajukan refund",
      tone: "danger",
    });
    if (!approved) return;
    setProcessing(item.id);
    try {
      const response = await http.post(`/student/packages/${item.id}/cancel`);
      notify.success(response.data.message);
      await load(true);
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(null);
    }
  };

  const submitReplacement = async (event: FormEvent) => {
    event.preventDefault();
    if (!replacementTarget) return;
    setProcessing(replacementTarget.packageId);
    try {
      const payload = new FormData();
      payload.append("reason_code", replacementReason);
      payload.append("reason_detail", replacementDetail);
      if (replacementEvidence) payload.append("evidence", replacementEvidence);
      const response = await http.post(
        "/student/packages/" + replacementTarget.packageId + "/subjects/" + replacementTarget.subject.id + "/teacher-replacements",
        payload,
      );
      notify.success(response.data.message);
      setReplacementTarget(null);
      setReplacementDetail("");
      setReplacementEvidence(null);
      await load(true);
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(null);
    }
  };

  const selectReplacementEvidence = (file: File | null) => {
    const validationError = validateUpload(file, {
      label: "Bukti penggantian guru",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "webp", "pdf"],
    });
    if (validationError) {
      notify.error(validationError);
      setReplacementEvidence(null);
      return;
    }
    setReplacementEvidence(file);
  };

  const replacementAction = async (replacementId: number, action: "cancel" | "retry" | "request-refund") => {
    const descriptions = {
      cancel: "Pengajuan dibatalkan sebelum admin memeriksanya.",
      retry: "Sistem akan memeriksa kandidat guru baru sekali lagi.",
      "request-refund": "Hanya nilai sesi tersisa yang masuk antrean refund. Paket dan sesi yang sudah selesai tetap utuh.",
    };
    const approved = await confirm({
      title: action === "cancel" ? "Batalkan pengajuan?" : action === "retry" ? "Cari guru lagi?" : "Ajukan refund sesi tersisa?",
      description: descriptions[action],
      confirmText: action === "request-refund" ? "Ajukan refund" : "Lanjutkan",
      tone: action === "request-refund" ? "danger" : "warning",
    });
    if (!approved) return;
    setProcessing(replacementId);
    try {
      const response = await http.post("/student/teacher-replacements/" + replacementId + "/" + action);
      notify.success(response.data.message);
      await load(true);
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(null);
    }
  };

  const openReplacementReschedule = (replacement: NonNullable<NonNullable<PackageData["subjects"]>[number]["teacher_replacement"]>) => {
    setRescheduleTarget(replacement);
    setReplacementSchedules(replacement.sessions.map((session) => {
      const date = validDate(session.start_at);
      if (!date) return "";
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
      return local.toISOString().slice(0, 16);
    }));
  };

  const submitReplacementReschedule = async (event: FormEvent) => {
    event.preventDefault();
    if (!rescheduleTarget) return;
    setProcessing(rescheduleTarget.id);
    try {
      const response = await http.post("/student/teacher-replacements/" + rescheduleTarget.id + "/reschedule", {
        schedules: replacementSchedules,
      });
      notify.success(response.data.message);
      setRescheduleTarget(null);
      await load(true);
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    if (scope !== "history") setExpandedHistory(new Set());
  }, [scope]);

  const activeItems = useMemo(() => items.filter((item) => !historyPackageStatuses.has(packageDisplayStatus(item))), [items]);
  const historyItems = useMemo(() => items.filter((item) => historyPackageStatuses.has(packageDisplayStatus(item))), [items]);
  const visibleItems = scope === "active" ? activeItems : historyItems;

  return (
      <div className="space-y-5">
        <section className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">Paket privat</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 sm:text-xl">{scope === "active" ? "Pesanan dan paket privat" : "Riwayat paket privat"}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{scope === "active" ? "Pantau pembayaran, pencarian tutor, perubahan jadwal, sisa sesi, dan perpanjangan paket." : "Paket yang selesai, dibatalkan, kedaluwarsa, atau sudah dikembalikan tersimpan di sini."}</p>
          </div>
          {scope === "active" && <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link to="/student/packages/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700">
              Cari les privat <ArrowRight size={17} />
            </Link>
          </div>}
        </section>

        {loading ? (
          <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-indigo-600" size={34} /></div>
        ) : error ? (
          <ErrorState error={error} onRetry={retryLoad} />
        ) : visibleItems.length ? (
          <div className="space-y-5">
            {visibleItems.map((item) => {
              const subjects = Array.isArray(item.subjects) ? item.subjects : [];
              const sessionUsage = Math.round((Number(item.used_sessions || 0) / Math.max(1, Number(item.total_sessions || 0))) * 100);
              const displayStatus = packageDisplayStatus(item);
              const canViewProgress = ["matching", "teacher_pending", "no_teacher", "active", "completed", "refunded"].includes(displayStatus);
              const needsPayment = ["awaiting_payment", "payment_rejected", "partially_paid"].includes(item.status) && item.latest_order;
              const canCancelSearch = ["matching", "teacher_pending", "no_teacher"].includes(item.status);
              const retryableSubjects = subjects.filter((subject) => subject.status === "no_teacher" && subject.matching?.can_retry);
              const canRetry = retryableSubjects.length > 0;
              const canChangeSchedule = subjects.some((subject) => subject.status === "no_teacher" && subject.matching?.can_change_schedule);
              const retryLabel = retryableSubjects.length === 1 ? (retryableSubjects[0].matching?.retry_label || "Cari Lagi") : "Cari Lagi";
              const renewalSubject = item.can_renew ? subjects.find((subject) => Boolean(subject.teacher)) : undefined;
              const isCollapsed = scope === "history" && !expandedHistory.has(item.id);
              return (
                <article key={item.id} className="min-w-0 max-w-full overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white shadow-sm sm:rounded-[2rem]">
                  <div className="flex min-w-0 flex-col justify-between gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="min-w-0 break-words text-lg font-black leading-snug text-slate-900 sm:text-xl">{item.plan?.name || "Paket belajar"}</h2>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700">{labels[displayStatus] || displayStatus}</span>
                        {item.renewal_of_id && <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">Paket lanjutan</span>}
                      </div>
                      <p className="mt-1 break-all text-xs font-bold text-slate-400">{item.package_code} · {item.learning_mode === "online" ? "Online" : "Offline"}</p>
                      <p className="mt-2 text-sm font-black text-slate-700">
                        {subjects.length ? subjects.map((subject) => subject.name).join(", ") : "Paket belajar"}
                        <span className="font-semibold text-slate-400"> · {item.used_sessions}/{item.total_sessions} sesi</span>
                        {renewalSubject?.teacher && <span className="font-semibold text-slate-500"> · Tutor {renewalSubject.teacher.name}</span>}
                      </p>
                    </div>
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                      {canRetry && (
                        <button type="button" disabled={processing === item.id} onClick={() => retry(item.id)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50 sm:flex-none">
                          {processing === item.id ? <Loader2 className="animate-spin" size={17} /> : <Search size={17} />} {retryLabel}
                        </button>
                      )}
                      {needsPayment && (
                        <Link to="/payment" state={{
                          orderId: item.latest_order!.id,
                          invoiceId: item.latest_order!.order_id,
                          tutorName: item.latest_order!.tutor_name,
                          subject: item.latest_order!.subject,
                          type: item.latest_order!.type,
                          price: Number(item.latest_order!.amount),
                          subtotalAmount: Number(item.latest_order!.subtotal_amount || item.latest_order!.amount),
                          discountAmount: Number(item.latest_order!.discount_amount || 0),
                          packageName: item.latest_order!.package_name || item.plan?.name,
                          paymentDueAt: item.payment_due_at,
                          rejectionReason: item.latest_order!.payment_rejection_reason,
                          durationHours: Number(item.duration_hours || 1),
                          totalLearningHours: Number(item.total_learning_hours || 0),
                          orderKind: item.latest_order!.order_kind,
                        }} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white sm:flex-none">
                          <CreditCard size={17} /> Bayar Paket
                        </Link>
                      )}
                      {canChangeSchedule && (
                        <Link to={`/student/packages/${item.id}/reschedule`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-700 sm:flex-none">
                          <CalendarClock size={17} /> Ubah Jadwal
                        </Link>
                      )}
                      {canCancelSearch && (
                        <button type="button" disabled={processing === item.id} onClick={() => cancel(item)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-black text-rose-600 disabled:opacity-50 sm:flex-none">
                          <XCircle size={17} /> Batalkan
                        </button>
                      )}
                      {scope === "history" && <button type="button" onClick={() => setExpandedHistory((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-indigo-200 hover:text-indigo-700 sm:flex-none">{isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />} {isCollapsed ? "Lihat detail" : "Sembunyikan detail"}</button>}
                      {scope === "history" && renewalSubject && <Link to={`/student/packages/new?renew=${item.id}&subject=${renewalSubject.id}`} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 sm:flex-none">Perpanjang dengan Tutor Ini</Link>}
                    </div>
                  </div>

                  <div className={isCollapsed ? "hidden" : "border-b border-slate-100 px-5 py-5 sm:px-6"}>
                    <OrderProgress status={item.status} />
                  </div>

                  <div className={isCollapsed ? "hidden" : "grid grid-cols-1 gap-2 p-4 min-[360px]:grid-cols-3 sm:gap-4 sm:p-6"}>
                    <Stat icon={BookOpenCheck} label="Sisa sesi" value={`${item.remaining_sessions} sesi`} />
                    <Stat icon={CalendarDays} label="Masa aktif" value={formatShortDate(item.expires_at)} />
                    <Stat icon={Clock3} label="Durasi" value={`${item.duration_hours || 1} jam`} />
                  </div>

                  <div className={isCollapsed ? "hidden" : "px-5 pb-5 sm:px-6 sm:pb-6"}>
                    <div className="rounded-2xl bg-slate-50 p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-slate-700">Pemakaian sesi</p><p className="mt-0.5 text-[11px] text-slate-400">Bukan persentase penguasaan materi</p></div><span className="text-sm font-black text-indigo-700">{item.used_sessions}/{item.total_sessions}</span></div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500" style={{ width: `${sessionUsage}%` }} /></div>
                    </div>
                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                      {subjects.map((subject) => {
                        const sessions = Array.isArray(subject.sessions) ? subject.sessions : [];
                        const next = sessions.find((session) => {
                          const date = validDate(session.start_at);
                          return date ? date.getTime() >= Date.now() : false;
                        });
                        const nextLabel = formatSessionDate(next?.start_at);
                        return (
                          <div key={subject.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-black text-slate-900">{subject.name}</h3>
                                <p className="mt-1 text-xs text-slate-500">{subject.allocated_sessions} sesi · {labels[subject.status] || subject.status}</p>
                              </div>
                              <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-white text-indigo-600 shadow-sm">
                                {subject.teacher?.avatar_url ? <img src={subject.teacher.avatar_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <UserRound size={19} />}
                              </div>
                            </div>
                            <p className="mt-3 text-sm font-bold text-slate-700">{subject.teacher ? `Tutor ${subject.teacher.name}` : "Tutor sedang dicari"}</p>
                            {Boolean(subject.matching?.active_offer_count) && (
                              <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-900">
                                <div className="flex items-start gap-2"><Search size={15} className="mt-0.5 shrink-0"/><span>{subject.matching?.active_offer_count} guru sedang dihubungi. Batas jawaban terdekat {formatSessionDate(subject.matching?.teacher_response_deadline) || "sedang dihitung"}.</span></div>
                              </div>
                            )}
                            {subject.matching?.search_state === "retry_scheduled" && (
                              <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs font-semibold leading-5 text-sky-900">
                                <div className="flex items-start gap-2"><RefreshCw size={15} className="mt-0.5 shrink-0"/><span>Belum ada kandidat saat ini. Sistem memeriksa kembali otomatis pada {formatSessionDate(subject.matching.next_matching_at) || "jadwal berikutnya"}.</span></div>
                              </div>
                            )}
                            {subject.matching?.search_state === "action_required" && subject.matching?.message && (
                              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
                                <div className="flex items-start gap-2"><AlertCircle size={15} className="mt-0.5 shrink-0"/><span>{subject.matching.message}</span></div>
                              </div>
                            )}
                            {nextLabel && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Clock3 size={14} /> {nextLabel}</p>}
                            {subject.teacher_replacement && (
                              <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-950">
                                <p className="font-black">{replacementLabels[subject.teacher_replacement.status] || subject.teacher_replacement.status}</p>
                                <p className="mt-1 leading-5">{subject.teacher_replacement.remaining_sessions} sesi tersisa · {subject.teacher_replacement.replacement_code}</p>
                                {subject.teacher_replacement.review_notes && <p className="mt-2 rounded-xl bg-white/70 p-2 leading-5">Catatan admin: {subject.teacher_replacement.review_notes}</p>}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {subject.teacher_replacement.can_cancel && <button type="button" disabled={processing === subject.teacher_replacement.id} onClick={() => void replacementAction(subject.teacher_replacement!.id, "cancel")} className="rounded-xl border border-violet-200 bg-white px-3 py-2 font-black">Batalkan</button>}
                                  {subject.teacher_replacement.can_retry && <button type="button" disabled={processing === subject.teacher_replacement.id} onClick={() => void replacementAction(subject.teacher_replacement!.id, "retry")} className="rounded-xl bg-indigo-600 px-3 py-2 font-black text-white">Cari lagi</button>}
                                  {subject.teacher_replacement.can_reschedule && <button type="button" onClick={() => openReplacementReschedule(subject.teacher_replacement!)} className="rounded-xl border border-indigo-200 bg-white px-3 py-2 font-black text-indigo-700">Ubah jadwal</button>}
                                  {subject.teacher_replacement.can_request_refund && <button type="button" disabled={processing === subject.teacher_replacement.id} onClick={() => void replacementAction(subject.teacher_replacement!.id, "request-refund")} className="rounded-xl border border-rose-200 bg-white px-3 py-2 font-black text-rose-700">Refund sisa sesi</button>}
                                </div>
                              </div>
                            )}
                            {subject.can_request_teacher_replacement && (
                              <button type="button" onClick={() => setReplacementTarget({ packageId: item.id, subject })} className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-50">
                                Ajukan Ganti Guru
                              </button>
                            )}
                            {item.can_renew && subject.teacher && scope !== "history" && (
                              <Link to={`/student/packages/new?renew=${item.id}&subject=${subject.id}`} className="mt-4 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-black text-indigo-700 shadow-sm">
                                Perpanjang dengan Tutor Ini
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {canViewProgress && (
                      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Link to={`/student/progress/package/${item.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white hover:bg-indigo-700">
                          <BarChart3 size={16} /> Lihat Progress
                        </Link>
                        {item.status === "active" && (
                          <Link to="/student/my-classes" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:border-indigo-200 hover:text-indigo-700">
                            Lihat jadwal & laporan <ArrowRight size={16} />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center">
            <BookOpenCheck className="mx-auto text-slate-300" size={42} />
            <h2 className="mt-4 text-xl font-black text-slate-800">{items.length === 0 ? "Belum ada paket privat" : scope === "history" ? "Riwayat paket masih kosong" : "Tidak ada proses paket"}</h2>
            <p className="mt-2 text-sm text-slate-500">{items.length === 0 ? "Cari les privat untuk mulai menentukan mata pelajaran dan jadwal." : scope === "history" ? "Paket yang selesai atau tidak aktif akan tersimpan di sini." : "Tidak ada pembayaran atau pencarian tutor yang perlu dipantau."}</p>
            {scope === "active" && <Link to="/student/packages/new" className="mt-5 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white">Pilih Paket</Link>}
          </div>
        )}
        <Dialog open={Boolean(replacementTarget)} onOpenChange={(open) => !open && setReplacementTarget(null)}>
          <DialogContent className="max-h-[92dvh] overflow-x-hidden overflow-y-auto rounded-[1.5rem] sm:max-w-lg sm:rounded-[2rem]">
            <DialogHeader>
              <DialogTitle>Ajukan Ganti Guru</DialogTitle>
              <DialogDescription className="break-words">{replacementTarget ? replacementTarget.subject.name + " · Tutor " + (replacementTarget.subject.teacher?.name || "-") : ""}</DialogDescription>
            </DialogHeader>
            <form onSubmit={submitReplacement} className="min-w-0 space-y-4">
              <div className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">Admin akan memeriksa pengajuan. Jika disetujui, hanya sesi mendatang yang dibekukan; progress dan sesi selesai tetap utuh.</div>
              <label className="block min-w-0 text-sm font-black text-slate-700">Alasan
                <select value={replacementReason} onChange={(event) => setReplacementReason(event.target.value)} className="mt-2 block h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3">
                  <option value="communication">Masalah komunikasi</option>
                  <option value="schedule">Masalah jadwal</option>
                  <option value="learning_fit">Metode belajar kurang cocok</option>
                  <option value="teacher_unavailable">Guru tidak dapat melanjutkan</option>
                  <option value="conduct">Sikap atau perilaku</option>
                  <option value="other">Lainnya</option>
                </select>
              </label>
              <label className="block min-w-0 text-sm font-black text-slate-700">Penjelasan
                <textarea required minLength={20} maxLength={2000} value={replacementDetail} onChange={(event) => setReplacementDetail(event.target.value)} className="mt-2 block min-h-32 w-full min-w-0 max-w-full resize-y rounded-xl border border-slate-200 p-3 font-normal" placeholder="Jelaskan masalah dan dampaknya pada proses belajar." />
              </label>
              <label className="block min-w-0 text-sm font-black text-slate-700">Bukti opsional
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => selectReplacementEvidence(event.target.files?.[0] || null)} className="mt-2 block w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 p-3 text-xs font-normal file:mr-2 file:max-w-[8rem] file:truncate" />
              </label>
              <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setReplacementTarget(null)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-black">Kembali</button><button disabled={processing !== null || replacementDetail.trim().length < 20} className="min-h-11 w-full rounded-xl bg-indigo-600 px-3 text-sm font-black text-white disabled:opacity-50">{processing !== null ? "Mengirim..." : "Kirim pengajuan"}</button></div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(rescheduleTarget)} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
          <DialogContent className="max-h-[92dvh] overflow-x-hidden overflow-y-auto rounded-[1.5rem] sm:max-w-lg sm:rounded-[2rem]">
            <DialogHeader><DialogTitle>Ubah jadwal sesi tersisa</DialogTitle><DialogDescription>Semua jadwal paling cepat 24 jam dari sekarang dan menggunakan menit 00.</DialogDescription></DialogHeader>
            <form onSubmit={submitReplacementReschedule} className="min-w-0 space-y-3">
              {replacementSchedules.map((value, index) => <label key={index} className="block min-w-0 text-sm font-black text-slate-700">Sesi {index + 1}<input required type="datetime-local" step={3600} value={value} onChange={(event) => setReplacementSchedules((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="mt-2 block h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" /></label>)}
              <div className="grid gap-2 pt-2 sm:grid-cols-2"><button type="button" onClick={() => setRescheduleTarget(null)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-black">Kembali</button><button disabled={processing !== null || replacementSchedules.some((value) => !value)} className="min-h-11 w-full rounded-xl bg-indigo-600 px-3 text-sm font-black text-white disabled:opacity-50">{processing !== null ? "Menyimpan..." : "Simpan jadwal"}</button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof BookOpenCheck; label: string; value: string }) {
  return <div className="flex min-w-0 flex-col items-center gap-2 rounded-2xl bg-slate-50 p-3 text-center sm:flex-row sm:gap-3 sm:p-4 sm:text-left"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm sm:h-10 sm:w-10"><Icon size={18} /></div><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-slate-400 sm:text-[10px] sm:tracking-wider">{label}</p><p className="mt-1 break-words text-xs font-black text-slate-800 sm:text-base">{value}</p></div></div>;
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
          <Link to="/student/dashboard" className="mt-5 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 transition-colors">
            Kembali ke Beranda
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
          <p className="mt-2 text-sm text-slate-500">Paket tidak dapat dimuat saat ini.</p>
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
        <p className="mt-2 text-sm text-slate-500">Paket tidak dapat dimuat. Silakan coba lagi.</p>
        <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-colors">
          <RefreshCw size={16} /> Coba Lagi
        </button>
      </div>
    </div>
  );
}
