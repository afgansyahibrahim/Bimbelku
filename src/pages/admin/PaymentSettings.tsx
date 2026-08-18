import { notify } from "@/lib/notify";
import http, { getApiError } from "@/lib/http";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import { 
  Save, CreditCard, QrCode, Building, 
  User, CheckCircle2, Loader2, ImagePlus, Landmark, Wifi 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import {
  containsLetter,
  isValidAccountNumber,
  isValidPersonName,
  sanitizeDigits,
  sanitizePersonName,
  validateUpload,
} from "@/lib/validation";

export default function PaymentSettings() {
  const confirm = useConfirmDialog();
  // STATE DATA
  const [merchantName, setMerchantName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  
  // State Gambar
  const [qrisImage, setQrisImage] = useState<string | null>(null);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [qrisAvailable, setQrisAvailable] = useState(false);
  const [qrisLoadFailed, setQrisLoadFailed] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const replaceQrisPreview = useCallback((nextUrl: string | null) => {
    setQrisImage((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return nextUrl;
    });
  }, []);

  const loadQrisPreview = useCallback(async (endpoint = "/payment-settings/qris") => {
    try {
      const response = await http.get(endpoint, { responseType: "blob" });
      replaceQrisPreview(URL.createObjectURL(response.data as Blob));
      setQrisAvailable(true);
      setQrisLoadFailed(false);
      return true;
    } catch {
      replaceQrisPreview(null);
      setQrisAvailable(false);
      setQrisLoadFailed(true);
      return false;
    }
  }, [replaceQrisPreview]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await http.get("/admin/payment-settings");
      const data = response.data;

      setMerchantName(data.merchant_name || "");
      setBankName(data.bank_name || "");
      setAccountNumber(sanitizeDigits(data.account_number || "", 50));
      setAccountName(sanitizePersonName(data.account_name || "", 150));

      if (data.qris_available) {
        await loadQrisPreview(data.qris_endpoint || "/payment-settings/qris");
      } else {
        replaceQrisPreview(null);
        setQrisAvailable(false);
        setQrisLoadFailed(false);
      }
    } catch (error) {
      console.error("Gagal load settings:", error);
      notify.error(getApiError(error, "Gagal memuat pengaturan."));
    } finally {
      setIsLoading(false);
    }
  }, [loadQrisPreview, replaceQrisPreview]);

  // 1. FETCH DATA SAAT LOAD
  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => () => {
    if (qrisImage?.startsWith("blob:")) URL.revokeObjectURL(qrisImage);
  }, [qrisImage]);

  // 2. HANDLER PILIH GAMBAR
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateUpload(file, {
        label: "Gambar QRIS",
        maxSizeMb: 2,
        extensions: ["jpg", "jpeg", "png", "webp"],
      });
      if (error) {
        notify.error(error);
        e.target.value = "";
        return;
      }
      setQrisFile(file);
      replaceQrisPreview(URL.createObjectURL(file));
      setQrisLoadFailed(false);
      notify.success("Gambar dipilih. QRIS belum aktif sebelum tombol Simpan Perubahan ditekan.");
    }
  };

  // 3. HANDLER SIMPAN KE DATABASE
  const handleSave = async () => {
    if (!merchantName.trim() || !bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      notify.error("Lengkapi seluruh data rekening sebelum menyimpan.");
      return;
    }

    if (!containsLetter(merchantName)) {
      notify.error("Nama merchant wajib mengandung huruf.");
      return;
    }
    if (!containsLetter(bankName)) {
      notify.error("Nama bank atau e-wallet wajib mengandung huruf.");
      return;
    }
    if (!isValidAccountNumber(accountNumber)) {
      notify.error("Nomor rekening harus berisi 6–50 angka.");
      return;
    }
    if (!isValidPersonName(accountName)) {
      notify.error("Nama pemilik rekening harus berisi huruf dan tidak boleh memuat angka.");
      return;
    }

    const approved = await confirm({
      title: qrisFile ? "Aktifkan QRIS pembayaran?" : "Ubah rekening pembayaran?",
      description: qrisFile
        ? "Gambar QRIS ini langsung tersedia pada halaman pembayaran murid setelah disimpan."
        : "Rekening ini langsung menjadi tujuan transfer pada tagihan murid. Periksa kembali seluruh datanya.",
      confirmText: qrisFile ? "Simpan dan aktifkan QRIS" : "Simpan rekening",
      tone: "warning",
    });
    if (!approved) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      
      formData.append('merchant_name', merchantName);
      formData.append('bank_name', bankName);
      formData.append('account_number', accountNumber);
      formData.append('account_name', accountName);
      
      if (qrisFile) {
        formData.append('qris_image', qrisFile);
      }

      await http.post("/admin/payment-settings", formData);
      const hadNewQris = Boolean(qrisFile);
      setQrisFile(null);
      await fetchSettings();

      notify.success("Pengaturan disimpan!", {
        description: hadNewQris ? "QRIS telah aktif dan akan tampil pada halaman pembayaran murid." : "Metode pembayaran telah diperbarui.",
        icon: <CheckCircle2 className="text-green-600" />,
      });

    } catch (error) {
      console.error(error);
      notify.error(getApiError(error, "Gagal menyimpan pengaturan."));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <AdminLayout title="Pengaturan Pembayaran">
       <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-orange-600" size={40} />
          <p className="text-sm font-medium text-slate-400">Memuat konfigurasi...</p>
       </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Pengaturan Pembayaran">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-lg font-bold text-slate-800">Metode Pembayaran</h2>
                <p className="text-slate-500 text-sm mt-1">
                    Data ini ditampilkan kepada murid pada halaman pembayaran.
                </p>
            </div>
            <Button 
                onClick={handleSave} 
                disabled={isSaving || !merchantName.trim() || !bankName.trim() || !accountNumber.trim() || !accountName.trim()}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-6 shadow-lg shadow-slate-900/20 transition-all hover-scale-102"
            >
                {isSaving ? (
                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18}/> Menyimpan...</span> 
                ) : (
                    <span className="flex items-center gap-2"><Save size={18} /> Simpan Perubahan</span>
                )}
            </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* --- KARTU 1: QRIS --- */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group hover-shadow-md transition-all duration-300">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <QrCode size={120} />
               </div>

               <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <QrCode size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">QRIS / E-Wallet</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Gambar ini ditampilkan langsung kepada murid saat pembayaran.</p>
                      </div>
                   </div>

                   <div className={`mb-4 rounded-2xl border p-4 ${qrisFile ? "border-amber-200 bg-amber-50 text-amber-800" : qrisAvailable ? "border-emerald-200 bg-emerald-50 text-emerald-800" : qrisLoadFailed ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                     <p className="text-sm font-black">{qrisFile ? "QRIS baru belum disimpan" : qrisAvailable ? "QRIS aktif di halaman pembayaran" : qrisLoadFailed ? "File QRIS gagal dibaca" : "QRIS belum diaktifkan"}</p>
                     <p className="mt-1 text-xs leading-5">{qrisFile ? "Tekan Simpan Perubahan agar murid dapat melihat QRIS ini." : qrisAvailable ? "Backend telah memeriksa file dan QRIS dapat dimuat tanpa bergantung pada storage:link." : qrisLoadFailed ? "Unggah ulang gambar QRIS, lalu simpan kembali." : "Unggah gambar QRIS dan simpan agar opsi QRIS muncul untuk murid."}</p>
                   </div>

                   <div className="flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8 mb-6 transition-colors hover:border-orange-300 hover:bg-orange-50/30">
                      {qrisImage ? (
                        <div className="relative group/img">
                           <img src={qrisImage} alt="QRIS Preview" loading="lazy" decoding="async" className="h-56 object-contain mix-blend-multiply rounded-lg shadow-sm" />
                           <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                                <label htmlFor="qris-upload" className="cursor-pointer text-white font-bold flex items-center gap-2 hover-scale-105 transition-transform">
                                    <ImagePlus size={20}/> Ganti Foto
                                </label>
                           </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto flex items-center justify-center text-slate-400 mb-3">
                                <ImagePlus size={24}/>
                            </div>
                            <p className="text-slate-400 font-medium text-sm">Belum ada QRIS diupload</p>
                        </div>
                      )}
                      
                      <input type="file" id="qris-upload" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handleImageUpload} />
                      
                      {!qrisImage && (
                          <label htmlFor="qris-upload" className="mt-4 cursor-pointer px-6 py-2 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-600 shadow-sm hover:text-orange-600 hover:border-orange-200 transition-all">
                             Upload Gambar QRIS
                          </label>
                      )}
                   </div>

                   <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Merchant</label>
                     <Input 
                        value={merchantName}
                        onChange={(e) => setMerchantName(e.target.value)}
                        className="h-12 rounded-xl border-slate-200 bg-white focus:border-orange-500 focus:ring-orange-100 transition font-medium"
                        placeholder="Contoh: BimbelKu Official"
                     />
                   </div>
               </div>
            </div>

            {/* --- KARTU 2: TRANSFER BANK --- */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 h-fit group hover-shadow-md transition-all duration-300">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Landmark size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Transfer Manual</h3>
               </div>

               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-sm font-bold text-slate-700 flex items-center gap-2">Nama Bank</label>
                     <div className="relative">
                        <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <Input 
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="h-12 pl-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 transition font-medium"
                            placeholder="Contoh: BCA, Mandiri"
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-bold text-slate-700 flex items-center gap-2">Nomor Rekening</label>
                     <div className="relative">
                        <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <Input 
                            value={accountNumber}
                            inputMode="numeric"
                            maxLength={50}
                            onChange={(e) => setAccountNumber(sanitizeDigits(e.target.value, 50))}
                            className="h-12 pl-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 transition font-mono text-lg tracking-wide text-slate-800"
                            placeholder="Contoh: 1234567890"
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-bold text-slate-700 flex items-center gap-2">Atas Nama (A/N)</label>
                     <div className="relative">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <Input 
                            value={accountName}
                            onChange={(e) => setAccountName(sanitizePersonName(e.target.value, 150))}
                            className="h-12 pl-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 transition font-medium"
                            placeholder="Contoh: PT BimbelKu Edukasi"
                        />
                     </div>
                  </div>
               </div>

               {/* --- PREVIEW CARD (DIPERBAIKI: PROPORSIONAL ATM) --- */}
               <div className="mt-8 flex justify-center md:justify-start">
                  <div className="relative w-full max-w-[340px] aspect-[1.58/1] rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white shadow-2xl shadow-slate-300 p-5 flex flex-col justify-between overflow-hidden transition-transform hover-scale-105 duration-300">
                      
                      {/* Background Effect */}
                      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>

                      {/* Top Row: Chip & Bank Logo */}
                      <div className="flex justify-between items-start z-10">
                         {/* Chip Simulasi */}
                         <div className="w-11 h-8 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500 border border-yellow-600/50 relative overflow-hidden shadow-sm">
                            <div className="absolute inset-0 opacity-40 border-r border-black/20 w-1/3"></div>
                            <div className="absolute top-1/2 w-full h-[1px] bg-black/20"></div>
                         </div>
                         
                         {/* Bank Name & Wifi Icon */}
                         <div className="text-right">
                             <p className="font-bold text-lg tracking-wider opacity-90">{bankName || "BANK NAME"}</p>
                             <Wifi size={16} className="ml-auto mt-1 opacity-60 rotate-90" />
                         </div>
                      </div>

                      {/* Middle: Number */}
                      <div className="z-10 mt-2">
                         <p className="font-mono text-xl tracking-[0.14em] drop-shadow-md text-center">
                            {accountNumber || "0000 0000 0000"}
                         </p>
                      </div>

                      {/* Bottom: Name & Expiry */}
                      <div className="flex justify-between items-end z-10">
                         <div>
                            <p className="text-[8px] opacity-60 uppercase tracking-widest mb-0.5">Card Holder</p>
                            <p className="font-medium tracking-wide uppercase text-sm truncate max-w-[180px]">
                               {accountName || "YOUR NAME"}
                            </p>
                         </div>
                         {/* Logo Lingkaran (Mirip Mastercard) */}
                         <div className="flex -space-x-2 opacity-90">
                            <div className="w-8 h-8 rounded-full bg-red-500/80"></div>
                            <div className="w-8 h-8 rounded-full bg-yellow-500/80"></div>
                         </div>
                      </div>
                  </div>
               </div>

            </div>
        </div>

      </div>
    </AdminLayout>
  );
}
