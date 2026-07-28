import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Receipt,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import StudentLayout from "@/components/StudentLayout";
import ProtectedImage from "@/components/ProtectedImage";
import { Button } from "@/components/ui/button";
import http, { getApiError } from "@/lib/http";

interface OrderItem {
  id: number;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
  verified_at?: string;
  subject: string;
  tutor_name: string;
  type: string;
  schedule?: string;
  payment_proof_url?: string;
  payment_rejection_reason?: string;
  refund?: { status: string; amount: number; reason: string; proof_url?: string; processed_at?: string };
}

const statusInfo: Record<string, { label: string; className: string; icon: typeof Clock3 }> = {
  pending: { label: "Belum dibayar", className: "bg-orange-50 text-orange-700", icon: Clock3 },
  submitted: { label: "Diperiksa admin", className: "bg-sky-50 text-sky-700", icon: RefreshCw },
  paid: { label: "Diterima", className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Bukti ditolak", className: "bg-rose-50 text-rose-700", icon: XCircle },
  cancelled: { label: "Dibatalkan", className: "bg-slate-100 text-slate-600", icon: XCircle },
  expired: { label: "Kedaluwarsa", className: "bg-slate-100 text-slate-600", icon: Clock3 },
  refund_pending: { label: "Refund diproses", className: "bg-amber-50 text-amber-700", icon: RotateCcw },
  refunded: { label: "Refund selesai", className: "bg-violet-50 text-violet-700", icon: CheckCircle2 },
};

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

export default function TransactionHistory() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [proof, setProof] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const response = await http.get("/orders");
      setOrders(response.data.data || []);
    } catch (error) {
      toast.error(getApiError(error, "Riwayat transaksi gagal dimuat."));
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () => filter === "all" ? orders : orders.filter((order) => filter === "refund" ? order.status.includes("refund") : order.status === filter),
    [filter, orders],
  );

  return (
    <StudentLayout title="Riwayat Transaksi">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <section className="flex flex-col justify-between gap-5 rounded-[2rem] bg-gradient-to-br from-slate-950 to-indigo-950 p-7 text-white md:flex-row md:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Keuangan murid</p><h1 className="mt-3 text-3xl font-black">Tagihan, transfer, dan refund</h1><p className="mt-2 text-sm text-indigo-100/70">Semua nominal dan status keputusan admin tercatat di sini.</p></div><Button onClick={load} variant="outline" className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RefreshCw size={16} className="mr-2" />Muat ulang</Button>
        </section>
        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-2">
          {[["all", "Semua"], ["pending", "Belum dibayar"], ["submitted", "Diperiksa"], ["paid", "Diterima"], ["rejected", "Ditolak"], ["refund", "Refund"]].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black ${filter === value ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>{label}</button>)}
        </div>
        {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-indigo-600" /></div> : filtered.length === 0 ? <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white py-20 text-center"><Receipt className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-black text-slate-700">Belum ada transaksi</p></div> : <div className="space-y-4">
          {filtered.map((order) => {
            const status = statusInfo[order.status] || statusInfo.pending;
            const Icon = status.icon;
            return <article key={order.id} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div className="flex min-w-0 gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Receipt /></div><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{order.order_id}</p><h2 className="mt-1 truncate text-lg font-black text-slate-900">{order.subject}</h2><p className="mt-1 text-sm text-slate-500">{order.tutor_name} · {order.type}</p></div></div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end"><div><p className="text-right text-xl font-black text-slate-900">{rupiah(order.amount)}</p><p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-400"><CalendarDays size={12} />{new Date(order.created_at).toLocaleDateString("id-ID")}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${status.className}`}><Icon size={14} />{status.label}</span></div>
              </div>
              {order.payment_rejection_reason && <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs leading-5 text-rose-700">Alasan admin: {order.payment_rejection_reason}</div>}
              {order.refund && <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm text-violet-800"><p className="font-black">Refund {order.refund.status} · {rupiah(order.refund.amount)}</p><p className="mt-1 text-xs">{order.refund.reason}</p></div>}
              <div className="mt-4 flex flex-wrap gap-2">
                {order.payment_proof_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setProof(order.payment_proof_url!)}
                  >
                    <CreditCard size={15} className="mr-2" />Bukti pembayaran
                  </Button>
                )}
                {order.refund?.proof_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setProof(order.refund!.proof_url!)}
                  >
                    <RotateCcw size={15} className="mr-2" />Bukti refund
                  </Button>
                )}
              </div>
            </article>;
          })}
        </div>}
      </div>
      {proof && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm" onClick={() => setProof(null)}><div className="max-w-xl rounded-[2rem] bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}><ProtectedImage source={proof} alt="Bukti transaksi" className="max-h-[78vh] w-full rounded-2xl object-contain" /><Button variant="ghost" className="mt-2 w-full rounded-xl" onClick={() => setProof(null)}>Tutup</Button></div></div>}
    </StudentLayout>
  );
}
