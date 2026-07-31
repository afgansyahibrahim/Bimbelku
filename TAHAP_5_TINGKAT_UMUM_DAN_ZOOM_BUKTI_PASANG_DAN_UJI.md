# Memasang Revisi Tingkat Umum dan Zoom Bukti

## 1. Replace paket

Ekstrak paket terbaru ke:

`C:\laragon\www\Website_Bimbelku`

Pilih **Replace the files in the destination**.

Jangan menimpa atau menghapus `.env`, database, dan folder unggahan lama.

## 2. Perbarui dependensi dan katalog

```powershell
cd C:\laragon\www\Website_Bimbelku
npm ci

cd bimbelku-backend
composer install
php artisan migrate
php artisan db:seed --class=CurriculumCatalogSeeder
php artisan optimize:clear
php artisan storage:link
```

Pesan `public\storage link already exists` dapat diabaikan.

Jangan menjalankan `migrate:fresh`.

## 3. Jalankan tes

```powershell
cd C:\laragon\www\Website_Bimbelku
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap5.ps1 -SkipInstall
```

Tes harus berakhir dengan:

```text
Pemeriksaan Tahap 5 lulus.
```

## 4. Jalankan website

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

Tekan `Ctrl + F5` pada browser setelah kedua terminal aktif.

## 5. Uji pilihan baru

- Murid dapat memilih Perguruan Tinggi dan Semester 1–14.
- Murid dapat memilih Umum dan tingkat kemampuan.
- Tutor dapat memilih jenjang Perguruan Tinggi atau Umum.
- Admin dapat membuat mapel, materi, dan tarif untuk pilihan tersebut.
- Pencocokan hanya memakai tutor dengan mapel serta jenjang yang sesuai.

## 6. Uji viewer bukti

- Klik foto bukti pembayaran.
- Uji tombol perbesar, perkecil, dan putar.
- Klik foto bukti pelaksanaan.
- Buka PDF identitas atau kualifikasi tutor.
- Pastikan browser tidak membuat unduhan otomatis.
