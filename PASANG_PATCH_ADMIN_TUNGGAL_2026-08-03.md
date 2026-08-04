# Memasang Patch Admin Tunggal

Patch ini dibuat dari basis terbaru:

1. `Website_Bimbelku(1).zip`;
2. patch penghapusan halaman autentikator admin;
3. patch tutorial terbaru yang mencegah halaman kosong setelah tutorial selesai.

## 1. Timpa file patch

Ekstrak ZIP patch ke:

```text
C:\laragon\www\Website_Bimbelku
```

Pilih **Replace/Timpa**.

## 2. Hapus dua halaman frontend yang sudah tidak digunakan

Dari folder utama project:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\apply-single-admin-cleanup.ps1
```

Script hanya menghapus:

- `src/pages/admin/AdminAccessControl.tsx`;
- `src/pages/admin/FinanceSecurity.tsx`.

## 3. Bersihkan cache backend

```powershell
cd bimbelku-backend
php artisan optimize:clear
```

Tidak ada migration baru.

## 4. Jalankan pemeriksaan

```powershell
php artisan test --filter=StageSixCAccessAuditTest
php artisan test --filter=StageSixCFinalRegressionTest
cd ..
npm run check:stage6c-d
npm run check:stage6c-final
npm run typecheck
npm run dev
```

## Hasil akhir

- hanya satu admin utama yang dapat login dan memakai panel admin;
- bila `SEED_ADMIN_EMAIL` cocok dengan akun aktif, akun tersebut menjadi admin utama;
- bila nilainya kosong atau tidak cocok, akun admin aktif dengan ID terkecil menjadi admin utama;
- menu dan API pembuatan admin tambahan ditutup;
- admin utama mempunyai seluruh menu;
- audit perubahan tetap tersedia;
- autentikator lokal tetap tidak diminta;
- perbaikan tutorial terbaru tidak ditimpa oleh patch ini.
