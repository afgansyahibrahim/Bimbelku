import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileWarning,
  Loader2,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import ProtectedImage from "@/components/ProtectedImage";
import { ResponsiveSelect } from "@/components/ResponsiveSelect";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import http, { getApiError } from "@/lib/http";

type Payment = {
  id: number;
  order_id: string;
  student?: { id: number; name: string; email: string } | null;
  title: string;
  amount: number;
  status: string;
  payment_proof?: string | null;
  bank_name?: string | null;
  sender_name?: string | null;
  sender_account_number?: string | null;
  payment_rejection_reason?: string | null;
  payment_submitted_at?: string | null;
  verified_at?: string | null;
  verifier?: { id: number; name: string } | null;
  refund?: { status: string; amount: number; destination_method?: string | null } | null;
  updated_at?: string;
};

type ResponseData = {
  summary: {
    pending_count: number;
    pending_amount: number;
    accepted_30_days: number;
    rejected_30_days: number;
    refund_pending_count: number;
  };
  pending: Payment[];
  history: Payment[];
};

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(value || 0);

const dateTime = (value?: string | null) => value
  ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
  : "-";

const statusMap: Record<string, { label: string; className: string }> = {
  paid: { label: "Diterima", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Ditolak", className: "bg-rose-50 text-rose-700" },
  refund_pending: { label: "Menunggu refund", className: "bg-amber-50 text-amber-700" },
  refunded: { label: "Sudah direfund", className: "bg-indigo-50 text-indigo-700" },
  cancelled: { label: "Dibatalkan", className: "bg-slate-100 text-slate-600" },
};

export default function PaymentVerification() {
  const confirm = useConfirmDialog();
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [proof, setProof] = useState<Payment | null>(null);
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await http.get<ResponseData>("/admin/finance/payments");
      setData(response.data);
    } catch (error) {
      toast.error(getApiError(error, "Data pembayaran tidak dapat dimuat."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => {
    const source = tab === "pending" ? data?.pending || [] : data?.history || [];
    const needle = search.trim().toLowerCase();
    return source.filter((item) => {
      const matchesSearch = !needle || [item.order_id, item.student?.name, item.student?.email, item.title, item.sender_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
      const matchesStatus = tab === "pending" || status === "all" || item.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [data, search, status, tab]);

  const verify = async (payment: Payment, nextStatus: "paid" | "rejected", reason?: string) => {
    setProcessingId(payment.id);
    try {
      const response = await http.post("/admin/verify-payment", {
        order_id: payment.id,
        status: nextStatus,
        reason: nextStatus === "rejected" ? reason : null,
      });
      toast.success(response.data?.message || "Pembayaran berhasil diproses.");
      setProof(null);
      setRejecting(null);
      setRejectReason("");
      await load();
    } catch (error) {
      toast.error(getApiError(error, "Pembayaran tidak dapat diproses."));
    } finally {
      setProcessingId(null);
    }
  };

  const accept = async (payment: Payment) => {
    const approved = await confirm({
      title: "Terima pembayaran murid?",
      description: `Cocokkan ${rupiah(payment.amount)}, nama pengirim, dan rekening asal dengan mutasi rekening admin. Keputusan ini akan membuka alur pesanan berikutnya.`,
      confirmText: "Terima pembayaran",
      tone: "warning",
    });
    if (approved) await verify(payment, "paid");
  };

  const reject = async () => {
    if (!rejecting || rejectReason.trim().length < 10) {
      toast.error("Alasan penolakan minimal 10 karakter.");
      return;
    }
    const approved = await confirm({
      title: "Tolak bukti pembayaran?",
      description: "Murid akan menerima alasan ini dan dapat mengunggah ulang bukti sebelum tenggat.",
      confirmText: "Tolak bukti",
      tone: "danger",
    });
    if (approved) await verify(rejecting, "rejected", rejectReason.trim());
  };

  return (
    <AdminLayout title="Pembayaran murid" subtitle="Uang masuk murid; refund dan pencairan tutor dipisahkan pada menu masing-masing">
      <div className="space-y-6 pb-16">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={Clock3} label="Menunggu pemeriksaan" value={String(data?.summary.pending_count || 0)} detail={rupiah(data?.summary.pending_amount || 0)} tone="amber" />
          <SummaryCard icon={CheckCircle2} label="Diterima 30 hari" value={rupiah(data?.summary.accepted_30_days || 0)} detail="Dana masuk yang sudah diverifikasi" tone="emerald" />
          <SummaryCard icon={XCircle} label="Ditolak 30 hari" value={String(data?.summary.rejected_30_days || 0)} detail="Bukti perlu diperbaiki murid" tone="rose" />
          <SummaryCard icon={FileWarning} label="Masuk antrean refund" value={String(data?.summary.refund_pending_count || 0)} detail="Diproses pada menu Refund & saldo" tone="indigo" />
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => setTab("pending")} className={`min-h-10 rounded-lg px-4 text-sm font-black ${tab === "pending" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Perlu diperiksa ({data?.pending.length || 0})</button>
              <button type="button" onClick={() => setTab("history")} className={`min-h-10 rounded-lg px-4 text-sm font-black ${tab === "history" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Riwayat</button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari invoice atau murid" className="h-11 rounded-xl pl-9" />
              </label>
              {tab === "history" && (
                <ResponsiveSelect
                  value={status}
                  ariaLabel="Filter status pembayaran"
                  className="h-11 min-w-44 rounded-xl border-slate-200 bg-white text-sm text-slate-600"
                  options={[
                    { value: "all", label: "Semua status" },
                    { value: "paid", label: "Diterima" },
                    { value: "rejected", label: "Ditolak" },
                    { value: "refund_pending", label: "Menunggu refund" },
                    { value: "refunded", label: "Sudah direfund" },
                  ]}
                  onValueChange={setStatus}
                />
              )}
              <Button type="button" variant="outline" onClick={() => void load()} disabled={loading} className="h-11 rounded-xl"><RefreshCw size={16} className={loading ? "mr-2 animate-spin" : "mr-2"} />Muat ulang</Button>
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-72 place-items-center"><Loader2 className="animate-spin text-indigo-600" /></div>
          ) : rows.length === 0 ? (
            <div className="grid min-h-72 place-items-center p-8 text-center"><div><CheckCircle2 className="mx-auto text-emerald-500" size={40} /><p className="mt-3 font-black text-slate-800">Tidak ada data pada tampilan ini.</p><p className="mt-1 text-sm text-slate-500">Ubah filter atau muat ulang halaman.</p></div></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((payment) => (
                <article key={payment.id} className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1.2fr_.9fr_.8fr_auto] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-950">{payment.student?.name || "Murid"}</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{payment.order_id}</span></div>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-600">{payment.title}</p>
                    <p className="mt-1 text-xs text-slate-400">Dikirim {dateTime(payment.payment_submitted_at || payment.updated_at)}</p>
                  </div>
                  <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Pengirim</p><p className="mt-1 text-sm font-bold text-slate-700">{payment.sender_name || "Belum tercatat"}</p><p className="mt-1 text-xs text-slate-500">{payment.bank_name || "-"} · {payment.sender_account_number || "-"}</p></div>
                  <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Nominal</p><p className="mt-1 text-lg font-black text-emerald-700">{rupiah(payment.amount)}</p>{tab === "history" && <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${statusMap[payment.status]?.className || "bg-slate-100 text-slate-600"}`}>{statusMap[payment.status]?.label || payment.status}</span>}</div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {payment.payment_proof && <Button type="button" variant="outline" onClick={() => setProof(payment)} className="h-10 rounded-xl"><Eye size={15} className="mr-2" />Bukti</Button>}
                    {tab === "pending" ? <><Button type="button" variant="outline" onClick={() => { setRejecting(payment); setRejectReason(""); }} className="h-10 rounded-xl border-rose-200 text-rose-700">Tolak</Button><Button type="button" onClick={() => void accept(payment)} disabled={processingId === payment.id} className="h-10 rounded-xl bg-slate-950">{processingId === payment.id && <Loader2 size={15} className="mr-2 animate-spin" />}Terima</Button></> : <div className="max-w-xs text-right text-xs leading-5 text-slate-500">{payment.verifier?.name ? `Diproses ${payment.verifier.name} · ${dateTime(payment.verified_at || payment.updated_at)}` : dateTime(payment.updated_at)}{payment.payment_rejection_reason && <p className="mt-1 text-rose-600">{payment.payment_rejection_reason}</p>}</div>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {proof && <ProofModal payment={proof} onClose={() => setProof(null)} onAccept={() => void accept(proof)} onReject={() => { setRejecting(proof); setRejectReason(""); setProof(null); }} pending={tab === "pending"} />}
      {rejecting && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="text-lg font-black text-slate-950">Tolak bukti pembayaran</p><p className="mt-1 text-sm text-slate-500">Tuliskan alasan yang dapat dipahami murid.</p></div><button type="button" aria-label="Tutup" onClick={() => setRejecting(null)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100"><X size={18} /></button></div>
            <textarea autoFocus value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} maxLength={500} className="mt-5 min-h-32 w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="Contoh: nominal pada bukti tidak sesuai dengan tagihan..." />
            <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setRejecting(null)} className="rounded-xl">Batal</Button><Button onClick={() => void reject()} disabled={processingId === rejecting.id} className="rounded-xl bg-rose-600 hover:bg-rose-700">Tolak bukti</Button></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, detail, tone }: { icon: typeof CreditCard; label: string; value: string; detail: string; tone: "amber" | "emerald" | "rose" | "indigo" }) {
  const styles = { amber: "bg-amber-50 text-amber-700", emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", indigo: "bg-indigo-50 text-indigo-700" }[tone];
  return <article className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${styles}`}><Icon size={20} /></span><p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></article>;
}

function ProofModal({ payment, onClose, onAccept, onReject, pending }: { payment: Payment; onClose: () => void; onAccept: () => void; onReject: () => void; pending: boolean }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 p-4 backdrop-blur"><div><p className="font-black text-slate-950">Bukti transfer {payment.order_id}</p><p className="text-xs text-slate-500">{payment.student?.name} · {rupiah(payment.amount)}</p></div><button type="button" aria-label="Tutup" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100"><X size={18} /></button></div><div className="p-4 sm:p-6"><div className="rounded-2xl bg-slate-100 p-2"><ProtectedImage source={payment.payment_proof || ""} alt={`Bukti pembayaran ${payment.order_id}`} className="mx-auto max-h-[60dvh] w-full rounded-xl object-contain" /></div>{pending && <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={onReject} className="h-11 rounded-xl border-rose-200 text-rose-700">Tolak</Button><Button onClick={onAccept} className="h-11 rounded-xl bg-slate-950">Terima pembayaran</Button></div>}</div></div></div>;
}
