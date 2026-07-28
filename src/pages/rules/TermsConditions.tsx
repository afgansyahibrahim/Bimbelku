import { Link } from "react-router-dom";
import { ArrowLeft, CircleAlert, FileCheck2, Scale } from "lucide-react";

const sections = [
  {
    title: "Akun dan kelayakan pengguna",
    content: (
      <>
        <p>Murid wajib memberikan data yang benar dan menjaga keamanan akun. Pengguna di bawah usia 18 tahun harus menggunakan layanan dengan pengetahuan orang tua atau wali.</p>
        <p>Tutor bertindak sebagai pengajar independen. Tutor wajib memberikan identitas, foto wajah langsung, ijazah atau bukti kualifikasi, satu mata pelajaran utama, jenjang yang dikuasai, serta jadwal kosong yang sebenarnya. Akun tutor baru dapat menerima murid setelah disetujui admin.</p>
      </>
    ),
  },
  {
    title: "Pencarian, profil tutor, dan jadwal",
    content: (
      <>
        <p>Murid menentukan materi, tanggal, jam mulai, durasi, mode online atau offline, dan jenis kelas sebelum radar dijalankan. Sistem mencocokkan tutor berdasarkan kompetensi, jenjang, ketersediaan, performa, pemerataan, dan jarak untuk sesi offline.</p>
        <p>Profil tutor ditampilkan setelah tutor menerima permintaan dan sebelum murid membayar. Murid tidak memilih dari katalog. Penolakan tutor tanpa alasan yang dikecualikan dapat memicu pembatasan pencarian bertahap setelah tiga penolakan berurutan.</p>
        <p>Waktu yang telah dibayar dikunci. Tutor tetap dapat menerima sesi lain selama tidak bertabrakan.</p>
      </>
    ),
  },
  {
    title: "Harga dan pembayaran manual",
    content: (
      <>
        <p>Tarif ditetapkan admin dan dapat berbeda untuk mode online, offline, privat, atau kelompok. Nilai transaksi dan persentase komisi disimpan saat pemesanan sehingga perubahan tarif berikutnya tidak mengubah transaksi lama.</p>
        <p>Murid mentransfer dana ke rekening yang ditampilkan oleh BimbelKu, lalu mengunggah bukti. Pembayaran belum dianggap diterima sebelum admin mencocokkannya dengan mutasi rekening. Bukti yang ditolak dapat dikirim ulang sebelum batas pembayaran.</p>
        <p>BimbelKu tidak memakai payment gateway. Refund dan pendapatan tutor ditransfer manual oleh admin dengan bukti transfer yang dicatat pada sistem. Transaksi langsung di luar alur ini tidak dilindungi.</p>
      </>
    ),
  },
  {
    title: "Kelas kelompok",
    content: (
      <>
        <p>Jumlah minimum, maksimum, waktu tunggu, dan harga peserta ditentukan admin. Peserta harus memiliki kebutuhan materi dan jadwal yang sama. Untuk offline, lokasi pertemuan menggunakan alamat pembuat kelompok dan tutor mendatangi lokasi tersebut.</p>
        <p>Jika peserta belum memenuhi minimum sebelum pencocokan, setiap murid dapat mengubah permintaan menjadi privat atau membatalkannya. Setelah tutor terpilih, pembayaran baru dibuka ketika semua anggota aktif telah menyetujui tutor. Jika jumlah turun di bawah minimum setelahnya, tagihan yang belum dibayar dibatalkan dan dana yang sudah diterima masuk antrean refund penuh.</p>
      </>
    ),
  },
  {
    title: "Kehadiran, bukti, dan keadaan darurat",
    content: (
      <>
        <p>Tutor wajib hadir sesuai jadwal dan mengunggah foto bukti pelaksanaan beserta catatan sesi. Murid yang tidak hadir dan tidak dapat membuktikan alasan yang diterima dapat kehilangan pembayaran setelah laporan tutor diperiksa admin.</p>
        <p>Ketidakhadiran tutor yang terbukti menghasilkan refund penuh dan sanksi poin. Keadaan darurat tutor wajib disertai jenis kejadian, kronologi, waktu, lokasi, dampak, dan bukti yang dapat dipercaya. Refund murid langsung masuk antrean; admin kemudian menentukan validitas laporan dan sanksi tutor.</p>
      </>
    ),
  },
  {
    title: "Penyelesaian, keberatan, dan refund",
    content: (
      <>
        <p>Setelah bukti tutor diunggah, murid memiliki waktu 48 jam untuk menyetujui atau mengajukan keberatan. Persetujuan penyelesaian bersifat final dan menutup hak keberatan untuk sesi tersebut. Jika tidak ada jawaban, kasus masuk pemeriksaan admin—bukan otomatis disetujui.</p>
        <p>Keberatan harus menjelaskan masalah secara jelas dan dapat dilengkapi bukti. Refund yang disetujui bernilai 100% dari pembayaran sesi terkait dan diproses manual. Status refund selesai setelah admin mengunggah bukti transfer.</p>
      </>
    ),
  },
  {
    title: "Performa, larangan, dan penegakan",
    content: (
      <>
        <p>Tutor memulai dengan 150 poin dan maksimum 200 poin. Rating 4 menambah 1 poin dan rating 5 menambah 2 poin. Pelanggaran dapat mengurangi 5, 10, 15, 20, atau 30 poin berdasarkan tingkat dan pengulangan. Akun dengan 0 poin dinonaktifkan.</p>
        <p>Dilarang memalsukan identitas atau bukti, mengganggu sistem, melakukan penipuan, menyebarkan materi melanggar hukum, melecehkan pengguna lain, atau menyalahgunakan laporan dan refund. Admin dapat memberi peringatan, pembatasan, penolakan verifikasi, atau penonaktifan akun.</p>
      </>
    ),
  },
];

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-slate-100 pb-16 text-slate-600">
      <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-100/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="text-xl font-black tracking-tight text-slate-950">BimbelKu</Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-950">
            <ArrowLeft size={16} /> Kembali
          </Link>
        </div>
      </nav>

      <main className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-[2.5rem] border border-white bg-white px-6 py-10 shadow-xl shadow-slate-200/60 md:px-14 md:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-700">
            <Scale size={14} /> Versi 27 Juli 2026
          </span>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Syarat & Ketentuan</h1>
          <p className="mt-4 leading-7 text-slate-500">Aturan operasional BimbelKu untuk murid, tutor, dan admin.</p>
        </div>

        <div className="mt-10 flex gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
          <FileCheck2 className="mt-0.5 shrink-0 text-indigo-600" />
          <p>Dengan membuat akun atau menggunakan layanan, Anda menyetujui ketentuan ini dan Kebijakan Privasi. Simpan bukti transaksi dan gunakan pusat bantuan apabila menemukan data yang tidak sesuai.</p>
        </div>

        <div className="mt-12 space-y-10">
          {sections.map((section, index) => (
            <section key={section.title} className="grid gap-4 md:grid-cols-[3rem_1fr]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">{index + 1}</span>
              <div>
                <h2 className="text-xl font-black text-slate-950">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{section.content}</div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex gap-4 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <CircleAlert className="mt-0.5 shrink-0 text-amber-600" />
          <p>Perubahan ketentuan berlaku pada versi kebijakan berikutnya dan tidak mengubah nilai transaksi yang sudah tercatat. Pertanyaan dapat dikirim melalui Pusat Bantuan di dalam aplikasi.</p>
        </div>
      </main>
    </div>
  );
}
