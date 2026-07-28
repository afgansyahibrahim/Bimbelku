import { API_BASE_URL } from "@/lib/http";
import React, { useEffect, useState } from "react";
import TeacherLayout from "../../components/TeacherLayout";
import { 
  Banknote, History, Calendar, CheckCircle2, 
  Download, Loader2, DollarSign, Users, Clock, Percent
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { openProtectedFile } from "@/components/ProtectedImage";

// Helper Rupiah
const formatRupiah = (num: number) => 
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

export default function TeacherSalary() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSalary();
  }, []);

  const fetchSalary = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/teacher/salary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (error) {
      console.error("Error fetching salary:", error);
      toast.error("Gagal memuat data gaji.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <TeacherLayout title="Pendapatan Tutor">
      <div className="max-w-6xl mx-auto space-y-8 pb-10">
        
        <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pendapatan & Pencairan</h1>
            <p className="text-gray-500 mt-1">Pantau saldo bersih siap cair dan riwayat transfer manual dari admin.</p>
        </div>

        {/* --- 3 KARTU INFORMASI --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           
           {/* KARTU 1: GAJI MINGGU INI (PENDING) */}
           <Card className="rounded-[2rem] border-none shadow-lg bg-indigo-900 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={100} /></div>
              <CardContent className="p-6 flex flex-col justify-between h-full">
                 <div>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 mb-2 opacity-90">
                            <Calendar size={16} />
                            <p className="text-xs font-bold uppercase tracking-widest">Periode: {data?.current_period}</p>
                        </div>
                        {/* BADGE PERSENTASE DINAMIS DARI DATABASE */}
                        {data?.share_percent && (
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none px-2 py-0.5 text-[10px]">
                                <Percent size={10} className="mr-1"/> {data.share_percent}% Share
                            </Badge>
                        )}
                    </div>
                    <p className="text-indigo-200 text-sm font-medium mb-1">Saldo Bersih Siap Dicairkan</p>
                    <h3 className="text-3xl font-bold">{formatRupiah(data?.pending_amount || 0)}</h3>
                 </div>
                 
                 <div className="mt-4">
                    {data?.pending_amount > 0 ? (
                        <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none px-3 py-1">
                            <Clock size={12} className="mr-1"/> Siap Diproses Admin
                        </Badge>
                    ) : (
                        <Badge className="bg-indigo-700 text-indigo-100 border-none px-3 py-1">
                           Menunggu Transaksi Baru
                        </Badge>
                    )}
                 </div>
              </CardContent>
           </Card>

           {/* KARTU 2: TOTAL MURID MINGGU INI */}
           <Card className="rounded-[2rem] border-none shadow-sm bg-white border border-gray-100">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Users size={24}/></div>
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Murid Baru Minggu Ini</p>
                        <h3 className="text-3xl font-bold text-gray-900">{data?.student_count_week || 0}</h3>
                    </div>
                 </div>
                 <p className="text-sm text-gray-400">
                    *Total siswa yang mendaftar dan membayar minggu ini.
                 </p>
              </CardContent>
           </Card>

           {/* KARTU 3: TOTAL DICAIRKAN (ALL TIME) */}
           <Card className="rounded-[2rem] border-none shadow-sm bg-white border border-gray-100">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-xl"><Banknote size={24}/></div>
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Penghasilan Cair</p>
                        <h3 className="text-3xl font-bold text-gray-900">{formatRupiah(data?.total_withdrawn || 0)}</h3>
                    </div>
                 </div>
                 <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 w-fit">
                    <CheckCircle2 size={14}/> Sudah Masuk Rekening
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* --- TABEL RIWAYAT --- */}
        <div>
           <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <History size={20} className="text-gray-500"/> Riwayat Pencairan
           </h2>
           
           <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 font-bold border-b border-gray-100">
                      <tr>
                         <th className="px-6 py-4">Periode Saldo</th>
                         <th className="px-6 py-4">Tanggal Transfer</th>
                         <th className="px-6 py-4 text-center">Info</th>
                         <th className="px-6 py-4 text-right">Nominal Cair</th>
                         <th className="px-6 py-4 text-center">Status</th>
                         <th className="px-6 py-4 text-center">Bukti</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {data?.history?.map((item: any) => (
                         <tr key={item.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 font-bold text-gray-900">{item.period}</td>
                            
                            <td className="px-6 py-4 text-sm text-gray-500">{item.transfer_date || "-"}</td>
                            
                            <td className="px-6 py-4 text-center">
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold">
                                   {item.total_students ? item.total_students + ' Siswa' : '-'}
                                </span>
                            </td>
                            
                            <td className="px-6 py-4 text-right font-bold text-green-600 text-base">
                                {formatRupiah(item.amount)}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none gap-1">
                                    <CheckCircle2 size={12}/> {item.status}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-center">
                               {item.proof_url ? (
                                 <Button type="button" variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 text-xs" onClick={() => void openProtectedFile(item.proof_url, `struk-gaji-${item.id}`).catch(() => toast.error("Struk tidak dapat dibuka."))}>
                                    <Download size={14} className="mr-1"/> Struk
                                 </Button>
                               ) : (
                                 <span className="text-gray-400 text-xs">-</span>
                               )}
                            </td>
                         </tr>
                      ))}
                      {(!data?.history || data.history.length === 0) && (
                         <tr>
                            <td colSpan={6} className="text-center py-12 text-gray-400 italic">
                               Belum ada riwayat pencairan.
                            </td>
                         </tr>
                      )}
                   </tbody>
                </table>
              </div>
           </div>
        </div>

      </div>
    </TeacherLayout>
  );
}
