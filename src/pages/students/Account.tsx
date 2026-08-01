import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgePercent,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  History,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
} from "lucide-react";

import StudentLayout from "@/components/StudentLayout";
import { getCached } from "@/lib/http";

type Student = {
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string | null;
  avatar?: string | null;
  student_education_level?: string | null;
  grade?: string | null;
  school_name?: string | null;
  address?: string | null;
};

type Shortcut = {
  label: string;
  description: string;
  to?: string;
  icon: typeof UserRound;
  action?: () => void;
};

const Group = ({ title, items }: { title: string; items: Shortcut[] }) => (
  <section className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm">
    <h2 className="border-b border-slate-100 px-5 py-4 text-sm font-black text-slate-900 sm:px-6">{title}</h2>
    <div className="divide-y divide-slate-100">
      {items.map(({ label, description, to, icon: Icon, action }) => {
        const content = (
          <>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={20} /></span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-black text-slate-800">{label}</span>
              <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500">{description}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-300" />
          </>
        );
        const className = "flex min-h-16 w-full items-center gap-3 px-5 py-3 transition hover:bg-slate-50 sm:px-6";
        return to ? <Link key={label} to={to} className={className}>{content}</Link> : <button key={label} type="button" onClick={action} className={className}>{content}</button>;
      })}
    </div>
  </section>
);

export default function Account() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getCached<Student>("/user", { maxAgeMs: 60_000 })
      .then((response) => setStudent(response.data))
      .finally(() => setLoading(false));
  }, []);

  const openTutorial = () => window.dispatchEvent(new Event("bimbelku:open-tutorial"));

  return (
    <StudentLayout title="Saya">
      <div className="mx-auto max-w-5xl space-y-5">
        <section data-tour="student-account-card" className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8">
          {loading ? (
            <div className="h-24 animate-pulse rounded-3xl bg-white/10" role="status" aria-label="Memuat profil" />
          ) : (
            <>
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/15 text-xl font-black ring-4 ring-white/10 sm:h-20 sm:w-20 sm:rounded-3xl sm:text-2xl">
                  {student?.avatar_url || student?.avatar ? <img src={student.avatar_url || student.avatar || ""} alt="Foto profil" className="h-full w-full object-cover" /> : student?.name?.charAt(0) || "M"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Akun murid</p>
                  <h1 className="mt-1 truncate text-xl font-black sm:text-2xl">{student?.name || "Murid BimbelKu"}</h1>
                  <p className="mt-1 text-sm font-medium text-slate-300">
                    {[student?.student_education_level, student?.grade, student?.school_name].filter(Boolean).join(" • ") || student?.email || "Lengkapi profil belajar agar pesanan lebih cepat dibuat."}
                  </p>
                </div>
                <Link to="/student/profile" className="hidden min-h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-slate-900 hover:bg-blue-50 sm:inline-flex">Edit Profil</Link>
              </div>
              <Link to="/student/profile" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-slate-900 hover:bg-blue-50 sm:hidden">Edit Profil</Link>
            </>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Group title="Belajar dan paket" items={[
            { label: "Paket Saya", description: "Pantau pembayaran, pencarian tutor, dan paket aktif.", to: "/student/packages", icon: BookOpenCheck },
            { label: "Jadwal dan riwayat sesi", description: "Lihat sesi mendatang serta pembelajaran yang selesai.", to: "/student/my-classes", icon: CalendarDays },
            { label: "Perkembangan Belajar", description: "Buka catatan materi dan perkembangan tiap sesi.", to: "/student/progress", icon: GraduationCap },
            { label: "Tutor Saya", description: "Lihat tutor pada paket yang sudah aktif.", to: "/student/packages", icon: Star },
            { label: "Perpanjang Paket", description: "Perpanjangan tersedia menjelang masa paket berakhir.", to: "/student/packages", icon: RefreshCw },
          ]} />
          <Group title="Transaksi dan penawaran" items={[
            { label: "Voucher Saya", description: "Lihat voucher yang sudah diklaim dan masa berlakunya.", to: "/student/vouchers", icon: BadgePercent },
            { label: "Pembayaran dan tagihan", description: "Periksa tagihan aktif dan riwayat transfer.", to: "/student/history", icon: CreditCard },
            { label: "Riwayat transaksi", description: "Pantau status pembayaran, refund, dan bukti transfer.", to: "/student/history", icon: History },
            { label: "Refund dan keberatan", description: "Lihat status pengembalian dana atau minta bantuan kasus.", to: "/student/help", icon: WalletCards },
            { label: "Catatan tutor", description: "Buka ringkasan dan bukti pembelajaran dari tutor.", to: "/student/progress", icon: ClipboardList },
          ]} />
          <Group title="Pengaturan akun" items={[
            { label: "Profil dan lokasi belajar", description: "Atur identitas, pendidikan, alamat, dan persetujuan lokasi.", to: "/student/profile", icon: UserRound },
            { label: "Keamanan akun", description: "Ubah kata sandi dan periksa perlindungan akun.", to: "/student/profile", icon: LockKeyhole },
            { label: "Notifikasi", description: "Notifikasi terbaru tersedia dari ikon lonceng di bagian atas.", to: "/student/dashboard", icon: Bell },
            { label: "Privasi", description: "Baca kebijakan penggunaan dan perlindungan data.", to: "/privacy", icon: ShieldCheck },
          ]} />
          <Group title="Bantuan dan informasi" items={[
            { label: "Tutorial penggunaan", description: "Tampilkan kembali panduan dengan tombol target yang tetap terang.", icon: CircleHelp, action: openTutorial },
            { label: "Pusat Bantuan", description: "Temukan jawaban atau kirim permintaan bantuan.", to: "/student/help", icon: MessageSquareText },
            { label: "Syarat dan ketentuan", description: "Baca aturan layanan BimbelKu.", to: "/terms", icon: FileText },
          ]} />
        </div>
      </div>
    </StudentLayout>
  );
}
