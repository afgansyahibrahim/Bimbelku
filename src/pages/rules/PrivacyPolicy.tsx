import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, LockKeyhole, MapPinned, ShieldCheck } from "lucide-react";

const sections = [
  {
    title: "Data yang dikumpulkan",
    text: "Kami memproses data akun, kontak, tanggal lahir murid, persetujuan kebijakan, profil akademik, pilihan Paket Belajar, mata pelajaran, bab, subbab, tujuan belajar, jadwal, keikutsertaan Kelas Murah, lampiran soal, pesan bantuan, notifikasi, rating, serta catatan transaksi, mutasi Saldo BimbelKu, dan tujuan refund rekening atau e-wallet yang dipilih murid. Data booking lama yang masih dibutuhkan untuk penyelesaian transaksi atau riwayat sistem dapat tetap disimpan. Untuk murid di bawah 18 tahun, nama, nomor, hubungan, dan waktu persetujuan orang tua atau wali juga dicatat. Untuk tutor, data mencakup kartu identitas, foto wajah langsung, ijazah atau bukti kualifikasi, rekening pencairan, lokasi dasar, dan jadwal tersedia.",
  },
  {
    title: "Lokasi dan sesi offline",
    text: "Koordinat dan alamat digunakan ketika layanan offline memerlukannya untuk pencocokan jarak dan pelaksanaan sesi. Kandidat tutor tidak menerima alamat lengkap sebelum hubungan belajar mencapai tahap yang diizinkan sistem. Alamat atau tautan peta hanya dibuka kepada tutor yang sudah dipasangkan ketika status sesi mengizinkannya. Data lokasi tidak digunakan untuk membuka daftar tutor publik kepada murid.",
  },
  {
    title: "Bukti pembayaran dan pelaksanaan",
    text: "Bukti transfer, nama pengirim, bank, data rekening atau e-wallet tujuan refund, mutasi Saldo BimbelKu, foto pelaksanaan, laporan ketidakhadiran, bukti keadaan darurat, bukti refund, dan bukti pencairan disimpan untuk verifikasi serta penyelesaian sengketa. Jangan mengunggah informasi yang tidak diperlukan. Dokumen kesehatan boleh menyembunyikan diagnosis dan informasi medis pribadi selama identitas, waktu, dan terjadinya keadaan tetap dapat diperiksa.",
  },
  {
    title: "Tujuan penggunaan",
    text: "Data digunakan untuk autentikasi, verifikasi tutor, penyusunan Paket Belajar, pencocokan tutor setelah pembayaran Paket Belajar dinyatakan diterima, pengelolaan Kelas Murah, pencocokan materi dan jadwal, perhitungan jarak, pemrosesan transfer dan Saldo BimbelKu, komisi, refund, pencairan, pencegahan bentrok, penanganan laporan, keamanan akun, dukungan pengguna, dan pemenuhan kewajiban hukum.",
  },
  {
    title: "Pihak yang dapat menerima data",
    text: "Data hanya dibuka sesuai kebutuhan kepada admin yang berwenang, pengguna yang telah dipasangkan, penyedia infrastruktur teknis, serta otoritas jika diwajibkan hukum. Email, nomor pribadi, data wali, dan rekening tidak diberikan kepada pasangan belajar kecuali ada kebutuhan operasional yang secara eksplisit diizinkan sistem. Komunikasi pengguna disiapkan melalui fitur internal. BimbelKu tidak menjual data pribadi.",
  },
  {
    title: "Penyimpanan dan keamanan",
    text: "Kami menerapkan kontrol akses berbasis peran, autentikasi token, pembatasan ukuran dan jenis berkas, serta pencatatan keputusan admin. Data disimpan selama akun atau proses transaksi, sengketa, refund, dan kewajiban pencatatan masih aktif. Tidak ada sistem yang sepenuhnya bebas risiko; pengguna wajib menjaga kata sandi dan segera melaporkan akses yang tidak dikenal.",
  },
  {
    title: "Hak pengguna",
    text: "Pengguna dapat memperbarui profil, meminta koreksi data, menanyakan penggunaan data, atau meminta penghapusan data yang tidak lagi wajib disimpan melalui Pusat Bantuan. Permintaan dapat ditolak atau ditunda jika data masih diperlukan untuk transaksi, sengketa, pencegahan penipuan, atau kewajiban hukum.",
  },
];

export default function PrivacyPolicy() {
  const location = useLocation();
  const navigate = useNavigate();

  const goBack = () => {
    const state = location.state as { from?: unknown } | null;
    const from = typeof state?.from === "string" && state.from.startsWith("/") && !state.from.startsWith("//")
      ? state.from
      : null;

    if (from) {
      navigate(from);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    try {
      const role = JSON.parse(localStorage.getItem("user") || "null")?.role;
      navigate(role === "student" ? "/student/account" : role === "teacher" ? "/guru/saya" : role === "admin" ? "/admin" : "/");
    } catch {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-16 text-slate-600">
      <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-100/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="text-xl font-black tracking-tight text-slate-950">BimbelKu</Link>
          <button type="button" onClick={goBack} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-950">
            <ArrowLeft size={16} /> Kembali
          </button>
        </div>
      </nav>

      <main className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-[2.5rem] border border-white bg-white px-6 py-10 shadow-xl shadow-slate-200/60 md:px-14 md:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-700">
            <ShieldCheck size={14} /> Versi 15 Agustus 2026
          </span>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Kebijakan Privasi</h1>
          <p className="mt-4 leading-7 text-slate-500">Penjelasan ringkas tentang data yang diperlukan dan cara BimbelKu menggunakannya.</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <PrivacyCard icon={LockKeyhole} title="Akses terbatas" text="Hak akses dipisahkan untuk murid, tutor, dan admin." />
          <PrivacyCard icon={MapPinned} title="Lokasi seperlunya" text="Koordinat digunakan hanya untuk layanan offline." />
          <PrivacyCard icon={Eye} title="Tidak dijual" text="Data pribadi tidak diperdagangkan kepada pihak lain." />
        </div>

        <div className="mt-12 space-y-10">
          {sections.map((section, index) => (
            <section key={section.title} className="grid gap-4 md:grid-cols-[3rem_1fr]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-sm font-black text-white">{index + 1}</span>
              <div>
                <h2 className="text-xl font-black text-slate-950">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{section.text}</p>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          Pertanyaan, koreksi, atau permintaan terkait privasi dapat dikirim melalui menu <strong className="text-slate-900">Pusat Bantuan</strong>. Admin akan memeriksa identitas pemohon sebelum memberikan atau mengubah data.
        </div>
      </main>
    </div>
  );
}

function PrivacyCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <Icon className="text-blue-600" size={22} />
      <h2 className="mt-3 font-black text-slate-900">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}
