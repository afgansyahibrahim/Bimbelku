# Revisi 4 — Perbaikan UI dan Operasional

## Scope Revisi 4 yang disepakati

Dokumen ini tetap menjadi sumber kebutuhan untuk sebelas perbaikan berikut:

1. Input harga boleh kosong saat diedit, tanpa leading zero, dan wajib bernilai positif.
2. Tutor memiliki tepat satu mapel utama; privat aktif secara bawaan dan kelompok nonaktif.
3. Dashboard admin menampilkan ringkasan serta grafik operasional.
4. Register desktop memakai layout lebar dua kolom tanpa merusak mobile.
5. Pusat Bantuan menyediakan FAQ statis terkelompok, pencarian, dan fallback ke admin.
6. Paket 1 sesi maksimal memakai 1 hari unik; paket 4 sesi maksimal 2 hari unik untuk seluruh paket.
7. Nama profil panjang tidak boleh tertutup elemen visual.
8. Audit log menampilkan perubahan dalam bahasa manusia, sementara data mentah tetap tersimpan.
9. Footer mendukung beberapa tautan sosial dengan ikon dari katalog bawaan.
10. Tabel tutor menampilkan mapel dan filter mapel server-side dari daftar opsi lengkap.
11. Chat memakai scroll internal, membuka pesan terbaru, dan tidak menarik pengguna yang membaca pesan lama.

Implementasi fitur tambahan setelah sebelas butir di atas harus tetap dipisahkan secara konsep dan tidak mengubah keputusan Revisi 4.

## Lampiran — Fitur tambahan penggantian guru

Rancangan paling aman adalah membuat fitur “Ajukan Ganti Guru” khusus Paket Belajar privat, dengan persetujuan admin. Paket tetap aktif dan
  hanya sesi mendatang pada mapel yang dipilih yang dialihkan.

  ## Kondisi sistem sekarang

  Struktur web saat ini sebenarnya sudah cukup mendukung:

  - LearningPackage menyimpan paket utama.
  - PackageSubject menyimpan guru aktif per mata pelajaran.
  - PackageSession menghubungkan setiap sesi dengan Booking.
  - Booking menyimpan guru dan hak pembayaran per sesi.
  - BookingRequest serta TeacherMatchingService menangani pencarian tutor.
  - Case Center menangani laporan, keberatan, dan keputusan admin.
  - Refund sudah menjaga proporsi Saldo BimbelKu dan pembayaran eksternal.

  Namun proses penerimaan tutor sekarang mengaktifkan seluruh paket melalui activateMatchedPackage(). Proses itu tidak boleh langsung
  digunakan untuk penggantian guru karena dapat membuat ulang seluruh booking, termasuk sesi lama.

  ## Ruang lingkup versi pertama

  Fitur hanya tersedia untuk:

  - Paket Belajar privat.
  - Paket berstatus active.
  - Mapel yang masih memiliki sesi belum terlaksana.
  - Tidak ada proses penggantian lain pada mapel tersebut.
  - Tidak ada sesi in_progress, menunggu persetujuan murid, atau sedang disengketakan pada mapel tersebut.

  Kelas Kelompok tidak termasuk karena satu guru melayani banyak peserta dan alurnya harus berbeda.

  ## Alur pengguna

  Murid mengajukan
          ↓
  Admin memeriksa
     ↙          ↘
  Ditolak      Disetujui
                  ↓
        Sesi mendatang dibekukan
                  ↓
         Pencarian guru pengganti
          ↙          ↓          ↘
     Ditemukan   Belum tersedia  Batas habis
         ↓             ↓             ↓
  Guru menerima   Coba lagi /    Ubah jadwal /
         ↓        perluas radius  refund sisa
  Sesi tersisa
  dialihkan

  Tombolnya menggunakan nama “Ajukan Ganti Guru”, bukan “Ganti Guru”, agar pengguna memahami bahwa perubahan tidak langsung terjadi.

  ## Data baru yang diperlukan

  ### teacher_replacement_requests

  Menyimpan satu proses penggantian:

  - Paket dan mata pelajaran.
  - Murid.
  - Guru lama.
  - Guru baru setelah ditemukan.
  - Alasan dan penjelasan.
  - Bukti opsional.
  - Admin pemeriksa.
  - Status proses.
  - Waktu pengajuan, persetujuan, pencarian, dan penyelesaian.
  - Alasan penolakan.
  - Booking request yang digunakan untuk matching.
  - Versi concurrency untuk mencegah proses ganda.

  Status yang disarankan:

  - pending_review
  - approved
  - matching
  - teacher_pending
  - no_teacher
  - completed
  - rejected
  - cancelled
  - refund_pending
  - refunded

  ### teacher_replacement_sessions

  Menyimpan snapshot sesi yang dialihkan:

  - Replacement request.
  - Package session.
  - Booking guru lama.
  - Booking guru baru.
  - Status sesi dalam proses replacement.

  Snapshot ini penting agar sesi yang termasuk penggantian tidak berubah meskipun jadwal atau status paket berubah kemudian.

  ### Penanda pada matching dan booking

  - booking_requests.teacher_replacement_request_id
  - bookings.replacement_of_booking_id

  Dengan ini admin dapat membedakan pencarian tutor paket baru dengan pencarian guru pengganti.

  ## Perlakuan terhadap paket dan progress

  Selama penggantian:

  - LearningPackage.status tetap active.
  - Jumlah sesi paket tidak berubah.
  - used_sessions tidak di-reset.
  - Bab dan progress tidak diubah.
  - Promotion/voucher tidak dikembalikan.
  - Order pembayaran asli tidak dibuat ulang.
  - Renewal tidak dibuat ulang.
  - Sesi yang sudah selesai tetap terhubung ke guru lama.
  - Guru baru hanya muncul pada sesi mendatang.

  PackageSubject.assigned_teacher_id akan menunjukkan guru yang menangani sesi berikutnya. Riwayat guru setiap sesi harus dibaca dari
  Booking.teacher_id, bukan dari guru aktif mapel.

  API paket juga perlu mengirimkan guru per sesi agar halaman riwayat tidak menampilkan guru baru pada sesi lama.

  ## Perlakuan terhadap booking lama

  Booking guru lama tidak boleh dihapus atau diganti teacher_id-nya.

  Ketika replacement disetujui:

  - Booking sesi selesai tetap completed.
  - Pendapatan guru lama yang sudah ready tetap utuh.
  - Booking mendatang diberi status baru, misalnya teacher_replaced.
  - payout_status booking mendatang menjadi cancelled.
  - Bukti, chat, kehadiran, dan audit lama tetap tersimpan.
  - Package session kemudian diarahkan ke booking baru setelah guru pengganti menerima.

  Dengan pendekatan ini laporan keuangan guru lama tidak tercampur dengan guru baru.

  ## Integrasi pencarian tutor

  TeacherMatchingService tetap digunakan, tetapi dengan scope sesi replacement.

  Perubahan penting:

  - Matching hanya memeriksa sesi yang tercatat dalam teacher_replacement_sessions.
  - Guru lama wajib dikecualikan dari kandidat.
  - Fitur kontinuitas tutor tidak boleh memprioritaskan guru lama.
  - Jadwal yang sudah lewat atau sudah selesai tidak diperiksa.
  - Admin tetap dapat memperluas radius dan menetapkan tutor manual.
  - Admin Matching menampilkan badge “Guru Pengganti”.
  - Guru yang menerima penawaran diberi tahu bahwa ini adalah sisa sesi paket, bukan paket baru.

  Setelah guru menerima, service khusus replacement membuat booking baru hanya untuk sesi yang tersisa. Proses ini tidak memanggil aktivasi
  paket penuh.

  ## Jadwal dan masa aktif paket

  Pada awalnya sistem mempertahankan jadwal sesi tersisa.

  Jika tidak ada guru yang cocok:

  - Murid dapat mengubah jadwal hanya untuk sesi replacement.
  - Jadwal baru mengikuti minimum 24 jam.
  - Untuk offline, radius dapat diperluas menggunakan mekanisme yang sudah ada.
  - Waktu yang terpakai selama pencarian ditambahkan ke masa aktif paket agar murid tidak kehilangan masa berlaku akibat proses replacement.

  Sesi yang berlangsung kurang dari 24 jam saat permintaan disetujui harus otomatis ditunda dan diminta penjadwalan ulang.

  ## Integrasi Case Center

  Permintaan muncul sebagai tipe kasus baru di halaman admin:

  Penggantian Guru

  Admin dapat:

  - Menyetujui.
  - Menolak dengan alasan.
  - Melihat paket, mapel, guru, dan sesi tersisa.
  - Melihat kasus/dispute terkait.
  - Menentukan apakah alasan termasuk pelanggaran tutor.
  - Memulai matching setelah persetujuan.

  Jika ada pelanggaran, pengurangan poin tetap melalui TeacherPointService, bukan langsung mengubah poin tutor. Detail laporan sensitif tidak
  ditampilkan kepada guru; guru hanya menerima informasi operasional bahwa penugasannya pada sesi mendatang dihentikan.

  ## Fallback refund

  Refund hanya mencakup sesi belum terlaksana pada mapel tersebut:

  refund = jumlah sesi eligible × harga per sesi

  Tidak termasuk:

  - Sesi selesai.
  - Sesi yang telah disahkan.
  - Sesi yang sedang disengketakan sebelum keputusan admin.
  - Biaya yang sudah menjadi hak guru.

  Ada kendala pada sistem sekarang: tabel refunds mempunyai unique constraint pada order_id, sehingga satu order hanya bisa memiliki satu
  refund. Paket multi-mapel dapat membutuhkan lebih dari satu refund parsial.

  Sebelum fitur ini berjalan, sistem refund perlu ditingkatkan:

  - Satu order dapat memiliki beberapa refund.
  - Setiap refund memiliki source_type dan source_id.
  - Total seluruh refund tidak boleh melebihi nominal order.
  - Nominal wallet dan transfer disimpan sebagai snapshot saat refund dibuat.
  - Bagian Saldo BimbelKu kembali ke saldo.
  - Bagian eksternal mengikuti rekening/e-wallet pilihan murid.
  - Order tetap paid ketika hanya sebagian sesi yang direfund.
  - Paket menjadi completed ketika semua sesi lain selesai, walaupun sebagian sesi ditutup melalui refund.

  Ini bagian paling sensitif dan harus dibuat melalui service transaksi khusus, bukan langsung dari controller.

  ## Endpoint yang disarankan

  Murid:

  - POST /student/packages/{package}/subjects/{subject}/teacher-replacements
  - POST /student/teacher-replacements/{replacement}/cancel
  - POST /student/teacher-replacements/{replacement}/retry
  - POST /student/teacher-replacements/{replacement}/reschedule
  - POST /student/teacher-replacements/{replacement}/request-refund

  Admin:

  - GET /admin/teacher-replacements
  - GET /admin/teacher-replacements/{replacement}
  - POST /admin/teacher-replacements/{replacement}/approve
  - POST /admin/teacher-replacements/{replacement}/reject

  Semua endpoint mutasi memakai:

  - Idempotency key.
  - Rate limit terpisah.
  - Database transaction dan lockForUpdate().
  - Audit log.
  - Validasi kepemilikan paket dan status terbaru.

  ## Tampilan pengguna

  Tombol ditempatkan di detail mapel pada Kelas Saya, bukan sebagai tombol global paket.

  Tombol hanya muncul jika can_request_teacher_replacement=true.

  Modal pengajuan memuat:

  - Mapel dan guru saat ini.
  - Jumlah sesi tersisa.
  - Pilihan alasan.
  - Penjelasan minimum.
  - Bukti opsional.
  - Penjelasan bahwa admin akan meninjau.
  - Peringatan bahwa jadwal mendatang dapat ditunda.

  Setelah diajukan, kartu mapel menampilkan status seperti:

  - Menunggu pemeriksaan admin.
  - Mencari guru pengganti.
  - Menunggu jawaban tutor.
  - Guru belum tersedia.
  - Guru pengganti ditemukan.
  - Refund sesi tersisa sedang diproses.

  ## Pencegahan konflik

  Aturan wajib:

  - Maksimal satu replacement aktif per mapel.
  - Klik ganda tidak membuat dua permintaan.
  - Guru tidak dapat menerima penawaran setelah admin membatalkan proses.
  - Guru lama tidak dapat terpilih kembali.
  - Guru baru tidak memperoleh sesi yang sudah selesai.
  - Replacement tidak dapat dijalankan ketika sesi sedang berlangsung.
  - Dispute sesi harus diselesaikan dahulu.
  - Refund dan penerimaan guru tidak boleh berhasil bersamaan.
  - Admin approval, tutor acceptance, dan refund memakai row lock pada replacement, sesi, booking, dan order.
  - BookingObserver harus memastikan hanya booking yang masih terhubung ke PackageSession yang boleh mengubah status session tersebut.

  ## Urutan implementasi

  1. Migration, model, policy, dan state machine replacement.
  2. Service pembekuan serta pemindahan sesi.
  3. Integrasi matching dengan scope sesi tersisa.
  4. Admin Case Center dan keputusan admin.
  5. UI pengajuan serta status murid.
  6. Refund parsial multi-refund.
  7. Notifikasi dan audit.
  8. Demo command dan regression test.
  9. Feature flag dibuka setelah seluruh test hijau.

  Test wajib mencakup:

  - Paket satu dan multi-mapel.
  - Progress tetap utuh.
  - Guru lama tetap mendapat pendapatan sesi selesai.
  - Guru baru hanya menerima sesi tersisa.
  - Guru lama tidak masuk kandidat.
  - Double-click dan dua admin bersamaan.
  - Tutor menerima bersamaan dengan refund.
  - Tidak ada kandidat.
  - Reschedule 24 jam.
  - Refund wallet, transfer, dan campuran.
  - Lebih dari satu refund pada satu order.
  - Paket dapat selesai setelah sebagian sesi direfund.

  Rekomendasi kebijakan awal: maksimal satu penggantian tanpa pelanggaran per mapel, sedangkan penggantian akibat guru tidak aktif, absen,
  atau keputusan admin tidak dihitung ke batas tersebut.

  ## Pembagian implementasi tiga tahap

  ### Tahap 1 — Fondasi backend dan keamanan data (selesai)

  - Migration dan model replacement beserta snapshot sesi tersisa.
  - Policy kepemilikan/role dan state machine transisi status yang terpusat.
  - Pengajuan murid, approval/rejection admin, rate limit, idempotensi, notifikasi, dan audit.
  - Pembekuan hanya booking masa depan; histori, progress, paket, order, dan payout sesi selesai tetap utuh.
  - Matching memakai jadwal sesi snapshot, mengecualikan guru lama, serta mendukung penerimaan offer dan penetapan manual admin.
  - Fondasi refund parsial multi-refund dengan snapshot sumber dana wallet/eksternal yang tidak berubah.
  - Fallback no_teacher dibuka ketika kandidat habis atau jadwal terdekat kurang dari 24 jam.
  - API paket mengirim identitas guru dari booking masing-masing sesi sehingga histori guru lama tidak tertimpa guru aktif mapel.
  - Feature flag tertutup secara default sampai UI dan alur operasional Tahap 2 selesai.
  - Tiga belas regression test khusus workflow ditambahkan; seluruh backend dan quality gate proyek hijau.

  Fondasi refund pada tahap ini belum diekspos sebagai aksi pengguna. Ini disengaja agar penerimaan tutor dan refund tidak dibuka sebelum
  endpoint fallback, aturan reschedule, serta UI status selesai pada Tahap 2.

  ### Tahap 2 — Operasional dan antarmuka (selesai)

  - UI pengajuan/status murid pada detail mapel.
  - Integrasi daftar/detail replacement ke Admin Case Center.
  - Aksi cancel, retry, reschedule, dan request-refund beserta aturan konkurensinya.
  - Penyelesaian lifecycle paket setelah sebagian sesi direfund dan pengujian race condition.

  Hasil implementasi Tahap 2:

  - Murid dapat mengajukan penggantian dari kartu mapel, melihat status, membatalkan sebelum review, mencoba pencarian lagi, mengubah semua
    jadwal snapshot minimal 24 jam, atau meminta refund sesi tersisa.
  - Admin Case Center memiliki tab Penggantian Guru, detail paket/mapel/guru/sesi/bukti, kasus sesi terkait, keputusan approve/reject, dan
    opsi pelanggaran yang mengurangi poin hanya melalui TeacherPointService.
  - Refund replacement diselesaikan atomik bersama status sesi, mapel, dan paket; order asli tetap paid dan payout sesi selesai tetap utuh.
  - Konflik penerimaan tutor dengan refund, keputusan setelah cancel, klik ganda, guru lama, paket multi-mapel, serta booking histori tercakup
    regression test.
  - Quality gate Tahap 2: 18 test replacement (89 assertion), 231 test backend keseluruhan (1.772 assertion), TypeScript, lint, build, dan
    seluruh pemeriksaan frontend lulus.
  - Feature flag tetap false sampai demo dan verifikasi akhir Tahap 3 selesai.

  ### Tahap 3 — Demo dan verifikasi akhir (selesai)

  - Demo command lokal/testing untuk alur normal, tidak ada guru, reschedule, dan refund.
  - Tutorial uji per peran serta regression end-to-end final sebelum feature flag dibuka.

  Hasil implementasi Tahap 3:

  - Command `demo:teacher-replacement` memakai tabel dan service produksi tanpa tabel demo terpisah.
  - Fixture memuat murid, guru lama, guru pengganti, paket aktif, satu sesi selesai, dan dua sesi mendatang.
  - Cabang demo mencakup guru ditemukan, kandidat dimatikan/dinyalakan, percepatan `no_teacher`, retry berulang, reschedule melalui UI,
    pembuatan refund parsial, dan penyelesaian refund ke Saldo BimbelKu.
  - `reset` mengarsipkan fixture aktif dan mempertahankan riwayat sesi/finansial untuk audit.
  - Fitur penggantian guru aktif secara default; feature flag tetap tersedia hanya sebagai emergency kill switch.
  - Verifikasi akhir lulus: 2 test demo end-to-end (24 assertion), 18 test workflow replacement (89 assertion), 233 test backend
    keseluruhan (1.796 assertion), quality gate demo 15/15, seluruh `npm run check`, dan production build.
## Status perbaikan hasil audit

Temuan audit 5 September 2026 telah ditindaklanjuti pada kode:

- Default layanan kelompok dikembalikan menjadi nonaktif.
- Batas hari dihitung sebagai hari unik seluruh paket, bukan per mapel.
- Chat hanya mengikuti pesan terbaru ketika pengguna masih berada dekat bagian bawah.
- Opsi filter mapel berasal dari seluruh mapel tutor aktif, bukan satu halaman pagination.
- Rollback multi-refund tidak memaksakan unique constraint ketika data sudah memiliki refund parsial ganda.
- Approval dan rejection replacement memakai rate limiter khusus.
- Kegagalan sementara dispatch matching dijadwalkan ulang tanpa melaporkan approval yang sudah committed sebagai gagal.
- Teks UI/API yang rusak akibat encoding telah dibersihkan.
- Enam artefak mati dan salinan file lama di root telah dihapus tanpa menyentuh data atau migration historis.
- Penggantian guru aktif pada instalasi baru; emergency kill switch tetap tersedia.

Status akhir: **lulus**.

- `npm run check` lulus, termasuk 25/25 pemeriksaan audit Revisi 4, TypeScript, seluruh quality gate, dan production build.
- `php artisan test` lulus: 235 test dan 1.802 assertion.
