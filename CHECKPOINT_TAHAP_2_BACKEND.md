# Checkpoint Tahap 2 — Penyelesaian Backend

Tanggal: 28 Juli 2026  
Dasar proyek: checkpoint Tahap 1 di `Website_Bimbelku`  
Acuan: `PRD_REVISI_BIMBELKU.md` versi keputusan 27 Juli 2026  
Status: implementasi backend selesai; pemeriksaan runtime Laravel/MySQL dilanjutkan pada Tahap 4

## Ruang lingkup

Tahap ini menyelesaikan dan memperketat backend Laravel untuk alur admin, tutor,
dan murid. Frontend Tahap 1 dipertahankan. Penghapusan menyeluruh berkas lama
belum dilakukan karena merupakan ruang lingkup Tahap 3.

## Hasil utama

### Akun, profil, dan verifikasi tutor

- Profil umum murid dapat diperbarui melalui `PUT /api/user` maupun pola multipart
  `POST + _method=PUT`.
- Tutor tidak dapat memakai endpoint profil murid untuk melewati pemeriksaan ulang.
- Perubahan identitas, dokumen, kompetensi utama, mode, lokasi, jangkauan, jadwal,
  atau status penerimaan membatalkan penawaran yang sudah tidak layak.
- Perubahan dokumen/kompetensi tutor aktif mengembalikan akun ke verifikasi admin
  dan mencabut token login.
- Admin tidak dapat memverifikasi keputusan yang sama dua kali.
- Aktivasi tutor mensyaratkan verifikasi berlaku dan poin lebih dari nol.
- Tutor dengan poin nol diblokir, token dicabut, dan penawaran aktif dilepas tanpa
  sanksi tidak merespons.

### Pencocokan dan jadwal

- Kandidat wajib aktif, terverifikasi, menerima permintaan, memiliki poin, cocok
  mapel/jenjang/mode/jenis kelas, tersedia penuh, dan tidak berbenturan.
- Pencocokan offline memakai penyaringan koordinat, radius 3/5/8/12 km, jangkauan
  tutor, serta prioritas kelompok jarak.
- Kelayakan diperiksa ulang ketika tutor menekan terima, bukan hanya saat penawaran
  dibuat.
- Dua perangkat tidak dapat menerima sesi bertabrakan secara bersamaan karena
  akun/profil tutor dan transaksi dikunci.
- Setelah satu sesi diterima, penawaran lain yang bertabrakan dibatalkan tanpa
  penalti dan permintaan murid dikembalikan ke radar.
- Scheduler menjalankan ulang permintaan `matching` yang tidak memiliki penawaran
  aktif dan memakai `withoutOverlapping`.

### Pemesanan dan kelas kelompok

- Pembuatan permintaan mengunci data murid dan memeriksa ulang benturan agar klik
  ganda tidak membuat dua pesanan.
- Jadwal divalidasi sesuai jenjang, batas waktu pemesanan, durasi, pergantian hari,
  lokasi offline, dan kontak.
- Seluruh materi anggota kelompok tersedia kepada tutor secara anonim sebelum
  menerima; lampiran tetap lewat endpoint privat.
- Pembuat kelompok offline menjadi jangkar lokasi. Jika jangkar keluar, kelompok
  ditutup/refund agar alamat tidak berpindah diam-diam.
- Permintaan anggota batal/refund tidak dapat hidup kembali akibat scheduler atau
  perluasan radius.
- Bukti pembayaran yang dikirim tepat waktu tetap menunggu pemeriksaan admin;
  kelompok tidak dibatalkan hanya karena admin belum sempat memeriksa.

### Pembayaran manual, refund, dan pencairan

- Konfigurasi rekening admin dijaga sebagai satu baris database.
- Rekening dikunci dari perubahan saat ada tagihan aktif atau bukti yang menunggu.
- Pembayaran hanya mengonfirmasi kelas setelah keputusan admin.
- Penolakan bukti wajib memiliki alasan dan dapat diperbaiki sebelum tenggat.
- Bukti yang baru disetujui setelah sesi dimulai masuk antrean refund, bukan
  menggantung atau menghasilkan pendapatan.
- Status kelompok aktif tidak kembali ke `menunggu pembayaran` ketika bukti anggota
  lain ditolak.
- Pencairan mengunci profil dan booking, memeriksa daftar booking secara unik,
  menyimpan snapshot rekening serta booking, dan mencegah pencairan ganda.
- Komisi dan rekening lama tersimpan pada transaksi sehingga perubahan pengaturan
  tidak mengubah transaksi sebelumnya.

### Pelaksanaan, laporan, poin, dan privasi

- Tutor mendapat masa unggah bukti setelah sesi sesuai pengaturan
  `completion_upload_grace_minutes` (nilai awal 120 menit).
- Masa keberatan murid tetap 48 jam sejak bukti diunggah.
- Peserta kelompok yang belum membayar tidak dapat membuka alamat/kontak/bukti
  sesi, menyetujui penyelesaian, membuat sengketa, atau melapor tutor tidak hadir.
- Beberapa laporan tutor tidak hadir untuk satu kelas hanya menerapkan satu sanksi;
  laporan saudara diselesaikan bersama.
- Persetujuan, sengketa, laporan, refund, dan keputusan admin memakai transaksi
  serta pemeriksaan status ulang untuk mencegah proses ganda.
- Bukti identitas, materi, pembayaran, penyelesaian, laporan, sengketa, refund,
  pencairan, dan bantuan tersimpan pada disk privat dengan pemeriksaan kepemilikan.
- Nilai poin dibatasi 0–200 dan seluruh perubahan dicatat dalam buku besar.

### Integritas database

Migration baru:

`database/migrations/2026_07_28_000100_harden_stage_two_backend.php`

Migration tersebut:

- menambah batas unik profil tutor per akun;
- menambah batas satu mata pelajaran utama per profil;
- menambah batas satu jadwal per tutor/hari;
- mencegah duplikasi materi kurikulum;
- menjaga satu konfigurasi rekening pembayaran;
- menambah snapshot booking dan rekening pada pencairan;
- memindahkan relasi profil lama sebelum deduplikasi;
- mempertahankan nilai gambar sampul yang sudah tersimpan.

## Berkas backend yang berubah sejak Tahap 1

- `app/Console/Commands/ExpireBookingWorkflow.php`
- `app/Http/Controllers/Api/AdminController.php`
- `app/Http/Controllers/Api/AdminSettingController.php`
- `app/Http/Controllers/Api/AuthController.php`
- `app/Http/Controllers/Api/BookingRequestController.php`
- `app/Http/Controllers/Api/ClassroomController.php`
- `app/Http/Controllers/Api/HourlyRateController.php`
- `app/Http/Controllers/Api/LearningAttachmentController.php`
- `app/Http/Controllers/Api/LearningTopicController.php`
- `app/Http/Controllers/Api/OrderController.php`
- `app/Http/Controllers/Api/SessionWorkflowController.php`
- `app/Http/Controllers/Api/TeacherController.php`
- `app/Http/Controllers/Api/TeacherOfferController.php`
- `app/Http/Controllers/Api/TeacherScheduleController.php`
- `app/Http/Controllers/Api/UserController.php`
- `app/Models/PaymentSetting.php`
- `app/Models/Payout.php`
- `app/Services/GroupClassService.php`
- `app/Services/TeacherMatchingService.php`
- `app/Services/TeacherOfferReleaseService.php` (baru)
- `app/Services/TeacherPointService.php`
- `database/migrations/2026_07_28_000100_harden_stage_two_backend.php` (baru)
- `routes/api.php`
- `routes/console.php`
- `tests/Feature/StageTwoBackendSecurityTest.php` (baru)

## Pengujian yang disiapkan

`StageTwoBackendSecurityTest` mencakup:

- endpoint profil multipart murid;
- larangan tutor melewati verifikasi;
- larangan keputusan verifikasi admin ganda;
- konfigurasi rekening tunggal;
- larangan peserta kelompok belum membayar membuat laporan;
- pelepasan penawaran tutor tidak layak tanpa penalti;
- pelepasan penawaran yang bertabrakan setelah satu sesi diterima.

`TeacherPointServiceTest` mencakup batas 151/150, 121/120, 81/80, 41/40,
dan poin nol.

## Pemeriksaan yang sudah dijalankan

- Parser statis: 148 berkas PHP, 0 kesalahan sintaks.
- Kecocokan rute: 106 action API, 0 method controller hilang.
- ESLint: lulus.
- TypeScript `tsc --noEmit`: lulus.
- Build Vite produksi: lulus, 1.783 modul.
- Pencarian statis dialog bawaan browser: tidak ditemukan.
- Pencarian istilah payment gateway/Xendit/escrow/premium pada backend aktif:
  tidak ditemukan.

## Verifikasi runtime yang wajib dilakukan pada Tahap 4

Lingkungan penyusunan checkpoint ini tidak menyediakan PHP, Composer, atau MySQL.
Karena itu, migration dan pengujian Laravel belum diklaim lulus runtime.

Pada Laragon, buat cadangan database lebih dulu lalu jalankan:

```bash
cd bimbelku-backend
composer install
php artisan optimize:clear
php artisan migrate
php artisan test
php artisan route:list
php artisan schedule:list
composer audit
```

Gunakan `php artisan migrate:fresh --seed` hanya pada database pengembangan kosong
karena perintah tersebut menghapus seluruh data.

## Posisi melanjutkan

Tahap berikutnya adalah **Tahap 3 — penghapusan berkas dan dependensi yang tidak
penting**. Gunakan folder checkpoint ini sebagai dasar. Jangan kembali ke ZIP Tahap
1 atau versi tanggal 25 Juli.
