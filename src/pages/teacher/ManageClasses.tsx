import { FormEvent, useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileWarning,
  GraduationCap,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  Monitor,
  RefreshCw,
  ShieldAlert,
  UserRoundX,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import TeacherLayout from "@/components/TeacherLayout";
import CameraCapture from "@/components/CameraCapture";
import LearningSessionHub from "@/components/LearningSessionHub";
import ProtectedImage, { openProtectedFile } from "@/components/ProtectedImage";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import http, { getApiError } from "@/lib/http";
import { isValidHttpUrl, validateUpload } from "@/lib/validation";

interface Participant {
  id: number;
  student_id: number;
  name: string;
  status: string;
  amount: number;
  order_status: string;
  refund_status?: string;
}

interface TeacherClass {
  id: number;
  subject: string;
  education_level?: string;
  grade?: string;
  chapter?: string;
  subtopic?: string;
  topic?: string;
  learning_goal?: string;
  attachment_url?: string;
  method: "online" | "offline";
  type: "private" | "group";
  status: string;
  start_at: string;
  end_at: string;
  duration_hours: number;
  meeting_link?: string;
  address?: string;
  maps_link?: string;
  gross_amount?: number;
  teacher_net_amount?: number;
  commission_percent: number;
  payout_status: string;
  completion_evidence_url?: string;
  completion_notes?: string;
  objection_deadline?: string;
  participants: Participant[];
  latest_report?: { type: string; status: string; chronology: string };
  latest_dispute?: { status: string; reason: string };
  can_complete: boolean;
  can_report_absence: boolean;
  can_report_emergency: boolean;
}

type Action = "complete" | "absence" | "emergency";

const statusLabels: Record<string, string> = {
  awaiting_payment: "Menunggu pembayaran",
  payment_submitted: "Bukti diperiksa",
  confirmed: "Terjadwal",
  in_progress: "Berlangsung",
  awaiting_student_approval: "Menunggu murid",
  disputed: "Keberatan diperiksa",
  absence_review: "Kehadiran diperiksa",
  admin_review_required: "Diperiksa admin",
  completed: "Selesai",
  emergency_refund_pending: "Refund darurat",
  refund_pending: "Refund diproses",
  refunded: "Direfund",
};

const rupiah = (value?: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
const dateTime = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
const localDateTimeInput = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function ManageClasses() {
  const confirm = useConfirmDialog();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeacherClass | null>(null);
  const [action, setAction] = useState<{ type: Action; item: TeacherClass } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [evidenceCapturedAt, setEvidenceCapturedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [studentId, setStudentId] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [incidentAt, setIncidentAt] = useState("");
  const [incidentLocation, setIncidentLocation] = useState("");
  const [impact, setImpact] = useState("");
  const [hubBookingId, setHubBookingId] = useState<number | null>(null);

  useEffect(() => { void loadClasses(); }, []);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const response = await http.get<TeacherClass[]>("/teacher/classes");
      setClasses(response.data);
      setSelected((current) => current ? response.data.find((item) => item.id === current.id) || null : null);
    } catch (error) {
      toast.error(getApiError(error, "Daftar kelas gagal dimuat."));
    } finally {
      setLoading(false);
    }
  };

  const saveMeetingLink = async (item: TeacherClass) => {
    if (meetingLink && !isValidHttpUrl(meetingLink)) {
      toast.error("Tautan kelas harus diawali http:// atau https://.");
      return;
    }
    setProcessing(true);
    try {
      const response = await http.put(`/teacher/classes/${item.id}`, { meeting_link: meetingLink });
      toast.success(response.data.message);
      await loadClasses();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const openAction = (type: Action, item: TeacherClass) => {
    setAction({ type, item });
    setEvidence(null);
    setEvidenceCapturedAt("");
    setNotes("");
    setStudentId(item.type === "private" ? String(item.participants[0]?.student_id || "") : "");
    setIncidentType("");
    setIncidentAt(localDateTimeInput());
    setIncidentLocation("");
    setImpact("");
  };

  const submitAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!action || !evidence) return;
    if (action.type === "absence" && action.item.type === "group" && !studentId) {
      toast.error("Pilih murid yang dilaporkan tidak hadir.");
      return;
    }

    if (action.type === "emergency") {
      const accepted = await confirm({
        title: "Laporkan keadaan darurat?",
        description: "Sesi akan dihentikan dan refund penuh murid langsung masuk antrean transfer admin. Admin tetap memeriksa kebenaran laporan.",
        confirmText: "Kirim laporan",
        tone: "warning",
      });
      if (!accepted) return;
    }

    const payload = new FormData();
    payload.append("evidence", evidence);
    let endpoint = "";
    if (action.type === "complete") {
      endpoint = "complete";
      payload.append("notes", notes);
      payload.append("capture_source", "camera");
      payload.append("captured_at", evidenceCapturedAt);
    } else if (action.type === "absence") {
      endpoint = "absence";
      payload.append("chronology", notes);
      if (studentId) payload.append("student_id", studentId);
    } else {
      endpoint = "emergency";
      payload.append("incident_type", incidentType);
      payload.append("chronology", notes);
      payload.append("incident_at", incidentAt);
      payload.append("incident_location", incidentLocation);
      payload.append("impact", impact);
    }

    setProcessing(true);
    try {
      const response = await http.post(`/teacher/bookings/${action.item.id}/${endpoint}`, payload);
      toast.success(response.data.message);
      setAction(null);
      setSelected(null);
      await loadClasses();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const selectEvidence = (file?: File) => {
    const completionOnly = action?.type === "complete";
    const error = validateUpload(file, {
      label: completionOnly ? "Foto pelaksanaan" : "Bukti laporan",
      maxSizeMb: 5,
      extensions: completionOnly
        ? ["jpg", "jpeg", "png", "webp"]
        : ["jpg", "jpeg", "png", "webp", "pdf"],
    });
    if (error) {
      toast.error(error);
      setEvidence(null);
      return;
    }
    setEvidence(file || null);
  };

  if (loading) {
    return <TeacherLayout title="Kelas Saya"><div className="grid min-h-[65vh] place-items-center"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></div></TeacherLayout>;
  }

  return (
    <TeacherLayout title="Kelas Saya">
      <div className="mx-auto max-w-7xl space-y-7 pb-12">
        <section className="flex flex-col justify-between gap-5 rounded-[1.7rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-7 md:flex-row md:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Pelaksanaan sesi</p><h1 className="mt-3 text-2xl font-black sm:text-3xl">Kelas yang sudah dipesan</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/75">Kelola tautan, lihat lokasi, kirim bukti selesai, atau laporkan ketidakhadiran dan keadaan darurat.</p></div>
          <Button onClick={loadClasses} variant="outline" className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RefreshCw size={16} className="mr-2" />Muat ulang</Button>
        </section>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["Check-in PIN", "Catat kehadiran", "Check-out & laporan", "Foto bukti selesai"].map((label, index) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"><span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-700">{index + 1}</span><p className="mt-2 text-xs font-black leading-5 text-slate-700">{label}</p></div>)}
        </section>

        {classes.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white py-20 text-center"><BookOpen className="mx-auto h-11 w-11 text-slate-300" /><p className="mt-4 font-black text-slate-800">Belum ada kelas terkonfirmasi</p><p className="mt-1 text-sm text-slate-500">Permintaan baru tersedia pada menu Permintaan Bimbel.</p></div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((item) => (
              <article key={item.id} className="flex flex-col rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-start justify-between gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">{item.method === "online" ? <Monitor /> : <MapPin />}</div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700">{statusLabels[item.status] || item.status}</span></div>
                <p className="mt-5 text-xs font-black uppercase tracking-widest text-indigo-500">{item.subject} · {item.type === "group" ? "Kelompok" : "Privat"}</p><h2 className="mt-1 text-xl font-black text-slate-900">{item.chapter || item.topic || "Sesi belajar"}</h2>
                <div className="mt-4 space-y-2 text-xs text-slate-600"><Info icon={CalendarDays} text={dateTime(item.start_at)} /><Info icon={Users} text={`${item.participants.length} murid`} /><Info icon={Clock3} text={`${item.duration_hours} jam`} /></div>
                <div className="mt-auto pt-5"><Button variant="outline" onClick={() => { setSelected(item); setMeetingLink(item.meeting_link || ""); }} className="w-full rounded-xl">Kelola sesi</Button></div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-[2rem] sm:max-w-2xl">
          {selected && <>
            <DialogHeader><DialogTitle className="text-2xl">{selected.subject} · {selected.chapter || selected.topic || "Sesi belajar"}</DialogTitle><DialogDescription>{dateTime(selected.start_at)} · {selected.type === "group" ? "Kelompok" : "Privat"}</DialogDescription></DialogHeader>
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><Info icon={GraduationCap} text={`${selected.education_level || ""} ${selected.grade || ""}`} /><Info icon={Clock3} text={`${new Date(selected.start_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}–${new Date(selected.end_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`} /><Info icon={selected.method === "online" ? Monitor : MapPin} text={selected.method === "online" ? "Online" : selected.address || "Alamat murid"} /><Info icon={WalletCards} text={`Komisi admin ${selected.commission_percent}%`} /></div>
            {selected.learning_goal && <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4"><p className="text-xs font-black uppercase tracking-widest text-indigo-500">Tujuan murid</p><p className="mt-2 text-sm leading-6 text-indigo-900">{selected.learning_goal}</p></div>}
            {selected.attachment_url && <Button type="button" variant="outline" className="rounded-xl" onClick={() => void openProtectedFile(selected.attachment_url!, "lampiran-materi").catch(() => toast.error("Lampiran tidak dapat dibuka."))}><ExternalLink size={16} className="mr-2" />Buka lampiran materi</Button>}
            {selected.method === "online" ? <div><Label className="font-bold">Tautan Google Meet/Zoom</Label><div className="mt-2 flex gap-2"><Input type="url" className="h-11 rounded-xl" value={meetingLink} onChange={(event) => setMeetingLink(event.target.value)} placeholder="https://..." /><Button aria-label="Simpan tautan kelas" onClick={() => saveMeetingLink(selected)} disabled={processing} className="rounded-xl bg-indigo-600"><Link2 size={16} /></Button></div></div> : selected.maps_link ? <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><a href={selected.maps_link} target="_blank" rel="noreferrer"><MapPin size={16} className="mr-2" />Buka lokasi murid</a></Button> : <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">Alamat lengkap dibuka setelah pembayaran dikonfirmasi.</div>}
            <div><p className="text-sm font-black text-slate-800">Peserta</p><div className="mt-2 space-y-2">{selected.participants.map((participant) => <div key={participant.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm"><div><p className="font-bold text-slate-800">{participant.name}</p><p className="text-xs text-slate-400">{participant.status}</p></div><span className="font-bold text-slate-600">{rupiah(participant.amount)}</span></div>)}</div></div>
            {["confirmed", "in_progress", "awaiting_student_approval", "disputed", "absence_review", "admin_review_required", "completed"].includes(selected.status) && <Button variant="outline" className="w-full rounded-xl border-indigo-200 text-indigo-700" onClick={() => { setHubBookingId(selected.id); setSelected(null); }}><MessageCircle size={16} className="mr-2" />Buka ruang belajar</Button>}
            {selected.latest_report && <div className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900"><FileWarning className="shrink-0" /><div><p className="font-black">Laporan {selected.latest_report.status}</p><p className="mt-1 line-clamp-3 leading-6">{selected.latest_report.chronology}</p></div></div>}
            {selected.latest_dispute && <div className="flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900"><ShieldAlert className="shrink-0" /><div><p className="font-black">Keberatan murid {selected.latest_dispute.status}</p><p className="mt-1 leading-6">{selected.latest_dispute.reason}</p></div></div>}
            {selected.completion_evidence_url && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2 font-black text-emerald-900"><FileCheck2 size={18} />Bukti sudah dikirim</div><ProtectedImage source={selected.completion_evidence_url} alt="Bukti sesi" className="mt-3 max-h-64 w-full rounded-xl bg-white object-contain" /><p className="mt-3 text-sm text-emerald-800">{selected.completion_notes}</p></div>}
            <div className="grid gap-2 sm:grid-cols-3">{selected.can_complete && <Button onClick={() => openAction("complete", selected)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 size={16} className="mr-2" />Selesai</Button>}{selected.can_report_absence && <Button variant="outline" onClick={() => openAction("absence", selected)} className="rounded-xl border-amber-200 text-amber-700"><UserRoundX size={16} className="mr-2" />Murid absen</Button>}{selected.can_report_emergency && <Button variant="outline" onClick={() => openAction("emergency", selected)} className="rounded-xl border-rose-200 text-rose-700"><AlertTriangle size={16} className="mr-2" />Darurat</Button>}</div>
            {selected.status === "completed" && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">Pendapatan bersih {rupiah(selected.teacher_net_amount)} · status pencairan: {selected.payout_status}.</div>}
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-[2rem] sm:max-w-lg">
          {action && <>
            <DialogHeader><DialogTitle>{action.type === "complete" ? "Kirim bukti penyelesaian" : action.type === "absence" ? "Laporkan murid tidak hadir" : "Laporkan keadaan darurat"}</DialogTitle><DialogDescription>{action.type === "complete" ? "Murid memiliki 48 jam untuk menyetujui atau mengajukan keberatan." : action.type === "absence" ? "Laporan dapat diajukan setelah keterlambatan lebih dari 15 menit dan akan diperiksa admin." : "Refund penuh langsung masuk antrean. Bukti dan kronologi akan diperiksa admin."}</DialogDescription></DialogHeader>
            <form onSubmit={submitAction} className="space-y-4">
              {action.type === "absence" && action.item.type === "group" && <div><Label>Pilih murid</Label><Select value={studentId} onValueChange={setStudentId}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue placeholder="Murid yang tidak hadir" /></SelectTrigger><SelectContent>{action.item.participants.filter((item) => item.status === "paid").map((item) => <SelectItem key={item.student_id} value={String(item.student_id)}>{item.name}</SelectItem>)}</SelectContent></Select></div>}
              {action.type === "emergency" && <><div><Label>Jenis keadaan</Label><Input required maxLength={120} className="mt-2 rounded-xl" value={incidentType} onChange={(event) => setIncidentType(event.target.value)} placeholder="Contoh: kecelakaan dalam perjalanan" /></div><div><Label>Waktu kejadian</Label><Input required type="datetime-local" className="mt-2 rounded-xl" value={incidentAt} onChange={(event) => setIncidentAt(event.target.value)} /></div><div><Label>Lokasi kejadian</Label><Input required maxLength={500} className="mt-2 rounded-xl" value={incidentLocation} onChange={(event) => setIncidentLocation(event.target.value)} /></div><div><Label>Dampak terhadap sesi</Label><Textarea required minLength={20} maxLength={1500} className="mt-2 min-h-24 rounded-xl" value={impact} onChange={(event) => setImpact(event.target.value)} /></div></>}
              <div><Label>{action.type === "complete" ? "Catatan pelaksanaan" : "Kronologi lengkap"}</Label><Textarea required minLength={action.type === "complete" ? 20 : action.type === "absence" ? 30 : 50} maxLength={action.type === "emergency" ? 3000 : action.type === "absence" ? 2500 : 2000} className="mt-2 min-h-36 rounded-xl" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Tuliskan kejadian dengan jelas dan masuk akal" /></div>
              {action.type === "complete" ? <div><Label>Bukti pelaksanaan dari kamera</Label><div className="mt-2"><CameraCapture file={evidence} required onCapture={(file) => { selectEvidence(file); setEvidenceCapturedAt(new Date().toISOString()); }} label="Ambil foto pelaksanaan sekarang" dialogTitle="Foto bukti pelaksanaan" dialogDescription="Ambil foto kondisi kelas saat ini. Galeri tidak digunakan agar waktu pengambilan dapat diverifikasi." captureButtonLabel="Ambil bukti" facingMode="environment" guideShape="frame" /></div><p className="mt-2 text-xs leading-5 text-slate-500">Foto harus diambil langsung dan dikirim dalam 20 menit.</p></div> : <div><Label>Bukti yang dapat dipercaya</Label><Input required className="mt-2" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => selectEvidence(event.target.files?.[0])} /></div>}
              <Button className={`w-full rounded-xl ${action.type === "emergency" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"}`} disabled={processing}>{processing && <Loader2 size={16} className="mr-2 animate-spin" />}Kirim</Button>
            </form>
          </>}
        </DialogContent>
      </Dialog>
      <LearningSessionHub bookingId={hubBookingId} open={hubBookingId !== null} onOpenChange={(open) => !open && setHubBookingId(null)} />
    </TeacherLayout>
  );
}

function Info({ icon: Icon, text }: { icon: typeof Clock3; text: string }) {
  return <div className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2.5"><Icon size={15} className="mt-0.5 shrink-0 text-indigo-500" /><span className="leading-5">{text || "-"}</span></div>;
}
