import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  BookOpenCheck,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock3,
  FileCheck2,
  HelpCircle,
  Loader2,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";

import StudentLayout from "@/components/StudentLayout";
import SubjectCombobox, { SubjectOption } from "@/components/SubjectCombobox";
import { ResponsiveSelect } from "@/components/ResponsiveSelect";
import { EDUCATION_LEVELS, GRADES_BY_EDUCATION_LEVEL } from "@/lib/educationCatalog";
import { notify } from "@/lib/notify";

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
  promotion?: { id: number; title: string; discount_type: "percentage" | "fixed"; discount_value: number; ends_at?: string | null } | null;
};
type DurationHours = 1 | 2;
type DraftSubject = {
  key: string;
  curriculum_subject_id: number | "";
  subject_name: string;
  session_count: number;
  schedules: string[];
  schedule_start_date: string;
  schedule_time: string;
  weekdays: number[];
  curriculum_chapter_ids: number[];
  learning_topic_ids: number[];
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
type StudentProfile = {
  id?: number;
  address?: string | null;
  maps_link?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  location_consent_at?: string | null;
};
type CurriculumChapterOption = { id: number; subject_id: number; subject_name: string; education_level: string; grade: string; title: string; sort_order: number };
type LearningTopicOption = { id: number; subject_name: string; education_level: string; grade: string; chapter: string; name: string };
type MaterialCatalog = { chapters: CurriculumChapterOption[]; topics: LearningTopicOption[] };
type RenewalMaterialBaseline = {
  allCompleted: boolean;
  topicStatusById: Record<number, string>;
  totalTopics: number;
  completedTopics: number;
};
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
const MAX_WEEKDAYS_PER_SUBJECT = 4;

const draftKeyForCurrentUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null") as { id?: number | string } | null;
    const userId = Number(user?.id);
    return Number.isInteger(userId) && userId > 0 ? `${DRAFT_KEY}.${userId}` : null;
  } catch {
    return null;
  }
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

const dateInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const earliestScheduleDate = (time: string, leadHours = 72) => {
  const threshold = new Date(Date.now() + leadHours * 60 * 60 * 1000);
  const [hour] = time.split(":").map(Number);
  const candidate = new Date(threshold);
  candidate.setHours(hour || 0, 0, 0, 0);
  if (candidate < threshold) candidate.setDate(candidate.getDate() + 1);
  return dateInput(candidate);
};

const normalizeDurationHours = (value: unknown): DurationHours => Number(value) === 2 ? 2 : 1;

const slotSupportsDuration = (time: string, durationHours: DurationHours) => {
  const hour = Number(time.slice(0, 2));
  return Number.isInteger(hour) && hour >= 0 && hour + durationHours <= 23;
};

const slotsForDuration = (slots: TimeSlot[], durationHours: DurationHours) =>
  slots.filter((slot) => slotSupportsDuration(slot.start_time.slice(0, 5), durationHours));

const preferredSlotTime = (slots: TimeSlot[], durationHours: DurationHours) => {
  const compatible = slotsForDuration(slots, durationHours);
  return compatible.find((slot) => slot.start_time.slice(0, 5) === "18:00")?.start_time.slice(0, 5)
    || compatible[0]?.start_time.slice(0, 5)
    || "18:00";
};

const timeRange = (value: string, durationHours: DurationHours) => {
  const start = new Date(value);
  const end = new Date(start.getTime() + durationHours * 3_600_000);
  return `${start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
};

const fullSchedule = (value: string, durationHours: DurationHours) =>
  `${new Date(value).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })} · ${timeRange(value, durationHours)} WIB`;

const WEEKDAYS = [
  { value: 1, label: "Senin", short: "Sen" },
  { value: 2, label: "Selasa", short: "Sel" },
  { value: 3, label: "Rabu", short: "Rab" },
  { value: 4, label: "Kamis", short: "Kam" },
  { value: 5, label: "Jumat", short: "Jum" },
  { value: 6, label: "Sabtu", short: "Sab" },
  { value: 7, label: "Minggu", short: "Min" },
];

const isoWeekday = (date: Date) => ((date.getDay() + 6) % 7) + 1;

const normalizeWeekdays = (values: unknown): number[] => {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(Number))]
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7)
    .sort((a, b) => a - b)
    .slice(0, MAX_WEEKDAYS_PER_SUBJECT);
};

const nextSlots = (count: number, time = "18:00", startDate?: string, weekdays: number[] = [1, 3, 5]) => {
  const result: string[] = [];
  const cursor = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  if (!startDate) cursor.setDate(cursor.getDate() + 4);
  const [hour] = time.split(":").map(Number);
  cursor.setHours(hour || 0, 0, 0, 0);
  const selectedDays = new Set(weekdays.length ? weekdays : [1]);
  let guard = 0;
  while (result.length < count && guard < 730) {
    if (selectedDays.has(isoWeekday(cursor))) {
      const local = new Date(cursor.getTime() - cursor.getTimezoneOffset() * 60_000);
      result.push(local.toISOString().slice(0, 16));
    }
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return result;
};

const createSubject = (sessionCount = 1, time = "", offsetDays = 0, withSchedule = false, leadHours = 72): DraftSubject => {
  const scheduleBase = withSchedule ? new Date(`${earliestScheduleDate(time || "18:00", leadHours)}T00:00:00`) : null;
  if (scheduleBase && offsetDays > 0) scheduleBase.setDate(scheduleBase.getDate() + offsetDays);
  const scheduleStartDate = scheduleBase ? dateInput(scheduleBase) : "";
  const weekdays = withSchedule ? (sessionCount >= 10 ? [1, 3, 5] : [2, 4]) : [];
  return {
    key: `${Date.now()}-${Math.random()}`,
    curriculum_subject_id: "",
    subject_name: "",
    session_count: sessionCount,
    schedule_start_date: scheduleStartDate,
    schedule_time: time,
    weekdays,
    schedules: withSchedule ? nextSlots(sessionCount, time, scheduleStartDate, weekdays) : [],
    curriculum_chapter_ids: [],
    learning_topic_ids: [],
    chapter: "",
    learning_goal: "",
  };
};

const rebuildSchedules = (subject: DraftSubject, count = subject.session_count) => ({
  ...subject,
  session_count: count,
  schedules: subject.schedule_time && subject.schedule_start_date && subject.weekdays.length
    ? nextSlots(count, subject.schedule_time, subject.schedule_start_date, subject.weekdays)
    : [],
});

const rebalance = (items: DraftSubject[], total: number) => {
  const base = Math.floor(total / items.length);
  const remainder = total % items.length;
  return items.map((item, index) => rebuildSchedules(item, base + (index < remainder ? 1 : 0)));
};

function PackageBuilderIntro({ renewal }: { renewal: boolean }) {
  return (
    <>
      <section className="min-h-44 min-w-0 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-5 text-white sm:rounded-[2rem] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-100">{renewal ? "Tutor lama diprioritaskan" : "Langkah 1"}</p>
        <h1 className="mt-3 break-words text-2xl font-black sm:text-3xl">Susun paket belajarmu</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-50/90">{renewal ? "Lanjutkan dengan tutor yang sama. Materi lama tetap tersimpan sebagai riwayat; pilih materi yang belum selesai atau materi lanjutan untuk paket baru." : "Pilih jumlah sesi, durasi pertemuan, hari, dan jam mulai. Periksa ringkasan, bayar, lalu sistem mencari tutor."}</p>
      </section>
    </>
  );
}

function PackageBuilderSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Memuat formulir paket belajar" className="space-y-5 sm:space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm" aria-hidden="true">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
      </div>
      <section aria-hidden="true">
        <div className="mb-3 h-6 w-48 rounded-lg bg-slate-200" />
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="min-h-40 animate-pulse rounded-3xl border border-slate-100 bg-white p-5 motion-reduce:animate-none">
              <div className="h-4 w-20 rounded bg-indigo-100" />
              <div className="mt-4 h-6 w-3/4 rounded-lg bg-slate-200" />
              <div className="mt-3 h-4 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
      <span className="sr-only">Formulir paket belajar sedang dimuat.</span>
    </div>
  );
}

export default function PackageBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const renewalId = Number(searchParams.get("renew") || 0) || undefined;
  const renewalSubjectId = Number(searchParams.get("subject") || 0) || undefined;
  const requestedSubjectName = (searchParams.get("subject_name") || "").trim();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [catalog, setCatalog] = useState<SubjectOption[]>([]);
  const [materialCatalogs, setMaterialCatalogs] = useState<Record<number, MaterialCatalog>>({});
  const [materialsLoading, setMaterialsLoading] = useState<Record<number, boolean>>({});
  const [renewalBaselines, setRenewalBaselines] = useState<Record<number, RenewalMaterialBaseline>>({});
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [planId, setPlanId] = useState<number | "">("");
  const [level, setLevel] = useState("");
  const [grade, setGrade] = useState("");
  const [mode, setMode] = useState<"" | "online" | "offline">("");
  const [durationHours, setDurationHours] = useState<DurationHours | "">("");
  const [subjects, setSubjects] = useState<DraftSubject[]>([createSubject(0)]);
  const [promoCode, setPromoCode] = useState("");
  const [voucherId, setVoucherId] = useState<number | "">("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<SavedDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ErrorType>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasMultiSubjectPackage, setHasMultiSubjectPackage] = useState(false);
  const [tutorialStatusLoaded, setTutorialStatusLoaded] = useState(false);
  const multiSubjectGuideOpened = useRef(false);
  const quoteRequestIdRef = useRef(0);
  const draftStorageKey = useMemo(draftKeyForCurrentUser, []);

  const plan = plans.find((item) => item.id === planId);
  // Nilai aman hanya dipakai untuk menghitung tampilan. Pilihan pengguna tetap kosong sampai dipilih.
  const effectiveDurationHours: DurationHours = durationHours || 1;
  const availableTimeSlots = useMemo(
    () => slotsForDuration(timeSlots, effectiveDurationHours),
    [effectiveDurationHours, timeSlots],
  );
  const defaultSlotTime = preferredSlotTime(timeSlots, effectiveDurationHours);
  const renewalKeepsSameTutor = Boolean(renewalId)
    && subjects.length > 0
    && subjects.every((item) => Number(item.preferred_teacher_id || 0) > 0);
  const bookingLeadHours = renewalKeepsSameTutor ? 24 : 72;
  const selectedSessions = subjects.reduce((sum, item) => sum + item.session_count, 0);
  const selectedSubjectIds = subjects.map((item) => item.curriculum_subject_id).filter(Boolean);
  const subjectsAreUnique = new Set(selectedSubjectIds).size === selectedSubjectIds.length;
  const scheduleTimestamps = subjects.flatMap((item) => item.schedules).filter(Boolean);
  const sortedScheduleStarts = scheduleTimestamps
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const schedulesDoNotOverlap = sortedScheduleStarts.every((start, index) =>
    index === sortedScheduleStarts.length - 1 || start + effectiveDurationHours * 3_600_000 <= sortedScheduleStarts[index + 1]
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
  const subjectsForPicker = (item: DraftSubject) => availableSubjects.filter((subject) =>
    !subjects.some((other) => other.key !== item.key && other.curriculum_subject_id === subject.id),
  );
  const hasOfflineLocation = Boolean(
    studentProfile?.address?.trim()
    && studentProfile?.latitude !== null
    && studentProfile?.latitude !== undefined
    && String(studentProfile.latitude).trim() !== ""
    && Number.isFinite(Number(studentProfile.latitude))
    && studentProfile?.longitude !== null
    && studentProfile?.longitude !== undefined
    && String(studentProfile.longitude).trim() !== ""
    && Number.isFinite(Number(studentProfile.longitude)),
  );
  const draftValid = Boolean(
    plan
    && level
    && grade
    && durationHours
    && availableTimeSlots.length
    && selectedSessions === plan.session_count
    && subjectsAreUnique
    && schedulesDoNotOverlap
    && scheduleRangeDays <= plan.validity_days
    && (mode === "online" || hasOfflineLocation)
    && subjects.every((item) => item.curriculum_subject_id
      && item.subject_name
      && item.curriculum_chapter_ids.length > 0
      && item.learning_topic_ids.length > 0
      && item.weekdays.length > 0
      && item.weekdays.length <= MAX_WEEKDAYS_PER_SUBJECT
      && item.schedules.length === item.session_count
      && item.schedules.every(Boolean)
      && availableTimeSlots.some((slot) => slot.start_time.slice(0, 5) === item.schedule_time)),
  );

  useEffect(() => {
    let active = true;

    const loadSecondaryData = async () => {
      const { getCached } = await import("@/lib/http");
      const [voucherResult, profileResult, tutorialResult] = await Promise.allSettled([
        getCached<{ data: Voucher[] }>("/student/vouchers", {
          params: { compact: 1 },
          maxAgeMs: 60_000,
        }),
        getCached<StudentProfile>("/user", { maxAgeMs: 60_000 }),
        getCached<{ has_multi_subject_package: boolean }>("/student/packages/tutorial-status", { maxAgeMs: 60_000 }),
      ]);
      if (!active) return;

      if (voucherResult.status === "fulfilled") {
        const availableVouchers = (voucherResult.value.data.data ?? []).filter(
          (item): item is Voucher & { promotion: NonNullable<Voucher["promotion"]> } =>
            item.status === "available" && Boolean(item.promotion?.id),
        );
        setVouchers(availableVouchers);
        setVoucherId((current) => current && !availableVouchers.some((item) => item.id === current) ? "" : current);
      }

      if (profileResult.status === "fulfilled") {
        setStudentProfile(profileResult.value.data);
      }

      if (tutorialResult.status === "fulfilled") {
        setHasMultiSubjectPackage(Boolean(tutorialResult.value.data.has_multi_subject_package));
        setTutorialStatusLoaded(true);
      }
    };

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setTutorialStatusLoaded(false);
      try {
        const { default: http, getCached } = await import("@/lib/http");
        const [plansResponse, catalogResponse, slotsResponse, renewalResponse] = await Promise.all([
          getCached<Plan[]>("/package-plans", { maxAgeMs: 5 * 60_000 }),
          getCached<{ subject_options: SubjectOption[] }>("/learning-catalog", { params: { compact: 1 }, maxAgeMs: 5 * 60_000 }),
          getCached<TimeSlot[]>("/learning-time-slots", { maxAgeMs: 5 * 60_000 }),
          renewalId ? http.get(`/student/packages/${renewalId}`) : Promise.resolve(null),
        ]);
        if (!active) return;

        setPlans(plansResponse.data);
        const activeCatalog = (catalogResponse.data.subject_options || []).filter((item) => item.is_active !== false);
        setCatalog(activeCatalog);
        const fullHourSlots = slotsResponse.data.filter((slot) => slot.start_time.slice(3, 5) === "00");
        setTimeSlots(fullHourSlots);
        const defaultPlan = plansResponse.data.find((item) => item.session_count === 4) || plansResponse.data[0];

        if (renewalResponse) {
          const previous = renewalResponse.data;
          setLevel(previous.education_level);
          setGrade(previous.grade);
          setMode(previous.learning_mode);
          const renewalDuration = normalizeDurationHours(previous.duration_hours);
          const renewalDefaultTime = preferredSlotTime(fullHourSlots, renewalDuration);
          setDurationHours(renewalDuration);
          const selectedOld = renewalSubjectId
            ? previous.subjects.filter((item: any) => item.id === renewalSubjectId)
            : previous.subjects;
          const renewalPlan = plansResponse.data.find((item) => item.session_count === 4) || defaultPlan;
          if (renewalPlan && selectedOld.length) {
            setPlanId(renewalPlan.id);
            const allocation = Math.max(1, Math.floor(renewalPlan.session_count / selectedOld.length));
            const nextBaselines: Record<number, RenewalMaterialBaseline> = {};
            setSubjects(selectedOld.slice(0, renewalPlan.maximum_subjects).map((item: any, index: number) => {
              const count = index === selectedOld.length - 1
                ? renewalPlan.session_count - allocation * index
                : allocation;
              const previousTopics = Array.isArray(item.learning_topics) ? item.learning_topics : [];
              const topicStatusById = previousTopics.reduce((acc: Record<number, string>, topic: any) => {
                const catalogId = Number(topic.catalog_topic_id || topic.learning_topic_id || 0);
                if (catalogId > 0) acc[catalogId] = String(topic.status || "not_started");
                return acc;
              }, {});
              const previousTopicIds = Object.keys(topicStatusById).map(Number).filter((id) => id > 0);
              const incompleteTopicIds = previousTopicIds.filter((id) => topicStatusById[id] !== "completed");
              const allCompleted = previousTopicIds.length > 0 && incompleteTopicIds.length === 0;
              const subjectId = Number(item.curriculum_subject_id || 0);
              if (subjectId > 0) {
                nextBaselines[subjectId] = {
                  allCompleted,
                  topicStatusById,
                  totalTopics: previousTopicIds.length,
                  completedTopics: previousTopicIds.filter((id) => topicStatusById[id] === "completed").length,
                };
              }
              return {
                ...createSubject(count, renewalDefaultTime, index, true, item.teacher?.id ? 24 : 72),
                curriculum_subject_id: item.curriculum_subject_id,
                subject_name: item.subject_name || item.name || "",
                preferred_teacher_id: item.teacher?.id,
                curriculum_chapter_ids: Array.isArray(item.curriculum_chapter_ids) ? item.curriculum_chapter_ids : [],
                // Materi yang belum selesai dipilih otomatis. Jika seluruh materi lama
                // sudah selesai, sengaja mulai tanpa subbab terpilih agar murid memilih
                // materi lanjutan (atau memilih ulang materi lama untuk penguatan).
                learning_topic_ids: allCompleted
                  ? []
                  : incompleteTopicIds.length
                    ? incompleteTopicIds
                    : (Array.isArray(item.learning_topic_ids) ? item.learning_topic_ids : []),
                chapter: item.chapter || "",
                learning_goal: allCompleted ? "" : (item.learning_goal || ""),
              };
            }));
            setRenewalBaselines(nextBaselines);
          }
        } else {
          const requestedSubject = activeCatalog.find(
            (item) => item.name.trim().toLocaleLowerCase("id-ID") === requestedSubjectName.toLocaleLowerCase("id-ID"),
          );
          if (requestedSubject) {
            setSubjects([{
              ...createSubject(0),
              curriculum_subject_id: requestedSubject.id,
              subject_name: requestedSubject.name,
            }]);
          }
          try {
            const raw = draftStorageKey ? localStorage.getItem(draftStorageKey) : null;
            const saved = raw ? JSON.parse(raw) as SavedDraft : null;
            const savedPlan = plansResponse.data.find((item) => item.id === saved?.plan_id);
            if (saved && savedPlan && saved.subjects.length && saved.subjects.length <= savedPlan.maximum_subjects) {
              setPendingDraft(saved);
            }
          } catch {
            if (draftStorageKey) localStorage.removeItem(draftStorageKey);
          }
        }

        setLoading(false);
        void loadSecondaryData();
      } catch (err: unknown) {
        if (!active) return;
        const response = (err as { response?: { status?: number } } | null)?.response;
        if (!response) setLoadError("network");
        else if (response.status === 401) setLoadError("unauthorized");
        else if (response.status === 403) setLoadError("forbidden");
        else if (response.status === 404) setLoadError("not_found");
        else setLoadError("generic");
        setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [draftStorageKey, renewalId, renewalSubjectId, requestedSubjectName, retryKey]);

  const handleRetry = () => { setLoadError(null); setLoading(true); setRetryKey((k) => k + 1); };
  const openLocationSetup = () => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    navigate(`/student/profile?section=location&returnTo=${encodeURIComponent(returnTo)}`);
  };

  useEffect(() => {
    if (!catalog.length) return;
    setSubjects((current) => current.map((item) => {
      if (!item.curriculum_subject_id) return item;
      const option = catalog.find((candidate) => candidate.id === item.curriculum_subject_id);
      const eligible = option
        && (!level || !option.education_levels?.length || option.education_levels.includes(level))
        && (!grade || !option.grades?.length || option.grades.includes(grade));
      return eligible ? item : { ...item, curriculum_subject_id: "", subject_name: "", curriculum_chapter_ids: [], learning_topic_ids: [], chapter: "" };
    }));
  }, [catalog, grade, level]);

  useEffect(() => {
    const selected = subjects
      .filter((item): item is DraftSubject & { curriculum_subject_id: number } => typeof item.curriculum_subject_id === "number")
      .map((item) => ({ id: item.curriculum_subject_id, name: item.subject_name }));
    selected.forEach(({ id, name }) => {
      if (materialCatalogs[id] || materialsLoading[id]) return;
      setMaterialsLoading((current) => ({ ...current, [id]: true }));
      void import("@/lib/http").then(({ getCached, getApiError }) =>
        getCached<{ chapters: CurriculumChapterOption[]; topics: LearningTopicOption[] }>("/learning-catalog", {
          params: { subject_name: name, education_level: level, grade },
          maxAgeMs: 60_000,
        }).then((response) => {
          setMaterialCatalogs((current) => ({ ...current, [id]: {
            chapters: response.data.chapters || [],
            topics: response.data.topics || [],
          } }));
        }).catch((error) => {
          notify.error(getApiError(error, `Bab dan subbab ${name} gagal dimuat.`));
        }).finally(() => {
          setMaterialsLoading((current) => ({ ...current, [id]: false }));
        })
      );
    });
  }, [grade, level, materialCatalogs, materialsLoading, subjects]);

  useEffect(() => {
    if (loading || !planId || !mode || !durationHours || renewalId) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      const draft: SavedDraft = {
        saved_at: savedAt,
        plan_id: planId,
        level,
        grade,
        mode,
        duration_hours: effectiveDurationHours,
        subjects,
        promo_code: promoCode,
        voucher_id: voucherId,
      };
      try {
        if (!draftStorageKey) return;
        localStorage.setItem(draftStorageKey, JSON.stringify(draft));
        setDraftSavedAt(savedAt);
      } catch {
        // Form tetap dapat digunakan saat penyimpanan lokal tidak tersedia.
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [draftStorageKey, durationHours, effectiveDurationHours, grade, level, loading, mode, planId, promoCode, renewalId, subjects, voucherId]);

  const openMultiSubjectGuide = () => {
    window.dispatchEvent(new Event("bimbelku:open-tutorial"));
  };

  useEffect(() => {
    if (loading || !tutorialStatusLoaded || hasMultiSubjectPackage || !plan || plan.maximum_subjects < 2 || multiSubjectGuideOpened.current) return;
    try {
      if (localStorage.getItem(MULTI_SUBJECT_TUTORIAL_KEY)) return;
    } catch {
      return;
    }
    multiSubjectGuideOpened.current = true;
    const timer = window.setTimeout(openMultiSubjectGuide, 450);
    return () => window.clearTimeout(timer);
  }, [hasMultiSubjectPackage, loading, plan, tutorialStatusLoaded]);

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
      quoteRequestIdRef.current += 1;
      setQuote(null);
      setQuoting(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const requestId = ++quoteRequestIdRef.current;
      setQuoting(true);
      const { default: http, getApiError } = await import("@/lib/http");
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
        }, {
          signal: controller.signal,
        });

        if (requestId !== quoteRequestIdRef.current) return;
        setQuote(response.data);
        setPromoError(null);
      } catch (error) {
        if (controller.signal.aborted || requestId !== quoteRequestIdRef.current) return;
        setQuote(null);
        if (promoCode.trim() || voucherId) {
          const fallback = promoCode.trim()
            ? "Kode promo tidak ditemukan atau sudah tidak berlaku."
            : "Voucher tidak ditemukan atau sudah tidak berlaku.";
          setPromoError(getApiError(error, fallback));
        } else {
          setPromoError(null);
          notify.error(getApiError(error, "Harga paket tidak dapat dihitung."));
        }
      } finally {
        if (requestId === quoteRequestIdRef.current) {
          setQuoting(false);
        }
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [draftValid, durationHours, effectiveDurationHours, level, mode, planId, promoCode, subjects, voucherId]);

  const changeDuration = (nextDuration: DurationHours) => {
    if (nextDuration === durationHours) return;
    const compatibleSlots = slotsForDuration(timeSlots, nextDuration);
    if (!compatibleSlots.length) {
      notify.error(`Belum ada jam aktif yang dapat dipakai untuk sesi ${nextDuration} jam.`);
      return;
    }
    const fallbackTime = preferredSlotTime(timeSlots, nextDuration);
    setDurationHours(nextDuration);
    setSubjects((current) => current.map((item) => {
      const isStillAvailable = compatibleSlots.some((slot) => slot.start_time.slice(0, 5) === item.schedule_time);
      return isStillAvailable ? item : rebuildSchedules({ ...item, schedule_time: fallbackTime });
    }));
    setQuote(null);
  };

  const choosePlan = (selected: Plan) => {
    setPlanId(selected.id);
    setSubjects((current) => {
      const fresh = createSubject(selected.session_count);
      const first = current[0];
      if (!first?.curriculum_subject_id || !first.subject_name) return [fresh];
      return [{
        ...fresh,
        curriculum_subject_id: first.curriculum_subject_id,
        subject_name: first.subject_name,
      }];
    });
    setQuote(null);
  };
  const updateSubject = (key: string, patch: Partial<DraftSubject>) => {
    setSubjects((current) => current.map((item) => {
      if (item.key !== key) return item;
      const normalizedPatch = patch.weekdays !== undefined
        ? { ...patch, weekdays: normalizeWeekdays(patch.weekdays) }
        : patch;
      const next = { ...item, ...normalizedPatch };
      if (patch.session_count !== undefined || patch.schedule_start_date !== undefined || patch.schedule_time !== undefined || patch.weekdays !== undefined) {
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
      if (draftStorageKey) localStorage.removeItem(draftStorageKey);
    } catch {
      // Form tetap dapat direset pada state halaman.
    }
    setPlanId("");
    setSubjects([createSubject(0)]);
    setLevel("");
    setGrade("");
    setMode("");
    setDurationHours("");
    setPromoCode("");
    setVoucherId("");
    setQuote(null);
    setDraftRestored(false);
    setDraftSavedAt(null);
    setPendingDraft(null);
  };

  const restoreDraft = () => {
    if (!pendingDraft) return;
    const savedPlan = plans.find((item) => item.id === pendingDraft.plan_id);
    if (!savedPlan || !pendingDraft.subjects.length || pendingDraft.subjects.length > savedPlan.maximum_subjects) {
      resetDraft();
      notify.error("Draf lama tidak lagi cocok dengan pilihan paket yang tersedia.");
      return;
    }

    const restoredDuration = normalizeDurationHours(pendingDraft.duration_hours);
    const restoredDefaultTime = preferredSlotTime(timeSlots, restoredDuration);
    setPlanId(pendingDraft.plan_id);
    setLevel(pendingDraft.level);
    setGrade(pendingDraft.grade);
    setMode(pendingDraft.mode);
    setDurationHours(restoredDuration);
    setSubjects(pendingDraft.subjects.map((item, index) => {
      const restoredDays = normalizeWeekdays(
        Array.isArray(item.weekdays) && item.weekdays.length
          ? item.weekdays
          : (item.schedules || []).map((schedule) => isoWeekday(new Date(schedule))),
      );
      const candidateTime = item.schedule_time?.slice(3, 5) === "00" ? item.schedule_time : restoredDefaultTime;
      const restoredTime = timeSlots.some((slot) => slot.start_time.slice(0, 5) === candidateTime)
        && slotSupportsDuration(candidateTime, restoredDuration)
        ? candidateTime
        : restoredDefaultTime;
      const restored: DraftSubject = {
        ...item,
        key: item.key || `${Date.now()}-${index}`,
        schedule_start_date: item.schedule_start_date || item.schedules[0]?.slice(0, 10) || earliestScheduleDate(restoredTime),
        schedule_time: restoredTime,
        weekdays: restoredDays.length ? restoredDays : [1, 3, 5],
        curriculum_chapter_ids: Array.isArray(item.curriculum_chapter_ids) ? item.curriculum_chapter_ids : [],
        learning_topic_ids: Array.isArray(item.learning_topic_ids) ? item.learning_topic_ids : [],
        schedules: Array.isArray(item.schedules) ? item.schedules : [],
      };
      const savedSchedulesAreValid = restored.schedules.length === restored.session_count
        && restored.schedules.every((schedule) => {
          const date = new Date(schedule);
          return Number.isFinite(date.getTime())
            && schedule.slice(11, 16) === restoredTime
            && restored.weekdays.includes(isoWeekday(date));
        });
      return savedSchedulesAreValid
        ? { ...restored, schedules: [...restored.schedules].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()) }
        : rebuildSchedules(restored);
    }));
    setPromoCode(pendingDraft.promo_code || "");
    setVoucherId(pendingDraft.voucher_id || "");
    setDraftSavedAt(pendingDraft.saved_at);
    setDraftRestored(true);
    setPendingDraft(null);
    notify.success("Draf dilanjutkan.");
  };
  const submit = async () => {
    if (!draftValid || !quote) {
      notify.error("Lengkapi pembagian sesi dan jadwal terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    const { default: http, getApiError } = await import("@/lib/http");
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
          curriculum_chapter_ids: item.curriculum_chapter_ids,
          learning_topic_ids: item.learning_topic_ids,
          learning_goal: item.learning_goal || undefined,
          preferred_teacher_id: item.preferred_teacher_id,
          weekdays: item.weekdays,
          schedules: item.schedules,
        })),
      });
      notify.success(response.data.message);
      try {
        if (draftStorageKey) localStorage.removeItem(draftStorageKey);
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
          durationHours: Number(order.duration_hours || effectiveDurationHours),
          totalLearningHours: Number(order.total_learning_hours || (plan?.session_count || 0) * effectiveDurationHours),
          orderKind: order.order_kind || "package",
        },
      });
    } catch (error) {
      notify.error(getApiError(error, "Paket gagal dibuat."));
    } finally {
      setSubmitting(false);
    }
  };

  const completedSteps = [
    Boolean(plan),
    subjects.every((item) => item.curriculum_subject_id && item.curriculum_chapter_ids.length > 0 && item.learning_topic_ids.length > 0),
    Boolean(plan && selectedSessions === plan.session_count),
    subjects.every((item) => item.weekdays.length > 0 && item.weekdays.length <= MAX_WEEKDAYS_PER_SUBJECT && item.schedules.length === item.session_count && item.schedules.every(Boolean)) && schedulesDoNotOverlap,
    Boolean(draftValid && quote),
  ];
  const firstIncomplete = completedSteps.findIndex((done) => !done);
  const activeStepIndex = firstIncomplete === -1 ? 4 : Math.min(firstIncomplete, 4);

  if (loading) {
    return (
      <StudentLayout title={renewalId ? "Perpanjang Paket" : "Pilih Paket Belajar"}>
        <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 overflow-hidden pb-20 sm:space-y-6">
          <PackageBuilderIntro renewal={Boolean(renewalId)} />
          <PackageBuilderSkeleton />
        </div>
      </StudentLayout>
    );
  }

  if (loadError) {
    return (
      <StudentLayout title={renewalId ? "Perpanjang Paket" : "Pilih Paket Belajar"}>
        <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 overflow-hidden pb-20 sm:space-y-6">
          <PackageBuilderIntro renewal={Boolean(renewalId)} />
          <div className="mx-auto max-w-xl py-10 sm:py-16">
            <ErrorState type={loadError} onRetry={handleRetry} />
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title={renewalId ? "Perpanjang Paket" : "Pilih Paket Belajar"}>
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 overflow-hidden pb-20 sm:space-y-6">
        <PackageBuilderIntro renewal={Boolean(renewalId)} />

        <nav aria-label="Tahapan pemesanan" className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Langkah {activeStepIndex + 1} dari 5</p><p className="mt-1 text-sm font-black text-slate-900">{["Paket & sesi", "Mata pelajaran", "Pembagian sesi", "Jadwal", "Ringkasan"][activeStepIndex]}</p></div>
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-sm font-black text-white">{activeStepIndex + 1}</span>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5" aria-hidden="true">{completedSteps.map((done, index) => <span key={index} className={`h-1.5 rounded-full ${index === activeStepIndex ? "bg-indigo-600" : done ? "bg-emerald-400" : "bg-slate-200"}`} />)}</div>
          </div>
          <ol className="hidden grid-cols-5 gap-2 sm:grid">
            {["Paket & Sesi", "Mapel", "Pembagian Sesi", "Jadwal", "Ringkasan"].map((label, index) => (
              <li key={label} className={`flex min-h-12 items-center gap-2 rounded-2xl px-3 text-xs font-black ${index === activeStepIndex ? "bg-indigo-600 text-white" : completedSteps[index] ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${index === activeStepIndex ? "bg-white/20" : completedSteps[index] ? "bg-emerald-100" : "bg-white"}`}>{completedSteps[index] && index !== activeStepIndex ? <Check size={14} /> : index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </nav>

        {!renewalId && pendingDraft && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black">Ada draf yang belum selesai</p>
              <p className="mt-0.5 text-xs text-amber-800">Form tetap kosong. Tekan “Lanjutkan draf” jika ingin memakai pilihan yang disimpan {new Date(pendingDraft.saved_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button type="button" onClick={resetDraft} className="min-h-11 rounded-xl border border-amber-200 bg-white px-4 text-xs font-black text-amber-800 hover:bg-amber-100">Hapus draf</button>
              <button type="button" onClick={restoreDraft} className="min-h-11 rounded-xl bg-amber-900 px-4 text-xs font-black text-white hover:bg-amber-950">Lanjutkan draf</button>
            </div>
          </div>
        )}

        {!renewalId && !pendingDraft && draftSavedAt && (
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
          <div className="grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
            {plans.map((item) => (
              <button
                key={item.id}
                data-tour={item.maximum_subjects >= 2 ? "package-plan-picker" : undefined}
                type="button"
                onClick={() => choosePlan(item)}
                className={`min-h-40 min-w-0 overflow-hidden rounded-3xl border p-4 text-left transition sm:p-5 ${planId === item.id ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 bg-white hover:border-indigo-300"}`}
              >
                <div className="flex items-start justify-between">
                  <BookOpenCheck className={planId === item.id ? "text-indigo-600" : "text-slate-500"} />
                  {planId === item.id && <Check className="text-indigo-600" size={20} />}
                </div>
                <h3 className="mt-4 font-black text-slate-900">{item.name}</h3>
                <p className="mt-1 text-2xl font-black text-indigo-700">{item.session_count} sesi</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{item.validity_days} hari · maksimal {item.maximum_subjects} mapel</p>
              </button>
            ))}
          </div>
        </section>

        <section data-tour="package-duration-picker" className="render-auto rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Clock3 size={20} /></div>
            <div className="min-w-0">
              <h2 className="break-words text-lg font-black text-slate-900">2. Durasi setiap pertemuan</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Pilih lama belajar untuk setiap sesi dalam paket ini.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([1, 2] as DurationHours[]).map((hours) => {
              const active = durationHours === hours;
              return (
                <button
                  key={hours}
                  type="button"
                  aria-pressed={active}
                  onClick={() => changeDuration(hours)}
                  className={`min-h-28 rounded-2xl border px-5 py-4 text-left transition ${active ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50"}`}
                >
                  <span className="text-3xl font-black">{hours} jam</span>
                  <p className={`mt-1 text-xs font-bold leading-5 ${active ? "text-indigo-100" : "text-slate-500"}`}>
                    {hours === 1 ? "Cocok untuk sesi rutin yang lebih ringan." : "Cocok untuk pembahasan dan latihan yang lebih panjang."}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="mt-3 rounded-2xl bg-indigo-50 px-4 py-3 text-xs font-bold leading-5 text-indigo-800">
            {plan && durationHours ? `${plan.session_count} sesi × ${durationHours} jam = ${plan.session_count * durationHours} jam belajar` : "Pilih paket dan lama belajar untuk melihat total jam belajar."}
          </p>
          <p className="mt-2 text-xs font-medium leading-5 text-slate-500">Jam mulai tetap memakai menit 00. Sistem otomatis menghitung jam selesai dan memeriksa benturan.</p>
        </section>

        <section className="render-auto rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-black text-slate-900">3. Jenjang dan metode</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Jenjang">
              <ResponsiveSelect
                value={level}
                ariaLabel="Pilih jenjang"
                placeholder="Pilih jenjang"
                tone="emerald"
                options={EDUCATION_LEVELS.map((item) => ({ value: item, label: item }))}
                className={level ? "border-emerald-300 bg-emerald-50 text-emerald-800" : ""}
                onValueChange={(next) => { setLevel(next); setGrade(""); setMaterialCatalogs({}); setSubjects((current) => current.map((item) => ({ ...item, curriculum_chapter_ids: [], learning_topic_ids: [], chapter: "" }))); }}
              />
            </Field>
            <Field label={level === "Umum" ? "Tingkat" : "Kelas"}>
              <ResponsiveSelect
                value={grade}
                ariaLabel={level === "Umum" ? "Pilih tingkat" : "Pilih kelas"}
                placeholder={level ? (level === "Umum" ? "Pilih tingkat" : "Pilih kelas") : "Pilih jenjang dulu"}
                tone="emerald"
                disabled={!level}
                options={(GRADES_BY_EDUCATION_LEVEL[level] || []).map((item) => ({ value: item, label: item }))}
                className={grade ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "disabled:bg-slate-100"}
                onValueChange={(next) => { setGrade(next); setMaterialCatalogs({}); setSubjects((current) => current.map((item) => ({ ...item, curriculum_chapter_ids: [], learning_topic_ids: [], chapter: "" }))); }}
              />
            </Field>
            <Field label="Metode belajar">
              <ResponsiveSelect
                value={mode}
                ariaLabel="Pilih metode belajar"
                placeholder="Pilih metode belajar"
                tone="emerald"
                options={[{ value: "online", label: "Online" }, { value: "offline", label: "Offline" }]}
                className={mode ? "border-emerald-300 bg-emerald-50 text-emerald-800" : ""}
                onValueChange={(next) => setMode(next as "online" | "offline")}
              />
            </Field>
          </div>

          {mode === "offline" && (
            <div className={`mt-5 rounded-2xl border p-4 sm:p-5 ${hasOfflineLocation ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex min-w-0 items-start gap-3">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${hasOfflineLocation ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-700"}`}>
                  <MapPin size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-black ${hasOfflineLocation ? "text-emerald-900" : "text-amber-900"}`}>
                    {hasOfflineLocation ? "Lokasi kelas offline sudah siap" : "Tambahkan lokasi untuk kelas offline"}
                  </p>
                  <p className={`mt-1 break-words text-sm leading-6 ${hasOfflineLocation ? "text-emerald-700" : "text-amber-800"}`}>
                    {hasOfflineLocation
                      ? studentProfile?.address
                      : "Alamat dan titik lokasi diperlukan agar sistem dapat mencari tutor di sekitar kamu."}
                  </p>
                  <button
                    type="button"
                    onClick={openLocationSetup}
                    className={`mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${hasOfflineLocation ? "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100" : "bg-amber-700 text-white hover:bg-amber-800"}`}
                  >
                    <MapPin size={17} /> {hasOfflineLocation ? "Ubah lokasi" : "Tambahkan lokasi sekarang"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="render-auto rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">4. Pilih mapel dan bagikan sesi</h2>
              <p className={`mt-1 text-sm font-bold ${selectedSessions === plan?.session_count ? "text-emerald-700" : "text-orange-700"}`}>
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
                      options={subjectsForPicker(item)}
                      value={item.subject_name}
                      educationLevel={level}
                      grade={grade}
                      placeholder="Cari mata pelajaran"
                      disabled={Boolean(renewalId && renewalSubjectId)}
                      onChange={(name, option) =>
                        updateSubject(item.key, {
                          subject_name: name,
                          curriculum_subject_id: option?.id ?? "",
                          preferred_teacher_id: undefined,
                          curriculum_chapter_ids: [],
                          learning_topic_ids: [],
                          chapter: "",
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
                <div className="mt-4 grid gap-4">
                  <MaterialSelector
                    catalog={typeof item.curriculum_subject_id === "number" ? materialCatalogs[item.curriculum_subject_id] : undefined}
                    loading={typeof item.curriculum_subject_id === "number" && Boolean(materialsLoading[item.curriculum_subject_id])}
                    chapterIds={item.curriculum_chapter_ids}
                    topicIds={item.learning_topic_ids}
                    disabled={!item.curriculum_subject_id}
                    renewalBaseline={typeof item.curriculum_subject_id === "number" ? renewalBaselines[item.curriculum_subject_id] : undefined}
                    onChange={(chapterIds, topicIds, chapterLabel) => updateSubject(item.key, {
                      curriculum_chapter_ids: chapterIds,
                      learning_topic_ids: topicIds,
                      chapter: chapterLabel,
                    })}
                  />
                  <MaterialCapacityWarning
                    topicCount={item.learning_topic_ids.length}
                    sessionCount={item.session_count}
                    durationHours={effectiveDurationHours}
                  />
                  <Field label="Target belajar atau kesulitan murid">
                    <input value={item.learning_goal} onChange={(event) => updateSubject(item.key, { learning_goal: event.target.value })} className="form-field" placeholder="Contoh: Mampu mengerjakan soal cerita pecahan" />
                  </Field>
                </div>
                <div className="mt-5 rounded-2xl border border-indigo-100 bg-white p-4">
                  <p className="mb-1 flex items-center gap-2 text-sm font-black text-slate-700"><CalendarPlus size={17} /> Atur pola jadwal sekali</p>
                  <p className="mb-3 text-xs font-semibold leading-5 text-slate-500">
                    {bookingLeadHours === 24
                      ? "Perpanjangan dengan tutor yang sama dapat dimulai minimal 24 jam dari sekarang."
                      : "Pesanan baru atau perpanjangan tanpa tutor lama dapat dimulai minimal 72 jam dari sekarang."}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Mulai belajar">
                      <input type="date" min={earliestScheduleDate(item.schedule_time || defaultSlotTime, bookingLeadHours)} value={item.schedule_start_date} onChange={(event) => updateSubject(item.key, { schedule_start_date: event.target.value })} className="form-field" />
                    </Field>
                    <div>
                      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Jam belajar</span>
                      <ScheduleTimePicker
                        value={item.schedule_time}
                        options={availableTimeSlots}
                        disabled={!durationHours}
                        onChange={(value) => updateSubject(item.key, { schedule_time: value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Hari belajar</span>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                        {WEEKDAYS.map((day) => {
                          const active = item.weekdays.includes(day.value);
                          const limitReached = item.weekdays.length >= MAX_WEEKDAYS_PER_SUBJECT;
                          const disabled = !active && limitReached;
                          return <button
                            key={day.value}
                            type="button"
                            disabled={disabled}
                            aria-disabled={disabled}
                            onClick={() => {
                              if (disabled) return;
                              const weekdays = active
                                ? item.weekdays.filter((value) => value !== day.value)
                                : [...item.weekdays, day.value].sort((a, b) => a - b);
                              if (weekdays.length) updateSubject(item.key, { weekdays });
                            }}
                            className={`min-h-11 rounded-xl border px-2 text-xs font-black transition ${active ? "border-indigo-600 bg-indigo-600 text-white" : disabled ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700"}`}
                            title={disabled ? `Maksimal ${MAX_WEEKDAYS_PER_SUBJECT} hari belajar` : day.label}
                          >
                            {day.short}
                          </button>;
                        })}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 text-xs font-medium">
                        <p className={item.weekdays.length >= MAX_WEEKDAYS_PER_SUBJECT ? "font-bold text-amber-700" : "text-slate-500"}>
                          Maksimal {MAX_WEEKDAYS_PER_SUBJECT} hari per mapel · {item.weekdays.length}/{MAX_WEEKDAYS_PER_SUBJECT} dipilih
                        </p>
                        {item.weekdays.length >= MAX_WEEKDAYS_PER_SUBJECT && <span className="rounded-full bg-amber-100 px-2 py-1 font-black text-amber-800">Batas tercapai</span>}
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-500">Jam yang dipilih berlaku sama pada seluruh hari. Tanggal tertentu dapat digeser sebelum tutor dicari.</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900">
                    <p className="font-black">{item.subject_name || `Mapel ${subjectIndex + 1}`} · {item.schedules.length} pertemuan otomatis</p>
                    <p className="mt-1 text-xs font-medium leading-5 text-indigo-700">
                      {item.schedules.length ? `${item.weekdays.map((day) => WEEKDAYS.find((option) => option.value === day)?.label).filter(Boolean).join(", ")} · ${new Date(item.schedules[0]).toLocaleDateString("id-ID", { dateStyle: "medium" })} sampai ${new Date(item.schedules[item.schedules.length - 1]).toLocaleDateString("id-ID", { dateStyle: "medium" })} · ${timeRange(item.schedules[0], effectiveDurationHours)} WIB` : "Jadwal belum dipilih."}
                    </p>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-black">Lihat atau ubah tanggal tertentu</summary>
                      <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
                        {item.schedules.map((schedule, index) => (
                          <li key={`${item.key}-${index}`} className="grid min-w-0 gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 sm:grid-cols-[1fr_150px] sm:items-center">
                            <span className="min-w-0 break-words">{index + 1}. {fullSchedule(schedule, effectiveDurationHours)}</span>
                            <input
                              type="date"
                              aria-label={`Ubah tanggal sesi ${index + 1}`}
                              min={earliestScheduleDate(item.schedule_time, bookingLeadHours)}
                              value={schedule.slice(0, 10)}
                              onChange={(event) => {
                                const nextSchedules = [...item.schedules];
                                nextSchedules[index] = `${event.target.value}T${item.schedule_time}`;
                                nextSchedules.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                                updateSubject(item.key, { schedules: nextSchedules });
                              }}
                              className="min-h-10 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-700"
                            />
                          </li>
                        ))}
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
          
        </section>

        <section className="render-auto-tall grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-7">
            <h2 className="break-words text-lg font-black text-slate-900">5. Voucher atau kode promo</h2>
            <p className="mt-1 text-sm text-slate-500">Satu transaksi hanya memakai satu voucher atau kode.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Voucher Saya">
                <ResponsiveSelect
                  value={voucherId}
                  ariaLabel="Pilih voucher"
                  placeholder="Tanpa voucher"
                  options={[
                    { value: "", label: "Tanpa voucher" },
                    ...vouchers.map((item) => ({ value: item.id, label: item.promotion?.title || "Voucher tidak tersedia" })),
                  ]}
                  onValueChange={(next) => { setVoucherId(Number(next) || ""); setPromoCode(""); setPromoError(null); }}
                />
              </Field>
              <Field label="Masukkan kode promo">
                <div className="relative">
                  <Tag className="absolute left-3 top-3.5 text-slate-500" size={17} />
                  <input value={promoCode} disabled={Boolean(voucherId)} onChange={(event) => { setPromoCode(event.target.value.toUpperCase()); setPromoError(null); }} className="form-field pl-10 uppercase disabled:bg-slate-100" placeholder="BELAJAR20" />
                </div>
              </Field>
            </div>
            {promoError && (
              <div className="mt-4 flex min-w-0 items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                <p className="min-w-0 break-words">{promoError}</p>
              </div>
            )}
          </div>

          <aside className="min-w-0 overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-xl sm:p-6">
            <div className="flex items-center gap-2 text-indigo-100"><Clock3 size={17} /><span className="text-xs font-black uppercase tracking-wider">Ringkasan harga</span></div>
            {quoting ? (
              <div className="grid h-32 place-items-center"><Loader2 className="animate-spin" /></div>
            ) : quote ? (
              <>
                <div className="mt-5 space-y-3 text-sm">
                  {quote.lines.map((line) => (
                    <div key={line.curriculum_subject_id} className="flex min-w-0 items-start justify-between gap-3 text-slate-300">
                      <span className="min-w-0 break-words">{line.subject_name} · {line.session_count} sesi × {line.duration_hours} jam</span>
                      <span className="shrink-0 text-right">{rupiah(line.subtotal_amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between text-slate-300"><span>Harga normal</span><span className={quote.discount_amount ? "text-xs line-through" : ""}>{rupiah(quote.subtotal_amount)}</span></div>
                    {quote.discount_amount > 0 && <div className="mt-2 flex justify-between text-emerald-300"><span>Potongan</span><span>-{rupiah(quote.discount_amount)}</span></div>}
                  </div>
                </div>
                <p className="mt-5 text-xs font-bold text-slate-300">Total pembayaran</p>
                <p className="mt-1 break-all text-2xl font-black sm:text-3xl">{rupiah(quote.total_amount)}</p>
                {quote.promotion && <span className="mt-2 inline-flex rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black text-emerald-300">🏷️ {quote.promotion.title}</span>}
              </>
            ) : (
              <p className="mt-5 text-sm leading-6 text-slate-300">Lengkapi alokasi sesi untuk melihat harga akhir.</p>
            )}
            <button data-tour="package-review-order" type="button" disabled={!draftValid || !quote || submitting} onClick={() => setSummaryOpen(true)} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white font-black text-slate-950 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40">
              <FileCheck2 size={18} />
              Periksa Pesanan
            </button>
          </aside>
        </section>

        {summaryOpen && quote && plan && (
          <div className="fixed inset-0 z-[230] flex items-end justify-center bg-slate-950/70 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setSummaryOpen(false); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="order-summary-title" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl sm:max-h-[94dvh]">
              <header className="flex min-w-0 shrink-0 items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-7">
                <div className="min-w-0">
                  <p className="break-words text-xs font-black uppercase tracking-[.18em] text-indigo-600">Langkah terakhir sebelum pembayaran</p>
                  <h2 id="order-summary-title" className="mt-2 text-2xl font-black text-slate-900">Periksa rincian bimbel</h2>
                  <p className="mt-1 text-sm text-slate-500">Pastikan paket, mapel, dan seluruh tanggal sudah tepat.</p>
                </div>
                <button type="button" disabled={submitting} aria-label="Tutup ringkasan" onClick={() => setSummaryOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={20} /></button>
              </header>

              <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-7">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <SummaryItem label="Paket" value={`${plan.name} · ${plan.session_count} sesi`} />
                  <SummaryItem label="Durasi" value={`${effectiveDurationHours} jam/pertemuan`} />
                  <SummaryItem label="Jenjang" value={`${level} · ${grade}`} />
                  <SummaryItem label="Metode" value={mode === "online" ? "Online" : "Offline"} />
                </div>
                {mode === "offline" && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-500">Lokasi belajar</p><p className="mt-2 text-sm font-bold leading-6 text-slate-800">{studentProfile?.address}</p>{studentProfile?.maps_link && <a href={studentProfile.maps_link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-black text-indigo-600">Buka peta</a>}</div>}
                <div>
                  <h3 className="text-sm font-black text-slate-900">Mapel, pembagian, dan jadwal</h3>
                  <div className="mt-3 space-y-3">
                    {subjects.map((item) => (
                      <div key={item.key} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black text-slate-900">{item.subject_name}</p>{item.chapter && <p className="mt-1 text-xs font-medium text-slate-500">{item.chapter}{item.learning_goal ? ` · ${item.learning_goal}` : ""}</p>}</div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{item.session_count} sesi</span></div>
                        <MaterialCapacityWarning
                          topicCount={item.learning_topic_ids.length}
                          sessionCount={item.session_count}
                          durationHours={effectiveDurationHours}
                          compact
                        />
                        <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
                          {item.schedules.map((schedule, index) => <li key={`${item.key}-summary-${schedule}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{index + 1}. {fullSchedule(schedule, effectiveDurationHours)}</li>)}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950 p-5 text-white">
                  <p className="mb-3 text-xs font-bold text-slate-300">Total waktu belajar: {plan.session_count * effectiveDurationHours} jam</p>
                  <div className="flex justify-between text-sm text-slate-300"><span>Harga normal</span><span>{rupiah(quote.subtotal_amount)}</span></div>
                  {quote.discount_amount > 0 && <div className="mt-2 flex justify-between text-sm text-emerald-300"><span>Potongan</span><span>-{rupiah(quote.discount_amount)}</span></div>}
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-white/10 pt-4"><span className="text-sm font-black">Total pembayaran</span><span className="break-all text-right text-xl font-black sm:text-2xl">{rupiah(quote.total_amount)}</span></div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-900">Setelah dikonfirmasi, kamu langsung menuju pembayaran. Pencarian tutor baru dimulai setelah pembayaran dinyatakan diterima oleh sistem.</div>
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
  return <label className="block min-w-0 max-w-full"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}

function timeSlotLabel(slot: TimeSlot) {
  if (slot.label?.trim()) return slot.label;
  return `${slot.start_time.slice(0, 5).replace(":", ".")} WIB`;
}

function ScheduleTimePicker({ value, options, disabled = false, onChange }: { value: string; options: TimeSlot[]; disabled?: boolean; onChange: (value: string) => void }) {
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
        disabled={disabled || !options.length}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Pilih jam mulai pertemuan"
        className="form-field flex min-w-0 items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        <span className="min-w-0 truncate">{selected ? timeSlotLabel(selected) : disabled ? "Pilih durasi dulu" : "Pilih jam"}</span>
        <ChevronDown className="shrink-0 text-slate-500" size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[250] flex items-end justify-center overflow-hidden bg-slate-950/60 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-[2px] sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-time-title"
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl sm:max-h-[72dvh]"
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-600">Jadwal pertemuan</p>
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

function MaterialSelector({ catalog, loading, chapterIds, topicIds, disabled, renewalBaseline, onChange }: {
  catalog?: MaterialCatalog;
  loading: boolean;
  chapterIds: number[];
  topicIds: number[];
  disabled: boolean;
  renewalBaseline?: RenewalMaterialBaseline;
  onChange: (chapterIds: number[], topicIds: number[], chapterLabel: string) => void;
}) {
  const chapters = catalog?.chapters || [];
  const availableTopics = (catalog?.topics || []).filter((topic) => {
    const chapter = chapters.find((item) => item.title === topic.chapter);
    return Boolean(chapter && chapterIds.includes(chapter.id));
  });
  const toggleChapter = (chapter: CurriculumChapterOption) => {
    const nextChapterIds = chapterIds.includes(chapter.id)
      ? chapterIds.filter((id) => id !== chapter.id)
      : [...chapterIds, chapter.id];
    const allowedChapterTitles = chapters.filter((item) => nextChapterIds.includes(item.id)).map((item) => item.title);
    const nextTopicIds = topicIds.filter((id) => (catalog?.topics || []).some((topic) => topic.id === id && allowedChapterTitles.includes(topic.chapter)));
    onChange(nextChapterIds, nextTopicIds, allowedChapterTitles.join(", "));
  };
  const toggleTopic = (topicId: number) => {
    const next = topicIds.includes(topicId) ? topicIds.filter((id) => id !== topicId) : [...topicIds, topicId];
    const labels = chapters.filter((item) => chapterIds.includes(item.id)).map((item) => item.title);
    onChange(chapterIds, next, labels.join(", "));
  };
  const selectAllTopics = () => {
    const ids = availableTopics.map((topic) => topic.id);
    const allSelected = ids.length > 0 && ids.every((id) => topicIds.includes(id));
    const next = allSelected ? topicIds.filter((id) => !ids.includes(id)) : [...new Set([...topicIds, ...ids])];
    const labels = chapters.filter((item) => chapterIds.includes(item.id)).map((item) => item.title);
    onChange(chapterIds, next, labels.join(", "));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Bab dan subbab</p><p className="mt-1 text-xs leading-5 text-slate-500">Pilih target materi. Progres akan dihitung dari subbab unik yang selesai.</p></div>
        {loading && <Loader2 className="animate-spin text-indigo-600" size={18} />}
      </div>
      {renewalBaseline && (
        <div className={`mt-3 rounded-xl border p-3 text-xs font-semibold leading-5 ${renewalBaseline.allCompleted ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-indigo-200 bg-indigo-50 text-indigo-900"}`}>
          {renewalBaseline.allCompleted ? (
            <><span className="font-black">Materi paket sebelumnya sudah selesai.</span> Pilih bab/subbab lanjutan untuk paket baru. Kalau ingin mengulang materi lama, centang lagi subbabnya; progress paket baru tetap dimulai dari 0% dan tercatat sebagai penguatan.</>
          ) : (
            <><span className="font-black">Lanjut dari progress sebelumnya.</span> Subbab yang belum selesai sudah dipilih otomatis. Kamu tetap boleh menambah materi baru.</>
          )}
        </div>
      )}
      {disabled ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">Pilih mata pelajaran terlebih dahulu.</p> : !loading && !chapters.length ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Bab belum tersedia untuk kelas ini. Admin perlu menjalankan seeder katalog.</p> : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {chapters.map((chapter) => {
              const active = chapterIds.includes(chapter.id);
              return <button key={chapter.id} type="button" onClick={() => toggleChapter(chapter)} className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-black ${active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}>{chapter.title}</button>;
            })}
          </div>
          {chapterIds.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3"><p className="text-xs font-black text-slate-700">Subbab target</p><button type="button" onClick={selectAllTopics} className="text-xs font-black text-indigo-600">{availableTopics.length > 0 && availableTopics.every((topic) => topicIds.includes(topic.id)) ? "Kosongkan" : "Pilih semua"}</button></div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {availableTopics.map((topic) => {
                  const previousStatus = renewalBaseline?.topicStatusById[topic.id];
                  const previousLabel = previousStatus === "completed"
                    ? "Selesai sebelumnya"
                    : previousStatus === "in_progress"
                      ? "Lanjutkan"
                      : previousStatus
                        ? "Belum selesai"
                        : null;
                  return (
                    <label key={topic.id} className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs font-bold ${topicIds.includes(topic.id) ? "border-indigo-300 bg-indigo-50 text-indigo-900" : "border-slate-200 text-slate-600"}`}>
                      <input type="checkbox" checked={topicIds.includes(topic.id)} onChange={() => toggleTopic(topic.id)} className="mt-0.5 h-4 w-4" />
                      <span className="min-w-0"><span className="block">{topic.name}</span>{previousLabel && <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${previousStatus === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{previousLabel}</span>}</span>
                    </label>
                  );
                })}
              </div>
              {!availableTopics.length && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Subbab untuk bab ini belum tersedia.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MaterialCapacityWarning({ topicCount, sessionCount, durationHours, compact = false }: {
  topicCount: number;
  sessionCount: number;
  durationHours: DurationHours;
  compact?: boolean;
}) {
  const estimatedCapacity = Math.max(1, sessionCount * durationHours);
  if (topicCount <= estimatedCapacity) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${compact ? "mt-3" : "-mt-1"} flex min-w-0 items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900`}
    >
      <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={18} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-black">Target materi mungkin terlalu banyak</p>
        <p className="mt-1 break-words text-xs font-medium leading-5 text-amber-800">
          Kamu memilih {topicCount} subbab untuk {sessionCount} sesi ({estimatedCapacity} jam belajar).
          Perkiraan awal sistem memakai sekitar satu subbab per jam. Tambah sesi atau kurangi subbab agar target lebih realistis.
        </p>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-sm font-black text-slate-900">{value}</p></div>;
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
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition">
        <RefreshCw size={15} /> Coba lagi
      </button>
    </div>
  );
}
