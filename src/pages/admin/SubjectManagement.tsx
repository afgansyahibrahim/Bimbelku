import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Loader2, Pencil, Plus, Power, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import http, { getApiError } from "@/lib/http";
import {
  EDUCATION_LEVELS,
  GRADES_BY_EDUCATION_LEVEL,
} from "@/lib/educationCatalog";

interface Subject {
  id: number;
  name: string;
  group_name: string;
  education_levels: string[];
  grades: string[];
  is_elective: boolean;
  is_active: boolean;
  curriculum_name?: string;
  edition?: string | null;
  source_url?: string | null;
  chapters_count?: number;
}

const levels = [...EDUCATION_LEVELS];
const gradesByLevel = GRADES_BY_EDUCATION_LEVEL;
const emptyForm = {
  name: "",
  group_name: "Tambahan admin",
  education_levels: ["SD"] as string[],
  is_elective: false,
  is_active: true,
};

export default function SubjectManagement() {
  const confirm = useConfirmDialog();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Subject | null | undefined>(undefined);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await http.get<Subject[]>("/admin/subjects?all=1");
      setSubjects(response.data || []);
    } catch (error) {
      toast.error(getApiError(error, "Daftar mata pelajaran gagal dimuat."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => subjects.filter((subject) => {
    if (!showInactive && !subject.is_active) return false;
    const haystack = `${subject.name} ${subject.group_name} ${subject.education_levels.join(" ")}`.toLocaleLowerCase("id-ID");
    return haystack.includes(search.toLocaleLowerCase("id-ID"));
  }), [search, showInactive, subjects]);

  const openForm = (subject?: Subject) => {
    setEditing(subject || null);
    setForm(subject ? {
      name: subject.name,
      group_name: subject.group_name || "Umum",
      education_levels: subject.education_levels,
      is_elective: subject.is_elective,
      is_active: subject.is_active,
    } : emptyForm);
  };

  const toggleLevel = (level: string) => {
    setForm((current) => {
      const selected = current.education_levels.includes(level)
        ? current.education_levels.filter((item) => item !== level)
        : [...current.education_levels, level];
      return { ...current, education_levels: selected };
    });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.education_levels.length) {
      toast.error("Pilih minimal satu jenjang.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        grades: form.education_levels.flatMap((level) => gradesByLevel[level]),
        curriculum_name: editing?.curriculum_name || "Kurikulum Merdeka",
        edition: editing?.edition || "Tahap 5",
        source_url: editing?.source_url || "https://buku.kemendikdasmen.go.id/",
      };
      const response = editing
        ? await http.put(`/admin/subjects/${editing.id}`, payload)
        : await http.post("/admin/subjects", payload);
      toast.success(response.data.message);
      setEditing(undefined);
      await load();
    } catch (error) {
      toast.error(getApiError(error, "Mata pelajaran gagal disimpan."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (subject: Subject) => {
    const approved = await confirm({
      title: subject.is_active ? "Hapus atau nonaktifkan mapel?" : "Hapus mapel?",
      description: subject.chapters_count
        ? `${subject.name} sudah mempunyai ${subject.chapters_count} bab. Data akan dinonaktifkan agar riwayat tetap aman.`
        : `${subject.name} akan dihapus jika belum pernah digunakan.`,
      confirmText: subject.chapters_count ? "Nonaktifkan" : "Lanjutkan",
      tone: "danger",
    });
    if (!approved) return;
    try {
      const response = await http.delete(`/admin/subjects/${subject.id}`);
      toast.success(response.data.message);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    }
  };

  const toggleActive = async (subject: Subject) => {
    try {
      const response = await http.put(`/admin/subjects/${subject.id}`, {
        name: subject.name,
        group_name: subject.group_name || "Umum",
        education_levels: subject.education_levels,
        grades: subject.grades,
        is_elective: subject.is_elective,
        is_active: !subject.is_active,
        curriculum_name: subject.curriculum_name || "Kurikulum Merdeka",
        edition: subject.edition,
        source_url: subject.source_url,
      });
      toast.success(response.data.message);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    }
  };

  return (
    <AdminLayout title="Kelola Mata Pelajaran">
      <div className="space-y-6 pb-12">
        <section className="flex flex-col justify-between gap-5 rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white sm:p-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Katalog pusat</p>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl">Satu daftar mapel untuk seluruh alur</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/75">Tarif, materi, profil tutor, dan pemesanan menggunakan nama yang sama. Mapel yang sudah dipakai hanya dapat dinonaktifkan.</p>
          </div>
          <Button onClick={() => openForm()} className="rounded-xl bg-orange-500 font-bold hover:bg-orange-600"><Plus size={16} className="mr-2" />Tambah mapel</Button>
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="relative"><Search className="absolute left-3 top-3.5 text-slate-400" size={17} /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 rounded-xl pl-10" placeholder="Cari nama, kelompok, atau jenjang" /></div>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600"><span>Tampilkan nonaktif</span><Switch checked={showInactive} onCheckedChange={setShowInactive} /></label>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white">
          {loading ? (
            <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-indigo-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center"><BookOpen className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-black text-slate-700">Mapel tidak ditemukan</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((subject) => (
                <div key={subject.id} className="flex flex-col gap-4 p-4 hover:bg-slate-50 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${subject.is_active ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"}`}><BookOpen size={21} /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-900">{subject.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${subject.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{subject.is_active ? "Aktif" : "Nonaktif"}</span>{subject.is_elective && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">Pilihan</span>}</div>
                      <p className="mt-1 text-sm text-slate-500">{subject.group_name || "Umum"} · {subject.education_levels.join(", ")}</p>
                      <p className="mt-1 text-xs font-bold text-indigo-600">{subject.chapters_count || 0} bab tersedia</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:flex">
                    <Button variant="outline" className="rounded-xl px-3" onClick={() => toggleActive(subject)} aria-label={subject.is_active ? "Nonaktifkan" : "Aktifkan"}><Power size={16} className="sm:mr-2" /><span className="hidden sm:inline">{subject.is_active ? "Nonaktifkan" : "Aktifkan"}</span></Button>
                    <Button variant="outline" className="rounded-xl px-3" onClick={() => openForm(subject)} aria-label="Ubah mapel"><Pencil size={16} /></Button>
                    <Button variant="ghost" className="rounded-xl px-3 text-rose-600 hover:bg-rose-50" onClick={() => remove(subject)} aria-label="Hapus mapel"><Trash2 size={16} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent className="rounded-[2rem] sm:max-w-xl">
          <form onSubmit={save} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{editing ? "Ubah mata pelajaran" : "Tambah mata pelajaran"}</DialogTitle>
              <DialogDescription>Nama yang disimpan langsung tersedia pada dropdown tarif, tutor, materi, dan pemesanan.</DialogDescription>
            </DialogHeader>
            <div><Label>Nama mapel</Label><Input required minLength={2} className="mt-2 h-11 rounded-xl" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Contoh: Antropologi" /></div>
            <div><Label>Kelompok</Label><Input required className="mt-2 h-11 rounded-xl" value={form.group_name} onChange={(event) => setForm((current) => ({ ...current, group_name: event.target.value }))} placeholder="Contoh: Pilihan SMA" /></div>
            <div>
              <Label>Jenjang yang menggunakan mapel ini</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {levels.map((level) => {
                  const active = form.education_levels.includes(level);
                  return <button type="button" key={level} onClick={() => toggleLevel(level)} className={`h-11 rounded-xl border text-sm font-black transition ${active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{active && <CheckCircle2 size={14} className="mr-1 inline" />}{level}</button>;
                })}
              </div>
            </div>
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"><span><span className="block text-sm font-black text-slate-800">Mapel pilihan</span><span className="mt-1 block text-xs text-slate-500">Dapat dipakai untuk mapel pilihan sekolah atau keterampilan umum.</span></span><Switch checked={form.is_elective} onCheckedChange={(value) => setForm((current) => ({ ...current, is_elective: value }))} /></label>
            <Button disabled={saving} className="h-12 w-full rounded-xl bg-indigo-600 font-black hover:bg-indigo-700">{saving ? <Loader2 size={17} className="mr-2 animate-spin" /> : <BookOpen size={17} className="mr-2" />}Simpan mapel</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
