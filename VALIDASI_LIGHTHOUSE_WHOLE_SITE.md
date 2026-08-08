# Validasi Performance BimbelKu — Revisi Whole-Site

Panduan ini dipakai setelah source revisi ditaruh di project lokal Windows/Laragon. Tujuannya mendapatkan angka **production build** yang dapat dibandingkan, bukan angka dari `npm run dev`.

## 1. Backup

Sebelum replace, copy folder project lama atau commit ke Git.

## 2. Pasang source revisi

Gunakan full ZIP atau patch. Jangan membawa `dist` lama dari project sebelumnya.

Pastikan root berisi kurang lebih:

```text
package.json
src/
scripts/
bimbelku-backend/
vite.config.js
```

## 3. Dependency

Jika `node_modules` lama masih sesuai `package-lock.json`, boleh dipakai. Jika belum ada/bermasalah:

```powershell
npm ci
```

Jika project memang biasa memakai `npm install`, gunakan:

```powershell
npm install
```

## 4. Source-level guard

```powershell
npm run check:performance-revision1
npm run check:performance-whole-site
npm run check:pages
npm run check:contracts
```

Checker whole-site harus menulis:

```text
Performance whole-site revision lulus pemeriksaan source-level.
```

## 5. Backend

Jalankan Laravel/API dengan database yang biasa dipakai project. Jangan ganti dataset di tengah benchmark.

Jika setup Anda menggunakan artisan:

```powershell
cd bimbelku-backend
php artisan optimize:clear
php artisan serve --host=127.0.0.1 --port=8000
```

Lalu kembali ke root frontend pada terminal lain.

## 6. Production build frontend

```powershell
npm run build
```

Pastikan berhasil dan `dist/assets/` berisi file hash seperti `index-xxxx.js` / chunk route.

Jalankan:

```powershell
npm run preview -- --port 8080
```

Untuk benchmark final **jangan** memakai `npm run dev`.

## 7. Browser bersih

Gunakan salah satu:

- Chrome Guest Profile; atau
- profile Chrome baru tanpa extension; atau
- Incognito dengan extension benar-benar disabled.

Gunakan kondisi yang sama untuk semua run.

## 8. Test Matrix minimum

Uji minimal halaman berikut.

| Kelompok | Halaman |
|---|---|
| Public | `/` |
| Auth | `/login` |
| Student dashboard | `/student/dashboard` |
| Student form | `/student/packages/new` |
| Student data/list | `/student/my-classes` |
| Teacher dashboard | `/guru` |
| Teacher data | `/guru/kelas` |
| Admin dashboard | `/admin` |
| Admin tabel | `/admin/classes` |

Jika route membutuhkan login, login dengan role yang sesuai sebelum menjalankan audit route tersebut.

## 9. Lighthouse

Untuk **setiap halaman**, lakukan:

- Mobile Run 1
- Mobile Run 2
- Mobile Run 3
- Desktop Run 1
- Desktop Run 2
- Desktop Run 3

Ambil **median**, bukan nilai terbaik.

Catat:

```text
Performance
FCP
LCP
Speed Index
TBT
CLS
```

Target:

```text
Mobile Performance >= 93
Desktop Performance >= 93
FCP <= 1.8s
LCP <= 2.5s
TBT <= 200ms
CLS <= 0.1
```

## 10. Yang perlu dikirim jika suatu halaman masih lambat

Untuk route dengan Mobile <93, kirim:

1. Screenshot Lighthouse bagian Metrics.
2. Screenshot LCP element + LCP breakdown.
3. Screenshot Diagnostics / Main-thread work / Long Tasks.
4. Chrome DevTools Network HAR atau screenshot waterfall.
5. Chrome Performance trace bila tersedia.

Khusus data page, perhatikan request:

```text
/student/classes
/teacher/classes
/student/dashboard-v2
/teacher/dashboard-v2
/admin/dashboard-stats
/notifications
/content/tutorials
```

Catat `Waiting (TTFB)`, total duration, preflight/OPTIONS bila ada, dan urutan start request.

## 11. Verifikasi perubahan whole-site

### Landing
- Hero/Navbar tampil sama.
- Scroll ke bawah: seluruh section tetap muncul normal.
- Footer tetap muncul ketika mendekati bawah.

### Auth
- Login, forgot password, reset password, register tetap berfungsi.
- Error API dan toast tetap muncul.

### Student
- Dashboard, Cari Les, Paket, Kelas Saya, filter, detail kelas, Ruang Belajar, Pesan, Profil, Voucher, pembayaran tetap bekerja.
- Mobile bottom nav tetap ada pada Mobile.
- Desktop tidak menampilkan mobile bottom nav.

### Teacher
- Dashboard, Permintaan, Kelas, kamera bukti, Ruang Belajar, Jadwal, Pesan, Profil, Rekening, Gaji tetap bekerja.
- Mobile bottom nav tetap ada pada Mobile dan tidak aktif di Desktop.

### Admin
- Dashboard, users, teacher verification, payment, finance/refund, classes, cases, subjects/content, settings dan audit log tetap bekerja.

### Responsive
Uji minimal:
- Mobile portrait
- Mobile landscape jika biasa dipakai
- Tablet
- Desktop

## 12. CORS/local environment

Saat frontend `localhost:8080` dan Laravel `127.0.0.1:8000`, origin berbeda. Jangan menyimpulkan seluruh preflight lokal akan sama dengan hosting.

Untuk hosting final, catat apakah frontend/API:
- same-origin; atau
- cross-origin.

Jika cross-origin, CORS tetap harus aman; jangan menghapus autentikasi/security hanya untuk skor.
