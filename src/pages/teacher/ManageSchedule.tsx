import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Power,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import TeacherLayout from "@/components/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import http, { getApiError } from "@/lib/http";

interface ScheduleItem {
  day: string;
  is_active: boolean;
  start_time: string;
  end_time: string;
}

const defaultSchedules: ScheduleItem[] = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((day) => ({
  day,
  is_active: false,
  start_time: "",
  end_time: "",
}));

export default function ManageSchedule() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(defaultSchedules);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSchedule();
  }, []);

  const activeDays = useMemo(() => schedules.filter((item) => item.is_active).length, [schedules]);
  const totalAvailableHours = useMemo(() => schedules.reduce((total, item) => {
    if (!item.is_active || !item.start_time || !item.end_time) return total;
    const [startHour, startMinute] = item.start_time.split(":").map(Number);
    const [endHour, endMinute] = item.end_time.split(":").map(Number);
    return total + Math.max(0, endHour + endMinute / 60 - startHour - startMinute / 60);
  }, 0), [schedules]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const response = await http.get<ScheduleItem[]>("/teacher/schedule");
      setSchedules(response.data);
    } catch (error) {
      toast.error(getApiError(error, "Jadwal gagal dimuat."));
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, changes: Partial<ScheduleItem>) => {
    setSchedules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  };

  const saveSchedule = async () => {
    const invalid = schedules.find((item) => item.is_active && (!item.start_time || !item.end_time || item.end_time <= item.start_time));
    if (invalid) {
      toast.error(`Periksa kembali rentang waktu ${invalid.day}.`);
      return;
    }

    setSaving(true);
    try {
      const response = await http.post("/teacher/schedule", { schedules });
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
      <div className="max-w-7xl mx-auto space-y-7 pb-12">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-7 py-8 text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-100">
                <Sparkles size={14} /> Rentang waktu fleksibel
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight">Atur jam kosong per hari</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/80">
                Pesanan hanya mengunci rentang yang dipilih murid. Sisa jam tetap dapat digunakan untuk kelas lain.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat value={String(activeDays)} label="Hari aktif" />
              <Stat value={`${totalAvailableHours.toFixed(totalAvailableHours % 1 ? 1 : 0)} jam`} label="Total mingguan" />
            </div>
          </div>
        </section>

        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 md:p-7 shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          {loading ? (
            <div className="min-h-[420px] flex items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>
          ) : (
            <div className="space-y-4">
              {schedules.map((item, index) => (
                <div key={item.day} className={`rounded-2xl border p-5 transition-all duration-300 ${item.is_active ? "border-indigo-100 bg-indigo-50/35 shadow-sm" : "border-slate-100 bg-slate-50/70"}`}>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
                    <div className="flex items-center justify-between gap-4 lg:border-r lg:border-slate-200 lg:pr-6">
                      <div>
                        <p className={`text-xl font-black ${item.is_active ? "text-slate-900" : "text-slate-400"}`}>{item.day}</p>
                        <p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${item.is_active ? "text-indigo-600" : "text-slate-400"}`}>{item.is_active ? "Tersedia" : "Libur"}</p>
                      </div>
                      <Switch checked={item.is_active} onCheckedChange={(checked) => updateItem(index, { is_active: checked })} />
                    </div>

                    {item.is_active ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end animate-in fade-in slide-in-from-right-2 duration-300">
                        <TimeInput label="Mulai tersedia" value={item.start_time} onChange={(value) => updateItem(index, { start_time: value })} />
                        <div className="hidden sm:flex h-12 items-center justify-center px-2 text-slate-300"><Clock3 size={20} /></div>
                        <TimeInput label="Selesai tersedia" value={item.end_time} onChange={(value) => updateItem(index, { end_time: value })} />
                      </div>
                    ) : (
                      <div className="flex min-h-20 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 text-sm text-slate-400">
                        <Power size={16} className="mr-2" /> Aktifkan hari untuk mengatur jam kosong.
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-amber-100 bg-amber-50 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3 text-amber-900">
                  <AlertCircle size={20} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Contoh penguncian jadwal</p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">Rentang 18.00–22.00 tetap menyisakan 20.00–22.00 setelah kelas 18.00–20.00 dipesan.</p>
                  </div>
                </div>
                <Button onClick={saveSchedule} disabled={saving} className="h-12 shrink-0 rounded-xl bg-indigo-600 px-7 font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">
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

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><CalendarClock size={14} /> {label}</label>
      <Input type="time" value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-xl bg-white font-bold text-slate-800" />
    </div>
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
