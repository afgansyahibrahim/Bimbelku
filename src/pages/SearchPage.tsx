import { notify } from "@/lib/notify";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileUp,
  GraduationCap,
  LocateFixed,
  MapPin,
  Monitor,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
  Users,
  XCircle,
} from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import SubjectCombobox, { SubjectOption } from "@/components/SubjectCombobox";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import http, { getApiError, getCached, STORAGE_BASE_URL } from "@/lib/http";
import { isValidHttpUrl, isValidPhone, sanitizePhoneInput, validateUpload } from "@/lib/validation";
import { educationDetailLabel } from "@/lib/educationCatalog";

interface Topic {
  id: number;
  subject_name: string;
  education_level: string;
  grade: string;
  chapter: string;
  name: string;
}

interface Catalog {
  subjects: string[];
  subject_options?: SubjectOption[];
  chapters?: {
    id: number;
    subject_id: number;
    subject_name: string;
    education_level: string;
    grade: string;
    title: string;
    sort_order: number;
  }[];
  topics?: Topic[];
  education_levels: string[];
  grades_by_level: Record<string, string[]>;
  class_types: { value: ClassType; label: string }[];
  learning_modes: { value: LearningMode; label: string }[];
}

type ClassType = "private" | "group";
type LearningMode = "online" | "offline";

interface BookingForm {
  subject_name: string;
  education_level: string;
  grade: string;
  chapter: string;
  subtopic: string;
  topic: string;
  learning_goal: string;
  learning_mode: LearningMode;
  class_type: ClassType;
  scheduled_date: string;
  start_time: string;
  duration_hours: string;
  address: string;
  maps_link: string;
  latitude: string;
  longitude: string;
  contact_number: string;
}

interface AvailabilityResult {
  status: "available" | "not_found";
  has_candidate: boolean;
  search_radius_km: number;
  message: string;
}

interface OrderSummary {
  id: number;
  order_id: string;
  status: string;
  payment_rejection_reason?: string;
}

interface BookingRequestItem {
  id: number;
  subject_name: string;
  education_level: string;
  grade: string;
  chapter?: string;
  subtopic?: string;
  topic?: string;
  learning_mode: "online" | "offline";
  class_type: "private" | "group";
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  status: string;
  hourly_rate: number;
  total_amount: number;
  search_radius_km?: number;
  search_expires_at?: string;
  teacher_decision_deadline?: string;
  payment_due_at?: string;
  group_member_count?: number;
  group_minimum?: number;
  group_maximum?: number;
  group_decision_deadline?: string;
  is_group_host?: boolean;
  group_meeting_distance_km?: number;
  matched_teacher?: {
    id: number;
    name: string;
    ratings?: { rating: number }[];
    teacher_profile?: {
      photo?: string;
      bio?: string;
      expertise?: string;
      points?: number;
      experience?: string;
    };
  };
  booking?: { id: number; status: string };
  my_order?: OrderSummary;
}

const initialForm: BookingForm = {
  subject_name: "",
  education_level: "SD",
  grade: "Kelas 1",
  chapter: "",
  subtopic: "",
  topic: "",
  learning_goal: "",
  learning_mode: "online",
  class_type: "private",
  scheduled_date: "",
  start_time: "",
  duration_hours: "1",
  address: "",
  maps_link: "",
  latitude: "",
  longitude: "",
  contact_number: "",
};

const activeRadarStatuses = [
  "group_forming",
  "matching",
  "teacher_pending",
  "teacher_accepted_waiting_group",
];
const cancellableStatuses = [
  "group_forming",
  "group_decision_required",
  "matching",
  "teacher_pending",
  "no_teacher",
  "expired",
  "student_cooldown",
  "teacher_accepted_waiting_group",
  "awaiting_payment",
  "payment_rejected",
];

const statuses: Record<string, { label: string; tone: string; description: string }> = {
  group_forming: { label: "Mengumpulkan kelompok", tone: "amber", description: "Menunggu murid dengan kebutuhan dan jadwal yang sama." },
  group_decision_required: { label: "Kelompok belum terpenuhi", tone: "amber", description: "Pilih ubah ke privat atau batalkan tanpa biaya." },
  matching: { label: "Radar mencari tutor", tone: "indigo", description: "Kecocokan materi, jadwal, performa, dan jarak sedang dihitung." },
  teacher_pending: { label: "Menunggu jawaban tutor", tone: "indigo", description: "Satu tutor yang memenuhi syarat sedang memeriksa permintaan." },
  teacher_selected: { label: "Tutor ditemukan", tone: "emerald", description: "Tinjau profil tutor sebelum melanjutkan ke pembayaran." },
  teacher_accepted_waiting_group: { label: "Menunggu anggota", tone: "indigo", description: "Kamu sudah menerima tutor. Pembayaran dibuka setelah semua anggota aktif memberi keputusan." },
  awaiting_payment: { label: "Menunggu pembayaran", tone: "orange", description: "Transfer ke rekening admin lalu unggah bukti." },
  payment_submitted: { label: "Bukti sedang diperiksa", tone: "sky", description: "Admin akan menerima atau menolak bukti pembayaran." },
  payment_verified: { label: "Pembayaran diterima", tone: "sky", description: "Menunggu pembayaran anggota minimum agar kelas kelompok dikonfirmasi." },
  payment_rejected: { label: "Bukti ditolak", tone: "rose", description: "Periksa alasan admin lalu unggah bukti baru sebelum batas waktu." },
  confirmed: { label: "Sesi dikonfirmasi", tone: "emerald", description: "Tutor dan jadwal sudah dikunci." },
  in_progress: { label: "Sesi berlangsung", tone: "emerald", description: "Sesi sedang berjalan sesuai jadwal." },
  awaiting_student_approval: { label: "Menunggu persetujuanmu", tone: "amber", description: "Periksa bukti pelaksanaan pada halaman Kelas Saya." },
  no_teacher: { label: "Tutor belum ditemukan", tone: "slate", description: "Perluas radius atau perpanjang pencarian bila masih memungkinkan." },
  expired: { label: "Pencarian berakhir", tone: "rose", description: "Pencarian dapat diperpanjang sampai batas 48 jam sejak awal." },
  student_cooldown: { label: "Pencarian dibatasi", tone: "rose", description: "Tunggu masa pembatasan berakhir sebelum mencari tutor lain." },
  cancelled: { label: "Dibatalkan", tone: "slate", description: "Permintaan ini tidak lagi aktif." },
  payment_expired: { label: "Waktu pembayaran berakhir", tone: "rose", description: "Pesanan ditutup karena pembayaran tidak selesai." },
  completed: { label: "Selesai", tone: "emerald", description: "Sesi telah disetujui dan pendapatan tutor siap diproses." },
  disputed: { label: "Keberatan diperiksa", tone: "rose", description: "Admin sedang memeriksa bukti dari kedua pihak." },
  absence_review: { label: "Kehadiran diperiksa", tone: "rose", description: "Admin sedang memeriksa laporan ketidakhadiran dan bukti terkait." },
  teacher_absence_review: { label: "Kehadiran tutor diperiksa", tone: "rose", description: "Laporan ketidakhadiran tutor sedang ditinjau admin." },
  admin_review_required: { label: "Bukti diperiksa admin", tone: "amber", description: "Masa keputusan berakhir atau bukti belum lengkap; admin akan menentukan hasilnya." },
  emergency_refund_pending: { label: "Refund keadaan darurat", tone: "amber", description: "Refund penuh masuk antrean sambil admin memeriksa laporan tutor." },
  refund_pending: { label: "Refund diproses", tone: "amber", description: "Admin akan mentransfer refund penuh secara manual." },
  refunded: { label: "Refund selesai", tone: "emerald", description: "Refund telah ditransfer dan dicatat." },
};

const statusBadge: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700",
  indigo: "bg-indigo-50 text-indigo-700",
  emerald: "bg-emerald-50 text-emerald-700",
  orange: "bg-orange-50 text-orange-700",
  sky: "bg-sky-50 text-sky-700",
  rose: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-600",
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));

const today = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const FULL_HOUR_OPTIONS = Array.from({ length: 23 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);

const nextFullHourTime = () => {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(now.getHours() + 1, 0, 0, 0);
  if (candidate.toDateString() !== now.toDateString() || candidate.getHours() >= 23) return "";
  return `${String(candidate.getHours()).padStart(2, "0")}:00`;
};

const radarLabel = (item: BookingRequestItem) => {
  if (item.status === "group_forming") {
    return `Mencari anggota ${item.group_member_count || 1}/${item.group_minimum || 2}`;
  }
  if (item.status === "teacher_pending") return "Sinyal tutor ditemukan";
  if (item.status === "teacher_accepted_waiting_group") return "Menunggu keputusan anggota";
  return item.learning_mode === "offline"
    ? `Memindai radius ${item.search_radius_km || 3} km`
    : "Mencocokkan tutor online";
};

export default function SearchPage() {
  const navigate = useNavigate();
  const confirm = useConfirmDialog();
  const [searchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogDetailsKey, setCatalogDetailsKey] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [requests, setRequests] = useState<BookingRequestItem[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [rejecting, setRejecting] = useState<BookingRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState("not_suitable");
  const [rejectNote, setRejectNote] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const grades = catalog?.grades_by_level[form.education_level] || [];
  const subjectOptions = useMemo<SubjectOption[]>(
    () => catalog?.subject_options?.length
      ? catalog.subject_options
      : (catalog?.subjects || []).map((name, index) => ({ id: -(index + 1), name })),
    [catalog],
  );
  const selectedDetailsKey = `${form.education_level}|${form.grade}|${form.subject_name}`;
  const hasCurrentCatalogDetails = catalogDetailsKey === selectedDetailsKey;
  const filteredTopics = useMemo(
    () => (hasCurrentCatalogDetails ? catalog?.topics || [] : []).filter(
      (topic) =>
        topic.subject_name === form.subject_name &&
        topic.education_level === form.education_level &&
        topic.grade === form.grade,
    ),
    [catalog?.topics, form.subject_name, form.education_level, form.grade, hasCurrentCatalogDetails],
  );
  const chapters = useMemo(() => {
    const seeded = (hasCurrentCatalogDetails ? catalog?.chapters || [] : [])
      .filter((chapter) =>
        chapter.subject_name === form.subject_name
        && chapter.education_level === form.education_level
        && chapter.grade === form.grade)
      .map((chapter) => chapter.title);
    return ["Seluruh materi mapel", ...new Set([...seeded, ...filteredTopics.map((topic) => topic.chapter)])];
  }, [catalog?.chapters, filteredTopics, form.education_level, form.grade, form.subject_name, hasCurrentCatalogDetails]);
  const subtopics = filteredTopics.filter((topic) => topic.chapter === form.chapter);
  const estimatedEnd = useMemo(() => {
    if (!form.start_time) return "--:--";
    const [hours] = form.start_time.split(":").map(Number);
    return `${String(hours + 1).padStart(2, "0")}:00`;
  }, [form.start_time]);
  const scheduleIssue = useMemo(() => {
    if (!form.scheduled_date || !form.start_time) return null;

    const [hours, minutes] = form.start_time.split(":").map(Number);
    const durationMinutes = 60;
    if ((hours * 60) + minutes + durationMinutes >= 24 * 60) {
      return "Sesi harus selesai pada hari yang sama. Pilih jam mulai paling lambat 22.00.";
    }

    const startAt = new Date(`${form.scheduled_date}T${form.start_time}:00`);
    if (minutes !== 0) {
      return "Jam mulai hanya boleh menggunakan menit 00.";
    }
    if (startAt.getTime() <= Date.now()) {
      return "Pilih waktu mulai terdekat yang belum berlalu.";
    }

    return null;
  }, [form.scheduled_date, form.start_time]);

  useEffect(() => {
    const ready = currentStep >= 3
      && Boolean(form.subject_name)
      && Boolean(form.grade)
      && Boolean(form.scheduled_date)
      && Boolean(form.start_time)
      && !scheduleIssue
      && (
        form.learning_mode === "online"
        || (Boolean(form.latitude) && Boolean(form.longitude))
      );

    if (!ready) {
      setAvailability(null);
      setAvailabilityLoading(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setAvailabilityLoading(true);
      void http.post<AvailabilityResult>("/student/tutor-availability", {
        subject_name: form.subject_name,
        education_level: form.education_level,
        grade: form.grade,
        learning_mode: form.learning_mode,
        class_type: form.class_type,
        scheduled_date: form.scheduled_date,
        start_time: form.start_time,
        duration_hours: Number(form.duration_hours),
        latitude: form.learning_mode === "offline" ? Number(form.latitude) : null,
        longitude: form.learning_mode === "offline" ? Number(form.longitude) : null,
      })
        .then((response) => {
          if (active) setAvailability(response.data);
        })
        .catch((error) => {
          if (active) {
            setAvailability({
              status: "not_found",
              has_candidate: false,
              search_radius_km: form.learning_mode === "offline" ? 3 : 12,
              message: getApiError(error, "Pemeriksaan ketersediaan belum dapat dilakukan."),
            });
          }
        })
        .finally(() => {
          if (active) setAvailabilityLoading(false);
        });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    currentStep,
    form.class_type,
    form.duration_hours,
    form.education_level,
    form.grade,
    form.latitude,
    form.learning_mode,
    form.longitude,
    form.scheduled_date,
    form.start_time,
    form.subject_name,
    scheduleIssue,
  ]);

  const nextStep = () => {
    if (currentStep === 1) {
      if (!form.subject_name || !form.grade || !form.chapter.trim()) {
        notify.error("Lengkapi jenjang, mata pelajaran, dan materi utama.");
        return;
      }
    }
    if (currentStep === 2 && form.learning_mode === "offline") {
      if (!form.address.trim()) {
        notify.error("Alamat pertemuan wajib diisi untuk kelas offline.");
        return;
      }
      if (!isValidPhone(form.contact_number)) {
        notify.error("Nomor WhatsApp atau telepon belum valid.");
        return;
      }
      if (!form.latitude || !form.longitude) {
        notify.error("Gunakan lokasi perangkat untuk pencarian tutor offline.");
        return;
      }
      if (!isValidHttpUrl(form.maps_link)) {
        notify.error("Tautan Google Maps harus diawali http:// atau https://.");
        return;
      }
    }
    if (currentStep === 3) {
      if (!form.scheduled_date || !form.start_time) {
        notify.error("Pilih tanggal dan jam mulai.");
        return;
      }
      if (scheduleIssue) {
        notify.error(scheduleIssue);
        return;
      }
    }

    setCurrentStep((step) => Math.min(4, step + 1));
  };

  const applyRequestResponse = useCallback((payload: { data?: BookingRequestItem[]; search_cooldown_until?: string | null }) => {
    setRequests(payload.data || []);
    setCooldownUntil(payload.search_cooldown_until || null);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogResponse, requestResponse, profileResponse] = await Promise.all([
        getCached<Catalog>("/learning-catalog", {
          params: { compact: 1 },
          maxAgeMs: 5 * 60_000,
        }),
        http.get("/student/booking-requests"),
        getCached("/user", { maxAgeMs: 60_000 }),
      ]);
      setCatalog(catalogResponse.data);
      applyRequestResponse(requestResponse.data);
      const subject = searchParams.get("subject") || searchParams.get("q");
      if (subject && catalogResponse.data.subjects.includes(subject)) {
        setForm((current) => ({
          ...current,
          subject_name: subject,
          chapter: "Seluruh materi mapel",
        }));
      }
      setForm((current) => ({
        ...current,
        contact_number: sanitizePhoneInput(profileResponse.data?.phone || current.contact_number),
        address: profileResponse.data?.address || current.address,
        maps_link: profileResponse.data?.maps_link || current.maps_link,
        latitude: profileResponse.data?.latitude?.toString() || current.latitude,
        longitude: profileResponse.data?.longitude?.toString() || current.longitude,
      }));
    } catch (error) {
      notify.error(getApiError(error, "Data pencarian bimbel gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, [applyRequestResponse, searchParams]);

  const refreshRequests = useCallback(async (notify = true) => {
    try {
      const response = await http.get("/student/booking-requests");
      applyRequestResponse(response.data);
      if (notify) notify.success("Status permintaan diperbarui.");
    } catch (error) {
      if (notify) notify.error(getApiError(error));
    }
  }, [applyRequestResponse]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const subjectName = form.subject_name.trim();
    if (!subjectName) {
      setCatalogDetailsKey(null);
      setDetailsLoading(false);
      return;
    }

    let active = true;
    const requestKey = `${form.education_level}|${form.grade}|${subjectName}`;
    setCatalogDetailsKey(null);
    setDetailsLoading(true);

    void getCached<Catalog>("/learning-catalog", {
      params: {
        subject_name: subjectName,
        education_level: form.education_level,
        grade: form.grade,
      },
      maxAgeMs: 5 * 60_000,
    })
      .then((response) => {
        if (!active) return;
        setCatalog((current) => current ? {
          ...current,
          chapters: response.data.chapters || [],
          topics: response.data.topics || [],
        } : current);
        setCatalogDetailsKey(requestKey);
      })
      .catch((error) => {
        if (active) notify.error(getApiError(error, "Daftar bab gagal dimuat."));
      })
      .finally(() => {
        if (active) setDetailsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form.education_level, form.grade, form.subject_name]);

  useEffect(() => {
    if (!requests.some((item) => [...activeRadarStatuses, "teacher_selected", "payment_submitted"].includes(item.status))) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshRequests(false);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [refreshRequests, requests]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const requestSnapshot = { ...form };
    if (!form.subject_name || !form.grade || !form.chapter.trim()) {
      notify.error("Lengkapi jenjang, mata pelajaran, dan materi utama.");
      setCurrentStep(1);
      return;
    }
    if (scheduleIssue) {
      notify.error(scheduleIssue);
      setCurrentStep(3);
      return;
    }
    if (form.learning_mode === "offline" && (!form.latitude || !form.longitude)) {
      notify.error("Aktifkan titik lokasi untuk pencarian offline.");
      return;
    }
    if (form.learning_mode === "offline" && !form.address.trim()) {
      notify.error("Alamat pertemuan wajib diisi untuk kelas offline.");
      return;
    }
    if (form.learning_mode === "offline" && !isValidPhone(form.contact_number)) {
      notify.error("Nomor WhatsApp/telepon belum valid.");
      return;
    }
    if (!isValidHttpUrl(form.maps_link)) {
      notify.error("Tautan Google Maps harus diawali http:// atau https://.");
      return;
    }

    const payload = new FormData();
    Object.entries(requestSnapshot).forEach(([key, value]) => payload.append(key, value));
    if (attachment) payload.append("attachment", attachment);
    setSubmitting(true);
    try {
      const response = await http.post("/student/booking-requests", payload);
      const createdRequest = response.data?.data as BookingRequestItem | undefined;
      if (!createdRequest || createdRequest.class_type !== requestSnapshot.class_type) {
        if (createdRequest?.id) {
          await http.post(`/student/booking-requests/${createdRequest.id}/cancel`);
        }
        notify.error("Jenis kelas tidak tersimpan sesuai pilihan. Permintaan dibatalkan otomatis.");
        await refreshRequests(false);
        return;
      }
      notify.success(
        `${response.data.message} Jenis kelas: ${requestSnapshot.class_type === "private" ? "Privat" : "Kelompok"}.`,
      );
      setForm((current) => ({
        ...initialForm,
        contact_number: current.contact_number,
        address: current.address,
        maps_link: current.maps_link,
        latitude: current.latitude,
        longitude: current.longitude,
      }));
      setAttachment(null);
      setAvailability(null);
      setCurrentStep(1);
      await refreshRequests(false);
    } catch (error) {
      notify.error(getApiError(error, "Permintaan bimbel gagal dibuat."));
    } finally {
      setSubmitting(false);
    }
  };

  const postAction = async (id: number, path: string, payload?: unknown) => {
    setProcessing(id);
    try {
      const response = await http.post(`/student/booking-requests/${id}/${path}`, payload);
      notify.success(response.data.message);
      await refreshRequests(false);
      return response.data;
    } catch (error) {
      notify.error(getApiError(error));
      return null;
    } finally {
      setProcessing(null);
    }
  };

  const cancel = async (item: BookingRequestItem) => {
    const approved = await confirm({
      title: "Batalkan permintaan?",
      description: "Pencarian dan penawaran tutor untuk jadwal ini akan dihentikan.",
      confirmText: "Ya, batalkan",
      tone: "danger",
    });
    if (approved) await postAction(item.id, "cancel");
  };

  const acceptTeacher = async (item: BookingRequestItem) => {
    const approved = await confirm({
      title: "Terima tutor ini?",
      description: `Tutor akan dikunci untuk jadwal ${formatDate(item.scheduled_date)}, ${item.start_time.slice(0, 5)}–${item.end_time.slice(0, 5)}. Setelah itu Anda perlu menyelesaikan pembayaran ${formatCurrency(item.total_amount)}.`,
      confirmText: "Ya, terima tutor",
    });
    if (!approved) return;

    const result = await postAction(item.id, "teacher-decision", { action: "accept" });
    if (result?.order_id) openPayment(item, result.order_id, result.payment_due_at);
  };

  const groupDecision = async (item: BookingRequestItem, action: "convert_private" | "cancel") => {
    const convertToPrivate = action === "convert_private";
    const approved = await confirm({
      title: convertToPrivate ? "Ubah menjadi kelas privat?" : "Batalkan kelas kelompok?",
      description: convertToPrivate
        ? "Tarif akan dihitung ulang menggunakan harga privat, lalu radar mencari tutor yang sesuai untuk jadwal yang sama."
        : "Permintaan kelompok akan ditutup tanpa tagihan.",
      confirmText: convertToPrivate ? "Ya, cari privat" : "Ya, batalkan",
      tone: convertToPrivate ? "primary" : "danger",
    });
    if (approved) await postAction(item.id, "group-decision", { action });
  };

  const rejectTeacher = async () => {
    if (!rejecting) return;
    if (rejectReason === "other" && rejectNote.trim().length < 10) {
      notify.error("Jelaskan alasan lain minimal 10 karakter.");
      return;
    }
    const result = await postAction(rejecting.id, "teacher-decision", {
      action: "reject",
      reason: rejectReason,
      note: rejectNote,
    });
    if (result) {
      setRejecting(null);
      setRejectNote("");
    }
  };

  const selectAttachment = (file?: File) => {
    const error = validateUpload(file, {
      label: "Lampiran materi",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "pdf"],
    });
    if (error) {
      notify.error(error);
      setAttachment(null);
      return;
    }
    setAttachment(file || null);
  };

  const openPayment = (item: BookingRequestItem, orderId = item.my_order?.id, dueAt = item.payment_due_at) => {
    if (!orderId) {
      notify.error("Data tagihan belum tersedia.");
      return;
    }
    navigate("/payment", {
      state: {
        orderId,
        invoiceId: item.my_order?.order_id,
        tutorName: item.matched_teacher?.name || "Tutor",
        subject: item.subject_name,
        type: `${item.learning_mode === "online" ? "Online" : "Offline"} · ${item.class_type === "private" ? "Privat" : "Kelompok"}`,
        price: Number(item.total_amount),
        paymentDueAt: dueAt,
        date: item.scheduled_date,
        rejectionReason: item.my_order?.payment_rejection_reason,
      },
    });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return notify.error("Perangkat ini tidak mendukung deteksi lokasi.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({
          ...current,
          latitude: coords.latitude.toFixed(7),
          longitude: coords.longitude.toFixed(7),
        }));
        setLocating(false);
        notify.success("Titik lokasi siap digunakan.");
      },
      () => {
        setLocating(false);
        notify.error("Lokasi gagal dibaca. Periksa izin lokasi pada browser.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  if (loading) {
    return (
      <StudentLayout title="Cari Bimbingan">
        <div className="mx-auto max-w-7xl space-y-8 pb-12">
          <SearchHero />
          <div className="grid min-h-72 place-items-center rounded-[2rem] border border-slate-100 bg-white shadow-sm"><RadarLoader label="Menyiapkan radar pencarian" /></div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Cari Bimbingan">
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <SearchHero />

        {cooldownUntil && new Date(cooldownUntil) > new Date() && (
          <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
            <AlertCircle className="mt-0.5 shrink-0" />
            <div><p className="font-black">Pencarian baru sedang dibatasi</p><p className="mt-1 text-sm">Dapat digunakan kembali setelah {new Date(cooldownUntil).toLocaleString("id-ID")}.</p></div>
          </div>
        )}

        <div className="grid items-start gap-7 xl:grid-cols-[1.08fr_.92fr]">
          <form
            onSubmit={(event) => {
              if (currentStep < 4) {
                event.preventDefault();
                nextStep();
                return;
              }
              void submit(event);
            }}
            className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6 md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-500">
                  Langkah {currentStep} dari 4
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {["Kebutuhan belajar", "Jenis layanan", "Jadwal belajar", "Periksa permintaan"][currentStep - 1]}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {[
                    "Jelaskan materi agar tutor menerima kebutuhan yang tepat.",
                    "Pilih bentuk kelas dan lokasi pembelajaran.",
                    "Sistem memeriksa slot tutor sebelum permintaan dikirim.",
                    "Pastikan seluruh pilihan telah sesuai sebelum radar dijalankan.",
                  ][currentStep - 1]}
                </p>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-lg font-black text-indigo-600">
                {currentStep}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-2" aria-label={`Langkah ${currentStep} dari 4`}>
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className={`h-2 rounded-full transition ${step <= currentStep ? "bg-indigo-600" : "bg-slate-100"}`} />
              ))}
            </div>

            {currentStep === 1 && (
              <div className="mt-7 animate-in fade-in slide-in-from-right-3 duration-300">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Jenjang" icon={GraduationCap}>
                    <Select value={form.education_level} onValueChange={(value) => setForm((current) => ({ ...current, education_level: value, grade: catalog?.grades_by_level[value]?.[0] || "", subject_name: "", chapter: "Seluruh materi mapel", subtopic: "" }))}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{catalog?.education_levels.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label={educationDetailLabel(form.education_level)} icon={GraduationCap}>
                    <Select value={form.grade} onValueChange={(value) => setForm((current) => ({ ...current, grade: value, subject_name: "", chapter: "Seluruh materi mapel", subtopic: "" }))}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{grades.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  {form.education_level === "Umum" && (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-medium leading-5 text-indigo-700 md:col-span-2">
                      Pilih kemampuan saat ini. Gunakan Semua tingkat bila materi bersifat terbuka.
                    </div>
                  )}
                  <Field label="Mata pelajaran" icon={BookOpen}>
                    <SubjectCombobox
                      options={subjectOptions}
                      value={form.subject_name}
                      educationLevel={form.education_level}
                      grade={form.grade}
                      onChange={(value) => setForm((current) => ({ ...current, subject_name: value, chapter: "Seluruh materi mapel", subtopic: "" }))}
                    />
                  </Field>
                  <Field label="Bab atau materi utama" icon={BookOpen}>
                    {form.subject_name && detailsLoading ? (
                      <Input disabled className="h-12 rounded-xl" value="Memuat daftar bab…" />
                    ) : form.subject_name && chapters.length ? (
                      <Select value={form.chapter} onValueChange={(value) => setForm((current) => ({ ...current, chapter: value, subtopic: "" }))}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Pilih bab" /></SelectTrigger>
                        <SelectContent>{chapters.map((chapter) => <SelectItem key={chapter} value={chapter}>{chapter}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : <Input className="h-12 rounded-xl" placeholder="Tulis bab atau materi utama" value={form.chapter} onChange={(event) => setForm((current) => ({ ...current, chapter: event.target.value }))} />}
                  </Field>
                  <Field label="Submateri" icon={BookOpen}>
                    {subtopics.length ? (
                      <Select value={form.subtopic || "__all__"} onValueChange={(value) => setForm((current) => ({ ...current, subtopic: value === "__all__" ? "" : value }))}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Opsional" /></SelectTrigger>
                        <SelectContent><SelectItem value="__all__">Seluruh materi dalam bab</SelectItem>{subtopics.map((topic) => <SelectItem key={topic.id} value={topic.name}>{topic.name}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : <Input className="h-12 rounded-xl" placeholder="Opsional" value={form.subtopic} onChange={(event) => setForm((current) => ({ ...current, subtopic: event.target.value }))} />}
                  </Field>
                  <Field label="Tujuan belajar" icon={BookOpen}>
                    <Textarea className="min-h-24 rounded-xl" placeholder="Hasil yang ingin dicapai" value={form.learning_goal} onChange={(event) => setForm((current) => ({ ...current, learning_goal: event.target.value }))} />
                  </Field>
                  <Field label="Catatan tambahan" icon={BookOpen}>
                    <Textarea className="min-h-24 rounded-xl" placeholder="Kesulitan atau kebutuhan khusus" value={form.topic} onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))} />
                  </Field>
                </div>
                <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/40">
                  <FileUp className="shrink-0 text-indigo-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-800">Lampirkan soal atau bahan</span>
                    <span className="block truncate text-xs text-slate-500">{attachment?.name || "JPG, PNG, atau PDF · maksimum 5 MB"}</span>
                  </span>
                  <Input className="hidden" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => selectAttachment(event.target.files?.[0])} />
                </label>
              </div>
            )}

            {currentStep === 2 && (
              <div className="mt-7 animate-in fade-in slide-in-from-right-3 duration-300">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Jenis kelas" icon={Users}>
                    <div className="grid grid-cols-2 gap-2">
                      {(catalog?.class_types || []).map((item) => {
                        const selected = form.class_type === item.value;
                        const Icon = item.value === "private" ? UserRoundCheck : Users;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setForm((current) => ({ ...current, class_type: item.value }))}
                            className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${
                              selected
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                            }`}
                          >
                            <Icon size={17} />{item.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {form.class_type === "private"
                        ? "Satu tutor mendampingi satu murid."
                        : "Sistem mencari murid lain dengan kebutuhan dan jadwal yang sama."}
                    </p>
                  </Field>
                  <Field label="Mode belajar" icon={Monitor}>
                    <div className="grid grid-cols-2 gap-2">
                      {(catalog?.learning_modes || []).map((item) => {
                        const selected = form.learning_mode === item.value;
                        const Icon = item.value === "online" ? Monitor : MapPin;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setForm((current) => ({ ...current, learning_mode: item.value }))}
                            className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${
                              selected
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                            }`}
                          >
                            <Icon size={17} />{item.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                </div>

                {form.learning_mode === "online" ? (
                  <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-5 text-sm leading-6 text-sky-800">
                    Tautan kelas akan dibuka setelah pembayaran dikonfirmasi. Komunikasi tetap dilakukan melalui BimbelKu.
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                    <Label className="font-bold text-emerald-950">Alamat pertemuan</Label>
                    <Textarea className="mt-2 min-h-24 rounded-xl bg-white" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Alamat lengkap rumah murid" />
                    <Input inputMode="tel" className="mt-3 h-11 rounded-xl bg-white" value={form.contact_number} maxLength={16} onChange={(event) => setForm((current) => ({ ...current, contact_number: sanitizePhoneInput(event.target.value) }))} placeholder="Nomor WhatsApp atau telepon" />
                    <Input className="mt-3 h-11 rounded-xl bg-white" value={form.maps_link} onChange={(event) => setForm((current) => ({ ...current, maps_link: event.target.value }))} placeholder="Tautan Google Maps, opsional" />
                    <Button type="button" variant="outline" onClick={detectLocation} disabled={locating} className="mt-3 w-full rounded-xl border-emerald-200 bg-white text-emerald-700 sm:w-auto">
                      <LocateFixed size={16} className={locating ? "mr-2 animate-pulse" : "mr-2"} />
                      {locating ? "Membaca lokasi…" : form.latitude && form.longitude ? "Perbarui lokasi perangkat" : "Gunakan lokasi perangkat"}
                    </Button>
                    {form.latitude && form.longitude && (
                      <p className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700">
                        <CheckCircle2 size={15} /> Titik lokasi telah tersimpan untuk pencocokan.
                      </p>
                    )}
                    <p className="mt-3 text-xs leading-5 text-emerald-800">
                      Radar dimulai dari 3 km. Alamat lengkap hanya dibuka sesuai status layanan.
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="mt-7 animate-in fade-in slide-in-from-right-3 duration-300">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Tanggal" icon={CalendarDays}>
                    <Input type="date" min={today()} className="h-12 rounded-xl" value={form.scheduled_date} onChange={(event) => setForm((current) => ({ ...current, scheduled_date: event.target.value, start_time: event.target.value === today() && !current.start_time ? nextFullHourTime() : current.start_time }))} />
                  </Field>
                  <Field label="Jam mulai" icon={Clock3}>
                    <Select value={form.start_time} onValueChange={(value) => setForm((current) => ({ ...current, start_time: value }))}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Pilih jam" /></SelectTrigger>
                      <SelectContent>{FULL_HOUR_OPTIONS.map((time) => <SelectItem key={time} value={time}>{time.replace(":", ".")}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Durasi sesi" icon={Clock3}>
                    <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700">1 jam</div>
                  </Field>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Rentang sesi</p>
                    <p className="mt-1 font-black text-indigo-950">{form.start_time || "--:--"}–{estimatedEnd} WIB</p>
                    <p className="mt-1 text-xs leading-5 text-indigo-700">Semua pilihan waktu menggunakan menit 00.</p>
                  </div>
                </div>
                {scheduleIssue && form.scheduled_date && form.start_time && (
                  <div className="mt-4 flex gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />{scheduleIssue}
                  </div>
                )}

                <div className={`mt-5 rounded-2xl border p-5 ${
                  availabilityLoading
                    ? "border-indigo-100 bg-indigo-50"
                    : availability?.has_candidate
                      ? "border-emerald-100 bg-emerald-50"
                      : "border-amber-100 bg-amber-50"
                }`}>
                  <div className="flex items-start gap-3">
                    {availabilityLoading ? (
                      <Radar className="mt-0.5 shrink-0 animate-spin text-indigo-600" size={20} />
                    ) : availability?.has_candidate ? (
                      <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
                    ) : (
                      <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={20} />
                    )}
                    <div>
                      <p className="font-black text-slate-900">
                        {availabilityLoading
                          ? "Memeriksa slot tutor"
                          : availability?.has_candidate
                            ? "Tutor berpotensi tersedia"
                            : "Ketersediaan belum ditemukan"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {availabilityLoading
                          ? "Materi, jadwal, mode, dan benturan kelas sedang diperiksa."
                          : availability?.message || "Lengkapi tanggal dan jam untuk memeriksa slot tutor."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="mt-7 animate-in fade-in slide-in-from-right-3 duration-300">
                <div className="space-y-3">
                  <ReviewRow icon={BookOpen} label="Kebutuhan" value={`${form.subject_name} · ${form.education_level} · ${form.grade}`} />
                  <ReviewRow icon={BookOpen} label="Materi" value={[form.chapter, form.subtopic].filter(Boolean).join(" · ")} />
                  <ReviewRow icon={form.class_type === "private" ? UserRoundCheck : Users} label="Layanan" value={`${form.class_type === "private" ? "Privat" : "Kelompok"} · ${form.learning_mode === "online" ? "Online" : "Offline"}`} />
                  <ReviewRow icon={CalendarDays} label="Jadwal" value={`${formatDate(form.scheduled_date)}, ${form.start_time}–${estimatedEnd} WIB`} />
                  <ReviewRow icon={Clock3} label="Durasi" value={`${form.duration_hours} jam`} />
                  {form.learning_mode === "offline" && <ReviewRow icon={MapPin} label="Pertemuan" value={form.address} />}
                  {form.learning_goal && <ReviewRow icon={GraduationCap} label="Tujuan" value={form.learning_goal} />}
                </div>
                <div className={`mt-5 flex gap-3 rounded-2xl border p-4 text-sm leading-6 ${
                  availability?.has_candidate
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-amber-100 bg-amber-50 text-amber-800"
                }`}>
                  {availability?.has_candidate ? <CheckCircle2 className="mt-0.5 shrink-0" /> : <AlertCircle className="mt-0.5 shrink-0" />}
                  <p>{availability?.message || "Pencarian tutor akan dimulai setelah permintaan dikirim."}</p>
                </div>
                <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Setelah dikirim</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Sistem akan mencari tutor otomatis. Profil tutor ditampilkan setelah tutor menerima permintaan. Pembayaran belum dilakukan pada langkah ini.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" onClick={() => setCurrentStep((step) => Math.max(1, step - 1))} className="h-12 rounded-2xl">
                  <ArrowLeft size={17} className="mr-2" /> Kembali
                </Button>
              ) : <span />}
              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep} className="h-12 rounded-2xl bg-indigo-600 font-bold hover:bg-indigo-700">
                  Lanjutkan <ArrowRight size={17} className="ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitting || Boolean(scheduleIssue) || Boolean(cooldownUntil && new Date(cooldownUntil) > new Date())}
                  className="h-12 rounded-2xl bg-indigo-600 font-bold hover:bg-indigo-700"
                >
                  {submitting ? <Radar size={19} className="mr-2 animate-spin" /> : <Search size={19} className="mr-2" />}
                  Jalankan radar tutor
                </Button>
              )}
            </div>
          </form>

          <section className="space-y-4 xl:sticky xl:top-24">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div><h2 className="text-xl font-black text-slate-900">Status permintaan</h2><p className="text-sm text-slate-500">Diperbarui otomatis setiap 15 detik.</p></div>
              <Button aria-label="Perbarui status permintaan" variant="outline" size="icon" className="rounded-xl" onClick={() => refreshRequests()}><RefreshCw size={17} /></Button>
            </div>
            {requests.length === 0 ? (
              <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                <Radar className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-700">Belum ada permintaan</p>
              </div>
            ) : requests.map((item) => (
              <RequestCard
                key={item.id}
                item={item}
                processing={processing === item.id}
                onCancel={() => cancel(item)}
                onAccept={() => acceptTeacher(item)}
                onReject={() => setRejecting(item)}
                onPay={() => openPayment(item)}
                onExpand={() => postAction(item.id, "expand-radius")}
                onExtend={() => postAction(item.id, "extend")}
                onGroupDecision={(action) => groupDecision(item, action)}
              />
            ))}
          </section>
        </div>
      </div>

      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="rounded-[2rem] sm:max-w-lg">
          <DialogHeader><DialogTitle>Tolak tutor ini?</DialogTitle><DialogDescription>Penolakan tanpa alasan pengecualian dihitung berurutan dan dapat membatasi pencarian.</DialogDescription></DialogHeader>
          <Select value={rejectReason} onValueChange={setRejectReason}>
            <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_suitable">Profil kurang sesuai</SelectItem>
              <SelectItem value="material_mismatch">Materi tidak sesuai</SelectItem>
              <SelectItem value="distance_excess">Jarak melebihi kebutuhan</SelectItem>
              <SelectItem value="system_error">Kesalahan sistem</SelectItem>
              <SelectItem value="other">Alasan lain</SelectItem>
            </SelectContent>
          </Select>
          <Textarea maxLength={500} className="min-h-28 rounded-xl" placeholder="Jelaskan alasan agar dapat diperiksa bila diperlukan" value={rejectNote} onChange={(event) => setRejectNote(event.target.value)} />
          <div className="flex justify-end gap-2"><Button variant="outline" className="rounded-xl" onClick={() => setRejecting(null)}>Kembali</Button><Button disabled={processing === rejecting?.id} className="rounded-xl bg-rose-600 hover:bg-rose-700" onClick={rejectTeacher}>Tolak & cari lagi</Button></div>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
}

function RequestCard({
  item,
  processing,
  onCancel,
  onAccept,
  onReject,
  onPay,
  onExpand,
  onExtend,
  onGroupDecision,
}: {
  item: BookingRequestItem;
  processing: boolean;
  onCancel: () => void;
  onAccept: () => void;
  onReject: () => void;
  onPay: () => void;
  onExpand: () => void;
  onExtend: () => void;
  onGroupDecision: (action: "convert_private" | "cancel") => void;
}) {
  const status = statuses[item.status] || { label: item.status, tone: "slate", description: "Status permintaan diperbarui oleh sistem." };
  const teacher = item.matched_teacher;
  const rating = teacher?.ratings?.length
    ? teacher.ratings.reduce((total, entry) => total + entry.rating, 0) / teacher.ratings.length
    : null;
  const photo = teacher?.teacher_profile?.photo ? `${STORAGE_BASE_URL}/storage/${teacher.teacher_profile.photo}` : null;

  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
      {activeRadarStatuses.includes(item.status) && (
        <div className="border-b border-indigo-100 bg-gradient-to-br from-slate-950 to-indigo-950 py-5">
          <RadarLoader
            label={radarLabel(item)}
            compact
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Permintaan #{item.id}</p><h3 className="mt-1 text-xl font-black text-slate-900">{item.subject_name}</h3><p className="mt-1 text-xs text-slate-500">{item.education_level} · {item.grade}{item.chapter ? ` · ${item.chapter}` : ""}</p></div>
          <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${statusBadge[status.tone] || statusBadge.slate}`}>{status.label}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">{status.description}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Info icon={CalendarDays} text={formatDate(item.scheduled_date)} />
          <Info icon={Clock3} text={`${item.start_time.slice(0, 5)}–${item.end_time.slice(0, 5)}`} />
          <Info icon={item.learning_mode === "online" ? Monitor : MapPin} text={item.learning_mode === "online" ? "Online" : `Offline · ${item.search_radius_km || 3} km`} />
          <Info icon={Users} text={item.class_type === "private" ? "Privat" : `Kelompok ${item.group_member_count || 1}/${item.group_maximum || 5}`} />
        </div>
        {item.class_type === "group" && item.learning_mode === "offline" && (
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
            {item.is_group_host
              ? "Kamu menjadi host lokasi kelompok. Jika host keluar setelah tutor dipilih, kelas dibatalkan dan pembayaran yang sudah diterima masuk antrean refund."
              : `Lokasi host sekitar ${item.group_meeting_distance_km ?? 0} km dari titikmu. Alamat lengkap dibuka setelah pembayaran diverifikasi.`}
          </div>
        )}

        {teacher && ["teacher_selected", "teacher_accepted_waiting_group", "awaiting_payment", "payment_submitted", "payment_rejected", "confirmed", "in_progress", "awaiting_student_approval"].includes(item.status) && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-emerald-700">{photo ? <img src={photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <UserRoundCheck />}</div>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-black text-emerald-950">{teacher.name}</p><ShieldCheck size={16} className="text-emerald-600" /></div><p className="mt-0.5 text-xs text-emerald-700">{teacher.teacher_profile?.expertise || item.subject_name}{rating ? ` · ${rating.toFixed(1)} ★` : " · Tutor terverifikasi"}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-emerald-800">{teacher.teacher_profile?.bio || "Identitas dan kualifikasi tutor telah diperiksa admin."}</p></div>
            </div>
            {item.status === "teacher_selected" && (
              <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onReject} disabled={processing} className="rounded-xl border-rose-200 text-rose-700">Tolak</Button><Button onClick={onAccept} disabled={processing} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">Terima tutor</Button></div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <span className="text-xs text-slate-500">{formatCurrency(item.hourly_rate)} × {item.duration_hours} jam</span><span className="font-black text-slate-900">{formatCurrency(item.total_amount)}</span>
        </div>
        {item.my_order?.payment_rejection_reason && <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs leading-5 text-rose-700">Alasan admin: {item.my_order.payment_rejection_reason}</div>}
        {item.status === "group_decision_required" && item.group_decision_deadline && (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            Beri keputusan sebelum {new Date(item.group_decision_deadline).toLocaleString("id-ID")}. Jika tidak, permintaan dibatalkan otomatis tanpa tagihan.
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {["awaiting_payment", "payment_rejected"].includes(item.status) && <Button onClick={onPay} className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"><CreditCard size={16} className="mr-2" />{item.status === "payment_rejected" ? "Unggah ulang bukti" : "Bayar sekarang"}</Button>}
          {item.status === "no_teacher" && item.learning_mode === "offline" && (item.search_radius_km || 3) < 12 && <Button variant="outline" onClick={onExpand} disabled={processing} className="rounded-xl"><Radar size={16} className="mr-2" />Perluas radius</Button>}
          {["no_teacher", "expired"].includes(item.status) && <Button variant="outline" onClick={onExtend} disabled={processing} className="rounded-xl"><RefreshCw size={16} className="mr-2" />Perpanjang</Button>}
          {item.status === "group_decision_required" && <><Button onClick={() => onGroupDecision("convert_private")} disabled={processing} className="rounded-xl bg-indigo-600">Naik ke privat</Button><Button variant="outline" onClick={() => onGroupDecision("cancel")} disabled={processing} className="rounded-xl text-rose-600">Batalkan</Button></>}
          {cancellableStatuses.includes(item.status) && item.status !== "group_decision_required" && <Button variant="ghost" onClick={onCancel} disabled={processing} className="rounded-xl text-rose-600 hover:bg-rose-50">Batalkan</Button>}
        </div>
      </div>
    </article>
  );
}

function SearchHero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-7 py-9 text-white shadow-xl md:px-10">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="relative max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-100">
          <Sparkles size={14} /> Pencocokan otomatis & adil
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">Pilih waktumu, radar mencarikan tutor.</h1>
        <p className="mt-3 max-w-2xl leading-7 text-indigo-100/80">
          Sistem memeriksa mata pelajaran, jenjang, materi, slot kosong, performa, dan jarak—tanpa katalog tutor.
        </p>
      </div>
    </section>
  );
}

function RadarLoader({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center text-center text-white">
      <div className={`bimbel-radar relative rounded-full border border-indigo-300/30 bg-indigo-400/10 ${compact ? "h-28 w-28" : "h-44 w-44"}`}>
        <div className="absolute inset-[18%] rounded-full border border-indigo-300/30" />
        <div className="absolute inset-[36%] rounded-full border border-indigo-300/30" />
        <div className="bimbel-radar-sweep absolute inset-0 rounded-full" />
        <div className="absolute left-[62%] top-[27%] h-2.5 w-2.5 animate-ping rounded-full bg-emerald-300 motion-reduce:animate-none" />
        <MapPin className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white" size={compact ? 20 : 26} />
      </div>
      <p className={`${compact ? "mt-3 text-xs" : "mt-5 text-sm"} font-bold tracking-wide`}>{label}</p>
      {!compact && <p className="mt-1 text-xs text-indigo-200">Mencocokkan sinyal terbaik di sekitarmu</p>}
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof BookOpen; children: React.ReactNode }) {
  return <div><Label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><Icon size={16} />{label}</Label>{children}</div>;
}

function ReviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-800">{value || "-"}</p>
      </div>
    </div>
  );
}

function Info({ icon: Icon, text }: { icon: typeof Star; text: string }) {
  return <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-slate-600"><Icon size={14} className="shrink-0 text-indigo-500" /><span className="truncate font-medium">{text}</span></div>;
}
