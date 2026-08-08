# Validasi Performance Revisi 1 di Windows/Laragon

File ini sengaja singkat. Laporan teknis lengkap ada di `PERFORMANCE_AUDIT_REPORT.md`.

## 1. Gunakan `.env` milik project asli

Artifact revisi sebaiknya tidak membagikan secret. Jika `.env` tidak ada setelah ekstrak, copy `.env` frontend dan `bimbelku-backend/.env` dari project asli Anda.

Pastikan backend `.env` memiliki:

```env
CORS_MAX_AGE=600
```

## 2. Frontend

PowerShell dari root project:

```powershell
npm install
npm run check:performance-revision1
npm run build
npm run check:performance
npm run preview -- --host 127.0.0.1 --port 8080
```

Jangan Lighthouse `npm run dev`.

## 3. Backend

Gunakan Laragon Apache/Nginx + MySQL jika itu environment harian project. Sebelum benchmark:

```powershell
cd bimbelku-backend
composer install
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Untuk diagnosis query, jangan mengandalkan skor Lighthouse saja. Timing `/api/student/packages/quote` dan OPTIONS-nya harus dicatat terpisah.

## 4. Chrome bersih

Gunakan Chrome Guest Profile atau profile baru tanpa extension. Jangan membandingkan run bersih dengan run yang masih memakai extension.

Minimum tiga run, ambil median:
- Mobile: landing, `/student/packages/new`, dashboard, satu halaman database-heavy.
- Desktop: halaman yang sama.

Catat:
- Performance
- FCP
- LCP
- TBT
- CLS
- Speed Index

## 5. Khusus `/student/packages/new`

Di Network periksa:
- `/package-plans`
- `/learning-catalog?compact=1`
- `/learning-time-slots`
- `/student/vouchers?compact=1`
- `/user`
- `/student/packages/tutorial-status`
- `/student/packages/quote`
- `/notifications`
- `/active-order`

Setelah Revisi 1, tiga GET publik pertama tidak seharusnya membawa header Authorization dari client. Pada setup cross-origin, itu menghilangkan preflight yang sebelumnya dibuat hanya oleh bearer token.

`/student/packages/quote` masih authenticated POST JSON, jadi preflight pertama pada cross-origin tetap normal. Yang harus berubah adalah preflight sukses dapat dicache (default 600 detik), dan request quote lama dapat dibatalkan saat form berubah.

## 6. Stop jika ada regression

Jangan lanjut mengejar skor bila:
- tampilan berubah,
- responsive rusak,
- harga/quote berubah,
- role/auth berubah,
- API error baru,
- console error baru.

Kembalikan perubahan terakhir dan profile ulang.
