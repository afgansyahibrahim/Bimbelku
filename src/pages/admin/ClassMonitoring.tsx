import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import http, { getApiError } from "@/lib/http";
import { 
  Search, BookOpen, User, CheckCircle2,
  BarChart3, Loader2, ArrowRight
} from "lucide-react";

export default function ClassMonitoring() {
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await http.get("/admin/classes");
      setClasses(res.data);
    } catch (error) {
      toast.error(getApiError(error, "Data pemantauan kelas gagal dimuat."));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClasses = classes.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.teacher_name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
  );
  const activeStatuses = [
    "confirmed",
    "in_progress",
    "awaiting_student_approval",
    "disputed",
    "absence_review",
    "admin_review_required",
  ];

  return (
    <AdminLayout title="Pemantauan Kelas">
      <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* STATS HEADER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] p-6 text-white shadow-lg shadow-indigo-200">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-indigo-100 font-medium text-sm">Total Kelas Aktif</p>
                        <h3 className="text-3xl font-black mt-2">{classes.filter(c => activeStatuses.includes(c.status)).length}</h3>
                    </div>
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><BookOpen size={24}/></div>
                </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Kelas Selesai</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-2">{classes.filter(c => c.status === "completed").length}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 size={24}/></div>
                </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Sesi Tercatat</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-2">{classes.length} <span className="text-sm font-medium text-slate-400">Sesi</span></h3>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><BarChart3 size={24}/></div>
                </div>
            </div>
        </div>

        {/* SEARCH & FILTER */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                <input 
                    type="text" 
                    placeholder="Cari kelas, mata pelajaran, atau tutor..." 
                    className="w-full pl-12 pr-4 py-3 bg-transparent outline-none text-sm font-medium text-slate-700"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        {/* CLASS LIST */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Nama Kelas</th>
                            <th className="px-6 py-5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Pengajar</th>
                            <th className="px-6 py-5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Progress</th>
                            <th className="px-6 py-5 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Murid</th>
                            <th className="px-6 py-5 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            <tr><td colSpan={5} className="px-8 py-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500"/></td></tr>
                        ) : filteredClasses.length > 0 ? (
                            filteredClasses.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-800">{item.title}</div>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.method === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{item.method}</span>
                                            <span>• {item.type}</span>
                                        </div>
                                        <div className="mt-2 text-[11px] font-bold text-slate-400">{item.status_label}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {item.teacher_name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium text-slate-600">{item.teacher_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="w-full max-w-[140px]">
                                            <div className="flex justify-between text-xs font-bold mb-1 text-slate-500">
                                                <span>{item.completed_sessions}/{item.total_sessions} Sesi</span>
                                                <span className={item.status === "completed" ? "text-emerald-500" : "text-indigo-500"}>{item.progress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${item.status === "completed" ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{width: `${item.progress}%`}}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex -space-x-2">
                                            {[...Array(Math.min(item.student_count, 3))].map((_, i) => (
                                                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] text-slate-500">
                                                    <User size={12}/>
                                                </div>
                                            ))}
                                            {item.student_count > 3 && (
                                                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                    +{item.student_count - 3}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <Link 
                                            to={`/admin/classes/${item.id}`} 
                                            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md transition-all"
                                        >
                                            <ArrowRight size={18}/>
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-400 italic">Tidak ada data kelas.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </AdminLayout>
  );
}
