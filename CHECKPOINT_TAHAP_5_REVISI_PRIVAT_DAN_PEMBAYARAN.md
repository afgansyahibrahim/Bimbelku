# Checkpoint Tahap 5 — Revisi Privat dan Pembayaran

Tanggal pemeriksaan: 28 Juli 2026

## Temuan

Nilai katalog tidak tertukar. Frontend mengirim `private` untuk Privat dan
`group` untuk Kelompok. Backend juga membentuk booking dari nilai permintaan.

Namun, empat celah ditemukan:

1. pilihan Privat hanya terlihat sebagai nilai bawaan dropdown;
2. alur belum memiliki penjagaan otomatis saat respons berbeda dari pilihan;
3. data lama yang tidak konsisten belum direkonsiliasi;
4. rekening pertama dapat terkunci oleh tagihan lama yang masih aktif.

## Perbaikan

1. Jenis kelas ditampilkan sebagai dua tombol: Privat dan Kelompok.
2. Pilihan aktif ditulis langsung sebagai `Privat 1-on-1` atau `Kelompok`.
3. Snapshot formulir dipakai saat permintaan dikirim.
4. Respons backend dibandingkan dengan pilihan murid.
5. Permintaan yang tidak sesuai dibatalkan otomatis.
6. Backend menolak penyimpanan jika jenis kelas berubah saat pembuatan.
7. `Kelas Saya` membaca jenis kelas dari permintaan milik peserta.
8. Migration baru memperbaiki data privat lama yang aman direkonsiliasi.
9. Booking final dan snapshot transaksi diuji tetap berjenis Privat.
10. Rekening pertama dapat disimpan meskipun tagihan lama telah terbentuk.
11. Tutor tidak dapat menerima permintaan baru sebelum rekening admin tersedia.
12. Alasan kegagalan pengaturan pembayaran ditampilkan langsung.

Migration baru:

`2026_07_28_000400_repair_booking_class_type_consistency.php`

Migration hanya memperbaiki ketidaksesuaian yang aman:

- booking privat memiliki maksimal satu peserta aktif;
- semua permintaan peserta menunjukkan jenis yang sama;
- booking kelompok memiliki referensi kelompok yang sah.

## Pemasangan

Salin paket revisi lalu pilih **Replace**. Pertahankan `.env`, database, dan
folder unggahan lama.

Jalankan:

```powershell
cd C:\laragon\www\Website_Bimbelku
npm ci

cd bimbelku-backend
composer install
php artisan migrate
php artisan optimize:clear
php artisan storage:link

cd ..
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap5.ps1 -SkipInstall
```

Jangan menjalankan `php artisan migrate:fresh`.

## Uji manual

1. Isi rekening admin terlebih dahulu.
2. Login sebagai murid.
3. Pilih tombol **Privat**.
4. Pastikan teks aktif menunjukkan **Privat 1-on-1**.
5. Buat permintaan.
6. Pastikan notifikasi menyebut **Jenis kelas: Privat**.
7. Login sebagai tutor dan terima permintaan.
8. Buka Kelas Saya serta Riwayat Transaksi.
9. Pastikan keduanya menampilkan **Privat**.
10. Pastikan tagihan muncul sebagai **Belum Dibayar**.

Pemeriksaan lokal yang telah lulus:

- ESLint;
- TypeScript;
- 115 kontrak route-controller;
- build Vite sebanyak 1.793 modul;
- parser sintaks pada 155 berkas PHP.

Tes Laravel tetap dijalankan melalui Laragon karena PHP dan MySQL tidak tersedia
pada workspace pembuatan paket.
