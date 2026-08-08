import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarClock, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import StudentLayout from "@/components/StudentLayout";
import http, { getApiError, getCached } from "@/lib/http";
import { notify } from "@/lib/notify";

type TimeSlot = { id: number; start_time: string; label?: string | null };
type Session = { id: number; start_at?: string | null };
type MatchingState = { can_change_schedule?: boolean; message?: string | null; reason_code?: string | null };
type PackageSubject = {
  id: number;
  name: string;
  allocated_sessions: number;
  status: string;
  sessions?: Session[] | null;
  matching?: MatchingState | null;
};
type PackageData = {
  id: number;
  package_code: string;
  learning_mode: "online" | "offline";
  duration_hours: 1 | 2;
  subjects?: PackageSubject[] | null;
};
type Draft = {
  id: number;
  name: string;
  count: number;
  startDate: string;
  time: string;
  weekdays: number[];
  schedules: string[];
};

const WEEKDAYS = [
  { value: 1, short: "Sen" }, { value: 2, short: "Sel" }, { value: 3, short: "Rab" },
  { value: 4, short: "Kam" }, { value: 5, short: "Jum" }, { value: 6, short: "Sab" }, { value: 7, short: "Min" },
];
const isoWeekday = (date: Date) => ((date.getDay() + 6) % 7) + 1;
const dateInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const wibDateTime = (value: string) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
};
const earliest = (time: string) => {
  const threshold = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const hour = Number(time.slice(0, 2)) || 0;
  const candidate = new Date(threshold);
  candidate.setHours(hour, 0, 0, 0);
  if (candidate < threshold) candidate.setDate(candidate.getDate() + 1);
  return dateInput(candidate);
};
const buildSchedules = (count: number, startDate: string, time: string, weekdays: number[]) => {
  const result: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const hour = Number(time.slice(0, 2)) || 0;
  cursor.setHours(hour, 0, 0, 0);
  const days = new Set(weekdays.length ? weekdays : [isoWeekday(cursor)]);
  let guard = 0;
  while (result.length < count && guard < 730) {
    if (days.has(isoWeekday(cursor))) result.push(`${dateInput(cursor)}T${time}`);
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return result;
};

export default function PackageReschedule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<PackageData | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [packageResponse, slotResponse] = await Promise.all([
        http.get<PackageData>(`/student/packages/${id}`),
        getCached<TimeSlot[]>("/learning-time-slots", { maxAgeMs: 5 * 60_000 }),
      ]);
      const data = packageResponse.data;
      const fullHourSlots = slotResponse.data.filter((slot) => slot.start_time.slice(3, 5) === "00");
      const editable = (data.subjects || []).filter((subject) => subject.matching?.can_change_schedule);
      if (!editable.length) throw new Error("Tidak ada jadwal yang dapat diubah pada paket ini.");
      setPkg(data); setSlots(fullHourSlots);
      setDrafts(editable.map((subject) => {
        const old = (subject.sessions || []).map((session) => session.start_at).filter((value): value is string => Boolean(value));
        const fallbackTime = fullHourSlots.find((slot) => slot.start_time.slice(0, 5) === "18:00")?.start_time.slice(0, 5) || fullHourSlots[0]?.start_time.slice(0, 5) || "18:00";
        const time = old[0] ? wibDateTime(old[0]).time : fallbackTime;
        const startDate = earliest(time);
        const weekdays = old.length ? [...new Set(old.map((value) => isoWeekday(new Date(`${wibDateTime(value).date}T12:00:00`))))].slice(0, 4) : [1, 3, 5];
        return { id: subject.id, name: subject.name, count: subject.allocated_sessions, startDate, time, weekdays, schedules: buildSchedules(subject.allocated_sessions, startDate, time, weekdays) };
      }));
    } catch (err) {
      setError(getApiError(err, err instanceof Error ? err.message : "Jadwal paket gagal dimuat."));
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [id]);

  const duration = Number(pkg?.duration_hours || 1);
  const compatibleSlots = useMemo(() => slots.filter((slot) => Number(slot.start_time.slice(0, 2)) + duration <= 23), [slots, duration]);
  const update = (subjectId: number, patch: Partial<Draft>) => setDrafts((current) => current.map((draft) => {
    if (draft.id !== subjectId) return draft;
    const next = { ...draft, ...patch };
    if (patch.startDate !== undefined || patch.time !== undefined || patch.weekdays !== undefined) {
      next.schedules = buildSchedules(next.count, next.startDate, next.time, next.weekdays);
    }
    return next;
  }));

  const submit = async () => {
    setSaving(true);
    try {
      const response = await http.post(`/student/packages/${id}/reschedule`, {
        subjects: drafts.map((draft) => ({ package_subject_id: draft.id, schedules: draft.schedules })),
      });
      notify.success(response.data.message);
      navigate("/student/packages", { replace: true });
    } catch (err) { notify.error(getApiError(err, "Jadwal gagal diperbarui.")); }
    finally { setSaving(false); }
  };

  return <StudentLayout title="Ubah Jadwal Paket">
    <div className="space-y-5 pb-24">
      <Link to="/student/packages" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-black text-indigo-700"><ArrowLeft size={17}/>Kembali ke Kelas Saya</Link>
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 p-5 text-white sm:p-8">
        <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-200">Pencarian tutor</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">Ubah jadwal agar kandidat tutor bertambah</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/80">Pembayaran tidak diulang. Hanya jadwal mapel yang belum mendapat tutor yang diubah, lalu pencarian dimulai lagi dari awal.</p>
      </section>

      {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-indigo-600" size={34}/></div> : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center"><AlertCircle className="mx-auto text-rose-500"/><p className="mt-3 font-bold text-rose-800">{error}</p><button onClick={() => void load()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-black text-rose-700"><RefreshCw size={16}/>Coba lagi</button></div>
      ) : <>
        <div className="space-y-4">
          {drafts.map((draft) => <section key={draft.id} className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">{draft.name}</h2><p className="mt-1 text-xs font-semibold text-slate-500">{draft.count} sesi · {duration} jam/pertemuan</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">Cari ulang setelah disimpan</span></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Mulai belajar</span><input type="date" min={earliest(draft.time)} value={draft.startDate} onChange={(e) => update(draft.id,{startDate:e.target.value})} className="form-field"/></label>
              <label><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Jam belajar</span><select value={draft.time} onChange={(e)=>update(draft.id,{time:e.target.value})} className="form-field">{compatibleSlots.map((slot)=><option key={slot.id} value={slot.start_time.slice(0,5)}>{slot.label || `${slot.start_time.slice(0,5).replace(":", ".")} WIB`}</option>)}</select></label>
            </div>
            <div className="mt-4"><p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Hari belajar</p><div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{WEEKDAYS.map((day)=>{const active=draft.weekdays.includes(day.value); const disabled=!active&&draft.weekdays.length>=4; return <button key={day.value} type="button" disabled={disabled} onClick={()=>{const days=active?draft.weekdays.filter(v=>v!==day.value):[...draft.weekdays,day.value].sort((a,b)=>a-b); if(days.length) update(draft.id,{weekdays:days});}} className={`min-h-11 rounded-xl border text-xs font-black ${active?"border-indigo-600 bg-indigo-600 text-white":"border-slate-200 bg-white text-slate-600 disabled:opacity-30"}`}>{day.short}</button>})}</div></div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-sm font-black text-slate-800"><CalendarClock size={17}/>Tanggal pertemuan</p><ol className="mt-3 grid gap-2 sm:grid-cols-2">{draft.schedules.map((schedule,index)=><li key={`${draft.id}-${index}`} className="rounded-xl bg-white p-3 text-xs font-bold text-slate-600"><span>{index+1}. {new Date(schedule).toLocaleDateString("id-ID",{weekday:"short",day:"numeric",month:"short"})} · {draft.time.replace(":", ".")} WIB</span><input type="date" min={earliest(draft.time)} value={schedule.slice(0,10)} onChange={(e)=>setDrafts(current=>current.map(item=>{if(item.id!==draft.id)return item; const schedules=[...item.schedules]; schedules[index]=`${e.target.value}T${item.time}`; schedules.sort((a,b)=>new Date(a).getTime()-new Date(b).getTime()); return {...item,schedules};}))} className="mt-2 min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-2"/></li>)}</ol></div>
          </section>)}
        </div>
        <div className="sticky bottom-20 z-20 rounded-2xl border border-indigo-100 bg-white/95 p-3 shadow-xl backdrop-blur sm:bottom-4"><button onClick={submit} disabled={saving||!drafts.length} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white disabled:opacity-50">{saving?<Loader2 className="animate-spin" size={18}/>:<CheckCircle2 size={18}/>} {saving?"Menyimpan & mencari tutor…":"Simpan Jadwal & Cari Tutor Lagi"}</button></div>
      </>}
    </div>
  </StudentLayout>;
}
