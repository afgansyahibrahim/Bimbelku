import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock3,
  FileCheck2,
  HelpCircle,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import StudentLayout from "@/components/StudentLayout";
import SubjectCombobox, { SubjectOption } from "@/components/SubjectCombobox";
import { EDUCATION_LEVELS, GRADES_BY_EDUCATION_LEVEL } from "@/lib/educationCatalog";
import http, { getApiError, getCached } from "@/lib/http";

type Plan = {
  id: number;
  name: string;
  description?: string;
  session_count: number;
  validity_days: number;
  maximum_subjects: number;
};
type TimeSlot = { id: number; start_time: string; label?: string | null };
type Voucher = {
  id: number;
  status: string;
  promotion: { id: number; title: string; discount_type: "percentage" | "fixed"; discount_value: number; ends_at?: string | null };
};
type DurationHours = 1 | 2 | 3;
type DraftSubject = {
  key: string;
  curriculum_subject_id: number | "";
  subject_name: string;
  session_count: number;
  schedules: string[];
  schedule_start_date: string;
  schedule_time: string;
  frequency_per_week: 1 | 2 | 3;
  chapter: string;
  learning_goal: string;
  preferred_teacher_id?: number;
};
type Quote = {
  lines: Array<{ curriculum_subject_id: number; subject_name: string; session_count: number; duration_hours: DurationHours; unit_price: number; meeting_price: number; subtotal_amount: number }>;
  duration_hours: DurationHours;
  total_learning_hours: number;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  promotion?: { title: string } | null;
};
type ErrorType = "network" | "unauthorized" | "forbidden" | "not_found" | "generic" | null;
type StudentProfile = { id?: number; address?: string | null; maps_link?: string | null };
type SavedDraft = {
  saved_at: string;
  plan_id: number | "";
  level: string;
  grade: string;
  mode: "online" | "offline";
  duration_hours: DurationHours;
  subjects: DraftSubject[];
  promo_code: string;
  voucher_id: number | "";
};

const DRAFT_KEY = "bimbelku.package-builder.stage-6a";
const MULTI_SUBJECT_TUTORIAL_KEY = "bimbelku.tutorial.student.multi-subject.v1";

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

const dateInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const timeRange = (value: string, durationHours: DurationHours) => {
  const start = new Date(value);
  const end = new Date(start.getTime() + durationHours * 3_600_000);
  return `${start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
};

const fullSchedule = (value: string, durationHours: DurationHours) =>
  `${new Date(value).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })} · ${timeRange(value, durationHours)} WIB`;

const nextSlots = (count: number, time = "18:00", startDate?: string, frequency: 1 | 2 | 3 = 2) => {
  const result: string[] = [];
  const cursor = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  if (!startDate) cursor.setDate(cursor.getDate() + 4);
  const [hour, minute] = time.split(":").map(Number);
  cursor.setHours(hour || 0, minute || 0, 0, 0);
  const interval = frequency === 1 ? 7 : frequency === 2 ? 3 : 2;
  for (let index = 0; index < count; index += 1) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() + index * interval);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    result.push(local.toISOString().slice(0, 16));
  }
  return result;
};

const createSubject = (sessionCount = 1, time = "18:00", offsetDays = 0): DraftSubject => {
  const start = new Date();
  start.setDate(start.getDate() + 4 + offsetDays);
  const scheduleStartDate = dateInput(start);
  const frequency: 1 | 2 | 3 = sessionCount >= 10 ? 3 : 2;
  return {
    key: `${Date.now()}-${Math.random()}`,
    curriculum_subject_id: "",
    subject_name: "",
    session_count: sessionCount,
    schedule_start_date: scheduleStartDate,
    schedule_time: time,
    frequency_per_week: frequency,
    schedules: nextSlots(sessionCount, time, scheduleStartDate, frequency),
    chapter: "",
    learning_goal: "",
  };
};

const rebuildSchedules = (subject: DraftSubject, count = subject.session_count) => ({
  ...subject,
  session_count: count,
  schedules: nextSlots(count, subject.schedule_time, subject.schedule_start_date, subject.frequency_per_week),
});

const rebalance = (items: DraftSubject[], total: number) => {
  const base = Math.floor(total / items.length);
  const remainder = total % items.length;
  return items.map((item, index) => rebuildSchedules(item, base + (index < remainder ? 1 : 0)));
};

export default function PackageBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const renewalId = Number(searchParams.get("renew") || 0) || undefined;
  const renewalSubjectId = Number(searchParams.get("subject") || 0) || undefined;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [catalog, setCatalog] = useState<SubjectOption[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [planId, setPlanId] = useState<number | "">("");
  const [level, setLevel] = useState("SD");
  const [grade, setGrade] = useState("Kelas 1");
  const [mode, setMode] = useState<"online" | "offline">("online");
  const [durationHours, setDurationHours] = useState<DurationHours>(1);
  const [subjects, setSubjects] = useState<DraftSubject[]>([createSubject()]);
  const [promoCode, setPromoCode] = useState("");
  const [voucherId, setVoucherId] = useState<number | "">("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ErrorType>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasMultiSubjectPackage, setHasMultiSubjectPackage] = useState(false);
  const multiSubjectGuideOpened = useRef(false);

  const plan = plans.find((item) => item.id === planId);
  const defaultSlotTime = timeSlots.find((slot) => slot.start_time.slice(0, 5) === "18:00")?.start_time.slice(0, 5)
    || timeSlots[0]?.start_time.slice(0, 5)
    || "18:00";
  const selectedSessions = subjects.reduce((sum, item) => sum + item.session_count, 0);
  const selectedSubjectIds = subjects.map((item) => item.curriculum_subject_id).filter(Boolean);
  const subjectsAreUnique = new Set(selectedSubjectIds).size === selectedSubjectIds.length;
  const scheduleTimestamps = subjects.flatMap((item) => item.schedules).filter(Boolean);
  const sortedScheduleStarts = scheduleTimestamps
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const schedulesDoNotOverlap = sortedScheduleStarts.every((start, index) =>
    index === sortedScheduleStarts.length - 1 || start + durationHours * 3_600_000 <= sortedScheduleStarts[index + 1]
  );
  const scheduleRangeDays = scheduleTimestamps.length
    ? (Math.max(...scheduleTimestamps.map((value) => new Date(value).getTime())) - Math.min(...scheduleTimestamps.map((value) => new Date(value).getTime()))) / 86_400_000
    : 0;
  const availableSubjects = useMemo(
    () => catalog.filter((item) =>
      (!item.education_levels?.length || item.education_levels.includes(level))
      && (!item.grades?.length || item.grades.includes(grade))),
    [catalog, grade, level],
  );
  const draftValid = Boolean(
    plan
    && timeSlots.length
    && selectedSessions === plan.session_count
    && subjectsAreUnique
    && schedulesDoNotOverlap
    && scheduleRangeDays <= plan.validity_days
    && (mode === "online" || Boolean(studentProfile?.address))
    && subjects.every((item) => item.curriculum_subject_id && item.subject_name && item.schedules.length === item.session_count && item.schedules.every(Boolean)),
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [plansResponse, catalogResponse, voucherResponse, slotsResponse, profileResponse, tutorialStatusResponse] = await Promise.all([
          getCached<Plan[]>("/package-plans", { maxAgeMs: 60_000 }),
          getCached<{ subject_options: SubjectOption[] }>("/learning-catalog", { params: { compact: 1 }, maxAgeMs: 60_000 }),
          getCached<{ data: Voucher[] }>("/student/vouchers", { maxAgeMs: 20_000 }),
          getCached<TimeSlot[]>("/learning-time-slots", { maxAgeMs: 60_000 }),
          getCached<StudentProfile>("/user", { maxAgeMs: 60_000 }),
          getCached<{ has_multi_subject_package: boolean }>("/student/packages/tutorial-status", { maxAgeMs: 60_000 }),
        ]);
        setPlans(plansResponse.data);
        setCatalog(catalogResponse.data.subject_options || []);
        setVouchers(voucherResponse.data.data.filter((item) => item.status === "available"));
        setTimeSlots(slotsResponse.data);
        setStudentProfile(profileResponse.data);
        setHasMultiSubjectPackage(Boolean(tutorialStatusResponse.data.has_multi_subject_package));
        const defaultTime = slotsResponse.data.find((slot) => slot.start_time.slice(0, 5) === "18:00")?.start_time.slice(0, 5)
          || slotsResponse.data[0]?.start_time.slice(0, 5)
          || "18:00";
        const defaultPlan = plansResponse.data.find((item) => item.session_count === 4) || plansResponse.data[0];
        if (defaultPlan) {
          setPlanId(defaultPlan.id);
          setSubjects([createSubject(defaultPlan.session_count, defaultTime)]);
        }

        if (renewalId) {
          const packageResponse = await http.get(`/student/packages/${renewalId}`);
          const previous = packageResponse.data;
          setLevel(previous.education_level);
          setGrade(previous.grade);
          setMode(previous.learning_mode);
          setDurationHours(([1, 2, 3].includes(Number(previous.duration_hours)) ? Number(previous.duration_hours) : 1) as DurationHours);
          const selectedOld = renewalSubjectId
            ? previous.subjects.filter((item: any) => item.id === renewalSubjectId)
            : previous.subjects;
          const renewalPlan = plansResponse.data.find((item) => item.session_count === 4) || defaultPlan;
          if (renewalPlan && selectedOld.length) {
            setPlanId(renewalPlan.id);
            const allocation = Math.max(1, Math.floor(renewalPlan.session_count / selectedOld.length));
            setSubjects(selectedOld.slice(0, renewalPlan.maximum_subjects).map((item: any, index: number) => {
              const count = index === selectedOld.length - 1
                ? renewalPlan.session_count - allocation * index
                : allocation;
              return {
                ...createSubject(count, defaultTime),
                curriculum_subject_id: item.curriculum_subject_id,
                subject_name: item.subject_name || item.name || "",
                preferred_teacher_id: item.teacher?.id,
                chapter: item.chapter || "",
                learning_goal: item.learning_goal || "",
              };
            }));
          }
        } else {
          try {
            const raw = localStorage.getItem(DRAFT_KEY);
            const saved = raw ? JSON.parse(raw) as SavedDraft : null;
            const savedPlan = plansResponse.data.find((item) => item.id === saved?.plan_id);
            if (saved && savedPlan && saved.subjects.length && saved.subjects.length <= savedPlan.maximum_subjects) {
              setPlanId(saved.plan_id);
              setLevel(saved.level);
              setGrade(saved.grade);
              setMode(saved.mode);
              setDurationHours(([1, 2, 3].includes(Number(saved.duration_hours)) ? Number(saved.duration_hours) : 1) as DurationHours);
              setSubjects(saved.subjects.map((item, index) => rebuildSchedules({
                ...item,
                key: item.key || `${Date.now()}-${index}`,
                schedule_start_date: item.schedule_start_date || item.schedules[0]?.slice(0, 10) || dateInput(new Date()),
                schedule_time: item.schedule_time || item.schedules[0]?.slice(11, 16) || defaultTime,
                frequency_per_week: item.frequency_per_week || 2,
              })));
              setPromoCode(saved.promo_code || "");
              setVoucherId(saved.voucher_id || "");
              setDraftSavedAt(saved.saved_at);
              setDraftRestored(true);
            }
          } catch {
            localStorage.removeItem(DRAFT_KEY);
          }
        }
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          if (!err.response) setLoadError("network");
          else if (err.response.status === 401) setLoadError("unauthorized");
          else if (err.response.status === 403) setLoadError("forbidden");
          else if (err.response.status === 404) setLoadError("not_found");
          else setLoadError("generic");
        } else {
          setLoadError("generic");
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [renewalId, renewalSubjectId, retryKey]);

  const handleRetry = () => { setLoadError(null); setLoading(true); setRetryKey((k) => k + 1); };

  useEffect(() => {
    if (!catalog.length) return;
    setSubjects((current) => current.map((item) => {
      if (!item.curriculum_subject_id) return item;
      const option = catalog.find((candidate) => candidate.id === item.curriculum_subject_id);
      const eligible = option
        && (!option.education_levels?.length || option.education_levels.includes(level))
        && (!option.grades?.length || option.grades.includes(grade));
      return eligible ? item : { ...item, curriculum_subject_id: "", subject_name: "" };
    }));
  }, [catalog, grade, level]);

  useEffect(() => {
    if (loading || !planId || renewalId) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      const draft: SavedDraft = {
        saved_at: savedAt,
        plan_id: planId,
        level,
        grade,
        mode,
        duration_hours: durationHours,
        subjects,
        promo_code: promoCode,
        voucher_id: voucherId,
      };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setDraftSavedAt(savedAt);
      } catch {
        // Form tetap dapat digunakan saat penyimpanan lokal tidak tersedia.
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [durationHours, grade, level, loading, mode, planId, promoCode, renewalId, subjects, voucherId]);

  const openMultiSubjectGuide = () => {
    window.dispatchEvent(new Event("bimbelku:open-tutorial"));
  };

  useEffect(() => {
    if (loading || hasMultiSubjectPackage || !plan || plan.maximum_subjects < 2 || multiSubjectGuideOpened.current) return;
    try {
      if (localStorage.getItem(MULTI_SUBJECT_TUTORIAL_KEY)) return;
    } catch {
      return;
    }
    multiSubjectGuideOpened.current = true;
    const timer = window.setTimeout(openMultiSubjectGuide, 450);
    return () => window.clearTimeout(timer);
  }, [hasMultiSubjectPackage, loading, plan]);

  useEffect(() => {
    if (!summaryOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setSummaryOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [submitting, summaryOpen]);

  useEffect(() => {
    if (!draftValid) {
      setQuote(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      setQuoting(true);
      try {
        const response = await http.post<Quote>("/student/packages/quote", {
          package_plan_id: planId,
          education_level: level,
          learning_mode: mode,
          duration_hours: durationHours,
          code: promoCode.trim() || undefined,
          promotion_claim_id: voucherId || undefined,
          subjects: subjects.map((item) => ({
            curriculum_subject_id: item.curriculum_subject_id,
            session_count: item.session_count,
          })),
        });
        setQuote(response.data);
      } catch (error) {
        setQuote(null);
        if (promoCode.trim() || voucherId) toast.error(getApiError(error, "Promo tidak dapat digunakan."));
      } finally {
        setQuoting(false);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [draftValid, durationHours, level, mode, planId, promoCode, subjects, voucherId]);

  const choosePlan = (selected: Plan) => {
    setPlanId(selected.id);
    setSubjects([createSubject(selected.session_count, defaultSlotTime)]);
    setQuote(null);
  };
  const updateSubject = (key: string, patch: Partial<DraftSubject>) => {
    setSubjects((current) => current.map((item) => {
      if (item.key !== key) return item;
      const next = { ...item, ...patch };
      if (patch.session_count !== undefined || patch.schedule_start_date !== undefined || patch.schedule_time !== undefined || patch.frequency_per_week !== undefined) {
        return rebuildSchedules(next);
      }
      return next;
    }));
  };
  const distribute = () => {
    if (!plan) return;
    setSubjects((current) => rebalance(current, plan.session_count));
  };
  const addSubject = () => {
    if (!plan || subjects.length >= plan.maximum_subjects) return;
    setSubjects((current) => rebalance([...current, createSubject(1, defaultSlotTime, current.length)], plan.session_count));
  };
  const removeSubject = (key: string) => {
    if (!plan) return;
    setSubjects((current) => rebalance(current.filter((item) => item.key !== key), plan.session_count));
  };
  const adjustAllocation = (key: string, delta: -1 | 1) => {
    setSubjects((current) => {
      const targetIndex = current.findIndex((item) => item.key === key);
      if (targetIndex < 0 || current.length < 2) return current;
      const otherIndexes = current.map((_, index) => index).filter((index) => index !== targetIndex);
      const transferIndex = delta > 0
        ? otherIndexes.sort((a, b) => current[b].session_count - current[a].session_count).find((index) => current[index].session_count > 1)
        : otherIndexes.sort((a, b) => current[a].session_count - current[b].session_count)[0];
      if (transferIndex === undefined || (delta < 0 && current[targetIndex].session_count <= 1)) return current;
      return current.map((item, index) => {
        if (index === targetIndex) return rebuildSchedules(item, item.session_count + delta);
        if (index === transferIndex) return rebuildSchedules(item, item.session_count - delta);
        return item;
      });
    });
  };
  const resetDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Form tetap dapat direset pada state halaman.
    }
    const defaultPlan = plans.find((item) => item.session_count === 4) || plans[0];
    if (defaultPlan) {
      setPlanId(defaultPlan.id);
      setSubjects([createSubject(defaultPlan.session_count, defaultSlotTime)]);
    }
    setLevel("SD");
    setGrade("Kelas 1");
    setMode("online");
    setDurationHours(1);
    setPromoCode("");
    setVoucherId("");
    setQuote(null);
    setDraftRestored(false);
    setDraftSavedAt(null);
  };
  const submit = async () => {
    if (!draftValid || !quote) {
      toast.error("Lengkapi pembagian sesi dan jadwal terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await http.post("/student/packages", {
        package_plan_id: planId,
        education_level: level,
        grade,
        learning_mode: mode,
        duration_hours: durationHours,
        promotion_code: promoCode.trim() || undefined,
        promotion_claim_id: voucherId || undefined,
        renewal_of_id: renewalId,
        subjects: subjects.map((item) => ({
          curriculum_subject_id: item.curriculum_subject_id,
          chapter: item.chapter || undefined,
          learning_goal: item.learning_goal || undefined,
          preferred_teacher_id: item.preferred_teacher_id,
          schedules: item.schedules,
        })),
      });
      toast.success(response.data.message);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Draf kedaluwarsa tidak menghambat perpindahan ke pembayaran.
      }
      const order = response.data.order;
      navigate("/payment", {
        replace: true,
        state: {
          orderId: order.order_id,
          invoiceId: order.order_number,
          tutorName: order.tutor_name,
          subject: order.subject,
          type: order.type,
          price: Number(order.amount),
          subtotalAmount: Number(order.subtotal_amount || order.amount),
          discountAmount: Number(order.discount_amount || 0),
          packageName: order.package_name,
          date: order.scheduled_at,
          paymentDueAt: order.payment_due_at,
          durationHours: Number(order.duration_hours || durationHours),
          totalLearningHours: Number(order.total_learning_hours || (plan?.session_count || 0) * durationHours),
        },
      });
    } catch (error) {
      toast.error(getApiError(error, "Paket gagal dibuat."));
    } finally {
      setSubmitting(false);
    }
  };

  const completedSteps = [
    Boolean(plan),
    subjects.every((item) => item.curriculum_subject_id),
    Boolean(plan && selectedSessions === plan.session_count),
    subjects.every((item) => item.schedules.length === item.session_count && item.schedules.every(Boolean)) && schedulesDoNotOverlap,
    Boolean(draftValid && quote),
  ];
  const firstIncomplete = completedSteps.findIndex((done) => !done);
  const activeStepIndex = firstIncomplete === -1 ? 4 : Math.min(firstIncomplete, 4);

  if (loading) {
    return <StudentLayout title="Pilih Paket Belajar"><div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-indigo-600" size={36} /></div></StudentLayout>;
  }

  if (loadError) {
    return (
      <StudentLayout title="Pilih Paket Belajar">
        <div className="mx-auto max-w-xl py-20">
          <ErrorState type={loadError} onRetry={handleRetry} />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title={renewalId ? "Perpanjang Paket" : "Pilih Paket Belajar"}>
      <div className="mx-auto max-w-6xl space-y-6 pb-20">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft size={17} /> Kembali
        </button>

        <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-6 text-white sm:p-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">{renewalId ? "Tutor lama diprioritaskan" : "Langkah 1"}</p>
          <h1 className="mt-3 text-3xl font-black">Susun paket belajarmu</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/75">Pilih jumlah sesi dan durasi pertemuan. Periksa ringkasan, bayar, lalu sistem mulai mencari tutor.</p>
        </section>

        <nav aria-label="Tahapan pemesanan" className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Langkah {activeStepIndex + 1} dari 5</p><p className="mt-1 text-sm font-black text-slate-900">{["Paket & durasi", "Mata pelajaran", "Pembagian sesi", "Jadwal", "Ringkasan"][activeStepIndex]}</p></div>
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-sm font-black text-white">{activeStepIndex + 1}</span>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5" aria-hidden="true">{completedSteps.map((done, index) => <span key={index} className={`h-1.5 rounded-full ${index === activeStepIndex ? "bg-indigo-600" : done ? "bg-emerald-400" : "bg-slate-200"}`} />)}</div>
          </div>
          <ol className="hidden grid-cols-5 gap-2 sm:grid">
            {["Paket & Durasi", "Mapel", "Pembagian Sesi", "Jadwal", "Ringkasan"].map((label, index) => (
              <li key={label} className={`flex min-h-12 items-center gap-2 rounded-2xl px-3 text-xs font-black ${index === activeStepIndex ? "bg-indigo-600 text-white" : completedSteps[index] ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${index === activeStepIndex ? "bg-white/20" : completedSteps[index] ? "bg-emerald-100" : "bg-white"}`}>{completedSteps[index] && index !== activeStepIndex ? <Check size={14} /> : index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </nav>

        {!renewalId && draftSavedAt && (
          <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black">{draftRestored ? "Draf terakhir dipulihkan" : "Draf tersimpan otomatis"}</p>
              <p className="mt-0.5 text-xs text-blue-700">Terakhir disimpan {new Date(draftSavedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}.</p>
            </div>
            <button type="button" onClick={resetDraft} className="min-h-11 rounded-xl border border-blue-200 bg-white px-4 text-xs font-black text-blue-700 hover:bg-blue-100">Mulai ulang</button>
          </div>
        )}

        <section>
          <h2 className="mb-3 text-lg font-black text-slate-900">1. Pilih Paket Belajar</h2>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {plans.map((item) => (
              <button
                key={item.id}
                data-tour={item.maximum_subjects >= 2 ? "package-plan-picker" : undefined}
                type="button"
                onClick={() => choosePlan(item)}
                className={`min-h-40 rounded-3xl border p-4 text-left transition sm:p-5 ${planId === item.id ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 bg-white hover:border-indigo-300"}`}
              >
                <div className="flex items-start justify-between">
                  <BookOpenCheck className={planId === item.id ? "text-indigo-600" : "text-slate-400"} />
                  {planId === item.id && <Check className="text-indigo-600" size={20} />}
                </div>
                <h3 className="mt-4 font-black text-slate-900">{item.name}</h3>
                <p className="mt-1 text-2xl font-black text-indigo-700">{item.session_count} sesi</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{item.validity_days} hari · maksimal {item.maximum_subjects} mapel</p>
              </button>
            ))}
          </div>
        </section>

        <section data-tour="package-duration-picker" className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Clock3 size={20} /></div>
            <div><h2 className="text-lg font-black text-slate-900">2. Durasi setiap pertemuan</h2><p className="mt-1 text-sm leading-6 text-slate-500">Pilihan ini berlaku untuk seluruh sesi dalam satu paket.</p></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {([1, 2, 3] as DurationHours[]).map((hours) => (
              <button key={hours} type="button" onClick={() => setDurationHours(hours)} className={`min-h-24 rounded-2xl border px-2 py-3 text-center transition sm:px-4 ${durationHours === hours ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300"}`}>
                <span className="block text-2xl font-black">{hours}</span><span className={`mt-1 block text-xs font-black ${durationHours === hours ? "text-indigo-100" : "text-slate-500"}`}>jam</span>
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-2xl bg-indigo-50 px-4 py-3 text-xs font-bold leading-5 text-indigo-800">{plan ? `${plan.session_count} sesi × ${durationHours} jam = ${plan.session_count * durationHours} jam belajar` : "Pilih paket untuk melihat total jam belajar."}</p>
        </section>

        <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-black text-slate-900">3. Jenjang dan metode</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Jenjang">
              <select value={level} onChange={(event) => { const next = event.target.value; setLevel(next); setGrade(GRADES_BY_EDUCATION_LEVEL[next][0]); }} className="form-field">
                {EDUCATION_LEVELS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label={level === "Umum" ? "Tingkat" : "Kelas"}>
              <select value={grade} onChange={(event) => setGrade(event.target.value)} className="form-field">
                {GRADES_BY_EDUCATION_LEVEL[level].map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Metode belajar">
              <select value={mode} onChange={(event) => setMode(event.target.value as "online" | "offline")} className="form-field">
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">4. Pilih mapel dan bagikan sesi</h2>
              <p className={`mt-1 text-sm font-bold ${selectedSessions === plan?.session_count ? "text-emerald-600" : "text-orange-600"}`}>
                Total: {selectedSessions} dari {plan?.session_count || 0} sesi
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <button type="button" onClick={openMultiSubjectGuide} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 sm:flex-none"><HelpCircle size={14} /> Panduan 2+ mapel</button>
              {subjects.length > 1 && <button type="button" onClick={distribute} className="min-h-11 flex-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 sm:flex-none">Bagi merata</button>}
              <button data-tour="package-add-subject" type="button" onClick={addSubject} disabled={!plan || subjects.length >= plan.maximum_subjects} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40 sm:flex-none">
                <Plus size={14} /> Tambah mapel
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {!timeSlots.length && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Admin belum mengaktifkan slot jadwal belajar.</div>}
            {subjects.map((item, subjectIndex) => (
              <div key={item.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-slate-800">Mata pelajaran {subjectIndex + 1}</h3>
                  {subjects.length > 1 && (
                    <button type="button" aria-label={`Hapus mata pelajaran ${subjectIndex + 1}`} onClick={() => removeSubject(item.key)} className="grid h-11 w-11 place-items-center rounded-xl text-rose-500 hover:bg-rose-50">
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
                  <Field label="Mata pelajaran">
                    <SubjectCombobox
                      options={availableSubjects}
                      value={item.subject_name}
                      educationLevel={level}
                      grade={grade}
                      placeholder="Cari mata pelajaran..."
                      onChange={(name, option) =>
                        updateSubject(item.key, {
                          subject_name: name,
                          curriculum_subject_id: option?.id ?? "",
                        })
                      }
                    />
                  </Field>
                  <div>
                    <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Alokasi sesi</span>
                    <div data-tour={subjectIndex === 0 ? "package-allocation" : undefined} className="flex min-h-12 items-center justify-between rounded-2xl border border-slate-200 bg-white p-1.5">
                      <button type="button" aria-label={`Kurangi sesi ${item.subject_name || `mapel ${subjectIndex + 1}`}`} disabled={subjects.length < 2 || item.session_count <= 1} onClick={() => adjustAllocation(item.key, -1)} className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"><Minus size={18} /></button>
                      <div className="text-center"><span className="text-xl font-black text-indigo-700">{item.session_count}</span><span className="ml-1 text-xs font-bold text-slate-500">sesi</span></div>
                      <button type="button" aria-label={`Tambah sesi ${item.subject_name || `mapel ${subjectIndex + 1}`}`} disabled={subjects.length < 2 || !subjects.some((subject) => subject.key !== item.key && subject.session_count > 1)} onClick={() => adjustAllocation(item.key, 1)} className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-white disabled:cursor-not-allowed disabled:opacity-35"><Plus size={18} /></button>
                    </div>
                  </div>
                </div>
                {subjects.length > 1 && <p className="mt-2 text-xs font-medium leading-5 text-slate-500">Tombol + memindahkan satu sesi dari mapel lain. Total paket selalu tetap {plan?.session_count} sesi.</p>}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Bab atau topik">
                    <input value={item.chapter} onChange={(event) => updateSubject(item.key, { chapter: event.target.value })} className="form-field" placeholder="Contoh: Pecahan" />
                  </Field>
                  <Field label="Target belajar">
                    <input value={item.learning_goal} onChange={(event) => updateSubject(item.key, { learning_goal: event.target.value })} className="form-field" placeholder="Contoh: Mampu mengerjakan soal cerita" />
                  </Field>
                </div>
                <div className="mt-5 rounded-2xl border border-indigo-100 bg-white p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700"><CalendarPlus size={17} /> Atur pola jadwal sekali</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Mulai belajar">
                      <input type="date" min={dateInput(new Date(Date.now() + 96 * 60 * 60 * 1000))} value={item.schedule_start_date} onChange={(event) => updateSubject(item.key, { schedule_start_date: event.target.value })} className="form-field" />
                    </Field>
                    <div>
                      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Jam belajar</span>
                      <ScheduleTimePicker
                        value={item.schedule_time}
                        options={timeSlots}
                        onChange={(value) => updateSubject(item.key, { schedule_time: value })}
                      />
                    </div>
                    <Field label="Frekuensi">
                      <select value={item.frequency_per_week} onChange={(event) => updateSubject(item.key, { frequency_per_week: Number(event.target.value) as 1 | 2 | 3 })} className="form-field">
                        <option value={1}>1 kali per minggu</option>
                        <option value={2}>2 kali per minggu</option>
                        <option value={3}>3 kali per minggu</option>
                      </select>
                    </Field>
                  </div>
                  <div className="mt-4 rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900">
                    <p className="font-black">{item.subject_name || `Mapel ${subjectIndex + 1}`} · {item.schedules.length} pertemuan otomatis</p>
                    <p className="mt-1 text-xs font-medium leading-5 text-indigo-700">
                      {item.schedules.length ? `${new Date(item.schedules[0]).toLocaleDateString("id-ID", { dateStyle: "medium" })} sampai ${new Date(item.schedules[item.schedules.length - 1]).toLocaleDateString("id-ID", { dateStyle: "medium" })} · ${timeRange(item.schedules[0], durationHours)} WIB` : "Jadwal belum terbentuk."}
                    </p>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-black">Lihat semua tanggal</summary>
                      <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
                        {item.schedules.map((schedule, index) => <li key={`${item.key}-${schedule}-${index}`} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700">{index + 1}. {fullSchedule(schedule, durationHours)}</li>)}
                      </ol>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!schedulesDoNotOverlap && <div className="mt-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"><AlertCircle className="shrink-0" size={19} />Ada jadwal yang bertumpang tindih. Ubah tanggal atau jam salah satunya.</div>}
          {!subjectsAreUnique && <div className="mt-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"><AlertCircle className="shrink-0" size={19} />Satu mata pelajaran tidak boleh dipilih dua kali.</div>}
          {Boolean(plan && scheduleRangeDays > plan.validity_days) && <div className="mt-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"><AlertCircle className="shrink-0" size={19} />Rentang jadwal melebihi masa paket {plan?.validity_days} hari. Tingkatkan frekuensi belajar atau ubah tanggal mulai.</div>}
          {mode === "offline" && !studentProfile?.address && <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800"><AlertCircle className="shrink-0" size={19} />Lengkapi alamat dan titik lokasi dari halaman Saya sebelum memesan kelas offline.</div>}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-black text-slate-900">5. Voucher atau kode promo</h2>
            <p className="mt-1 text-sm text-slate-500">Satu transaksi hanya memakai satu voucher atau kode.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Voucher Saya">
                <select value={voucherId} onChange={(event) => { setVoucherId(Number(event.target.value) || ""); setPromoCode(""); }} className="form-field">
                  <option value="">Tanpa voucher</option>
                  {vouchers.map((item) => <option key={item.id} value={item.id}>{item.promotion.title}</option>)}
                </select>
              </Field>
              <Field label="Masukkan kode promo">
                <div className="relative">
                  <Tag className="absolute left-3 top-3.5 text-slate-400" size={17} />
                  <input value={promoCode} disabled={Boolean(voucherId)} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} className="form-field pl-10 uppercase disabled:bg-slate-100" placeholder="BELAJAR20" />
                </div>
              </Field>
            </div>
          </div>

          <aside className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
            <div className="flex items-center gap-2 text-indigo-200"><Clock3 size={17} /><span className="text-xs font-black uppercase tracking-wider">Ringkasan harga</span></div>
            {quoting ? (
              <div className="grid h-32 place-items-center"><Loader2 className="animate-spin" /></div>
            ) : quote ? (
              <>
                <div className="mt-5 space-y-3 text-sm">
                  {quote.lines.map((line) => (
                    <div key={line.curriculum_subject_id} className="flex justify-between gap-3 text-slate-300">
                      <span>{line.subject_name} · {line.session_count} sesi × {durationHours} jam</span>
                      <span>{rupiah(line.subtotal_amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between text-slate-400"><span>Harga normal</span><span className={quote.discount_amount ? "text-xs line-through" : ""}>{rupiah(quote.subtotal_amount)}</span></div>
                    {quote.discount_amount > 0 && <div className="mt-2 flex justify-between text-emerald-300"><span>Potongan</span><span>-{rupiah(quote.discount_amount)}</span></div>}
                  </div>
                </div>
                <p className="mt-5 text-xs font-bold text-slate-400">Total pembayaran</p>
                <p className="mt-1 text-3xl font-black">{rupiah(quote.total_amount)}</p>
                {quote.promotion && <span className="mt-2 inline-flex rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black text-emerald-300">🏷️ {quote.promotion.title}</span>}
              </>
            ) : (
              <p className="mt-5 text-sm leading-6 text-slate-400">Lengkapi alokasi sesi untuk melihat harga akhir.</p>
            )}
            <button data-tour="package-review-order" type="button" disabled={!draftValid || !quote || submitting} onClick={() => setSummaryOpen(true)} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white font-black text-slate-950 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40">
              <FileCheck2 size={18} />
              Periksa Pesanan
            </button>
          </aside>
        </section>

        {summaryOpen && quote && plan && (
          <div className="fixed inset-0 z-[230] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setSummaryOpen(false); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="order-summary-title" className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-7">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">Langkah terakhir sebelum pembayaran</p>
                  <h2 id="order-summary-title" className="mt-2 text-2xl font-black text-slate-900">Periksa rincian bimbel</h2>
                  <p className="mt-1 text-sm text-slate-500">Pastikan paket, mapel, dan seluruh tanggal sudah tepat.</p>
                </div>
                <button type="button" disabled={submitting} aria-label="Tutup ringkasan" onClick={() => setSummaryOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={20} /></button>
              </header>

              <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-7">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <SummaryItem label="Paket" value={`${plan.name} · ${plan.session_count} sesi`} />
                  <SummaryItem label="Durasi" value={`${durationHours} jam/pertemuan`} />
                  <SummaryItem label="Jenjang" value={`${level} · ${grade}`} />
                  <SummaryItem label="Metode" value={mode === "online" ? "Online" : "Offline"} />
                </div>
                {mode === "offline" && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Lokasi belajar</p><p className="mt-2 text-sm font-bold leading-6 text-slate-800">{studentProfile?.address}</p>{studentProfile?.maps_link && <a href={studentProfile.maps_link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-black text-indigo-600">Buka peta</a>}</div>}
                <div>
                  <h3 className="text-sm font-black text-slate-900">Mapel, pembagian, dan jadwal</h3>
                  <div className="mt-3 space-y-3">
                    {subjects.map((item) => (
                      <div key={item.key} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black text-slate-900">{item.subject_name}</p>{item.chapter && <p className="mt-1 text-xs font-medium text-slate-500">{item.chapter}{item.learning_goal ? ` · ${item.learning_goal}` : ""}</p>}</div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{item.session_count} sesi</span></div>
                        <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
                          {item.schedules.map((schedule, index) => <li key={`${item.key}-summary-${schedule}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{index + 1}. {fullSchedule(schedule, durationHours)}</li>)}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950 p-5 text-white">
                  <p className="mb-3 text-xs font-bold text-slate-400">Total waktu belajar: {plan.session_count * durationHours} jam</p>
                  <div className="flex justify-between text-sm text-slate-300"><span>Harga normal</span><span>{rupiah(quote.subtotal_amount)}</span></div>
                  {quote.discount_amount > 0 && <div className="mt-2 flex justify-between text-sm text-emerald-300"><span>Potongan</span><span>-{rupiah(quote.discount_amount)}</span></div>}
                  <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4"><span className="text-sm font-black">Total pembayaran</span><span className="text-2xl font-black">{rupiah(quote.total_amount)}</span></div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-900">Setelah dikonfirmasi, kamu langsung menuju pembayaran. Pencarian tutor baru dimulai setelah pembayaran diterima admin.</div>
              </div>

              <footer className="grid shrink-0 gap-3 border-t border-slate-100 bg-white p-4 sm:grid-cols-2 sm:px-7">
                <button type="button" disabled={submitting} onClick={() => setSummaryOpen(false)} className="min-h-12 rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 hover:bg-slate-50">Kembali & Ubah</button>
                <button type="button" disabled={submitting} onClick={submit} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">{submitting ? <Loader2 className="animate-spin" size={18} /> : <FileCheck2 size={18} />}{submitting ? "Membuat tagihan…" : "Konfirmasi & Bayar"}</button>
              </footer>
            </section>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}

function timeSlotLabel(slot: TimeSlot) {
  if (slot.label?.trim()) return slot.label;
  return `${slot.start_time.slice(0, 5).replace(":", ".")} WIB`;
}

function ScheduleTimePicker({ value, options, onChange }: { value: string; options: TimeSlot[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((slot) => slot.start_time.slice(0, 5) === value);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!options.length}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="form-field flex min-w-0 items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        <span className="min-w-0 truncate">{selected ? timeSlotLabel(selected) : "Pilih jam"}</span>
        <ChevronDown className="shrink-0 text-slate-400" size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[250] flex items-end justify-center overflow-hidden bg-slate-950/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-time-title"
            className="flex max-h-[72dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]"
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-500">Jadwal pertemuan</p>
                <h3 id="schedule-time-title" className="mt-1 text-lg font-black text-slate-900">Pilih jam mulai</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup pilihan jam" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                <X size={19} />
              </button>
            </header>

            <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
              <div className="grid grid-cols-3 gap-2">
                {options.map((slot) => {
                  const slotValue = slot.start_time.slice(0, 5);
                  const active = slotValue === value;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        onChange(slotValue);
                        setOpen(false);
                      }}
                      className={`relative min-h-12 min-w-0 rounded-xl border px-2 py-2 text-center text-xs font-black transition ${active ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-100" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"}`}
                    >
                      <span className="block truncate">{timeSlotLabel(slot)}</span>
                      {active && <Check className="absolute right-1.5 top-1.5" size={12} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-sm font-black text-slate-900">{value}</p></div>;
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
