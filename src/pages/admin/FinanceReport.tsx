import { API_BASE_URL } from "@/lib/http";
import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { 
  TrendingUp, Wallet, ArrowUpRight, CheckCircle2, 
  Building, User, CreditCard, X, Calendar, Search, 
  DollarSign, PieChart, Upload, Loader2, RefreshCw, FileText,
  Edit, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { openProtectedFile } from "@/components/ProtectedImage";
import { validateUpload } from "@/lib/validation";

const formatRupiah = (num: number) => 
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

// Generate tanggal untuk label kartu
const getWeeklyLabel = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return `${start.getDate()} ${start.toLocaleString('default', { month: 'short' })} - ${end.getDate()} ${end.toLocaleString('default', { month: 'short' })}`;
};

export default function FinanceReport() {
  const confirm = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  
  const [payouts, setPayouts] = useState<any[]>([]); 
  const [history, setHistory] = useState<any[]>([]); 
  
  // STATE STATISTIK
  const [stats, setStats] = useState({
    revenue_7days: 0,
    teacher_7days: 0,
    admin_7days: 0,
    admin_fee_percent: 20
  });

  const [isLoading, setIsLoading] = useState(true);

  // Modal Payout State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null); 
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); 
  const [isProcessing, setIsProcessing] = useState(false);

  // [BARU] Modal Edit Fee
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [newFee, setNewFee] = useState<string>("20");

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/admin/finance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPayouts(response.data.pending || []);
      setHistory(response.data.history || []);
      
      if (response.data.stats) {
        setStats(response.data.stats);
        setNewFee(response.data.stats.admin_fee_percent.toString()); // Sync input dengan data
      }

    } catch (error) {
      console.error("Gagal load data", error);
      toast.error("Gagal mengambil data keuangan.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler Update Fee
  const handleUpdateFee = async () => {
    const feeValue = parseInt(newFee);
    if (isNaN(feeValue) || feeValue < 0 || feeValue > 100) {
      return toast.error("Persentase harus angka 0 - 100");
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE_URL}/admin/commission-setting`, 
        { admin_fee: feeValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Persentase Keuntungan berhasil diupdate!");
      setIsFeeModalOpen(false);
      fetchFinanceData(); // Refresh data agar angka rupiah berubah
    } catch (error) {
      toast.error("Gagal update persentase.");
    }
  };

  // Handler Payout Modal
  const handleOpenTransfer = (payout: any) => {
    setSelectedPayout(payout);
    setProofFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateUpload(file, {
        label: "Bukti pencairan",
        maxSizeMb: 5,
        extensions: ["jpg", "jpeg", "png", "webp"],
      });
      if (error) {
        toast.error(error);
        e.target.value = "";
        return;
      }
      setProofFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedPayout || !proofFile) return toast.error("Upload bukti transfer dulu.");
    const approved = await confirm({
      title: "Catat pencairan tutor?",
      description: `Pastikan transfer ${formatRupiah(selectedPayout.netAmount)} ke rekening ${selectedPayout.bankDetails.number} sudah benar. Semua sesi terpilih akan ditandai telah dicairkan.`,
      confirmText: "Ya, sudah ditransfer",
      tone: "warning",
    });
    if (!approved) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('teacher_id', selectedPayout.teacherId);
      selectedPayout.bookingIds.forEach((id: number, index: number) => formData.append(`booking_ids[${index}]`, String(id)));
      formData.append('proof_file', proofFile); 

      const response = await axios.post(`${API_BASE_URL}/admin/payout`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newHistoryItem = {
        id: response.data.data.id,
        name: selectedPayout.name,
        period: selectedPayout.period,
        netAmount: selectedPayout.netAmount,
        transferDate: "Baru saja",
        status: "Berhasil",
        proof_url: response.data.data.proof_url
      };
      setHistory([newHistoryItem, ...history]);
      setPayouts(payouts.filter(p => p.teacherId !== selectedPayout.teacherId));
      toast.success("Berhasil dicairkan!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Gagal memproses.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-600" /></div>;

  return (
    <AdminLayout title="Laporan Keuangan">
      
      {/* MODAL EDIT FEE */}
      {isFeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                 <h3 className="font-bold text-lg">Atur Persentase Keuntungan</h3>
                 <button onClick={() => setIsFeeModalOpen(false)}><X size={20}/></button>
              </div>
              <div className="space-y-4">
                 <p className="text-sm text-gray-500">
                    Masukkan persentase komisi admin. Sisanya otomatis menjadi hak tutor.
                 </p>
                 <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={newFee} 
                      onChange={(e) => setNewFee(e.target.value)} 
                      className="text-center font-bold text-lg h-12"
                    />
                    <span className="font-bold text-xl">%</span>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                    <div className="flex justify-between">
                       <span>Bagian Admin:</span>
                       <span className="font-bold text-emerald-600">{newFee}%</span>
                    </div>
                    <div className="flex justify-between">
                       <span>Bagian Tutor:</span>
                       <span className="font-bold text-orange-600">{100 - parseInt(newFee || "0")}%</span>
                    </div>
                 </div>
                 <Button onClick={handleUpdateFee} className="w-full bg-slate-900 hover:bg-slate-800">
                    <Save size={16} className="mr-2"/> Simpan Perubahan
                 </Button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL TRANSFER */}
      {isModalOpen && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                 <h3 className="font-bold text-lg">Konfirmasi Transfer</h3>
                 <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100">
                 <p className="text-xs font-bold text-emerald-600 uppercase">Nominal Transfer</p>
                 <h2 className="text-3xl font-black text-emerald-700">{formatRupiah(selectedPayout.netAmount)}</h2>
              </div>
              <div className="space-y-2 text-sm border p-3 rounded-xl bg-gray-50">
                 <p><strong>Bank:</strong> {selectedPayout.bankDetails.bank}</p>
                 <p><strong>Rekening:</strong> {selectedPayout.bankDetails.number}</p>
                 <p><strong>Nama:</strong> {selectedPayout.bankDetails.name}</p>
              </div>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"/>
              {previewUrl && <img src={previewUrl} className="h-32 object-contain mx-auto rounded-lg border" />}
              <Button onClick={handleConfirmTransfer} disabled={isProcessing} className="w-full bg-slate-900">{isProcessing ? "Memproses..." : "Konfirmasi"}</Button>
           </div>
        </div>
      )}

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        
        {/* --- 3 KARTU STATISTIK --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           
           {/* Card 1: Total Pendapatan */}
           <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl shadow-slate-200">
              <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={100} /></div>
              <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4 opacity-70">
                    <Calendar size={16} />
                    <p className="text-xs font-bold uppercase tracking-widest">Pendapatan 7 Hari Ini</p>
                 </div>
                 <h3 className="text-3xl lg:text-4xl font-black mb-2 tracking-tight">{formatRupiah(stats.revenue_7days)}</h3>
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm text-xs font-medium">
                    <TrendingUp size={12}/> {getWeeklyLabel()}
                 </div>
              </div>
           </div>

           {/* Card 2: Total Hak Guru */}
           <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:scale-110 transition-transform"><Wallet size={24}/></div>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                    {100 - stats.admin_fee_percent}% Share
                  </span>
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Hak Tutor (Minggu Ini)</p>
              <h3 className="text-3xl font-bold text-slate-800">{formatRupiah(stats.teacher_7days)}</h3>
           </div>

           {/* Card 3: Total Profit Admin (EDITABLE) */}
           <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform"><PieChart size={24}/></div>
                  
                  {/* TOMBOL EDIT PERSENTASE */}
                  <button 
                    onClick={() => setIsFeeModalOpen(true)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    {stats.admin_fee_percent}% Profit <Edit size={12}/>
                  </button>
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Keuntungan (Minggu Ini)</p>
              <h3 className="text-3xl font-bold text-slate-800">{formatRupiah(stats.admin_7days)}</h3>
           </div>
        </div>

        {/* --- TABEL DATA --- */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
           <div className="p-6 border-b border-slate-100 flex justify-between items-center gap-4 bg-slate-50/30">
              <div className="flex p-1.5 bg-slate-100 rounded-2xl">
                 <button onClick={() => setActiveTab("pending")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>
                   Siap Dicairkan {payouts.length > 0 && <span className="ml-2 bg-orange-500 text-white px-1.5 rounded-full text-[10px]">{payouts.length}</span>}
                 </button>
                 <button onClick={() => setActiveTab("history")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>
                   Riwayat
                 </button>
              </div>
              <Button variant="outline" onClick={fetchFinanceData}><RefreshCw size={16}/></Button>
           </div>

           <div className="overflow-x-auto">
             <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-50/80 text-xs uppercase text-slate-400 font-bold tracking-wider">
                  <tr>
                     <th className="px-8 py-5">Tutor</th>
                     <th className="px-6 py-5">Periode Saldo</th>
                     <th className="px-6 py-5 text-right">{activeTab === 'pending' ? 'Gaji Bersih (Mengendap)' : 'Nominal Ditransfer'}</th>
                     <th className="px-8 py-5 text-right">Aksi / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {activeTab === "pending" ? (
                      payouts.map((p, idx) => (
                         <tr key={idx} className="group hover:bg-slate-50/80 transition-colors">
                            <td className="px-8 py-5 font-bold text-slate-800">{p.name}</td>
                            <td className="px-6 py-5">
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
                                    <Calendar size={12}/> {p.period}
                                </span>
                            </td>
                            <td className="px-6 py-5 text-right font-black text-emerald-600 text-lg">{formatRupiah(p.netAmount)}</td>
                            <td className="px-8 py-5 text-right">
                               <Button onClick={() => handleOpenTransfer(p)} className="rounded-xl bg-slate-900 hover:bg-orange-600 text-white shadow-sm">Transfer <ArrowUpRight size={16} className="ml-2"/></Button>
                            </td>
                         </tr>
                      ))
                   ) : (
                      history.map((h, idx) => (
                         <tr key={idx} className="group hover:bg-slate-50/80 transition-colors">
                            <td className="px-8 py-5 font-bold text-slate-800">{h.name}</td>
                            <td className="px-6 py-5 text-slate-500 text-sm">{h.period}</td>
                            <td className="px-6 py-5 text-right font-bold text-slate-800">{formatRupiah(h.netAmount)}</td>
                            <td className="px-8 py-5 text-right">
                               <div className="flex items-center justify-end gap-2">
                                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold"><CheckCircle2 size={12}/> Berhasil</div>
                                  {h.proof_url && <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg text-xs text-indigo-600" onClick={() => void openProtectedFile(h.proof_url, `struk-pencairan-${h.id}`).catch(() => toast.error("Struk tidak dapat dibuka."))}><FileText size={14} className="mr-1" />Struk</Button>}
                               </div>
                            </td>
                         </tr>
                      ))
                   )}
                   {((activeTab === 'pending' && payouts.length === 0) || (activeTab === 'history' && history.length === 0)) && (
                       <tr><td colSpan={4} className="py-20 text-center text-slate-400">Tidak ada data.</td></tr>
                   )}
                </tbody>
             </table>
           </div>
        </div>
      </div>
    </AdminLayout>
  );
}
