import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  Gavel,
  Loader2,
  RefreshCw,
  SearchCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../components/AdminLayout";
import http, { getApiError } from "@/lib/http";

interface WorkQueueItem {
  key: string;
  label: string;
  description: string;
  count: number;
  href: string;
  tone: "urgent" | "warning" | "normal";
}

interface MatchingPreviewItem {
  id: number;
  student_name: string;
  subject_name: string;
  status: string;
  status_label: string;
  teacher_name?: string | null;
  search_radius_km: number;
  scheduled_at: string;
  needs_attention: boolean;
}

interface DashboardData {
  revenue: { today: number; month: number; year: number };
  counts: {
    teachers: number;
    orders: number;
    users: number;
    matching_active: number;
    matching_attention: number;
    cases: number;
    refunds: number;
    payouts: number;
  };
  work_queue: WorkQueueItem[];
  matching_preview: MatchingPreviewItem[];
  visible_sections: {
    payments: boolean;
    matching: boolean;
    cases: boolean;
    refunds: boolean;
    payouts: boolean;
    teachers: boolean;
    users: boolean;
  };
  generated_at: string;
}

const emptyData: DashboardData = {
  revenue: { today: 0, month: 0, year: 0 },
  counts: {
    teachers: 0,
    orders: 0,
    users: 0,
    matching_active: 0,
    matching_attention: 0,
    cases: 0,
    refunds: 0,
    payouts: 0,
  },
  work_queue: [],
  matching_preview: [],
  visible_sections: {
    payments: false,
    matching: false,
    cases: false,
    refunds: false,
    payouts: false,
    teachers: false,
    users: false,
  },
  generated_at: "",
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDateTime = (value?: string | null) => {
  if (!value) return "Jadwal belum tersedia";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const workIcons: Record<string, typeof CreditCard> = {
  payments: CreditCard,
  matching: SearchCheck,
  cases: Gavel,
  refunds: WalletCards,
  payouts: BadgeDollarSign,
  teachers: FileCheck2,
};

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      const response = await http.get<DashboardData>("/admin/dashboard-stats");
      setData(response.data);
    } catch (requestError) {
      const message = getApiError(requestError, "Data operasional admin gagal dimuat.");
      setError(message);
      if (silent) toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading) {
    return (
      <AdminLayout title="Ringkasan kerja">
        <div className="grid min-h-[60vh] place-items-center rounded-3xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2 className="mx-auto animate-spin text-orange-600" size={38} />
            <p className="mt-4 text-sm font-bold text-slate-500">Menyiapkan antrean operasional...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Ringkasan kerja">
        <div className="grid min-h-[55vh] place-items-center rounded-3xl border border-rose-200 bg-white p-6 text-center">
          <div className="max-w-md">
            <AlertTriangle className="mx-auto text-rose-500" size={42} />
            <h2 className="mt-4 text-xl font-black text-slate-950">Dashboard belum dapat dimuat</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
            <button
              type="button"
              onClick={() => void fetchDashboard()}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              <RefreshCw size={17} /> Coba lagi
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const urgentCount = data.work_queue.filter((item) => item.count > 0).length;
  const heroMetrics = [
    data.visible_sections.matching ? { label: "Pencarian aktif", value: data.counts.matching_active, icon: SearchCheck } : null,
    data.visible_sections.matching ? { label: "Perlu perhatian", value: data.counts.matching_attention, icon: AlertTriangle } : null,
    data.visible_sections.cases ? { label: "Kasus aktif", value: data.counts.cases, icon: Gavel } : null,
    data.visible_sections.users ? { label: "Pengguna aktif", value: data.counts.users, icon: Users } : null,
    data.visible_sections.payments ? { label: "Pembayaran", value: data.counts.orders, icon: CreditCard } : null,
    data.visible_sections.refunds ? { label: "Refund", value: data.counts.refunds, icon: WalletCards } : null,
    data.visible_sections.payouts ? { label: "Pencairan", value: data.counts.payouts, icon: BadgeDollarSign } : null,
    data.visible_sections.teachers ? { label: "Verifikasi tutor", value: data.counts.teachers, icon: FileCheck2 } : null,
  ].filter(Boolean) as Array<{ label: string; value: number; icon: typeof SearchCheck }>;
  const primaryQueue = data.visible_sections.matching
    ? { href: "/admin/tutor-searches", label: "Buka pencarian tutor" }
    : data.work_queue[0]
      ? { href: data.work_queue[0].href, label: `Buka ${data.work_queue[0].label}` }
      : null;
  const hasFinanceSummary = data.visible_sections.payments || data.visible_sections.refunds || data.visible_sections.payouts;

  return (
    <AdminLayout
      title="Ringkasan kerja"
      subtitle="Pekerjaan yang membutuhkan tindakan ditampilkan paling atas."
    >
      <div className="space-y-6 sm:space-y-8">
        <section className="overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-2xl shadow-slate-300 sm:p-7 xl:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-orange-200">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                Pusat kendali hari ini
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl xl:text-4xl">
                {urgentCount > 0
                  ? `${urgentCount} kelompok pekerjaan membutuhkan perhatian.`
                  : "Tidak ada antrean kritis saat ini."}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                Dashboard ini hanya menampilkan antrean dan data yang termasuk dalam kewenangan akun admin Anda.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void fetchDashboard(true)}
                disabled={isRefreshing}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white hover:bg-white/15 disabled:opacity-60"
              >
                <RefreshCw size={17} className={isRefreshing ? "animate-spin" : ""} />
                Perbarui data
              </button>
              {primaryQueue && (
                <Link
                  to={primaryQueue.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white hover:bg-orange-400"
                >
                  {primaryQueue.label} <ArrowRight size={17} />
                </Link>
              )}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {heroMetrics.map((metric) => (
              <HeroMetric key={metric.label} label={metric.label} value={metric.value} icon={metric.icon} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">Antrean pekerjaan</h2>
              <p className="mt-1 text-sm text-slate-500">Urutan didasarkan pada tingkat urgensi dan jumlah pekerjaan.</p>
            </div>
            {data.generated_at && (
              <p className="hidden text-xs font-bold text-slate-400 md:block">
                Diperbarui {formatDateTime(data.generated_at)}
              </p>
            )}
          </div>

          {data.work_queue.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">
              Belum ada antrean yang termasuk dalam kewenangan akun ini.
            </div>
          ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.work_queue.map((item) => {
              const Icon = workIcons[item.key] || BookOpenCheck;
              const urgent = item.tone === "urgent";
              const warning = item.tone === "warning";
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  className={`group rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${
                    urgent
                      ? "border-rose-200 shadow-rose-100"
                      : warning
                        ? "border-amber-200 shadow-amber-100"
                        : "border-slate-200 shadow-slate-100"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                        urgent
                          ? "bg-rose-50 text-rose-600"
                          : warning
                            ? "bg-amber-50 text-amber-600"
                            : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      <Icon size={23} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-slate-950">{item.label}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ${
                            item.count > 0
                              ? urgent
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {item.count}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-slate-500">{item.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-slate-700 group-hover:text-orange-600">
                        Buka pekerjaan <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          )}
        </section>

        {(data.visible_sections.matching || hasFinanceSummary) && (
        <section className={`grid gap-6 ${data.visible_sections.matching && hasFinanceSummary ? "xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]" : "grid-cols-1"}`}>
          {data.visible_sections.matching && (
          <>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Pencarian tutor terbaru</h2>
                <p className="mt-1 text-sm text-slate-500">Status nyata dari mesin pencocokan tutor.</p>
              </div>
              <Link to="/admin/tutor-searches" className="text-xs font-black text-orange-600 hover:text-orange-700">
                Lihat semua
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {data.matching_preview.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 p-5 text-center">
                  <CheckCircle2 className="mx-auto text-emerald-600" size={30} />
                  <p className="mt-2 text-sm font-black text-emerald-800">Tidak ada pencarian tutor aktif.</p>
                </div>
              ) : (
                data.matching_preview.map((item) => (
                  <Link
                    key={item.id}
                    to={`/admin/tutor-searches?open=${item.id}`}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-orange-200 hover:bg-orange-50/30 sm:flex-row sm:items-center"
                  >
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                        item.needs_attention ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      {item.needs_attention ? <AlertTriangle size={20} /> : <Clock3 size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-900">{item.subject_name}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                            item.needs_attention
                              ? "bg-rose-100 text-rose-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {item.status_label}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {item.student_name} · radius {item.search_radius_km} km
                        {item.teacher_name ? ` · ${item.teacher_name}` : ""}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-400">{formatDateTime(item.scheduled_at)}</p>
                    </div>
                    <ArrowRight className="hidden shrink-0 text-slate-400 sm:block" size={18} />
                  </Link>
                ))
              )}
            </div>
          </div>
          </>
          )}

          {hasFinanceSummary && (
          <div className="space-y-4">
            {data.visible_sections.payments && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <BadgeDollarSign size={22} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Dana masuk hari ini</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{formatRupiah(data.revenue.today)}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <RevenueMetric label="Bulan ini" value={data.revenue.month} />
                <RevenueMetric label="Tahun ini" value={data.revenue.year} />
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Nilai ini adalah pembayaran terverifikasi, bukan laba bersih. Rincian komisi dan pencairan tetap berada di menu Pencairan Tutor.
              </p>
            </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                  <CalendarClock size={22} />
                </div>
                <div>
                  <p className="font-black text-slate-950">Ringkasan transaksi</p>
                  <p className="text-xs text-slate-500">Pemisahan antrean uang masuk dan uang keluar.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {data.visible_sections.payments && <SmallRow label="Pembayaran menunggu" value={data.counts.orders} />}
                {data.visible_sections.refunds && <SmallRow label="Refund menunggu" value={data.counts.refunds} />}
                {data.visible_sections.payouts && <SmallRow label="Pencairan menunggu" value={data.counts.payouts} />}
              </div>
            </div>
          </div>
          )}
        </section>
        )}
      </div>
    </AdminLayout>
  );
}

function HeroMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof SearchCheck }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <Icon size={19} className="text-orange-300" />
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-300">{label}</p>
    </div>
  );
}

function RevenueMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-800" title={formatRupiah(value)}>
        {formatRupiah(value)}
      </p>
    </div>
  );
}

function SmallRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-900 shadow-sm">{value}</span>
    </div>
  );
}
