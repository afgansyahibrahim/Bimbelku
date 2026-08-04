import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ChevronRight, Loader2, RefreshCw, Search, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import http, { getApiError } from "@/lib/http";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  target_url?: string | null;
  is_read: boolean;
  created_at: string;
};

const dateTime = (value: string) => new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [query, setQuery] = useState("");
  const [processing, setProcessing] = useState<number | "all" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await http.get("/notifications", { params: { per_page: 100 } });
      setItems(Array.isArray(response.data.notifications) ? response.data.notifications : []);
    } catch (error) {
      setFailed(true);
      toast.error(getApiError(error, "Notifikasi gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("id-ID");
    return items.filter((item) => {
      if (filter === "unread" && item.is_read) return false;
      return !keyword || `${item.title} ${item.message}`.toLocaleLowerCase("id-ID").includes(keyword);
    });
  }, [filter, items, query]);

  const readOne = async (item: NotificationItem, follow = true) => {
    setProcessing(item.id);
    try {
      if (!item.is_read) {
        await http.post(`/notifications/${item.id}/read`);
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry));
      }
      if (follow && item.target_url?.startsWith("/")) navigate(item.target_url);
    } catch (error) {
      toast.error(getApiError(error, "Status notifikasi gagal diperbarui."));
    } finally {
      setProcessing(null);
    }
  };

  const readAll = async () => {
    const unread = items.filter((item) => !item.is_read);
    if (!unread.length) return;
    setProcessing("all");
    try {
      await http.post("/notifications/read-all");
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      toast.success("Semua notifikasi ditandai sudah dibaca.");
    } catch (error) {
      toast.error(getApiError(error, "Sebagian notifikasi belum berhasil diperbarui."));
      await load();
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-[1.7rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-indigo-200">Pusat informasi</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Notifikasi</h1><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/75">Buka pemberitahuan untuk langsung menuju pekerjaan yang perlu diselesaikan.</p></div>
          <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => void load()} className="h-11 flex-1 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:flex-none"><RefreshCw size={16} className="mr-2" />Muat ulang</Button><Button type="button" disabled={processing === "all" || !items.some((item) => !item.is_read)} onClick={() => void readAll()} className="h-11 flex-1 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 sm:flex-none">{processing === "all" ? <Loader2 className="mr-2 animate-spin" size={16} /> : <CheckCheck className="mr-2" size={16} />}Baca semua</Button></div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm sm:rounded-[2rem]">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 rounded-xl bg-slate-50 pl-10" placeholder="Cari isi notifikasi" /></div>
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-black"><button type="button" onClick={() => setFilter("all")} className={`rounded-lg px-4 py-2.5 ${filter === "all" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>Semua</button><button type="button" onClick={() => setFilter("unread")} className={`rounded-lg px-4 py-2.5 ${filter === "unread" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>Belum dibaca</button></div>
          </div>
        </div>

        {loading ? <div className="grid min-h-80 place-items-center"><Loader2 className="animate-spin text-indigo-600" size={30} /></div>
          : failed ? <div className="px-5 py-20 text-center"><WifiOff className="mx-auto text-rose-300" size={36} /><p className="mt-3 font-black text-slate-800">Notifikasi belum dapat dimuat</p><Button onClick={() => void load()} className="mt-4 rounded-xl bg-indigo-600">Coba lagi</Button></div>
          : visible.length === 0 ? <div className="px-5 py-20 text-center"><Bell className="mx-auto text-slate-300" size={38} /><p className="mt-3 font-black text-slate-800">Tidak ada notifikasi</p><p className="mt-1 text-sm text-slate-500">Pemberitahuan baru akan muncul di sini.</p></div>
          : <div className="divide-y divide-slate-100">{visible.map((item) => <button key={item.id} type="button" disabled={processing === item.id} onClick={() => void readOne(item)} className={`flex w-full min-w-0 items-start gap-3 p-4 text-left transition hover:bg-indigo-50/50 sm:gap-4 sm:p-5 ${item.is_read ? "bg-white" : "bg-indigo-50/35"}`}><span className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${item.is_read ? "bg-slate-100 text-slate-400" : "bg-indigo-600 text-white"}`}><Bell size={17} /></span><span className="min-w-0 flex-1"><span className="flex min-w-0 items-start justify-between gap-2"><span className={`break-words text-sm ${item.is_read ? "font-bold text-slate-700" : "font-black text-slate-900"}`}>{item.title}</span>{!item.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}</span><span className="mt-1.5 block break-words text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">{item.message}</span><span className="mt-2 block text-[10px] font-bold text-slate-400">{dateTime(item.created_at)}</span></span>{item.target_url && <ChevronRight className="mt-3 shrink-0 text-slate-300" size={18} />}</button>)}</div>}
      </section>
    </div>
  );
}
