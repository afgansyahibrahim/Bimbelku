import { API_BASE_URL } from "@/lib/http";
import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "../../components/AdminLayout";
import { 
  MessageSquare, User, CheckCircle2, X, Send, Loader2, Search, Paperclip, Lock, Clock, Image as ImageIcon, ChevronLeft
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import ProtectedImage from "@/components/ProtectedImage";
import { validateUpload } from "@/lib/validation";

export default function AdminMessages() {
  const confirmDialog = useConfirmDialog();
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- BACKGROUND FETCH ---
  const fetchTickets = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/admin/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data);
    } catch (e) { 
        if(!isBackground) toast.error("Gagal load pesan."); 
    } 
    finally { 
        if(!isBackground) setIsLoading(false); 
    }
  };

  const fetchChatDetail = async (ticketId: number) => {
    try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/tickets/${ticketId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setActiveTicket(res.data);
    } catch(e) { console.error("Gagal refresh chat"); }
  };

  useEffect(() => { fetchTickets(); }, []);

  // Polling ringan saat halaman terlihat
  useEffect(() => {
    const interval = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        fetchTickets(true);
        if (activeTicket) fetchChatDetail(activeTicket.id);
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTicket]);

  useEffect(() => {
    if (activeTicket && scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicket]);

  const openTicket = async (ticket: any) => {
    setActiveTicket(ticket);
    await fetchChatDetail(ticket.id);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!message && !imageFile) return;

    setIsSending(true);
    try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("message", message);
        if(imageFile) formData.append("image", imageFile);

        await axios.post(`${API_BASE_URL}/tickets/${activeTicket.id}/reply`, formData, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
        });

        setMessage(""); setImageFile(null);
        fetchChatDetail(activeTicket.id); 
    } catch(e) { toast.error("Gagal kirim."); }
    finally { setIsSending(false); }
  };

  const selectAttachment = (file?: File, input?: HTMLInputElement) => {
    const error = validateUpload(file, {
      label: "Lampiran balasan",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "webp"],
    });
    if (error) {
      toast.error(error);
      setImageFile(null);
      if (input) input.value = "";
      return;
    }
    setImageFile(file || null);
  };

  const handleCloseSession = async () => {
      const approved = await confirmDialog({
        title: "Selesaikan percakapan?",
        description: "Tiket bantuan akan ditutup dan ditandai selesai.",
        confirmText: "Tutup tiket",
        tone: "warning",
      });
      if (!approved) return;
      try {
        const token = localStorage.getItem("token");
        await axios.post(`${API_BASE_URL}/tickets/${activeTicket.id}/close`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Sesi diselesaikan.");
        fetchChatDetail(activeTicket.id); 
      } catch(e) { toast.error("Gagal menutup sesi."); }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout title="Inbox Bantuan">
      {/* LAYOUT FIXED HEIGHT: 
          h-[calc(100vh-130px)] memastikan konten pas di layar tanpa scroll window utama.
          Ini kunci agar footer tidak terdorong ke bawah.
      */}
      <div className="flex h-[calc(100dvh-12rem)] min-h-[560px] flex-col gap-4 animate-in fade-in zoom-in-95 duration-500 lg:h-[calc(100vh-14rem)] lg:flex-row lg:gap-6">
        
        {/* === SIDEBAR LIST PESAN (Scroll Sendiri) === */}
        <div className={`${activeTicket ? "hidden lg:flex" : "flex"} min-h-0 w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-sm lg:w-1/3 lg:min-w-[320px]`}>
            
            {/* Header Sidebar */}
            <div className="p-5 border-b border-slate-100 bg-white z-10">
                <h2 className="font-bold text-slate-800 mb-3 text-lg">Pesan Masuk</h2>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Cari User atau Subjek..." 
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                </div>
            </div>

            {/* List Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/30">
                {isLoading ? <div className="p-8 text-center text-sm text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat...</div> : 
                 filteredTickets.length === 0 ? <div className="p-8 text-center text-sm text-slate-400 italic">Tidak ada pesan ditemukan.</div> :
                 filteredTickets.map(t => (
                    <div 
                        key={t.id} 
                        onClick={() => openTicket(t)}
                        className={`p-4 rounded-2xl cursor-pointer transition border relative overflow-hidden group ${
                            activeTicket?.id === t.id 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 border-indigo-600' 
                            : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md text-slate-600'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`font-bold truncate pr-2 ${activeTicket?.id === t.id ? 'text-white' : 'text-slate-900'}`}>{t.user.name}</span>
                            <span className={`text-[10px] whitespace-nowrap ${activeTicket?.id === t.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {new Date(t.updated_at).toLocaleDateString('id-ID', {month:'short', day:'numeric'})}
                            </span>
                        </div>
                        <p className={`text-xs font-bold mb-1 truncate ${activeTicket?.id === t.id ? 'text-indigo-100' : 'text-indigo-600'}`}>{t.subject}</p>
                        <p className={`text-xs line-clamp-1 ${activeTicket?.id === t.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {t.replies?.[0]?.message || "..."}
                        </p>
                        
                        {t.status === 'open' && (
                            <div className="absolute top-4 right-2 w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>
                        )}
                    </div>
                 ))
                }
            </div>
        </div>

        {/* === CHAT AREA (Scroll Sendiri) === */}
        <div className={`${activeTicket ? "flex" : "hidden lg:flex"} min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-sm relative`}>
            {!activeTicket ? (
                <div className="m-auto text-center text-slate-300 flex flex-col items-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare size={48} className="opacity-50"/>
                    </div>
                    <p className="font-bold text-lg text-slate-400">Pilih pesan untuk melihat detail</p>
                </div>
            ) : (
                <>
                    {/* Header Chat */}
                    <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button type="button" aria-label="Kembali ke daftar pesan" onClick={() => setActiveTicket(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
                                <ChevronLeft size={20} />
                            </button>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${activeTicket.user.role === 'teacher' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                {activeTicket.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-slate-800 leading-tight">{activeTicket.subject}</h2>
                                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                                    {activeTicket.user.name} &bull; 
                                    <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">{activeTicket.user.role}</span>
                                </p>
                            </div>
                        </div>
                        {activeTicket.status === 'open' ? (
                            <button onClick={handleCloseSession} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-2 shadow-sm">
                                <CheckCircle2 size={16}/> Selesaikan Sesi
                            </button>
                        ) : (
                            <span className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200">
                                <Lock size={14}/> Sesi Ditutup
                            </span>
                        )}
                    </div>

                    {/* Bubble Chat List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8fafc] custom-scrollbar">
                        {activeTicket.replies?.map((reply: any) => {
                            const isMe = reply.user_id !== activeTicket.user.id; // Admin (Me) is sending if ID != Ticket Owner
                            
                            return (
                                <div key={reply.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`max-w-[75%] ${
                                        isMe 
                                        ? 'bg-slate-900 text-white rounded-2xl rounded-tr-sm shadow-md' 
                                        : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm shadow-sm'
                                    } p-5 relative group`}>
                                        
                                        <p className={`text-[10px] font-bold mb-2 uppercase tracking-wider flex items-center justify-between gap-4 ${isMe ? 'text-slate-400' : 'text-indigo-600'}`}>
                                            <span>{isMe ? 'Admin Support' : activeTicket.user.name}</span>
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{reply.message}</p>
                                        
                                        {reply.attachment_url && (
                                            <div className="mt-3 w-full overflow-hidden rounded-xl border border-black/10 bg-black/5">
                                                <ProtectedImage source={reply.attachment_url} alt="Lampiran percakapan" className="h-auto w-full object-cover"/>
                                            </div>
                                        )}
                                        
                                        <p className={`text-[10px] mt-2 text-right ${isMe ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {new Date(reply.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={scrollRef}></div>
                    </div>

                    {/* Input Reply */}
                    {activeTicket.status === 'open' && (
                        <div className="p-5 border-t border-slate-100 bg-white z-10">
                            {imageFile && (
                                <div className="mb-3 inline-flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 border border-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                                    <ImageIcon size={14}/> {imageFile.name} 
                                    <button onClick={()=>setImageFile(null)} className="hover:text-red-500 ml-1"><X size={14}/></button>
                                </div>
                            )}
                            <form onSubmit={handleReply} className="flex gap-3 items-end">
                                <label className="p-3 mb-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl cursor-pointer transition border border-transparent hover:border-slate-200">
                                    <Paperclip size={22}/>
                                    <input type="file" ref={fileInputRef} onChange={(e) => selectAttachment(e.target.files?.[0], e.target)} className="hidden" accept=".jpg,.jpeg,.png,.webp"/>
                                </label>
                                <div className="flex-1">
                                    <textarea 
                                        value={message} 
                                        onChange={e=>setMessage(e.target.value)} 
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleReply(e);
                                            }
                                        }}
                                        placeholder="Ketik balasan Anda..." 
                                        className="w-full bg-slate-50 border border-slate-200 outline-none px-5 py-3 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition resize-none h-[52px] max-h-32 py-3.5 text-sm font-medium"
                                    />
                                </div>
                                <button disabled={isSending} className="bg-slate-900 text-white p-3.5 rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200 disabled:opacity-50 disabled:shadow-none mb-1">
                                    {isSending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                                </button>
                            </form>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </AdminLayout>
  );
}
