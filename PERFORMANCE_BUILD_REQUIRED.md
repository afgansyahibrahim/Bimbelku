# BimbelKu Performance Revisi 1 — Build Required

Source pada paket ini sudah memuat Revisi Performa 1. Folder `dist/` pada source asli adalah build sebelum revisi dan sengaja tidak disertakan di paket delivery agar tidak tertukar dengan hasil revisi.

## Di Windows/Laragon

1. Gunakan `.env` milik project lokal Anda sendiri. Jangan menimpa `.env` dengan file dari ZIP.
2. Pastikan `bimbelku-backend/.env` memiliki origin frontend yang benar dan tambahkan `CORS_MAX_AGE=600` (atau biarkan default konfigurasi 600 detik).
3. Dari root frontend:
   - `npm install` atau `npm ci`
   - `npm run check:performance-revision1`
   - `npm run build`
4. Jalankan hasil production build, bukan `npm run dev`, untuk Lighthouse.
5. Jalankan Laravel/API seperti biasa pada environment lokal Anda.
6. Gunakan Chrome Guest/Profile baru tanpa extension. Jalankan Lighthouse Mobile dan Desktop minimal 3 kali per halaman dan gunakan median.

Panduan benchmark yang lebih lengkap ada di `PERFORMANCE_VALIDATION_WINDOWS.md`.

## Catatan

Environment sandbox yang digunakan untuk membuat revisi ini tidak dapat mengunduh dependency npm yang hilang dari registry internal dan Chromium-nya diblokir policy untuk membuka URL lokal. Karena itu, paket ini tidak menyertakan build `dist/` baru dan laporan tidak mengarang angka Lighthouse final.
