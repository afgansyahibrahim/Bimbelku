# Pemasangan dan Pengujian Tahap 4

Paket ini harus dipasang di atas proyek BimbelKu yang sudah mempunyai
konfigurasi `.env` frontend dan backend.

## Cara aman

1. Matikan `npm run dev` dan `php artisan serve`.
2. Cadangkan folder proyek dan database MySQL.
3. Ekstrak ZIP Tahap 4 ke folder sementara.
4. Salin isi `Website_Bimbelku` ke proyek lama.
5. Pertahankan `.env` frontend dan `bimbelku-backend\.env` milik instalasi lama.
6. Buka PowerShell dari folder utama proyek.
7. Jalankan:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap4-learning.ps1
```

Skrip menjalankan dependensi frontend, pemeriksaan source, Composer, migration
bertahap, cache clear, storage link, dan tes Tahap 4.

## Uji manual tiga akun

1. Murid membuat permintaan privat.
2. Tutor menerima permintaan.
3. Murid mengirim pembayaran.
4. Admin mengonfirmasi pembayaran.
5. Murid dan tutor membuka `Kelas Saya`.
6. Keduanya membuka `Ruang Belajar`.
7. Tutor mengisi asesmen dan target.
8. Murid menyetujui target.
9. Murid membuat PIN ketika tutor hadir.
10. Tutor melakukan check-in.
11. Tutor melakukan check-out setelah belajar.
12. Tutor menerbitkan laporan progres.
13. Tutor mengunggah bukti penyelesaian.
14. Murid memeriksa laporan dan menyetujui penyelesaian.

Untuk kelas offline, izinkan lokasi pada browser tutor saat check-in.

## Jangan dilakukan

- Jangan menjalankan `php artisan migrate:fresh`.
- Jangan menyalin `.env` dari ZIP untuk menimpa konfigurasi lama.
- Jangan mengaktifkan pembayaran publik sebelum Tahap 5 selesai diuji.
