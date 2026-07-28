import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { toast } from "sonner";
import http, { getApiError } from "@/lib/http";
import { 
  ArrowLeft, Calendar, MapPin, Video, CheckCircle2,
  Clock, Loader2, Mail, Phone, WalletCards
} from "lucide-react";

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await http.get(`/admin/classes/${id}`);
        setData(res.data);
      } catch (error) {
        toast.error(getApiError(error, "Detail kelas gagal dimuat."));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLoading) return (
    <AdminLayout title="Detail Kelas">
        <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={40}/></div>
    </AdminLayout>
  );

  if (!data) return (
    <AdminLayout title="Detail Kelas">
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div><p className="font-black text-slate-800">Kelas tidak dapat ditampilkan</p><button onClick={() => navigate(-1)} className="mt-3 text-sm font-bold text-indigo-600">Kembali</button></div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Detail Kelas">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
            <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition">
                <ArrowLeft size={20}/>
            </button>
            <div className="flex-1 w-full bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${data.info.method === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {data.info.method}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                {data.info.type}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">
                                {data.info.status_label}
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 mb-2">{data.info.title}</h1>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            {data.info.method === 'online' ? <Video size={16}/> : <MapPin size={16}/>}
                            {data.info.location}
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-500"><Clock size={15} className="mr-2 inline" />{new Date(data.info.start_at).toLocaleString("id-ID")} – {new Date(data.info.end_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    
                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Progress</div>
                        <div className="text-4xl font-black text-indigo-600">{data.info.progress}%</div>
                        <p className="text-xs text-slate-500 mt-1">Selesai</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Nilai per murid" value={rupiah(Number(data.info.price))} />
          <Metric label="Dana terverifikasi" value={rupiah(Number(data.info.gross_amount))} />
          <Metric label={`Komisi admin (${Number(data.info.commission_percent)}%)`} value={rupiah(Number(data.info.gross_amount) - Number(data.info.teacher_net_amount))} />
          <Metric label="Hak tutor" value={rupiah(Number(data.info.teacher_net_amount))} icon />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: SESSIONS */}
            <div className="lg:col-span-2 space-y-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="text-indigo-500"/> Timeline Pertemuan
                </h3>
                
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6">
                    {(data.sessions || []).map((sess: any, idx: number) => (
                        <div key={sess.id} className="relative pl-8 pb-2 border-l-2 border-slate-100 last:border-0 last:pb-0">
                            {/* Dot Indicator */}
                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${sess.is_completed ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition border border-slate-100/50">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">Pertemuan {idx + 1}: {sess.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                        <Clock size={12}/> {sess.date}
                                    </p>
                                </div>
                                <div>
                                    {sess.is_completed ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                                            <CheckCircle2 size={12}/> Selesai
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-500 rounded-lg text-xs font-bold">
                                            Belum Mulai
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT COLUMN: TEACHER & STUDENTS */}
            <div className="space-y-8">
                
                {/* TEACHER CARD */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-4">Pengajar</h3>
                    <div className="flex items-center gap-4">
                        {data.teacher.photo ? (
                            <img src={data.teacher.photo} alt="" className="w-14 h-14 rounded-full object-cover shadow-md"/>
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                {data.teacher.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h4 className="font-bold text-slate-900">{data.teacher.name}</h4>
                            <div className="flex gap-2 mt-1">
                                {data.teacher.phone && (
                                    <a href={`https://wa.me/${String(data.teacher.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"><Phone size={14}/></a>
                                )}
                                {data.teacher.email && <a href={`mailto:${data.teacher.email}`} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"><Mail size={14}/></a>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* STUDENTS LIST */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Daftar Murid</h3>
                        <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{(data.students || []).length} Murid</span>
                    </div>
                    <div className="space-y-3">
                        {(data.students || []).map((student: any) => (
                            <div key={student.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition cursor-default">
                                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                                    {student.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{student.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{student.email}</p>
                                    <p className="mt-1 text-[10px] font-bold text-indigo-500">{student.status} · {student.order_status || "tanpa tagihan"}</p>
                                </div>
                                {student.phone && (
                                  <a
                                    href={`https://wa.me/${String(student.phone).replace(/\D/g, "").replace(/^0/, "62")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Hubungi ${student.name} melalui WhatsApp`}
                                    className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition hover:bg-emerald-100"
                                  >
                                    <Phone size={14} />
                                  </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>

      </div>
    </AdminLayout>
  );
}

function Metric({ label, value, icon = false }: { label: string; value: string; icon?: boolean }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>{icon && <WalletCards size={18} className="text-emerald-500" />}</div><p className="mt-2 text-lg font-black text-slate-900">{value}</p></div>;
}
