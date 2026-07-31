import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  FileImage,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import StudentLayout from "@/components/StudentLayout";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import http, { getApiError } from "@/lib/http";
import { validateUpload } from "@/lib/validation";

interface PaymentSettings {
  merchant_name: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  qris_url?: string;
}

interface OrderData {
  orderId: number;
  invoiceId?: string;
  tutorName: string;
  subject: string;
  type: string;
  price: number;
  subtotalAmount?: number;
  discountAmount?: number;
  packageName?: string;
  date?: string;
  paymentDueAt?: string;
  rejectionReason?: string;
}

type State = "loading" | "pending" | "submitted" | "paid" | "expired" | "cancelled" | "refund_pending" | "refunded";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirmDialog();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [state, setState] = useState<State>("loading");
  const [reason, setReason] = useState("");
  const [senderName, setSenderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [senderAccountNumber, setSenderAccountNumber] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

  const checkStatus = useCallback(async (orderId: number, notify = true) => {
    try {
      const response = await http.get(`/student/orders/${orderId}/status`);
      const status = response.data.status as string;
      setReason(response.data.rejection_reason || "");
      if (status === "paid") {
        setState("paid");
        sessionStorage.removeItem("bimbelku_payment_order");
      } else if (status === "submitted") {
        setState("submitted");
      } else if (status === "rejected" || status === "pending") {
        setState("pending");
      } else if (status === "cancelled") {
        setState("cancelled");
      } else if (status === "refund_pending") {
        setState("refund_pending");
        sessionStorage.removeItem("bimbelku_payment_order");
      } else if (status === "refunded") {
        setState("refunded");
        sessionStorage.removeItem("bimbelku_payment_order");
      } else if (status === "expired") {
        setState("expired");
      }
      if (notify) toast.success("Status pembayaran diperbarui.");
    } catch (error) {
      if (notify) toast.error(getApiError(error));
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      const settingsPromise = http.get<PaymentSettings>("/payment-settings");
      let resolved = location.state as OrderData | null;
      if (!resolved?.orderId) {
        const stored = sessionStorage.getItem("bimbelku_payment_order");
        resolved = stored ? JSON.parse(stored) as OrderData : null;
      }
      if (!resolved?.orderId) {
        const response = await http.get("/active-order");
        if (response.data?.order_id) {
          resolved = {
            orderId: response.data.order_id,
            invoiceId: response.data.order_number,
            tutorName: response.data.tutor_name,
            subject: response.data.subject,
            type: response.data.type,
            price: Number(response.data.amount),
            subtotalAmount: Number(response.data.subtotal_amount || response.data.amount),
            discountAmount: Number(response.data.discount_amount || 0),
            packageName: response.data.package_name || undefined,
            date: response.data.scheduled_at,
            paymentDueAt: response.data.payment_due_at,
            rejectionReason: response.data.rejection_reason,
          };
        }
      }
      setSettings((await settingsPromise).data);
      if (!resolved?.orderId) {
        setState("expired");
        return;
      }
      setOrder(resolved);
      sessionStorage.setItem("bimbelku_payment_order", JSON.stringify(resolved));
      await checkStatus(resolved.orderId, false);
    } catch (error) {
      toast.error(getApiError(error, "Tagihan gagal dimuat."));
      setState("expired");
    }
  }, [checkStatus, location.state]);

  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (state !== "submitted" || !order) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkStatus(order.orderId, false);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [checkStatus, state, order]);

  const secondsLeft = useMemo(() => {
    if (!order?.paymentDueAt) return 0;
    return Math.max(0, Math.floor((new Date(order.paymentDueAt).getTime() - now) / 1000));
  }, [order?.paymentDueAt, now]);
  const timeText = `${String(Math.floor(secondsLeft / 3600)).padStart(2, "0")}:${String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const paymentAccountReady = Boolean(
    settings?.bank_name?.trim()
      && settings?.account_number?.trim()
      && settings?.account_name?.trim(),
  );
  const paymentExpired = Boolean(order?.paymentDueAt && secondsLeft === 0);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} berhasil disalin.`);
    } catch {
      toast.error(`${label} tidak dapat disalin otomatis. Salin secara manual.`);
    }
  };

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!order || !proof) return;
    if (!/^[0-9 .+-]{6,80}$/.test(senderAccountNumber.trim())) {
      toast.error("Nomor rekening atau e-wallet asal belum valid.");
      return;
    }
    if (!paymentAccountReady) {
      toast.error("Rekening pembayaran belum dikonfigurasi admin.");
      return;
    }
    const payload = new FormData();
    payload.append("file", proof);
    payload.append("sender_name", senderName);
    payload.append("bank_name", bankName);
    payload.append("sender_account_number", senderAccountNumber);
    setSubmitting(true);
    try {
      const response = await http.post(`/orders/${order.orderId}/pay`, payload);
      toast.success(response.data.message);
      setState("submitted");
      setReason("");
    } catch (error) {
      toast.error(getApiError(error, "Bukti pembayaran gagal dikirim."));
    } finally {
      setSubmitting(false);
    }
  };

  const selectProof = (file?: File) => {
    const error = validateUpload(file, {
      label: "Bukti transfer",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "webp"],
    });
    if (error) {
      toast.error(error);
      setProof(null);
      return;
    }
    setProof(file || null);
  };

  const cancel = async () => {
    if (!order) return;
    const approved = await confirm({
      title: "Batalkan tagihan?",
      description: "Tutor dan slot jadwal akan dilepas. Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Ya, batalkan",
      tone: "danger",
    });
    if (!approved) return;
    try {
      const response = await http.post(`/orders/${order.orderId}/cancel`);
      toast.success(response.data.message);
      sessionStorage.removeItem("bimbelku_payment_order");
      navigate(order.packageName ? "/student/packages" : "/search", { replace: true });
    } catch (error) {
      toast.error(getApiError(error));
    }
  };

  if (state === "loading") {
    return <StudentLayout title="Pembayaran"><div className="grid min-h-[65vh] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" /><p className="mt-3 text-sm font-bold text-slate-500">Menyiapkan tagihan…</p></div></div></StudentLayout>;
  }

  if (state === "paid") {
    return <StudentLayout title="Pembayaran"><Result icon={CheckCircle2} color="emerald" title="Pembayaran diterima" text="Admin telah memverifikasi transfer. Sesi dan tutor kini terkunci pada jadwalmu." action="Buka Kelas Saya" onClick={() => navigate("/student/packages")} /></StudentLayout>;
  }

  if (state === "refund_pending" || state === "refunded") {
    return <StudentLayout title="Pembayaran"><Result icon={RefreshCw} color="amber" title={state === "refunded" ? "Refund telah ditransfer" : "Refund sedang diproses"} text={state === "refunded" ? "Admin telah menyelesaikan pengembalian dana. Bukti transfer dapat dilihat pada riwayat transaksi." : "Pembayaranmu tercatat dan masuk antrean refund manual. Pantau status serta bukti transfer pada riwayat transaksi."} action="Lihat riwayat transaksi" onClick={() => navigate("/student/history")} /></StudentLayout>;
  }

  if (state === "expired" || state === "cancelled" || !order || !settings) {
    return <StudentLayout title="Pembayaran"><Result icon={XCircle} color="rose" title={state === "cancelled" ? "Tagihan dibatalkan" : "Tagihan tidak tersedia"} text={state === "cancelled" ? "Pesanan dan slot tutor sudah dilepas." : "Batas pembayaran telah berakhir atau tidak ada tagihan aktif."} action="Pilih paket belajar" onClick={() => navigate("/student/packages/new")} /></StudentLayout>;
  }

  if (state === "submitted") {
    return (
      <StudentLayout title="Pembayaran">
        <div className="mx-auto grid min-h-[65vh] max-w-2xl place-items-center">
          <div className="w-full rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-center text-white shadow-2xl sm:rounded-[2.5rem] sm:p-8">
            <div className="relative mx-auto h-36 w-36"><div className="absolute inset-0 animate-ping rounded-full border border-indigo-300/30" /><div className="absolute inset-4 animate-spin rounded-full border-4 border-indigo-400/20 border-t-indigo-300" /><div className="absolute inset-0 grid place-items-center"><ShieldCheck size={42} className="text-indigo-200" /></div></div>
            <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-indigo-200">Pemeriksaan manual admin</p><h1 className="mt-3 text-3xl font-black">Bukti transfer sudah diterima</h1><p className="mx-auto mt-3 max-w-lg leading-7 text-indigo-100/70">Anda tidak perlu mengunggah ulang. Status diperiksa otomatis setiap 15 detik dan akan berubah setelah admin memberi keputusan.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button variant="outline" onClick={() => checkStatus(order.orderId)} className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RefreshCw size={16} className="mr-2" />Periksa sekarang</Button><Button onClick={() => navigate("/student/dashboard")} className="rounded-xl bg-white text-indigo-950 hover:bg-indigo-50">Ke dashboard</Button></div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Pembayaran">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <button onClick={() => navigate(order.packageName ? "/student/packages" : "/search")} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"><ArrowLeft size={17} />Kembali</button>
        {reason && <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800"><AlertCircle className="shrink-0" /><div><p className="font-black">Bukti sebelumnya ditolak</p><p className="mt-1 text-sm leading-6">{reason}</p></div></div>}
        {!paymentAccountReady && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><AlertCircle className="shrink-0" /><div><p className="font-black">Rekening pembayaran belum tersedia</p><p className="mt-1 text-sm leading-6">Admin perlu mengisi rekening tujuan terlebih dahulu. Jangan melakukan transfer sebelum informasi rekening tampil lengkap.</p></div></div>}
        {paymentExpired && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">Batas waktu telah berakhir. Muat ulang status untuk menutup tagihan.</div>}

        <div className="grid items-start gap-7 lg:grid-cols-[.9fr_1.1fr]">
          <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Tagihan</p><p className="mt-2 font-mono text-xl font-black">{order.invoiceId || `#${order.orderId}`}</p></div><span className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold">Belum dibayar</span></div></div>
            <div className="space-y-5 p-6">
              <div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">{order.packageName ? "Paket" : "Kelas"}</p><h1 className="mt-2 text-2xl font-black text-slate-900">{order.packageName || order.subject}</h1>{order.packageName && <p className="mt-1 text-sm font-semibold text-slate-600">{order.subject}</p>}<p className="mt-1 text-sm text-slate-500">{order.type} · tutor {order.tutorName}</p></div>
              <div className="flex flex-col gap-2 rounded-2xl bg-indigo-50 p-4 sm:flex-row sm:items-end sm:justify-between">
                <span className="text-sm font-bold text-indigo-700">Total transfer</span>
                <div className="text-left sm:text-right">
                  {Boolean(order.discountAmount && order.discountAmount > 0) && (
                    <div className="mb-1 flex items-center gap-2 sm:justify-end">
                      <span className="text-xs font-semibold text-slate-500 line-through">{rupiah(order.subtotalAmount || order.price)}</span>
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700">
                        {Math.round(((order.discountAmount || 0) / Math.max(order.subtotalAmount || order.price, 1)) * 100)}%
                      </span>
                    </div>
                  )}
                  <span className="text-xl font-black text-indigo-950 sm:text-2xl">{rupiah(order.price)}</span>
                  {Boolean(order.discountAmount && order.discountAmount > 0) && <p className="mt-1 text-[11px] font-bold text-emerald-700">Hemat {rupiah(order.discountAmount || 0)}</p>}
                </div>
              </div>
              {order.paymentDueAt && <div className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-800"><span className="flex items-center gap-2 text-sm font-bold"><Clock3 size={17} />Sisa waktu</span><span className="font-mono text-lg font-black">{timeText}</span></div>}
              <div className="rounded-2xl border border-slate-100 p-4"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Rekening admin</p><div className="mt-4 space-y-3 text-sm"><Row icon={Building2} label="Bank" value={settings.bank_name} /><Row icon={UserRound} label="Atas nama" value={settings.account_name} /><div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-xs text-slate-400">Nomor rekening</p><p className="mt-1 font-mono font-black text-slate-900">{settings.account_number}</p></div><Button type="button" variant="ghost" size="icon" onClick={() => copy(settings.account_number, "Nomor rekening")}><Copy size={17} /></Button></div></div></div>
              {settings.qris_url && <div className="rounded-2xl border border-slate-100 p-4 text-center"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">QRIS admin</p><img src={settings.qris_url} alt="QRIS pembayaran" className="mx-auto mt-3 max-h-60 rounded-xl object-contain" /></div>}
              <p className="flex gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="shrink-0 text-emerald-600" size={17} />Dana dicatat oleh admin. Sistem tidak menjalankan payment gateway atau transfer otomatis.</p>
            </div>
          </section>

          <form onSubmit={upload} className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-500">Konfirmasi transfer</p><h2 className="mt-2 text-2xl font-black text-slate-900">{reason ? "Unggah bukti pengganti" : "Kirim bukti pembayaran"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Pastikan nama pengirim, tujuan rekening, waktu, dan nominal terlihat jelas.</p>
            <div className="mt-7 space-y-5">
              <div><Label className="flex items-center gap-2 font-bold"><UserRound size={16} />Nama pemilik rekening</Label><Input required className="mt-2 h-12 rounded-xl" value={senderName} onChange={(event) => setSenderName(event.target.value)} /></div>
              <div><Label className="flex items-center gap-2 font-bold"><WalletCards size={16} />Bank/e-wallet asal</Label><Input required className="mt-2 h-12 rounded-xl" value={bankName} onChange={(event) => setBankName(event.target.value)} /></div>
              <div><Label className="flex items-center gap-2 font-bold"><CreditCard size={16} />Nomor rekening/e-wallet asal</Label><Input required inputMode="numeric" className="mt-2 h-12 rounded-xl" value={senderAccountNumber} onChange={(event) => setSenderAccountNumber(event.target.value)} /><p className="mt-2 text-xs leading-5 text-slate-500">Disimpan sebagai tujuan pengembalian dana jika refund disetujui.</p></div>
              <label className={`block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${proof ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40"}`}><Input required type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(event) => selectProof(event.target.files?.[0])} />{proof ? <><FileImage className="mx-auto text-emerald-600" /><p className="mt-3 truncate text-sm font-black text-emerald-800">{proof.name}</p><p className="mt-1 text-xs text-emerald-600">Klik untuk mengganti</p></> : <><Upload className="mx-auto text-indigo-500" /><p className="mt-3 text-sm font-black text-slate-800">Pilih foto bukti transfer</p><p className="mt-1 text-xs text-slate-400">JPG, PNG, atau WebP · maks. 5 MB</p></>}</label>
            </div>
            <Button disabled={submitting || paymentExpired || !proof || !paymentAccountReady} className="mt-7 h-12 w-full rounded-xl bg-indigo-600 font-black hover:bg-indigo-700">{submitting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <CreditCard size={18} className="mr-2" />}Kirim untuk diperiksa</Button>
            <Button type="button" variant="ghost" onClick={cancel} className="mt-2 w-full rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700">Batalkan tagihan</Button>
          </form>
        </div>
      </div>
    </StudentLayout>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Check; label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-slate-500"><Icon size={16} />{label}</span><span className="font-bold text-slate-900">{value}</span></div>;
}

function Result({ icon: Icon, color, title, text, action, onClick }: { icon: typeof CheckCircle2; color: "emerald" | "rose" | "amber"; title: string; text: string; action: string; onClick: () => void }) {
  const tone = color === "emerald"
    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
    : color === "amber"
      ? "bg-amber-50 text-amber-600 border-amber-100"
      : "bg-rose-50 text-rose-600 border-rose-100";
  return <div className="mx-auto grid min-h-[65vh] max-w-xl place-items-center"><div className="rounded-[2rem] border border-slate-100 bg-white p-6 text-center shadow-xl sm:rounded-[2.5rem] sm:p-9"><div className={`mx-auto grid h-20 w-20 place-items-center rounded-full border-4 sm:h-24 sm:w-24 ${tone}`}><Icon size={40} /></div><h1 className="mt-7 text-2xl font-black text-slate-900 sm:text-3xl">{title}</h1><p className="mt-3 leading-7 text-slate-500">{text}</p><Button onClick={onClick} className="mt-7 h-12 w-full rounded-xl bg-slate-950 font-bold hover:bg-slate-800">{action}</Button></div></div>;
}
