import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openProtectedFile } from "@/components/ProtectedImage";
import http, { getApiError } from "@/lib/http";
import { validateUpload } from "@/lib/validation";

type RefundItem = {
  id: number;
  order_id?: string | null;
  student?: { id: number; name: string; email: string } | null;
  subject?: string | null;
  amount: number;
  reason: string;
  status: string;
  destination_method?: "bank_transfer" | "bimbelku_balance" | null;
  bank_destination: {
    bank_name?: string | null;
    account_name?: string | null;
    account_number?: string | null;
    is_complete: boolean;
  };
  wallet_balance_after?: number | null;
  proof_url?: string | null;
  notes?: string | null;
  processor?: { id: number; name: string } | null;
  processed_at?: string | null;
  created_at: string;
};

type RefundResponse = {
  summary: {
    pending_count: number;
    pending_amount: number;
    bank_paid_30_days: number;
    wallet_credited_30_days: number;
    wallet_liability: number;
  };
  pending: RefundItem[];
  history: RefundItem[];
};

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(value || 0);

const dateTime = (value?: string | null) => value
  ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
  : "-";

export default function RefundManagement() {
  const confirm = useConfirmDialog();
  const [data, setData] = useState<RefundResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RefundItem | null>(null);
  const [destination, setDestination] = useState<"bank_transfer" | "bimbelku_balance">("bank_transfer");
  const [proof, setProof] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await http.get<RefundResponse>("/admin/finance/refunds");
      setData(response.data);
    } catch (error) {
      toast.error(getApiError(error, "Data refund tidak dapat dimuat."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => {
    const source = tab === "pending" ? data?.pending || [] : data?.history || [];
    const needle = search.trim().toLowerCase();
    if (!needle) return source;
    return source.filter((item) => [item.order_id, item.student?.name, item.student?.email, item.subject, item.reason]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle)));
  }, [data, search, tab]);

  const openProcess = (item: RefundItem) => {
    setSelected(item);
    setDestination(item.bank_destination.is_complete ? "bank_transfer" : "bimbelku_balance");
    setProof(null);
    setNotes("");
  };

  const chooseProof = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const error = validateUpload(file, {
      label: "Bukti refund",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "webp"],
    });
    if (error) {
      toast.error(error);
      event.target.value = "";
      return;
    }
    setProof(file);
  };

  const complete = async () => {
    if (!selected) return;
    if (destination === "bank_transfer" && !selected.bank_destination.is_complete) {
      toast.error("Tujuan rekening refund belum lengkap.");
      return;
    }
    if (destination === "bank_transfer" && !proof) {
      toast.error("Bukti transfer refund wajib diunggah.");
      return;
    }

    const approved = await confirm({
      title: destination === "bimbelku_balance" ? "Masukkan refund ke Saldo BimbelKu?" : "Catat transfer refund?",
      description: destination === "bimbelku_balance"
        ? `${rupiah(selected.amount)} akan masuk ke saldo murid dan dicatat sebagai satu mutasi yang tidak dapat diedit.`
        : `Pastikan ${rupiah(selected.amount)} sudah ditransfer ke rekening asal yang ditampilkan.`,
      confirmText: destination === "bimbelku_balance" ? "Masukkan ke saldo" : "Sudah ditransfer",
      tone: "warning",
    });
    if (!approved) return;

    const form = new FormData();
    form.append("destination_method", destination);
    if (proof) form.append("proof", proof);
    if (notes.trim()) form.append("notes", notes.trim());

    setProcessing(true);
    try {
      const response = await http.post(`/admin/refunds/${selected.id}/complete`, form);
      toast.success(response.data?.message || "Refund berhasil diselesaikan.");
      setSelected(null);
      await load();
    } catch (error) {
      toast.error(getApiError(error, "Refund tidak dapat diproses."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AdminLayout title="Refund & Saldo BimbelKu" subtitle="Refund bank dan kredit saldo dipisahkan serta memiliki jejak mutasi">
      <div className="space-y-6 pb-16">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon={Clock3} label="Menunggu" value={String(data?.summary.pending_count || 0)} detail={rupiah(data?.summary.pending_amount || 0)} tone="amber" />
          <Metric icon={Landmark} label="Transfer 30 hari" value={rupiah(data?.summary.bank_paid_30_days || 0)} detail="Dikembalikan ke rekening asal" tone="emerald" />
          <Metric icon={WalletCards} label="Kredit saldo 30 hari" value={rupiah(data?.summary.wallet_credited_30_days || 0)} detail="Masuk Saldo BimbelKu" tone="indigo" />
          <Metric icon={CreditCard} label="Total kewajiban saldo" value={rupiah(data?.summary.wallet_liability || 0)} detail="Akumulasi saldo murid saat ini" tone="slate" />
          <Metric icon={CheckCircle2} label="Aturan nominal" value="Refund penuh" detail="Nilai tidak dapat diubah saat diproses" tone="rose" />
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setTab("pending")} className={`min-h-10 rounded-lg px-4 text-sm font-black ${tab === "pending" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Perlu diproses ({data?.pending.length || 0})</button><button type="button" onClick={() => setTab("history")} className={`min-h-10 rounded-lg px-4 text-sm font-black ${tab === "history" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Riwayat</button></div>
            <div className="flex flex-col gap-2 sm:flex-row"><label className="relative sm:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari invoice atau murid" className="h-11 rounded-xl pl-9" /></label><Button variant="outline" onClick={() => void load()} disabled={loading} className="h-11 rounded-xl"><RefreshCw size={16} className={loading ? "mr-2 animate-spin" : "mr-2"} />Muat ulang</Button></div>
          </div>

          {loading ? <div className="grid min-h-72 place-items-center"><Loader2 className="animate-spin text-indigo-600" /></div> : rows.length === 0 ? <div className="grid min-h-72 place-items-center p-8 text-center"><div><CheckCircle2 className="mx-auto text-emerald-500" size={40} /><p className="mt-3 font-black text-slate-800">Tidak ada refund pada tampilan ini.</p></div></div> : <div className="divide-y divide-slate-100">{rows.map((item) => <article key={item.id} className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1fr_.9fr_.8fr_auto] xl:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-950">{item.student?.name || "Murid"}</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{item.order_id || `Refund #${item.id}`}</span></div><p className="mt-1 truncate text-sm font-semibold text-slate-600">{item.subject || "Pesanan belajar"}</p><p className="mt-2 text-xs leading-5 text-slate-500">{item.reason}</p></div><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Nominal penuh</p><p className="mt-1 text-lg font-black text-rose-700">{rupiah(item.amount)}</p><p className="mt-1 text-xs text-slate-400">Dibuat {dateTime(item.created_at)}</p></div><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Tujuan</p>{item.destination_method === "bimbelku_balance" ? <p className="mt-1 text-sm font-black text-indigo-700">Saldo BimbelKu</p> : <><p className="mt-1 text-sm font-bold text-slate-700">{item.bank_destination.bank_name || "Rekening asal"}</p><p className="mt-1 text-xs text-slate-500">{item.bank_destination.account_name || "-"} · {item.bank_destination.account_number || "-"}</p></>}{tab === "history" && <><p className="mt-2 text-xs text-slate-400">{item.processor?.name || "Admin"} · {dateTime(item.processed_at)}</p>{item.destination_method === "bimbelku_balance" && item.wallet_balance_after !== null && item.wallet_balance_after !== undefined && <p className="mt-1 text-xs font-bold text-indigo-600">Saldo setelah refund: {rupiah(item.wallet_balance_after)}</p>}</>}</div><div className="flex flex-wrap gap-2 xl:justify-end">{tab === "pending" ? <Button onClick={() => openProcess(item)} className="h-10 rounded-xl bg-slate-950"><ArrowDownToLine size={15} className="mr-2" />Proses refund</Button> : <>{item.proof_url && <Button variant="outline" className="h-10 rounded-xl" onClick={() => void openProtectedFile(item.proof_url!, `bukti-refund-${item.id}`).catch(() => toast.error("Bukti refund tidak dapat dibuka."))}><FileText size={15} className="mr-2" />Bukti</Button>}<span className={`inline-flex h-10 items-center rounded-xl px-3 text-xs font-black ${item.destination_method === "bimbelku_balance" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>{item.destination_method === "bimbelku_balance" ? "Masuk saldo" : "Transfer selesai"}</span></>}</div></article>)}</div>}
        </section>
      </div>

      {selected && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-black text-slate-950">Selesaikan refund {selected.order_id}</p><p className="mt-1 text-sm text-slate-500">Nominal terkunci: <strong>{rupiah(selected.amount)}</strong></p></div><button type="button" aria-label="Tutup" onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100"><X size={18} /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setDestination("bank_transfer")} className={`rounded-2xl border p-4 text-left ${destination === "bank_transfer" ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}><Landmark className="text-emerald-700" /><p className="mt-3 font-black text-slate-950">Transfer ke rekening asal</p><p className="mt-1 text-xs leading-5 text-slate-500">Wajib unggah bukti transfer. Tujuan memakai data saat pembayaran.</p></button><button type="button" onClick={() => setDestination("bimbelku_balance")} className={`rounded-2xl border p-4 text-left ${destination === "bimbelku_balance" ? "border-indigo-400 bg-indigo-50" : "border-slate-200"}`}><WalletCards className="text-indigo-700" /><p className="mt-3 font-black text-slate-950">Masuk Saldo BimbelKu</p><p className="mt-1 text-xs leading-5 text-slate-500">Saldo dan mutasinya dibuat otomatis tanpa mengunggah bukti transfer.</p></button></div>{destination === "bank_transfer" && <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Tujuan transfer</p><p className="mt-2 font-black text-slate-900">{selected.bank_destination.bank_name || "Belum lengkap"}</p><p className="mt-1 text-sm text-slate-600">{selected.bank_destination.account_name || "-"} · {selected.bank_destination.account_number || "-"}</p>{!selected.bank_destination.is_complete && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">Data rekening asal belum lengkap. Gunakan Saldo BimbelKu atau minta murid melengkapi data melalui bantuan.</p>}<label className="mt-4 block text-xs font-black text-slate-600">Bukti transfer<input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={chooseProof} className="mt-2 block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-black file:text-indigo-700" /></label></div>}<label className="mt-5 block text-xs font-black text-slate-600">Catatan admin<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="Opsional: nomor referensi transfer atau catatan pemeriksaan" /></label><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setSelected(null)} className="rounded-xl">Batal</Button><Button onClick={() => void complete()} disabled={processing} className="rounded-xl bg-slate-950">{processing && <Loader2 size={15} className="mr-2 animate-spin" />}{destination === "bimbelku_balance" ? "Masukkan ke saldo" : "Catat transfer"}</Button></div></div></div>}
    </AdminLayout>
  );
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof CreditCard; label: string; value: string; detail: string; tone: "amber" | "emerald" | "indigo" | "slate" | "rose" }) {
  const styles = { amber: "bg-amber-50 text-amber-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700", slate: "bg-slate-100 text-slate-700", rose: "bg-rose-50 text-rose-700" }[tone];
  return <article className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${styles}`}><Icon size={20} /></span><p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></article>;
}
