import { notify } from "@/lib/notify";
import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  FileCheck2,
  Filter,
  GraduationCap,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquareWarning,
  Monitor,
  RefreshCw,
  ShieldAlert,
  Star,
  UserRound,
  Users,
  WifiOff,
} from "lucide-react";
import axios from "axios";
import StudentLayout from "@/components/StudentLayout";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import http, { getApiError, getCached } from "@/lib/http";
import { validateUpload } from "@/lib/validation";

const LearningSessionHub = lazy(() => import("@/components/LearningSessionHub"));

interface ClassItem {
  id: number;
  title: string;
  subject: string;
  education_level?: string;
  grade?: string;
  chapter?: string;
  mentor: string;
  mentor_avatar?: string;
  type: "Kelompok" | "Privat";
  method: "online" | "offline";
  status: string;
  tutor_ready_at?: string | null;
  student_confirmed_at?: string | null;
  session_started_at?: string | null;
  session_ended_at?: string | null;
  actual_duration_minutes?: number | null;
  scheduled_duration_minutes?: number | null;
  session_focus_note?: string | null;
  participant_status: string;
  start_at: string;
  end_at: string;
  address?: string;
  maps_link?: string;
  meeting_link?: string;
  amount: number;
  payment_due_at?: string;
  completion_notes?: string;
  objection_deadline?: string;
  approved_at?: string;
  can_rate: boolean;
  can_approve: boolean;
  can_dispute: boolean;
  can_report_teacher_absence: boolean;
  attention?: {
    kind: "review" | "presence";
    title: string;
    message: string;
    button_label: string;
    target_url: string;
  } | null;
  dispute?: { status: string; reason: string; resolution?: string };
  refund?: { status: string; amount: number; proof?: string; reason?: string };
  order?: { id: number; order_id: string; status: string; payment_rejection_reason?: string };
}

const labels: Record<string, { label: string; className: string }> = {
  awaiting_payment: { label: "Menunggu pembayaran", className: "bg-orange-50 text-orange-700" },
  payment_submitted: { label: "Pembayaran diperiksa", className: "bg-sky-50 text-sky-700" },
  payment_collecting: { label: "Menunggu pembayaran", className: "bg-orange-50 text-orange-700" },
  confirmed: { label: "Terjadwal", className: "bg-indigo-50 text-indigo-700" },
  in_progress: { label: "Sedang berlangsung", className: "bg-emerald-50 text-emerald-700" },
  awaiting_student_approval: { label: "Butuh keputusanmu", className: "bg-amber-50 text-amber-700" },
  disputed: { label: "Keberatan diperiksa", className: "bg-rose-50 text-rose-700" },
  admin_review_required: { label: "Diperiksa admin", className: "bg-violet-50 text-violet-700" },
  completed: { label: "Selesai", className: "bg-emerald-50 text-emerald-700" },
  refund_pending: { label: "Refund diproses", className: "bg-amber-50 text-amber-700" },
  emergency_refund_pending: { label: "Refund darurat", className: "bg-amber-50 text-amber-700" },
  refunded: { label: "Refund selesai", className: "bg-slate-100 text-slate-700" },
  absence_review: { label: "Kehadiran diperiksa", className: "bg-rose-50 text-rose-700" },
};

type ClassListResponse = ClassItem[] | { data?: ClassItem[] };
type ScheduleSort = "nearest" | "farthest";

const presenceProblemOptions = [
  "Tutor tidak mengajar selama durasi yang seharusnya.",
  "Tutor tidak hadir penuh selama sesi berlangsung.",
  "Materi yang diajarkan tidak sesuai dengan sesi.",
  "Ada masalah dengan sikap atau perilaku tutor.",
  "Ada masalah teknis yang mengganggu pembelajaran.",
  "Ada masalah lain yang perlu diperiksa oleh admin.",
] as const;

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

const validDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateTime = (value?: string | null) => {
  const date = validDate(value);
  return date
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(date)
    : "Jadwal belum tersedia";
};

const timeOnly = (value?: string | null) => {
  const date = validDate(value);
  return date
    ? date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : "--.--";
};

const readClassRows = (payload: ClassListResponse): ClassItem[] | null => {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : null;
};

export default function MyClasses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const confirm = useConfirmDialog();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [selected, setSelected] = useState<ClassItem | null>(null);
  const [dispute, setDispute] = useState<ClassItem | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeCategory, setDisputeCategory] = useState("");
  const [disputeEvidence, setDisputeEvidence] = useState<File | null>(null);
  const [absenceReport, setAbsenceReport] = useState<ClassItem | null>(null);
  const [absenceReason, setAbsenceReason] = useState("");
  const [absenceEvidence, setAbsenceEvidence] = useState<File | null>(null);
  const [ratingClass, setRatingClass] = useState<ClassItem | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [hubBookingId, setHubBookingId] = useState<number | null>(null);
  const [hubInitialTab, setHubInitialTab] = useState<"session">("session");
  const [hubReturnClass, setHubReturnClass] = useState<ClassItem | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [scheduleSort, setScheduleSort] = useState<ScheduleSort>("nearest");

  const subjectOptions = useMemo(() => {
    return Array.from(
      new Set(
        classes
          .map((item) => item.subject?.trim())
          .filter((subject): subject is string => Boolean(subject))
      )
    ).sort((left, right) => left.localeCompare(right, "id-ID"));
  }, [classes]);

  const visibleClasses = useMemo(() => {
    const now = Date.now();
    const filtered = subjectFilter === "all"
      ? classes
      : classes.filter((item) => item.subject === subjectFilter);

    return [...filtered].sort((left, right) => {
      const leftTime = validDate(left.start_at)?.getTime();
      const rightTime = validDate(right.start_at)?.getTime();

      if (leftTime === undefined && rightTime === undefined) return left.id - right.id;
      if (leftTime === undefined) return 1;
      if (rightTime === undefined) return -1;

      const leftUpcoming = leftTime >= now;
      const rightUpcoming = rightTime >= now;

      // Jadwal yang masih akan datang selalu diprioritaskan sebelum riwayat.
      if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1;

      if (scheduleSort === "nearest") {
        return leftUpcoming ? leftTime - rightTime : rightTime - leftTime;
      }

      return leftUpcoming ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [classes, scheduleSort, subjectFilter]);

  useEffect(() => { void loadClasses(); }, []);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void loadClasses({ silent: true });
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("bimbelku:data-changed", refresh);
    const timer = window.setInterval(refresh, 10_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("bimbelku:data-changed", refresh);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const sessionId = Number(searchParams.get("session"));
    const action = searchParams.get("session_action");
    if (!Number.isFinite(sessionId) || !action || classes.length === 0) return;
    const item = classes.find((row) => row.id === sessionId);
    if (!item) return;

    if (action === "presence") {
      setHubReturnClass(item);
      setHubInitialTab("session");
      setHubBookingId(item.id);
      setSelected(null);
      return;
    }

    if (action === "review" || action === "late") {
      setSelected(item);
    }
  }, [classes, searchParams]);

  const clearSessionActionQuery = () => {
    if (!searchParams.get("session")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("session");
    next.delete("session_action");
    setSearchParams(next, { replace: true });
  };

  const openAttention = (item: ClassItem) => {
    if (!item.attention) return;
    const next = new URLSearchParams(searchParams);
    next.set("session", String(item.id));
    next.set("session_action", item.attention.kind);
    setSearchParams(next);
  };

  const loadClasses = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await getCached<ClassListResponse>("/student/classes", { maxAgeMs: 2_000, force: true });
      const rows = readClassRows(response.data);
      if (!rows) throw new Error("Format daftar kelas tidak dikenali.");
      setClasses(rows);
    } catch (err) {
      if (!silent) {
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
        notify.error(getApiError(err, "Kelas gagal dimuat."));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const retry = () => {
    setError(null);
    void loadClasses();
  };

  const approve = async (item: ClassItem) => {
    const accepted = await confirm({
      title: "Sesi tadi sudah sesuai?",
      description: "Pastikan tutor hadir dan sesi berjalan sesuai. Setelah dikonfirmasi, keberatan tidak dapat diajukan lagi dari halaman ini.",
      confirmText: "Ya, sesi sesuai",
      tone: "warning",
    });
    if (!accepted) return;
    setProcessing(item.id);
    try {
      const response = await http.post(`/student/bookings/${item.id}/approve`);
      notify.success(response.data.message);
      setSelected(null);
      clearSessionActionQuery();
      await loadClasses();
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(null);
    }
  };

  const submitDispute = async (event: FormEvent) => {
    event.preventDefault();
    if (!dispute) return;
    const payload = new FormData();
    if (!disputeCategory) {
      notify.error("Pilih dulu masalah yang terjadi pada sesi.");
      return;
    }
    const reason = `${disputeCategory}${disputeReason.trim() ? ` Detail: ${disputeReason.trim()}` : ""}`;
    payload.append("reason", reason);
    if (disputeEvidence) payload.append("evidence", disputeEvidence);
    setProcessing(dispute.id);
    try {
      const response = await http.post(`/student/bookings/${dispute.id}/dispute`, payload);
      notify.success(response.data.message);
      setDispute(null);
      setSelected(null);
      clearSessionActionQuery();
      setDisputeReason("");
      setDisputeCategory("");
      setDisputeEvidence(null);
      await loadClasses();
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(null);
    }
  };

  const submitRating = async () => {
    if (!ratingClass) return;
    setProcessing(ratingClass.id);
    try {
      const response = await http.post("/ratings", { booking_id: ratingClass.id, rating, review });
      notify.success(response.data.message);
      setRatingClass(null);
      setReview("");
      setRating(5);
      await loadClasses();
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(null);
    }
  };

  const submitTeacherAbsence = async (event: FormEvent) => {
    event.preventDefault();
    if (!absenceReport || !absenceEvidence) return;
    const payload = new FormData();
    payload.append("chronology", absenceReason);
    payload.append("evidence", absenceEvidence);
    setProcessing(absenceReport.id);
    try {
      const response = await http.post(`/student/bookings/${absenceReport.id}/teacher-absence`, payload);
      notify.success(response.data.message);
      setAbsenceReport(null);
      setSelected(null);
      setAbsenceReason("");
      setAbsenceEvidence(null);
      await loadClasses();
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(null);
    }
  };

  const selectDisputeEvidence = (file?: File) => {
    const error = validateUpload(file, {
      label: "Bukti keberatan",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "webp", "pdf"],
    });
    if (error) {
      notify.error(error);
      setDisputeEvidence(null);
      return;
    }
    setDisputeEvidence(file || null);
  };

  const selectAbsenceEvidence = (file?: File) => {
    const error = validateUpload(file, {
      label: "Bukti ketidakhadiran tutor",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "webp", "pdf"],
    });
    if (error) {
      notify.error(error);
      setAbsenceEvidence(null);
      return;
    }
    setAbsenceEvidence(file || null);
  };

  const openPayment = (item: ClassItem) => {
    if (!item.order?.id) {
      notify.error("Data tagihan belum tersedia.");
      return;
    }
    navigate("/payment", {
      state: {
        orderId: item.order.id,
        invoiceId: item.order.order_id,
        tutorName: item.mentor,
        subject: item.subject,
        type: `${item.method === "online" ? "Online" : "Offline"} · ${item.type}`,
        price: Number(item.amount),
        date: item.start_at,
        paymentDueAt: item.payment_due_at,
        rejectionReason: item.order.payment_rejection_reason,
      },
    });
  };

  if (error) {
    return (
      <StudentLayout title="Kelas Saya">
        <ErrorState error={error} onRetry={retry} />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Kelas Saya">
      <div className="mx-auto max-w-7xl space-y-7 pb-12">
        <div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/student/packages")}
            className="-ml-3 rounded-xl text-slate-600 hover:bg-white hover:text-indigo-700"
          >
            <ArrowLeft size={16} className="mr-2" />
            Kembali ke Kelas Saya
          </Button>
        </div>

        <section data-tour="student-classes-hero" className="flex flex-col justify-between gap-5 rounded-[1.75rem] bg-gradient-to-br from-indigo-950 to-violet-900 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-7 md:flex-row md:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Sesi belajar</p><h1 className="mt-3 text-2xl font-black sm:text-3xl">Jadwal dan penyelesaian</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/75">Tautan atau alamat, bukti pelaksanaan, persetujuan, keberatan, serta refund tersedia dalam satu tempat.</p></div>
          <Button variant="outline" onClick={() => void loadClasses()} className="w-full rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white md:w-auto"><RefreshCw size={16} className="mr-2" />Muat ulang</Button>
        </section>

        {classes.length > 0 && (
          <section className="rounded-[1.7rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Filter size={17} />
                </span>
                <div className="min-w-0">
                  <p className="font-black text-slate-900">Filter kelas</p>
                  <p className="truncate text-xs text-slate-500">{visibleClasses.length} dari {classes.length} kelas ditampilkan</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:items-end">
              <div>
                <Label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  <GraduationCap size={14} /> Mata pelajaran
                </Label>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="h-12 w-full rounded-xl border-slate-200 bg-white text-left font-bold">
                    <SelectValue placeholder="Semua mata pelajaran" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)]">
                    <SelectItem value="all">Semua mata pelajaran</SelectItem>
                    {subjectOptions.map((subject) => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  <ArrowUpDown size={14} /> Urutan jadwal
                </Label>
                <Select value={scheduleSort} onValueChange={(value) => setScheduleSort(value as ScheduleSort)}>
                  <SelectTrigger className="h-12 w-full rounded-xl border-slate-200 bg-white text-left font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" className="max-w-[calc(100vw-2rem)]">
                    <SelectItem value="nearest">Jadwal paling dekat</SelectItem>
                    <SelectItem value="farthest">Jadwal paling jauh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div role="status" aria-live="polite" className="grid min-h-56 place-items-center rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            <div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-indigo-600" /><p className="mt-3 text-sm font-bold text-slate-500">Memuat jadwal kelas…</p></div>
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white px-5 py-16 text-center sm:py-20"><BookOpen className="mx-auto h-11 w-11 text-slate-300" /><p className="mt-4 font-black text-slate-800">Belum ada kelas</p><Button asChild className="mt-5 rounded-xl bg-indigo-600"><Link to="/student/packages/new">Pilih paket belajar</Link></Button></div>
        ) : visibleClasses.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white px-5 py-14 text-center">
            <Filter className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 font-black text-slate-800">Tidak ada kelas sesuai filter</p>
            <p className="mt-1 text-sm text-slate-500">Pilih mata pelajaran lain atau tampilkan seluruh kelas.</p>
            <Button type="button" variant="outline" className="mt-5 rounded-xl" onClick={() => setSubjectFilter("all")}>Tampilkan semua kelas</Button>
          </div>
        ) : (
          <div data-tour="student-class-list" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleClasses.map((item) => {
              const status = labels[item.status] || { label: item.status, className: "bg-slate-100 text-slate-600" };
              return (
                <article key={item.id} className="render-auto flex min-w-0 max-w-full flex-col overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white p-4 shadow-sm transition hover-rise hover-shadow-xl sm:rounded-[2rem] sm:p-5">
                  <div className="flex items-start justify-between gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">{item.method === "online" ? <Monitor /> : <MapPin />}</div><span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${status.className}`}>{status.label}</span></div>
                  <p className="mt-5 min-w-0 break-words text-xs font-bold uppercase tracking-[.14em] text-indigo-500 sm:tracking-widest">{item.subject} · {item.type}</p><h2 className="mt-1 min-w-0 break-words text-lg font-black leading-snug text-slate-900 sm:line-clamp-2 sm:text-xl">{item.title}</h2>
                  <div className="mt-4 flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-500">{item.mentor_avatar ? <img src={item.mentor_avatar} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <UserRound size={18} />}</div><div className="min-w-0"><p className="text-xs text-slate-400">Tutor</p><p className="break-words text-sm font-bold text-slate-800">{item.mentor}</p></div></div>
                  <div className="mt-4 space-y-2 text-xs text-slate-600"><Info icon={CalendarDays} text={dateTime(item.start_at)} /><Info icon={Clock3} text={`${timeOnly(item.start_at)}–${timeOnly(item.end_at)}`} /><Info icon={Users} text={rupiah(item.amount)} /></div>
                  {item.attention && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[.14em] text-amber-700">Perlu tindakan</p>
                          <p className="mt-1 text-sm font-black text-amber-950">{item.attention.title}</p>
                          <p className="mt-1 text-xs leading-5 text-amber-800">{item.attention.message}</p>
                        </div>
                      </div>
                      <Button type="button" onClick={() => openAttention(item)} className="mt-3 min-h-10 w-full rounded-xl bg-amber-500 font-black text-slate-950 hover:bg-amber-600">
                        {item.attention.button_label}
                      </Button>
                    </div>
                  )}
                  <div className="mt-auto pt-5">
                    <Button onClick={() => setSelected(item)} variant="outline" className="w-full rounded-xl">Lihat detail</Button>
                    {["pending", "rejected"].includes(item.order?.status || "") && <Button onClick={() => openPayment(item)} className="mt-2 w-full rounded-xl bg-orange-500 hover:bg-orange-600"><CreditCard size={16} className="mr-2" />{item.order?.status === "rejected" ? "Unggah ulang bukti" : "Bayar sekarang"}</Button>}
                    {item.can_rate && <Button onClick={() => setRatingClass(item)} className="mt-2 w-full rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-500"><Star size={16} className="mr-2 fill-current" />Beri ulasan</Button>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelected(null); clearSessionActionQuery(); } }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[2rem] sm:max-w-2xl">
          {selected && <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelected(null)}
              className="w-fit -ml-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-indigo-700"
            >
              <ArrowLeft size={16} className="mr-2" />Kembali ke daftar kelas
            </Button>
            <DialogHeader><DialogTitle className="text-2xl">{selected.title}</DialogTitle><DialogDescription>{selected.mentor} · {dateTime(selected.start_at)}</DialogDescription></DialogHeader>
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><Info icon={GraduationCap} text={`${selected.education_level || ""} ${selected.grade || ""}`} /><Info icon={Users} text={`${selected.type} · ${rupiah(selected.amount)}`} /><Info icon={selected.method === "online" ? Monitor : MapPin} text={selected.method === "online" ? "Kelas online" : selected.address || "Alamat dibuka setelah pembayaran"} /><Info icon={Clock3} text={`${timeOnly(selected.start_at)}–${timeOnly(selected.end_at)}`} /></div>
            {["pending", "rejected"].includes(selected.order?.status || "") && <Button onClick={() => openPayment(selected)} className="rounded-xl bg-orange-500 hover:bg-orange-600"><CreditCard size={16} className="mr-2" />{selected.order?.status === "rejected" ? "Unggah ulang bukti pembayaran" : "Bayar kelas sekarang"}</Button>}
            {(selected.meeting_link || selected.maps_link) && <Button asChild className="rounded-xl bg-indigo-600"><a href={selected.meeting_link || selected.maps_link} target="_blank" rel="noreferrer"><ExternalLink size={16} className="mr-2" />{selected.method === "online" ? "Buka ruang kelas" : "Buka lokasi"}</a></Button>}
            {selected.order?.status === "paid" && <Button variant="outline" className="rounded-xl border-indigo-200 text-indigo-700" onClick={() => { setHubReturnClass(selected); setHubBookingId(selected.id); setSelected(null); }}><MessageCircle size={16} className="mr-2" />Buka ruang belajar</Button>}
            {selected.can_report_teacher_absence && <Button variant="outline" className="rounded-xl border-rose-200 text-rose-700" onClick={() => setAbsenceReport(selected)}><ShieldAlert size={16} className="mr-2" />Tutor belum hadir setelah 15 menit</Button>}
            {selected.completion_notes && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2 font-black text-emerald-900"><FileCheck2 size={18} />Hasil belajar dari tutor</div><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-800">Durasi aktual {selected.actual_duration_minutes ?? "-"} menit</span>{selected.scheduled_duration_minutes ? <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600">Jadwal {selected.scheduled_duration_minutes} menit</span> : null}</div><p className="mt-3 text-sm leading-6 text-emerald-800">{selected.completion_notes}</p>{selected.objection_deadline && <p className="mt-2 text-xs font-bold text-emerald-700">Batas keputusan: {dateTime(selected.objection_deadline)}</p>}</div>}
            {selected.dispute && <div className="flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800"><MessageSquareWarning className="shrink-0" /><div><p className="font-black">Keberatan {selected.dispute.status}</p><p className="mt-1 leading-6">{selected.dispute.reason}</p></div></div>}
            {selected.refund && <div className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800"><ShieldAlert className="shrink-0" /><div><p className="font-black">Refund {selected.refund.status} · {rupiah(selected.refund.amount)}</p><p className="mt-1">{selected.refund.reason}</p></div></div>}
            {(selected.can_approve || selected.can_dispute) && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-3 text-sm text-amber-900"><AlertCircle className="shrink-0" /><p>Cek singkat hasil belajar dan durasi sesi. Pilih Sesi Sesuai jika semuanya wajar, atau Ada masalah jika ada hal yang perlu diperiksa admin.</p></div><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">{selected.can_dispute && <Button variant="outline" className="rounded-xl border-rose-200 text-rose-700" onClick={() => setDispute(selected)}>Ada masalah</Button>}{selected.can_approve && <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(selected)} disabled={processing === selected.id}><CheckCircle2 size={16} className="mr-2" />Sesi Sesuai</Button>}</div></div>}
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(dispute)} onOpenChange={(open) => {
        if (!open) {
          setDispute(null);
          setDisputeCategory("");
          setDisputeReason("");
          setDisputeEvidence(null);
        }
      }}>
        <DialogContent className="rounded-[2rem] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ada masalah dengan sesi?</DialogTitle>
            <DialogDescription>Pilih masalah yang paling sesuai. Admin akan memeriksa sesi dan hak tutor ditahan sementara.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitDispute} className="space-y-4">
            <>
              <div className="grid gap-2">
                {presenceProblemOptions.map((option) => (
                  <button type="button" key={option} onClick={() => setDisputeCategory(option)} className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${disputeCategory === option ? "border-rose-300 bg-rose-50 text-rose-800" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>{option}</button>
                ))}
              </div>
              <div><Label>Ceritakan sedikit lagi <span className="font-normal text-slate-400">(opsional)</span></Label><Textarea maxLength={2500} className="mt-2 min-h-24 rounded-xl" value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} placeholder="Contoh: sesi berhenti setelah sekitar 20 menit." /></div>
            </>
            <div><Label>Bukti tambahan (opsional)</Label><Input className="mt-2" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => selectDisputeEvidence(event.target.files?.[0])} /></div>
            <Button className="w-full rounded-xl bg-rose-600 hover:bg-rose-700" disabled={processing === dispute?.id || !disputeCategory}>Kirim ke Admin</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(ratingClass)} onOpenChange={(open) => !open && setRatingClass(null)}>
        <DialogContent className="rounded-[2rem] sm:max-w-md"><DialogHeader><DialogTitle>Nilai sesi tutor</DialogTitle><DialogDescription>Penilaian hanya dapat dikirim satu kali.</DialogDescription></DialogHeader><div className="flex justify-center gap-2 py-3">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} onClick={() => setRating(value)} className={value <= rating ? "text-amber-400" : "text-slate-200"}><Star size={34} className="fill-current" /></button>)}</div><Textarea className="min-h-28 rounded-xl" value={review} onChange={(event) => setReview(event.target.value)} placeholder="Ceritakan pengalaman belajar, opsional" /><Button onClick={submitRating} disabled={processing === ratingClass?.id} className="w-full rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-600">Kirim {rating} bintang</Button></DialogContent>
      </Dialog>

      <Dialog open={Boolean(absenceReport)} onOpenChange={(open) => !open && setAbsenceReport(null)}>
        <DialogContent className="rounded-[2rem] sm:max-w-lg">
          <DialogHeader><DialogTitle>Laporkan tutor tidak hadir</DialogTitle><DialogDescription>Laporan tersedia setelah tutor terlambat lebih dari 15 menit. Admin akan memeriksa bukti sebelum refund penuh dan sanksi diputuskan.</DialogDescription></DialogHeader>
          <form onSubmit={submitTeacherAbsence} className="space-y-4">
            <Textarea required minLength={30} maxLength={2500} className="min-h-36 rounded-xl" value={absenceReason} onChange={(event) => setAbsenceReason(event.target.value)} placeholder="Jelaskan waktu menunggu, upaya menghubungi tutor, dan keadaan di lokasi/ruang online" />
            <div><Label>Bukti yang dapat diperiksa</Label><Input required className="mt-2" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => selectAbsenceEvidence(event.target.files?.[0])} /></div>
            <Button disabled={processing === absenceReport?.id} className="w-full rounded-xl bg-rose-600 hover:bg-rose-700">Kirim laporan</Button>
          </form>
        </DialogContent>
      </Dialog>
      {hubBookingId !== null && (
        <Suspense fallback={null}>
          <LearningSessionHub
            bookingId={hubBookingId}
            open
            initialTab={hubInitialTab}
            onOpenChange={(open) => {
              if (!open) {
                setHubBookingId(null);
                setHubInitialTab("session");
                setHubReturnClass(null);
                clearSessionActionQuery();
              }
            }}
            backLabel={hubReturnClass ? "Kembali ke detail kelas" : undefined}
            onBack={hubReturnClass ? () => {
              setHubBookingId(null);
              setHubInitialTab("session");
              setSelected(hubReturnClass);
              setHubReturnClass(null);
            } : undefined}
          />
        </Suspense>
      )}
    </StudentLayout>
  );
}

function Info({ icon: Icon, text }: { icon: typeof Clock3; text: string }) {
  return <div className="flex min-w-0 items-start gap-2 rounded-xl bg-white/70 px-3 py-2.5"><Icon size={15} className="mt-0.5 shrink-0 text-indigo-500" /><span className="min-w-0 break-words leading-5">{text}</span></div>;
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
          <p className="mt-2 text-sm text-slate-500">Kelas tidak dapat dimuat saat ini.</p>
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
        <p className="mt-2 text-sm text-slate-500">Kelas tidak dapat dimuat. Silakan coba lagi.</p>
        <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-colors">
          <RefreshCw size={16} /> Coba Lagi
        </button>
      </div>
    </div>
  );
}
