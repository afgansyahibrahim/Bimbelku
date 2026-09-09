import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, History, Layers3, Loader2, Power, PowerOff, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import http, { getApiError } from "@/lib/http";
import { notify } from "@/lib/notify";

type RecurringTemplate = {
  id: number;
  template_code: string;
  recurrence_enabled: boolean;
  active: boolean;
  subject_name: string;
  education_level: string;
  grade: string;
  chapter: string;
  session_count: number;
  recurrence_days: number[];
  start_time: string;
  price_per_student: number;
  minimum_participants: number;
  maximum_participants: number;
  recurrence_anchor_at?: string | null;
  next_publish_at?: string | null;
  last_published_at?: string | null;
  last_skipped_at?: string | null;
  last_generation_failed_at?: string | null;
  last_generation_error?: string | null;
  package_count: number;
  active_package_count: number;
  history_package_count: number;
};

const DAY_NAMES: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

const dateTime = (value?: string | null) => value
  ? new Date(value).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
const timeLabel = (value: string) => String(value || "").slice(0, 5).replace(":", ".");

export default function CheapClassRecurring() {
  const confirm = useConfirmDialog();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get("/admin/cheap-class-templates/recurring");
      setTemplates(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      notify.error(getApiError(error, "Pengaturan paket berulang belum dapat dimuat."));
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => ({
    active: templates.filter((item) => item.active).length,
    inactive: templates.filter((item) => !item.active).length,
    published: templates.reduce((total, item) => total + item.package_count, 0),
  }), [templates]);

  const toggleRecurrence = async (item: RecurringTemplate) => {
    const nextActive = !item.active;
    const approved = await confirm({
      title: nextActive ? "Aktifkan pengulangan mingguan?" : "Nonaktifkan pengulangan mingguan?",
      description: nextActive
        ? `${item.subject_name} akan dilanjutkan pada jadwal mingguan berikutnya. Minggu yang terlewat tidak dibuat ulang.`
        : `${item.subject_name} tidak akan menerbitkan paket baru. Paket yang sudah terbit tetap berjalan dan tidak ikut dibatalkan.`,
      confirmText: nextActive ? "Aktifkan pengulangan" : "Nonaktifkan pengulangan",
      tone: nextActive ? "primary" : "danger",
    });
    if (!approved) return;

    setWorkingId(item.id);
    try {
      const response = await http.patch(`/admin/cheap-class-templates/${item.id}/recurrence`, { active: nextActive });
      notify.success(response.data.message);
      await load();
    } catch (error) {
      notify.error(getApiError(error, "Status pengulangan belum dapat diubah."));
    } finally {
      setWorkingId(null);
    }
  };

  return <AdminLayout title="Paket Berulang">
    <div className="w-full space-y-6 pb-12">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-800 via-indigo-800 to-slate-950 px-6 py-7 text-white shadow-xl sm:px-8">
        <Link to="/admin/kelas-murah" className="inline-flex items-center gap-2 text-sm font-black text-violet-100 hover:text-white"><ArrowLeft size={16} /> Kembali ke pembuatan paket</Link>
        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-violet-200">Template mingguan</p><h1 className="mt-2 text-3xl font-black">Paket Berulang</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-violet-100">Satu template menerbitkan paket baru setiap minggu. Setiap paket mempunyai peserta, pembayaran, tutor, dan Zoom yang terpisah.</p></div>
          <div className="flex flex-wrap gap-2"><Link to="/admin/kelas-murah/jadwal" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-black text-white hover:bg-white/20"><History size={17} /> Jadwal & riwayat</Link><Button type="button" variant="outline" onClick={() => void load()} disabled={loading} className="h-11 rounded-xl border-white/20 bg-white text-indigo-900 hover:bg-violet-50"><RefreshCw size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} />Muat ulang</Button></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Summary value={summary.active} label="Pengulangan aktif" tone="emerald" />
        <Summary value={summary.inactive} label="Pengulangan nonaktif" tone="slate" />
        <Summary value={summary.published} label="Paket sudah diterbitkan" tone="violet" />
      </section>

      {loading ? <div className="grid min-h-72 place-items-center rounded-[2rem] border border-slate-100 bg-white"><Loader2 className="animate-spin text-violet-600" size={30} /></div>
        : templates.length === 0 ? <section className="grid min-h-72 place-items-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-white p-8 text-center"><div><Layers3 className="mx-auto text-slate-300" size={42} /><h2 className="mt-4 text-lg font-black text-slate-800">Belum ada paket berulang</h2><p className="mt-2 text-sm text-slate-500">Aktifkan opsi pengulangan mingguan saat membuat paket baru.</p><Link to="/admin/kelas-murah" className="mt-5 inline-flex h-11 items-center rounded-xl bg-violet-600 px-5 text-sm font-black text-white hover:bg-violet-700">Buat paket berulang</Link></div></section>
        : <section className="grid gap-4 xl:grid-cols-2">{templates.map((item) => <article key={item.id} className={`overflow-hidden rounded-[2rem] border bg-white shadow-sm ${item.active ? "border-violet-200" : "border-slate-200"}`}>
          <div className={`border-b p-5 sm:p-6 ${item.active ? "border-violet-100 bg-gradient-to-br from-violet-50 to-white" : "border-slate-100 bg-slate-50"}`}>
            <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${item.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{item.active ? "Aktif" : "Nonaktif"}</span><span className="text-[11px] font-bold text-slate-400">{item.template_code}</span></div><h2 className="mt-3 text-xl font-black text-slate-950">{item.subject_name}</h2><p className="mt-1 text-sm font-bold text-slate-500">{item.education_level} · {item.grade}</p></div>{item.active ? <CheckCircle2 className="shrink-0 text-emerald-500" size={24} /> : <PowerOff className="shrink-0 text-slate-400" size={24} />}</div>
            <p className="mt-4 rounded-xl bg-white p-3 text-xs font-semibold leading-5 text-slate-600">{item.chapter}</p>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2"><Info label="Hari dan jam" value={`${item.recurrence_days.map((day) => DAY_NAMES[day] || day).join(", ")} · ${timeLabel(item.start_time)} WIB`} /><Info label="Isi paket" value={`${item.session_count} sesi · ${money(item.price_per_student)} sekali bayar`} /><Info label="Kuota" value={`${item.minimum_participants}–${item.maximum_participants} peserta`} /><Info label="Paket tersimpan" value={`${item.active_package_count} aktif · ${item.history_package_count} riwayat`} /></div>
            <div className={`rounded-xl p-4 text-xs font-bold leading-5 ${item.active ? "bg-violet-50 text-violet-800" : "bg-slate-100 text-slate-600"}`}><div className="flex gap-2"><CalendarClock className="mt-0.5 shrink-0" size={16} /><div>{item.active ? <>Paket berikutnya diterbitkan <b>{dateTime(item.next_publish_at)}</b>.</> : "Penerbitan paket baru dihentikan. Paket yang sudah ada tidak berubah."}{item.last_published_at && <p className="mt-1 font-semibold opacity-80">Terakhir diterbitkan: {dateTime(item.last_published_at)}</p>}</div></div></div>
            {item.last_generation_failed_at && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-700">Penerbitan terakhir gagal pada {dateTime(item.last_generation_failed_at)}. {item.last_generation_error || "Muat ulang setelah masalah diperbaiki."}</div>}
            <Button type="button" variant={item.active ? "outline" : "default"} disabled={workingId === item.id} onClick={() => void toggleRecurrence(item)} className={`h-11 w-full rounded-xl font-black ${item.active ? "border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800" : "bg-violet-600 text-white hover:bg-violet-700"}`}>{workingId === item.id ? <Loader2 className="mr-2 animate-spin" size={17} /> : item.active ? <PowerOff className="mr-2" size={17} /> : <Power className="mr-2" size={17} />}{item.active ? "Nonaktifkan pengulangan" : "Aktifkan kembali"}</Button>
          </div>
        </article>)}</section>}
    </div>
  </AdminLayout>;
}

function Summary({ value, label, tone }: { value: number; label: string; tone: "emerald" | "slate" | "violet" }) {
  const color = tone === "emerald" ? "bg-emerald-50 text-emerald-700" : tone === "violet" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-700";
  return <div className={`rounded-2xl p-5 ${color}`}><p className="text-3xl font-black">{value}</p><p className="mt-1 text-xs font-black uppercase tracking-wide opacity-80">{label}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xs font-bold leading-5 text-slate-700">{value}</p></div>;
}
