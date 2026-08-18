import { notify } from "@/lib/notify";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CalendarClock,
  Clock3,
  CreditCard,
  History,
  Loader2,
  RefreshCw,
  Search,
  WifiOff,
  XCircle,
  UserRound,
} from "lucide-react";
import axios from "axios";

import StudentLayout from "@/components/StudentLayout";
import OrderProgress from "@/components/OrderProgress";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import http, { getApiError, getCached } from "@/lib/http";

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
    sessions?: Array<{ id: number; start_at?: string | null; status?: string; booking_id?: number | null }> | null;
    matching?: {
      reason_code?: string | null;
      message?: string | null;
      recommended_action?: string | null;
      search_radius_km?: number;
      next_radius_km?: number | null;
      search_expires_at?: string | null;
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

export default function MyPackages() {
  const confirm = useConfirmDialog();
  const [items, setItems] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [scope, setScope] = useState<PackageScope>("active");

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

  const activeItems = useMemo(() => items.filter((item) => !historyPackageStatuses.has(packageDisplayStatus(item))), [items]);
  const historyItems = useMemo(() => items.filter((item) => historyPackageStatuses.has(packageDisplayStatus(item))), [items]);
  const visibleItems = scope === "active" ? activeItems : historyItems;

  return (
    <StudentLayout title="Kelas Saya">
      <div className="space-y-6 pb-20">
        <section className="flex flex-col justify-between gap-5 rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-5 text-white sm:flex-row sm:items-center sm:rounded-[2rem] sm:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Paket dan tutor</p>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl">Kelas Saya</h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/70">Kelola paket yang masih berjalan dari tab Aktif. Paket yang sudah selesai, dibatalkan, atau berakhir tetap tersimpan rapi di Riwayat.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link to="/student/requests/legacy" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15">
              <History size={17} /> Permintaan Lama
            </Link>
            <Link to="/student/packages/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-slate-950">
              Tambah Paket <ArrowRight size={17} />
            </Link>
          </div>
        </section>

        {!loading && !error && items.length > 0 && (
          <section className="rounded-[1.5rem] border border-slate-100 bg-white p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5">
              <button type="button" onClick={() => setScope("active")} aria-pressed={scope === "active"} className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${scope === "active" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-white/70"}`}>Aktif <span className="ml-1 text-xs">({activeItems.length})</span></button>
              <button type="button" onClick={() => setScope("history")} aria-pressed={scope === "history"} className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${scope === "history" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-white/70"}`}>Riwayat <span className="ml-1 text-xs">({historyItems.length})</span></button>
            </div>
          </section>
        )}

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
              const needsPayment = ["awaiting_payment", "payment_rejected"].includes(item.status) && item.latest_order;
              const canCancelSearch = ["matching", "teacher_pending", "no_teacher"].includes(item.status);
              const retryableSubjects = subjects.filter((subject) => subject.status === "no_teacher" && subject.matching?.can_retry);
              const canRetry = retryableSubjects.length > 0;
              const canChangeSchedule = subjects.some((subject) => subject.status === "no_teacher" && subject.matching?.can_change_schedule);
              const retryLabel = retryableSubjects.length === 1 ? (retryableSubjects[0].matching?.retry_label || "Cari Lagi") : "Cari Lagi";
              return (
                <article key={item.id} className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-slate-900">{item.plan?.name || "Paket belajar"}</h2>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700">{labels[displayStatus] || displayStatus}</span>
                        {item.renewal_of_id && <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">Paket lanjutan</span>}
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-400">{item.package_code} · {item.learning_mode === "online" ? "Online" : "Offline"}</p>
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
                    </div>
                  </div>

                  <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                    <OrderProgress status={item.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-4 sm:gap-4 sm:p-6">
                    <Stat icon={BookOpenCheck} label="Sisa sesi" value={`${item.remaining_sessions} sesi`} />
                    <Stat icon={CalendarDays} label="Masa aktif" value={formatShortDate(item.expires_at)} />
                    <Stat icon={Clock3} label="Durasi" value={`${item.duration_hours || 1} jam`} />
                  </div>

                  <div className="px-5 pb-5 sm:px-6 sm:pb-6">
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
                            {subject.status === "no_teacher" && subject.matching?.message && (
                              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
                                <div className="flex items-start gap-2"><AlertCircle size={15} className="mt-0.5 shrink-0"/><span>{subject.matching.message}</span></div>
                              </div>
                            )}
                            {nextLabel && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Clock3 size={14} /> {nextLabel}</p>}
                            {item.can_renew && subject.teacher && (
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
            <h2 className="mt-4 text-xl font-black text-slate-800">{items.length === 0 ? "Belum ada paket belajar" : scope === "history" ? "Riwayat paket masih kosong" : "Tidak ada paket aktif"}</h2>
            <p className="mt-2 text-sm text-slate-500">{items.length === 0 ? "Pilih paket untuk mulai menentukan mapel dan jadwal." : scope === "history" ? "Paket yang sudah selesai atau tidak aktif akan tersimpan di sini." : "Semua paketmu sudah selesai atau berpindah ke riwayat."}</p>
            {scope === "active" && <Link to="/student/packages/new" className="mt-5 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white">Pilih Paket</Link>}
          </div>
        )}
      </div>
    </StudentLayout>
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
