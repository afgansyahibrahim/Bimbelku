import { useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import http, { getApiError } from "@/lib/http";
import { toast } from "sonner";

type SecurityStatus = {
  enabled: boolean;
  confirmed_at?: string | null;
  authorized_until?: string | null;
};

type AuditItem = {
  id: number;
  action: string;
  method: string;
  response_status: number;
  created_at: string;
  entry_hash: string;
};

export default function FinanceSecurity() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [authorizeCode, setAuthorizeCode] = useState("");
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [busy, setBusy] = useState("");

  const authorized = Boolean(
    status?.authorized_until && new Date(status.authorized_until) > new Date(),
  );

  const loadStatus = async () => {
    const response = await http.get<SecurityStatus>("/admin/finance-security");
    setStatus(response.data);
    if (
      response.data.authorized_until
      && new Date(response.data.authorized_until) > new Date()
    ) {
      const logs = await http.get("/admin/finance-audit");
      setAudit(logs.data?.audit || []);
    } else {
      setAudit([]);
    }
  };

  useEffect(() => {
    loadStatus().catch((error) => toast.error(getApiError(error, "Status keamanan gagal dimuat.")));
  }, []);

  const startSetup = async () => {
    if (!password) return toast.error("Masukkan kata sandi akun admin.");
    setBusy("setup");
    try {
      const response = await http.post("/admin/finance-security/setup", {
        current_password: password,
      });
      setSecret(response.data.secret);
      setPassword("");
      toast.success("Kunci autentikator berhasil dibuat.");
    } catch (error) {
      toast.error(getApiError(error, "Pengaturan gagal dibuat."));
    } finally {
      setBusy("");
    }
  };

  const confirmSetup = async () => {
    setBusy("confirm");
    try {
      await http.post("/admin/finance-security/confirm", { code: setupCode });
      setSetupCode("");
      setSecret("");
      await loadStatus();
      toast.success("Verifikasi dua langkah keuangan telah aktif.");
    } catch (error) {
      toast.error(getApiError(error, "Kode tidak dapat dikonfirmasi."));
    } finally {
      setBusy("");
    }
  };

  const authorize = async () => {
    setBusy("authorize");
    try {
      await http.post("/admin/finance-security/authorize", { code: authorizeCode });
      setAuthorizeCode("");
      await loadStatus();
      toast.success("Tindakan keuangan dibuka sementara.");
    } catch (error) {
      toast.error(getApiError(error, "Kode autentikator tidak sesuai."));
    } finally {
      setBusy("");
    }
  };

  return (
    <AdminLayout title="Keamanan Keuangan">
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Perlindungan admin</p>
              <h1 className="mt-3 text-2xl font-black sm:text-3xl">Verifikasi dua langkah keuangan</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/75">
                Pembayaran, refund, komisi, rekening, dan pencairan hanya dapat diubah setelah kode autentikator diperiksa.
              </p>
            </div>
            <div className={`rounded-2xl border px-5 py-4 ${authorized ? "border-emerald-400/30 bg-emerald-400/10" : "border-amber-300/30 bg-amber-300/10"}`}>
              <p className="text-xs font-black uppercase tracking-wider">{authorized ? "Akses aktif" : status?.enabled ? "Terkunci" : "Belum diaktifkan"}</p>
              <p className="mt-1 text-xs text-white/70">
                {authorized && status?.authorized_until
                  ? `Sampai ${new Date(status.authorized_until).toLocaleTimeString("id-ID")}`
                  : "Tindakan sensitif tetap diblokir"}
              </p>
            </div>
          </div>
        </section>

        {!status?.enabled && !secret && (
          <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><KeyRound /></div>
              <div className="flex-1">
                <h2 className="text-lg font-black text-slate-900">1. Buat kunci autentikator</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Kata sandi diminta sebelum kunci baru diterbitkan.</p>
                <div className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row">
                  <Input type="password" autoComplete="current-password" placeholder="Kata sandi admin" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-xl" />
                  <Button onClick={startSetup} disabled={busy === "setup"} className="h-12 rounded-xl bg-slate-950 px-6">
                    {busy === "setup" ? <Loader2 className="animate-spin" /> : "Buat kunci"}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {secret && (
          <section className="rounded-[2rem] border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">2. Tambahkan ke aplikasi autentikator</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Masukkan kunci berikut ke Google Authenticator, Microsoft Authenticator, atau aplikasi TOTP lain.</p>
            <div className="mt-4 flex max-w-2xl items-center gap-2 rounded-2xl bg-slate-950 p-4 text-white">
              <code className="min-w-0 flex-1 break-all text-sm font-black tracking-[.15em]">{secret}</code>
              <Button
                size="icon"
                variant="outline"
                className="shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => navigator.clipboard.writeText(secret).then(() => toast.success("Kunci disalin."))}
              >
                <Copy size={16} />
              </Button>
            </div>
            <div className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row">
              <Input inputMode="numeric" maxLength={6} placeholder="Kode 6 angka" value={setupCode} onChange={(event) => setSetupCode(event.target.value.replace(/\D/g, ""))} className="h-12 rounded-xl" />
              <Button onClick={confirmSetup} disabled={setupCode.length !== 6 || busy === "confirm"} className="h-12 rounded-xl bg-indigo-600 px-6 hover:bg-indigo-700">
                {busy === "confirm" ? <Loader2 className="animate-spin" /> : "Aktifkan"}
              </Button>
            </div>
          </section>
        )}

        {status?.enabled && !authorized && (
          <section className="rounded-[2rem] border border-amber-100 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600"><LockKeyhole /></div>
              <div className="flex-1">
                <h2 className="text-lg font-black text-slate-900">Buka tindakan keuangan</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Masukkan kode terbaru. Akses akan terkunci kembali secara otomatis.</p>
                <div className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row">
                  <Input inputMode="numeric" maxLength={6} placeholder="Kode 6 angka" value={authorizeCode} onChange={(event) => setAuthorizeCode(event.target.value.replace(/\D/g, ""))} className="h-12 rounded-xl" />
                  <Button onClick={authorize} disabled={authorizeCode.length !== 6 || busy === "authorize"} className="h-12 rounded-xl bg-slate-950 px-6">
                    {busy === "authorize" ? <Loader2 className="animate-spin" /> : "Buka sementara"}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {authorized && (
          <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-600" />
                <div><h2 className="font-black text-slate-900">Audit tindakan terakhir</h2><p className="text-xs text-slate-500">Catatan bersifat permanen dan berantai.</p></div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => loadStatus()}><RefreshCw size={14} className="mr-2" />Muat ulang</Button>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-400"><tr><th className="pb-3">Waktu</th><th className="pb-3">Tindakan</th><th className="pb-3">Status</th><th className="pb-3">Hash</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {audit.slice(0, 20).map((item) => (
                    <tr key={item.id}><td className="py-3 text-slate-500">{new Date(item.created_at).toLocaleString("id-ID")}</td><td className="py-3 font-bold text-slate-800">{item.action}</td><td className="py-3">{item.response_status}</td><td className="py-3 font-mono text-xs text-slate-400">{item.entry_hash.slice(0, 16)}…</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
