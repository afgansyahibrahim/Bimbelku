# Tutorial Pasang Rate Limiter Isolation Fix

Patch ini TIDAK memiliki migration database dan TIDAK menghapus file.

## 1. Pasang file
Ekstrak `BimbelKu_RATE_LIMITER_ISOLATION_FIX_CHANGED_FILES_20260820.zip` ke root project:

`C:\laragon\www\Website_Bimbelku`

Pilih Replace/Overwrite.

## 2. Backend
Buka PowerShell:

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan optimize:clear
composer dump-autoload
php artisan test
```

Jika ada FAILED, berhenti dan kirim output failure.

## 3. Jika PHPUnit PASS
Jalankan checker khusus:

```powershell
cd C:\laragon\www\Website_Bimbelku
node scripts/check-rate-limiter-isolation.mjs
node scripts/check-payment-error-fix.mjs
```

Target:

```text
Rate Limiter Isolation PASS (39/39)
Payment rate-limit, schedule conflict, dan contextual error handling lulus pemeriksaan source-level.
```

## 4. Build frontend
Tidak ada source frontend yang berubah, tetapi untuk regression akhir tetap boleh menjalankan:

```powershell
npx tsc --noEmit
npm run build
```

## 5. Uji kasus bug rekening Tutor
Nyalakan backend + frontend, login Tutor, biarkan halaman dashboard terbuka beberapa saat agar polling berjalan, lalu buka profil/rekening dan simpan rekening untuk pertama kali.

Hasil yang diharapkan:
- Tidak mendapat 429 hanya karena polling/background request.
- Kalau rekening memang diubah berulang lebih dari batas khusus rekening, baru limiter `teacher-bank-change` bekerja.
- Payout, offer, Session V2, dan polling tidak mengonsumsi bucket rekening.
