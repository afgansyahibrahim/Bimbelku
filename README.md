# BimbelKu

BimbelKu adalah aplikasi pencocokan murid dan tutor berbasis jadwal, materi, mode belajar, performa, serta jarak untuk kelas offline. Proyek ini memakai React + TypeScript pada frontend dan Laravel API + MySQL pada backend.

Versi ini mengikuti keputusan produk 27 Juli 2026. Tidak ada katalog tutor, pemilihan tutor manual, paket berjangka, layanan premium, payment gateway, atau pencairan otomatis.

## Fitur utama

- Tiga peran terpisah: murid, tutor, dan admin.
- Verifikasi tutor dengan identitas, foto wajah langsung, ijazah/kualifikasi, serta sertifikat opsional.
- Satu mata pelajaran utama dan beberapa jenjang per tutor.
- Rentang jam tersedia per hari; sistem menolak benturan sesi.
- Pencarian otomatis dan adil berdasarkan kompetensi, jadwal, poin, pemerataan, serta jarak.
- Radar pencarian visual dengan radius offline 3, 5, 8, sampai 12 km.
- Kelas privat dan kelompok.
- Materi bertingkat: jenjang, kelas, mata pelajaran, bab, submateri, tujuan, catatan, dan lampiran.
- Profil tutor baru ditampilkan setelah tutor menerima dan sebelum murid membayar.
- Transfer manual ke admin, verifikasi bukti, penolakan, serta unggah ulang bukti.
- Komisi tersimpan sebagai snapshot transaksi; nilai awal 20%.
- Bukti pelaksanaan, persetujuan murid, keberatan 48 jam, dan pemeriksaan admin.
- Laporan ketidakhadiran murid/tutor, keadaan darurat, refund penuh, dan pencairan manual.
- Sistem poin tutor 0–200 dengan riwayat perubahan.
- Dialog konfirmasi dan toast buatan aplikasi; tidak memakai `alert()` atau `confirm()` bawaan browser.
- Dokumen dan bukti sensitif disimpan privat serta hanya dibuka melalui API terautentikasi.
- Lazy loading halaman dan bundle produksi terpisah agar frontend tetap ringan.

## Kebutuhan sistem

- Node.js 20 atau lebih baru
- npm 10 atau lebih baru
- PHP 8.2 atau lebih baru
- Composer 2
- MySQL 8 atau MariaDB yang kompatibel

## Instalasi frontend

Jalankan dari folder utama proyek:

```bash
cp .env.example .env
npm ci
npm run dev
```

Frontend berjalan di `http://127.0.0.1:8080`. Ubah `VITE_API_BASE_URL` jika alamat API berbeda.

## Instalasi backend

Masuk ke folder backend:

```bash
cd bimbelku-backend
composer install
cp .env.example .env
php artisan key:generate
```

Buat database MySQL bernama `bimbelku`, lalu sesuaikan bagian `DB_*` dalam `.env`.

Sebelum seeding, isi akun admin awal dengan kata sandi minimal 12 karakter:

```dotenv
SEED_ADMIN_EMAIL=admin@domain-anda.id
SEED_ADMIN_PASSWORD=kata-sandi-kuat-anda
SEED_DEMO_USERS=false
```

Lanjutkan:

```bash
php artisan migrate --seed
php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8000
```

Migration terakhir juga memindahkan dokumen atau bukti sensitif dari disk publik instalasi lama ke disk privat. Karena itu, lakukan backup `storage/app` sebelum menjalankan migration pada data produksi.

Pada terminal backend kedua, jalankan proses tenggat:

```bash
php artisan schedule:work
```

Scheduler wajib aktif karena menangani penawaran tutor kedaluwarsa, batas pembayaran, kelompok yang belum terpenuhi, waktu mulai sesi, dan antrean pemeriksaan 48 jam.

Jangan menjalankan `php artisan migrate:fresh` pada database yang berisi data penting. Perintah tersebut menghapus seluruh tabel dan isi database.

## Konfigurasi email

Reset kata sandi memakai konfigurasi `MAIL_*` Laravel. Pada instalasi lokal, `MAIL_MAILER=log` menulis tautan reset ke log. Pada produksi, gunakan SMTP atau penyedia email yang benar.

Pastikan `FRONTEND_URL` mengarah ke origin frontend. Nilai ini juga menjadi daftar origin CORS yang diizinkan. Beberapa origin dapat dipisahkan dengan koma.

## Akun demo opsional

Data demo tidak dibuat secara default. Untuk lingkungan lokal saja, ubah:

```dotenv
SEED_DEMO_USERS=true
```

Lalu jalankan:

```bash
php artisan db:seed
```

Jangan mengaktifkan akun demo pada produksi.

## Pemeriksaan kualitas

Frontend:

```bash
npm run check
```

Perintah tersebut menjalankan ESLint, TypeScript typecheck, dan production build.

Backend, setelah Composer terpasang:

```bash
cd bimbelku-backend
php artisan test
php artisan route:list
```

## Struktur penting

```text
src/                         Frontend React
src/pages/                   Halaman publik, murid, tutor, admin
src/components/              Layout, dialog, dan komponen bersama
bimbelku-backend/app/        Logika Laravel
bimbelku-backend/routes/     Rute API dan scheduler
bimbelku-backend/database/   Migration, factory, dan seeder
PRD_REVISI_BIMBELKU.md       Aturan produk terbaru
IMPLEMENTATION_STATUS.md     Cakupan implementasi dan verifikasi
REVISION_NOTES.md            Ringkasan perubahan dari versi lama
```

## Catatan pembayaran

Sistem tidak memindahkan uang. Murid mentransfer ke rekening admin, admin memeriksa bukti terhadap mutasi rekening, lalu sistem mencatat statusnya. Bank dan nomor rekening/e-wallet asal ikut dicatat sebagai tujuan refund. Refund dan pendapatan tutor ditransfer manual oleh admin, disertai bukti transfer.

Nominal, komisi, dan rekening pembayaran dapat diatur admin. Perubahan komisi hanya berlaku untuk transaksi baru karena setiap booking menyimpan snapshot persentasenya.

## Checklist produksi

- Gunakan `APP_ENV=production` dan `APP_DEBUG=false`.
- Gunakan HTTPS.
- Isi `APP_URL`, `FRONTEND_URL`, database, mail, dan akun admin dengan nilai produksi.
- Jalankan queue/scheduler melalui process manager.
- Atur backup database dan berkas `storage/app`.
- Batasi akses panel admin dan gunakan kata sandi unik.
- Jalankan `npm audit --omit=dev` dan `composer audit` kembali sebelum setiap rilis.
- Jangan menyertakan `.env`, dump database, atau kredensial ke repositori/ZIP publik.
- Tinjau Syarat & Ketentuan serta Kebijakan Privasi bersama pihak yang berwenang sebelum peluncuran.
