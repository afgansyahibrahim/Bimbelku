# Tutorial Apply — Production Legacy Retirement Fix 1

Hotfix ini untuk project yang sudah memasang Production Legacy Retirement dan mendapat banyak failure saat `php artisan test`.

## 1. Overlay hotfix
Ekstrak `BimbelKu_PRODUCTION_LEGACY_RETIREMENT_FIX1_CHANGED_FILES_20260820.zip` ke root project BimbelKu dan pilih overwrite.

Tidak ada file legacy tambahan yang perlu dihapus dan tidak ada migration baru pada hotfix ini.

## 2. Backend
Buka PowerShell di root project:

```powershell
cd bimbelku-backend
php artisan optimize:clear
composer dump-autoload
php artisan test
```

Jika masih ada FAILED, stop di sini dan kirim output failure terbaru.

## 3. Kalau backend PASS
Kembali ke root project:

```powershell
cd ..
npx tsc --noEmit
npm run build
```

Lalu jalankan checker utama:

```powershell
node scripts/check-production-legacy-retirement.mjs
node scripts/check-session-presence-v2.mjs
node scripts/check-stage2-bab-monitoring-scalability.mjs
node scripts/check-package-renewal-flow.mjs
node scripts/check-demo-cheap-class.mjs
```

Catatan: jangan ulangi command `Remove-Item` Production Legacy Retirement; file legacy sudah dihapus pada patch sebelumnya.
