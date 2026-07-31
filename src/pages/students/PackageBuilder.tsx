import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarPlus,
  Check,
  Clock3,
  Loader2,
  Plus,
  Radar,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import StudentLayout from "@/components/StudentLayout";
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
type SubjectOption = {
  id: number;
  name: string;
  education_levels?: string[] | null;
  grades?: string[] | null;
};
type TimeSlot = { id: number; start_time: string; label?: string | null };
type Voucher = {
  id: number;
  status: string;
  promotion: { id: number; title: string; discount_type: "percentage" | "fixed"; discount_value: number; ends_at?: string | null };
};
type DraftSubject = {
  key: string;
  curriculum_subject_id: number | "";
  session_count: number;
  schedules: string[];
  chapter: string;
  learning_goal: string;
  preferred_teacher_id?: number;
};
type Quote = {
  lines: Array<{ curriculum_subject_id: number; subject_name: string; session_count: number; unit_price: number; subtotal_amount: number }>;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  promotion?: { title: string } | null;
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

const nextSlots = (count: number, time = "18:00") => {
  const result: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 4);
  const [hour, minute] = time.split(":").map(Number);
  cursor.setHours(hour || 0, minute || 0, 0, 0);
  for (let index = 0; index < count; index += 1) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() + index * 2);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    result.push(local.toISOString().slice(0, 16));
  }
  return result;
};

const createSubject = (sessionCount = 1, time = "18:00"): DraftSubject => ({
  key: `${Date.now()}-${Math.random()}`,
  curriculum_subject_id: "",
  session_count: sessionCount,
  schedules: nextSlots(sessionCount, time),
  chapter: "",
  learning_goal: "",
});

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
  const [subjects, setSubjects] = useState<DraftSubject[]>([createSubject()]);
  const [promoCode, setPromoCode] = useState("");
  const [voucherId, setVoucherId] = useState<number | "">("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const plan = plans.find((item) => item.id === planId);
  const defaultSlotTime = timeSlots.find((slot) => slot.start_time.slice(0, 5) === "18:00")?.start_time.slice(0, 5)
    || timeSlots[0]?.start_time.slice(0, 5)
    || "18:00";
  const selectedSessions = subjects.reduce((sum, item) => sum + item.session_count, 0);
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
    && subjects.every((item) => item.curriculum_subject_id && item.schedules.length === item.session_count && item.schedules.every(Boolean)),
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [plansResponse, catalogResponse, voucherResponse, slotsResponse] = await Promise.all([
          getCached<Plan[]>("/package-plans", { maxAgeMs: 60_000 }),
          getCached<{ subject_options: SubjectOption[] }>("/learning-catalog", { params: { compact: 1 }, maxAgeMs: 60_000 }),
          getCached<{ data: Voucher[] }>("/student/vouchers", { maxAgeMs: 20_000 }),
          getCached<TimeSlot[]>("/learning-time-slots", { maxAgeMs: 60_000 }),
        ]);
        setPlans(plansResponse.data);
        setCatalog(catalogResponse.data.subject_options || []);
        setVouchers(voucherResponse.data.data.filter((item) => item.status === "available"));
        setTimeSlots(slotsResponse.data);
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
                preferred_teacher_id: item.teacher?.id,
                chapter: item.chapter || "",
                learning_goal: item.learning_goal || "",
              };
            }));
          }
        }
      } catch (error) {
        toast.error(getApiError(error, "Data paket gagal dimuat."));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [renewalId, renewalSubjectId]);

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
  }, [draftValid, level, mode, planId, promoCode, subjects, voucherId]);

  const choosePlan = (selected: Plan) => {
    setPlanId(selected.id);
    setSubjects([createSubject(selected.session_count, defaultSlotTime)]);
    setQuote(null);
  };
  const updateSubject = (key: string, patch: Partial<DraftSubject>) => {
    setSubjects((current) => current.map((item) => {
      if (item.key !== key) return item;
      const next = { ...item, ...patch };
      if (patch.session_count !== undefined) {
        next.schedules = [
          ...item.schedules.slice(0, patch.session_count),
          ...nextSlots(Math.max(0, patch.session_count - item.schedules.length), defaultSlotTime),
        ];
      }
      return next;
    }));
  };
  const distribute = () => {
    if (!plan) return;
    const base = Math.floor(plan.session_count / subjects.length);
    const remainder = plan.session_count % subjects.length;
    setSubjects((current) => current.map((item, index) => {
      const count = base + (index < remainder ? 1 : 0);
      return { ...item, session_count: count, schedules: nextSlots(count, defaultSlotTime) };
    }));
  };
  const addSubject = () => {
    if (!plan || subjects.length >= plan.maximum_subjects) return;
    setSubjects((current) => [...current, createSubject(1, defaultSlotTime)]);
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
      navigate("/student/packages");
    } catch (error) {
      toast.error(getApiError(error, "Paket gagal dibuat."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <StudentLayout title="Pilih Paket"><div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-indigo-600" size={36} /></div></StudentLayout>;
  }

  return (
    <StudentLayout title={renewalId ? "Perpanjang Paket" : "Pilih Paket"}>
      <div className="mx-auto max-w-6xl space-y-6 pb-20">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft size={17} /> Kembali
        </button>

        <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-6 text-white sm:p-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">{renewalId ? "Tutor lama diprioritaskan" : "Langkah 1"}</p>
          <h1 className="mt-3 text-3xl font-black">Susun paket belajarmu</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/75">Satu sesi berlangsung 60 menit. Tagihan baru dibuka setelah semua tutor menerima jadwal.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-black text-slate-900">1. Pilih jumlah sesi</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => choosePlan(item)}
                className={`rounded-3xl border p-5 text-left transition ${planId === item.id ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 bg-white hover:border-indigo-300"}`}
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

        <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-black text-slate-900">2. Jenjang dan metode</h2>
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
              <h2 className="text-lg font-black text-slate-900">3. Bagi sesi dan pilih jadwal</h2>
              <p className={`mt-1 text-sm font-bold ${selectedSessions === plan?.session_count ? "text-emerald-600" : "text-orange-600"}`}>
                {selectedSessions} dari {plan?.session_count || 0} sesi sudah dialokasikan
              </p>
            </div>
            <div className="flex gap-2">
              {subjects.length > 1 && <button type="button" onClick={distribute} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Bagi merata</button>}
              <button type="button" onClick={addSubject} disabled={!plan || subjects.length >= plan.maximum_subjects} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">
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
                    <button type="button" onClick={() => setSubjects((current) => current.filter((subject) => subject.key !== item.key))} className="rounded-xl p-2 text-rose-500 hover:bg-rose-50">
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_150px]">
                  <Field label="Mata pelajaran">
                    <select value={item.curriculum_subject_id} onChange={(event) => updateSubject(item.key, { curriculum_subject_id: Number(event.target.value) || "" })} className="form-field">
                      <option value="">Pilih mapel</option>
                      {availableSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Jumlah sesi">
                    <select value={item.session_count} onChange={(event) => updateSubject(item.key, { session_count: Number(event.target.value) })} className="form-field">
                      {Array.from({ length: plan?.session_count || 1 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} sesi</option>)}
                    </select>
                  </Field>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Bab atau topik">
                    <input value={item.chapter} onChange={(event) => updateSubject(item.key, { chapter: event.target.value })} className="form-field" placeholder="Contoh: Pecahan" />
                  </Field>
                  <Field label="Target belajar">
                    <input value={item.learning_goal} onChange={(event) => updateSubject(item.key, { learning_goal: event.target.value })} className="form-field" placeholder="Contoh: Mampu mengerjakan soal cerita" />
                  </Field>
                </div>
                <div className="mt-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700"><CalendarPlus size={17} /> Slot sesi 60 menit</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {item.schedules.map((schedule, index) => (
                      <label key={`${item.key}-${index}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-600">{index + 1}</span>
                        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_130px]">
                          <input
                            type="date"
                            value={schedule.slice(0, 10)}
                            onChange={(event) => {
                              const schedules = [...item.schedules];
                              schedules[index] = `${event.target.value}T${schedule.slice(11, 16) || defaultSlotTime}`;
                              updateSubject(item.key, { schedules });
                            }}
                            className="min-w-0 bg-transparent text-sm font-bold text-slate-700 outline-none"
                          />
                          <select
                            value={schedule.slice(11, 16) || defaultSlotTime}
                            onChange={(event) => {
                              const schedules = [...item.schedules];
                              schedules[index] = `${schedule.slice(0, 10)}T${event.target.value}`;
                              updateSubject(item.key, { schedules });
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-black text-slate-700"
                          >
                            {timeSlots.map((slot) => <option key={slot.id} value={slot.start_time.slice(0, 5)}>{slot.label || slot.start_time.slice(0, 5)}</option>)}
                          </select>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-black text-slate-900">4. Voucher atau kode promo</h2>
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
                      <span>{line.subject_name} · {line.session_count} sesi</span>
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
            <button type="button" disabled={!draftValid || !quote || submitting} onClick={submit} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white font-black text-slate-950 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40">
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Radar size={18} />}
              {submitting ? "Menjalankan radar…" : "Cari tutor paket"}
            </button>
          </aside>
        </section>
      </div>
    </StudentLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}
