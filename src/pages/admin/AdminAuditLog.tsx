import { notify } from "@/lib/notify";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { ResponsiveSelect } from "@/components/ResponsiveSelect";
import http, { getApiError } from "@/lib/http";

type PermissionDefinition = { code: string; label: string; description: string };
type PermissionGroup = { key: string; label: string; permissions: PermissionDefinition[] };

type AuditItem = {
  id: number;
  request_id: string;
  actor: { id?: number | null; name: string; email?: string | null };
  action: string;
  category: string;
  permission_code?: string | null;
  route_name: string;
  method: string;
  response_status: number;
  target_type?: string | null;
  target_id?: number | null;
  reason?: string | null;
  request_payload?: Record<string, unknown> | null;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  entry_hash: string;
  previous_hash?: string | null;
  created_at: string;
};

type AuditResponse = {
  data: AuditItem[];
  pagination: { current_page: number; last_page: number; per_page: number; total: number };
  chain: { valid: boolean; checked: number };
  filters: {
    permission_groups: PermissionGroup[];
    actors: Array<{ id: number; name: string; email: string }>;
  };
};

type FilterState = {
  search: string;
  actor_id: string;
  category: string;
  permission: string;
  status: string;
  date_from: string;
  date_to: string;
};

const defaultFilters: FilterState = {
  search: "",
  actor_id: "",
  category: "",
  permission: "",
  status: "",
  date_from: "",
  date_to: "",
};

const dateTime = (value: string) => new Date(value).toLocaleString("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function AdminAuditLog() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [applied, setApplied] = useState<FilterState>(defaultFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get<AuditResponse>("/admin/audit-log", {
        params: {
          ...Object.fromEntries(Object.entries(applied).filter(([, value]) => value)),
          page,
        },
      });
      setData(response.data);
    } catch (error) {
      notify.error(getApiError(error, "Audit perubahan tidak dapat dimuat."));
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const permissions = useMemo(
    () => data?.filters.permission_groups.flatMap((group) => group.permissions) || [],
    [data],
  );

  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setApplied(filters);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setApplied(defaultFilters);
    setPage(1);
  };

  return (
    <AdminLayout
      title="Audit Perubahan Admin"
      subtitle="Riwayat permanen tindakan admin, data sebelum-sesudah, alasan, dan status respons."
    >
      <div className="space-y-5">
        <section className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${data?.chain.valid === false ? "border-rose-300 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${data?.chain.valid === false ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                {data?.chain.valid === false ? <ShieldAlert size={25} /> : <ShieldCheck size={25} />}
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-950">
                  {data?.chain.valid === false ? "Integritas audit bermasalah" : "Rantai integritas audit valid"}
                </h1>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {data?.chain.valid === false
                    ? "Hash audit tidak tersambung. Jangan menghapus atau mengubah catatan secara manual dan segera periksa database."
                    : `${data?.chain.checked || 0} catatan diperiksa berurutan. Setiap entri terhubung dengan hash entri sebelumnya.`}
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center shadow-sm">
              <p className="text-2xl font-black text-slate-950">{data?.pagination.total || 0}</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total catatan</p>
            </div>
          </div>
        </section>

        <form onSubmit={submitFilters} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative md:col-span-2">
              <span className="sr-only">Cari audit</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={filters.search}
                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                placeholder="Cari aksi, admin, target, atau alasan"
                className="form-input pl-11"
              />
            </label>
            <ResponsiveSelect
              value={filters.actor_id}
              ariaLabel="Filter admin"
              className="form-input"
              options={[
                { value: "", label: "Semua admin" },
                ...(data?.filters.actors || []).map((actor) => ({ value: actor.id, label: actor.name })),
              ]}
              onValueChange={(next) => setFilters({ ...filters, actor_id: next })}
            />
            <ResponsiveSelect
              value={filters.status}
              ariaLabel="Filter hasil tindakan"
              className="form-input"
              options={[
                { value: "", label: "Semua hasil" },
                { value: "success", label: "Berhasil" },
                { value: "failed", label: "Gagal / ditolak" },
              ]}
              onValueChange={(next) => setFilters({ ...filters, status: next })}
            />
            <ResponsiveSelect
              value={filters.category}
              ariaLabel="Filter kategori audit"
              className="form-input"
              options={[
                { value: "", label: "Semua kategori" },
                ...["operations", "matching", "finance", "teachers", "cases", "users", "classes", "content", "support", "settings", "admins", "audit"].map((category) => ({ value: category, label: category })),
              ]}
              onValueChange={(next) => setFilters({ ...filters, category: next })}
            />
            <ResponsiveSelect
              value={filters.permission}
              ariaLabel="Filter kewenangan"
              className="form-input"
              options={[
                { value: "", label: "Semua kewenangan" },
                ...permissions.map((permission) => ({ value: permission.code, label: permission.label })),
              ]}
              onValueChange={(next) => setFilters({ ...filters, permission: next })}
            />
            <input type="date" aria-label="Tanggal mulai" value={filters.date_from} onChange={(event) => setFilters({ ...filters, date_from: event.target.value })} className="form-input" />
            <input type="date" aria-label="Tanggal akhir" value={filters.date_to} onChange={(event) => setFilters({ ...filters, date_to: event.target.value })} className="form-input" />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetFilters} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50">Reset</button>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white">
              <Search size={16} /> Terapkan filter
            </button>
            <button type="button" onClick={() => void load()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50">
              <RefreshCw size={16} /> Muat ulang
            </button>
          </div>
        </form>

        {loading ? (
          <div className="grid min-h-72 place-items-center rounded-3xl border border-slate-200 bg-white">
            <Loader2 className="animate-spin text-orange-500" size={34} />
          </div>
        ) : !data?.data.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Fingerprint className="mx-auto text-slate-300" size={40} />
            <p className="mt-3 text-sm font-black text-slate-600">Belum ada catatan yang sesuai filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.data.map((item) => {
              const success = item.response_status >= 200 && item.response_status < 400;
              const isOpen = expanded === item.id;
              return (
                <article key={item.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                    className="flex w-full items-start gap-3 p-4 text-left sm:p-5"
                  >
                    <div className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${success ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {success ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase text-white">{item.method}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${success ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{item.response_status}</span>
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black text-orange-700">{item.category}</span>
                      </div>
                      <p className="mt-2 break-all text-sm font-black text-slate-950">{friendlyAction(item.action)}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {item.actor.name} · {dateTime(item.created_at)}
                        {item.target_type ? ` · ${item.target_type} #${item.target_id ?? "-"}` : ""}
                      </p>
                      {item.reason && <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-700">Alasan: {item.reason}</p>}
                    </div>
                    <ChevronDown className={`mt-2 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} size={19} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
                      <div className="grid gap-4 xl:grid-cols-3">
                        <AuditBlock title="Data sebelum" value={item.before_state} empty="Tidak ada snapshot sebelum perubahan." />
                        <AuditBlock title="Data sesudah" value={item.after_state} empty="Tidak ada snapshot sesudah perubahan." />
                        <AuditBlock title="Payload permintaan" value={item.request_payload} empty="Tidak ada payload tersimpan." />
                      </div>
                      <div className="mt-4 grid gap-3 xl:grid-cols-3">
                        <AuditBlock title="Metadata teknis" value={item.metadata} empty="Tidak ada metadata tambahan." />
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">Jejak permintaan</h3>
                          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                            <Detail label="Kewenangan" value={item.permission_code || "Tidak terpetakan"} />
                            <Detail label="Rute" value={item.route_name} mono />
                            <Detail label="IP" value={item.ip_address || "Tidak tersedia"} />
                            <Detail label="Perangkat" value={item.user_agent || "Tidak tersedia"} />
                            <Detail label="Email pelaku" value={item.actor.email || "Tidak tersedia"} />
                            <Detail label="Request ID" value={item.request_id} mono />
                          </dl>
                        </section>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <HashRow label="Hash entri" value={item.entry_hash} />
                        <HashRow label="Hash sebelumnya" value={item.previous_hash || "Awal rantai"} />
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {data && data.pagination.last_page > 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
            <button disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:opacity-40">
              <ChevronLeft size={17} /> Sebelumnya
            </button>
            <p className="text-xs font-black text-slate-500">Halaman {data.pagination.current_page} dari {data.pagination.last_page}</p>
            <button disabled={page >= data.pagination.last_page || loading} onClick={() => setPage((current) => current + 1)} className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:opacity-40">
              Berikutnya <ChevronRight size={17} />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function AuditBlock({ title, value, empty }: { title: string; value?: Record<string, unknown> | null; empty: string }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">{title}</h3>
      {value && Object.keys(value).length > 0 ? (
        <pre className="custom-scrollbar mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3 text-[11px] leading-5 text-slate-200">{JSON.stringify(value, null, 2)}</pre>
      ) : (
        <p className="mt-3 text-xs leading-5 text-slate-400">{empty}</p>
      )}
    </section>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className={`mt-1 break-words text-slate-700 ${mono ? "font-mono text-[10px]" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 truncate font-mono text-[10px] text-slate-600" title={value}>{value}</p>
    </div>
  );
}

function friendlyAction(action: string) {
  return action.replace(/^([A-Z]+):api\/admin\//, "$1 /admin/");
}
