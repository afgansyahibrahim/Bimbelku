import http from "@/lib/http";
import ProtectedImage from "@/components/ProtectedImage";
import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { 
  Eye, X, TrendingUp, Calendar, 
  CheckCircle, XCircle, Clock, AlertTriangle, Send, FileText, ChevronRight
} from "lucide-react";
import { toast } from "sonner"; 

// Helper Formatter Rupiah
const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
const paymentStatus: Record<string, { label: string; className: string }> = {
  paid: { label: "Diterima", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  rejected: { label: "Ditolak", className: "bg-rose-50 text-rose-700 border-rose-100" },
  refund_pending: { label: "Menunggu refund", className: "bg-amber-50 text-amber-700 border-amber-100" },
  refunded: { label: "Sudah direfund", className: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  cancelled: { label: "Dibatalkan", className: "bg-slate-100 text-slate-600 border-slate-200" },
  expired: { label: "Kedaluwarsa", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function PaymentVerification() {
  const confirm = useConfirmDialog();
  // STATE DATA
  const [payments, setPayments] = useState<any[]>([]); 
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]); 
  const [paymentView, setPaymentView] = useState<"pending" | "history">("pending");
  const [isLoading, setIsLoading] = useState(true);
  
  // STATE MODAL
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedRejectId, setSelectedRejectId] = useState<number | null>(null);

  // 1. FETCH DATA (KITA PAKAI ROUTE LAMA YANG PASTI ADA)
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // Pesanan tanpa bukti transfer tidak ditampilkan sebagai tugas verifikasi.
      const [allResponse, pendingResponse] = await Promise.all([
        http.get("/admin/orders"),
        http.get("/admin/pending-payments"),
      ]);

      const allOrders = allResponse.data.map((order: any) => {
        const details = order.class_details_snapshot || {};
        return {
          ...order,
          title: order.classroom?.title
            || [details.subject, details.teacher_name].filter(Boolean).join(" - ")
            || order.order_id,
        };
      });
      const history = allOrders.filter((order: any) => !["pending", "submitted"].includes(order.status));

      setPayments(pendingResponse.data);
      setPaymentHistory(history);

    } catch (error) {
      console.error("Gagal ambil data order:", error);
      toast.error("Gagal memuat data pembayaran.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. HANDLE PROSES VERIFIKASI
  const handleActionClick = async (payment: any, action: "Diterima" | "Ditolak") => {
    if (action === "Diterima") {
      const approved = await confirm({
        title: "Terima pembayaran?",
        description: `Pastikan bukti ${formatRupiah(payment.amount)} sesuai dengan mutasi rekening admin. Jika sesi sudah dimulai, sistem akan memasukkan dana ke antrean refund penuh.`,
        confirmText: "Terima pembayaran",
        tone: "warning",
      });
      if (!approved) return;
      processPayment(payment, "paid", "-");
    } else {
      setSelectedRejectId(payment.id);
      setRejectModalOpen(true);
      setRejectReason("");
      setProofModalOpen(false); 
    }
  };

  const confirmReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Wajib diisi!", { description: "Mohon masukkan alasan penolakan." });
      return;
    }
    const payment = payments.find(p => p.id === selectedRejectId);
    if (payment) {
      processPayment(payment, "rejected", rejectReason); 
      setRejectModalOpen(false);
    }
  };

  // --- FUNGSI UTAMA YANG MENCEGAH CRASH ---
  const processPayment = async (payment: any, statusBackend: "paid" | "rejected", reasonStr: string) => {
    // 1. Optimistic Update (Langsung hilangkan dari tabel biar cepat)
    const newPending = payments.filter(p => p.id !== payment.id);
    setPayments(newPending);

    try {
        // 2. Kirim Request ke Backend
        const res = await http.post("/admin/verify-payment", {
            order_id: payment.id,
            status: statusBackend,
            reason: statusBackend === "rejected" ? reasonStr : null,
        });

        // 3. Update State History
        const finalStatus = res.data?.data?.status || statusBackend;
        const updatedPayment = { ...payment, status: finalStatus, reason: reasonStr };
        setPaymentHistory([updatedPayment, ...paymentHistory]);
        setProofModalOpen(false);

        // 4. TAMPILKAN NOTIFIKASI (DENGAN PENGECEKAN KEAMANAN)
        if (finalStatus === "paid") {
            // [ANTI CRASH] Cek semua kemungkinan sumber judul kelas
            // Prioritas: 1. Dari respon backend, 2. Dari data payment awal, 3. Default text
            const classTitle = res.data?.title 
                            || res.data?.data?.classroom?.title 
                            || payment.classroom?.title 
                            || "Kelas Baru";
            
            toast.success("Pembayaran diterima", {
                description: res.data?.message || `Murid ${payment.user_name || payment.user?.name} masuk ke kelas ${classTitle}.`,
                style: { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' },
                icon: <CheckCircle className="text-emerald-600" />,
            });
        } else if (finalStatus === "refund_pending") {
            toast.warning("Pembayaran masuk antrean refund", {
              description: res.data?.message || "Sesi sudah dimulai sehingga dana harus dikembalikan penuh.",
            });
        } else {
            toast.error(`Pembayaran Ditolak`, {
                description: `Status order diubah menjadi ditolak.`,
                style: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },
                icon: <XCircle className="text-red-600" />,
            });
        }

    } catch (error) {
        console.error(error);
        toast.error("Gagal memproses data.", { description: "Silakan cek koneksi internet." });
        // Kembalikan data jika gagal (Rollback)
        setPayments([...newPending, payment]); 
    }
  };

  const openProofModal = (payment: any) => {
    setSelectedPayment(payment);
    setProofModalOpen(true);
  };

  return (
    <AdminLayout title="Verifikasi Pembayaran">
      
      {/* --- MODAL 1: PREVIEW BUKTI TRANSFER --- */}
      {proofModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            
            {/* Header Modal */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                  <h3 className="font-bold text-slate-800 text-lg">Bukti Transfer</h3>
                  <p className="text-xs text-slate-500">Cek keaslian bukti pembayaran</p>
              </div>
              <button onClick={() => setProofModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20} className="text-slate-400 hover:text-slate-900" /></button>
            </div>

            <div className="p-6 space-y-6">
               <div className="text-center py-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Ditransfer</p>
                   <h2 className="text-3xl font-black text-slate-800 tracking-tight">{formatRupiah(selectedPayment.amount)}</h2>
                   <div className="flex justify-center items-center gap-2 mt-2">
                        <span className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600">{selectedPayment.sender_name || selectedPayment.user?.name || selectedPayment.user_name}</span>
                        <span className="text-xs font-medium px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-400">{selectedPayment.bank_name || "Bank Transfer"}</span>
                   </div>
                   <p className="mt-2 text-xs text-slate-500">No. asal/refund: <span className="font-mono font-bold text-slate-700">{selectedPayment.sender_account_number || "Belum tercatat"}</span></p>
               </div>

               <div className="bg-slate-100 rounded-2xl p-2 border border-slate-200 flex items-center justify-center min-h-[250px] overflow-hidden relative group">
                   {selectedPayment.payment_proof ? (
                       <ProtectedImage
                         source={selectedPayment.payment_proof}
                         alt="Bukti" 
                         className="w-full h-auto max-h-[400px] object-contain rounded-xl shadow-sm transition-transform group-hover:scale-105 duration-500" 
                       />
                   ) : (
                       <div className="text-center text-slate-400">
                           <FileText size={40} className="mx-auto mb-2 opacity-30"/>
                           <p className="text-sm italic">Tidak ada foto bukti.</p>
                       </div>
                   )}
               </div>

               <div className="flex gap-3 pt-2">
                   <button onClick={() => handleActionClick(selectedPayment, "Ditolak")} className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all">Tolak</button>
                   <button onClick={() => handleActionClick(selectedPayment, "Diterima")} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-slate-900/20">Terima Pembayaran</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: INPUT ALASAN PENOLAKAN --- */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500 ring-4 ring-red-50">
                   <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Tolak Pembayaran?</h3>
                <p className="text-sm text-slate-500 mb-8 px-4 leading-relaxed">
                   Bukti dikembalikan kepada murid untuk diunggah ulang sebelum tenggat. Berikan alasan yang jelas.
                </p>
                
                <div className="text-left mb-6">
                   <label className="text-xs font-bold text-slate-700 uppercase ml-1 mb-2 block">Alasan Penolakan</label>
                   <textarea 
                      className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm min-h-[100px] resize-none transition-all placeholder:text-slate-400"
                      placeholder="Contoh: Bukti transfer buram, nominal tidak sesuai..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                   />
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setRejectModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">Batal</button>
                   <button onClick={confirmReject} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-500/20 flex items-center justify-center gap-2">
                     <Send size={16} /> Kirim Penolakan
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* --- KONTEN UTAMA --- */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
        
        {/* DASHBOARD STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500"><TrendingUp size={100} /></div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 opacity-70">
                    <CheckCircle size={16} className="text-emerald-400" />
                    <p className="text-xs font-bold uppercase tracking-widest">Total Verified</p>
                </div>
                <h3 className="text-4xl font-black tracking-tight mb-2">
                {formatRupiah(paymentHistory.filter(p => p.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0))}
                </h3>
                <p className="text-sm text-slate-400">Total uang masuk yang sudah dikonfirmasi.</p>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
             <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Clock size={100} /></div>
             <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <Clock size={16} />
                    </div>
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Perlu Tindakan</p>
                 </div>
                 <h3 className="text-4xl font-black text-slate-800 tracking-tight mb-2">{payments.length}</h3>
                 <p className="text-sm text-slate-500 font-medium">Transaksi menunggu verifikasi Anda.</p>
             </div>
          </div>
        </div>

        {/* TABEL DATA */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
          
          {/* Toolbar & Tabs */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/30">
             <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full sm:w-auto">
                 <button 
                    onClick={() => setPaymentView("pending")} 
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${paymentView === "pending" ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"}`}
                 >
                   Verifikasi 
                   {payments.length > 0 && <span className="w-5 h-5 flex items-center justify-center bg-orange-500 text-white text-[10px] rounded-full">{payments.length}</span>}
                 </button>
                 <button 
                    onClick={() => setPaymentView("history")} 
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${paymentView === "history" ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"}`}
                 >
                   Riwayat
                 </button>
             </div>
          </div>

          {/* VIEW: PENDING PAYMENTS */}
          {paymentView === "pending" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50/80 text-xs uppercase text-slate-400 font-bold tracking-wider">
                  <tr>
                    <th className="px-8 py-5">Murid</th>
                    <th className="px-6 py-5">Kelas Diambil</th>
                    <th className="px-6 py-5">Nominal</th>
                    <th className="px-6 py-5">Bukti</th>
                    <th className="px-8 py-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                                {(p.user?.name || p.user_name) ? (p.user?.name || p.user_name).charAt(0) : "?"}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{p.user?.name || p.user_name || "Unknown"}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">ID: #{p.id}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                          {/* Disini kita pakai data yang ada dulu, kalau classroom null, kita coba ambil title jika ada */}
                          <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                             {p.classroom?.title || p.title || "Kelas Baru (Draft)"}
                          </span>
                      </td>
                      <td className="px-6 py-5">
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                              {formatRupiah(p.amount)}
                          </span>
                      </td>
                      <td className="px-6 py-5">
                        <button onClick={() => openProofModal(p)} className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition border border-indigo-100">
                            <Eye size={14} /> Lihat Foto
                        </button>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleActionClick(p, "Ditolak")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm">
                              <X size={16} />
                          </button>
                          <button onClick={() => handleActionClick(p, "Diterima")} className="h-9 px-4 flex items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-emerald-600 transition-all shadow-md shadow-slate-200">
                              <CheckCircle size={14} className="mr-2"/> Terima
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && !isLoading && (
                    <tr>
                        <td colSpan={5} className="py-20 text-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 mx-auto border border-slate-100">
                                <CheckCircle size={30} className="text-emerald-500 opacity-50"/>
                            </div>
                            <p className="font-medium text-slate-600">Semua aman!</p>
                            <p className="text-xs mt-1">Tidak ada pembayaran yang perlu diverifikasi.</p>
                        </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW: HISTORY PAYMENTS */}
          {paymentView === "history" && (
             <div className="overflow-x-auto">
               <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50/80 text-xs uppercase text-slate-400 font-bold tracking-wider">
                  <tr>
                    <th className="px-8 py-5">Murid</th>
                    <th className="px-6 py-5">Kelas</th>
                    <th className="px-6 py-5">Nominal</th>
                    <th className="px-6 py-5">Tanggal</th>
                    <th className="px-8 py-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentHistory.map((h) => (
                    <tr key={h.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-8 py-5 font-bold text-slate-800">{h.user?.name || h.user_name}</td>
                      <td className="px-6 py-5 text-sm text-slate-500">{h.classroom?.title || h.title}</td>
                      <td className="px-6 py-5 font-bold text-slate-800">{formatRupiah(h.amount)}</td>
                      <td className="px-6 py-5 text-xs text-slate-400 font-medium">
                         {new Date(h.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                         <p className="text-[10px] mt-0.5 opacity-70">{new Date(h.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${(paymentStatus[h.status] || paymentStatus.cancelled).className}`}>
                          {h.status === 'paid' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {(paymentStatus[h.status] || { label: h.status }).label}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paymentHistory.length === 0 && !isLoading && (
                    <tr>
                        <td colSpan={5} className="py-20 text-center text-slate-400">
                            <p className="font-medium text-slate-500">Belum ada riwayat.</p>
                        </td>
                    </tr>
                  )}
                </tbody>
              </table>
             </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}
