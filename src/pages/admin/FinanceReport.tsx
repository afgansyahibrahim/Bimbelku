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

const payoutWaitingLabel = (value?: string | null) => {
  if (!value) return null;
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours < 1) return "Baru diajukan";
  if (hours < 24) return `Menunggu ${hours} jam`;
  return `Pending lama · ${Math.floor(hours / 24)} hari`;
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
        <div className="fixed inset-0 z-[var(--layer-modal)] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm animate-in fade-in sm:p-4">
           <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center border-b pb-2">
                 <span aria-hidden="true" className="h-10 w-10" />
                 <h3 className="text-center text-lg font-bold">Atur Persentase Keuntungan</h3>
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
        <div className="fixed inset-0 z-[var(--layer-modal)] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm animate-in fade-in sm:p-4">
           <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center border-b pb-2">
                 <span aria-hidden="true" className="h-10 w-10" />
                 <h3 className="text-center text-lg font-bold">Konfirmasi Transfer</h3>
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
           <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="grid w-full min-w-0 grid-cols-2 rounded-2xl bg-slate-100 p-1.5 sm:w-auto">
                 <button onClick={() => setActiveTab("pending")} className={`min-w-0 rounded-xl px-2 py-2.5 text-xs font-bold transition-all sm:px-6 sm:text-sm ${activeTab === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>
                   Siap Dicairkan {payouts.length > 0 && <span className="ml-2 bg-orange-500 text-white px-1.5 rounded-full text-[10px]">{payouts.length}</span>}
                 </button>
                 <button onClick={() => setActiveTab("history")} className={`min-w-0 rounded-xl px-2 py-2.5 text-xs font-bold transition-all sm:px-6 sm:text-sm ${activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>
                   Riwayat
                 </button>
              </div>
              <Button aria-label="Muat ulang data pencairan" variant="outline" onClick={fetchFinanceData} className="w-full sm:w-11"><RefreshCw size={16}/><span className="ml-2 sm:sr-only">Muat ulang</span></Button>
           </div>

           <div className="divide-y divide-slate-100 md:hidden">
             {activeTab === "pending" ? payouts.map((p) => (
               <article key={p.queueKey || `${p.teacherId}-${p.bookingIds.join("-")}`} className="p-4">
                 <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-black text-slate-900">{p.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{p.period}</p></div>{p.request?.requestedAt && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${payoutWaitingLabel(p.request.requestedAt)?.startsWith("Pending lama") ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>{payoutWaitingLabel(p.request.requestedAt)}</span>}</div>
                 <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-400">Gaji bersih</p><p className="mt-1 break-words text-xl font-black text-emerald-700">{formatRupiah(p.netAmount)}</p>
                 {p.payoutBlocked ? <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">Pencairan ditahan setelah rekening berubah hingga {p.payoutHoldUntil ? new Date(p.payoutHoldUntil).toLocaleString("id-ID") : "batas keamanan berakhir"}.</div> : <Button onClick={() => handleOpenTransfer(p)} className="mt-4 h-11 w-full rounded-xl bg-slate-900 text-white hover:bg-orange-600">Transfer <ArrowUpRight size={16} className="ml-2" /></Button>}
               </article>
             )) : history.map((h, idx) => (
               <article key={h.id || idx} className="p-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-black text-slate-900">{h.name}</p><p className="mt-1 text-xs text-slate-500">{h.period}</p></div><CheckCircle2 className="shrink-0 text-emerald-500" size={20} /></div><p className="mt-4 text-xl font-black text-slate-900">{formatRupiah(h.netAmount)}</p><p className="mt-1 text-xs text-slate-500">{h.transferDate}</p>{h.proof_url && <Button variant="outline" onClick={() => void openProtectedFile(h.proof_url, `bukti-pencairan-${h.id || idx}`).catch(() => notify.error("Bukti pencairan tidak dapat dibuka."))} className="mt-4 h-11 w-full rounded-xl"><FileText size={15} className="mr-2" />Lihat bukti</Button>}</article>
             ))}
             {(activeTab === "pending" ? payouts : history).length === 0 && <div className="p-10 text-center text-sm font-semibold text-slate-500">Tidak ada data pada tampilan ini.</div>}
           </div>

           <div className="hidden overflow-x-auto md:block">
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
                                {p.request?.requestedAt && <p className={`mt-2 text-[11px] font-black ${payoutWaitingLabel(p.request.requestedAt)?.startsWith("Pending lama") ? "text-rose-600" : "text-amber-700"}`}>{payoutWaitingLabel(p.request.requestedAt)}</p>}
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
