import { notify } from "@/lib/notify";
import http, { getApiError } from "@/lib/http";
import { useState, useEffect, useRef } from "react";
import AdminLayout from "../../components/AdminLayout";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { 
  TrendingUp, Wallet, ArrowUpRight, CheckCircle2, 
  X, Calendar,
  DollarSign, PieChart, Loader2, RefreshCw, FileText,
  Edit, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    ready_amount: 0,
    requested_amount: 0,
    paid_7days: 0,
    paid_count_7days: 0,
    admin_fee_percent: 20
  });

  const [isLoading, setIsLoading] = useState(true);

  // Modal Payout State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null); 
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); 
  const previewObjectUrlRef = useRef<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // [BARU] Modal Edit Fee
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [newFee, setNewFee] = useState<string>("20");

  useEffect(() => {
    fetchFinanceData();
  }, []);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  const fetchFinanceData = async () => {
    try {
      const response = await http.get("/admin/finance");
      
      setPayouts(response.data.pending || []);
      setHistory(response.data.history || []);
      
      if (response.data.stats) {
        setStats(response.data.stats);
        setNewFee(response.data.stats.admin_fee_percent.toString()); // Sync input dengan data
      }

    } catch (error) {
      notify.error(getApiError(error, "Gagal mengambil data keuangan."));
    } finally {
      setIsLoading(false);
    }
  };

  // Handler Update Fee
  const handleUpdateFee = async () => {
    const feeValue = parseInt(newFee);
    if (isNaN(feeValue) || feeValue < 0 || feeValue > 100) {
      return notify.error("Persentase harus angka 0 - 100");
    }

    try {
      await http.post("/admin/commission-setting", { admin_fee: feeValue });
      notify.success("Persentase Keuntungan berhasil diupdate!");
      setIsFeeModalOpen(false);
      fetchFinanceData(); // Refresh data agar angka rupiah berubah
    } catch (error) {
      notify.error(getApiError(error, "Gagal memperbarui persentase."));
    }
  };

  // Handler Payout Modal
  const clearProofPreview = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setProofFile(null);
  };

  const handleOpenTransfer = (payout: any) => {
    clearProofPreview();
    setSelectedPayout(payout);
    setIsModalOpen(true);
  };

  const handleCloseTransfer = () => {
    clearProofPreview();
    setSelectedPayout(null);
    setIsModalOpen(false);
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
        notify.error(error);
        e.target.value = "";
        return;
      }
      setProofFile(file);
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
      const objectUrl = URL.createObjectURL(file);
      previewObjectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedPayout || !proofFile) return notify.error("Upload bukti transfer dulu.");
    const approved = await confirm({
      title: "Catat pencairan tutor?",
      description: `Pastikan transfer ${formatRupiah(selectedPayout.netAmount)} ke rekening ${selectedPayout.bankDetails.number} sudah benar. Semua sesi terpilih akan ditandai telah dicairkan.`,
      confirmText: "Ya, sudah ditransfer",
      tone: "warning",
    });
    if (!approved) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('teacher_id', selectedPayout.teacherId);
      selectedPayout.bookingIds.forEach((id: number, index: number) => formData.append(`booking_ids[${index}]`, String(id)));
      formData.append('proof_file', proofFile); 

      const response = await http.post("/admin/payout", formData);

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
      setPayouts(payouts.filter(p => p.queueKey !== selectedPayout.queueKey));
      notify.success("Berhasil dicairkan!");
      handleCloseTransfer();
    } catch (error) {
      notify.error(getApiError(error, "Gagal memproses pencairan."));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="h-dvh flex items-center justify-center"><Loader2 className="animate-spin text-orange-600" /></div>;

  return (
    <AdminLayout title="Pencairan tutor" subtitle="Saldo tutor, persetujuan, transfer, dan bukti pencairan">
      
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
                 <button type="button" aria-label="Tutup konfirmasi transfer" onClick={handleCloseTransfer}><X size={20}/></button>
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
              {previewUrl && <img src={previewUrl} alt="Pratinjau bukti pencairan" loading="lazy" decoding="async" className="h-32 object-contain mx-auto rounded-lg border" />}
              <Button onClick={handleConfirmTransfer} disabled={isProcessing} className="w-full bg-slate-900">{isProcessing ? "Memproses..." : "Konfirmasi"}</Button>
           </div>
        </div>
      )}

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        
        {/* Ringkasan pencairan saja. Pembayaran murid dan refund memiliki halaman terpisah. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-200">
            <DollarSign className="absolute right-4 top-4 opacity-10" size={88} />
            <p className="text-xs font-black uppercase tracking-widest text-slate-300">Saldo siap dicairkan</p>
            <p className="mt-3 text-3xl font-black">{formatRupiah(stats.ready_amount)}</p>
            <p className="mt-2 text-xs text-slate-400">Sesi sah yang belum diajukan tutor.</p>
          </div>
          <div className="rounded-[2rem] border border-indigo-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><Wallet className="text-indigo-600" /><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">Diajukan</span></div>
            <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Menunggu admin</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{formatRupiah(stats.requested_amount)}</p>
          </div>
          <div className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><TrendingUp className="text-emerald-600" /><span className="text-xs font-black text-emerald-700">{stats.paid_count_7days} transfer</span></div>
            <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Dicairkan 7 hari</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{formatRupiah(stats.paid_7days)}</p>
            <p className="mt-2 text-xs text-slate-400">{getWeeklyLabel()}</p>
          </div>
          <div className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><PieChart className="text-orange-600" /><button type="button" onClick={() => setIsFeeModalOpen(true)} className="flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-xs font-black text-orange-700">Ubah <Edit size={12}/></button></div>
            <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Komisi transaksi baru</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{stats.admin_fee_percent}%</p>
            <p className="mt-2 text-xs text-slate-400">Snapshot lama tidak berubah.</p>
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
              <Button aria-label="Muat ulang data pencairan" variant="outline" onClick={fetchFinanceData}><RefreshCw size={16}/></Button>
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
                      payouts.map((p) => (
                         <tr key={p.queueKey || `${p.teacherId}-${p.bookingIds.join("-")}`} className="group hover:bg-slate-50/80 transition-colors">
                            <td className="px-8 py-5 font-bold text-slate-800">{p.name}</td>
                            <td className="px-6 py-5">
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
                                    <Calendar size={12}/> {p.period}
                                </span>
                            </td>
                            <td className="px-6 py-5 text-right font-black text-emerald-600 text-lg">{formatRupiah(p.netAmount)}</td>
                            <td className="px-8 py-5 text-right">
                               {p.payoutBlocked ? (
                                 <div className="inline-flex flex-col items-end gap-1"><Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Ditahan setelah rekening berubah</Badge><span className="text-[11px] text-slate-400">{p.payoutHoldUntil ? new Date(p.payoutHoldUntil).toLocaleString("id-ID") : ""}</span></div>
                               ) : (
                                 <Button onClick={() => handleOpenTransfer(p)} className="rounded-xl bg-slate-900 hover:bg-orange-600 text-white shadow-sm">Transfer <ArrowUpRight size={16} className="ml-2"/></Button>
                               )}
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
                                  {h.proof_url && <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg text-xs text-indigo-600" onClick={() => void openProtectedFile(h.proof_url, `struk-pencairan-${h.id}`).catch(() => notify.error("Struk tidak dapat dibuka."))}><FileText size={14} className="mr-1" />Struk</Button>}
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
