# Checkpoint Tahap 6A — Alur Murid dan Pemesanan

Tanggal checkpoint: 1 Agustus 2026  
Fondasi: BimbelKu Tahap 5 Final  
Status: Tahap 6A beserta revisi tutorial, durasi, notifikasi, pemilih jam, tanggal lahir, halaman Pesan, halaman Perkembangan, dan UI HP selesai pada kode serta pemeriksaan otomatis. Tahap 6B belum dikerjakan.

## Hasil utama

Alur paket murid sekarang mengikuti keputusan final:

> Pilih paket → pilih durasi 1/2/3 jam → pilih mapel → bagikan sesi → atur pola jadwal → periksa ringkasan → konfirmasi → pembayaran → verifikasi admin → pencarian tutor → seluruh tutor menerima → paket aktif.

Paket tidak lagi mencari tutor sebelum pembayaran. Saat pesanan dikonfirmasi, backend membuat paket berstatus `awaiting_payment` beserta invoice. Pencarian tutor baru dimulai oleh `PackageCheckoutService::activatePaidPackage()` setelah admin menerima bukti pembayaran.

## Perubahan antarmuka murid

### Navigasi

Navigasi desktop dan HP memakai lima menu yang sama:

1. Beranda
2. Cari Les
3. Kelas Saya
4. Pesan
5. Saya

Aturan menu aktif dibuat per kelompok rute. `/student/packages/new` hanya mengaktifkan Cari Les dan tidak lagi ikut mengaktifkan Kelas Saya.

Menu Pesan sekarang menuju `/student/messages`. Rute tersebut tidak lagi
memakai `/student/my-classes` sebagai pengganti. Jadwal dan detail sesi tetap
berada pada Kelas Saya, sehingga dua menu tidak ditandai aktif bersamaan.

### Tanggal lahir saat pendaftaran

- Kalender bulanan native diganti kolom ketik `HH/BB/TTTT`.
- Murid cukup mengetik delapan angka melalui keypad HP.
- Garis miring ditambahkan otomatis setelah tanggal dan bulan.
- Tanggal yang tidak valid atau melewati hari ini ditolak.
- Backend tetap menerima format ISO `YYYY-MM-DD`.
- Profil menampilkan tanggal dalam format Indonesia, bukan format database.

### Tutorial

Tutorial tetap mendukung gambar, geser, tombol Sebelumnya/Selanjutnya, indikator langkah, tombol tutup, tombol lewati, tombol Esc, dan penguncian scroll halaman.

Perbaikan spotlight:

- lapisan gelap dibentuk oleh empat panel di atas, kiri, kanan, dan bawah target;
- area target tidak diberi lapisan gelap atau blur;
- target diberi ring putih dan kuning agar mudah ditemukan;
- komponen memilih target yang benar-benar terlihat sehingga bekerja pada sidebar desktop maupun navigasi HP;
- posisi kotak tutorial berpindah agar tidak menutup tombol yang sedang ditunjuk;
- target pada sidebar tersembunyi diabaikan saat tutorial dibuka melalui HP;
- ukuran spotlight dibatasi pada viewport agar lapisannya tidak memperlebar halaman;
- kotak tutorial HP dibatasi setinggi 20 rem dan selalu ditempatkan utuh di atas atau bawah layar;
- halaman Saya dapat membuka kembali tutorial melalui event `bimbelku:open-tutorial`.

Tutorial khusus pemesanan dua atau lebih mapel dipulihkan. Panduan ini memiliki status tampil tersendiri dan lima langkah:

1. pilih paket yang mendukung beberapa mapel;
2. pilih durasi pertemuan;
3. sorot tombol Tambah Mapel;
4. jelaskan pembagian sesi dengan tombol `−`, `+`, dan Bagi merata;
5. sorot tombol Periksa Pesanan.

Jika data tutorial backend gagal dimuat, isi cadangan tetap tersedia dari frontend. Pengguna juga dapat membuka panduan ini kapan saja dari tombol Panduan 2+ mapel.

### UI/UX HP

- Header dipadatkan dan judul halaman dipotong dengan aman pada layar sempit.
- Navigasi bawah, konten, dan tombol simpan memakai `safe-area-inset-bottom` agar tidak tertutup area sistem HP.
- Tombol pesan mengambang disembunyikan pada HP karena fungsi yang sama sudah tersedia di navigasi bawah.
- Tahapan pemesanan dan progres paket memakai versi ringkas tanpa gulir horizontal.
- Ringkasan pesanan dan detail notifikasi berubah menjadi panel bawah pada HP.
- Dropdown notifikasi, toast, judul, dan isi pesan dibatasi terhadap lebar viewport.
- Halaman tidak lagi dapat bergeser horizontal ketika notifikasi atau tutorial muncul.
- Daftar jam native diganti panel bawah dengan kisi tiga kolom dan gulir vertikal terbatas.
- Profil memakai tombol Simpan Perubahan yang tetap terlihat di atas navigasi bawah.
- Kartu dashboard, paket, kelas, transaksi, voucher, penawaran, pembayaran, dan halaman Saya ditumpuk ulang untuk layar sempit.
- Target sentuh utama memiliki tinggi minimal 44 piksel.
- Ruang bawah setiap halaman murid ditambah agar tindakan terakhir tidak tertutup navigasi.

### Paket dan sesi

- Istilah utama diubah menjadi Pilih Paket Belajar.
- Jumlah sesi hanya dipilih melalui paket 1, 4, 8, atau 12 sesi.
- Dropdown jumlah sesi yang berulang di setiap mapel dihapus.
- Saat mapel ditambah, sesi langsung dibagi merata.
- Contoh pembagian otomatis: 8/2 menjadi 4+4; 12/2 menjadi 6+6; 12/3 menjadi 4+4+4.
- Tombol `−` dan `+` memindahkan satu sesi antarmapel tanpa mengubah total paket.
- Total selalu ditampilkan dalam format `x dari y sesi`.
- Mapel yang sama tidak dapat dikirim dua kali.
- Dropdown mapel terbuka ke bawah, dapat dicari, ditutup dengan klik luar, serta dikendalikan dengan Arrow Up, Arrow Down, Enter, dan Escape.

### Durasi pertemuan

- Pilihan 1, 2, dan 3 jam ditempatkan tepat setelah kartu paket.
- Satu pilihan berlaku untuk seluruh pertemuan dalam satu paket.
- Total waktu ditampilkan sebagai `jumlah sesi × durasi = total jam belajar`.
- Harga backend dihitung dari tarif per jam × durasi × jumlah sesi.
- Jam selesai, pemeriksaan bentrok, invoice, booking request, booking, dan pendapatan tutor memakai durasi yang sama.
- Paket lama tetap bernilai satu jam melalui nilai default migrasi.

### Jadwal

- Murid mengatur tanggal mulai, jam, dan frekuensi satu kali untuk setiap mapel.
- Pemilih jam dibuka sebagai panel bawah pada HP dan dialog ringkas pada layar lebih besar.
- Pilihan 08.00–20.00 WIB ditampilkan dalam kisi tiga kolom tanpa keluar dari layar.
- Jam terpilih diberi warna utama dan tanda centang, kemudian panel ditutup otomatis.
- Sistem membuat seluruh tanggal pertemuan otomatis.
- Jam selesai dihitung otomatis dari jam mulai dan durasi pilihan.
- Daftar tanggal dapat dibuka dan diperiksa sebelum pesanan dikirim.
- Jadwal ganda antarmapel ditolak.
- Rentang jadwal yang melampaui masa paket menghasilkan pesan kesalahan.
- Paket 12 sesi memakai frekuensi awal tiga kali per minggu agar tetap berada dalam masa 30 hari.

### Draf dan ringkasan

- Formulir disimpan otomatis di `localStorage` dengan cap waktu.
- Draf dipulihkan setelah refresh.
- Tombol Mulai Ulang menghapus draf dan mengembalikan nilai awal.
- Data perpanjangan paket memiliki prioritas di atas draf biasa.
- Tombol Periksa Pesanan membuka dialog di tengah/bawah layar sebelum request pembuatan paket dikirim.
- Dialog memuat paket, jenjang, metode, lokasi offline, mapel, pembagian sesi, seluruh tanggal, harga normal, potongan, dan total.
- Dialog juga memuat durasi setiap pertemuan serta total jam belajar.
- Tombol Kembali & Ubah tidak menghapus data.
- Tombol Konfirmasi & Bayar membuat invoice dan langsung membuka halaman pembayaran.
- Tombol konfirmasi dikunci saat request berjalan untuk mencegah klik ganda.

### Dashboard, Kelas Saya, dan halaman Saya

- Dashboard memakai data paket, jadwal terdekat, voucher, notifikasi terbaru, dan kasus aktif dari backend.
- Teks status mengikuti pembayaran sebelum pencarian tutor.
- Kelas Saya menampilkan progres Pesanan → Ringkasan → Pembayaran → Cari Tutor → Tutor Ditemukan → Aktif → Selesai.
- Halaman Saya menjadi pusat profil, paket, voucher, pembayaran, perkembangan, tutor, catatan, perpanjangan, refund, keamanan, privasi, tutorial, bantuan, dan kebijakan.
- Edit Profil memuat jenjang, kelas/tingkat, sekolah, kebutuhan belajar, alamat, tautan peta, koordinat, dan persetujuan penggunaan lokasi.
- Tautan kebijakan diperbaiki ke `/terms` dan `/privacy`.
- Tautan WhatsApp contoh yang tidak valid dihapus.

### Pesan dan perkembangan murid

- Halaman `/student/messages` menampilkan seluruh percakapan kelas yang dapat dibuka.
- Ringkasan menampilkan pengirim, pesan terakhir, serta waktu pesan.
- Tombol Buka chat langsung membuka tab Chat dalam Ruang Belajar.
- Halaman `/student/progress` menampilkan persentase target dan laporan terbaru.
- Tombol Lihat laporan lengkap langsung membuka tab Progres.
- Tautan Perkembangan Belajar dan Catatan tutor tidak lagi kembali ke daftar kelas umum.
- Kelas tanpa pembayaran sah tidak muncul sebagai ruang yang dapat dibuka.
- Kondisi memuat, gagal, kosong, dan berhasil ditampilkan secara terpisah.
- Rute serta kartu baru disusun untuk layar HP tanpa tabel horizontal.

## Perubahan backend

### Endpoint yang berubah perilakunya

| Endpoint | Perilaku Tahap 6A |
|---|---|
| `POST /api/student/packages` | Membuat paket, sesi, permintaan induk, reservasi promo, dan invoice dalam satu transaksi. Tidak mengirim penawaran tutor. |
| `POST /api/student/packages/quote` | Menghitung harga per jam berdasarkan durasi 1/2/3 jam dan mengembalikan total jam belajar. |
| `GET /api/student/packages/tutorial-status` | Menentukan apakah murid sudah pernah membuat paket dengan dua atau lebih mapel. |
| `POST /api/orders/{id}/pay` | Menyimpan bukti dan mengubah paket, mapel, sesi, serta permintaan induk menjadi `payment_submitted`. |
| Verifikasi pembayaran admin | Mengubah order menjadi `paid`, lalu memulai pencarian tutor per mapel. |
| Penerimaan penawaran tutor | Mengaktifkan paket dan membuat booking setelah seluruh mapel memiliki tutor. Tidak membuat invoice baru. |
| `POST /api/student/packages/{id}/cancel` | Jika paket sudah dibayar dan sedang mencari tutor, pencarian dihentikan dan refund masuk antrean. |
| `GET /api/student/dashboard-v2` | Menambahkan notifikasi terbaru, jumlah kasus aktif, dan nilai awal pesan belum dibaca. |
| `GET /api/student/classes` | Menambahkan izin ruang belajar, pesan terakhir, progres target, jumlah laporan, dan laporan terbaru. |
| `GET /api/user` | Mengembalikan data pendidikan, kebutuhan belajar, lokasi, dan persetujuan. |
| `PUT /api/user` | Menyimpan data profil belajar dan lokasi murid. |

### Status data

Status awal paket, mapel, sesi, dan booking request adalah `awaiting_payment`. Order dibuat sebagai `pending`. Setelah bukti diunggah, status menjadi `payment_submitted`/`submitted`. Setelah admin menerima pembayaran, pencarian memakai `matching`. Paket menjadi `active` setelah seluruh tutor menerima.

### Migrasi baru

`database/migrations/2026_08_01_000100_build_stage_six_a_student_profile.php`

Kolom baru pada `users`:

- `student_education_level`
- `learning_needs`
- `location_consent_at`

Kolom `school_name`, `grade`, `address`, `maps_link`, `latitude`, dan `longitude` memakai struktur yang sudah tersedia.

`database/migrations/2026_08_01_000200_add_meeting_duration_to_learning_packages.php`

Kolom baru pada `learning_packages`:

- `duration_hours`, bilangan bulat 1–3 dengan nilai awal `1` untuk kompatibilitas paket lama.

## Berkas utama

### Frontend

- `src/components/StudentLayout.tsx`
- `src/components/MobileBottomNav.tsx`
- `src/components/RoleQuickGuide.tsx`
- `src/components/PendingPaymentPopup.tsx`
- `src/components/SubjectCombobox.tsx`
- `src/components/OrderProgress.tsx`
- `src/components/DateOfBirthInput.tsx`
- `src/components/StudentWorkspaceList.tsx`
- `src/components/LearningSessionHub.tsx`
- `src/pages/students/Dashboard.tsx`
- `src/pages/students/Account.tsx`
- `src/pages/students/Profile.tsx`
- `src/pages/students/PackageBuilder.tsx`
- `src/pages/students/MyPackages.tsx`
- `src/pages/students/Messages.tsx`
- `src/pages/students/LearningProgress.tsx`
- `src/pages/pembayaran/PaymentPage.tsx`
- `src/App.tsx`

### Backend

- `app/Http/Controllers/Api/StudentPackageController.php`
- `app/Http/Controllers/Api/OrderController.php`
- `app/Http/Controllers/Api/AdminController.php`
- `app/Http/Controllers/Api/TeacherOfferController.php`
- `app/Http/Controllers/Api/UserController.php`
- `app/Http/Controllers/Api/StudentController.php`
- `app/Services/PackageCheckoutService.php`
- `app/Models/User.php`
- `app/Models/LearningPackage.php`
- `app/Models/Booking.php`
- `database/seeders/StageFiveExperienceSeeder.php`
- `database/migrations/2026_08_01_000100_build_stage_six_a_student_profile.php`
- `database/migrations/2026_08_01_000200_add_meeting_duration_to_learning_packages.php`

### Pemeriksaan

- `scripts/check-stage2.mjs`
- `scripts/check-stage5-experience.mjs`
- `scripts/check-stage6a.mjs`
- `scripts/check-page-routes.mjs`
- `package.json`

## Hasil pemeriksaan

Perintah `npm run check` lulus, meliputi:

- ESLint
- TypeScript `tsc --noEmit`
- 170 kontrak route-controller API
- pemeriksaan file preview
- kontrak Tahap 2, 3, 4, dan 5
- kontrak Tahap 6A
- audit 52 rute, 148 tautan literal, dan seluruh modul halaman lazy
- pemeriksaan statis 215 berkas PHP
- build produksi Vite, 1.818 modul
- anggaran performa: JavaScript awal 97,6 KB gzip dan CSS awal 19,3 KB gzip

Tes Laravel belum dapat dijalankan pada mesin checkpoint karena binary PHP dan Composer tidak tersedia. Ini dicatat sebagai batas verifikasi, bukan hasil lulus. Jalankan tes Laravel pada mesin yang memiliki PHP sebelum deploy.

Percobaan uji browser headless pada ukuran 360 dan 390 piksel tidak dapat dijalankan karena mesin checkpoint tidak memiliki Chromium dan unduhan browser diblokir jaringan. Kontrak breakpoint dan struktur responsif sudah lulus, tetapi pemeriksaan visual pada perangkat nyata tetap masuk skenario manual sebelum deploy.

## Cara menjalankan

Frontend:

```bash
npm ci
npm run check
npm run dev
```

Backend:

```bash
cd bimbelku-backend
composer install
php artisan migrate
php artisan db:seed --class=StageFiveExperienceSeeder
php artisan test
php artisan serve
```

Pastikan rekening tujuan pembayaran sudah diisi admin. Pembuatan paket akan ditolak dengan pesan yang jelas jika rekening belum dikonfigurasi.

## Skenario pemeriksaan manual setelah backend aktif

1. Buka dashboard pada lebar 360, 390, 768, 1024, dan 1280 piksel.
2. Buka tutorial dan pastikan tombol yang ditunjuk tetap terang serta memiliki ring.
3. Periksa bahwa hanya satu menu utama yang aktif pada setiap rute.
4. Pilih paket multi-mapel dan buka tutorial khusus; periksa kelima target dan pastikan kotak panduan tidak menutupi target.
5. Uji durasi 1, 2, dan 3 jam; periksa jam selesai, total jam, dan harga pada ringkasan.
6. Buka pemilih jam pada lebar 320, 360, dan 390 piksel; pastikan panel tidak keluar layar serta halaman tidak bergeser ke samping.
7. Buka dropdown notifikasi, toast baru, dan detail notifikasi; uji judul atau pesan panjang tanpa spasi.
8. Geser tutorial melalui seluruh langkah; pastikan kotak panduan selalu utuh dan sidebar tersembunyi tidak ikut disorot.
9. Uji paket 1, 4, 8, dan 12 sesi.
10. Tambahkan dan hapus mapel; pastikan total sesi tidak berubah.
11. Refresh halaman builder dan pastikan draf, termasuk durasi, kembali.
12. Buka ringkasan; pastikan belum ada paket di database sebelum tombol Konfirmasi & Bayar ditekan.
13. Konfirmasi; pastikan invoice muncul dan belum ada `teacher_offers`.
14. Unggah bukti, terima dari admin, lalu pastikan `teacher_offers` baru dibuat.
15. Terima seluruh penawaran tutor; pastikan booking sesi dibuat dengan durasi dan nominal yang benar.
16. Batalkan pencarian setelah pembayaran; pastikan refund berstatus pending.
17. Daftar sebagai murid dan ketik tanggal lahir delapan angka tanpa membuka kalender bulanan.
18. Buka menu Pesan; pastikan kelas berbayar muncul dan tab Chat terbuka langsung.
19. Buka Perkembangan dari halaman Saya; pastikan tab Progres terbuka langsung.
20. Uji akun tanpa kelas berbayar; pastikan kondisi kosong menjelaskan syarat akses.

## Rollback

Untuk hanya membatalkan migrasi durasi terbaru:

```bash
cd bimbelku-backend
php artisan migrate:rollback --step=1
```

Untuk membatalkan kedua migrasi Tahap 6A pada database yang belum memiliki migrasi lanjutan:

```bash
cd bimbelku-backend
php artisan migrate:rollback --step=2
```

Rollback alur transaksi sebaiknya dilakukan dengan mengembalikan checkpoint Tahap 5 secara utuh karena controller, service, teks frontend, dan status data saling berkaitan. Jangan menurunkan kode ke alur lama jika sudah ada order Tahap 6A berstatus `paid`, `matching`, atau `refund_pending` tanpa menyiapkan migrasi data.

## Batas Tahap 6A

Halaman Pesan murid dan halaman Perkembangan sudah dipulihkan memakai ruang
belajar Tahap 4. Status baca per pesan, jumlah pesan belum dibaca, pesan otomatis
ketika tutor terhubung, pencarian percakapan lanjutan, dan penyempurnaan chat
tutor tetap berada di Tahap 6B. Nilai `unread_messages_count` pada dashboard
sementara dikembalikan sebagai `0`.

Fitur operasional tutor, pendapatan tutor, notifikasi lintas peran, dan panel
admin penuh tetap berada di Tahap 6B/6C.

Tahap 6B tidak disentuh pada checkpoint ini.
