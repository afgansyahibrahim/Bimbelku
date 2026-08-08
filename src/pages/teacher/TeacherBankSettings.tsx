import { notify } from "@/lib/notify";
import React, { useState, useEffect } from "react";
import TeacherLayout from "../../components/TeacherLayout"; 
import { 
  CreditCard, Save, Building, User, Wallet, 
  AlertCircle, ShieldCheck, CheckCircle2, Loader2, Wifi 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import http, { getApiError, getCached } from "@/lib/http";
import {
  containsLetter,
  isValidAccountNumber,
  isValidPersonName,
  sanitizeDigits,
  sanitizePersonName,
} from "@/lib/validation";

const PAYOUT_ACCOUNT_MIN_DIGITS = 8;
const PAYOUT_ACCOUNT_MAX_DIGITS = 20;

export default function TeacherBankSettings() {
  const confirm = useConfirmDialog();
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [payoutHoldUntil, setPayoutHoldUntil] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBankData();
  }, []);

  const fetchBankData = async () => {
    try {
        const response = await getCached("/teacher/profile", { maxAgeMs: 60_000 });
        
        const profileData = response.data.profile;
        if (profileData) {
            setBankName(profileData.bank_name || "");
            setAccountNumber(sanitizeDigits(profileData.account_number || "", 50));
            setAccountHolder(sanitizePersonName(profileData.account_name || "", 150));
            setPayoutHoldUntil(profileData.payout_hold_until || null);
        }
    } catch (error) {
        console.error("Gagal load data bank", error);
        notify.error("Gagal memuat data rekening.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if(!bankName || !accountNumber || !accountHolder || !currentPassword) {
        notify.error("Mohon lengkapi semua data rekening.");
        return;
    }
    if (!containsLetter(bankName)) {
        notify.error("Nama bank atau e-wallet wajib mengandung huruf.");
        return;
    }
    if (
        !isValidAccountNumber(accountNumber)
        || accountNumber.length < PAYOUT_ACCOUNT_MIN_DIGITS
        || accountNumber.length > PAYOUT_ACCOUNT_MAX_DIGITS
    ) {
        notify.error(`Nomor rekening atau e-wallet harus berisi ${PAYOUT_ACCOUNT_MIN_DIGITS}–${PAYOUT_ACCOUNT_MAX_DIGITS} digit.`);
        return;
    }
    if (!isValidPersonName(accountHolder)) {
        notify.error("Nama pemilik rekening harus berisi huruf dan tidak boleh memuat angka.");
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
        const response = await http.post("/teacher/bank", {
            bank_name: bankName,
            account_number: accountNumber,
            account_name: accountHolder,
            current_password: currentPassword,
        });
        setCurrentPassword("");
        const holdUntil = response.data?.payout_hold_until || null;
        setPayoutHoldUntil(holdUntil);

        notify.success("Rekening Berhasil Disimpan!", {
            description: holdUntil
              ? `Pencairan ditahan sampai ${new Date(holdUntil).toLocaleString("id-ID")}.`
              : "Data rekening tidak berubah.",
            icon: <CheckCircle2 className="text-emerald-600" />,
            style: { background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857' }
        });
    } catch (error) {
        notify.error(getApiError(error, "Gagal menyimpan rekening."));
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) return <TeacherLayout title="Pengaturan Rekening"><div className="grid min-h-[65dvh] place-items-center"><Loader2 className="animate-spin text-indigo-600"/></div></TeacherLayout>;

  return (
    <TeacherLayout title="Pengaturan Rekening">
      <div className="mx-auto max-w-5xl space-y-6 pb-10 sm:space-y-8">
          
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rekening Pencairan</h1>
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
               <CardContent className="space-y-5 p-4 sm:p-6">
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
                        <ShieldCheck size={16} className="text-slate-400" /> Konfirmasi Kata Sandi
                     </label>
                     <Input
                        type="password"
                        autoComplete="current-password"
                        placeholder="Kata sandi akun tutor"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-12 rounded-xl border-slate-200 focus:bg-white bg-slate-50 transition"
                     />
                     <p className="text-xs leading-5 text-slate-500">
                        Perubahan rekening menahan pencairan sementara dan mengirim notifikasi kepada admin.
                     </p>
                  </div>

                  {payoutHoldUntil && new Date(payoutHoldUntil) > new Date() && (
                     <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                        Pencairan ditahan sampai {new Date(payoutHoldUntil).toLocaleString("id-ID")}.
                     </div>
                  )}

                  <div className="space-y-2">
                     <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <CreditCard size={16} className="text-slate-400" /> Nomor Rekening
                     </label>
                     <Input 
                        placeholder="Contoh: 1234567890"
                        inputMode="numeric"
                        minLength={PAYOUT_ACCOUNT_MIN_DIGITS}
                        maxLength={PAYOUT_ACCOUNT_MAX_DIGITS}
                        autoComplete="off"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(sanitizeDigits(e.target.value, PAYOUT_ACCOUNT_MAX_DIGITS))}
                        className="h-12 rounded-xl border-slate-200 focus:bg-white bg-slate-50 transition font-mono tracking-wide text-lg"
                     />
                     <p className="text-xs leading-5 text-slate-500">
                        Masukkan {PAYOUT_ACCOUNT_MIN_DIGITS}–{PAYOUT_ACCOUNT_MAX_DIGITS} digit tanpa spasi atau tanda baca.
                     </p>
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <User size={16} className="text-slate-400" /> Atas Nama (Wajib Sesuai KTP)
                     </label>
                     <Input 
                        placeholder="Nama Pemilik Rekening"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(sanitizePersonName(e.target.value, 150))}
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
               <div className="group relative flex aspect-[1.58/1] w-full max-w-[360px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-5 text-white shadow-2xl shadow-indigo-200 transition-transform duration-500 sm:p-6 sm:hover:scale-105">
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
                     <p className="truncate text-center font-mono text-lg tracking-[0.08em] tabular-nums drop-shadow-md sm:text-xl md:text-2xl md:tracking-[0.12em]">
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
