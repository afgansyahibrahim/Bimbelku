import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import http, { getApiError } from "@/lib/http";

interface CaseData {
  session_reports: any[];
  disputes: any[];
  completion_reviews: any[];
  teacher_appeals: any[];
}

type CaseType = "report" | "dispute" | "completion" | "appeal";

const emptyCases: CaseData = { session_reports: [], disputes: [], completion_reviews: [], teacher_appeals: [] };

export default function CaseCenter() {
  const confirm = useConfirmDialog();
  const [data, setData] = useState<CaseData>(emptyCases);
  const [tab, setTab] = useState<CaseType>("report");
  const [selected, setSelected] = useState<{ type: CaseType; item: any } | null>(null);
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [penalty, setPenalty] = useState("10");
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
    appeal: data.teacher_appeals.length,
  };
  const items = useMemo(() => {
    if (tab === "report") return data.session_reports;
    if (tab === "dispute") return data.disputes;
    if (tab === "completion") return data.completion_reviews;
    return data.teacher_appeals;
  }, [data, tab]);

  const openCase = (type: CaseType, item: any) => {
    setSelected({ type, item });
    setDecision(type === "report" ? "accepted" : type === "dispute" ? "teacher_paid" : type === "completion" ? "approve" : "approved");
    setNotes("");
    setPenalty(type === "report" && item.type === "teacher_emergency" ? "20" : "10");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const { type, item } = selected;
    const approved = await confirm({
      title: "Simpan keputusan kasus?",
      description: "Keputusan ini dapat mengubah status sesi, membuat antrean refund, atau mengubah poin tutor.",
      confirmText: "Simpan keputusan",
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
        response = await http.post(`/admin/teacher-appeals/${item.id}/resolve`, { decision, notes });
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

  return (
    <AdminLayout title="Pusat Kasus">
      <div className="space-y-6 pb-12">
        <section className="flex flex-col justify-between gap-5 rounded-[2rem] bg-gradient-to-br from-slate-950 via-rose-950 to-indigo-950 p-7 text-white md:flex-row md:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-rose-200">Kontrol penyelesaian</p><h1 className="mt-3 text-3xl font-black">Sengketa dan laporan operasional</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-rose-100/70">Pusat kasus menetapkan keputusan. Transfer refund berikutnya diproses terpisah pada menu Refund & Saldo BimbelKu.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row"><Button asChild variant="outline" className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Link to="/admin/refunds"><RotateCcw size={16} className="mr-2" />Buka refund & saldo</Link></Button><Button onClick={load} variant="outline" className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RefreshCw size={16} className="mr-2" />Muat ulang</Button></div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TabCard active={tab === "report"} onClick={() => setTab("report")} icon={AlertTriangle} label="Laporan sesi" count={counts.report} />
          <TabCard active={tab === "dispute"} onClick={() => setTab("dispute")} icon={Gavel} label="Keberatan murid" count={counts.dispute} />
          <TabCard active={tab === "completion"} onClick={() => setTab("completion")} icon={FileSearch} label="Tinjau bukti" count={counts.completion} />
          <TabCard active={tab === "appeal"} onClick={() => setTab("appeal")} icon={Gavel} label="Banding tutor" count={counts.appeal} />
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white">
          {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-indigo-600" /></div> : items.length === 0 ? <div className="py-20 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" /><p className="mt-3 font-black text-slate-700">Tidak ada kasus menunggu</p></div> : <div className="divide-y divide-slate-100">
            {items.map((item: any) => <CaseRow key={item.id} type={tab} item={item} onOpen={() => openCase(tab, item)} />)}
          </div>}
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-[2rem] sm:max-w-2xl">
          {selected && <form onSubmit={submit} className="space-y-5">
            <DialogHeader><DialogTitle className="text-2xl">{caseTitle(selected.type, selected.item)}</DialogTitle><DialogDescription>{caseSubtitle(selected.item)}</DialogDescription></DialogHeader>
            <CaseDetail type={selected.type} item={selected.item} />
            <div><Label>Keputusan</Label><Select value={decision} onValueChange={setDecision}><SelectTrigger className="mt-2 h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{selected.type === "report" ? <><SelectItem value="accepted">Laporan valid</SelectItem><SelectItem value="rejected">Laporan ditolak</SelectItem></> : selected.type === "dispute" ? <><SelectItem value="teacher_paid">Bukti tutor diterima</SelectItem><SelectItem value="student_refund">Refund penuh murid</SelectItem></> : selected.type === "appeal" ? <><SelectItem value="approved">Terima banding dan pulihkan poin</SelectItem><SelectItem value="rejected">Tolak banding</SelectItem></> : <><SelectItem value="approve">Sahkan penyelesaian</SelectItem><SelectItem value="refund">Refund penuh</SelectItem></>}</SelectContent></Select></div>
            {((selected.type === "report" && (
              (selected.item.type === "teacher_absence" && decision === "accepted")
              || (selected.item.type !== "teacher_absence" && decision === "rejected")
            )) || (selected.type === "dispute" && decision === "student_refund")) && <div><Label>Pengurangan poin tutor</Label><Select value={penalty} onValueChange={setPenalty}><SelectTrigger className="mt-2 h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{[5, 10, 15, 20, 30].map((value) => <SelectItem key={value} value={String(value)}>-{value} poin</SelectItem>)}</SelectContent></Select></div>}
            <div><Label>Catatan keputusan</Label><Textarea required minLength={20} className="mt-2 min-h-32 rounded-xl" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Dasar pemeriksaan dan keputusan admin" /></div>
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
  const icon = type === "report" ? (item.type === "student_absence" ? UserRoundX : AlertTriangle) : type === "dispute" ? ShieldAlert : type === "completion" ? Clock3 : Gavel;
  const Icon = icon;
  const name = type === "report" ? (item.reporter?.name || item.teacher?.name) : type === "dispute" ? item.student?.name : item.teacher?.name;
  const detail = type === "report" ? (item.incident_type || (item.type === "student_absence" ? "Murid tidak hadir" : item.type === "teacher_absence" ? "Tutor tidak hadir" : "Keadaan darurat")) : type === "dispute" ? item.reason : type === "completion" ? "Masa tanggapan 48 jam berakhir" : `${item.point_entry?.change || 0} poin · ${item.reason}`;
  return <div className="flex flex-col justify-between gap-4 p-5 hover:bg-slate-50 sm:flex-row sm:items-center"><div className="flex min-w-0 gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Icon /></div><div className="min-w-0"><p className="font-black text-slate-900">{name || "Pengguna"} · Kasus #{item.id}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{detail}</p></div></div><Button variant="outline" className="rounded-xl" onClick={onOpen}>Periksa</Button></div>;
}

function CaseDetail({ type, item }: { type: CaseType; item: any }) {
  const evidence = type === "report"
    ? item.evidence_url
    : type === "dispute"
      ? item.evidence_url
      : type === "completion"
        ? item.completion_evidence_url
        : item.evidence_url;
  return <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">{type === "report" && <><p><strong>Kronologi:</strong> {item.chronology}</p>{item.incident_at && <p><strong>Waktu:</strong> {new Date(item.incident_at).toLocaleString("id-ID")}</p>}{item.incident_location && <p><strong>Lokasi:</strong> {item.incident_location}</p>}{item.impact && <p><strong>Dampak:</strong> {item.impact}</p>}</>}{type === "dispute" && <p><strong>Alasan keberatan:</strong> {item.reason}</p>}{type === "completion" && <p><strong>Catatan tutor:</strong> {item.completion_notes || "-"}</p>}{type === "appeal" && <><p><strong>Penalti:</strong> {item.point_entry?.change || 0} poin · {item.point_entry?.reason || "-"}</p><p><strong>Catatan penalti:</strong> {item.point_entry?.notes || "-"}</p><p><strong>Alasan banding:</strong> {item.reason}</p></>}{evidence && <Button type="button" variant="outline" size="sm" className="rounded-xl bg-white" onClick={() => void openProtectedFile(evidence, `bukti-kasus-${item.id}`).catch(() => toast.error("Bukti tidak dapat dibuka."))}><ExternalLink size={14} className="mr-2" />Buka bukti</Button>}</div>;
}

function caseTitle(type: CaseType, item: any) {
  if (type === "report") return item.type === "student_absence" ? "Laporan murid tidak hadir" : item.type === "teacher_absence" ? "Laporan tutor tidak hadir" : "Laporan keadaan darurat";
  if (type === "dispute") return "Keberatan murid";
  if (type === "completion") return "Tinjau bukti penyelesaian";
  return "Banding penalti tutor";
}

function caseSubtitle(item: any) {
  return `Kasus #${item.id} · keputusan disimpan dalam jejak administrasi`;
}
