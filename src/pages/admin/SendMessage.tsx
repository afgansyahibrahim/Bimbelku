import { notify } from "@/lib/notify";
import http, { getApiError } from "@/lib/http";
import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { 
  Search, Send, X, MessageSquare, Loader2, RefreshCw,
} from "lucide-react";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";

type NotificationRecipient = {
  id: number;
  name: string;
  email: string;
  role: "student" | "teacher";
  status: string;
  photo_url?: string | null;
};

type RecipientResponse = {
  data?: NotificationRecipient[];
  meta?: {
    current_page?: number;
    last_page?: number;
    total?: number;
  };
};

export default function SendMessage() {
  const confirm = useConfirmDialog();
  const [users, setUsers] = useState<NotificationRecipient[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pageInfo, setPageInfo] = useState({ current: 1, last: 1, total: 0 });
  const requestSequence = useRef(0);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<NotificationRecipient | null>(null);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const fetchUsers = useCallback(async (page = 1, append = false) => {
    const sequence = ++requestSequence.current;
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setLoadError("");
    try {
        const response = await http.get<RecipientResponse>("/admin/notifications/recipients", {
          params: { q: search.trim() || undefined, page, per_page: 50 },
        });
        if (sequence !== requestSequence.current) return;
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        const meta = response.data?.meta;
        setUsers((current) => {
          if (!append) return rows;
          const knownIds = new Set(current.map((item) => item.id));
          return [...current, ...rows.filter((item) => !knownIds.has(item.id))];
        });
        setPageInfo({
          current: Number(meta?.current_page) || page,
          last: Number(meta?.last_page) || page,
          total: Number(meta?.total) || rows.length,
        });
    } catch (error) {
        if (sequence !== requestSequence.current) return;
        const message = getApiError(error, "Daftar pengguna gagal dimuat.");
        setLoadError(message);
        if (!append) {
          setUsers([]);
          setPageInfo({ current: 1, last: 1, total: 0 });
        }
        notify.error(message);
    } finally {
      if (sequence === requestSequence.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [search]);

  useEffect(() => {
    requestSequence.current += 1;
    const timer = window.setTimeout(() => void fetchUsers(), 250);
    return () => window.clearTimeout(timer);
  }, [fetchUsers]);

  const openModal = (user: NotificationRecipient) => {
      setSelectedUser(user);
      setMessageTitle("");
      setMessageBody("");
      setIsModalOpen(true);
  };

  const handleSend = async () => {
      if(!selectedUser || !messageTitle.trim() || !messageBody.trim()) {
          notify.error("Judul dan pesan wajib diisi.");
          return;
      }
      const approved = await confirm({
        title: `Kirim notifikasi ke ${selectedUser.name}?`,
        description: "Pesan akan langsung muncul pada dashboard pengguna dan tidak dapat ditarik kembali dari halaman ini.",
        confirmText: "Ya, kirim",
        cancelText: "Periksa lagi",
        tone: "primary",
      });
      if (!approved) return;

      setIsSending(true);
      try {
          await http.post("/admin/notifications/send", {
              user_id: selectedUser.id,
              title: messageTitle.trim(),
              message: messageBody.trim(),
              type: 'info'
          });
          
          notify.success(`Pesan terkirim ke ${selectedUser.name}`);
          setIsModalOpen(false);
      } catch (error) {
          notify.error(getApiError(error, "Gagal mengirim pesan."));
      } finally {
          setIsSending(false);
      }
  };

  return (
    <AdminLayout title="Kirim Pesan Notifikasi">
      <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* SEARCH BAR */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
                <h2 className="text-lg font-bold text-slate-800">Daftar Pengguna</h2>
                <p className="text-slate-500 text-sm">Cari tutor atau murid untuk dikirimi pesan.</p>
            </div>
            <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                <input 
                    type="text" 
                    placeholder="Cari nama atau email..." 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        {/* LIST USER */}
        {isLoading ? (
            <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-indigo-600"/><p className="mt-3 text-sm font-semibold text-slate-500">Memuat pengguna...</p></div>
        ) : loadError && users.length === 0 ? (
            <div className="rounded-[2rem] border border-rose-100 bg-white px-6 py-12 text-center shadow-sm">
                <p className="font-bold text-slate-800">Daftar pengguna belum dapat dimuat</p>
                <p className="mt-2 text-sm text-slate-500">{loadError}</p>
                <button type="button" onClick={() => void fetchUsers()} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-indigo-700">
                    <RefreshCw size={16} /> Coba lagi
                </button>
            </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {users.map((user) => (
                    <div key={user.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover-shadow-md transition-all flex items-center justify-between group">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white shadow-md ${user.role === 'teacher' ? 'bg-indigo-600' : 'bg-orange-500'}`}>
                                {user.photo_url ? (
                                    <img src={user.photo_url} alt={`Foto ${user.name}`} loading="lazy" decoding="async" className="w-full h-full rounded-full object-cover"/>
                                ) : (
                                    (user.name || "P").charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-bold text-slate-800 line-clamp-1">{user.name || "Pengguna"}</h4>
                                <p className="truncate text-xs text-slate-500">{user.email}</p>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${user.role === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {user.role === 'teacher' ? 'Tutor' : 'Murid'}
                                </span>
                            </div>
                        </div>
                        
                        <button 
                            type="button"
                            onClick={() => openModal(user)}
                            className="ml-3 shrink-0 p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                            title="Kirim Pesan"
                            aria-label={`Kirim pesan ke ${user.name || "pengguna"}`}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                ))}
                {users.length === 0 && (
                    <div className="col-span-full text-center py-10 text-slate-400 italic">Pengguna tidak ditemukan.</div>
                )}
            </div>
            {pageInfo.current < pageInfo.last && (
                <div className="mt-6 text-center">
                    <button type="button" disabled={isLoadingMore} onClick={() => void fetchUsers(pageInfo.current + 1, true)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                        {isLoadingMore && <Loader2 size={16} className="animate-spin" />}
                        Muat lebih banyak ({users.length} dari {pageInfo.total})
                    </button>
                </div>
            )}
          </>
        )}

        {/* MODAL KIRIM PESAN */}
        {isModalOpen && selectedUser && (
            <div className="fixed inset-0 z-[var(--layer-modal)] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 sm:p-4">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 relative animate-in zoom-in-95 duration-200">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition"><X size={20}/></button>
                    
                    <div className="mb-6">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                            <MessageSquare size={28}/>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900">Kirim Notifikasi</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Pesan ini akan muncul di dashboard <span className="font-bold text-indigo-600">{selectedUser.name}</span>.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Judul Pesan</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Contoh: Pengingat Jadwal"
                                value={messageTitle}
                                onChange={(e) => setMessageTitle(e.target.value)}
                                maxLength={180}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Isi Pesan</label>
                            <textarea 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Tulis pesan Anda di sini..."
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                                maxLength={2000}
                            ></textarea>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition">Batal</button>
                        <button 
                            onClick={handleSend} 
                            disabled={isSending}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isSending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                            Kirim Sekarang
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </AdminLayout>
  );
}
