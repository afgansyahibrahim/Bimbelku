import { API_BASE_URL } from "@/lib/http";
import React, { useState, useEffect, useRef } from "react";
import { 
  Send, MessageSquare, Clock, CheckCircle2, Loader2, 
  ImagePlus, X, Paperclip, ChevronLeft, Lock, FileText, Search
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import ProtectedImage from "@/components/ProtectedImage";
import { validateUpload } from "@/lib/validation";

export default function HelpCenter() {
  const [view, setView] = useState<"list" | "create" | "chat">("list");
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  
  // State Form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // --- FETCH LIST TIKET ---
  const fetchTickets = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/tickets/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data);
    } catch (e) { console.error(e); } 
    finally { if (!isBackground) setIsLoading(false); }
  };

  // --- FETCH DETAIL CHAT ---
  const fetchChatDetail = async (ticketId: number) => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/tickets/${ticketId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setActiveTicket(res.data);
      } catch (e) { console.error("Gagal refresh chat"); }
  };

  useEffect(() => { fetchTickets(); }, []);

  // Auto-refresh ringan saat halaman terlihat
  useEffect(() => {
    const interval = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        if (view === "list") fetchTickets(true);
        else if (view === "chat" && activeTicket) fetchChatDetail(activeTicket.id);
    }, 15000);
    return () => clearInterval(interval);
  }, [view, activeTicket]);

  // --- AUTO SCROLL ---
  useEffect(() => {
    if (view === "chat" && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicket?.replies?.length, view]);

  const openChat = async (ticketId: number) => {
    setIsLoading(true);
    await fetchChatDetail(ticketId);
    setIsLoading(false);
    setView("chat");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!subject || !message) return toast.error("Isi judul dan pesan!");
    
    setIsSending(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("message", message);
      if(imageFile) formData.append("image", imageFile);

      await axios.post(`${API_BASE_URL}/tickets`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      
      toast.success("Permintaan bantuan berhasil dikirim!");
      setSubject(""); setMessage(""); clearImage();
      fetchTickets();
      setView("list");
    } catch(e) { toast.error("Gagal kirim tiket."); }
    finally { setIsSending(false); }
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

      setMessage(""); clearImage();
      fetchChatDetail(activeTicket.id); 
    } catch(e) { toast.error("Gagal kirim balasan."); }
    finally { setIsSending(false); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const error = validateUpload(file, {
          label: "Lampiran bantuan",
          maxSizeMb: 5,
          extensions: ["jpg", "jpeg", "png", "webp"],
        });
        if (error) {
          toast.error(error);
          e.target.value = "";
          return;
        }
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    }
  };

  // Filter Tiket
  const filteredTickets = tickets.filter(t => t.subject.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] min-h-[34rem] max-w-6xl flex-col font-sans animate-in fade-in duration-500 sm:h-[calc(100dvh-11rem)] xl:h-[82vh]">
      
      {/* HEADER UTAMA */}
      <div className="mb-4 flex shrink-0 flex-col items-stretch justify-between gap-4 sm:mb-6 sm:flex-row sm:items-end">
          <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Pusat Bantuan</h1>
              <p className="text-slate-500 font-medium">Kirim kendala ke admin dan pantau balasannya.</p>
          </div>
          {view === "list" && (
            <button 
                onClick={() => setView("create")} 
                className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 active:scale-95"
            >
                <Send size={18} strokeWidth={2.5}/> Ajukan Bantuan
            </button>
          )}
      </div>

      {/* --- CONTENT AREA (CARD UTAMA) --- */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-xl sm:rounded-[2rem]">
        
        {/* VIEW 1: LIST TIKET */}
        {view === "list" && (
           <div className="flex flex-col h-full">
              {/* Search Bar */}
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:p-6">
                  <div className="relative flex-1">
                      <Search className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                      <input 
                        type="text" 
                        placeholder="Cari keluhan Anda..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition font-medium text-slate-700"
                      />
                  </div>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {isLoading ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                          <Loader2 className="animate-spin mb-2 text-indigo-500" size={32}/>
                          <p>Memuat tiket...</p>
                      </div>
                  ) : filteredTickets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                          <MessageSquare size={64} className="mb-4 text-slate-300"/>
                          <p className="font-bold text-lg">Belum ada permintaan bantuan</p>
                          <p className="text-sm">Tekan "Ajukan Bantuan" untuk menghubungi admin.</p>
                      </div>
                  ) : (
                      filteredTickets.map(t => (
                        <button
                            type="button"
                            key={t.id}
                            onClick={() => openChat(t.id)}
                            className="group relative w-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 text-left transition hover:border-indigo-200 hover:shadow-md"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition"></div>
                            <div className="flex justify-between items-start mb-2 pl-2">
                                <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-700 transition line-clamp-1">{t.subject}</h3>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${t.status==='open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {t.status === 'open' ? 'Proses' : 'Selesai'}
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm line-clamp-1 pl-2 font-medium">{t.latest_reply?.message || "Belum ada pesan..."}</p>
                            <div className="mt-3 flex justify-end pl-2">
                                <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                    {new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        </button>
                      ))
                  )}
              </div>
           </div>
        )}

        {/* VIEW 2: FORM BUAT TIKET */}
        {view === "create" && (
            <div className="flex h-full flex-col overflow-y-auto p-5 custom-scrollbar sm:p-8 lg:p-12">
                 <button onClick={() => setView("list")} className="mb-6 text-slate-400 hover:text-indigo-600 font-bold flex items-center gap-2 transition w-fit">
                    <ChevronLeft size={20}/> Kembali ke List
                 </button>
                 
                 <div className="max-w-2xl mx-auto w-full">
                     <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <span className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><FileText size={20}/></span>
                        Ajukan Bantuan ke Admin
                     </h2>
                     
                     <form onSubmit={handleCreate} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Subjek Kendala</label>
                            <input 
                                type="text" 
                                placeholder="Contoh: Kode promo tidak dapat digunakan" 
                                value={subject} 
                                onChange={e=>setSubject(e.target.value)} 
                                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800 transition"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Detail Penjelasan</label>
                            <textarea 
                                placeholder="Jelaskan kendala, waktu kejadian, dan hasil yang diharapkan..." 
                                value={message} 
                                onChange={e=>setMessage(e.target.value)} 
                                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none h-40 resize-none font-medium text-slate-700 transition"
                            ></textarea>
                        </div>

                        <div className="space-y-2">
                             <label className="text-sm font-bold text-slate-700">Lampiran (Opsional)</label>
                             <div className="flex items-center gap-4">
                                <label className="cursor-pointer bg-white border border-slate-200 shadow-sm px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-indigo-300 transition flex items-center gap-2 group">
                                    <ImagePlus size={18} className="text-slate-400 group-hover:text-indigo-500"/> 
                                    {imageFile ? "Ganti File" : "Upload Gambar"}
                                    <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept=".jpg,.jpeg,.png,.webp"/>
                                </label>
                                {imagePreview && (
                                    <div className="relative group/img">
                                        <img src={imagePreview} alt="Pratinjau lampiran" loading="lazy" decoding="async" className="h-12 w-12 object-cover rounded-lg border border-slate-200"/>
                                        <button onClick={clearImage} type="button" aria-label="Hapus lampiran" className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white opacity-100 transition sm:opacity-0 sm:group-hover/img:opacity-100"><X size={10}/></button>
                                    </div>
                                )}
                             </div>
                        </div>

                        <div className="pt-4">
                            <button disabled={isSending} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition flex justify-center gap-2 items-center">
                                {isSending ? <Loader2 className="animate-spin"/> : <Send size={20}/>} Kirim ke Admin
                            </button>
                        </div>
                     </form>
                 </div>
            </div>
        )}

        {/* VIEW 3: CHAT ROOM (REAL-TIME) */}
        {view === "chat" && activeTicket && (
            <div className="flex flex-col h-full">
                {/* Header Chat */}
                <div className="z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white p-4 sm:p-6">
                    <div className="flex items-center gap-4">
                        <button type="button" aria-label="Kembali ke daftar tiket" onClick={() => setView("list")} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500"><ChevronLeft size={24}/></button>
                        <div>
                            <h3 className="font-black text-lg text-slate-900 line-clamp-1">{activeTicket.subject}</h3>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${activeTicket.status==='open' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    {activeTicket.status === 'open' ? 'Diskusi Berlangsung' : 'Sesi Ditutup'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bubble Chat Area */}
                <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/50 p-4 custom-scrollbar sm:p-6">
                    {activeTicket.replies.map((reply: any) => {
                        const isMyChat = reply.user_id === activeTicket.user_id; 

                        return (
                            <div key={reply.id} className={`flex ${isMyChat ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`max-w-[85%] sm:max-w-[70%] shadow-sm ${
                                    isMyChat 
                                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                                        : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm'
                                    } p-4 relative group`}
                                >
                                    <p className="text-[10px] font-bold mb-1 opacity-70 uppercase tracking-wider">{isMyChat ? 'Anda' : 'Admin Support'}</p>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{reply.message}</p>
                                    
                                    {reply.attachment_url && (
                                        <div className="mt-3 w-full overflow-hidden rounded-xl border border-black/10 bg-black/5">
                                            <ProtectedImage source={reply.attachment_url} alt="Lampiran percakapan" className="h-auto w-full object-cover"/>
                                        </div>
                                    )}
                                    <p className={`text-[10px] mt-2 text-right ${isMyChat ? 'text-indigo-200' : 'text-slate-400'}`}>
                                        {new Date(reply.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef}></div>
                </div>

                {/* Input Area */}
                {activeTicket.status === 'open' ? (
                    <div className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4">
                        {imagePreview && (
                            <div className="mb-3 inline-flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 border border-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                                <ImagePlus size={14}/> Gambar terpilih <button type="button" onClick={clearImage} aria-label="Hapus lampiran" className="hover:text-red-500"><X size={14}/></button>
                            </div>
                        )}
                        <form onSubmit={handleReply} className="flex items-end gap-2 sm:gap-3">
                            <label className="p-3 mb-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl cursor-pointer transition border border-transparent hover:border-indigo-100">
                                <Paperclip size={20}/>
                                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept=".jpg,.jpeg,.png,.webp"/>
                            </label>
                            <div className="flex-1 relative">
                                <textarea 
                                    value={message} 
                                    onChange={e=>setMessage(e.target.value)} 
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleReply(e);
                                        }
                                    }}
                                    placeholder="Ketik pesan balasan... (Enter untuk kirim)" 
                                    className="w-full bg-slate-50 border border-slate-200 outline-none px-5 py-3 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition resize-none h-[52px] max-h-32 py-3.5 text-sm"
                                />
                            </div>
                            <button type="submit" aria-label="Kirim balasan bantuan" disabled={isSending} className="bg-indigo-600 text-white p-3.5 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none mb-1">
                                {isSending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="p-6 bg-slate-50 text-center text-slate-500 font-bold text-sm flex justify-center items-center gap-2 border-t border-slate-100 shrink-0">
                        <Lock size={16}/> Percakapan ini telah diselesaikan.
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
