# Tutorial Apply FIX2

1. Ekstrak ZIP changed files ke root `C:\laragon\www\Website_Bimbelku` dan pilih overwrite.
2. Tidak ada migration baru dan tidak ada file yang perlu dihapus.
3. Jalankan:

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan optimize:clear
composer dump-autoload
php artisan test
```

Jika semua PASS, lanjutkan frontend:

```powershell
cd C:\laragon\www\Website_Bimbelku
npx tsc --noEmit
npm run build
```
