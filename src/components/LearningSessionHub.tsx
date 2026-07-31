import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  MessageCircle,
  RefreshCw,
  Send,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import http, { getApiError } from "@/lib/http";

type HubTab = "session" | "chat" | "plan" | "progress";

interface HubMessage {
  id: number;
  body: string;
  sender_name: string;
  sender_role: "student" | "teacher";
  is_mine: boolean;
  created_at: string;
}

interface LearningPlan {
  id: number;
  initial_assessment: string;
  strengths?: string;
  challenges?: string;
  learning_target: string;
  success_indicator: string;
  baseline_score?: number;
  target_score?: number;
  progress_percent: number;
  status: string;
  student_acknowledged_at?: string;
}

interface ProgressReport {
  id: number;
  session_number: number;
  material_covered: string;
  mastered_skills: string;
  difficulties?: string;
  next_exercise: string;
  attendance: string;
  actual_duration_minutes: number;
  progress_percent: number;
  notes?: string;
  published_at: string;
}

interface Attendance {
  id: number;
  check_in_at: string;
  check_out_at?: string;
  pin_verified_at: string;
}

interface HubData {
  role: "student" | "teacher" | "admin";
  booking: {
    id: number;
    subject: string;
    education_level?: string;
    grade?: string;
    chapter?: string;
    topic?: string;
    requested_goal?: string;
    teacher_name: string;
    student_name: string;
    learning_mode: "online" | "offline";
    class_type: "private" | "group";
    status: string;
    start_at: string;
    end_at: string;
    session_started_at?: string;
    session_ended_at?: string;
  };
  messages: HubMessage[];
  learning_plan?: LearningPlan;
  progress_reports: ProgressReport[];
  attendance?: Attendance;
  permissions: {
    can_chat: boolean;
    can_generate_pin: boolean;
    can_check_in: boolean;
    can_check_out: boolean;
    can_manage_plan: boolean;
    can_acknowledge_plan: boolean;
    can_report_progress: boolean;
  };
}

interface LearningSessionHubProps {
  bookingId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const dateTime = (value?: string) => value
  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "-";

const emptyPlan = {
  initial_assessment: "",
  strengths: "",
  challenges: "",
  learning_target: "",
  success_indicator: "",
  baseline_score: "",
  target_score: "",
};

export default function LearningSessionHub({ bookingId, open, onOpenChange }: LearningSessionHubProps) {
  const [hub, setHub] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<HubTab>("session");
  const [message, setMessage] = useState("");
  const [sessionPin, setSessionPin] = useState("");
  const [pinExpiresAt, setPinExpiresAt] = useState("");
  const [teacherPin, setTeacherPin] = useState("");
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [reportForm, setReportForm] = useState({
    material_covered: "",
    mastered_skills: "",
    difficulties: "",
    next_exercise: "",
    attendance: "present",
    progress_percent: "0",
    notes: "",
  });

  const load = useCallback(async (quiet = false) => {
    if (!bookingId) return;
    if (!quiet) setLoading(true);
    try {
      const response = await http.get<HubData>(`/bookings/${bookingId}/learning-session`);
      setHub(response.data);
      const plan = response.data.learning_plan;
      if (plan) {
        setPlanForm({
          initial_assessment: plan.initial_assessment || "",
          strengths: plan.strengths || "",
          challenges: plan.challenges || "",
          learning_target: plan.learning_target || "",
          success_indicator: plan.success_indicator || "",
          baseline_score: plan.baseline_score === null || plan.baseline_score === undefined ? "" : String(plan.baseline_score),
          target_score: plan.target_score === null || plan.target_score === undefined ? "" : String(plan.target_score),
        });
        setReportForm((current) => ({
          ...current,
          progress_percent: String(plan.progress_percent || 0),
        }));
      }
    } catch (error) {
      if (!quiet) toast.error(getApiError(error, "Ruang belajar gagal dimuat."));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!open || !bookingId) return;
    setTab("session");
    setSessionPin("");
    setPinExpiresAt("");
    setTeacherPin("");
    void load();
    const timer = window.setInterval(() => void load(true), 15000);
    return () => window.clearInterval(timer);
  }, [open, bookingId, load]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!bookingId || !message.trim()) return;
    setProcessing(true);
    try {
      const response = await http.post(`/bookings/${bookingId}/messages`, { body: message.trim() });
      toast.success(response.data.message);
      setMessage("");
      await load(true);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const generatePin = async () => {
    if (!bookingId) return;
    setProcessing(true);
    try {
      const response = await http.post(`/student/bookings/${bookingId}/session-pin`);
      setSessionPin(response.data.pin);
      setPinExpiresAt(response.data.expires_at);
      toast.success(response.data.message);
      await load(true);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const getLocation = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Perangkat tidak mendukung lokasi."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });

  const checkIn = async () => {
    if (!bookingId || !hub) return;
    if (!/^\d{6}$/.test(teacherPin)) {
      toast.error("PIN harus berisi enam angka.");
      return;
    }
    setProcessing(true);
    try {
      let locationPayload = {};
      if (hub.booking.learning_mode === "offline") {
        const position = await getLocation();
        locationPayload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy_meters: Math.round(position.coords.accuracy),
        };
      }
      const response = await http.post(`/teacher/bookings/${bookingId}/check-in`, {
        pin: teacherPin,
        ...locationPayload,
      });
      toast.success(response.data.message);
      setTeacherPin("");
      await load();
    } catch (error) {
      const isLocationError = typeof error === "object"
        && error !== null
        && "code" in error
        && "message" in error
        && !("response" in error);
      const message = isLocationError
        ? "Lokasi harus diizinkan untuk check-in offline."
        : getApiError(error);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const checkOut = async () => {
    if (!bookingId) return;
    setProcessing(true);
    try {
      const response = await http.post(`/teacher/bookings/${bookingId}/check-out`);
      toast.success(response.data.message);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const savePlan = async (event: FormEvent) => {
    event.preventDefault();
    if (!bookingId) return;
    setProcessing(true);
    try {
      const response = await http.put(`/teacher/bookings/${bookingId}/learning-plan`, {
        ...planForm,
        baseline_score: planForm.baseline_score === "" ? null : Number(planForm.baseline_score),
        target_score: planForm.target_score === "" ? null : Number(planForm.target_score),
      });
      toast.success(response.data.message);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const acknowledgePlan = async () => {
    if (!bookingId) return;
    setProcessing(true);
    try {
      const response = await http.post(`/student/bookings/${bookingId}/learning-plan/acknowledge`);
      toast.success(response.data.message);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const saveProgress = async (event: FormEvent) => {
    event.preventDefault();
    if (!bookingId) return;
    setProcessing(true);
    try {
      const response = await http.post(`/teacher/bookings/${bookingId}/progress-reports`, {
        ...reportForm,
        progress_percent: Number(reportForm.progress_percent),
      });
      toast.success(response.data.message);
      setReportForm((current) => ({
        ...current,
        material_covered: "",
        mastered_skills: "",
        difficulties: "",
        next_exercise: "",
        notes: "",
      }));
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto rounded-[2rem] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Ruang belajar {hub?.booking.subject || ""}</DialogTitle>
          <DialogDescription>
            Chat, PIN, kehadiran, asesmen, target, dan laporan perkembangan tersimpan pada sesi.
          </DialogDescription>
        </DialogHeader>

        {loading || !hub ? (
          <div className="grid min-h-72 place-items-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2 sm:grid-cols-4">
              <TabButton active={tab === "session"} onClick={() => setTab("session")} icon={ClipboardCheck} label="Sesi" />
              <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageCircle} label="Chat" />
              <TabButton active={tab === "plan"} onClick={() => setTab("plan")} icon={Target} label="Target" />
              <TabButton active={tab === "progress"} onClick={() => setTab("progress")} icon={BarChart3} label="Progres" />
            </div>

            {tab === "session" && (
              <div className="space-y-4">
                <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <Info label="Jadwal" value={`${dateTime(hub.booking.start_at)}–${new Date(hub.booking.end_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`} />
                  <Info label="Mode" value={hub.booking.learning_mode === "online" ? "Online" : "Offline dengan verifikasi lokasi"} />
                  <Info label="Tutor" value={hub.booking.teacher_name} />
                  <Info label="Murid" value={hub.booking.student_name} />
                </div>

                {hub.booking.class_type === "group" && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    PIN dan laporan perkembangan individual akan diaktifkan setelah layanan privat stabil.
                  </div>
                )}

                {hub.role === "student" && hub.permissions.can_generate_pin && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    <p className="font-black text-indigo-950">PIN kehadiran tutor</p>
                    <p className="mt-1 text-sm text-indigo-700">Buat PIN saat tutor sudah hadir. Jangan kirim PIN melalui chat.</p>
                    {sessionPin ? (
                      <div className="mt-4 rounded-2xl bg-white p-5 text-center">
                        <p className="font-mono text-4xl font-black tracking-[.28em] text-indigo-700">{sessionPin}</p>
                        <p className="mt-2 text-xs text-slate-500">Berlaku sampai {dateTime(pinExpiresAt)}</p>
                      </div>
                    ) : (
                      <Button onClick={generatePin} disabled={processing} className="mt-4 rounded-xl bg-indigo-600">
                        <KeyRound size={16} className="mr-2" />Buat PIN
                      </Button>
                    )}
                  </div>
                )}

                {hub.role === "teacher" && hub.permissions.can_check_in && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    <Label className="font-black text-indigo-950">Masukkan PIN dari murid</Label>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        value={teacherPin}
                        onChange={(event) => setTeacherPin(event.target.value.replace(/\D/g, ""))}
                        className="h-12 rounded-xl bg-white font-mono text-xl tracking-[.2em]"
                        placeholder="000000"
                      />
                      <Button onClick={checkIn} disabled={processing} className="h-12 rounded-xl bg-indigo-600">
                        <LogIn size={16} className="mr-2" />Check-in
                      </Button>
                    </div>
                    {hub.booking.learning_mode === "offline" && <p className="mt-2 text-xs text-indigo-700">Izin lokasi perangkat diperlukan.</p>}
                  </div>
                )}

                {hub.attendance && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-900">
                    <div className="flex items-center gap-2 font-black"><CheckCircle2 size={18} />Kehadiran terverifikasi PIN</div>
                    <p className="mt-2">Check-in: {dateTime(hub.attendance.check_in_at)}</p>
                    <p>Check-out: {dateTime(hub.attendance.check_out_at)}</p>
                    {hub.permissions.can_check_out && (
                      <Button onClick={checkOut} disabled={processing} className="mt-4 rounded-xl bg-emerald-700 hover:bg-emerald-800">
                        <LogOut size={16} className="mr-2" />Check-out
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === "chat" && (
              <div className="space-y-4">
                <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
                  {hub.messages.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-500">Belum ada pesan pada sesi ini.</p>
                  ) : hub.messages.map((item) => (
                    <div key={item.id} className={`flex ${item.is_mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${item.is_mine ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
                        <p className={`mb-1 text-[11px] font-black ${item.is_mine ? "text-indigo-100" : "text-slate-400"}`}>{item.sender_name}</p>
                        <p className="whitespace-pre-wrap break-words leading-6">{item.body}</p>
                        <p className={`mt-1 text-[10px] ${item.is_mine ? "text-indigo-200" : "text-slate-400"}`}>{dateTime(item.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="space-y-2">
                  <Textarea
                    required
                    maxLength={1000}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="min-h-24 rounded-xl"
                    placeholder="Tulis pesan tentang sesi belajar"
                  />
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <p className="text-xs text-slate-500">Kontak pribadi, media sosial, dan tautan luar akan ditolak.</p>
                    <Button disabled={processing || !hub.permissions.can_chat} className="rounded-xl bg-indigo-600">
                      <Send size={16} className="mr-2" />Kirim
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {tab === "plan" && (
              <div className="space-y-4">
                {hub.role === "teacher" && hub.permissions.can_manage_plan ? (
                  <form onSubmit={savePlan} className="grid gap-4 sm:grid-cols-2">
                    <FieldArea label="Hasil asesmen awal" value={planForm.initial_assessment} onChange={(value) => setPlanForm({ ...planForm, initial_assessment: value })} required className="sm:col-span-2" />
                    <FieldArea label="Kemampuan yang sudah dikuasai" value={planForm.strengths} onChange={(value) => setPlanForm({ ...planForm, strengths: value })} />
                    <FieldArea label="Kesulitan utama" value={planForm.challenges} onChange={(value) => setPlanForm({ ...planForm, challenges: value })} />
                    <FieldArea label="Target belajar" value={planForm.learning_target} onChange={(value) => setPlanForm({ ...planForm, learning_target: value })} required />
                    <FieldArea label="Indikator keberhasilan" value={planForm.success_indicator} onChange={(value) => setPlanForm({ ...planForm, success_indicator: value })} required />
                    <div><Label>Nilai awal (opsional)</Label><Input type="number" min={0} max={100} value={planForm.baseline_score} onChange={(event) => setPlanForm({ ...planForm, baseline_score: event.target.value })} className="mt-2 rounded-xl" /></div>
                    <div><Label>Target nilai (opsional)</Label><Input type="number" min={0} max={100} value={planForm.target_score} onChange={(event) => setPlanForm({ ...planForm, target_score: event.target.value })} className="mt-2 rounded-xl" /></div>
                    <Button disabled={processing} className="rounded-xl bg-indigo-600 sm:col-span-2">Simpan dan minta persetujuan murid</Button>
                  </form>
                ) : hub.learning_plan ? (
                  <PlanSummary plan={hub.learning_plan} />
                ) : (
                  <p className="rounded-2xl bg-slate-50 py-16 text-center text-sm text-slate-500">Tutor belum menerbitkan asesmen awal dan target.</p>
                )}
                {hub.role === "student" && hub.permissions.can_acknowledge_plan && (
                  <Button onClick={acknowledgePlan} disabled={processing} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 size={16} className="mr-2" />Setujui target belajar
                  </Button>
                )}
              </div>
            )}

            {tab === "progress" && (
              <div className="space-y-5">
                {hub.learning_plan && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    <div className="flex items-center justify-between gap-3 text-sm font-black text-indigo-950"><span>Progres target</span><span>{hub.learning_plan.progress_percent}%</span></div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${hub.learning_plan.progress_percent}%` }} /></div>
                  </div>
                )}
                {hub.role === "teacher" && hub.permissions.can_report_progress && (
                  <form onSubmit={saveProgress} className="grid gap-4 rounded-2xl border border-slate-200 p-5 sm:grid-cols-2">
                    <FieldArea label="Materi yang dipelajari" value={reportForm.material_covered} onChange={(value) => setReportForm({ ...reportForm, material_covered: value })} required />
                    <FieldArea label="Kemampuan yang dikuasai" value={reportForm.mastered_skills} onChange={(value) => setReportForm({ ...reportForm, mastered_skills: value })} required />
                    <FieldArea label="Kesulitan murid" value={reportForm.difficulties} onChange={(value) => setReportForm({ ...reportForm, difficulties: value })} />
                    <FieldArea label="Latihan berikutnya" value={reportForm.next_exercise} onChange={(value) => setReportForm({ ...reportForm, next_exercise: value })} required />
                    <div><Label>Kehadiran</Label><Select value={reportForm.attendance} onValueChange={(value) => setReportForm({ ...reportForm, attendance: value })}><SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="present">Hadir penuh</SelectItem><SelectItem value="late">Terlambat</SelectItem><SelectItem value="partial">Hadir sebagian</SelectItem></SelectContent></Select></div>
                    <div><Label>Progres target (%)</Label><Input required type="number" min={0} max={100} value={reportForm.progress_percent} onChange={(event) => setReportForm({ ...reportForm, progress_percent: event.target.value })} className="mt-2 rounded-xl" /></div>
                    <FieldArea label="Catatan tambahan" value={reportForm.notes} onChange={(value) => setReportForm({ ...reportForm, notes: value })} className="sm:col-span-2" />
                    <Button disabled={processing} className="rounded-xl bg-indigo-600 sm:col-span-2">Terbitkan laporan sesi</Button>
                  </form>
                )}
                <div className="space-y-3">
                  {hub.progress_reports.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 py-14 text-center text-sm text-slate-500">Laporan perkembangan belum tersedia.</p>
                  ) : hub.progress_reports.map((report) => (
                    <article key={report.id} className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-slate-900">Laporan sesi {report.session_number}</p><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{report.progress_percent}%</span></div>
                      <p className="mt-1 text-xs text-slate-400">{dateTime(report.published_at)} · {report.actual_duration_minutes} menit</p>
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <Info label="Materi" value={report.material_covered} />
                        <Info label="Dikuasai" value={report.mastered_skills} />
                        <Info label="Kesulitan" value={report.difficulties || "-"} />
                        <Info label="Latihan berikutnya" value={report.next_exercise} />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <Button type="button" variant="outline" onClick={() => void load()} className="w-full rounded-xl">
              <RefreshCw size={16} className="mr-2" />Muat ulang ruang belajar
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Target; label: string }) {
  return <button type="button" onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black transition ${active ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><Icon size={16} />{label}</button>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/80 p-3"><p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 whitespace-pre-wrap leading-6 text-slate-800">{value}</p></div>;
}

function FieldArea({ label, value, onChange, required, className = "" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; className?: string }) {
  return <div className={className}><Label>{label}</Label><Textarea required={required} minLength={required ? 10 : undefined} maxLength={3000} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-28 rounded-xl" /></div>;
}

function PlanSummary({ plan }: { plan: LearningPlan }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Info label="Hasil asesmen awal" value={plan.initial_assessment} />
      <Info label="Kemampuan awal" value={plan.strengths || "-"} />
      <Info label="Kesulitan" value={plan.challenges || "-"} />
      <Info label="Target belajar" value={plan.learning_target} />
      <Info label="Indikator berhasil" value={plan.success_indicator} />
      <Info label="Status persetujuan" value={plan.student_acknowledged_at ? `Disetujui ${dateTime(plan.student_acknowledged_at)}` : "Menunggu persetujuan murid"} />
    </div>
  );
}
