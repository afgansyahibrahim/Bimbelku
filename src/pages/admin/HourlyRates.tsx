import { notify } from "@/lib/notify";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookOpen, Coins, Loader2, Plus, Save, Trash2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import SubjectCombobox, { SubjectOption } from "@/components/SubjectCombobox";
import { EDUCATION_LEVELS } from "@/lib/educationCatalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import http, { getApiError, getCached } from "@/lib/http";

interface Rate {
  id: number;
  subject_name: string;
  education_level?: string | null;
  class_type: "private" | "group";
  learning_mode: "online" | "offline";
  amount: number;
  is_active: boolean;
}

const formatCurrency = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(value);

export default function HourlyRates() {
  const confirm = useConfirmDialog();
  const [rates, setRates] = useState<Rate[]>([]);
  const [defaults, setDefaults] = useState({ private_online: 40000, private_offline: 40000, group_online: 40000, group_offline: 40000 });
  const [groupSettings, setGroupSettings] = useState({ minimum: 2, maximum: 5, wait_hours: 24 });
  const [form, setForm] = useState({ subject_name: "", education_level: "all", class_type: "private", learning_mode: "online", amount: "" });
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get("/admin/hourly-rates");
      setRates(response.data.rates || []);
      setDefaults(response.data.defaults || { private_online: 40000, private_offline: 40000, group_online: 40000, group_offline: 40000 });
      setGroupSettings(response.data.group_settings || { minimum: 2, maximum: 5, wait_hours: 24 });
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRates(); }, [loadRates]);
  useEffect(() => {
    void getCached<{ subject_options?: SubjectOption[] }>("/learning-catalog", {
      params: { compact: 1 },
      maxAgeMs: 5 * 60_000,
    })
      .then((response) => setSubjectOptions(response.data.subject_options || []))
      .catch(() => notify.error("Katalog mata pelajaran belum dapat dimuat."));
  }, []);

  const createSubject = async (name: string): Promise<SubjectOption | null> => {
    try {
      const educationLevels = form.education_level === "all"
        ? [...EDUCATION_LEVELS]
        : [form.education_level];
      const response = await http.post("/admin/subjects", {
        name,
        group_name: "Tambahan admin",
        education_levels: educationLevels,
      });
      const created = response.data.data as SubjectOption;
      setSubjectOptions((current) => [...current.filter((item) => item.id !== created.id), created]);
      notify.success(response.data.message);
      return created;
    } catch (error) {
      notify.error(getApiError(error, "Mata pelajaran gagal ditambahkan."));
      return null;
    }
  };

  const saveRate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await http.post("/admin/hourly-rates", {
        subject_name: form.subject_name,
        education_level: form.education_level === "all" ? null : form.education_level,
        class_type: form.class_type,
        learning_mode: form.learning_mode,
        amount: Number(form.amount),
      });
      notify.success(response.data.message);
      setForm({ subject_name: "", education_level: "all", class_type: "private", learning_mode: "online", amount: "" });
      await loadRates();
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const saveDefaults = async () => {
    try {
      const response = await http.post("/admin/hourly-rates/defaults", defaults);
      notify.success(response.data.message);
    } catch (error) {
      notify.error(getApiError(error));
    }
  };

  const saveGroupSettings = async () => {
    try {
      const response = await http.post("/admin/hourly-rates/group-settings", groupSettings);
      notify.success(response.data.message);
    } catch (error) {
      notify.error(getApiError(error));
    }
  };

  const deleteRate = async (id: number) => {
    const approved = await confirm({
      title: "Hapus tarif khusus?",
      description: "Permintaan baru akan kembali menggunakan tarif bawaan yang sesuai.",
      confirmText: "Hapus tarif",
      tone: "danger",
    });
    if (!approved) return;
    try {
      const response = await http.delete(`/admin/hourly-rates/${id}`);
      notify.success(response.data.message);
      await loadRates();
    } catch (error) {
      notify.error(getApiError(error));
    }
  };

  return (
    <AdminLayout title="Tarif Per Jam">
      <div className="max-w-7xl mx-auto space-y-7 pb-12">
        <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-7 py-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-100"><Coins size={14} /> Harga terpusat</div>
              <h1 className="mt-4 text-3xl font-black">Atur tarif satu jam bimbingan</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/80">Harga online dan offline dapat dibedakan admin, tetapi berlaku seragam bagi semua tutor pada mode yang sama.</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[.8fr_1.2fr] gap-7 items-start">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">Tarif bawaan</h2>
              <p className="mt-1 text-sm text-slate-500">Dipakai ketika tarif khusus belum dibuat.</p>
              <div className="mt-5 space-y-4">
                <MoneyInput label="Privat online / jam" value={defaults.private_online} onChange={(value) => setDefaults((current) => ({ ...current, private_online: value }))} />
                <MoneyInput label="Privat offline / jam" value={defaults.private_offline} onChange={(value) => setDefaults((current) => ({ ...current, private_offline: value }))} />
                <MoneyInput label="Kelompok online / murid / jam" value={defaults.group_online} onChange={(value) => setDefaults((current) => ({ ...current, group_online: value }))} />
                <MoneyInput label="Kelompok offline / murid / jam" value={defaults.group_offline} onChange={(value) => setDefaults((current) => ({ ...current, group_offline: value }))} />
                <Button onClick={saveDefaults} className="h-12 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold"><Save size={17} className="mr-2" /> Simpan tarif bawaan</Button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">Aturan kelas kelompok</h2>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <MoneyInput label="Minimal peserta" value={groupSettings.minimum} min={2} step={1} onChange={(value) => setGroupSettings((current) => ({ ...current, minimum: value }))} />
                <MoneyInput label="Maksimal peserta" value={groupSettings.maximum} min={2} step={1} onChange={(value) => setGroupSettings((current) => ({ ...current, maximum: value }))} />
                <div className="col-span-2"><MoneyInput label="Waktu tunggu kelompok (jam)" value={groupSettings.wait_hours} min={1} step={1} onChange={(value) => setGroupSettings((current) => ({ ...current, wait_hours: value }))} /></div>
              </div>
              <Button onClick={saveGroupSettings} variant="outline" className="mt-4 h-11 w-full rounded-xl font-bold"><Save size={16} className="mr-2" />Simpan aturan kelompok</Button>
            </section>

            <form onSubmit={saveRate} className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">Tambah tarif khusus</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <Label className="mb-2 block font-bold">Mata pelajaran</Label>
                  <SubjectCombobox
                    options={subjectOptions}
                    value={form.subject_name}
                    educationLevel={form.education_level === "all" ? undefined : form.education_level}
                    allowCreate
                    onCreate={createSubject}
                    onChange={(value) => setForm((current) => ({ ...current, subject_name: value }))}
                    placeholder="Cari atau tambahkan mapel"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">Ketik untuk memfilter. Jika belum ada, pilih tombol tambah yang muncul di daftar.</p>
                </div>
                <div><Label className="mb-2 block font-bold">Jenjang</Label><Select value={form.education_level} onValueChange={(value) => setForm((current) => ({ ...current, education_level: value }))}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua jenjang</SelectItem>{EDUCATION_LEVELS.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="mb-2 block font-bold">Jenis kelas</Label><Select value={form.class_type} onValueChange={(value) => setForm((current) => ({ ...current, class_type: value }))}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="private">Privat</SelectItem><SelectItem value="group">Kelompok</SelectItem></SelectContent></Select></div>
                <div><Label className="mb-2 block font-bold">Mode</Label><Select value={form.learning_mode} onValueChange={(value) => setForm((current) => ({ ...current, learning_mode: value }))}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem></SelectContent></Select></div>
                <div><Label className="mb-2 block font-bold">Nominal per jam</Label><Input type="number" min="1000" step="1000" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="h-12 rounded-xl" required /></div>
                <Button type="submit" disabled={saving} className="h-12 w-full rounded-xl bg-slate-950 hover:bg-indigo-700 font-bold">{saving ? <Loader2 size={17} className="mr-2 animate-spin" /> : <Plus size={17} className="mr-2" />} Simpan tarif</Button>
              </div>
            </form>
          </div>

          <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div><h2 className="text-xl font-black text-slate-900">Daftar tarif khusus</h2><p className="mt-1 text-sm text-slate-500">Tarif khusus mengalahkan tarif bawaan.</p></div>
              <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><BookOpen size={20} /></div>
            </div>

            {loading ? <div className="min-h-72 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div> : rates.length === 0 ? (
              <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">Belum ada tarif khusus.</div>
            ) : (
              <div className="mt-6 space-y-3">
                {rates.map((rate) => (
                  <div key={rate.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:bg-white hover:shadow-sm">
                    <div className="min-w-0"><p className="truncate font-black text-slate-900">{rate.subject_name}</p><p className="mt-1 text-xs text-slate-500">{rate.education_level || "Semua jenjang"} • {rate.class_type === "private" ? "Privat" : "Kelompok"} • {rate.learning_mode === "online" ? "Online" : "Offline"}</p></div>
                    <div className="flex items-center gap-3"><p className="whitespace-nowrap font-black text-indigo-700">{formatCurrency(Number(rate.amount))}</p><Button aria-label={`Hapus tarif ${rate.subject_name}`} variant="ghost" size="icon" onClick={() => deleteRate(rate.id)} className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={17} /></Button></div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function MoneyInput({ label, value, min = 1000, step = 1000, onChange }: { label: string; value: number; min?: number; step?: number; onChange: (value: number) => void }) {
  return <div><Label className="mb-2 block font-bold">{label}</Label><Input type="number" min={min} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-12 rounded-xl" /></div>;
}
