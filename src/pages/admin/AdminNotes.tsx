import { notify } from "@/lib/notify";
import { API_BASE_URL } from "@/lib/http";
import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import axios from "axios";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { 
  Plus, Search, Pin, Trash2, X, Palette, Loader2, Save
} from "lucide-react";

// Pilihan Warna Pastel
const COLORS = [
  { id: 'white', bg: 'bg-white', border: 'border-slate-200' },
  { id: 'red', bg: 'bg-rose-50', border: 'border-rose-100' },
  { id: 'orange', bg: 'bg-orange-50', border: 'border-orange-100' },
  { id: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-100' },
  { id: 'green', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { id: 'teal', bg: 'bg-teal-50', border: 'border-teal-100' },
  { id: 'blue', bg: 'bg-blue-50', border: 'border-blue-100' },
  { id: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  { id: 'purple', bg: 'bg-violet-50', border: 'border-violet-100' },
  { id: 'pink', bg: 'bg-pink-50', border: 'border-pink-100' },
];

export default function AdminNotes() {
  const confirmDialog = useConfirmDialog();
  const [notes, setNotes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("white");
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/admin/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(res.data);
    } catch (e) {
      console.error("Gagal load notes", e);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (note: any = null) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title || "");
      setContent(note.content || "");
      setColor(note.color || "white");
      setIsPinned(Boolean(note.is_pinned));
    } else {
      setEditingNote(null);
      setTitle("");
      setContent("");
      setColor("white");
      setIsPinned(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      notify.error("Isi judul atau catatan terlebih dahulu.");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { title, content, color, is_pinned: isPinned };
      
      if (editingNote) {
        // Update
        const res = await axios.put(`${API_BASE_URL}/admin/notes/${editingNote.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotes(prev => prev.map(n => n.id === editingNote.id ? res.data.data : n));
        notify.success("Catatan diperbarui!");
      } else {
        // Create
        const res = await axios.post(`${API_BASE_URL}/admin/notes`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotes(prev => [res.data.data, ...prev]);
        notify.success("Catatan disimpan!");
      }
      setIsModalOpen(false);
    } catch (e) {
      notify.error("Gagal menyimpan catatan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Biar modal gak kebuka
    const approved = await confirmDialog({
      title: "Hapus catatan?",
      description: "Catatan admin ini akan dihapus permanen.",
      confirmText: "Hapus",
      tone: "danger",
    });
    if (!approved) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/admin/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(prev => prev.filter(n => n.id !== id));
      notify.success("Catatan dihapus.");
    } catch (e) {
      notify.error("Gagal menghapus.");
    }
  };

  const togglePin = async (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        const token = localStorage.getItem("token");
        const newStatus = !note.is_pinned;
        // Optimistic UI Update
        const updatedNote = { ...note, is_pinned: newStatus };
        
        // Re-sort local state: Pinned first
        const newNotes = notes.map(n => n.id === note.id ? updatedNote : n)
                              .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));
        
        setNotes(newNotes);

        await axios.put(`${API_BASE_URL}/admin/notes/${note.id}`, { is_pinned: newStatus }, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch(e) { fetchNotes(); } // Revert if fail
  };

  const filteredNotes = notes.filter(n => 
    (n.title && n.title.toLowerCase().includes(search.toLowerCase())) || 
    (n.content && n.content.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AdminLayout title="Catatan & Notes">
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        
        {/* HEADER & SEARCH */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Cari catatan..." 
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <button 
                onClick={() => openModal()}
                className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2"
            >
                <Plus size={20}/> Buat Catatan
            </button>
        </div>

        {/* NOTES GRID */}
        {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={32}/></div>
        ) : filteredNotes.length === 0 ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Save size={32} className="opacity-30"/>
                </div>
                <p>Belum ada catatan. Buat baru yuk!</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                {filteredNotes.map((note) => {
                    const theme = COLORS.find(c => c.id === note.color) || COLORS[0];
                    return (
                        <div 
                            key={note.id} 
                            role="button"
                            tabIndex={0}
                            aria-label={`Buka catatan ${note.title || "tanpa judul"}`}
                            onClick={() => openModal(note)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    openModal(note);
                                }
                            }}
                            className={`group relative p-6 rounded-[2rem] border ${theme.border} ${theme.bg} shadow-sm hover-shadow-xl transition-all duration-300 cursor-pointer min-h-[180px] flex flex-col`}
                        >
                            {/* Pin Button */}
                            <button 
                                type="button"
                                aria-label={note.is_pinned ? "Lepas pin catatan" : "Pin catatan"}
                                onClick={(e) => togglePin(note, e)}
                                className={`absolute top-4 right-4 p-2 rounded-full transition ${note.is_pinned ? 'bg-slate-900 text-white' : 'bg-white/50 text-slate-400 hover:bg-white hover:text-slate-900'}`}
                            >
                                <Pin size={14} className={note.is_pinned ? 'fill-current' : ''}/>
                            </button>

                            <h3 className="font-bold text-slate-800 text-lg mb-2 pr-8 leading-tight">
                                {note.title || <span className="text-slate-400 italic">Tanpa Judul</span>}
                            </h3>
                            
                            <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed line-clamp-6 flex-1">
                                {note.content}
                            </p>

                            <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(note.updated_at).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}
                                </span>
                                <button 
                                    type="button"
                                    aria-label="Hapus catatan"
                                    onClick={(e) => handleDelete(note.id, e)}
                                    className="p-2 text-slate-400 hover:text-rose-500 bg-white/50 hover:bg-white rounded-lg transition"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* MODAL FORM */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[var(--layer-modal)] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 sm:p-4">
                <div className={`w-full max-w-lg rounded-[2rem] shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 transition-colors ${COLORS.find(c => c.id === color)?.bg || 'bg-white'}`}>
                    
                    {/* Toolbar Atas */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {editingNote ? 'Edit Catatan' : 'Catatan Baru'}
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                type="button"
                                aria-label={isPinned ? "Lepas pin catatan" : "Pin catatan"}
                                onClick={() => setIsPinned(!isPinned)}
                                className={`p-2 rounded-full transition ${isPinned ? 'bg-slate-900 text-white' : 'bg-white/50 text-slate-400 hover:bg-white'}`}
                                title="Pin Catatan"
                            >
                                <Pin size={18} className={isPinned ? 'fill-current' : ''}/>
                            </button>
                            <button type="button" aria-label="Tutup formulir catatan" onClick={() => setIsModalOpen(false)} className="p-2 bg-white/50 text-slate-500 rounded-full hover:bg-white transition">
                                <X size={20}/>
                            </button>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-2">
                        <input 
                            type="text" 
                            placeholder="Judul Catatan" 
                            className="w-full bg-transparent text-xl font-bold text-slate-900 placeholder:text-slate-400 outline-none border-none p-0"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                        <textarea 
                            placeholder="Tulis sesuatu..." 
                            className="w-full bg-transparent text-base text-slate-700 placeholder:text-slate-400 outline-none border-none p-0 resize-none min-h-[200px] leading-relaxed custom-scrollbar"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        ></textarea>
                    </div>

                    {/* Footer: Color Picker & Save */}
                    <div className="mt-6 pt-4 border-t border-black/5 flex flex-wrap items-center justify-between gap-4">
                        
                        {/* Color Picker */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <Palette size={16} className="text-slate-400 mr-1"/>
                            {COLORS.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setColor(c.id)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${c.bg} ${color === c.id ? 'border-slate-900 scale-110 shadow-sm' : 'border-black/5 hover-scale-110'}`}
                                    title={c.id}
                                />
                            ))}
                        </div>

                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-md disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving && <Loader2 className="animate-spin" size={16}/>}
                            Simpan
                        </button>
                    </div>

                </div>
            </div>
        )}

      </div>
    </AdminLayout>
  );
}
