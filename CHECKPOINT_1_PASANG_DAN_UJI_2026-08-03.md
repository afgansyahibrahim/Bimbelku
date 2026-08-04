# Pasang dan Uji — Audit Checkpoint 1

## 1. Cadangkan project dan database

Salin folder project dan ekspor database sebelum menimpa file. Jangan menghapus `.env`, `storage/app`, atau database.

## 2. Ekstrak patch

Ekstrak ZIP ke:

```text
C:\laragon\www\Website_Bimbelku
```

Pilih **Replace/Timpa**.

## 3. Jalankan pembersihan file runtime lama

```powershell
cd C:\laragon\www\Website_Bimbelku
powershell -ExecutionPolicy Bypass -File .\scripts\apply-checkpoint1-cleanup.ps1
```

Script aman dijalankan berulang. Script tidak menghapus migration, database, `.env`, upload pengguna, `vendor`, atau `node_modules`.

## 4. Pastikan akun admin utama

Periksa `bimbelku-backend\.env`:

```dotenv
PRIMARY_ADMIN_EMAIL=admin@domain-anda.id
SEED_ADMIN_EMAIL=admin@domain-anda.id
SEED_ADMIN_PASSWORD=kata-sandi-minimal-12-karakter
```

Lalu:

```powershell
cd bimbelku-backend
php artisan optimize:clear
php artisan db:seed --class=AdminSeeder
```

**Catatan:** seeder akan menonaktifkan admin lain dan mencabut tokennya, sesuai keputusan satu admin utama.

## 5. Jalankan tes backend

```powershell
php artisan test --filter=CheckpointOneFoundationAuditTest
php artisan test --filter=StageSixCFinalRegressionTest
php artisan route:list --path=api
```

Jangan menjalankan `migrate:fresh` pada database berisi data penting.

## 6. Jalankan pemeriksaan frontend dan statis

```powershell
cd ..
npm run check:checkpoint1
npm run check:contracts
npm run check:stage3
npm run check:stage6c-final
npm run typecheck
npm run build
```

## 7. Jalankan aplikasi

Terminal backend:

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan serve
```

Terminal frontend:

```powershell
cd C:\laragon\www\Website_Bimbelku
npm run dev
```

Uji login admin utama, murid aktif, tutor aktif, akun diblokir, dan akses URL lintas role.
