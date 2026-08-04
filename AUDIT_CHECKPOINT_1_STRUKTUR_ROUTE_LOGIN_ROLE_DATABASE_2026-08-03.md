# Audit Checkpoint 1 — Struktur, Route, Login, Role, Middleware, dan Database

Tanggal audit: 3 Agustus 2026  
Basis: `Website_Bimbelku(1).zip` + patch autentikator admin + patch tutorial terbaru + patch admin tunggal + penghapusan manual dua halaman admin.

## Status checkpoint

**Pemeriksaan dan perbaikan statis Checkpoint 1 selesai.** Validasi runtime Laravel tetap wajib dijalankan pada Laragon karena lingkungan penyusunan tidak memiliki Composer/vendor dan database pengujian. Build Vite dan ESLint juga harus dijalankan setelah `npm ci` karena dependency lokal tidak tersedia di lingkungan penyusunan.

## Ringkasan temuan dan perbaikan

| No | Halaman/Fitur | Role | Jenis Masalah | Risiko | Penyebab | File Terkait | Solusi | Status |
|---:|---|---|---|---|---|---|---|---|
| 1 | Pemeriksaan Tahap 3 | Admin | Checker gagal setelah file dihapus | Tinggi | Checker masih membaca `FinanceSecurity.tsx` | `scripts/check-stage3.mjs` | Checker disesuaikan dengan runtime admin tunggal | Selesai |
| 2 | Keuangan admin | Admin | Route menuju halaman yang sudah dihapus | Tinggi | Tautan lama `/admin/finance-security` tertinggal | `FinanceReport.tsx`, `RefundManagement.tsx`, `PaymentVerification.tsx` | Ketergantungan autentikator dan tautan lama dihapus | Selesai |
| 3 | Pencairan tutor | Admin | Alur tidak mungkin diselesaikan | Kritis | Pencairan besar masih menunggu admin kedua, padahal admin hanya satu | `AdminController.php`, `routes/api.php` | Persetujuan admin kedua dihentikan; bukti, konfirmasi, transaksi, idempotensi, dan audit dipertahankan | Selesai |
| 4 | Keuangan produksi | Admin | Potensi deadlock akses | Kritis | Backend dapat meminta TOTP, tetapi halaman pemasangan TOTP sudah dihapus | Route, middleware, controller, service keuangan | Seluruh runtime TOTP lama dihapus secara konsisten | Selesai |
| 5 | Token akun nonaktif | Semua | Token masih dapat mencapai route bersama | Tinggi | Grup `auth:sanctum` tidak memeriksa status akun pada route umum | `EnsureActiveAccount.php`, `bootstrap/app.php`, `routes/api.php` | Middleware akun aktif ditambahkan pada seluruh route terautentikasi | Selesai |
| 6 | Token admin lama | Admin | Admin kedua dengan token lama dapat memakai route umum | Tinggi | Pemeriksaan admin utama hanya ada pada login/permission admin | `EnsureActiveAccount.php`, `User.php`, `AdminSeeder.php` | Token admin bukan utama ditolak; seeder menonaktifkan admin lama dan mencabut token | Selesai |
| 7 | Pengelolaan admin tambahan | Admin | Kode mati masih tersedia | Sedang | Controller CRUD admin lama tertinggal setelah kebutuhan berubah | `AdminAccessController.php`, route admin | CRUD admin tambahan dihapus; audit tetap tersedia | Selesai |
| 8 | Runtime autentikator | Admin | File tidak digunakan | Rendah | Revisi lama masih menyisakan controller, middleware, model, dan service | Delapan file runtime lama | Dihapus melalui script pembersihan idempoten | Selesai |
| 9 | Redirect URL lama | Admin | Redirect dapat terblokir sebelum dijalankan | Sedang | `PrivateRoute` tidak memperoleh permission untuk path lama | `src/lib/adminPermissions.ts`, `App.tsx` | Path lama dipetakan ke permission aman lalu diarahkan | Selesai |
| 10 | Dokumentasi keamanan | Admin | Instruksi bertentangan dengan kode terbaru | Sedang | README/checkpoint masih menyuruh mengaktifkan TOTP dan admin kedua | `README.md`, dokumen Tahap 6C | Dokumentasi ditandai historis dan disinkronkan | Selesai |
| 11 | Migration dengan timestamp sama | Database | Risiko salah mengubah riwayat migration | Sedang | Empat migration historis memakai dua prefix timestamp yang sama | `database/migrations` | Tidak diganti nama karena dapat sudah tercatat; urutan alfabet dan isi diperiksa serta dicatat oleh checker | Dipertahankan dengan catatan |
| 12 | Verifikasi email | Semua | Fitur belum diaktifkan | Rendah | Tidak ada alur verifikasi email wajib; reset password sudah tersedia | Auth dan mail config | Tidak dipaksakan pada checkpoint ini agar akun lokal tidak terkunci tanpa SMTP; dicatat sebagai keputusan produk, bukan regression | Belum diaktifkan |

## Struktur yang diperiksa

- Frontend React/TypeScript: entrypoint, lazy route, `PrivateRoute`, session lifecycle, permission mapping, halaman login/daftar/reset.
- Backend Laravel: route API, controller auth, middleware role/admin/audit/idempotensi, model `User`, seeder admin, konfigurasi, file sensitif, dan controller route bersama.
- Database: 74 migration, urutan migration, migration bertimestamp sama, foreign key utama, tabel token, status pengguna, dan riwayat skema keuangan.
- Hak akses: publik, pengguna aktif, murid, tutor, dan admin utama.
- Route bersama yang berisiko IDOR: tiket, notifikasi, dokumen tutor, lampiran belajar, bukti privat, chat sesi, dan perubahan jadwal diperiksa terhadap validasi kepemilikan/controller.

## File yang ditambahkan

- `bimbelku-backend/app/Http/Middleware/EnsureActiveAccount.php`
- `bimbelku-backend/tests/Feature/CheckpointOneFoundationAuditTest.php`
- `scripts/check-checkpoint1.mjs`
- `scripts/apply-checkpoint1-cleanup.ps1`
- `AUDIT_CHECKPOINT_1_ROUTE_INVENTORY_2026-08-03.md`
- `AUDIT_CHECKPOINT_1_STRUKTUR_ROUTE_LOGIN_ROLE_DATABASE_2026-08-03.md`
- `CHECKPOINT_1_PASANG_DAN_UJI_2026-08-03.md`

## File runtime yang dihapus

- `src/pages/admin/AdminAccessControl.tsx`
- `src/pages/admin/FinanceSecurity.tsx`
- `bimbelku-backend/app/Http/Controllers/Api/FinanceApprovalController.php`
- `bimbelku-backend/app/Http/Controllers/Api/FinanceSecurityController.php`
- `bimbelku-backend/app/Http/Middleware/RequireFinanceAuthorization.php`
- `bimbelku-backend/app/Models/FinanceAuthorization.php`
- `bimbelku-backend/app/Services/FinanceAuthorizationService.php`
- `bimbelku-backend/app/Services/FinanceTotpService.php`
- `scripts/apply-single-admin-cleanup.ps1` karena sudah digantikan script Checkpoint 1.

Migration historis Tahap 3 **tidak dihapus**. Menghapus atau mengganti nama migration lama dapat merusak database yang sudah pernah menjalankannya.

## Hasil pemeriksaan yang dijalankan

- `npm run check:checkpoint1`: lulus.
- `npm run check:contracts`: 184 action API memiliki controller dan method.
- `npm run check:stage2`: lulus.
- `npm run check:stage3`: lulus.
- `npm run check:stage6c-d`: lulus.
- `npm run check:stage6c-final`: lulus.
- `npm run check:pages`: 60 route aplikasi, 173 tautan literal, dan seluruh lazy module terpetakan.
- `npm run check:php-static`: 248 file PHP lulus pemeriksaan statis.
- `php -l`: 248 file PHP tanpa kesalahan sintaks.
- `tsc --noEmit -p tsconfig.json`: lulus.
- Inventaris terpisah mencatat 184 action API dan 61 entri frontend termasuk wildcard 404.

## Pemeriksaan yang belum dapat dijalankan di lingkungan penyusunan

- Laravel/PHPUnit runtime: `vendor` dan Composer tidak tersedia.
- Vite production build: executable Vite lokal tidak tersedia karena `node_modules` tidak ada.
- ESLint: executable ESLint lokal tidak tersedia karena `node_modules` tidak ada.
- Migrasi MySQL nyata dan data pengguna lokal: hanya dapat diverifikasi pada Laragon pengguna.

## Bug yang belum selesai pada Checkpoint 1

Tidak ada bug statis kritis/tinggi yang sengaja dibiarkan pada cakupan Checkpoint 1. Alur verifikasi email wajib belum diaktifkan karena merupakan perubahan perilaku produk yang bergantung pada SMTP; reset password dan proteksi enumerasi email sudah tersedia.

## Langkah berikutnya

Checkpoint 2 mengaudit fitur admin, tutor, murid, kelas, jadwal, pembayaran, nominal, benturan slot, status transaksi, refund, dan pencairan menggunakan basis kode setelah patch Checkpoint 1.
