# BimbelKu

BimbelKu adalah aplikasi pencocokan murid dan tutor berbasis jadwal, materi, mode belajar, performa, serta jarak untuk kelas offline. Proyek ini memakai React + TypeScript pada frontend dan Laravel API + MySQL pada backend.

Versi ini memuat Fondasi Tahap 1, Tampilan Mobile Tahap 2, Keamanan Keuangan
Tahap 3, Pencocokan dan Sesi Tahap 4, serta Paket, Promo, Konten, dan Dashboard
Tahap 5 per 30 Juli 2026. Tidak ada katalog tutor, pemilihan tutor manual,
payment gateway, penumpukan voucher, cashback, referral, atau pencairan otomatis.

## Fitur utama

- Tiga peran terpisah: murid, tutor, dan admin.
- Persetujuan orang tua atau wali dicatat untuk pendaftaran murid di bawah 18 tahun.
- Verifikasi tutor dengan identitas, foto wajah langsung, ijazah/kualifikasi, serta sertifikat opsional.
- Verifikasi tutor tidak memakai tes materi, wawancara, microteaching, atau masa percobaan.
- Kategori pembelajaran dibatasi menjadi SD, SMP, SMA, dan Umum.
- Satu mata pelajaran utama dan beberapa jenjang per tutor.
- Rentang jam tersedia per hari; sistem menolak benturan sesi.
- Pencarian otomatis dan adil berdasarkan kompetensi, jadwal, poin, pemerataan, serta jarak.
- Permintaan lanjutan memprioritaskan tutor sebelumnya apabila seluruh syarat masih terpenuhi.
- Paket 1, 4, 8, atau 12 sesi dengan masa penggunaan 7 atau 30 hari.
- Paket dapat dibagi kepada maksimal tiga mapel dengan tutor berbeda.
- Satu sesi paket berlangsung 60 menit pada slot tepat di pergantian jam.
- Admin mengatur pilihan slot; murid tidak memasukkan jam paket secara bebas.
- Satu tagihan paket dibuka setelah semua tutor mapel menerima seluruh jadwal.
- Perpanjangan per mapel memprioritaskan tutor lama tujuh hari sebelum paket berakhir.
- Voucher klaim dan kode promo memakai satu mesin diskon backend.
- Harga promo menampilkan harga normal dicoret, harga akhir, dan label diskon kecil.
- Banner empat detik dan tutorial carousel dikelola admin melalui CRUD.
- Dashboard murid adaptif menampilkan paket, sisa sesi, tutor, jadwal, progres, dan voucher.
- Radar pencarian visual dengan radius offline 3, 5, 8, sampai 12 km.
- Formulir permintaan dibagi menjadi empat langkah pada ponsel dan desktop.
- Pemeriksaan slot tutor dilakukan sebelum permintaan dikirim tanpa membuka identitas tutor.
- Navigasi bawah dibedakan untuk murid dan tutor pada layar ponsel.
- Panduan singkat disediakan sesuai halaman dan peran pengguna.
- Tabel riwayat tutor diubah menjadi kartu pada layar kecil.
- Kelas privat; fondasi kelompok lama tetap tersimpan tetapi tidak dipromosikan pada Tahap 5.
- Materi bertingkat: jenjang, kelas, mata pelajaran, bab, submateri, tujuan, catatan, dan lampiran.
- Profil tutor baru ditampilkan setelah tutor menerima dan sebelum murid membayar.
- Transfer manual ke admin, verifikasi bukti, penolakan, serta unggah ulang bukti.
- Komisi tersimpan sebagai snapshot transaksi; nilai awal 20%.
- Jurnal dana berpasangan dan tidak dapat diedit langsung.
- Kunci idempotensi mencegah pembayaran, refund, dan pencairan tercatat dua kali.
- Admin keuangan memakai TOTP 2FA sebelum membuka data atau melakukan tindakan sensitif.
- Rekening tutor yang baru diubah menahan pencairan selama 24 jam.
- Pencairan mulai Rp5.000.000 memerlukan persetujuan admin kedua.
- Tindakan keuangan masuk ke rantai audit yang tidak dapat diubah.
- Bukti pelaksanaan, persetujuan murid, keberatan 48 jam, dan pemeriksaan admin.
- Chat kelas internal yang menolak kontak pribadi, akun media sosial, dan tautan luar.
- PIN murid, check-in tutor, lokasi offline, check-out, dan durasi aktual.
- Asesmen awal, target yang disetujui murid, laporan sesi, dan progres belajar.
- Laporan ketidakhadiran murid/tutor, keadaan darurat, refund penuh, dan pencairan manual.
- Sistem poin tutor 0–200 dengan riwayat perubahan.
- Dialog konfirmasi dan toast buatan aplikasi; tidak memakai `alert()` atau `confirm()` bawaan browser.
- Dokumen dan bukti sensitif disimpan privat serta hanya dibuka melalui API terautentikasi.
- Email, nomor pribadi, dan data wali tidak diberikan kepada pengguna lain.
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

Migration Tahap 1 menambahkan tanggal lahir dan persetujuan wali secara
bertahap. Data akun lama tidak dihapus. Akun lama yang belum mempunyai tanggal
lahir tetap dapat digunakan dan dapat dilengkapi melalui proses administrasi.

Migration Tahap 3 menonaktifkan katalog Perguruan Tinggi dan Semester tanpa
menghapus transaksi lama. Migration ini juga menambahkan jurnal keuangan,
idempotensi, 2FA admin, penahanan rekening tutor, log audit, dan persetujuan
pencairan besar.

Migration Tahap 4 menambahkan chat kelas, PIN, kehadiran, rencana belajar, dan
laporan progres. Migration ini tidak menghapus akun, kelas, atau transaksi lama.

Migration Tahap 5 menambahkan paket, alokasi mapel, sesi paket, promo, klaim,
banner, tutorial, dan perpanjangan tutor. Migration ini juga menghubungkan order
dan booking lama secara nullable sehingga riwayat Tahap 1–4 tetap dapat dibuka.

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

Pemeriksaan khusus Tahap 1 pada Windows Laragon:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap1.ps1
```

Pemeriksaan Tahap 2:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap2.ps1
```

Pemeriksaan Tahap 3:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap3.ps1
```

Perintah Tahap 3 menjalankan ESLint, TypeScript, kontrak API, build produksi,
migration bertahap, seluruh tes Laravel, dan verifikasi rantai jurnal keuangan.

Pemeriksaan Tahap 4:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap4-learning.ps1
```

Pemeriksaan Tahap 5:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap5.ps1
```

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

## Catatan pembayaran dan 2FA

Sistem tidak memindahkan uang. Murid mentransfer ke rekening admin, admin memeriksa bukti terhadap mutasi rekening, lalu sistem mencatat statusnya. Bank dan nomor rekening/e-wallet asal ikut dicatat sebagai tujuan refund. Refund dan pendapatan tutor ditransfer manual oleh admin, disertai bukti transfer.

Nominal, komisi, dan rekening pembayaran dapat diatur admin. Perubahan komisi hanya berlaku untuk transaksi baru karena setiap booking menyimpan snapshot persentasenya.

Sebelum membuka menu keuangan, setiap admin harus mengaktifkan TOTP melalui
aplikasi autentikator dan memasukkan kode enam digit. Otorisasi berlaku
sementara pada sesi tersebut. Simpan rahasia TOTP di pengelola kata sandi yang
terlindungi.

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
