# Checkpoint Tahap 2 — Mobile dan Permintaan Les

Tanggal: 29 Juli 2026

## Status

Tahap 2 telah diterapkan di atas source final Tahap 1. Data lama tidak
dihapus. Tes tutor tambahan tidak dimasukkan.

## Hasil frontend

- Navigasi bawah murid memuat Beranda, Cari, Kelas, dan Bantuan.
- Navigasi bawah tutor memuat Beranda, Permintaan, Kelas, dan Jadwal.
- Menu samping tetap tersedia untuk halaman sekunder.
- Formulir permintaan dibagi menjadi empat langkah.
- Langkah pertama memuat materi dan tujuan belajar.
- Langkah kedua memuat kelas, mode, alamat, dan lokasi.
- Langkah ketiga memuat jadwal serta pemeriksaan slot tutor.
- Langkah keempat memuat ringkasan sebelum permintaan dikirim.
- Panduan singkat ditampilkan sesuai halaman dan peran.
- Pusat Bantuan diperbaiki untuk layar ponsel.
- Riwayat pencairan tutor memakai kartu pada layar kecil.

## Hasil backend

- Endpoint `POST /api/student/tutor-availability` ditambahkan.
- Endpoint hanya dapat dipakai oleh akun murid.
- Permintaan dibatasi sebanyak 20 pemeriksaan per menit.
- Materi, jenjang, kelas, mode, jadwal, benturan, dan jarak diperiksa.
- Identitas dan jumlah tutor tidak dikirim pada hasil pemeriksaan.
- Pencarian sebenarnya tetap berjalan setelah permintaan dibuat.
- Pembayaran tetap dilakukan setelah tutor menerima permintaan.

## Pemeriksaan yang telah lulus

- ESLint.
- TypeScript tanpa emisi.
- 116 kontrak route dan controller API.
- Pemeriksaan pratinjau berkas.
- Kontrak khusus Tahap 2.
- Build produksi Vite.
- Anggaran bundle awal.
- Parsing 160 berkas PHP.

Tes Laravel `StageTwoMobileBookingTest` disediakan untuk Laragon. Lingkungan
penyusunan paket tidak memiliki PHP, Composer, dan MySQL.

## Keputusan yang dipertahankan

- Tutor dipilih otomatis.
- Murid tidak membuka katalog tutor.
- Profil tutor dibuka setelah tutor menerima permintaan.
- Pembayaran belum dilakukan saat formulir dikirim.
- Perguruan Tinggi dan Umum tetap dipisahkan.
- Tutor hanya diverifikasi melalui dokumen yang disepakati.
- `migrate:fresh` tidak digunakan.

## Tahap berikutnya

Tahap 3 berfokus pada pembayaran dan keamanan keuangan. Integrasi pembayaran
nyata belum diaktifkan dalam Tahap 2.
