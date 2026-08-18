import { notify } from "@/lib/notify";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
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
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import http, { getApiError } from "@/lib/http";
import { dateInputValue } from "@/lib/date";

type HubTab = "session" | "chat" | "plan" | "progress";

interface HubMessage {
  id: number;
  body: string;
  sender_name: string;
  sender_role: "student" | "teacher" | "system";
  message_type?: "user" | "system";
  metadata?: { title?: string; action_label?: string; action_url?: string; [key: string]: unknown };
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
  no_material_change?: boolean;
  no_change_reason?: string | null;
  student_id?: number;
  student_name?: string;
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
  topics?: Array<{
    topic_id: number;
    chapter?: string | null;
    title?: string | null;
    activity_type: "taught" | "continued" | "reviewed";
    status_before: string;
    status_after: "in_progress" | "completed";
    needs_review: boolean;
    notes?: string | null;
  }>;
}

interface Attendance {
  id: number;
  check_in_at: string;
  check_out_at?: string;
  pin_verified_at: string;
}

interface ParticipantItem {
  participant_id: number;
  student_id: number;
  name: string;
  attendance?: { status: string; notes?: string; marked_at?: string } | null;
}

interface ScheduleChange {
  id: number;
  requester_name: string;
  requester_role: string;
  scope: "single" | "future";
  affected_count: number;
  original_start_at: string;
  original_end_at: string;
  proposed_start_at: string;
  proposed_end_at: string;
  reason: string;
  status: string;
  expires_at?: string | null;
  my_decision?: string | null;
  can_respond: boolean;
  responses: Array<{ user_name: string; role: string; decision: string; responded_at?: string | null }>;
}

interface LearningTopicItem {
  id: number;
  chapter?: string;
  title: string;
  status: "not_started" | "in_progress" | "completed" | "review_needed";
  needs_review?: boolean;
  session_status?: "in_progress" | "completed" | null;
  session_activity?: "taught" | "continued" | "reviewed" | null;
  session_needs_review?: boolean | null;
}

interface ScheduleOption {
  start_at: string;
  end_at: string;
  label: string;
  scope: "single" | "future";
  affected_count: number;
}

type TopicUpdateState = {
  selected: boolean;
  activity_type: "taught" | "continued" | "reviewed";
  status_after: "in_progress" | "completed";
  needs_review: boolean;
  notes: string;
};

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
    session_pin_expires_at?: string | null;
  };
  messages: HubMessage[];
  learning_plan?: LearningPlan;
  progress_reports: ProgressReport[];
  attendance?: Attendance;
  participants: ParticipantItem[];
  schedule_changes: ScheduleChange[];
  learning_topics: LearningTopicItem[];
  material_progress_percent: number;
  permissions: {
    can_chat: boolean;
    can_generate_pin: boolean;
    can_check_in: boolean;
    can_check_out: boolean;
    can_manage_plan: boolean;
    can_acknowledge_plan: boolean;
    can_report_progress: boolean;
    can_mark_attendance: boolean;
    can_request_schedule_change: boolean;
    can_request_future_schedule: boolean;
  };
}

interface LearningSessionHubProps {
  bookingId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: HubTab;
  backLabel?: string;
  onBack?: () => void;
}

const dateTime = (value?: string) => value
  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "-";

const noChangeReasonLabel = (value?: string | null) => ({
  review: "Review materi",
  practice: "Latihan soal",
  evaluation: "Evaluasi / ujian",
  remedial: "Remedial",
  session_disrupted: "Sesi tidak berjalan penuh",
  other: "Lainnya",
}[value || ""] || "Tidak ada perubahan materi");

const emptyPlan = {
  initial_assessment: "",
  strengths: "",
  challenges: "",
  learning_target: "",
  success_indicator: "",
  baseline_score: "",
  target_score: "",
};

export default function LearningSessionHub({ bookingId, open, onOpenChange, initialTab = "session", backLabel, onBack }: LearningSessionHubProps) {
  const confirm = useConfirmDialog();
  const [hub, setHub] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<HubTab>(initialTab);
  const [message, setMessage] = useState("");
  const [sessionPin, setSessionPin] = useState("");
  const [pinExpiresAt, setPinExpiresAt] = useState("");
  const [teacherPin, setTeacherPin] = useState("");
  const [participantAttendance, setParticipantAttendance] = useState<Record<number, { status: string; notes: string }>>({});
  const [proposedStartAt, setProposedStartAt] = useState("");
  const [scheduleScope, setScheduleScope] = useState<"single" | "future">("single");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOption[]>([]);
  const [loadingScheduleOptions, setLoadingScheduleOptions] = useState(false);
  const [scheduleReason, setScheduleReason] = useState("");
  const [scheduleResponseNotes, setScheduleResponseNotes] = useState<Record<number, string>>({});
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [topicUpdates, setTopicUpdates] = useState<Record<number, TopicUpdateState>>({});
  const [reportForm, setReportForm] = useState({
    material_covered: "",
    mastered_skills: "",
    difficulties: "",
    next_exercise: "",
    attendance: "present",
    progress_percent: "0",
    notes: "",
    student_id: "",
    no_material_change: false,
    no_change_reason: "",
  });

  const load = useCallback(async (quiet = false) => {
    if (!bookingId) return;
    if (!quiet) setLoading(true);
    try {
      const response = await http.get<HubData>(`/bookings/${bookingId}/learning-session`);
      setHub(response.data);

      // Background polling only refreshes server state. It must never overwrite a tutor's
      // in-progress attendance/target/progress draft while they are typing or choosing subbab.
      if (!quiet) {
        setParticipantAttendance(Object.fromEntries((response.data.participants || []).map((item) => [item.participant_id, {
          status: item.attendance?.status || "present",
          notes: item.attendance?.notes || "",
        }])));
        const loadedTopicUpdates: Record<number, TopicUpdateState> = {};
        for (const topic of response.data.learning_topics || []) {
          loadedTopicUpdates[topic.id] = {
            selected: Boolean(topic.session_status),
            activity_type: topic.session_activity || (topic.status === "not_started" ? "taught" : "continued"),
            status_after: topic.session_status || (topic.status === "completed" ? "completed" : "in_progress"),
            needs_review: Boolean(topic.session_needs_review ?? topic.needs_review),
            notes: "",
          };
        }
        setTopicUpdates(loadedTopicUpdates);
        setScheduleOptions([]);
        setProposedStartAt("");
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
            progress_percent: String(response.data.learning_topics?.length ? response.data.material_progress_percent : (plan.progress_percent || 0)),
          }));
        }
      }
    } catch (error) {
      if (!quiet) notify.error(getApiError(error, "Ruang belajar gagal dimuat."));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!open || !bookingId) return;
    setTab(initialTab);
    setSessionPin("");
    setPinExpiresAt("");
    setTeacherPin("");
    void load();
    const timer = window.setInterval(() => void load(true), 15000);
    return () => window.clearInterval(timer);
  }, [open, bookingId, initialTab, load]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!bookingId || !message.trim()) return;
    setProcessing(true);
    try {
      const response = await http.post(`/bookings/${bookingId}/messages`, { body: message.trim() });
      notify.success(response.data.message);
      setMessage("");
      await load(true);
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const generatePin = async (replace = false) => {
    if (!bookingId) return;
    if (replace) {
      const accepted = await confirm({
        title: "Buat PIN baru?",
        description: "PIN sebelumnya akan langsung tidak berlaku. Buat ulang hanya kalau PIN lama lupa atau belum diberikan kepada tutor.",
        confirmText: "Ya, buat PIN baru",
        tone: "warning",
      });
      if (!accepted) return;
    }
    setProcessing(true);
    try {
      const response = await http.post(`/student/bookings/${bookingId}/session-pin`, { replace });
      setSessionPin(response.data.pin);
      setPinExpiresAt(response.data.expires_at);
      notify.success(response.data.message);
      await load(true);
    } catch (error) {
      notify.error(getApiError(error));
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
      notify.error("PIN harus berisi enam angka.");
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
      notify.success(response.data.message);
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
      notify.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const checkOut = async () => {
    if (!bookingId) return;
    setProcessing(true);
    try {
      await http.post(`/teacher/bookings/${bookingId}/check-out`);
      notify.success("Sesi sudah diakhiri. Sekarang isi hasil belajar pada tab Hasil belajar.");
      await load();
      setTab("progress");
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const saveParticipantAttendance = async () => {
    if (!bookingId || !hub) return;
    const attendances = hub.participants.map((item) => ({
      participant_id: item.participant_id,
      status: participantAttendance[item.participant_id]?.status || "present",
      notes: participantAttendance[item.participant_id]?.notes?.trim() || null,
    }));
    if (!attendances.length) return;
    const shouldGuideToLearningPlan = hub.booking.class_type === "private" && !hub.learning_plan;
    setProcessing(true);
    try {
      const response = await http.put(`/teacher/bookings/${bookingId}/participant-attendance`, { attendances });
      notify.success(shouldGuideToLearningPlan
        ? "Kehadiran murid tersimpan. Selanjutnya tentukan tujuan belajar pada tab Tujuan belajar."
        : response.data.message);
      await load();
      if (shouldGuideToLearningPlan) setTab("plan");
    } catch (error) {
      notify.error(getApiError(error, "Kehadiran murid gagal disimpan."));
    } finally {
      setProcessing(false);
    }
  };

  const loadScheduleOptions = async () => {
    if (!bookingId) return;
    setLoadingScheduleOptions(true);
    setProposedStartAt("");
    try {
      const response = await http.get<{ data: ScheduleOption[]; message: string }>(`/bookings/${bookingId}/schedule-options`, {
        params: { scope: scheduleScope, date: scheduleDate || undefined },
      });
      setScheduleOptions(response.data.data || []);
      if (!(response.data.data || []).length) notify.error(response.data.message);
    } catch (error) {
      setScheduleOptions([]);
      notify.error(getApiError(error, "Pilihan jadwal tutor gagal dimuat."));
    } finally {
      setLoadingScheduleOptions(false);
    }
  };

  const requestScheduleChange = async (event: FormEvent) => {
    event.preventDefault();
    if (!bookingId) return;
    if (!proposedStartAt) {
      notify.error("Pilih salah satu slot tutor yang tersedia.");
      return;
    }
    setProcessing(true);
    try {
      const response = await http.post(`/bookings/${bookingId}/schedule-changes`, {
        proposed_start_at: proposedStartAt,
        scope: scheduleScope,
        reason: scheduleReason.trim(),
      });
      notify.success(response.data.message);
      setProposedStartAt("");
      setScheduleOptions([]);
      setScheduleDate("");
      setScheduleReason("");
      await load();
    } catch (error) {
      notify.error(getApiError(error, "Perubahan jadwal gagal diajukan."));
    } finally {
      setProcessing(false);
    }
  };

  const respondScheduleChange = async (changeId: number, decision: "approved" | "rejected") => {
    if (!bookingId) return;
    setProcessing(true);
    try {
      const response = await http.post(`/bookings/${bookingId}/schedule-changes/${changeId}/respond`, {
        decision,
        notes: decision === "rejected" ? scheduleResponseNotes[changeId]?.trim() : null,
      });
      notify.success(response.data.message);
      await load();
    } catch (error) {
      notify.error(getApiError(error, "Jawaban perubahan jadwal gagal disimpan."));
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
      notify.success(response.data.message);
      await load();
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const acknowledgePlan = async () => {
    if (!bookingId) return;
    setProcessing(true);
    try {
      const response = await http.post(`/student/bookings/${bookingId}/learning-plan/acknowledge`);
      notify.success(response.data.message);
      await load();
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const saveProgress = async (event: FormEvent) => {
    event.preventDefault();
    if (!bookingId) return;
    setProcessing(true);
    try {
      const selectedTopics = Object.entries(topicUpdates)
        .filter(([, value]) => value.selected)
        .map(([topicId, value]) => ({
          topic_id: Number(topicId),
          activity_type: value.activity_type,
          status_after: value.status_after,
          needs_review: value.needs_review,
          notes: value.notes.trim() || null,
        }));
      const response = await http.post(`/teacher/bookings/${bookingId}/progress-reports`, {
        ...reportForm,
        student_id: reportForm.student_id ? Number(reportForm.student_id) : null,
        progress_percent: hub?.learning_topics.length ? undefined : Number(reportForm.progress_percent),
        topic_updates: selectedTopics,
      });
      notify.success(response.data.message);
      setReportForm((current) => ({
        ...current,
        material_covered: "",
        mastered_skills: "",
        difficulties: "",
        next_exercise: "",
        notes: "",
        student_id: hub?.booking.class_type === "group" ? "" : current.student_id,
        no_material_change: false,
        no_change_reason: "",
      }));
      setTopicUpdates((current) => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, { ...value, selected: false, notes: "" }])));
      await load();
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const attendanceComplete = Boolean(hub?.participants.length)
    && hub!.participants.every((participant) => Boolean(participant.attendance?.marked_at));
  const needsLearningPlanGuidance = Boolean(
    hub
    && hub.role === "teacher"
    && hub.booking.class_type === "private"
    && hub.attendance
    && !hub.attendance.check_out_at
    && attendanceComplete
    && !hub.learning_plan
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto rounded-[2rem] sm:max-w-4xl">
        {backLabel && onBack && (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="w-fit -ml-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-indigo-700"
          >
            <ArrowLeft size={16} className="mr-2" />{backLabel}
          </Button>
        )}
        <DialogHeader>
          <DialogTitle className="text-2xl">Ruang belajar {hub?.booking.subject || ""}</DialogTitle>
          <DialogDescription>
            Chat, PIN, kehadiran, tujuan belajar, dan laporan perkembangan tersimpan pada sesi.
          </DialogDescription>
        </DialogHeader>

        {loading || !hub ? (
          <div className="grid min-h-72 place-items-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2 sm:grid-cols-4">
              <TabButton active={tab === "session"} onClick={() => setTab("session")} icon={ClipboardCheck} label="Sesi" />
              <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageCircle} label="Chat" />
              <TabButton active={tab === "plan"} onClick={() => setTab("plan")} icon={Target} label="Tujuan belajar" attention={needsLearningPlanGuidance} />
              <TabButton active={tab === "progress"} onClick={() => setTab("progress")} icon={BarChart3} label="Hasil belajar" attention={hub.role === "teacher" && Boolean(hub.attendance?.check_out_at) && hub.permissions.can_report_progress && hub.progress_reports.length === 0} />
            </div>

            {tab === "session" && (
              <div className="space-y-4">
                <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <Info label="Jadwal" value={`${dateTime(hub.booking.start_at)}–${new Date(hub.booking.end_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`} />
                  <Info label="Mode" value={hub.booking.learning_mode === "online" ? "Online" : "Offline dengan verifikasi lokasi"} />
                  <Info label="Tutor" value={hub.booking.teacher_name} />
                  <Info label="Murid" value={hub.booking.student_name} />
                </div>

                {hub.role === "student" && hub.permissions.can_generate_pin && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    <p className="font-black text-indigo-950">Tutor sudah hadir?</p>
                    <p className="mt-1 text-sm leading-6 text-indigo-700">Buat PIN hanya setelah tutor benar-benar hadir dan siap mengajar. Sebutkan PIN langsung kepada tutor, jangan kirim lewat chat.</p>
                    {sessionPin ? (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl bg-white p-5 text-center">
                          <p className="text-xs font-black uppercase tracking-wider text-slate-400">PIN untuk tutor</p>
                          <p className="mt-2 font-mono text-4xl font-black tracking-[.28em] text-indigo-700">{sessionPin}</p>
                          <p className="mt-2 text-xs text-slate-500">Berlaku sampai {dateTime(pinExpiresAt)}</p>
                        </div>
                        <Button type="button" variant="outline" onClick={() => void generatePin(true)} disabled={processing} className="w-full rounded-xl border-amber-200 bg-white text-amber-700">Buat PIN baru jika PIN ini lupa</Button>
                      </div>
                    ) : hub.booking.session_pin_expires_at ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-white p-4">
                        <p className="text-sm font-black text-amber-800">PIN sebelumnya masih aktif.</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">Demi keamanan, angka PIN tidak ditampilkan ulang setelah halaman ditutup. Kalau PIN lama lupa, buat PIN baru dan PIN lama otomatis tidak berlaku.</p>
                        <p className="mt-2 text-xs font-bold text-amber-700">Aktif sampai {dateTime(hub.booking.session_pin_expires_at)}</p>
                        <Button type="button" onClick={() => void generatePin(true)} disabled={processing} className="mt-3 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-600"><KeyRound size={16} className="mr-2" />Buat PIN baru</Button>
                      </div>
                    ) : (
                      <Button onClick={() => void generatePin(false)} disabled={processing} className="mt-4 rounded-xl bg-indigo-600">
                        <KeyRound size={16} className="mr-2" />Buat PIN untuk tutor
                      </Button>
                    )}
                  </div>
                )}

                {hub.role === "teacher" && hub.permissions.can_check_in && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    <p className="font-black text-indigo-950">Konfirmasi kehadiranmu</p>
                    <p className="mt-1 text-sm leading-6 text-indigo-700">Setelah kamu benar-benar hadir, minta PIN 6 digit kepada murid lalu masukkan di sini.</p>
                    <Label className="mt-4 block text-xs font-black uppercase tracking-wider text-indigo-900">PIN dari murid</Label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        value={teacherPin}
                        onChange={(event) => setTeacherPin(event.target.value.replace(/\D/g, ""))}
                        className="h-12 rounded-xl bg-white font-mono text-xl tracking-[.2em]"
                        placeholder="000000"
                      />
                      <Button onClick={checkIn} disabled={processing} className="h-12 rounded-xl bg-indigo-600">
                        <LogIn size={16} className="mr-2" />Mulai sesi
                      </Button>
                    </div>
                    {hub.booking.learning_mode === "offline" && <p className="mt-2 text-xs text-indigo-700">Untuk sesi offline, izin lokasi perangkat diperlukan sebagai verifikasi tambahan.</p>}
                  </div>
                )}

                {hub.attendance && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-900">
                    <div className="flex items-center gap-2 font-black"><CheckCircle2 size={18} />Kehadiran tutor sudah terverifikasi</div>
                    <p className="mt-2">Check-in: {dateTime(hub.attendance.check_in_at)}</p>
                    <p>Check-out: {dateTime(hub.attendance.check_out_at)}</p>
                    {hub.role === "teacher" && hub.participants.length > 0 && (
                      <div className="mt-4 space-y-3 rounded-2xl bg-white/75 p-3">
                        <p className="flex items-center gap-2 font-black text-slate-900"><Users size={17} />Catat kehadiran murid</p>
                        {hub.participants.map((participant) => {
                          const value = participantAttendance[participant.participant_id] || { status: "present", notes: "" };
                          return <div key={participant.participant_id} className="rounded-xl border border-emerald-100 bg-white p-3"><div className="flex min-w-0 items-center justify-between gap-2"><span className="min-w-0 truncate font-bold text-slate-800">{participant.name}</span>{participant.attendance?.marked_at && <span className="shrink-0 text-[10px] text-emerald-700">Tersimpan</span>}</div><div className="mt-2 grid gap-2 sm:grid-cols-[11rem_1fr]"><Select disabled={!hub.permissions.can_mark_attendance} value={value.status} onValueChange={(status) => setParticipantAttendance((current) => ({ ...current, [participant.participant_id]: { ...value, status } }))}><SelectTrigger className="h-10 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="present">Hadir</SelectItem><SelectItem value="late">Terlambat</SelectItem><SelectItem value="partial">Hadir sebagian</SelectItem><SelectItem value="absent">Tidak hadir</SelectItem><SelectItem value="excused">Izin</SelectItem></SelectContent></Select><Input disabled={!hub.permissions.can_mark_attendance} value={value.notes} onChange={(event) => setParticipantAttendance((current) => ({ ...current, [participant.participant_id]: { ...value, notes: event.target.value } }))} maxLength={1000} className="h-10 rounded-xl bg-white" placeholder="Catatan kehadiran (opsional)" /></div></div>;
                        })}
                        {hub.permissions.can_mark_attendance && <Button type="button" onClick={() => void saveParticipantAttendance()} disabled={processing} className="w-full rounded-xl bg-indigo-600"><UserCheck size={16} className="mr-2" />Simpan kehadiran murid</Button>}
                        {!hub.permissions.can_mark_attendance && hub.progress_reports.length > 0 && <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">Kehadiran sudah dikunci karena hasil belajar sesi telah disimpan. Jika ada kesalahan serius, gunakan proses koreksi/admin agar riwayat tidak berubah diam-diam.</p>}
                      </div>
                    )}
                    {hub.permissions.can_check_out && (
                      <Button onClick={checkOut} disabled={processing} className="mt-4 rounded-xl bg-emerald-700 hover:bg-emerald-800">
                        <LogOut size={16} className="mr-2" />Akhiri sesi
                      </Button>
                    )}
                  </div>
                )}

                {needsLearningPlanGuidance && (
                  <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white"><Target size={19} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-[.14em] text-violet-500">Langkah berikutnya</p>
                        <p className="mt-1 font-black text-violet-950">Tentukan tujuan belajar setelah absen</p>
                        <p className="mt-1 text-xs leading-5 text-violet-700">Kehadiran murid sudah tersimpan. Sekarang isi hasil asesmen awal, tujuan belajar, dan indikator keberhasilan agar murid tahu arah sesi hari ini.</p>
                        <Button type="button" onClick={() => setTab("plan")} className="mt-3 w-full rounded-xl bg-violet-600 hover:bg-violet-700 sm:w-auto">
                          <Target size={16} className="mr-2" />Lanjut isi tujuan belajar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {hub.role === "teacher" && hub.attendance?.check_out_at && hub.permissions.can_report_progress && hub.progress_reports.length === 0 && (
                  <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white"><BarChart3 size={19} /></div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[.14em] text-indigo-600">Langkah berikutnya</p>
                        <p className="mt-1 text-base font-black text-indigo-950">Isi hasil belajar sebelum menyelesaikan sesi</p>
                        <p className="mt-1 text-xs leading-5 text-indigo-700">Sesi sudah diakhiri. Buka tab <b>Hasil belajar</b>, pilih Bab/Subbab yang dibahas, lalu simpan progress pertemuan.</p>
                      </div>
                    </div>
                    <Button type="button" onClick={() => setTab("progress")} className="mt-4 min-h-11 w-full rounded-xl bg-indigo-600 font-black hover:bg-indigo-700"><BarChart3 size={16} className="mr-2" />Lanjut isi hasil belajar</Button>
                  </div>
                )}

                {(hub.permissions.can_request_schedule_change || hub.schedule_changes.length > 0) && (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 sm:p-5">
                    <p className="flex items-center gap-2 font-black text-violet-950"><CalendarClock size={18} />Perubahan jadwal</p>
                    <p className="mt-1 text-xs leading-5 text-violet-700">Jadwal lama tetap berlaku sampai seluruh pihak yang terdampak menyetujui usulan.</p>
                    {hub.permissions.can_request_schedule_change && (
                      <form onSubmit={requestScheduleChange} className="mt-4 space-y-3 rounded-2xl bg-white p-4">
                        <div><Label>Cakupan perubahan</Label><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setScheduleScope("single"); setScheduleOptions([]); setProposedStartAt(""); }} className={`min-h-11 rounded-xl border px-3 text-xs font-black ${scheduleScope === "single" ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}>Sesi ini saja</button>{hub.permissions.can_request_future_schedule ? <button type="button" onClick={() => { setScheduleScope("future"); setScheduleOptions([]); setProposedStartAt(""); }} className={`min-h-11 rounded-xl border px-3 text-xs font-black ${scheduleScope === "future" ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}>Sesi ini dan berikutnya</button> : <div className="flex min-h-11 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-3 text-center text-[10px] font-bold text-slate-400">Tidak ada sesi berikutnya</div>}</div></div>
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><div><Label>Tanggal yang diinginkan (opsional)</Label><Input type="date" min={dateInputValue()} value={scheduleDate} onChange={(event) => { setScheduleDate(event.target.value); setScheduleOptions([]); setProposedStartAt(""); }} className="mt-2 h-11 rounded-xl" /></div><Button type="button" onClick={() => void loadScheduleOptions()} disabled={loadingScheduleOptions} className="h-11 self-end rounded-xl bg-slate-900">{loadingScheduleOptions ? <Loader2 className="mr-2 animate-spin" size={16} /> : <CalendarClock className="mr-2" size={16} />}Cari slot tutor</Button></div>
                        {scheduleOptions.length > 0 && <div><Label>Pilih slot yang sudah diperiksa</Label><div className="mt-2 grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">{scheduleOptions.map((option) => <button key={option.start_at} type="button" onClick={() => setProposedStartAt(option.start_at)} className={`min-h-12 rounded-xl border p-3 text-left text-xs font-black ${proposedStartAt === option.start_at ? "border-violet-600 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-700"}`}><span className="block">{option.label}</span>{option.affected_count > 1 && <span className="mt-1 block text-[10px] font-semibold text-slate-500">Menggeser {option.affected_count} sesi dengan pola yang sama</span>}</button>)}</div></div>}
                        <div><Label>Alasan perubahan</Label><Textarea required minLength={20} maxLength={1500} value={scheduleReason} onChange={(event) => setScheduleReason(event.target.value)} className="mt-2 min-h-24 rounded-xl" placeholder="Jelaskan alasan perubahan jadwal" /></div>
                        <p className="text-[11px] font-medium leading-5 text-violet-700">Jadwal lama tetap aktif sampai seluruh pihak menyetujui. Slot diperiksa kembali saat disetujui.</p>
                        <Button disabled={processing || !proposedStartAt} className="h-11 w-full rounded-xl bg-violet-600 hover:bg-violet-700">Ajukan perubahan</Button>
                      </form>
                    )}
                    <div className="mt-3 space-y-3">{hub.schedule_changes.map((change) => <article key={change.id} className="rounded-2xl border border-violet-100 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black text-slate-900">Usulan {change.requester_name}</p><p className="mt-1 text-xs text-slate-500">{change.scope === "future" ? `${change.affected_count} sesi mulai sesi ini` : "Sesi ini saja"} · Dari {dateTime(change.original_start_at)} menjadi {dateTime(change.proposed_start_at)}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black ${change.status === "approved" ? "bg-emerald-50 text-emerald-700" : change.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{change.status === "pending" ? "Menunggu persetujuan" : change.status === "approved" ? "Disetujui" : "Ditolak"}</span></div><p className="mt-3 break-words text-xs leading-5 text-slate-600">{change.reason}</p>{change.responses.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{change.responses.map((response, index) => <span key={`${response.user_name}-${index}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{response.user_name}: {response.decision === "pending" ? "menunggu" : response.decision === "approved" ? "setuju" : "menolak"}</span>)}</div>}{change.can_respond && <div className="mt-4"><Input value={scheduleResponseNotes[change.id] || ""} onChange={(event) => setScheduleResponseNotes((current) => ({ ...current, [change.id]: event.target.value }))} maxLength={1000} className="h-10 rounded-xl" placeholder="Alasan bila menolak (minimal 10 karakter)" /><div className="mt-2 grid grid-cols-2 gap-2"><Button type="button" variant="outline" disabled={processing || (scheduleResponseNotes[change.id] || "").trim().length < 10} onClick={() => void respondScheduleChange(change.id, "rejected")} className="rounded-xl border-rose-200 text-rose-700">Tolak</Button><Button type="button" disabled={processing} onClick={() => void respondScheduleChange(change.id, "approved")} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">Setujui</Button></div></div>}</article>)}</div>
                  </div>
                )}
              </div>
            )}

            {tab === "chat" && (
              <div className="space-y-4">
                <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
                  {hub.messages.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-500">Belum ada pesan pada sesi ini.</p>
                  ) : hub.messages.map((item) => item.message_type === "system" ? (
                    <div key={item.id} className="flex justify-center">
                      <div className="w-full max-w-xl rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[.15em] text-indigo-500">{item.metadata?.title || "Informasi BimbelKu"}</p>
                        <p className="mt-1 text-xs leading-5 text-indigo-950">{item.body}</p>
                        {item.metadata?.action_url && <a href={String(item.metadata.action_url)} className="mt-2 inline-flex text-xs font-black text-indigo-700 underline underline-offset-4">{item.metadata.action_label || "Lihat detail"}</a>}
                      </div>
                    </div>
                  ) : (
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
                    {!hub.learning_plan && (
                      <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 sm:col-span-2">
                        <p className="text-[11px] font-black uppercase tracking-[.14em] text-violet-500">Setelah kehadiran · sebelum hasil belajar</p>
                        <p className="mt-1 text-sm font-black text-violet-950">Tentukan tujuan belajar untuk sesi ini</p>
                        <p className="mt-1 text-xs leading-5 text-violet-700">Isi arah belajar dengan bahasa yang sederhana dan terukur. Setelah disimpan, murid akan diminta menyetujuinya sebelum progress pertemuan dapat diterbitkan.</p>
                      </div>
                    )}
                    <FieldArea label="Hasil asesmen awal" value={planForm.initial_assessment} onChange={(value) => setPlanForm({ ...planForm, initial_assessment: value })} required className="sm:col-span-2" />
                    <FieldArea label="Kemampuan yang sudah dikuasai" value={planForm.strengths} onChange={(value) => setPlanForm({ ...planForm, strengths: value })} />
                    <FieldArea label="Kesulitan utama" value={planForm.challenges} onChange={(value) => setPlanForm({ ...planForm, challenges: value })} />
                    <FieldArea label="Tujuan belajar" value={planForm.learning_target} onChange={(value) => setPlanForm({ ...planForm, learning_target: value })} required />
                    <FieldArea label="Indikator keberhasilan" value={planForm.success_indicator} onChange={(value) => setPlanForm({ ...planForm, success_indicator: value })} required />
                    <div><Label>Nilai awal (opsional)</Label><Input type="number" min={0} max={100} value={planForm.baseline_score} onChange={(event) => setPlanForm({ ...planForm, baseline_score: event.target.value })} className="mt-2 rounded-xl" /></div>
                    <div><Label>Target nilai (opsional)</Label><Input type="number" min={0} max={100} value={planForm.target_score} onChange={(event) => setPlanForm({ ...planForm, target_score: event.target.value })} className="mt-2 rounded-xl" /></div>
                    <Button disabled={processing} className="rounded-xl bg-indigo-600 sm:col-span-2">Simpan dan minta persetujuan murid</Button>
                  </form>
                ) : hub.learning_plan ? (
                  <PlanSummary plan={hub.learning_plan} />
                ) : (
                  <p className="rounded-2xl bg-slate-50 py-16 text-center text-sm text-slate-500">Tutor belum menerbitkan asesmen awal dan tujuan belajar.</p>
                )}
                {hub.role === "student" && hub.permissions.can_acknowledge_plan && (
                  <Button onClick={acknowledgePlan} disabled={processing} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 size={16} className="mr-2" />Setujui tujuan belajar
                  </Button>
                )}
              </div>
            )}

            {tab === "progress" && (
              <div className="space-y-5">
                {(hub.learning_plan || hub.learning_topics.length > 0) && (() => {
                  const progress = hub.learning_topics.length ? hub.material_progress_percent : (hub.learning_plan?.progress_percent || 0);
                  return <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    <div className="flex items-center justify-between gap-3 text-sm font-black text-indigo-950"><span>Progres materi</span><span>{progress}%</span></div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} /></div>
                    {hub.learning_topics.length > 0 && <p className="mt-2 text-xs font-semibold text-indigo-700">{hub.learning_topics.filter((topic) => topic.status === "completed").length} dari {hub.learning_topics.length} subbab selesai.</p>}
                  </div>;
                })()}
                {hub.role === "teacher" && !hub.permissions.can_report_progress && hub.attendance?.check_out_at && hub.progress_reports.length > 0 && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                    <p className="font-black">Progress sesi sudah tersimpan</p>
                    <p className="mt-1 text-xs">Jika seluruh murid hadir sudah memiliki laporan, kembali ke Kelas Saya lalu lanjutkan <b>Konfirmasi Sesi</b>. Laporan yang sudah disimpan dikunci untuk menjaga jejak akademik.</p>
                  </div>
                )}
                {hub.role === "teacher" && hub.permissions.can_report_progress && (
                  <form onSubmit={saveProgress} className="grid gap-4 rounded-2xl border border-slate-200 p-5 sm:grid-cols-2">
                    {hub.booking.class_type === "group" && <div className="sm:col-span-2"><Label>Murid yang dilaporkan</Label><Select value={reportForm.student_id} onValueChange={(student_id) => setReportForm({ ...reportForm, student_id })}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue placeholder="Pilih satu murid" /></SelectTrigger><SelectContent>{hub.participants.filter((item) => item.attendance?.status !== "absent").map((item) => <SelectItem key={item.student_id} value={String(item.student_id)}>{item.name} · {item.attendance?.status || "kehadiran belum dicatat"}</SelectItem>)}</SelectContent></Select></div>}
                    {hub.learning_topics.length > 0 && <div className="sm:col-span-2 space-y-3"><div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-indigo-500">Langkah 4 dari 5</p><p className="mt-1 text-sm font-black text-indigo-950">Catat progress sebelum Konfirmasi Sesi</p><p className="mt-1 text-xs leading-5 text-indigo-700">Progress harus menggambarkan hasil belajar yang benar. Jika sesi hanya review, latihan, evaluasi, remedial, atau tidak mengubah posisi materi, gunakan pilihan tanpa perubahan.</p><p className="mt-2 text-[11px] font-semibold leading-5 text-indigo-600">Periksa pilihan sebelum menyimpan. Laporan yang sudah disimpan dikunci agar riwayat akademik tidak berubah diam-diam.</p></div><label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${reportForm.no_material_change ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}><input type="checkbox" checked={reportForm.no_material_change} onChange={(event) => { const checked = event.target.checked; setReportForm((current) => ({ ...current, no_material_change: checked, no_change_reason: checked ? current.no_change_reason : "" })); if (checked) setTopicUpdates((current) => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, { ...value, selected: false }]))); }} className="mt-1 h-4 w-4" /><span><span className="block text-sm font-black text-slate-900">Tidak ada perubahan progress materi pada sesi ini</span><span className="mt-1 block text-xs leading-5 text-slate-500">Pilih ini bila sesi tetap valid tetapi tidak mengubah status subbab.</span></span></label>{reportForm.no_material_change && <div><Label>Alasan tidak ada perubahan</Label><Select value={reportForm.no_change_reason} onValueChange={(no_change_reason) => setReportForm((current) => ({ ...current, no_change_reason }))}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue placeholder="Pilih alasan" /></SelectTrigger><SelectContent><SelectItem value="review">Review materi</SelectItem><SelectItem value="practice">Latihan soal</SelectItem><SelectItem value="evaluation">Evaluasi / ujian</SelectItem><SelectItem value="remedial">Remedial</SelectItem><SelectItem value="session_disrupted">Sesi tidak berjalan penuh</SelectItem><SelectItem value="other">Lainnya</SelectItem></SelectContent></Select></div>}<div className={reportForm.no_material_change ? "pointer-events-none opacity-50" : ""}><div className="flex flex-wrap items-center justify-between gap-2"><div><Label>Subbab yang dibahas</Label><p className="mt-1 text-xs text-slate-500">Pilih subbab, lalu tetapkan hasil sesi. Subbab selesai hanya dihitung sekali.</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{hub.material_progress_percent}% tuntas</span></div><div className="mt-3 space-y-2">{hub.learning_topics.map((topic) => { const value = topicUpdates[topic.id] || { selected: false, activity_type: topic.status === "not_started" ? "taught" : "continued", status_after: topic.status === "completed" ? "completed" : "in_progress", needs_review: Boolean(topic.needs_review), notes: "" }; return <div key={topic.id} className={`rounded-xl border p-3 ${value.selected ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"}`}><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={value.selected} onChange={(event) => setTopicUpdates((current) => ({ ...current, [topic.id]: { ...value, selected: event.target.checked } }))} className="mt-1 h-4 w-4" /><span className="min-w-0 flex-1"><span className="block text-xs font-black text-slate-900">{topic.title}</span><span className="mt-0.5 block text-[10px] text-slate-500">{topic.chapter || "Materi"} · Status saat ini: {topic.status === "completed" ? (topic.needs_review ? "selesai, perlu diulang" : "selesai") : topic.status === "in_progress" ? "sedang dipelajari" : topic.status === "review_needed" ? "perlu diulang" : "belum dipelajari"}</span></span></label>{value.selected && <div className="mt-3 grid gap-2 sm:grid-cols-2"><Select value={value.activity_type} onValueChange={(nextValue) => { const activity_type = nextValue as TopicUpdateState["activity_type"]; setTopicUpdates((current) => ({ ...current, [topic.id]: { ...value, activity_type } })); }}><SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="taught">Materi baru</SelectItem><SelectItem value="continued">Melanjutkan</SelectItem><SelectItem value="reviewed">Mengulang</SelectItem></SelectContent></Select><Select value={value.status_after} onValueChange={(nextValue) => { const status_after = nextValue as TopicUpdateState["status_after"]; setTopicUpdates((current) => ({ ...current, [topic.id]: { ...value, status_after, needs_review: status_after === "completed" ? value.needs_review : false } })); }}><SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in_progress">Belum selesai</SelectItem><SelectItem value="completed">Selesai</SelectItem></SelectContent></Select>{value.status_after === "completed" && <label className="flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-800 sm:col-span-2"><input type="checkbox" checked={value.needs_review} onChange={(event) => setTopicUpdates((current) => ({ ...current, [topic.id]: { ...value, needs_review: event.target.checked } }))} />Perlu diulang pada sesi berikutnya, tetapi tetap dihitung selesai</label>}<Input value={value.notes} onChange={(event) => setTopicUpdates((current) => ({ ...current, [topic.id]: { ...value, notes: event.target.value } }))} className="h-10 rounded-xl sm:col-span-2" placeholder="Catatan subbab (opsional)" /></div>}</div>; })}</div></div></div>}
                    <FieldArea label="Materi yang dipelajari" value={reportForm.material_covered} onChange={(value) => setReportForm({ ...reportForm, material_covered: value })} required />
                    <FieldArea label="Kemampuan yang dikuasai" value={reportForm.mastered_skills} onChange={(value) => setReportForm({ ...reportForm, mastered_skills: value })} required />
                    <FieldArea label="Kesulitan murid" value={reportForm.difficulties} onChange={(value) => setReportForm({ ...reportForm, difficulties: value })} />
                    <FieldArea label="Latihan berikutnya" value={reportForm.next_exercise} onChange={(value) => setReportForm({ ...reportForm, next_exercise: value })} required />
                    <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><b>Kehadiran tidak diisi ulang.</b><br />Status diambil dari catatan kehadiran pada tab Sesi.</div>
                    {hub.learning_topics.length === 0 ? <div><Label>Progres target (%)</Label><Input required type="number" min={0} max={100} value={reportForm.progress_percent} onChange={(event) => setReportForm({ ...reportForm, progress_percent: event.target.value })} className="mt-2 rounded-xl" /></div> : <div className="rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><b>Progres dihitung otomatis.</b><br />Persentase berasal dari jumlah subbab unik yang berstatus selesai.</div>}
                    <FieldArea label="Catatan tambahan" value={reportForm.notes} onChange={(value) => setReportForm({ ...reportForm, notes: value })} className="sm:col-span-2" />
                    <Button disabled={processing || (hub.learning_topics.length > 0 && reportForm.no_material_change && !reportForm.no_change_reason)} className="rounded-xl bg-indigo-600 sm:col-span-2">Simpan Progress Sesi</Button>
                  </form>
                )}
                <div className="space-y-3">
                  {hub.progress_reports.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 py-14 text-center text-sm text-slate-500">Laporan perkembangan belum tersedia.</p>
                  ) : hub.progress_reports.map((report) => (
                    <article key={report.id} className="rounded-2xl border border-slate-200 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-slate-900">Laporan sesi {report.session_number}{report.student_name ? ` · ${report.student_name}` : ""}</p><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{report.progress_percent}%</span></div>
                      <p className="mt-1 text-xs text-slate-400">{dateTime(report.published_at)} · {report.actual_duration_minutes} menit</p>
                      {report.no_material_change && <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">Tidak ada perubahan status materi · {noChangeReasonLabel(report.no_change_reason)}</div>}
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <Info label="Materi" value={report.material_covered} />
                        <Info label="Dikuasai" value={report.mastered_skills} />
                        <Info label="Kesulitan" value={report.difficulties || "-"} />
                        <Info label="Latihan berikutnya" value={report.next_exercise} />
                      </div>
                      {report.topics?.length ? <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Subbab sesi ini</p><div className="mt-2 flex flex-wrap gap-2">{report.topics.map((topic) => <span key={topic.topic_id} className={`rounded-full px-3 py-1 text-xs font-bold ${topic.status_after === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{topic.title || "Subbab"} · {topic.status_after === "completed" ? (topic.needs_review ? "selesai, perlu diulang" : "selesai") : "belum selesai"}</span>)}</div></div> : null}
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

function TabButton({ active, onClick, icon: Icon, label, attention = false }: { active: boolean; onClick: () => void; icon: typeof Target; label: string; attention?: boolean }) {
  return <button type="button" onClick={onClick} className={`relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black transition ${active ? "bg-white text-indigo-700 shadow-sm" : attention ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200" : "text-slate-500 hover:text-slate-800"}`}><Icon size={16} />{label}{attention && !active && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500" aria-label="Perlu diisi" />}</button>;
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
      <Info label="Tujuan belajar" value={plan.learning_target} />
      <Info label="Indikator berhasil" value={plan.success_indicator} />
      <Info label="Status persetujuan" value={plan.student_acknowledged_at ? `Disetujui ${dateTime(plan.student_acknowledged_at)}` : "Menunggu persetujuan murid"} />
    </div>
  );
}
