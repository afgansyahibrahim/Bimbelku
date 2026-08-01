# Checkpoint Tahap 4 — Pencocokan, Sesi, Perkembangan, dan Pengujian

Tanggal konsolidasi: 1 Agustus 2026  
Status: catatan implementasi dan pengujian Tahap 4 digabung ke dokumen ini.

## Pencocokan tutor

- Tutor dipilih otomatis berdasarkan mapel, jenjang, mode, lokasi, dan jadwal.
- Radius offline diperluas bertahap sampai 12 km.
- Penawaran kedaluwarsa dapat dilepas dan kandidat berikutnya dicari.
- Jadwal yang sudah diterima dikunci agar tidak bertabrakan.
- Identitas tutor dibuka setelah hubungan kelas dinyatakan sah.

## Ruang belajar

- Chat disimpan per booking melalui `classroom_messages`.
- Akses chat hanya tersedia bagi murid berbayar, tutor kelas, dan admin.
- Pesan menolak kontak pribadi, akun media sosial, serta tautan luar.
- PIN enam angka dipakai untuk verifikasi kehadiran tutor.
- Check-in dan check-out menyimpan waktu serta lokasi kelas offline.
- Target belajar memerlukan persetujuan murid.
- Laporan perkembangan menyimpan materi, kemampuan, kesulitan, latihan, dan progres.
- Riwayat sesi tetap dapat dibaca setelah kelas selesai.

Migration utama:

`2026_07_30_000400_build_stage_four_learning_sessions.php`

## Pengujian dan perbaikan

- Profil, autentikasi, registrasi, dan konfigurasi lokal diperiksa ulang.
- Tes fitur Laravel disiapkan untuk alur tiga peran.
- Kontrak API memastikan route memiliki controller dan method.
- Pemeriksaan struktur PHP mendeteksi konflik merge dan tanda yang tidak ditutup.
- Pemeriksaan frontend mencakup ESLint, TypeScript, dan build Vite.
- Audit dependensi dijalankan melalui lingkungan yang memiliki Composer.

## Pemasangan Laragon

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
composer install
php artisan optimize:clear
php artisan migrate
php artisan test
php artisan route:list
php artisan schedule:list
```

Data lama tidak boleh dihapus melalui `migrate:fresh`.

## Hubungan dengan Tahap 6A

Tahap 6A memanfaatkan chat dan perkembangan Tahap 4. Halaman murid khusus
Pesan serta Perkembangan dipulihkan pada revisi 6A tanpa membuka akses baru.
