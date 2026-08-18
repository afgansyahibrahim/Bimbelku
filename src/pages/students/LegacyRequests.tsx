import { notify } from "@/lib/notify";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  BookOpen,
  CalendarDays,
  Clock3,
  CreditCard,
  History,
  Loader2,
  MapPin,
  Monitor,
  Radar,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import http, { getApiError } from "@/lib/http";

type RequestItem = {
  id: number;
  subject_name: string;
  education_level: string;
  grade?: string;
  chapter?: string;
  learning_mode: "online" | "offline";
  class_type: "private" | "group";
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  status: string;
  total_amount: number;
  search_radius_km?: number;
  matched_teacher?: { id: number; name: string } | null;
  payment_due_at?: string | null;
  my_order?: { id: number; order_id: string; status: string; payment_rejection_reason?: string | null } | null;
};

type ListResponse = {
  data: RequestItem[];
  active_count?: number;
  history_count?: number;
};

const statusLabels: Record<string, string> = {
  group_forming: "Menunggu kelompok",
  group_decision_required: "Perlu keputusan",
  matching: "Mencari tutor",
  teacher_pending: "Menunggu tutor",
  teacher_selected: "Tutor ditemukan",
  teacher_accepted_waiting_group: "Menunggu anggota",
  no_teacher: "Tutor belum ditemukan",
  expired: "Pencarian berakhir",
  student_cooldown: "Pencarian dijeda",
  awaiting_payment: "Belum dibayar",
  payment_submitted: "Bukti diperiksa",
  payment_verified: "Pembayaran diterima",
  payment_rejected: "Bukti ditolak",
  cancelled: "Dibatalkan",
  payment_expired: "Pembayaran berakhir",
  completed: "Selesai",
  refund_pending: "Refund diproses",
  refunded: "Refund selesai",
};

const cancellable = [
  "group_forming", "group_decision_required", "matching", "teacher_pending",
  "no_teacher", "expired", "student_cooldown", "teacher_accepted_waiting_group",
  "awaiting_payment", "payment_rejected",
];

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(value || 0);

const scheduleLabel = (item: RequestItem) => {
  const date = new Date(`${item.scheduled_date.slice(0, 10)}T00:00:00`);
  const day = Number.isNaN(date.getTime())
    ? item.scheduled_date
    : date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${day}, ${item.start_time.slice(0, 5)}–${item.end_time.slice(0, 5)}`;
};

export default function LegacyRequests() {
  const navigate = useNavigate();
  const confirm = useConfirmDialog();
  const [scope, setScope] = useState<"active" | "history">("active");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [counts, setCounts] = useState({ active: 0, history: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get<ListResponse>("/student/booking-requests", {
        params: { legacy_only: 1, scope },
      });
      setItems(response.data.data || []);
      setCounts({
        active: Number(response.data.active_count || 0),
        history: Number(response.data.history_count || 0),
      });
    } catch (error) {
      notify.error(getApiError(error, "Permintaan lama gagal dimuat."));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { void load(); }, [load]);

  const postAction = async (item: RequestItem, path: string, payload?: unknown) => {
    setProcessing(item.id);
    try {
      const response = await http.post(`/student/booking-requests/${item.id}/${path}`, payload);
      notify.success(response.data.message);
      await load();
      return response.data;
    } catch (error) {
      notify.error(getApiError(error));
      return null;
    } finally {
      setProcessing(null);
    }
  };

  const cancelRequest = async (item: RequestItem) => {
    const approved = await confirm({
      title: "Batalkan permintaan lama?",
      description: "Pencarian dan penawaran tutor untuk jadwal ini akan dihentikan.",
      confirmText: "Ya, batalkan",
      tone: "danger",
    });
    if (approved) await postAction(item, "cancel");
  };

  const acceptTeacher = async (item: RequestItem) => {
    const approved = await confirm({
      title: "Terima tutor ini?",
      description: `Tutor akan dikunci untuk ${scheduleLabel(item)}. Pembayaran ${rupiah(item.total_amount)} perlu diselesaikan setelahnya.`,
      confirmText: "Terima tutor",
    });
    if (!approved) return;
    const result = await postAction(item, "teacher-decision", { action: "accept" });
    if (result?.order_id) openPayment(item, result.order_id, result.payment_due_at);
  };

  const rejectTeacher = async (item: RequestItem) => {
    const approved = await confirm({
      title: "Tolak tutor ini?",
      description: "Tutor akan dilepas dan pencarian lama dilanjutkan bila jadwal masih memungkinkan.",
      confirmText: "Tolak dan lanjutkan",
      tone: "danger",
    });
    if (approved) await postAction(item, "teacher-decision", { action: "reject", reason: "material_mismatch" });
  };

  const decideGroup = async (item: RequestItem, action: "convert_private" | "cancel") => {
    const convert = action === "convert_private";
    const approved = await confirm({
      title: convert ? "Ubah menjadi privat?" : "Batalkan permintaan kelompok?",
      description: convert
        ? "Tarif lama akan dihitung ulang sebagai privat untuk menyelesaikan permintaan yang sudah berjalan."
        : "Permintaan lama akan ditutup tanpa membuat tagihan baru.",
      confirmText: convert ? "Ubah ke privat" : "Batalkan",
      tone: convert ? "primary" : "danger",
    });
    if (approved) await postAction(item, "group-decision", { action });
  };

  const openPayment = (item: RequestItem, orderId = item.my_order?.id, dueAt = item.payment_due_at) => {
    if (!orderId) return notify.error("Data tagihan belum tersedia.");
    navigate("/payment", { state: {
      orderId,
      invoiceId: item.my_order?.order_id,
      tutorName: item.matched_teacher?.name || "Tutor",
      subject: item.subject_name,
      type: `${item.learning_mode === "online" ? "Online" : "Offline"} · Privat 1-on-1`,
      price: Number(item.total_amount),
      date: item.scheduled_date,
      paymentDueAt: dueAt,
      rejectionReason: item.my_order?.payment_rejection_reason,
      durationHours: Number(item.duration_hours || 1),
      orderKind: "booking",
    } });
  };

  return (
    <StudentLayout title="Permintaan Lama">
      <div className="mx-auto max-w-6xl space-y-6 pb-20">
        <section className="rounded-[1.75rem] bg-gradient-to-br from-slate-950 to-indigo-950 p-5 text-white sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><Archive /></span>
            <div><p className="text-xs font-black uppercase tracking-[.2em] text-indigo-200">Data sebelum Paket Baru</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Permintaan lama</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/75">Halaman ini hanya menyelesaikan permintaan yang pernah dibuat. Paket baru tetap dibuat melalui menu Tambah Paket.</p></div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-100 bg-white p-2">
          <button type="button" onClick={() => setScope("active")} className={`min-h-11 rounded-xl px-3 text-sm font-black ${scope === "active" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>Masih berjalan ({counts.active})</button>
          <button type="button" onClick={() => setScope("history")} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black ${scope === "history" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}><History size={16} /> Riwayat ({counts.history})</button>
        </section>

        {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-indigo-600" /></div> : items.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white py-16 text-center"><BookOpen className="mx-auto text-slate-300" /><p className="mt-3 font-black text-slate-700">{scope === "active" ? "Tidak ada permintaan lama yang berjalan" : "Riwayat permintaan lama masih kosong"}</p></div>
        ) : <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => (
          <article key={item.id} className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Permintaan lama #{item.id}</p><h2 className="mt-1 truncate text-xl font-black text-slate-900">{item.subject_name}</h2><p className="mt-1 text-xs text-slate-500">{item.education_level}{item.grade ? ` · ${item.grade}` : ""}{item.chapter ? ` · ${item.chapter}` : ""}</p></div><span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-black text-indigo-700">{statusLabels[item.status] || item.status}</span></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Info icon={CalendarDays} text={scheduleLabel(item)} />
              <Info icon={item.learning_mode === "online" ? Monitor : MapPin} text={item.learning_mode === "online" ? "Online" : `Offline · ${item.search_radius_km || 3} km`} />
              <Info icon={UserRound} text={item.class_type === "private" ? "Privat 1-on-1" : "Kelompok lama"} />
              <Info icon={CreditCard} text={rupiah(item.total_amount)} />
            </div>
            {item.matched_teacher && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800"><span className="font-black">Tutor:</span> {item.matched_teacher.name}</div>}
            {item.my_order?.payment_rejection_reason && <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">Alasan admin: {item.my_order.payment_rejection_reason}</div>}
            {scope === "active" && <div className="mt-4 flex flex-wrap gap-2">
              {["awaiting_payment", "payment_rejected"].includes(item.status) && <Button onClick={() => openPayment(item)} className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"><CreditCard size={15} className="mr-2" />Bayar</Button>}
              {item.status === "teacher_selected" && <><Button variant="outline" onClick={() => rejectTeacher(item)} disabled={processing === item.id} className="rounded-xl text-rose-600">Tolak tutor</Button><Button onClick={() => acceptTeacher(item)} disabled={processing === item.id} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">Terima tutor</Button></>}
              {item.status === "no_teacher" && item.learning_mode === "offline" && (item.search_radius_km || 3) < 12 && <Button variant="outline" onClick={() => postAction(item, "expand-radius")} disabled={processing === item.id} className="rounded-xl"><Radar size={15} className="mr-2" />Perluas radius</Button>}
              {["no_teacher", "expired"].includes(item.status) && <Button variant="outline" onClick={() => postAction(item, "extend")} disabled={processing === item.id} className="rounded-xl"><RefreshCw size={15} className="mr-2" />Perpanjang</Button>}
              {item.status === "group_decision_required" && <><Button onClick={() => decideGroup(item, "convert_private")} disabled={processing === item.id} className="rounded-xl">Ubah ke privat</Button><Button variant="outline" onClick={() => decideGroup(item, "cancel")} disabled={processing === item.id} className="rounded-xl text-rose-600">Batalkan</Button></>}
              {cancellable.includes(item.status) && item.status !== "group_decision_required" && <Button variant="ghost" onClick={() => cancelRequest(item)} disabled={processing === item.id} className="rounded-xl text-rose-600"><XCircle size={15} className="mr-2" />Batalkan</Button>}
            </div>}
          </article>
        ))}</div>}
      </div>
    </StudentLayout>
  );
}

function Info({ icon: Icon, text }: { icon: typeof Clock3; text: string }) {
  return <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600"><Icon size={14} className="shrink-0 text-indigo-500" /><span className="truncate font-bold">{text}</span></div>;
}
