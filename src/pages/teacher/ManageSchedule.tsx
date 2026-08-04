import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  Clock3,
  Loader2,
  Plus,
  Power,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import TeacherLayout from "@/components/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import http, { getApiError } from "@/lib/http";

interface TimeRange {
  start_time: string;
  end_time: string;
}

interface ScheduleItem {
  day: string;
  is_active: boolean;
  ranges: TimeRange[];
}

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
const defaultSchedules: ScheduleItem[] = DAYS.map((day) => ({ day, is_active: false, ranges: [] }));

const rangeIsValid = (range: TimeRange) => /^(?:[01]\d|2[0-3]):00$/.test(range.start_time)
  && /^(?:[01]\d|2[0-3]):00$/.test(range.end_time)
  && range.end_time > range.start_time;

const rangesOverlap = (ranges: TimeRange[]) => [...ranges]
  .sort((a, b) => a.start_time.localeCompare(b.start_time))
  .some((range, index, sorted) => index > 0 && sorted[index - 1].end_time > range.start_time);

export default function ManageSchedule() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(defaultSchedules);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSchedule();
  }, []);

  const activeDays = useMemo(() => schedules.filter((item) => item.is_active).length, [schedules]);
  const totalAvailableHours = useMemo(() => schedules.reduce((total, item) => {
    if (!item.is_active) return total;
    return total + item.ranges.reduce((subtotal, range) => {
      if (!rangeIsValid(range)) return subtotal;
      return subtotal + Number(range.end_time.slice(0, 2)) - Number(range.start_time.slice(0, 2));
    }, 0);
  }, 0), [schedules]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const response = await http.get<ScheduleItem[]>("/teacher/schedule");
      setSchedules(response.data.map((item) => ({ ...item, ranges: item.ranges || [] })));
    } catch (error) {
      toast.error(getApiError(error, "Jadwal gagal dimuat."));
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, changes: Partial<ScheduleItem>) => {
    setSchedules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  };

  const toggleDay = (index: number, checked: boolean) => {
    setSchedules((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      return {
        ...item,
        is_active: checked,
        ranges: checked && item.ranges.length === 0 ? [{ start_time: "08:00", end_time: "12:00" }] : item.ranges,
      };
    }));
  };

  const updateRange = (dayIndex: number, rangeIndex: number, changes: Partial<TimeRange>) => {
    setSchedules((current) => current.map((item, itemIndex) => {
      if (itemIndex !== dayIndex) return item;
      return {
        ...item,
        ranges: item.ranges.map((range, index) => index === rangeIndex ? { ...range, ...changes } : range),
      };
    }));
  };

  const addRange = (dayIndex: number) => {
    setSchedules((current) => current.map((item, itemIndex) => {
      if (itemIndex !== dayIndex) return item;
      const sortedRanges = [...item.ranges].sort((a, b) => a.end_time.localeCompare(b.end_time));
      const last = sortedRanges[sortedRanges.length - 1];
      const startHour = Math.min(22, last ? Number(last.end_time.slice(0, 2)) + 1 : 8);
      const endHour = Math.min(23, startHour + 2);
      return {
        ...item,
        ranges: [...item.ranges, {
          start_time: `${String(startHour).padStart(2, "0")}:00`,
          end_time: `${String(endHour).padStart(2, "0")}:00`,
        }],
      };
    }));
  };

  const removeRange = (dayIndex: number, rangeIndex: number) => {
    setSchedules((current) => current.map((item, itemIndex) => itemIndex === dayIndex
      ? { ...item, ranges: item.ranges.filter((_, index) => index !== rangeIndex) }
      : item));
  };

  const saveSchedule = async () => {
    const invalid = schedules.find((item) => item.is_active && (
      item.ranges.length === 0
      || item.ranges.some((range) => !rangeIsValid(range))
      || rangesOverlap(item.ranges)
    ));
    if (invalid) {
      toast.error(`Periksa kembali seluruh rentang waktu ${invalid.day}.`);
      return;
    }

    setSaving(true);
    try {
      const response = await http.post("/teacher/schedule", {
        schedules: schedules.map((item) => ({
          ...item,
          ranges: [...item.ranges].sort((a, b) => a.start_time.localeCompare(b.start_time)),
        })),
      });
      toast.success(response.data.message);
      await fetchSchedule();
    } catch (error) {
      toast.error(getApiError(error, "Jadwal gagal disimpan."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeacherLayout title="Jadwal Mengajar">
      <div className="mx-auto max-w-7xl space-y-7 pb-12">
        <section className="relative overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-white shadow-xl sm:rounded-[2rem] sm:px-7 sm:py-8">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-100">
                <Sparkles size={14} /> Beberapa rentang per hari
              </div>
              <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Atur seluruh jam kosong tutor</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/80">
                Setiap waktu memakai jam penuh. Rentang dapat ditambah tanpa batas lima jam per hari.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat value={String(activeDays)} label="Hari aktif" />
              <Stat value={`${totalAvailableHours} jam`} label="Total mingguan" />
            </div>
          </div>
        </section>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm md:p-7">
          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>
          ) : (
            <div className="space-y-4">
              {schedules.map((item, dayIndex) => {
                const overlap = rangesOverlap(item.ranges);
                return (
                  <div key={item.day} className={`rounded-2xl border p-5 transition ${item.is_active ? "border-indigo-100 bg-indigo-50/35 shadow-sm" : "border-slate-100 bg-slate-50/70"}`}>
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr] lg:items-start">
                      <div className="flex items-center justify-between gap-4 lg:border-r lg:border-slate-200 lg:pr-6">
                        <div>
                          <p className={`text-xl font-black ${item.is_active ? "text-slate-900" : "text-slate-400"}`}>{item.day}</p>
                          <p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${item.is_active ? "text-indigo-600" : "text-slate-400"}`}>{item.is_active ? `${item.ranges.length} rentang` : "Libur"}</p>
                        </div>
                        <Switch checked={item.is_active} onCheckedChange={(checked) => toggleDay(dayIndex, checked)} />
                      </div>

                      {item.is_active ? (
                        <div className="space-y-3">
                          {item.ranges.map((range, rangeIndex) => (
                            <div key={`${item.day}-${rangeIndex}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
                              <TimeSelect label="Mulai" value={range.start_time} onChange={(value) => updateRange(dayIndex, rangeIndex, { start_time: value })} />
                              <div className="hidden h-12 items-center justify-center px-1 text-slate-300 sm:flex"><Clock3 size={19} /></div>
                              <TimeSelect label="Selesai" value={range.end_time} onChange={(value) => updateRange(dayIndex, rangeIndex, { end_time: value })} />
                              <button type="button" aria-label={`Hapus rentang ${item.day}`} onClick={() => removeRange(dayIndex, rangeIndex)} className="grid h-12 w-full place-items-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 sm:w-12">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          ))}
                          {overlap && <p className="flex items-center gap-2 text-xs font-bold text-rose-600"><AlertCircle size={15} />Rentang pada hari ini bertabrakan.</p>}
                          <Button type="button" variant="outline" onClick={() => addRange(dayIndex)} className="h-11 rounded-xl border-dashed border-indigo-200 text-indigo-700">
                            <Plus size={17} className="mr-2" /> Tambah rentang
                          </Button>
                        </div>
                      ) : (
                        <div className="flex min-h-20 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 text-sm text-slate-400">
                          <Power size={16} className="mr-2" /> Aktifkan hari untuk mengatur jam kosong.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-amber-100 bg-amber-50 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3 text-amber-900">
                  <AlertCircle size={20} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Aturan rentang</p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">Rentang boleh bersentuhan, seperti 08.00–12.00 dan 12.00–15.00. Rentang tidak boleh saling menimpa.</p>
                  </div>
                </div>
                <Button onClick={saveSchedule} disabled={saving} className="h-12 shrink-0 rounded-xl bg-indigo-600 px-7 font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700">
                  {saving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
                  Simpan jadwal
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}

function TimeSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="min-w-0">
      <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><CalendarClock size={14} /> {label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          aria-label={`Jam ${label.toLowerCase()}`}
          className="h-12 w-full min-w-0 rounded-xl border-slate-200 bg-white px-3 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:ring-offset-0"
        >
          <SelectValue placeholder="Pilih jam" />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="z-[300] max-h-[min(18rem,calc(100dvh-2rem))] rounded-2xl border-slate-200 bg-white shadow-2xl"
        >
          {HOUR_OPTIONS.map((time) => (
            <SelectItem key={time} value={time} className="min-h-10 rounded-xl py-2.5 text-sm font-bold">
              {time.replace(":", ".")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-28 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-center backdrop-blur">
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-indigo-100">{label}</p>
    </div>
  );
}
