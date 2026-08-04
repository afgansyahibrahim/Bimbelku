import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, FileText, Loader2, RefreshCw, ShieldAlert, Star, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import TeacherLayout from "@/components/TeacherLayout";
import { openProtectedFile } from "@/components/ProtectedImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import http, { getApiError } from "@/lib/http";
import { validateUpload } from "@/lib/validation";

type Appeal = { id: number; status: string; reason: string; review_notes?: string | null; evidence_url?: string | null };
type PointEntry = { id: number; subject?: string | null; change: number; balance_after: number; reason: string; notes?: string | null; created_at: string; can_appeal: boolean; appeal_deadline?: string | null; appeal?: Appeal | null };
type RatingItem = { id: number; student_name: string; subject?: string | null; rating: number; review?: string | null; created_at: string };
type PerformanceData = {
  points: number;
  recommendation_status: string;
  suspended_until?: string | null;
  appeal_window_days: number;
  rating: { average: number; count: number; distribution: Record<string, number> };
  ratings: RatingItem[];
  point_history: PointEntry[];
};

const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";

export default function TeacherPerformance() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [entry, setEntry] = useState<PointEntry | null>(null);
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"points" | "ratings">("points");

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await http.get<PerformanceData>("/teacher/performance");
      setData(response.data);
    } catch (error) {
      setFailed(true);
      toast.error(getApiError(error, "Performa tutor gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const maxDistribution = useMemo(() => Math.max(1, ...Object.values(data?.rating.distribution || {})), [data]);

  const selectEvidence = (file?: File) => {
    const error = validateUpload(file, { label: "Bukti banding", maxSizeMb: 5, extensions: ["jpg", "jpeg", "png", "webp", "pdf"] });
    if (error) { toast.error(error); setEvidence(null); return; }
    setEvidence(file || null);
  };

  const submitAppeal = async (event: FormEvent) => {
    event.preventDefault();
    if (!entry) return;
    const payload = new FormData();
    payload.append("reason", reason.trim());
    if (evidence) payload.append("evidence", evidence);
    setSubmitting(true);
    try {
      const response = await http.post(`/teacher/point-ledgers/${entry.id}/appeals`, payload);
      toast.success(response.data.message);
      setEntry(null); setReason(""); setEvidence(null);
      await load();
    } catch (error) {
      toast.error(getApiError(error, "Banding gagal dikirim."));
    } finally { setSubmitting(false); }
  };

  return (
    <TeacherLayout title="Performa & Banding">
      <div className="space-y-5 pb-10 sm:space-y-7">
        <section className="rounded-[1.7rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-indigo-200">Kualitas mengajar</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Performa tutor</h1><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/75">Poin menentukan prioritas penawaran. Penalti dapat dibanding selama batas pengajuan masih aktif.</p></div><Button variant="outline" onClick={() => void load()} className="h-11 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RefreshCw size={16} className="mr-2" />Muat ulang</Button></div>
        </section>

        {loading ? <div className="grid min-h-80 place-items-center rounded-[2rem] bg-white"><Loader2 className="animate-spin text-indigo-600" size={30} /></div> : failed || !data ? <div className="rounded-[2rem] bg-white p-16 text-center"><ShieldAlert className="mx-auto text-rose-300" /><p className="mt-3 font-black">Data belum dapat dimuat</p><Button onClick={() => void load()} className="mt-4 rounded-xl bg-indigo-600">Coba lagi</Button></div> : <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Metric icon={BarChart3} label="Poin saat ini" value={String(data.points)} detail={data.recommendation_status} color="bg-indigo-600" />
            <Metric icon={Star} label="Nilai rata-rata" value={data.rating.count ? data.rating.average.toFixed(1) : "-"} detail={`${data.rating.count} penilaian`} color="bg-amber-500" />
            <Metric icon={AlertTriangle} label="Masa banding" value={`${data.appeal_window_days} hari`} detail={data.suspended_until ? `Ditangguhkan sampai ${dateTime(data.suspended_until)}` : "Akun tidak ditangguhkan"} color="bg-rose-500" />
          </section>

          <section className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm sm:rounded-[2rem]">
            <div className="grid grid-cols-2 border-b border-slate-100 p-2"><button type="button" onClick={() => setTab("points")} className={`rounded-xl px-3 py-3 text-sm font-black ${tab === "points" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Poin & penalti</button><button type="button" onClick={() => setTab("ratings")} className={`rounded-xl px-3 py-3 text-sm font-black ${tab === "ratings" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Penilaian murid</button></div>
            {tab === "points" ? <div className="divide-y divide-slate-100">{data.point_history.length ? data.point_history.map((item) => <article key={item.id} className="p-4 sm:p-5"><div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${item.change < 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>{item.change < 0 ? <TrendingDown size={18} /> : <TrendingUp size={18} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black text-slate-900">{item.reason}</p><p className="mt-1 text-xs text-slate-500">{item.subject || "Aktivitas akun"} · {dateTime(item.created_at)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${item.change < 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{item.change > 0 ? "+" : ""}{item.change} poin</span></div>{item.notes && <p className="mt-3 break-words rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{item.notes}</p>}<div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="font-bold text-slate-500">Saldo: {item.balance_after}</span>{item.appeal ? <button type="button" onClick={() => item.appeal?.evidence_url && void openProtectedFile(item.appeal.evidence_url, `bukti-banding-${item.appeal.id}`).catch(() => toast.error("Bukti tidak dapat dibuka."))} className={`rounded-full px-3 py-1 font-black ${item.appeal.status === "approved" ? "bg-emerald-50 text-emerald-700" : item.appeal.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>Banding: {item.appeal.status}{item.appeal.evidence_url ? " · lihat bukti" : ""}</button> : item.can_appeal ? <Button size="sm" variant="outline" onClick={() => { setEntry(item); setReason(""); setEvidence(null); }} className="h-8 rounded-lg border-rose-200 text-rose-700">Ajukan banding</Button> : item.change < 0 ? <span className="text-slate-400">Masa banding berakhir {dateTime(item.appeal_deadline)}</span> : null}</div>{item.appeal?.review_notes && <p className="mt-2 text-xs leading-5 text-slate-500">Catatan admin: {item.appeal.review_notes}</p>}</div></div></article>) : <Empty text="Belum ada perubahan poin." />}</div> : <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[16rem_1fr]"><div className="rounded-2xl bg-slate-50 p-5"><p className="text-sm font-black text-slate-900">Sebaran nilai</p><div className="mt-4 space-y-3">{[5,4,3,2,1].map((star) => { const count = data.rating.distribution[String(star)] || 0; return <div key={star} className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2 text-xs"><span className="font-black text-amber-600">{star}★</span><span className="h-2 overflow-hidden rounded-full bg-white"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${count / maxDistribution * 100}%` }} /></span><span className="text-right font-bold text-slate-500">{count}</span></div>; })}</div></div><div className="space-y-3">{data.ratings.length ? data.ratings.map((item) => <article key={item.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900">{item.student_name}</p><p className="mt-1 text-xs text-slate-400">{item.subject || "Bimbingan"} · {dateTime(item.created_at)}</p></div><span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{item.rating} ★</span></div><p className="mt-3 break-words text-sm leading-6 text-slate-600">{item.review || "Tidak ada ulasan tertulis."}</p></article>) : <Empty text="Belum ada penilaian murid." />}</div></div>}
          </section>
        </>}
      </div>

      <Dialog open={Boolean(entry)} onOpenChange={(open) => !open && setEntry(null)}><DialogContent className="max-h-[92dvh] overflow-y-auto rounded-[1.7rem] sm:max-w-lg sm:rounded-[2rem]"><DialogHeader><DialogTitle>Ajukan banding penalti</DialogTitle><DialogDescription>Jelaskan alasan dengan data yang dapat diperiksa. Poin tetap berlaku sampai admin mengambil keputusan.</DialogDescription></DialogHeader><form onSubmit={submitAppeal} className="space-y-4"><div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><b>{entry?.reason}</b> · {entry?.change} poin</div><div><Label>Alasan banding</Label><Textarea required minLength={30} maxLength={3000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-36 rounded-xl" placeholder="Tuliskan kronologi dan alasan penalti perlu diperiksa ulang" /></div><div><Label>Bukti pendukung (opsional)</Label><Input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="mt-2" onChange={(event) => selectEvidence(event.target.files?.[0])} />{evidence && <p className="mt-2 flex min-w-0 items-center gap-2 text-xs font-bold text-indigo-700"><FileText size={14} /><span className="truncate">{evidence.name}</span></p>}</div><Button disabled={submitting} className="h-11 w-full rounded-xl bg-indigo-600">{submitting ? <Loader2 className="mr-2 animate-spin" size={16} /> : <CheckCircle2 className="mr-2" size={16} />}Kirim banding</Button></form></DialogContent></Dialog>
    </TeacherLayout>
  );
}

function Metric({ icon: Icon, label, value, detail, color }: { icon: typeof Star; label: string; value: string; detail: string; color: string }) {
  return <div className="flex min-w-0 items-center gap-3 rounded-[1.4rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white ${color}`}><Icon size={19} /></span><span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span><span className="mt-1 block text-xl font-black text-slate-900">{value}</span><span className="mt-1 block break-words text-[11px] text-slate-500">{detail}</span></span></div>;
}
function Empty({ text }: { text: string }) { return <div className="py-16 text-center text-sm text-slate-500">{text}</div>; }
