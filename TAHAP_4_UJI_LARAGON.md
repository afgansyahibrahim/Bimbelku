# Uji Tahap 4 melalui Laragon

Paket ini menyertakan pengujian otomatis untuk frontend dan backend. Tes Laravel memakai SQLite sementara di memori. Database MySQL utama tidak disentuh.

## Kebutuhan

- PHP 8.2 atau lebih baru.
- Composer 2.
- Node.js 20 atau lebih baru.
- Ekstensi PHP `pdo_sqlite`, `mbstring`, `openssl`, `fileinfo`, dan `gd`.

## Menjalankan seluruh pemeriksaan

Buka PowerShell pada folder utama proyek:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap4.ps1
```

Pemeriksaan yang dijalankan:

1. `npm ci`
2. ESLint
3. TypeScript
4. build Vite
5. `composer install`
6. pemeriksaan rute API
7. tes Laravel dengan SQLite sementara

Dependensi dapat dilewati pada pengujian ulang:

```powershell
.\scripts\test-tahap4.ps1 -SkipInstall
```

## Uji MySQL terpisah

Gunakan database baru, misalnya `bimbelku_tahap4_test`. Jangan memakai database utama.

Sesuaikan `.env` backend:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bimbelku_tahap4_test
DB_USERNAME=root
DB_PASSWORD=

FRONTEND_URL=http://127.0.0.1:8080
FRONTEND_ORIGINS=http://127.0.0.1:8080,http://localhost:8080

SEED_DEMO_USERS=true
SEED_ADMIN_EMAIL=admin@bimbelku.com
SEED_ADMIN_PASSWORD=admin123456789
```

Pastikan nama database benar sebelum menjalankan:

```powershell
php artisan config:clear
php artisan migrate:fresh --seed
php artisan storage:link
```

`migrate:fresh` hanya boleh digunakan pada `bimbelku_tahap4_test`. Database utama harus diperbarui memakai `php artisan migrate`.

## Akun pengujian

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Admin | `admin@bimbelku.com` | `admin123456789` |
| Tutor | `budi@guru.com` | `password123` |
| Murid | `murid@bimbelku.com` | `password123` |

## Pemeriksaan manual minimum

- Murid dapat mendaftar dan langsung masuk.
- Tutor dapat mendaftar, tetapi belum dapat masuk sebelum verifikasi admin.
- Admin dapat memverifikasi tutor satu kali.
- Murid dapat membuat permintaan online tanpa lokasi.
- Permintaan offline mewajibkan lokasi dan nomor kontak.
- Sampul murid dan tutor hanya berubah pada akun pemiliknya.
- Kata sandi hanya dapat diubah melalui dialog Keamanan.
- Tutor dapat menerima atau menolak penawaran.
- Pembayaran tidak dapat diproses dua kali.
- Tautan kelas online tidak terbuka sebelum pembayaran diterima.
- Refund, sengketa, dan pencairan tidak dapat diselesaikan dua kali.
