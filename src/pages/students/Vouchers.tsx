import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, Tag, TicketPercent } from "lucide-react";
import { toast } from "sonner";

import StudentLayout from "@/components/StudentLayout";
import http, { getApiError, getCached } from "@/lib/http";

type Promotion = {
  id: number;
  title: string;
  code?: string | null;
  description?: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_purchase: number;
  ends_at?: string | null;
  total_quota?: number | null;
  used_quota?: number;
};
type Claim = { id: number; status: string; claimed_at: string; used_at?: string | null; promotion: Promotion };

const discountLabel = (item: Promotion) =>
  item.discount_type === "percentage"
    ? `${Number(item.discount_value)}%`
    : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.discount_value);

export default function Vouchers() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [offers, setOffers] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);

  const load = async () => {
    try {
      const [claimsResponse, offersResponse] = await Promise.all([
        getCached<{ data: Claim[] }>("/student/vouchers", { maxAgeMs: 10_000, force: true }),
        getCached<Promotion[]>("/content/promotions", { maxAgeMs: 30_000, force: true }),
      ]);
      setClaims(claimsResponse.data.data);
      setOffers(offersResponse.data);
    } catch (error) {
      toast.error(getApiError(error, "Voucher gagal dimuat."));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const claim = async (promotionId: number) => {
    setClaiming(promotionId);
    try {
      const response = await http.post(`/student/promotions/${promotionId}/claim`);
      toast.success(response.data.message);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setClaiming(null);
    }
  };

  const availableClaims = claims.filter((item) => item.status === "available");
  return (
    <StudentLayout title="Voucher">
      <div className="space-y-7 pb-20">
        <section className="rounded-[2rem] bg-gradient-to-br from-rose-600 via-orange-500 to-amber-400 p-6 text-white sm:p-8">
          <Tag size={28} />
          <h1 className="mt-4 text-3xl font-black">Voucher dan penawaran</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">Klaim promo dari banner atau masukkan kode saat membuat paket. Satu paket memakai satu promo.</p>
        </section>

        {loading ? (
          <div className="grid min-h-56 place-items-center"><Loader2 className="animate-spin text-orange-500" size={34} /></div>
        ) : (
          <>
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div><h2 className="text-xl font-black text-slate-900">Voucher Saya</h2><p className="text-sm text-slate-500">{availableClaims.length} voucher siap digunakan</p></div>
                <Link to="/student/packages/new" className="text-sm font-black text-indigo-600">Buat Paket</Link>
              </div>
              {availableClaims.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {availableClaims.map((claimItem) => <VoucherCard key={claimItem.id} promotion={claimItem.promotion} status="Tersimpan" />)}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">Belum ada voucher yang diklaim.</div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900">Penawaran tersedia</h2>
              <p className="mt-1 text-sm text-slate-500">Buka detail atau klaim penawaran sebelum kuota habis.</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {offers.map((offer) => {
                  const owned = availableClaims.some((claimItem) => claimItem.promotion.id === offer.id);
                  return (
                    <div key={offer.id} className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-100" />
                      <div className="relative">
                        <div className="flex items-start justify-between gap-3">
                          <div><span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-700">🏷️ {discountLabel(offer)}</span><h3 className="mt-3 text-xl font-black text-slate-900">{offer.title}</h3></div>
                          <TicketPercent className="text-orange-500" />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{offer.description}</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <Link to={`/student/offers/${offer.id}`} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Detail <ArrowRight size={14} /></Link>
                          <button type="button" disabled={owned || claiming === offer.id} onClick={() => claim(offer.id)} className="inline-flex items-center gap-1 rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white disabled:bg-emerald-500">
                            {claiming === offer.id ? <Loader2 className="animate-spin" size={14} /> : owned ? <CheckCircle2 size={14} /> : <Tag size={14} />}
                            {owned ? "Sudah diklaim" : "Klaim Penawaran"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </StudentLayout>
  );
}

function VoucherCard({ promotion, status }: { promotion: Promotion; status: string }) {
  return <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white"><div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[22px] border-white/5" /><span className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">{status}</span><h3 className="mt-3 text-xl font-black">{promotion.title}</h3><p className="mt-2 text-sm text-slate-400">{promotion.code ? `Kode ${promotion.code}` : "Pilih saat membuat paket"}</p><div className="mt-5 flex items-end justify-between"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">🏷️ {discountLabel(promotion)}</span>{promotion.ends_at && <span className="text-[10px] text-slate-400">Sampai {new Date(promotion.ends_at).toLocaleDateString("id-ID")}</span>}</div></div>;
}
