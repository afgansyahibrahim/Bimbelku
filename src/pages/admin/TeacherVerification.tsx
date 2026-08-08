import { notify } from "@/lib/notify";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  FileBadge,
  FileCheck2,
  History,
  IdCard,
  Loader2,
  Search,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { openProtectedFile } from "@/components/ProtectedImage";
import http, { getApiError } from "@/lib/http";

interface Teacher {
  id: number;
  name: string;
  email: string;
  status: string;
  subject?: string;
  levels: string[];
  teaching_method?: string;
  about?: string;
  phone?: string;
  points: number;
  verification_notes?: string;
  photo_url?: string;
  identity_document_url?: string;
  live_selfie_url?: string;
  qualification_document_url?: string;
  certification_document_url?: string;
}

export default function TeacherVerification() {
  const confirm = useConfirmDialog();
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [pending, setPending] = useState<Teacher[]>([]);
  const [history, setHistory] = useState<Teacher[]>([]);
  const [selected, setSelected] = useState<Teacher | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [pendingResponse, historyResponse] = await Promise.all([
        http.get<Teacher[]>("/admin/pending-teachers"),
        http.get<Teacher[]>("/admin/history-teachers"),
      ]);
      setPending(pendingResponse.data);
      setHistory(historyResponse.data);
    } catch (error) {
      notify.error(getApiError(error, "Data verifikasi tutor gagal dimuat."));
    } finally {
      setLoading(false);
    }
  };

  const decide = async (status: "active" | "rejected") => {
    if (!selected) return;
    if (status === "active") {
      const approved = await confirm({
        title: "Aktifkan akun tutor?",
        description: "Pastikan identitas, foto wajah langsung, bukti kualifikasi, mata pelajaran, dan jenjang sudah cocok.",
        confirmText: "Aktifkan tutor",
        tone: "primary",
      });
      if (!approved) return;
    } else if (notes.trim().length < 10) {
      notify.error("Alasan penolakan minimal 10 karakter.");
      return;
    }
    setProcessing(true);
    try {
      const response = await http.post("/admin/verify-teacher", { user_id: selected.id, status, notes });
      notify.success(response.data.message);
      setSelected(null);
      setRejecting(false);
      setNotes("");
      await load();
    } catch (error) {
      notify.error(getApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  const source = tab === "pending" ? pending : history;
  const filtered = useMemo(() => source.filter((item) => `${item.name} ${item.email} ${item.subject}`.toLowerCase().includes(search.toLowerCase())), [source, search]);

  const openDocument = async (url: string, label: string) => {
    try {
      await openProtectedFile(url, label);
    } catch (error) {
      notify.error(getApiError(error, "Dokumen gagal dibuka."));
    }
  };

  return (
    <AdminLayout title="Verifikasi Tutor">
      <div className="space-y-6 pb-12">
        <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-indigo-950 p-7 text-white">
          <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Pemeriksaan dokumen</p><h1 className="mt-3 text-3xl font-black">Verifikasi identitas & kualifikasi</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/70">Admin memeriksa identitas, foto wajah langsung, dan bukti kualifikasi. Tes materi, wawancara, microteaching, dan masa percobaan tidak digunakan.</p>
        </section>
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 sm:flex-row sm:items-center">
          <div className="flex gap-2"><Tab active={tab === "pending"} onClick={() => setTab("pending")} icon={FileCheck2} label={`Menunggu (${pending.length})`} /><Tab active={tab === "history"} onClick={() => setTab("history")} icon={History} label="Riwayat" /></div>
          <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><Input className="h-11 rounded-xl pl-10 sm:w-72" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau mapel" /></div>
        </div>
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white">
          {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-indigo-600" /></div> : filtered.length === 0 ? <div className="py-20 text-center text-sm text-slate-400">Tidak ada data pada bagian ini.</div> : <div className="divide-y divide-slate-100">
            {filtered.map((teacher) => <div key={teacher.id} className="flex flex-col justify-between gap-4 p-5 hover:bg-slate-50/70 sm:flex-row sm:items-center"><div className="flex gap-4"><div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-indigo-50 font-black text-indigo-700">{teacher.photo_url ? <img src={teacher.photo_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : teacher.name.charAt(0)}</div><div><p className="font-black text-slate-900">{teacher.name}</p><p className="text-xs text-slate-400">{teacher.email}</p><div className="mt-2 flex flex-wrap gap-1"><span className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">{teacher.subject || "Belum ada mapel"}</span>{teacher.levels?.map((level) => <span key={level} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{level}</span>)}</div></div></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${teacher.status === "active" ? "bg-emerald-50 text-emerald-700" : teacher.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{teacher.status}</span><Button variant="outline" className="rounded-xl" onClick={() => { setSelected(teacher); setRejecting(false); setNotes(""); }}><Eye size={15} className="mr-2" />Periksa</Button></div></div>)}
          </div>}
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-[2rem] sm:max-w-2xl">
          {selected && <>
            <DialogHeader><DialogTitle className="text-2xl">{rejecting ? "Tolak verifikasi tutor" : selected.name}</DialogTitle><DialogDescription>{selected.email} · {selected.subject} · {(selected.levels || []).join(", ")}</DialogDescription></DialogHeader>
            {rejecting ? <div className="space-y-4"><div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-800">Jelaskan dokumen yang tidak sesuai atau bagian yang harus diperbaiki. Alasan dikirim kepada tutor.</div><Textarea className="min-h-36 rounded-xl" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Alasan penolakan yang jelas" /><div className="flex gap-2"><Button variant="outline" className="flex-1 rounded-xl" onClick={() => setRejecting(false)}>Kembali</Button><Button className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700" onClick={() => decide("rejected")} disabled={processing}><XCircle size={16} className="mr-2" />Tolak</Button></div></div> : <>
              <div className="grid gap-3 sm:grid-cols-3"><Metric label="Mata pelajaran" value={selected.subject || "-"} /><Metric label="Metode" value={selected.teaching_method || "-"} /><Metric label="Poin awal" value={String(selected.points || 150)} /></div>
              {selected.about && <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{selected.about}</div>}
              <div className="grid gap-3 sm:grid-cols-2"><Document icon={IdCard} label="Kartu identitas" url={selected.identity_document_url} onOpen={openDocument} /><Document icon={UserRoundCheck} label="Foto wajah langsung" url={selected.live_selfie_url} onOpen={openDocument} /><Document icon={FileCheck2} label="Ijazah / kualifikasi" url={selected.qualification_document_url} onOpen={openDocument} /><Document icon={FileBadge} label="Sertifikat pendukung" url={selected.certification_document_url} optional onOpen={openDocument} /></div>
              {selected.verification_notes && <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">Catatan keputusan: {selected.verification_notes}</div>}
              {selected.status === "pending" && <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="rounded-xl border-rose-200 text-rose-700" onClick={() => setRejecting(true)}><XCircle size={16} className="mr-2" />Tolak</Button><Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => decide("active")} disabled={processing}><CheckCircle2 size={16} className="mr-2" />Setujui</Button></div>}
            </>}
          </>}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Tab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof History; label: string }) {
  return <button onClick={onClick} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black ${active ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500"}`}><Icon size={15} />{label}</button>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 font-black capitalize text-slate-800">{value}</p></div>;
}

function Document({ icon: Icon, label, url, optional, onOpen }: { icon: typeof IdCard; label: string; url?: string; optional?: boolean; onOpen: (url: string, label: string) => void }) {
  return <div className={`rounded-2xl border p-4 ${url ? "border-emerald-100 bg-emerald-50/50" : optional ? "border-slate-100 bg-slate-50" : "border-rose-100 bg-rose-50"}`}><div className="flex items-center gap-3"><Icon className={url ? "text-emerald-600" : "text-slate-400"} /><div><p className="text-sm font-black text-slate-800">{label}</p><p className="text-xs text-slate-400">{url ? "Berkas tersedia" : optional ? "Tidak dilampirkan" : "Berkas wajib tidak ada"}</p></div></div>{url && <Button type="button" variant="outline" size="sm" className="mt-3 w-full rounded-xl" onClick={() => onOpen(url, label)}><ShieldCheck size={14} className="mr-2" />Buka dokumen</Button>}</div>;
}
