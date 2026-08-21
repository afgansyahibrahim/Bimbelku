# TUTORIAL UJI TAHAP REVISI 2 — BAB-ONLY + ADMIN MONITORING

## 1. Pasang source

Gunakan FULL checkpoint untuk hasil paling aman. Jika memakai changed-files ZIP, extract ke root project dan overwrite file yang sama.

Root project:

`C:\laragon\www\Website_Bimbelku`

## 2. Migration + cache Laravel

Buka PowerShell:

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan optimize:clear
php artisan migrate
```

Migration Tahap 2 hanya menambah index Monitoring Admin; tidak menghapus data Subbab/topik lama.

## 3. Test backend

Jalankan satu per satu:

```powershell
php artisan test --filter=StageFivePackageExperienceTest
php artisan test --filter=StageOneSessionActionReminderTest
php artisan test --filter=StageSixCAdminOperationsTest
php artisan test --filter=DemoPackageRenewalCommandTest
php artisan test --filter=CheapClassWorkflowTest
```

Jika semuanya PASS, lanjutkan full backend test bila waktunya cukup:

```powershell
php artisan test
```

## 4. Test frontend/source

Terminal root project:

```powershell
cd C:\laragon\www\Website_Bimbelku
npm run check:user-testing-stage1
npm run check:user-testing-stage2
npm run check:stage4-progress
npm run check:stage5-session-progress
npm run check:session-final
npm run check:session-draft-guidance
npm run check:session-target-guidance
npm run check:cheap-class-session-verification
npm run check:cheap-class-popup
npm run check:demo-cheap-class
npm run check:package-renewal
npm run check:stage2-wallet
npm run typecheck
npm run build
```

`npm run typecheck` yang hanya menampilkan `tsc --noEmit` lalu kembali ke prompt berarti PASS.

## 5. Manual QA — Paket Belajar Bab-only

1. Login murid.
2. Buka `Cari Bimbingan` / Package Builder.
3. Pilih jenjang, kelas, mapel.
4. Pastikan yang tampil hanya **Bab yang ingin dipelajari**; tidak ada Subbab.
5. Pilih 2–3 Bab.
6. Pilih jadwal dan buka ringkasan.
7. Pastikan ringkasan tidak menyebut Subbab.
8. Buat paket.
9. Cek database/API hanya bila perlu: paket baru boleh menyimpan compatibility row internal, tetapi UI tidak boleh mengekspos Subbab.

## 6. Manual QA — sesi privat lama tetap aman

Demo lama sengaja bagus untuk compatibility karena fixture-nya dapat memiliki beberapa baris materi legacy dalam satu Bab.

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan demo:session-reminder reset
php artisan demo:session-reminder setup
php artisan demo:session-reminder status
```

Lanjutkan flow biasa sampai check-out. Di Hasil Belajar:

- yang tampil hanya Bab;
- pilih status Bab `Sedang dipelajari` atau `Selesai`;
- simpan;
- Progress murid/tutor harus berubah per Bab;
- Riwayat Sesi harus menunjukkan before → after per Bab.

## 7. Manual QA — Renewal

```powershell
php artisan demo:package-renewal reset
php artisan demo:package-renewal setup
php artisan demo:package-renewal status
```

Login murid → Riwayat Paket → `Perpanjang dengan Tutor Ini`.

Pastikan:

- materi lama ditampilkan sebagai Bab;
- bila seluruh Bab lama selesai, tidak ada Bab yang otomatis dipilih;
- tersedia badge `Selesai sebelumnya` / `Lanjutkan`;
- murid dapat memilih Bab lanjutan atau Bab lama untuk penguatan;
- rule tutor sama 24 jam dan tanpa tutor lama 72 jam tetap berlaku.

Jangan `reset` di tengah flow.

## 8. Manual QA — Admin Monitoring

Login Admin → `Monitoring kelas`.

Harus terbuka pada **Perlu Tindakan**, bukan Semua.

Cek:

- kartu ringkasan Perlu Tindakan / Aktif / Akan Datang / Riwayat;
- search mapel/Bab/tutor;
- filter Paket Belajar / Kelas Kelompok;
- filter status;
- rentang tanggal;
- maksimum 20 data dimuat per halaman dari UI;
- klik Detail baru membuka data peserta/report lengkap;
- tidak ada opsi `Tampilkan Semua`.

Feature test `StageSixCAdminOperationsTest` sudah menyiapkan kasus >20 booking untuk memastikan page 1=20 dan page 2 berisi sisa data.

## 9. QA mobile wajib

DevTools responsive:

- 320 × 700
- 360 × 800
- 390 × 844
- 430 × 932

Cek Package Builder, Progress detail murid, Progress tutor, dan Monitoring Admin.

Target:

- tidak horizontal overflow;
- Monitoring Admin berubah menjadi card, bukan tabel sempit;
- filter stack dengan rapi;
- pagination bisa ditekan;
- Bab cards tetap terbaca;
- tidak ada teks “Subbab”.

## Jika gagal

Jangan reset fixture yang sedang dianalisis. Kirim:

1. command terakhir;
2. role/browser;
3. screenshot;
4. output error;
5. untuk demo, output `php artisan demo:session-reminder status` atau `php artisan demo:package-renewal status`.
