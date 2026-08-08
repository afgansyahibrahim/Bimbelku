import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Receipt,
  RefreshCw,
  RotateCcw,
  WalletCards,
  WifiOff,
  XCircle,
} from "lucide-react";
import axios from "axios";
import StudentLayout from "@/components/StudentLayout";
import ProtectedImage from "@/components/ProtectedImage";
import { Button } from "@/components/ui/button";
import http, { getApiError } from "@/lib/http";

type ErrorType = "network" | "unauthorized" | "forbidden" | "not_found" | "generic" | null;

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
  payment_due_at?: string;
  duration_hours?: number;
  total_learning_hours?: number;
  refund?: { status: string; amount: number; reason: string; proof_url?: string; processed_at?: string; destination_method?: string | null };
}


interface WalletData {
  balance: number;
  currency: string;
  transactions: Array<{
    id: number;
    amount: number;
    balance_after: number;
    description: string;
    created_at: string;
  }>;
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
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, currency: "IDR", transactions: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [proof, setProof] = useState<string | null>(null);
  const [error, setError] = useState<ErrorType>(null);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersResponse, walletResponse] = await Promise.all([
        http.get("/orders"),
        http.get("/student/wallet"),
      ]);
      setOrders(ordersResponse.data.data || []);
      setWallet(walletResponse.data || { balance: 0, currency: "IDR", transactions: [] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) setError("network");
        else if (err.response.status === 401) setError("unauthorized");
        else if (err.response.status === 403) setError("forbidden");
        else if (err.response.status === 404) setError("not_found");
        else setError("generic");
      } else {
        setError("generic");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => { setError(null); void load(); };

  const filtered = useMemo(
    () => filter === "all" ? orders : orders.filter((order) => filter === "refund" ? order.status.includes("refund") : order.status === filter),
    [filter, orders],
  );

  return (
    <StudentLayout title="Riwayat Transaksi">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <section className="grid gap-4 rounded-[1.75rem] bg-gradient-to-br from-slate-950 to-indigo-950 p-5 text-white sm:rounded-[2rem] sm:p-7 lg:grid-cols-[1fr_20rem] lg:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Keuangan murid</p><h1 className="mt-3 text-2xl font-black sm:text-3xl">Tagihan, transfer, refund, dan saldo</h1><p className="mt-2 text-sm text-indigo-100/70">Semua nominal dan status keputusan admin tercatat di sini.</p><Button onClick={load} variant="outline" className="mt-5 w-full rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto"><RefreshCw size={16} className="mr-2" />Muat ulang</Button></div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-indigo-200"><WalletCards size={20} /></span><div><p className="text-xs font-black uppercase tracking-wide text-indigo-200">Saldo BimbelKu</p><p className="mt-1 text-2xl font-black">{rupiah(wallet.balance)}</p></div></div><p className="mt-3 text-xs leading-5 text-indigo-100/70">Saldo hanya berubah melalui mutasi sistem. Refund ke saldo akan muncul pada riwayat di bawah.</p></div>
        </section>
        {wallet.transactions.length > 0 && (
          <section className="overflow-hidden rounded-[1.5rem] border border-indigo-100 bg-white">
            <div className="border-b border-indigo-100 bg-indigo-50/70 px-4 py-3 sm:px-5">
              <p className="text-sm font-black text-indigo-950">Riwayat mutasi Saldo BimbelKu</p>
              <p className="mt-1 text-xs text-indigo-700">Setiap perubahan saldo dibuat oleh sistem dan tidak dapat diedit.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {wallet.transactions.slice(0, 20).map((transaction) => (
                <div key={transaction.id} className="flex flex-col justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                  <div>
                    <p className="text-sm font-black text-slate-800">{transaction.description}</p>
                    <p className="mt-1 text-xs text-slate-400">{new Date(transaction.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-black text-indigo-700">+{rupiah(transaction.amount)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Saldo setelah transaksi {rupiah(transaction.balance_after)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-2">
          {[["all", "Semua"], ["pending", "Belum dibayar"], ["submitted", "Diperiksa"], ["paid", "Diterima"], ["rejected", "Ditolak"], ["refund", "Refund"]].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black ${filter === value ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>{label}</button>)}
        </div>
        {loading ? (
          <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-indigo-600" /></div>
        ) : error ? (
          <ErrorState type={error} onRetry={handleRetry} />
        ) : filtered.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white py-20 text-center"><Receipt className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-black text-slate-700">Belum ada transaksi</p></div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const status = statusInfo[order.status] || statusInfo.pending;
              const Icon = status.icon;
              return <article key={order.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-5">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                  <div className="flex min-w-0 gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Receipt /></div><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{order.order_id}</p><h2 className="mt-1 truncate text-lg font-black text-slate-900">{order.subject}</h2><p className="mt-1 text-sm text-slate-500">{order.tutor_name} · {order.type}</p></div></div>
                  <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end"><div><p className="text-left text-xl font-black text-slate-900 md:text-right">{rupiah(order.amount)}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 md:justify-end"><CalendarDays size={12} />{new Date(order.created_at).toLocaleDateString("id-ID")}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${status.className}`}><Icon size={14} />{status.label}</span></div>
                </div>
                {order.payment_rejection_reason && <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs leading-5 text-rose-700">Alasan admin: {order.payment_rejection_reason}</div>}
                {order.refund && <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm text-violet-800"><p className="font-black">Refund {order.refund.status} · {rupiah(order.refund.amount)}</p><p className="mt-1 text-xs">{order.refund.reason}</p>{order.refund.status === "paid" && <p className="mt-2 text-xs font-black">Tujuan: {order.refund.destination_method === "bimbelku_balance" ? "Saldo BimbelKu" : "Rekening/e-wallet asal"}</p>}</div>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {["pending", "rejected"].includes(order.status) && (
                    <Button
                      size="sm"
                      className="min-h-11 flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 sm:flex-none"
                      onClick={() => navigate("/payment", { state: {
                        orderId: order.id,
                        invoiceId: order.order_id,
                        tutorName: order.tutor_name,
                        subject: order.subject,
                        type: order.type,
                        price: Number(order.amount),
                        date: order.schedule,
                        paymentDueAt: order.payment_due_at,
                        rejectionReason: order.payment_rejection_reason,
                        durationHours: Number(order.duration_hours || 1),
                        totalLearningHours: Number(order.total_learning_hours || 0),
                      } })}
                    >
                      <CreditCard size={15} className="mr-2" />{order.status === "rejected" ? "Unggah ulang bukti" : "Bayar sekarang"}
                    </Button>
                  )}
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
          </div>
        )}
      </div>
      {proof && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm" onClick={() => setProof(null)}><div role="dialog" aria-modal="true" aria-label="Detail transaksi" className="max-w-xl rounded-[2rem] bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}><ProtectedImage source={proof} alt="Bukti transaksi" className="max-h-[78dvh] w-full rounded-2xl object-contain" /><Button variant="ghost" className="mt-2 w-full rounded-xl" onClick={() => setProof(null)}>Tutup</Button></div></div>}
    </StudentLayout>
  );
}

function ErrorState({ type, onRetry }: { type: ErrorType; onRetry: () => void }) {
  const config = {
    network: { icon: WifiOff, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200", title: "Tidak ada koneksi", desc: "Periksa koneksi internet kamu, lalu coba lagi." },
    unauthorized: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", title: "Sesi berakhir", desc: "Silakan masuk kembali ke akun kamu." },
    forbidden: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", title: "Akses ditolak", desc: "Kamu tidak memiliki izin untuk halaman ini." },
    not_found: { icon: AlertCircle, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200", title: "Tidak ditemukan", desc: "Data yang kamu cari tidak tersedia." },
    generic: { icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", title: "Terjadi kesalahan", desc: "Gagal memuat data. Silakan coba lagi." },
  };
  if (!type) return null;
  const { icon: Icon, color, bg, border, title, desc } = config[type];
  return (
    <div className={`flex flex-col items-center justify-center gap-4 rounded-3xl border-2 ${border} ${bg} px-6 py-16 text-center`}>
      <Icon size={40} className={color} />
      <div>
        <p className={`text-lg font-black ${color}`}>{title}</p>
        <p className="mt-1 text-sm text-slate-500">{desc}</p>
      </div>
      <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition">
        <RefreshCw size={15} /> Coba lagi
      </button>
    </div>
  );
}
