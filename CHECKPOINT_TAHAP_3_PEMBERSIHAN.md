# Checkpoint Tahap 3 — Pembersihan Proyek

Tanggal: 28 Juli 2026  
Dasar: checkpoint Tahap 2 pada `project/Website_Bimbelku`

## Status

Tahap 3 selesai. Pembersihan hanya menyentuh berkas yang terbukti tidak digunakan atau dapat dibuat ulang.

Kode fitur frontend dan backend tidak dihapus. Migration lama dipertahankan untuk menjaga instalasi baru dan database berjalan.

## Yang dihapus

| Target | Alasan |
| --- | --- |
| `node_modules/` | Hasil instalasi npm. Folder dibuat ulang melalui `npm ci`. |
| `dist/` | Hasil build Vite. Folder dibuat ulang melalui `npm run build`. |
| `bun.lockb` | Proyek memakai npm dan `package-lock.json` sebagai acuan tunggal. |
| `public/bimbel_cerdas.jpg` | Aset lama tidak dirujuk oleh HTML, CSS, TypeScript, atau konfigurasi. |
| `bimbelku-backend/bootstrap/cache/packages.php` | Cache Laravel hasil Composer. Berkas dibuat ulang saat instalasi. |
| `bimbelku-backend/bootstrap/cache/services.php` | Cache Laravel hasil Composer. Berkas dibuat ulang saat instalasi. |
| `bimbelku-backend/public/favicon.ico` | Berkas kosong pada backend API. |
| `bimbelku-backend/tests/Unit/ExampleTest.php` | Tes bawaan hanya memeriksa nilai `true`. |
| `src/hooks/` | Direktori kosong tanpa referensi. |
| `bimbelku-backend/resources/css/` | Direktori kosong. Frontend berada pada folder utama. |
| `bimbelku-backend/resources/js/` | Direktori kosong. Frontend berada pada folder utama. |
| `@tailwindcss/typography` | Dependensi tidak dikonfigurasi dan tidak digunakan pada source. |

`package.json` dan `package-lock.json` sudah diperbarui setelah dependensi tersebut dilepas.

## Yang sengaja dipertahankan

- Seluruh migration dipertahankan agar urutan perubahan skema tetap tersedia.
- Seluruh model, controller, service, middleware, route, seeder, dan factory masih dirujuk.
- Seluruh halaman dan komponen TypeScript terhubung dari entry aplikasi.
- `src/vite-env.d.ts` dipertahankan karena menyediakan tipe Vite bagi TypeScript.
- `public/favicon.ico`, `public/logo_bimbel.png`, dan `public/bimbel_cerdas.png` tetap digunakan.
- Lockfile npm dan Composer dipertahankan agar instalasi dapat direproduksi.
- Dokumen PRD, catatan revisi, README, dan checkpoint sebelumnya tetap disimpan.
- Direktori `storage` dan cache kosong Laravel dipertahankan untuk kebutuhan runtime.

## Pemeriksaan

- ESLint: lulus.
- TypeScript: lulus.
- Build Vite: lulus.
- Modul produksi: 1.783 modul.
- `npm ci --dry-run --offline`: lulus.
- Dependensi runtime frontend: 17 paket dan seluruhnya dirujuk.
- Berkas PHP tersisa: 145.
- Pemeriksaan struktur PHP: tidak menemukan kurung atau blok yang rusak.
- Action API: 106.
- Method controller yang hilang: 0.
- `package.json`, `package-lock.json`, `composer.json`, dan `composer.lock`: dapat dibaca.
- Ukuran folder setelah artefak instalasi dan build dilepas: sekitar 1,82 MB.

PHP, Composer, dan MySQL belum tersedia pada workspace ini. Pengujian Laravel nyata tetap dijalankan pada Tahap 4.

## Cara memasang kembali dependensi

Frontend:

```bash
npm ci
npm run dev
```

Backend:

```bash
cd bimbelku-backend
composer install
```

Jangan menyalin `node_modules` atau `vendor` dari komputer lain. Dependensi harus dibuat melalui lockfile masing-masing.

## Posisi lanjutan

Tahap berikutnya ialah Tahap 4: pengujian alur nyata melalui Laragon, PHP, Composer, dan MySQL.
