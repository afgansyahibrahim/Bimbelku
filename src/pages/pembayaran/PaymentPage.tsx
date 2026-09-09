import { notify } from "@/lib/notify";
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
  ImageOff,
  Loader2,
  RefreshCw,
  QrCode,
  ShieldCheck,
  Upload,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import OrderProgress from "@/components/OrderProgress";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import http, { getApiError, getApiErrorDetails } from "@/lib/http";
import { showFilePreview } from "@/lib/filePreview";
import {
  containsLetter,
  isValidAccountNumber,
  isValidPersonName,
  sanitizeDigits,
  sanitizePersonName,
  validateUpload,
} from "@/lib/validation";

interface PaymentSettings {
  merchant_name: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  qris_available?: boolean;
  qris_endpoint?: string | null;
}

interface WalletQuote {
  supported: boolean;
  balance: number;
  reserved_balance: number;
  usable_amount: number;
  external_due: number;
  currency: string;
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
  durationHours?: number;
  totalLearningHours?: number;
  orderKind?: "cheap_class" | "package" | "booking";
  enrollmentStatus?: string | null;
  cheapClassStatus?: string | null;
  cheapClassCancellationReason?: string | null;
  canCancel?: boolean;
  canResubmit?: boolean;
  willRefundIfAccepted?: boolean;
  refundReasonIfAccepted?: "class_cancelled" | "capacity_full" | null;
  externalReceivedAmount?: number;
  outstandingAmount?: number;
  reconciliationStatus?: "underpaid" | "exact" | "overpaid" | null;
  topUpDueAt?: string | null;
}

type State = "loading" | "pending" | "submitted" | "paid" | "expired" | "cancelled" | "refund_pending" | "refunded";
type PaymentIssue = {
  message: string;
  title: string;
  tone: "amber" | "rose";
  code?: string;
};

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
const PAYMENT_ACCOUNT_MIN_DIGITS = 8;
const PAYMENT_ACCOUNT_MAX_DIGITS = 20;

const describePaymentIssue = (error: unknown): PaymentIssue => {
  const details = getApiErrorDetails(error, "Bukti pembayaran gagal dikirim. Coba lagi setelah memeriksa data yang diisi.");

  if (!details.status) {
    return {
      title: "Koneksi ke server terputus",
      message: "Status pengiriman bukti belum dapat dipastikan. Periksa status pembayaran sebelum mengirim ulang agar tidak terjadi pengiriman ganda.",
      tone: "amber",
      code: "network_error",
    };
  }
  if (details.code === "payment_rate_limited" || details.status === 429) {
    return { title: "Tunggu sebentar", message: details.message, tone: "amber", code: details.code };
  }
  if (details.code === "schedule_conflict") {
    return { title: "Jadwal bertabrakan", message: details.message, tone: "rose", code: details.code };
  }
  if (details.code === "payment_expired") {
    return { title: "Batas pembayaran berakhir", message: details.message, tone: "rose", code: details.code };
  }
  if (details.code === "payment_settings_unavailable") {
    return { title: "Metode pembayaran belum siap", message: details.message, tone: "amber", code: details.code };
  }
  if (details.code === "wallet_balance_changed") {
    return { title: "Saldo berubah", message: details.message, tone: "amber", code: details.code };
  }
  if (details.code === "wallet_not_supported") {
    return { title: "Saldo belum tersedia", message: details.message, tone: "amber", code: details.code };
  }
  if (details.code === "wallet_integrity_locked") {
    return { title: "Saldo sedang diamankan", message: details.message, tone: "amber", code: details.code };
  }
  if (details.code === "payment_pin_setup_required") {
    return { title: "Buat PIN pembayaran", message: details.message, tone: "amber", code: details.code };
  }
  if (details.code === "payment_pin_invalid") {
    return { title: "PIN pembayaran salah", message: details.message, tone: "rose", code: details.code };
  }
  if (details.code === "invoice_not_payable" || details.code === "package_not_payable" || details.code === "session_inactive") {
    return { title: "Tagihan tidak dapat diproses", message: details.message, tone: "rose", code: details.code };
  }

  return { title: "Bukti belum terkirim", message: details.message, tone: "rose", code: details.code };
};

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
  const [submitIssue, setSubmitIssue] = useState<PaymentIssue | null>(null);
  const [now, setNow] = useState(Date.now());
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "bank">("bank");
  const [qrisObjectUrl, setQrisObjectUrl] = useState<string | null>(null);
  const [qrisLoading, setQrisLoading] = useState(false);
  const [qrisLoadFailed, setQrisLoadFailed] = useState(false);
  const [walletQuote, setWalletQuote] = useState<WalletQuote | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [paymentPinConfigured, setPaymentPinConfigured] = useState<boolean | null>(null);
  const [paymentPin, setPaymentPin] = useState("");
  const [pinPassword, setPinPassword] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");
  const [settingPin, setSettingPin] = useState(false);
  const [pinResetRequested, setPinResetRequested] = useState(false);
  const [pinResetCode, setPinResetCode] = useState("");
  const [pinResetSent, setPinResetSent] = useState(false);
  const [requestingPinReset, setRequestingPinReset] = useState(false);
  const orderKind = order?.orderKind;
  const isCheapClass = orderKind === "cheap_class";
  const isPackage = orderKind === "package";
  const returnPath = orderKind === "cheap_class"
    ? "/student/kelas-murah"
    : orderKind === "package"
      ? "/student/my-classes?tab=process"
      : "/student/history";
  const returnAction = isCheapClass
    ? "Lihat Kelas Kelompok"
    : isPackage
      ? "Lihat Proses Kelas"
      : "Lihat Riwayat Transaksi";

  const checkStatus = useCallback(async (orderId: number, showNotification = true) => {
    try {
      const response = await http.get(`/student/orders/${orderId}/status`);
      const status = response.data.status as string;
      setReason(response.data.rejection_reason || "");
      setOrder((current) => current && current.orderId === orderId ? {
        ...current,
        orderKind: response.data.order_kind || current.orderKind,
        enrollmentStatus: response.data.enrollment_status ?? current.enrollmentStatus,
        cheapClassStatus: response.data.cheap_class_status ?? current.cheapClassStatus,
        cheapClassCancellationReason: response.data.cheap_class_cancellation_reason ?? current.cheapClassCancellationReason,
        canCancel: Boolean(response.data.can_cancel),
        canResubmit: Boolean(response.data.can_resubmit),
        willRefundIfAccepted: Boolean(response.data.will_refund_if_accepted),
        refundReasonIfAccepted: response.data.refund_reason_if_accepted ?? current.refundReasonIfAccepted ?? null,
        externalReceivedAmount: Number(response.data.external_received_amount || 0),
        outstandingAmount: Number(response.data.payment_outstanding_amount || 0),
        reconciliationStatus: response.data.payment_reconciliation_status ?? null,
        topUpDueAt: response.data.top_up_due_at ?? null,
        paymentDueAt: response.data.top_up_due_at ?? current.paymentDueAt,
      } : current);
      if (status === "paid") {
        setState("paid");
        sessionStorage.removeItem("bimbelku_payment_order");
      } else if (status === "submitted") {
        setState("submitted");
      } else if (status === "rejected" || status === "pending") {
        setState("pending");
      } else if (status === "partially_paid") {
        setState("pending");
      } else if (status === "cancelled") {
        setState("cancelled");
        sessionStorage.removeItem("bimbelku_payment_order");
      } else if (status === "refund_pending") {
        setState("refund_pending");
        sessionStorage.removeItem("bimbelku_payment_order");
      } else if (status === "refunded") {
        setState("refunded");
        sessionStorage.removeItem("bimbelku_payment_order");
      } else if (status === "expired") {
        setState("expired");
        sessionStorage.removeItem("bimbelku_payment_order");
      }
      if (showNotification) notify.success("Status pembayaran diperbarui.");
    } catch (error) {
      if (showNotification) notify.error(getApiError(error));
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      const settingsPromise = http.get<PaymentSettings>("/payment-settings");
      let resolved = location.state as OrderData | null;
      if (!resolved?.orderId) {
        // Sumber kebenaran pertama adalah tagihan aktif dari backend.
        // sessionStorage hanya fallback untuk menampilkan status tagihan lama
        // (mis. bukti sedang diperiksa), sehingga order batal tidak dapat
        // menutupi tagihan baru yang masih aktif.
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
            durationHours: Number(response.data.duration_hours || 1),
            totalLearningHours: Number(response.data.total_learning_hours || 0),
            orderKind: response.data.order_kind,
            enrollmentStatus: response.data.enrollment_status,
            cheapClassStatus: response.data.cheap_class_status,
            cheapClassCancellationReason: response.data.cheap_class_cancellation_reason,
            canCancel: Boolean(response.data.can_cancel),
            canResubmit: Boolean(response.data.can_resubmit),
            willRefundIfAccepted: Boolean(response.data.will_refund_if_accepted),
            refundReasonIfAccepted: response.data.refund_reason_if_accepted ?? null,
            externalReceivedAmount: Number(response.data.external_received_amount || 0),
            outstandingAmount: Number(response.data.payment_outstanding_amount || 0),
            reconciliationStatus: response.data.payment_reconciliation_status ?? null,
            topUpDueAt: response.data.top_up_due_at ?? null,
          };
        } else {
          const stored = sessionStorage.getItem("bimbelku_payment_order");
          resolved = stored ? JSON.parse(stored) as OrderData : null;
        }
      }
      setSettings((await settingsPromise).data);
      if (!resolved?.orderId) {
        setState("expired");
        return;
      }
      setOrder(resolved);
      sessionStorage.setItem("bimbelku_payment_order", JSON.stringify(resolved));
      try {
        const walletResponse = await http.get<WalletQuote>(`/student/orders/${resolved.orderId}/wallet-quote`);
        setWalletQuote(walletResponse.data);
        setUseWallet(false);
      } catch {
        setWalletQuote(null);
        setUseWallet(false);
      }
      try {
        const pinResponse = await http.get<{ configured: boolean }>("/student/payment-pin/status");
        setPaymentPinConfigured(Boolean(pinResponse.data?.configured));
      } catch {
        // Akun lama tetap dapat memakai transfer jika endpoint PIN belum tersedia.
        setPaymentPinConfigured(false);
      }
      await checkStatus(resolved.orderId, false);
    } catch (error) {
      notify.error(getApiError(error, "Tagihan gagal dimuat."));
      setState("expired");
    }
  }, [checkStatus, location.state]);

  useEffect(() => { void initialize(); }, [initialize]);

  const fetchQris = useCallback(async () => {
    if (!settings?.qris_available) {
      setQrisObjectUrl(null);
      setQrisLoadFailed(false);
      setPaymentMethod("bank");
      return;
    }

    setQrisLoading(true);
    setQrisLoadFailed(false);
    try {
      const response = await http.get(settings.qris_endpoint || "/payment-settings/qris", {
        responseType: "blob",
      });
      const nextUrl = URL.createObjectURL(response.data as Blob);
      setQrisObjectUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
      setPaymentMethod("qris");
    } catch {
      setQrisObjectUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      setQrisLoadFailed(true);
      setPaymentMethod("bank");
    } finally {
      setQrisLoading(false);
    }
  }, [settings?.qris_available, settings?.qris_endpoint]);

  useEffect(() => {
    void fetchQris();
  }, [fetchQris]);

  useEffect(() => () => {
    if (qrisObjectUrl) URL.revokeObjectURL(qrisObjectUrl);
  }, [qrisObjectUrl]);

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
  const bankPaymentReady = Boolean(
    settings?.bank_name?.trim()
      && settings?.account_number?.trim()
      && settings?.account_name?.trim(),
  );
  const qrisPaymentReady = Boolean(settings?.qris_available && qrisObjectUrl && !qrisLoadFailed);
  const walletUsable = Boolean(walletQuote?.supported && (walletQuote?.usable_amount || 0) > 0);
  const walletAmount = useWallet && walletUsable ? Math.min(Number(walletQuote?.usable_amount || 0), Number(order?.price || 0)) : 0;
  const isTopUp = order?.reconciliationStatus === "underpaid" && Number(order?.outstandingAmount || 0) > 0;
  const externalDue = isTopUp
    ? Number(order?.outstandingAmount || 0)
    : Math.max(0, Number(order?.price || 0) - walletAmount);
  const walletOnly = Boolean(useWallet && walletAmount > 0 && externalDue < 0.01);
  const paymentDestinationReady = walletOnly || bankPaymentReady || qrisPaymentReady;
  const paymentExpired = Boolean(order?.paymentDueAt && secondsLeft === 0);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify.success(`${label} berhasil disalin.`);
    } catch {
      notify.error(`${label} tidak dapat disalin otomatis. Salin secara manual.`);
    }
  };

  const setupPaymentPin = async () => {
    if (pinPassword.length === 0) {
      notify.error("Masukkan password akun terlebih dahulu.");
      return;
    }
    if (!/^\d{6}$/.test(pinConfirmation) || pinConfirmation !== paymentPin) {
      notify.error("PIN baru harus 6 angka dan konfirmasinya harus sama.");
      return;
    }
    setSettingPin(true);
    try {
      await http.post("/student/payment-pin", {
        current_password: pinPassword,
        pin: paymentPin,
        pin_confirmation: pinConfirmation,
      });
      setPaymentPinConfigured(true);
      setPinPassword("");
      setPinConfirmation("");
      notify.success("PIN pembayaran berhasil dibuat. Masukkan PIN tersebut untuk melanjutkan.");
    } catch (error) {
      notify.error(getApiError(error, "PIN pembayaran gagal disimpan."));
    } finally {
      setSettingPin(false);
    }
  };
  const requestPinReset = async () => {
    setRequestingPinReset(true);
    try {
      const response = await http.post("/student/payment-pin/reset/request");
      setPinResetSent(true);
      notify.success(response.data.message);
    } catch (error) {
      notify.error(getApiError(error, "Kode reset PIN belum dapat dikirim."));
    } finally {
      setRequestingPinReset(false);
    }
  };
  const resetPaymentPin = async () => {
    if (!/^\d{6}$/.test(pinResetCode)) {
      notify.error("Masukkan kode OTP 6 angka dari email.");
      return;
    }
    if (!/^\d{6}$/.test(pinConfirmation) || pinConfirmation !== paymentPin) {
      notify.error("PIN baru harus 6 angka dan konfirmasinya harus sama.");
      return;
    }
    setSettingPin(true);
    try {
      await http.post("/student/payment-pin/reset", {
        code: pinResetCode,
        pin: paymentPin,
        pin_confirmation: pinConfirmation,
      });
      setPinResetRequested(false);
      setPinResetSent(false);
      setPinResetCode("");
      setPinConfirmation("");
      setPaymentPin("");
      notify.success("PIN pembayaran berhasil diatur ulang.");
    } catch (error) {
      notify.error(getApiError(error, "PIN pembayaran gagal diatur ulang."));
    } finally {
      setSettingPin(false);
    }
  };
  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!order) return;
    if (useWallet) {
      if (!paymentPinConfigured) {
        notify.error("Buat PIN pembayaran terlebih dahulu.");
        return;
      }
      if (!/^\d{6}$/.test(paymentPin)) {
        notify.error("Masukkan PIN pembayaran 6 angka.");
        return;
      }
    }
    if (externalDue > 0.01) {
      if (!proof) {
        notify.error("Pilih bukti pembayaran untuk sisa tagihan.");
        return;
      }
      if (!isValidPersonName(senderName)) {
        notify.error("Nama pemilik rekening harus berisi huruf dan tidak boleh memuat angka.");
        return;
      }
      if (!containsLetter(bankName)) {
        notify.error("Nama bank atau e-wallet wajib mengandung huruf.");
        return;
      }
      if (
        !isValidAccountNumber(senderAccountNumber)
        || senderAccountNumber.length < PAYMENT_ACCOUNT_MIN_DIGITS
        || senderAccountNumber.length > PAYMENT_ACCOUNT_MAX_DIGITS
      ) {
        notify.error(`Nomor rekening atau e-wallet harus berisi ${PAYMENT_ACCOUNT_MIN_DIGITS}–${PAYMENT_ACCOUNT_MAX_DIGITS} digit.`);
        return;
      }
      if (!paymentDestinationReady) {
        notify.error("Metode pembayaran belum dikonfigurasi admin.");
        return;
      }
    }

    const payload = new FormData();
    payload.append("use_wallet", useWallet ? "1" : "0");
    payload.append("wallet_expected_amount", String(walletAmount));
    if (useWallet) payload.append("payment_pin", paymentPin);
    if (externalDue > 0.01 && proof) {
      payload.append("file", proof);
      payload.append("sender_name", senderName);
      payload.append("bank_name", bankName);
      payload.append("sender_account_number", senderAccountNumber);
    }
    setSubmitIssue(null);
    setSubmitting(true);
    try {
      const response = await http.post(`/orders/${order.orderId}/pay`, payload);
      notify.success(response.data.message);
      setReason("");
      await checkStatus(order.orderId, false);
    } catch (error) {
      const issue = describePaymentIssue(error);
      setSubmitIssue(issue);
      if (issue.tone === "amber") notify.warning(issue.message);
      else notify.error(issue.message);
      if (["payment_expired", "invoice_not_payable", "package_not_payable", "session_inactive", "wallet_balance_changed"].includes(issue.code || "")) {
        if (issue.code === "wallet_balance_changed") {
          try {
            const walletResponse = await http.get<WalletQuote>(`/student/orders/${order.orderId}/wallet-quote`);
            setWalletQuote(walletResponse.data);
          } catch { /* status check below remains the fallback */ }
        }
        void checkStatus(order.orderId, false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectProof = (file?: File) => {
    setSubmitIssue(null);
    const error = validateUpload(file, {
      label: "Bukti transfer",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "webp"],
    });
    if (error) {
      notify.error(error);
      setProof(null);
      return;
    }
    setProof(file || null);
  };

  const cancel = async () => {
    if (!order) return;
    const approved = await confirm({
      title: isCheapClass ? "Batalkan keikutsertaan Kelas Kelompok?" : "Batalkan tagihan?",
      description: isCheapClass
        ? "Kursi akan dilepas. Kamu masih dapat bergabung kembali jika pendaftaran masih dibuka dan kuota tersedia. Pembatalan tidak tersedia setelah bukti pembayaran dikirim."
        : "Tagihan dan pesanan akan dibatalkan. Tindakan ini tidak dapat dipulihkan.",
      confirmText: isCheapClass ? "Batalkan keikutsertaan" : "Ya, batalkan",
      tone: "danger",
    });
    if (!approved) return;
    try {
      const response = await http.post(`/orders/${order.orderId}/cancel`);
      notify.success(response.data.message);
      sessionStorage.removeItem("bimbelku_payment_order");
      navigate(returnPath, { replace: true });
    } catch (error) {
      notify.error(getApiError(error));
    }
  };

  if (state === "loading") {
    return <StudentLayout title="Pembayaran"><div className="grid min-h-[65vh] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" /><p className="mt-3 text-sm font-bold text-slate-500">Menyiapkan tagihan…</p></div></div></StudentLayout>;
  }

  if (state === "paid") {
    return <StudentLayout title="Pembayaran"><Result icon={CheckCircle2} color="emerald" title="Pembayaran diterima" text={isCheapClass ? "Pembayaran sudah diterima. Kelas akan dikonfirmasi setelah pendaftaran ditutup dan kuota minimum terpenuhi." : isPackage ? "Pembayaran sudah diterima. Sistem sekarang mencari tutor yang tersedia pada seluruh jadwalmu." : "Admin telah memverifikasi transfer untuk transaksi lama. Status kelas dan penyelesaiannya dapat dipantau dari riwayat transaksi."} action={returnAction} onClick={() => navigate(returnPath)} /></StudentLayout>;
  }

  if (state === "refund_pending" || state === "refunded") {
    return <StudentLayout title="Pembayaran"><Result icon={RefreshCw} color="amber" title={state === "refunded" ? "Refund selesai" : "Refund sedang diproses"} text={state === "refunded" ? "Pengembalian dana sudah selesai. Tujuan refund, bukti transfer, atau mutasi Saldo BimbelKu dapat dilihat pada riwayat transaksi." : "Pembayaranmu masuk antrean refund. Buka riwayat transaksi untuk memilih apakah dana dikembalikan ke rekening/e-wallet atau Saldo BimbelKu."} action={state === "refunded" ? "Lihat riwayat transaksi" : "Pilih tujuan refund"} onClick={() => navigate("/student/history")} /></StudentLayout>;
  }

  if (state === "expired" || state === "cancelled" || !order || !settings) {
    return <StudentLayout title="Pembayaran"><Result icon={XCircle} color="rose" title={state === "cancelled" ? (isCheapClass ? "Keikutsertaan dibatalkan" : "Tagihan dibatalkan") : "Tagihan tidak tersedia"} text={state === "cancelled" ? (isCheapClass ? "Kursi sudah dilepas. Kamu dapat bergabung kembali jika pendaftaran masih dibuka dan kuota tersedia." : "Tagihan dan pesanan sudah dibatalkan.") : "Batas pembayaran telah berakhir atau tidak ada tagihan aktif."} action={returnAction} onClick={() => navigate(returnPath)} /></StudentLayout>;
  }

  if (state === "submitted") {
    return (
      <StudentLayout title="Pembayaran">
        <div className="mx-auto grid min-h-[65vh] max-w-2xl place-items-center">
          <div className="w-full rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-center text-white shadow-2xl sm:rounded-[2.5rem] sm:p-8">
            <div className="relative mx-auto h-36 w-36"><div className="absolute inset-0 animate-ping rounded-full border border-indigo-300/30" /><div className="absolute inset-4 animate-spin rounded-full border-4 border-indigo-400/20 border-t-indigo-300" /><div className="absolute inset-0 grid place-items-center"><ShieldCheck size={42} className="text-indigo-200" /></div></div>
            <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-indigo-200">Pemeriksaan manual admin</p><h1 className="mt-3 text-2xl font-black sm:text-3xl">{isCheapClass && order.willRefundIfAccepted ? (order.refundReasonIfAccepted === "capacity_full" ? "Kuota penuh · bukti tetap diperiksa" : "Kelas dibatalkan · bukti tetap diperiksa") : "Bukti transfer sudah diterima"}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-indigo-100/70 sm:text-base">{isCheapClass && order.willRefundIfAccepted ? (order.refundReasonIfAccepted === "capacity_full" ? "Kapasitas peserta terverifikasi sudah penuh. Bukti tetap diperiksa admin. Jika transfer valid, dana akan masuk antrean refund penuh dan tidak mengaktifkan peserta tambahan." : `Kelas telah dibatalkan${order.cheapClassCancellationReason ? `: ${order.cheapClassCancellationReason}` : "."} Bukti transfer tetap diperiksa. Jika transfer valid, dana akan masuk antrean refund penuh. Jika bukti tidak valid, pembatalan selesai tanpa refund.`) : "Anda tidak perlu mengunggah ulang. Status diperiksa otomatis setiap 15 detik dan akan berubah setelah admin memberi keputusan."}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button variant="outline" onClick={() => checkStatus(order.orderId)} className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RefreshCw size={16} className="mr-2" />Periksa sekarang</Button><Button onClick={() => navigate("/student/dashboard")} className="rounded-xl bg-white text-indigo-950 hover:bg-indigo-50">Ke dashboard</Button></div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Pembayaran">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <button type="button" onClick={() => navigate(returnPath)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"><ArrowLeft size={17} />Kembali</button>
        {order.packageName && <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><OrderProgress status="awaiting_payment" /></div>}
        {isTopUp && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><AlertCircle className="shrink-0" /><div><p className="font-black">Pembayaran masih kurang {rupiah(order.outstandingAmount || 0)}</p><p className="mt-1 text-sm leading-6">Dana {rupiah(order.externalReceivedAmount || 0)} sudah aman tercatat. Unggah bukti transfer tambahan hanya untuk sisa tagihan. Saldo BimbelKu yang sudah dialokasikan tidak ditarik ulang.</p></div></div>}
        {reason && !isTopUp && <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800"><AlertCircle className="shrink-0" /><div><p className="font-black">Bukti sebelumnya ditolak</p><p className="mt-1 text-sm leading-6">{reason}</p></div></div>}
        {submitIssue && (
          <div className={`flex gap-3 rounded-2xl border p-5 ${submitIssue.tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            <AlertCircle className="shrink-0" />
            <div className="min-w-0">
              <p className="font-black">{submitIssue.title}</p>
              <p className="mt-1 break-words text-sm leading-6">{submitIssue.message}</p>
              {submitIssue.code === "network_error" && (
                <Button type="button" variant="outline" size="sm" className="mt-3 rounded-lg bg-white" onClick={() => void checkStatus(order.orderId)}>Periksa status pembayaran</Button>
              )}
            </div>
          </div>
        )}
        {externalDue > 0.01 && !paymentDestinationReady && !qrisLoading && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><AlertCircle className="shrink-0" /><div><p className="font-black">Metode pembayaran belum tersedia</p><p className="mt-1 text-sm leading-6">Admin perlu mengaktifkan QRIS atau melengkapi rekening tujuan. Jangan membayar sebelum salah satu metode tampil lengkap.</p></div></div>}
        {paymentExpired && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">Batas waktu telah berakhir. Muat ulang status untuk menutup tagihan.</div>}

        <div className="grid items-start gap-7 lg:grid-cols-[.9fr_1.1fr]">
          <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-slate-950 to-indigo-950 p-5 text-white sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Tagihan</p><p className="mt-2 break-all font-mono text-lg font-black sm:text-xl">{order.invoiceId || `#${order.orderId}`}</p></div><span className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold">Belum dibayar</span></div></div>
            <div className="space-y-5 p-5 sm:p-6">
              <div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">{order.packageName ? "Paket" : "Kelas"}</p><h1 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">{order.packageName || order.subject}</h1>{order.packageName && <p className="mt-1 text-sm font-semibold text-slate-600">{order.subject}</p>}<p className="mt-1 text-sm text-slate-500">{order.type}{order.packageName ? ` · ${order.durationHours || 1} jam/pertemuan · tutor dicari setelah pembayaran` : ` · tutor ${order.tutorName}`}</p>{Boolean(order.totalLearningHours) && <p className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">Total {order.totalLearningHours} jam belajar</p>}</div>
              <div className="flex flex-col gap-2 rounded-2xl bg-indigo-50 p-4 sm:flex-row sm:items-end sm:justify-between">
                <span className="text-sm font-bold text-indigo-700">{walletAmount > 0 ? "Sisa yang ditransfer" : "Total transfer"}</span>
                <div className="text-left sm:text-right">
                  {Boolean(order.discountAmount && order.discountAmount > 0) && (
                    <div className="mb-1 flex items-center gap-2 sm:justify-end">
                      <span className="text-xs font-semibold text-slate-500 line-through">{rupiah(order.subtotalAmount || order.price)}</span>
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700">
                        {Math.round(((order.discountAmount || 0) / Math.max(order.subtotalAmount || order.price, 1)) * 100)}%
                      </span>
                    </div>
                  )}
                  <span className="text-xl font-black text-indigo-950 sm:text-2xl">{rupiah(externalDue)}</span>
                  {Boolean(order.discountAmount && order.discountAmount > 0) && <p className="mt-1 text-[11px] font-bold text-emerald-700">Hemat {rupiah(order.discountAmount || 0)}</p>}
                </div>
              </div>
              {order.paymentDueAt && <div className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-800"><span className="flex items-center gap-2 text-sm font-bold"><Clock3 size={17} />Sisa waktu</span><span className="font-mono text-lg font-black">{timeText}</span></div>}
              {walletQuote?.supported && !isTopUp && (
                <div className={`rounded-2xl border p-4 ${useWallet && walletUsable ? "border-indigo-200 bg-indigo-50" : "border-slate-100 bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-black text-slate-900"><WalletCards size={17} className="text-indigo-600" />Saldo BimbelKu</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Store credit dari refund. Bisa dipakai untuk biaya belajar dan tidak dapat ditarik tunai.</p>
                    </div>
                    <p className="shrink-0 text-base font-black text-indigo-700">{rupiah(walletQuote.balance)}</p>
                  </div>
                  {walletQuote.reserved_balance > 0 && <p className="mt-2 text-xs font-bold text-amber-700">{rupiah(walletQuote.reserved_balance)} sedang dialokasikan ke tagihan lain.</p>}
                  <button
                    type="button"
                    disabled={!walletUsable}
                    onClick={() => setUseWallet((current) => !current)}
                    className={`mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border px-3 text-left text-sm font-black transition ${useWallet && walletUsable ? "border-indigo-400 bg-white text-indigo-800" : "border-slate-200 bg-white text-slate-700"} disabled:cursor-not-allowed disabled:opacity-55`}
                  >
                    <span>{walletUsable ? `Pakai ${rupiah(walletQuote.usable_amount)} dari saldo` : "Saldo belum tersedia"}</span>
                    <span className={`grid h-5 w-5 place-items-center rounded-md border ${useWallet && walletUsable ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"}`}>{useWallet && walletUsable ? <Check size={13} /> : null}</span>
                  </button>
                  {useWallet && walletUsable && <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-white p-3"><p className="font-bold text-slate-500">Dari saldo</p><p className="mt-1 font-black text-indigo-700">{rupiah(walletAmount)}</p></div><div className="rounded-xl bg-white p-3"><p className="font-bold text-slate-500">Sisa bayar</p><p className="mt-1 font-black text-slate-900">{rupiah(externalDue)}</p></div></div>}
                </div>
              )}
              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pilih cara bayar</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">Bayar memakai QRIS atau transfer bank.</p>
                  </div>
                  {qrisPaymentReady && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">QRIS aktif</span>}
                </div>

                {walletOnly ? <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Saldo mencukupi seluruh tagihan. Tidak perlu transfer atau unggah bukti pembayaran.</div> : <><div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!qrisPaymentReady}
                    onClick={() => setPaymentMethod("qris")}
                    className={`rounded-xl border p-3 text-left transition ${paymentMethod === "qris" && qrisPaymentReady ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-600"} disabled:cursor-not-allowed disabled:opacity-55`}
                  >
                    <span className="flex items-center gap-2 text-sm font-black"><QrCode size={17} />QRIS</span>
                    <span className="mt-1 block text-[11px] font-semibold">{qrisLoading ? "Sedang dimuat" : qrisPaymentReady ? "Scan dari aplikasi pembayaran" : qrisLoadFailed ? "Gagal dimuat" : "Belum diaktifkan admin"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!bankPaymentReady}
                    onClick={() => setPaymentMethod("bank")}
                    className={`rounded-xl border p-3 text-left transition ${paymentMethod === "bank" && bankPaymentReady ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-600"} disabled:cursor-not-allowed disabled:opacity-55`}
                  >
                    <span className="flex items-center gap-2 text-sm font-black"><Building2 size={17} />Transfer bank</span>
                    <span className="mt-1 block text-[11px] font-semibold">{bankPaymentReady ? settings.bank_name : "Belum tersedia"}</span>
                  </button>
                </div>

                {paymentMethod === "qris" && qrisPaymentReady && qrisObjectUrl ? (
                  <div className="mt-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 p-4 text-center">
                    <button
                      type="button"
                      aria-label={`Perbesar QRIS ${settings.merchant_name}`}
                      onClick={() => showFilePreview({
                        url: qrisObjectUrl,
                        filename: `QRIS ${settings.merchant_name}`,
                        contentType: "image/png",
                      })}
                      className="group relative block w-full overflow-hidden rounded-xl bg-white p-3 shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                    >
                      <img src={qrisObjectUrl} alt={`QRIS ${settings.merchant_name}`} loading="lazy" decoding="async" className="mx-auto max-h-[22rem] w-full object-contain" />
                      <span className="absolute bottom-4 right-4 rounded-lg bg-slate-950/80 px-3 py-1.5 text-xs font-black text-white shadow-lg transition group-hover:bg-indigo-700">Perbesar</span>
                    </button>
                    <p className="mt-3 text-base font-black text-slate-900">Scan QRIS {settings.merchant_name}</p>
                    <p className="mt-1 text-sm font-bold text-indigo-700">Bayar tepat {rupiah(externalDue)}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 w-full rounded-xl bg-white"
                      onClick={() => showFilePreview({
                        url: qrisObjectUrl,
                        filename: `QRIS ${settings.merchant_name}`,
                        contentType: "image/png",
                      })}
                    >
                      <QrCode size={16} className="mr-2" />Perbesar QRIS
                    </Button>
                    <ol className="mt-4 space-y-2 text-left text-xs leading-5 text-slate-600">
                      <li><strong>1.</strong> Buka aplikasi bank atau e-wallet yang mendukung QRIS.</li>
                      <li><strong>2.</strong> Scan gambar QRIS di atas.</li>
                      <li><strong>3.</strong> Masukkan nominal tepat sesuai sisa tagihan yang harus ditransfer.</li>
                      <li><strong>4.</strong> Simpan bukti pembayaran, lalu unggah pada formulir di sebelahnya.</li>
                    </ol>
                  </div>
                ) : paymentMethod === "bank" && bankPaymentReady ? (
                  <div className="mt-4 rounded-2xl border border-slate-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Rekening admin</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <Row icon={Building2} label="Bank" value={settings.bank_name} />
                      <Row icon={UserRound} label="Atas nama" value={settings.account_name} />
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                        <div><p className="text-xs text-slate-500">Nomor rekening</p><p className="mt-1 font-mono font-black text-slate-900">{settings.account_number}</p></div>
                        <Button type="button" aria-label="Salin nomor rekening" variant="ghost" size="icon" onClick={() => copy(settings.account_number, "Nomor rekening")}><Copy size={17} /></Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {qrisLoading && <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-600"><Loader2 size={17} className="animate-spin" />Memuat QRIS pembayaran…</div>}
                {qrisLoadFailed && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-left">
                    <div className="flex gap-3 text-rose-800"><ImageOff className="shrink-0" size={19} /><div><p className="text-sm font-black">QRIS gagal dimuat</p><p className="mt-1 text-xs leading-5">Gunakan transfer bank sementara atau muat ulang gambar QRIS.</p></div></div>
                    <Button type="button" variant="outline" size="sm" className="mt-3 w-full rounded-lg border-rose-200 bg-white text-rose-700" onClick={() => void fetchQris()}><RefreshCw size={14} className="mr-2" />Muat ulang QRIS</Button>
                  </div>
                )}
                {!settings.qris_available && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">QRIS belum diaktifkan admin. Pembayaran tetap dapat dilakukan melalui transfer bank.</p>}
                </>}
              </div>
              <p className="flex gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="shrink-0 text-emerald-600" size={17} />{walletOnly ? "Pembayaran saldo diverifikasi otomatis oleh backend." : "Transfer eksternal tetap diperiksa admin sebelum pembayaran diterima."}</p>
            </div>
          </section>

          <form onSubmit={upload} className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm sm:rounded-[2rem] md:p-8">
            <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-500">Konfirmasi pembayaran</p><h2 className="mt-2 text-2xl font-black text-slate-900">{walletOnly ? "Bayar dengan Saldo BimbelKu" : reason ? "Unggah bukti pengganti" : "Kirim bukti pembayaran"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{walletOnly ? "Saldo akan dipotong oleh backend dan pembayaran diproses otomatis tanpa pemeriksaan bukti transfer." : walletAmount > 0 ? `Transfer hanya sisa tagihan sebesar ${rupiah(externalDue)}, lalu unggah buktinya.` : "Pastikan nama pengirim, tujuan pembayaran, waktu, dan nominal terlihat jelas."}</p>
            {useWallet && paymentPinConfigured === false && <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-black text-amber-900">Buat atau reset PIN pembayaran</p>
              <p className="mt-1 text-xs leading-5 text-amber-800">Akun lama cukup membuat PIN sekali. Tidak ada SMS atau biaya tambahan.</p>
              <Input type="password" autoComplete="current-password" placeholder="Password akun" className="mt-3 h-11 rounded-xl bg-white" value={pinPassword} onChange={(event) => setPinPassword(event.target.value)} />
              <Input inputMode="numeric" maxLength={6} placeholder="PIN baru (6 angka)" className="mt-2 h-11 rounded-xl bg-white" value={paymentPin} onChange={(event) => setPaymentPin(event.target.value.replace(/\D/g, "").slice(0, 6))} />
              <Input inputMode="numeric" maxLength={6} placeholder="Ulangi PIN baru" className="mt-2 h-11 rounded-xl bg-white" value={pinConfirmation} onChange={(event) => setPinConfirmation(event.target.value.replace(/\D/g, "").slice(0, 6))} />
              <Button type="button" disabled={settingPin} onClick={() => void setupPaymentPin()} className="mt-3 h-11 w-full rounded-xl bg-amber-600 font-black hover:bg-amber-700">{settingPin ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}Simpan PIN dan lanjut</Button>{paymentPinConfigured === true && pinResetRequested && <button type="button" className="mt-3 w-full text-xs font-black text-amber-800 underline" onClick={() => { setPinResetRequested(false); setPaymentPin(""); setPinPassword(""); setPinConfirmation(""); }}>Kembali ke masukkan PIN</button>}
            </div>}
            {useWallet && paymentPinConfigured === true && pinResetRequested && <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-black text-amber-900">Reset PIN melalui email</p>
              <p className="mt-1 text-xs leading-5 text-amber-800">Kode OTP 6 angka dikirim ke email akunmu dan berlaku selama 10 menit.</p>
              {!pinResetSent ? (
                <Button type="button" disabled={requestingPinReset} onClick={() => void requestPinReset()} className="mt-3 h-11 w-full rounded-xl bg-amber-600 font-black hover:bg-amber-700">
                  {requestingPinReset ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                  Kirim kode OTP
                </Button>
              ) : (
                <>
                  <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Kode OTP dari email" className="mt-3 h-11 rounded-xl bg-white text-center font-black tracking-[.3em]" value={pinResetCode} onChange={(event) => setPinResetCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
                  <Input type="password" inputMode="numeric" maxLength={6} placeholder="PIN baru (6 angka)" className="mt-2 h-11 rounded-xl bg-white" value={paymentPin} onChange={(event) => setPaymentPin(event.target.value.replace(/\D/g, "").slice(0, 6))} />
                  <Input type="password" inputMode="numeric" maxLength={6} placeholder="Ulangi PIN baru" className="mt-2 h-11 rounded-xl bg-white" value={pinConfirmation} onChange={(event) => setPinConfirmation(event.target.value.replace(/\D/g, "").slice(0, 6))} />
                  <Button type="button" disabled={settingPin} onClick={() => void resetPaymentPin()} className="mt-3 h-11 w-full rounded-xl bg-amber-600 font-black hover:bg-amber-700">
                    {settingPin ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                    Simpan PIN baru
                  </Button>
                  <button type="button" disabled={requestingPinReset} className="mt-3 w-full text-xs font-black text-amber-800 underline" onClick={() => void requestPinReset()}>
                    {requestingPinReset ? "Mengirim ulang..." : "Kirim ulang kode"}
                  </button>
                </>
              )}
              <button type="button" className="mt-3 w-full text-xs font-black text-slate-600 underline" onClick={() => { setPinResetRequested(false); setPinResetSent(false); setPinResetCode(""); setPaymentPin(""); setPinConfirmation(""); }}>Batal</button>
            </div>}
            {useWallet && paymentPinConfigured === true && !pinResetRequested && <div className="mt-7 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <Label className="font-black text-indigo-900">PIN pembayaran</Label>
              <Input required type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="mt-2 h-12 rounded-xl bg-white" value={paymentPin} onChange={(event) => setPaymentPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Masukkan 6 angka" />
                            <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-indigo-700">PIN hanya diperlukan saat memakai Saldo Bimbelku.</p>
                <button type="button" className="shrink-0 text-xs font-black text-indigo-700 underline" onClick={() => { setPinResetRequested(true); setPaymentPin(""); }}>Lupa PIN?</button>
              </div>
            </div>}
            {!walletOnly ? <div className="mt-7 space-y-5">
              <div><Label className="flex items-center gap-2 font-bold"><UserRound size={16} />Nama pemilik rekening</Label><Input required className="mt-2 h-12 rounded-xl" value={senderName} onChange={(event) => setSenderName(sanitizePersonName(event.target.value, 150))} /></div>
              <div><Label className="flex items-center gap-2 font-bold"><WalletCards size={16} />Bank/e-wallet asal</Label><Input required className="mt-2 h-12 rounded-xl" value={bankName} onChange={(event) => setBankName(event.target.value)} /></div>
              <div><Label className="flex items-center gap-2 font-bold"><CreditCard size={16} />Nomor rekening/e-wallet asal</Label><Input required inputMode="numeric" minLength={PAYMENT_ACCOUNT_MIN_DIGITS} maxLength={PAYMENT_ACCOUNT_MAX_DIGITS} className="mt-2 h-12 rounded-xl" value={senderAccountNumber} onChange={(event) => setSenderAccountNumber(sanitizeDigits(event.target.value, PAYMENT_ACCOUNT_MAX_DIGITS))} /><p className="mt-2 text-xs leading-5 text-slate-500">Masukkan {PAYMENT_ACCOUNT_MIN_DIGITS}–{PAYMENT_ACCOUNT_MAX_DIGITS} digit untuk membantu admin memverifikasi transfer. Jika ada refund, kamu akan memilih tujuan pengembalian dana sendiri.</p></div>
              <label className={`block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${proof ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40"}`}><Input required type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(event) => selectProof(event.target.files?.[0])} />{proof ? <><FileImage className="mx-auto text-emerald-600" /><p className="mt-3 truncate text-sm font-black text-emerald-800">{proof.name}</p><p className="mt-1 text-xs text-emerald-600">Klik untuk mengganti</p></> : <><Upload className="mx-auto text-indigo-500" /><p className="mt-3 text-sm font-black text-slate-800">Pilih foto bukti pembayaran</p><p className="mt-1 text-xs text-slate-500">JPG, PNG, atau WebP · maks. 5 MB</p></>}</label>
            </div> : <div className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><p className="font-black text-emerald-900">Saldo yang dipakai: {rupiah(walletAmount)}</p><p className="mt-2 text-xs leading-5 text-emerald-800">Tidak ada biaya yang harus ditransfer. Setelah dikonfirmasi, saldo langsung diterapkan ke tagihan ini.</p></div>}
            <Button disabled={submitting || paymentExpired || pinResetRequested || (useWallet && (paymentPinConfigured !== true || paymentPin.length !== 6)) || (externalDue > 0.01 && (!proof || !paymentDestinationReady))} className="mt-7 h-12 w-full rounded-xl bg-indigo-600 font-black hover:bg-indigo-700">{submitting ? <Loader2 size={18} className="mr-2 animate-spin" /> : walletOnly ? <WalletCards size={18} className="mr-2" /> : <CreditCard size={18} className="mr-2" />}{walletOnly ? "Bayar dengan saldo" : "Kirim untuk diperiksa"}</Button>
            {(!isCheapClass || order.canCancel) && <Button type="button" variant="ghost" onClick={cancel} className="mt-2 w-full rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700">{isCheapClass ? "Batalkan keikutsertaan" : "Batalkan tagihan"}</Button>}
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
