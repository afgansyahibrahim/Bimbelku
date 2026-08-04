# Pasang dan Uji — Audit Checkpoint 3

## 1. Pasang patch

Ekstrak ZIP ke:

```text
C:\laragon\www\Website_Bimbelku
```

Pilih **Replace/Timpa**.

## 2. Jalankan pembersihan file lama

```powershell
cd C:\laragon\www\Website_Bimbelku
powershell -ExecutionPolicy Bypass -File .\scripts\apply-checkpoint3-cleanup.ps1
```

Script hanya menghapus controller/model/checker chat lama yang tidak lagi diroute. Migration lama tidak dihapus.

## 3. Bersihkan cache dan tes backend

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan optimize:clear
php artisan test --filter=CheckpointThreeCommunicationAuditTest
php artisan test --filter=StageFourLearningSessionTest
php artisan test --filter=StageSixBTeacherOperationsTest
php artisan test --filter=StageSixCFinalRegressionTest
```

## 4. Pemeriksaan frontend dan kontrak

```powershell
cd C:\laragon\www\Website_Bimbelku
npm run check:checkpoint3
npm run check:contracts
npm run check:pages
npm run check:php-static
npm run typecheck
npm run build
```

## 5. Jalankan website

Terminal frontend:

```powershell
cd C:\laragon\www\Website_Bimbelku
npm run dev
```

Terminal backend:

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan serve
```

## 6. Uji manual minimum

1. Buka kelas kelompok sebagai dua murid berbeda. Masing-masing hanya boleh melihat laporan sendiri.
2. Buka chat kelas berbayar. Kartu sistem “Pesanan belajar terhubung” harus tampil satu kali.
3. Kirim dan baca pesan dari kedua role. Angka belum dibaca harus kembali nol.
4. Buat tiket sebagai murid dan tutor. Admin harus menerima notifikasi.
5. Balas tiket sebagai admin. Pemilik tiket harus menerima notifikasi menuju halaman bantuan role-nya.
6. Tutup tiket. Pemilik menerima notifikasi bahwa tiket selesai.
7. Buka lampiran chat, tiket, bukti privat, dan dokumen tutor menggunakan akun yang berhak; akun lain harus 403.
8. Pada kelas kelompok, nama murid harus terlihat pada kartu laporan tutor.
9. Coba menerbitkan laporan kedua untuk murid dan booking yang sama; harus ditolak 422.

Bila ada tes gagal, kirim seluruh output error tanpa menghapus database atau migration.
