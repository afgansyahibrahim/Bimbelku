# Checkpoint Tahap 5 — Gabungan Revisi dan Optimasi Seluruh Web

Tanggal: 28 Juli 2026

## Dasar paket

Paket ini dibangun dari:

`BimbelKu_Tahap_5_Revisi_Privat_Pembayaran_2026-07-28.zip`

Seluruh perbaikan Privat dan Pembayaran tetap dipertahankan.

## Hasil optimasi

### Frontend

- JavaScript awal dipisahkan dari layout murid, tutor, dan widget pembayaran.
- Ukuran JavaScript awal turun dari 123,5 KB menjadi 97,3 KB gzip.
- Katalog awal hanya memuat daftar mapel dan metadata kelas.
- Bab dimuat setelah jenjang, kelas, dan mapel dipilih.
- Permintaan GET yang sama digabungkan saat masih berjalan.
- Profil, katalog, notifikasi, kelas, dan pengaturan publik memakai cache singkat.
- Cache dibersihkan otomatis setelah data berhasil diubah.
- Widget tagihan hanya dimuat pada sesi murid.
- Muat ulang status tagihan tidak lagi dipicu setiap perpindahan halaman.
- Batas ukuran produksi diperiksa otomatis melalui `npm run check`.

### Backend

- Data permintaan murid dimuat ulang dalam satu kelompok.
- Penawaran tutor aktif tidak lagi diminta berulang pada setiap status.
- Pemeriksaan rating kelas murid diselesaikan melalui satu query.
- Katalog mendukung respons ringkas dan detail terfilter.
- Respons katalog memakai ETag dan cache browser selama lima menit.
- Indeks ditambahkan pada filter pengguna, tagihan, notifikasi, permintaan, peserta, dan kelas.

## Perlindungan regresi

Ketentuan berikut tetap dikunci:

- Privat dikirim sebagai `private`.
- Kelompok dikirim sebagai `group`.
- Booking final harus mengikuti pilihan murid.
- Tagihan dibuat setelah tutor menerima.
- Filter Belum Dibayar tetap tersedia.
- Rekening pertama dapat disimpan.
- Perubahan rekening aktif tetap dilindungi saat tagihan berjalan.
- Jadwal memakai menit kelipatan sepuluh.
- Katalog kelas 1–12 tetap tersedia.
- Sidebar ponsel dan tablet tetap dapat disembunyikan.

## Pemeriksaan otomatis

Pemeriksaan lokal telah meluluskan:

- ESLint;
- TypeScript;
- 115 kontrak action API;
- build Vite terhadap 1.795 modul;
- parser sintaks terhadap 156 berkas PHP;
- anggaran JavaScript awal 110 KB gzip;
- anggaran CSS awal 20 KB gzip.

Tes runtime Laravel tetap dijalankan melalui Laragon karena PHP tidak tersedia pada workspace penyusunan.

## Aturan pemasangan

- Pilih **Replace** saat menyalin paket.
- Pertahankan kedua `.env`.
- Pertahankan database MySQL.
- Pertahankan folder unggahan lama.
- Jalankan `php artisan migrate`.
- Jangan menjalankan `php artisan migrate:fresh`.
