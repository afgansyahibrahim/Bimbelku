import { notify } from "@/lib/notify";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, RefreshCw, Tag, TicketPercent, WifiOff } from "lucide-react";
import axios from "axios";

import StudentLayout from "@/components/StudentLayout";
import http, { getApiError, getCached } from "@/lib/http";

type ErrorType = "network" | "unauthorized" | "forbidden" | "not_found" | "generic" | null;

export default function PromotionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<ErrorType>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setError(null);
    void Promise.all([
      getCached(`/content/promotions/${id}`, { maxAgeMs: 0, force: true }),
      getCached<{ data: any[] }>("/student/vouchers", { maxAgeMs: 0, force: true }),
    ]).then(([promotionResponse, voucherResponse]) => {
      setPromotion(promotionResponse.data);
      setClaimed(voucherResponse.data.data.some((item) => item.promotion?.id === Number(id) && item.status === "available"));
    }).catch((err: unknown) => {
      if (axios.isAxiosError(err)) {
        if (!err.response) setError("network");
        else if (err.response.status === 401) setError("unauthorized");
        else if (err.response.status === 403) setError("forbidden");
        else if (err.response.status === 404) setError("not_found");
        else setError("generic");
      } else {
        setError("generic");
      }
    });
  }, [id, retryKey]);

  const handleRetry = () => { setError(null); setPromotion(null); setRetryKey((k) => k + 1); };

  const claim = async () => {
    setClaiming(true);
    try {
      const response = await http.post(`/student/promotions/${id}/claim`);
      notify.success(response.data.message);
      setClaimed(true);
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setClaiming(false);
    }
  };

  if (error) {
    return (
      <StudentLayout title="Detail Penawaran">
        <div className="mx-auto max-w-xl py-20">
          <ErrorState type={error} onRetry={handleRetry} />
        </div>
      </StudentLayout>
    );
  }

  if (!promotion) return <StudentLayout title="Detail Penawaran"><div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-orange-500" size={34} /></div></StudentLayout>;
  const percent = promotion.discount_type === "percentage" ? `${Number(promotion.discount_value)}%` : "Potongan nominal";
  return (
    <StudentLayout title="Detail Penawaran">
      <div className="mx-auto max-w-3xl pb-20">
        <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 text-sm font-black text-slate-500"><ArrowLeft size={17} /> Kembali</button>
        <article className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-xl sm:rounded-[2.5rem]">
          <div className="relative min-h-56 overflow-hidden bg-gradient-to-br from-orange-500 via-rose-500 to-violet-700 p-5 text-white sm:min-h-72 sm:p-8">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[38px] border-white/10" />
            <TicketPercent className="relative" size={40} />
            <div className="relative mt-12 sm:mt-16">
              <span className="inline-flex rounded-full bg-slate-950/25 px-3 py-1 text-xs font-black backdrop-blur">🏷️ {percent}</span>
              <h1 className="mt-4 break-words text-3xl font-black sm:text-4xl">{promotion.title}</h1>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <p className="text-base font-semibold leading-7 text-slate-600">{promotion.description}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Rule label="Minimal pembelian" value={new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(promotion.minimum_purchase || 0)} />
              <Rule label="Kuota tersisa" value={promotion.total_quota ? `${Math.max(0, promotion.total_quota - (promotion.used_quota || 0))} klaim` : "Tanpa batas total"} />
              <Rule label="Masa berlaku" value={promotion.ends_at ? new Date(promotion.ends_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Sampai dinonaktifkan"} />
              <Rule label="Kode promo" value={promotion.code || "Klaim ke Voucher Saya"} />
              <Rule label="Paket" value={promotion.target_plans?.length ? promotion.target_plans.join(", ") : "Semua paket"} />
              <Rule label="Jenjang" value={promotion.target_levels?.length ? promotion.target_levels.join(", ") : "Semua jenjang"} />
              <Rule label="Mata pelajaran" value={promotion.target_subjects?.length ? promotion.target_subjects.join(", ") : "Semua mapel"} />
              <Rule label="Metode" value={promotion.target_modes?.length ? promotion.target_modes.map((mode: string) => mode === "online" ? "Online" : "Offline").join(", ") : "Online dan offline"} />
            </div>
            <button type="button" onClick={claim} disabled={claimed || claiming} className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 font-black text-white disabled:bg-emerald-500">
              {claiming ? <Loader2 className="animate-spin" size={19} /> : claimed ? <CheckCircle2 size={19} /> : <Tag size={19} />}
              {claimed ? "Sudah masuk Voucher Saya" : "Klaim Penawaran"}
            </button>
            {claimed && <Link to="/student/packages/new" className="mt-3 flex h-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">Gunakan untuk Paket</Link>}
          </div>
        </article>
      </div>
    </StudentLayout>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-black text-slate-800">{value}</p></div>;
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
