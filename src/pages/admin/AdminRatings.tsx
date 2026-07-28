import { API_BASE_URL } from "@/lib/http";
import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import axios from "axios";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { 
  Star, Trash2, Search, MessageSquare, User, UserCheck, AlertCircle, Loader2 
} from "lucide-react";

export default function AdminRatings() {
  const confirmDialog = useConfirmDialog();
  const [ratings, setRatings] = useState<any[]>([]);
  const [filteredRatings, setFilteredRatings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State untuk Delete Confirmation
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetchRatings();
  }, []);

  useEffect(() => {
    // Filter pencarian berdasarkan nama murid, guru, atau isi review
    const lower = searchTerm.toLowerCase();
    const filtered = ratings.filter(r => 
        r.student_name.toLowerCase().includes(lower) ||
        r.teacher_name.toLowerCase().includes(lower) ||
        (r.review && r.review.toLowerCase().includes(lower))
    );
    setFilteredRatings(filtered);
  }, [searchTerm, ratings]);

  const fetchRatings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/admin/ratings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRatings(res.data.data);
      setFilteredRatings(res.data.data);
    } catch (error) {
      toast.error("Gagal memuat data rating.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const approved = await confirmDialog({
      title: "Hapus ulasan?",
      description: "Ulasan akan dihapus permanen. Perubahan poin yang sudah tercatat tidak ikut dibatalkan.",
      confirmText: "Hapus ulasan",
      tone: "danger",
    });
    if (!approved) return;

    setIsDeleting(id);
    try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_BASE_URL}/admin/ratings/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.success("Ulasan berhasil dihapus!");
        // Hapus dari state tanpa fetch ulang biar cepat
        setRatings(prev => prev.filter(r => r.id !== id)); 
    } catch (error) {
        toast.error("Gagal menghapus ulasan.");
    } finally {
        setIsDeleting(null);
    }
  };

  return (
    <AdminLayout title="Moderasi Ulasan">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <MessageSquare className="text-yellow-500" /> Semua Ulasan Masuk
                </h2>
                <p className="text-slate-500 text-sm mt-1">Pantau dan hapus ulasan yang melanggar aturan.</p>
            </div>
            
            <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Cari nama atau isi ulasan..." 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition outline-none font-bold text-slate-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Tabel Data */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            {isLoading ? (
                <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600 w-10 h-10"/></div>
            ) : filteredRatings.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-black tracking-wider">
                            <tr>
                                <th className="p-6">Siswa (Reviewer)</th>
                                <th className="p-6">Tutor (Dinilai)</th>
                                <th className="p-6">Rating & Ulasan</th>
                                <th className="p-6 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRatings.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-6 align-top">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                                                {item.student_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{item.student_name}</p>
                                                <p className="text-xs text-slate-400">{item.created_at}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 align-top">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg w-fit border border-emerald-100">
                                            <UserCheck size={14}/> 
                                            <span className="text-xs font-bold">{item.teacher_name}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 align-top max-w-md">
                                        <div className="flex items-center gap-1 mb-2">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={14} className={i < item.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}/>
                                            ))}
                                            <span className="ml-2 text-xs font-bold text-slate-400">({item.rating}.0)</span>
                                        </div>
                                        <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            "{item.review || <span className="text-slate-400 not-italic">Tidak ada komentar tertulis</span>}"
                                        </p>
                                    </td>
                                    <td className="p-6 align-top text-center">
                                        <button 
                                            onClick={() => handleDelete(item.id)}
                                            disabled={isDeleting === item.id}
                                            className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50"
                                            title="Hapus Ulasan Ini"
                                        >
                                            {isDeleting === item.id ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18}/>}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-slate-300" size={32}/>
                    </div>
                    <h3 className="font-bold text-slate-900">Tidak ada ulasan ditemukan</h3>
                    <p className="text-sm text-slate-500">Belum ada rating masuk atau pencarian tidak cocok.</p>
                </div>
            )}
        </div>

      </div>
    </AdminLayout>
  );
}
