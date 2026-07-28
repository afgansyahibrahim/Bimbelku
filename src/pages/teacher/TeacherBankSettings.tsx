import { API_BASE_URL } from "@/lib/http";
import React, { useState, useEffect } from "react";
import TeacherLayout from "../../components/TeacherLayout"; 
import { 
  CreditCard, Save, Building, User, Wallet, 
  AlertCircle, ShieldCheck, CheckCircle2, Loader2, Wifi 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";

export default function TeacherBankSettings() {
  const confirm = useConfirmDialog();
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBankData();
  }, []);

  const fetchBankData = async () => {
    try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/teacher/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const profileData = response.data.profile;
        if (profileData) {
            setBankName(profileData.bank_name || "");
            setAccountNumber(profileData.account_number || "");
            setAccountHolder(profileData.account_name || "");
        }
    } catch (error) {
        console.error("Gagal load data bank", error);
        toast.error("Gagal memuat data rekening.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if(!bankName || !accountNumber || !accountHolder) {
        toast.error("Mohon lengkapi semua data rekening.");
        return;
    }
    if (!/^[0-9 .-]+$/.test(accountNumber)) {
        toast.error("Nomor rekening hanya boleh berisi angka, spasi, titik, atau tanda hubung.");
        return;
    }

    const approved = await confirm({
        title: "Simpan rekening pencairan?",
        description: "Admin akan memakai data ini untuk transfer pendapatan. Pastikan bank, nomor, dan nama pemilik sudah tepat.",
        confirmText: "Simpan rekening",
        tone: "warning",
    });
    if (!approved) return;

    setIsSaving(true);
    try {
        const token = localStorage.getItem("token");
        await axios.post(`${API_BASE_URL}/teacher/bank`, {
            bank_name: bankName,
            account_number: accountNumber,
            account_name: accountHolder
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        toast.success("Rekening Berhasil Disimpan!", {
            description: "Data ini akan digunakan admin untuk pencairan manual.",
            icon: <CheckCircle2 className="text-emerald-600" />,
            style: { background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857' }
        });
    } catch (error) {
        console.error(error);
        toast.error("Gagal menyimpan rekening.");
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <TeacherLayout title="Pengaturan Rekening">
      <div className="max-w-5xl mx-auto space-y-8 pb-10">
          
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Rekening Pencairan</h1>
            <p className="text-slate-500 mt-1">Atur rekening utama untuk menerima pencairan manual dari admin.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* --- KOLOM KIRI: FORMULIR --- */}
            <Card className="rounded-[2rem] border-none shadow-sm bg-white h-fit order-2 lg:order-1">
               <CardHeader className="pb-4 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Wallet size={24} />
                     </div>
                     <div>
                        <CardTitle className="text-lg font-bold text-slate-900">Data Rekening</CardTitle>
                        <p className="text-xs text-slate-500">Pastikan data sesuai buku tabungan</p>
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                     <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Building size={16} className="text-slate-400" /> Nama Bank / E-Wallet
                     </label>
                     <Input 
                        placeholder="Contoh: BCA, Mandiri, GoPay"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="h-12 rounded-xl border-slate-200 focus:bg-white bg-slate-50 transition"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <CreditCard size={16} className="text-slate-400" /> Nomor Rekening
                     </label>
                     <Input 
                        placeholder="Contoh: 1234567890"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="h-12 rounded-xl border-slate-200 focus:bg-white bg-slate-50 transition font-mono tracking-wide text-lg"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <User size={16} className="text-slate-400" /> Atas Nama (Wajib Sesuai KTP)
                     </label>
                     <Input 
                        placeholder="Nama Pemilik Rekening"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        className="h-12 rounded-xl border-slate-200 focus:bg-white bg-slate-50 transition"
                     />
                  </div>

                  <div className="pt-4">
                     <Button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="w-full h-12 rounded-xl bg-slate-900 hover:bg-indigo-600 font-bold text-base shadow-lg shadow-slate-900/20 transition-all"
                     >
                        {isSaving ? <span className="flex items-center gap-2"><Loader2 className="animate-spin"/> Menyimpan...</span> : (
                           <span className="flex items-center gap-2"><Save size={18}/> Simpan Rekening</span>
                        )}
                     </Button>
                  </div>
               </CardContent>
            </Card>

            {/* --- KOLOM KANAN: PREVIEW KARTU & INFO --- */}
            <div className="space-y-6 order-1 lg:order-2 flex flex-col items-center lg:items-start">
               
               {/* KARTU ATM REALISTIS */}
               <div className="w-full max-w-[360px] aspect-[1.58/1] rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white shadow-2xl shadow-indigo-200 p-6 flex flex-col justify-between overflow-hidden relative group hover:scale-105 transition-transform duration-500">
                  {/* Efek Background */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mt-10 -mr-10"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl -mb-10 -ml-10"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

                  {/* Header Kartu */}
                  <div className="relative z-10 flex justify-between items-start">
                      {/* Chip Simulasi */}
                      <div className="w-12 h-9 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500 border border-yellow-600/50 shadow-sm relative overflow-hidden">
                          <div className="absolute inset-0 border-r border-black/10 w-1/3 left-0 h-full"></div>
                          <div className="absolute inset-0 border-l border-black/10 w-1/3 right-0 h-full"></div>
                          <div className="absolute top-1/2 w-full h-[1px] bg-black/10"></div>
                      </div>
                      
                      {/* Contactless Icon */}
                      <Wifi size={20} className="rotate-90 opacity-60" />
                  </div>

                  {/* Nomor & Info */}
                  <div className="relative z-10 mt-2">
                     <p className="font-mono text-xl md:text-2xl tracking-[0.12em] drop-shadow-md text-center tabular-nums">
                        {accountNumber || "0000 0000 0000"}
                     </p>
                  </div>

                  {/* Footer Kartu */}
                  <div className="relative z-10 flex justify-between items-end">
                     <div>
                        <p className="text-[9px] uppercase text-indigo-200 font-bold tracking-widest mb-0.5">Card Holder</p>
                        <p className="font-medium text-sm md:text-base uppercase tracking-wide truncate max-w-[180px]">
                           {accountHolder || "NAMA PEMILIK"}
                        </p>
                     </div>
                     <div className="text-right">
                         <p className="text-xs font-bold opacity-90">{bankName || "BANK NAME"}</p>
                         <div className="flex -space-x-1.5 justify-end mt-1">
                            <div className="w-6 h-6 rounded-full bg-red-500/80"></div>
                            <div className="w-6 h-6 rounded-full bg-yellow-500/80"></div>
                         </div>
                     </div>
                  </div>
               </div>

               {/* Info Box */}
               <div className="w-full max-w-[360px] bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-3 items-start">
                  <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                     <h4 className="font-bold text-amber-800 text-sm">Penting:</h4>
                     <ul className="text-xs text-amber-700 space-y-1 list-disc ml-4">
                        <li>Pastikan nama pemilik rekening sama dengan nama di profil tutor Anda.</li>
                        <li>Admin mentransfer pendapatan secara manual setelah sesi selesai dan saldo dinyatakan siap cair.</li>
                     </ul>
                  </div>
               </div>

               <div className="flex items-center gap-2 justify-center w-full max-w-[360px] text-slate-400 text-xs">
                  <ShieldCheck size={14} />
                  <span>Akses data rekening dibatasi untuk proses pencairan.</span>
               </div>
            </div>

          </div>
      </div>
    </TeacherLayout>
  );
}
