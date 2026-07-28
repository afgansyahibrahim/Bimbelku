import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSearch,
  Gavel,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  UserRoundX,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { openProtectedFile } from "@/components/ProtectedImage";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import http, { getApiError } from "@/lib/http";
import { validateUpload } from "@/lib/validation";

interface CaseData {
  session_reports: any[];
  disputes: any[];
  completion_reviews: any[];
  refunds: any[];
}

type CaseType = "report" | "dispute" | "completion" | "refund";

const emptyCases: CaseData = { session_reports: [], disputes: [], completion_reviews: [], refunds: [] };
const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

export default function CaseCenter() {
  const confirm = useConfirmDialog();
  const [data, setData] = useState<CaseData>(emptyCases);
  const [tab, setTab] = useState<CaseType>("report");
  const [selected, setSelected] = useState<{ type: CaseType; item: any } | null>(null);
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [penalty, setPenalty] = useState("10");
  const [proof, setProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const response = await http.get<CaseData>("/admin/cases");
      setData(response.data);
    } catch (error) {
      toast.error(getApiError(error, "Pusat kasus gagal dimuat."));
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    report: data.session_reports.length,
    dispute: data.disputes.length,
    completion: data.completion_reviews.length,
    refund: data.refunds.length,
  };
  const items = useMemo(() => {
    if (tab === "report") return data.session_reports;
    if (tab === "dispute") return data.disputes;
    if (tab === "completion") return data.completion_reviews;
    return data.refunds;
  }, [data, tab]);

  const openCase = (type: CaseType, item: any) => {
    setSelected({ type, item });
    setDecision(type === "report" ? "accepted" : type === "dispute" ? "teacher_paid" : type === "completion" ? "approve" : "paid");
    setNotes("");
    setPenalty(type === "report" && item.type === "teacher_emergency" ? "20" : "10");
    setProof(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const { type, item } = selected;
    const isRefund = type === "refund";
    const approved = await confirm({
      title: isRefund ? "Tandai refund telah ditransfer?" : "Simpan keputusan kasus?",
      description: isRefund
        ? `Pastikan transfer ${rupiah(Number(item.amount))} ke ${item.order?.bank_name || "rekening murid"} ${item.order?.sender_account_number || ""} benar-benar sudah dilakukan.`
        : "Keputusan ini mengubah status sesi, refund, pencairan, atau poin tutor.",
      confirmText: isRefund ? "Ya, refund terkirim" : "Simpan keputusan",
      tone: "warning",
    });
    if (!approved) return;

    setProcessing(true);
    try {
      let response;
      if (type === "report") {
        response = await http.post(`/admin/session-reports/${item.id}/resolve`, { decision, notes, penalty_points: Number(penalty) });
      } else if (type === "dispute") {
        response = await http.post(`/admin/disputes/${item.id}/resolve`, { resolution: decision, notes, penalty_points: decision === "student_refund" ? Number(penalty) : undefined });
      } else if (type === "completion") {
        response = await http.post(`/admin/bookings/${item.id}/completion-review`, { action: decision, notes });
      } else {
        if (!proof) {
          toast.error("Bukti transfer refund wajib diunggah.");
          setProcessing(false);
          return;
        }
        const payload = new FormData();
        payload.append("proof", proof);
        payload.append("notes", notes);
        response = await http.post(`/admin/refunds/${item.id}/complete`, payload);
      }
      toast.success(response.data.message);
      setSelected(null);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const selectRefundProof = (file?: File) => {
    const error = validateUpload(file, {
      label: "Bukti transfer refund",
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

  return (
    <AdminLayout title="Pusat Kasus">
      <div className="space-y-6 pb-12">
        <section className="flex flex-col justify-between gap-5 rounded-[2rem] bg-gradient-to-br from-slate-950 via-rose-950 to-indigo-950 p-7 text-white md:flex-row md:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-rose-200">Kontrol penyelesaian</p><h1 className="mt-3 text-3xl font-black">Sengketa, laporan, dan refund</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-rose-100/70">Semua kasus membutuhkan keputusan admin. Tidak ada persetujuan atau transfer uang otomatis.</p></div>
          <Button onClick={load} variant="outline" className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RefreshCw size={16} className="mr-2" />Muat ulang</Button>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TabCard active={tab === "report"} onClick={() => setTab("report")} icon={AlertTriangle} label="Laporan sesi" count={counts.report} />
          <TabCard active={tab === "dispute"} onClick={() => setTab("dispute")} icon={Gavel} label="Keberatan murid" count={counts.dispute} />
          <TabCard active={tab === "completion"} onClick={() => setTab("completion")} icon={FileSearch} label="Tinjau bukti" count={counts.completion} />
          <TabCard active={tab === "refund"} onClick={() => setTab("refund")} icon={RotateCcw} label="Antrean refund" count={counts.refund} />
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white">
          {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-indigo-600" /></div> : items.length === 0 ? <div className="py-20 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" /><p className="mt-3 font-black text-slate-700">Tidak ada kasus menunggu</p></div> : <div className="divide-y divide-slate-100">
            {items.map((item: any) => <CaseRow key={item.id} type={tab} item={item} onOpen={() => openCase(tab, item)} />)}
          </div>}
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[2rem] sm:max-w-2xl">
          {selected && <form onSubmit={submit} className="space-y-5">
            <DialogHeader><DialogTitle className="text-2xl">{caseTitle(selected.type, selected.item)}</DialogTitle><DialogDescription>{caseSubtitle(selected.type, selected.item)}</DialogDescription></DialogHeader>
            <CaseDetail type={selected.type} item={selected.item} />
            {selected.type !== "refund" && <div><Label>Keputusan</Label><Select value={decision} onValueChange={setDecision}><SelectTrigger className="mt-2 h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{selected.type === "report" ? <><SelectItem value="accepted">Laporan valid</SelectItem><SelectItem value="rejected">Laporan ditolak</SelectItem></> : selected.type === "dispute" ? <><SelectItem value="teacher_paid">Bukti tutor diterima</SelectItem><SelectItem value="student_refund">Refund penuh murid</SelectItem></> : <><SelectItem value="approve">Sahkan penyelesaian</SelectItem><SelectItem value="refund">Refund penuh</SelectItem></>}</SelectContent></Select></div>}
            {((selected.type === "report" && (
              (selected.item.type === "teacher_absence" && decision === "accepted")
              || (selected.item.type !== "teacher_absence" && decision === "rejected")
            )) || (selected.type === "dispute" && decision === "student_refund")) && <div><Label>Pengurangan poin tutor</Label><Select value={penalty} onValueChange={setPenalty}><SelectTrigger className="mt-2 h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{[5, 10, 15, 20, 30].map((value) => <SelectItem key={value} value={String(value)}>-{value} poin</SelectItem>)}</SelectContent></Select></div>}
            <div><Label>Catatan keputusan {selected.type === "refund" ? "(opsional)" : ""}</Label><Textarea required={selected.type !== "refund"} minLength={selected.type !== "refund" ? 20 : undefined} className="mt-2 min-h-32 rounded-xl" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Dasar pemeriksaan dan keputusan admin" /></div>
            {selected.type === "refund" && <div><Label>Bukti transfer refund</Label><Input required type="file" accept=".jpg,.jpeg,.png,.webp" className="mt-2" onChange={(event) => selectRefundProof(event.target.files?.[0])} /></div>}
            <Button disabled={processing} className="h-12 w-full rounded-xl bg-indigo-600 font-black hover:bg-indigo-700">{processing && <Loader2 size={17} className="mr-2 animate-spin" />}Simpan keputusan</Button>
          </form>}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function TabCard({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: typeof Gavel; label: string; count: number }) {
  return <button onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "border-slate-100 bg-white text-slate-700 hover:border-indigo-200"}`}><div className="flex items-center justify-between"><Icon size={20} /><span className={`rounded-full px-2 py-0.5 text-xs font-black ${active ? "bg-white/20" : "bg-slate-100"}`}>{count}</span></div><p className="mt-3 text-sm font-black">{label}</p></button>;
}

function CaseRow({ type, item, onOpen }: { type: CaseType; item: any; onOpen: () => void }) {
  const icon = type === "report" ? (item.type === "student_absence" ? UserRoundX : AlertTriangle) : type === "dispute" ? ShieldAlert : type === "completion" ? Clock3 : RotateCcw;
  const Icon = icon;
  const name = type === "report" ? (item.reporter?.name || item.teacher?.name) : type === "dispute" ? item.student?.name : type === "completion" ? item.teacher?.name : item.user?.name;
  const detail = type === "report" ? (item.incident_type || (item.type === "student_absence" ? "Murid tidak hadir" : item.type === "teacher_absence" ? "Tutor tidak hadir" : "Keadaan darurat")) : type === "dispute" ? item.reason : type === "completion" ? "Masa tanggapan 48 jam berakhir" : `${rupiah(Number(item.amount))} · ${item.reason}`;
  return <div className="flex flex-col justify-between gap-4 p-5 hover:bg-slate-50 sm:flex-row sm:items-center"><div className="flex min-w-0 gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Icon /></div><div className="min-w-0"><p className="font-black text-slate-900">{name || "Pengguna"} · Kasus #{item.id}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{detail}</p></div></div><Button variant="outline" className="rounded-xl" onClick={onOpen}>Periksa</Button></div>;
}

function CaseDetail({ type, item }: { type: CaseType; item: any }) {
  const evidence = type === "report"
    ? item.evidence_url
    : type === "dispute"
      ? item.evidence_url
      : type === "completion"
        ? item.completion_evidence_url
        : null;
  return <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">{type === "report" && <><p><strong>Kronologi:</strong> {item.chronology}</p>{item.incident_at && <p><strong>Waktu:</strong> {new Date(item.incident_at).toLocaleString("id-ID")}</p>}{item.incident_location && <p><strong>Lokasi:</strong> {item.incident_location}</p>}{item.impact && <p><strong>Dampak:</strong> {item.impact}</p>}</>}{type === "dispute" && <p><strong>Alasan keberatan:</strong> {item.reason}</p>}{type === "completion" && <p><strong>Catatan tutor:</strong> {item.completion_notes || "-"}</p>}{type === "refund" && <><p><strong>Murid:</strong> {item.user?.name}</p><p><strong>Nominal:</strong> {rupiah(Number(item.amount))}</p><p><strong>Tujuan refund:</strong> {item.order?.bank_name || "-"} · {item.order?.sender_account_number || "Nomor belum tercatat"} · a.n. {item.order?.sender_name || item.user?.name || "-"}</p><p><strong>Alasan:</strong> {item.reason}</p></>}{evidence && <Button type="button" variant="outline" size="sm" className="rounded-xl bg-white" onClick={() => void openProtectedFile(evidence, `bukti-kasus-${item.id}`).catch(() => toast.error("Bukti tidak dapat dibuka."))}><ExternalLink size={14} className="mr-2" />Buka bukti</Button>}</div>;
}

function caseTitle(type: CaseType, item: any) {
  if (type === "report") return item.type === "student_absence" ? "Laporan murid tidak hadir" : item.type === "teacher_absence" ? "Laporan tutor tidak hadir" : "Laporan keadaan darurat";
  if (type === "dispute") return "Keberatan murid";
  if (type === "completion") return "Tinjau bukti penyelesaian";
  return "Transfer refund penuh";
}

function caseSubtitle(type: CaseType, item: any) {
  if (type === "refund") return `${item.user?.name || "Murid"} · ${rupiah(Number(item.amount))}`;
  return `Kasus #${item.id} · keputusan disimpan dalam jejak administrasi`;
}
