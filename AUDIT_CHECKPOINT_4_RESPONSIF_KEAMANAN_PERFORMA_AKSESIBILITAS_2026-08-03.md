# Audit Checkpoint 4 — Responsif, Keamanan, Performa, dan Aksesibilitas

Tanggal audit: 3 Agustus 2026  
Basis kode: full project terbaru + seluruh patch Checkpoint 1–3 + dua perbaikan runtime Checkpoint 3.

## Ruang lingkup

Checkpoint ini memeriksa:

- tampilan desktop, laptop, tablet, serta kesiapan HP 430, 390, 360, dan 320 piksel;
- modal, sidebar, notifikasi, tutorial, pratinjau file, dan input di layar kecil;
- akses keyboard, fokus, label tombol, teks alternatif gambar, dan reduced motion;
- header keamanan HTTP, masa aktif token, pembersihan token, CORS, throttling, dan server development;
- code splitting, gambar, font, asset hasil build, log, serta source yang tidak lagi dipakai.

## Ringkasan hasil

| No | Halaman/Fitur | Jenis masalah | Risiko | Penyebab | Solusi | Status |
|---:|---|---|---|---|---|---|
| 1 | Seluruh halaman | Performa render awal | Sedang | CSS memuat Google Fonts dari jaringan sebelum tampilan siap. | Import eksternal dihapus dan diganti font stack sistem. | Diperbaiki |
| 2 | API Laravel | Keamanan header | Tinggi | Respons belum mempunyai perlindungan `nosniff`, anti-frame, referrer, permissions, dan HSTS. | Middleware `ApplySecurityHeaders` ditambahkan secara global. | Diperbaiki |
| 3 | Token API | Keamanan sesi | Tinggi | Token Sanctum tidak memiliki batas usia global. | Masa aktif default 720 menit dan jadwal `sanctum:prune-expired` ditambahkan. | Diperbaiki |
| 4 | Vite development | Paparan jaringan | Sedang | Server development membuka host `::` ke jaringan lokal secara default. | Default diubah menjadi `127.0.0.1`; akses HP harus dinyalakan secara sengaja. | Diperbaiki |
| 5 | Layout admin/tutor/murid | Aksesibilitas keyboard | Sedang | Tidak tersedia skip link menuju konten utama. | Skip link dan target `main-content` ditambahkan pada tiga layout. | Diperbaiki |
| 6 | Tutorial dan pratinjau file | Fokus keyboard | Sedang | Fokus dapat tertinggal di elemen latar setelah dialog dibuka/ditutup. | Fokus dipindah ke dialog dan dikembalikan ke pemicu setelah ditutup. | Diperbaiki |
| 7 | Input HP | Responsif/UX | Sedang | Input di bawah 16 piksel dapat memicu zoom otomatis pada iOS. | Ukuran input HP dipaksa minimal 16 piksel. | Diperbaiki |
| 8 | Modal layar kecil | Responsif | Sedang | Beberapa modal memakai `vh`, yang tidak stabil ketika bilah browser HP berubah. | Tinggi modal aktif diganti ke `dvh` dan dibatasi terhadap viewport. | Diperbaiki |
| 9 | Gambar | Performa dan aksesibilitas | Sedang | Sejumlah gambar tidak memiliki strategi loading/decoding konsisten. | Semua tag `<img>` aktif mempunyai `alt`, `loading`, dan `decoding`. | Diperbaiki |
| 10 | Sampul tutor | Performa gambar | Sedang | Sampul dapat diunggah mendekati 2 MB dan object URL preview tidak dibersihkan. | Gambar diperkecil maksimal 1600×900, dikonversi WebP bila lebih kecil, dan object URL dibersihkan. | Diperbaiki |
| 11 | Kartu/tombol custom | Aksesibilitas | Sedang | Sebagian elemen klik memakai `div` atau tombol ikon tanpa nama aksesibel. | Komponen yang ditemukan pada bantuan, catatan, notifikasi, upload, dan transaksi dibuat semantik serta diberi label. | Diperbaiki |
| 12 | Source dan hasil build lama | Kebersihan/performa workspace | Rendah | Tiga source lama dan dua checker lama tidak lagi masuk graph aplikasi; `dist` dan log lama tetap tersimpan. | Script cleanup aman ditambahkan. | Diperbaiki |

## Perbaikan keamanan

- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy` membatasi kamera dan lokasi ke origin sendiri serta menutup mikrofon.
- HSTS dikirim ketika request menggunakan HTTPS.
- Respons Bearer token memakai `Cache-Control: no-store, private` dan `Pragma: no-cache`.
- Token Sanctum default kedaluwarsa setelah 12 jam.
- Token kedaluwarsa dibersihkan setiap hari.
- Login dan endpoint sensitif tetap memiliki throttling.
- CORS tetap menggunakan daftar origin dari environment, bukan wildcard origin.
- `.env`, database dump, log, `vendor`, dan `node_modules` tetap diabaikan Git.

Content Security Policy belum dipaksakan pada checkpoint ini karena website masih mendukung URL gambar/konten dinamis. CSP production harus disusun setelah domain frontend, API, storage, dan media final sudah ditetapkan agar tidak mematikan gambar atau request yang sah.

## Perbaikan responsif dan aksesibilitas

- Layout utama memakai `h-dvh` dan konten memiliki area scroll sendiri.
- Notifikasi HP dibatasi terhadap lebar viewport.
- Modal memakai tinggi dinamis dan overflow internal.
- Tombol overlay sidebar/notifikasi memakai elemen tombol dan nama aksesibel.
- Style `focus-visible` global tersedia.
- `prefers-reduced-motion` sudah mengurangi animasi.
- Gambar mempunyai teks alternatif dan decoding non-blocking.
- Tombol unggah gambar tetap terlihat dan dapat difokuskan pada HP.
- Kartu tiket bantuan serta catatan admin dapat digunakan dengan keyboard.
- Pratinjau file menutup dengan Escape dan mengembalikan fokus.

## Perbaikan performa

- Seluruh halaman tetap di-lazy-load melalui `React.lazy`.
- Google Fonts render-blocking dihapus.
- Sampul tutor baru dioptimalkan sebelum upload.
- Loading gambar daftar menggunakan lazy loading; banner aktif dan logo menggunakan eager loading.
- Tiga modul source yang tidak terhubung dan dua checker usang dibersihkan.
- Folder `dist` lama dihapus oleh script dan dibuat kembali melalui `npm run build`.
- Log Laravel lama dikosongkan tanpa menyentuh upload pengguna.

File upload pengguna lain, migration, `.git`, `vendor`, dan `node_modules` tidak dihapus.

## File runtime utama yang diubah

- `src/index.css`
- `src/components/AdminLayout.tsx`
- `src/components/StudentLayout.tsx`
- `src/components/TeacherLayout.tsx`
- `src/components/RoleQuickGuide.tsx`
- `src/components/FilePreviewProvider.tsx`
- `src/components/ProtectedImage.tsx`
- komponen/halaman yang mempunyai gambar, modal, tombol, dan kartu interaktif terkait
- `src/pages/admin/SettingsDisplay.tsx`
- `vite.config.ts`
- `bimbelku-backend/app/Http/Middleware/ApplySecurityHeaders.php`
- `bimbelku-backend/bootstrap/app.php`
- `bimbelku-backend/config/sanctum.php`
- `bimbelku-backend/routes/console.php`
- `bimbelku-backend/.env.example`

## File yang dibersihkan

- `src/components/PackageBuilderGuide.tsx`
- `src/components/PackageCheckoutReview.tsx`
- `src/lib/navigation.ts`
- `scripts/check-revision3-navigation.mjs`
- `scripts/check-revision8-package-sessions.mjs`
- `dist/` hasil build lama
- isi `bimbelku-backend/storage/logs/laravel.log`

Penghapusan dilakukan oleh `scripts/apply-checkpoint4-cleanup.ps1` supaya prosesnya konsisten pada project pengguna.

## Pengujian di lingkungan penyusunan

Lulus:

- syntax transpilation 113 file TypeScript/TSX;
- `php -l` pada 250 file PHP;
- Checkpoint 1, 2, 3, dan 4;
- 184 action API cocok dengan controller/method;
- 60 route frontend dan 173 tautan literal;
- seluruh checker Tahap 2 sampai Tahap 6C final;
- pemeriksaan setiap tag gambar aktif mempunyai `alt`, `loading`, dan `decoding`.

Belum dapat dijalankan di lingkungan penyusunan:

- PHPUnit Laravel karena folder `vendor` tidak tersedia;
- `npm run typecheck`, ESLint, dan build Vite penuh karena `node_modules` tidak tersedia;
- pemeriksaan visual nyata pada setiap halaman dan setiap ukuran layar;
- pengujian HTTPS/HSTS pada server production nyata.

## Status dan batasan

Tidak ada bug statis Checkpoint 4 yang sengaja dibiarkan. Checkpoint 4 baru dinyatakan lulus runtime setelah tes Laravel, typecheck, build, dan matriks layar lokal berhasil. Sampul tutor lama berukuran sekitar 1,3 MB tidak dimodifikasi otomatis karena termasuk konten pengguna; unggah ulang melalui halaman Tampilan Tutor akan menghasilkan versi yang lebih ringan.

## Checkpoint berikutnya

Checkpoint 5: regresi akhir, skenario lengkap murid–tutor–admin, daftar route berhasil/gagal, dokumentasi final, dan keputusan kelayakan website.
