# Pasang dan Uji — Audit Checkpoint 4

## 1. Cadangkan project dan database

```powershell
Copy-Item "C:\laragon\www\Website_Bimbelku" "C:\laragon\www\Website_Bimbelku_backup_cp4" -Recurse
```

Ekspor database melalui HeidiSQL/phpMyAdmin sebelum memasang patch.

## 2. Pasang patch

Ekstrak patch ke:

```text
C:\laragon\www\Website_Bimbelku
```

Pilih **Replace/Timpa**.

## 3. Jalankan pembersihan aman

```powershell
cd C:\laragon\www\Website_Bimbelku
powershell -ExecutionPolicy Bypass -File .\scripts\apply-checkpoint4-cleanup.ps1
```

Script tidak menyentuh database, migration, upload pengguna, `.git`, `vendor`, atau `node_modules`.

## 4. Bersihkan cache dan uji backend

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan optimize:clear
php artisan test --filter=CheckpointFourQualityAuditTest
php artisan test --filter=CheckpointThreeCommunicationAuditTest
php artisan test --filter=StageSixCFinalRegressionTest
```

## 5. Uji frontend dari folder utama

```powershell
cd C:\laragon\www\Website_Bimbelku
npm run check:checkpoint4
npm run check:contracts
npm run check:pages
npm run check:php-static
npm run typecheck
npm run lint
npm run build
npm run check:performance
```

## 6. Jalankan website

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

Vite sekarang hanya membuka `127.0.0.1` secara default. Untuk menguji dari HP pada Wi-Fi yang sama, jalankan secara sengaja:

```powershell
npm run dev -- --host 0.0.0.0
```

Jangan gunakan mode tersebut pada jaringan publik.

## 7. Matriks uji visual minimum

Uji admin, tutor, dan murid pada:

- 1440×900 desktop;
- 1024×768 laptop/tablet landscape;
- 768×1024 tablet portrait;
- HP 430, 390, 360, dan 320 piksel;
- portrait dan landscape.

Periksa:

1. tidak ada scroll horizontal;
2. sidebar dapat dibuka/ditutup;
3. dropdown dan notifikasi tidak keluar layar;
4. modal dapat di-scroll dan tombol penutup terlihat;
5. input tidak memicu zoom otomatis;
6. tutorial menggeser halaman, selesai tanpa blank, dan fokus kembali;
7. navigasi dapat digunakan dengan Tab, Enter, Space, dan Escape;
8. gambar tampil tanpa layout bergeser besar;
9. sampul tutor baru menjadi lebih kecil setelah dipilih;
10. pratinjau file dapat dibuka, diperbesar, ditutup, dan fokus kembali.

## 8. Uji header API

Di PowerShell:

```powershell
curl.exe -I http://127.0.0.1:8000/api/learning-catalog
```

Pastikan terlihat paling tidak:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), geolocation=(self), microphone=()
```

Kirim seluruh output jika ada perintah yang `FAIL`; jangan menghapus migration atau database.
