# Memasang Paket Final Jenjang Umum

## 1. Replace paket

Ekstrak paket terbaru ke:

`C:\laragon\www\Website_Bimbelku`

Pilih **Replace the files in the destination**.

Pertahankan data berikut:

- `.env`;
- `bimbelku-backend/.env`;
- database MySQL;
- `bimbelku-backend/storage/app`;
- `bimbelku-backend/public/storage`.

Jangan menjalankan `php artisan migrate:fresh`.

## 2. Terapkan revisi

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan migrate
php artisan db:seed --class=CurriculumCatalogSeeder
php artisan optimize:clear
php artisan storage:link

cd ..
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap5.ps1 -SkipInstall
```

Tidak diperlukan `npm ci` atau `composer install` jika paket Tahap 5 lama sudah berjalan.

## 3. Hasil yang diharapkan

```text
Tests: 39 passed
Pemeriksaan Tahap 5 lulus.
```

Jumlah assertion dapat berubah mengikuti versi PHPUnit.

## 4. Uji jenjang

- Pendaftaran murid hanya menampilkan SD, SMP, SMA, dan Umum.
- Pendaftaran tutor memakai empat jenjang yang sama.
- Umum menampilkan Semua tingkat, Pemula, Menengah, dan Lanjutan.
- Permintaan universitas melalui API harus ditolak.
- Mapel nonaktif memerlukan jenjang sebelum diaktifkan kembali.

## 5. Uji viewer bukti

- Klik foto bukti pembayaran atau pelaksanaan.
- Uji perbesar, perkecil, dan putar.
- Buka PDF melalui viewer internal.
- Pastikan berkas tidak masuk ke folder Downloads.
