import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Layers3, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import http, { getApiError } from "@/lib/http";

interface Topic {
  id: number;
  subject_name: string;
  education_level: string;
  grade: string;
  chapter: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

const emptyForm = { subject_name: "", education_level: "SD", grade: "Kelas 1", chapter: "", name: "", sort_order: "0", is_active: true };
const grades: Record<string, string[]> = {
  SD: ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"],
  SMP: ["Kelas 7", "Kelas 8", "Kelas 9"],
  SMA: ["Kelas 10", "Kelas 11", "Kelas 12"],
  Umum: ["Umum"],
};

export default function LearningTopics() {
  const confirm = useConfirmDialog();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Topic | null | undefined>(undefined);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const response = await http.get("/admin/learning-topics");
      setTopics(response.data.data || []);
    } catch (error) {
      toast.error(getApiError(error, "Daftar materi gagal dimuat."));
    } finally {
      setLoading(false);
    }
  };

  const openForm = (topic?: Topic) => {
    setEditing(topic || null);
    setForm(topic ? {
      subject_name: topic.subject_name,
      education_level: topic.education_level,
      grade: topic.grade,
      chapter: topic.chapter,
      name: topic.name,
      sort_order: String(topic.sort_order),
      is_active: topic.is_active,
    } : emptyForm);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = { ...form, sort_order: Number(form.sort_order) };
    try {
      const response = editing
        ? await http.put(`/admin/learning-topics/${editing.id}`, payload)
        : await http.post("/admin/learning-topics", payload);
      toast.success(response.data.message);
      setEditing(undefined);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (topic: Topic) => {
    const approved = await confirm({
      title: "Hapus submateri?",
      description: `${topic.subject_name} · ${topic.chapter} · ${topic.name} tidak lagi muncul pada pencarian murid.`,
      confirmText: "Hapus materi",
      tone: "danger",
    });
    if (!approved) return;
    try {
      const response = await http.delete(`/admin/learning-topics/${topic.id}`);
      toast.success(response.data.message);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    }
  };

  const filtered = useMemo(() => topics.filter((topic) => `${topic.subject_name} ${topic.education_level} ${topic.grade} ${topic.chapter} ${topic.name}`.toLowerCase().includes(search.toLowerCase())), [topics, search]);

  return (
    <AdminLayout title="Materi Kurikulum">
      <div className="space-y-6 pb-12">
        <section className="flex flex-col justify-between gap-5 rounded-[2rem] bg-gradient-to-br from-slate-950 to-indigo-950 p-7 text-white md:flex-row md:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Katalog akademik</p><h1 className="mt-3 text-3xl font-black">Jenjang → kelas → bab → submateri</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/70">Materi ini dipilih murid sebelum permintaan dikirim agar tutor memahami kebutuhan sejak awal.</p></div><Button onClick={() => openForm()} className="rounded-xl bg-orange-500 font-bold hover:bg-orange-600"><Plus size={16} className="mr-2" />Tambah materi</Button>
        </section>
        <div className="relative rounded-2xl border border-slate-100 bg-white p-4"><Search className="absolute left-7 top-7 text-slate-400" size={17} /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 rounded-xl pl-10" placeholder="Cari mapel, jenjang, bab, atau submateri" /></div>
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white">
          {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-indigo-600" /></div> : filtered.length === 0 ? <div className="py-20 text-center"><Layers3 className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-black text-slate-700">Belum ada materi</p></div> : <div className="divide-y divide-slate-100">{filtered.map((topic) => <div key={topic.id} className="flex flex-col justify-between gap-4 p-5 hover:bg-slate-50 sm:flex-row sm:items-center"><div className="flex min-w-0 gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><BookOpen /></div><div className="min-w-0"><p className="font-black text-slate-900">{topic.name}</p><p className="mt-1 text-sm text-slate-500">{topic.subject_name} · {topic.education_level} · {topic.grade}</p><p className="mt-1 text-xs font-bold text-indigo-600">{topic.chapter}</p></div></div><div className="flex gap-2"><Button variant="outline" size="icon" className="rounded-xl" onClick={() => openForm(topic)}><Pencil size={16} /></Button><Button variant="ghost" size="icon" className="rounded-xl text-rose-600 hover:bg-rose-50" onClick={() => remove(topic)}><Trash2 size={16} /></Button></div></div>)}</div>}
        </div>
      </div>

      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent className="rounded-[2rem] sm:max-w-lg">
          <form onSubmit={save} className="space-y-4">
            <DialogHeader><DialogTitle>{editing ? "Ubah materi" : "Tambah materi"}</DialogTitle><DialogDescription>Gunakan struktur kurikulum resmi dan nama yang mudah dipahami murid.</DialogDescription></DialogHeader>
            <div><Label>Mata pelajaran</Label><Input required className="mt-2 h-11 rounded-xl" value={form.subject_name} onChange={(event) => setForm((current) => ({ ...current, subject_name: event.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Jenjang</Label><Select value={form.education_level} onValueChange={(value) => setForm((current) => ({ ...current, education_level: value, grade: grades[value][0] }))}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{Object.keys(grades).map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select></div><div><Label>Kelas</Label><Select value={form.grade} onValueChange={(value) => setForm((current) => ({ ...current, grade: value }))}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{grades[form.education_level].map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}</SelectContent></Select></div></div>
            <div><Label>Bab</Label><Input required className="mt-2 h-11 rounded-xl" value={form.chapter} onChange={(event) => setForm((current) => ({ ...current, chapter: event.target.value }))} /></div>
            <div><Label>Submateri</Label><Input required className="mt-2 h-11 rounded-xl" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
            <div><Label>Urutan</Label><Input type="number" min="0" className="mt-2 h-11 rounded-xl" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))} /></div>
            <Button disabled={saving} className="h-12 w-full rounded-xl bg-indigo-600 font-black hover:bg-indigo-700">{saving ? <Loader2 size={17} className="mr-2 animate-spin" /> : <GraduationCap size={17} className="mr-2" />}Simpan materi</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
