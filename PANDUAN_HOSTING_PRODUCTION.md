# Panduan Hosting Production BimbelKu

Dokumen ini adalah checklist aman untuk memindahkan BimbelKu ke hosting publik tanpa akun demo, password default, atau konfigurasi development.

## Prinsip utama

- Gunakan database production baru jika memungkinkan.
- Jangan unggah `.env` lokal, dump database lokal, log, cache, atau isi `storage` pengujian.
- Jangan memakai akun demo sebagai akun production.
- Jangan memakai password yang tertulis di dokumentasi atau source code.
- Jalankan command `demo:*` hanya di komputer lokal. Semua command tersebut ditolak saat `APP_ENV=production`.
- `SEED_DEMO_USERS` wajib `false`. Seeder juga mengabaikannya secara paksa pada production jika variabel itu tidak sengaja menjadi `true`.

## 1. Pemeriksaan sebelum upload

Dari root project:

```powershell
npm ci
npm run check
npm run build
```

Dari backend:

```powershell
cd bimbelku-backend
composer install
php artisan test
php artisan route:list
```

Semua pemeriksaan harus lulus sebelum deployment.

Jangan ikut mengunggah:

- `.env` dan `.env.production` lokal.
- `node_modules/` dan `bimbelku-backend/vendor/` jika dependency akan dipasang di server.
- `bimbelku-backend/storage/logs/*`.
- Cache dalam `bimbelku-backend/bootstrap/cache/` selain `.gitignore`.
- Dump `*.sql`, database lokal, dan file bukti pengujian.
- Folder atau file yang berisi fixture demo hasil runtime.

## 2. Build frontend

Konfigurasi frontend default memakai:

```dotenv
VITE_API_BASE_URL=/api
```

Nilai `/api` cocok jika frontend dan API dipublikasikan pada domain yang sama melalui reverse proxy. Jika API memakai subdomain terpisah, buat `.env.production` lokal sebelum build:

```dotenv
VITE_API_BASE_URL=https://api.domain-anda.id/api
```

Kemudian build ulang:

```powershell
npm run build
```

Upload isi folder `dist/` ke document root frontend.

## 3. Konfigurasi backend production

Di server, salin `bimbelku-backend/production.env.example` menjadi `bimbelku-backend/.env`, lalu ganti seluruh placeholder domain, database, email admin, dan SMTP.

Nilai wajib:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.domain-anda.id
FRONTEND_URL=https://domain-anda.id
FRONTEND_ORIGINS=https://domain-anda.id
SEED_DEMO_USERS=false
```

Gunakan satu origin kanonis pada `FRONTEND_URL`. Jika frontend dapat diakses dari beberapa origin, masukkan semuanya pada `FRONTEND_ORIGINS` dan pisahkan dengan koma. Jangan masukkan wildcard pada production.

Gunakan user database khusus aplikasi, bukan `root`. Password database, SMTP key, dan password admin harus unik dan tidak boleh dimasukkan ke Git.

## 4. Instalasi backend

Jalankan di folder `bimbelku-backend` pada server:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan storage:link
```

Pastikan document root backend mengarah ke folder `bimbelku-backend/public`, bukan ke root Laravel. Folder `.env`, `app`, `config`, `database`, dan `storage` tidak boleh dapat diunduh melalui web.

## 5. Membuat admin utama

Saat initial deployment, isi nilai berikut dengan email asli dan password acak minimal 12 karakter:

```dotenv
PRIMARY_ADMIN_EMAIL=admin@domain-anda.id
SEED_ADMIN_EMAIL=admin@domain-anda.id
SEED_ADMIN_PASSWORD=password-acak-yang-kuat
SEED_DEMO_USERS=false
```

Kemudian jalankan:

```bash
php artisan db:seed --force
```

Seeder tetap mengisi katalog yang diperlukan, membuat satu admin utama, dan tidak membuat akun demo pada production.

Setelah admin berhasil login, kosongkan atau hapus `SEED_ADMIN_PASSWORD` dari `.env`, lalu jalankan:

```bash
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Jangan menjalankan `php artisan migrate:fresh` karena perintah tersebut menghapus semua tabel dan data.

## 6. Memastikan akun testing tidak ada

Jika memakai database production baru, hasil pemeriksaan berikut harus nol:

```sql
SELECT id, email, role, status
FROM users
WHERE email LIKE '%@bimbelku.local'
   OR email IN ('budi@guru.com', 'murid@bimbelku.com');
```

Jika query mengembalikan baris, jangan langsung menghapus record karena akun mungkin sudah terhubung dengan booking, order, jurnal, refund, dan histori sesi. Pilihan paling aman adalah memakai database production baru dan menjalankan migration serta seeder production.

Jika database lama wajib dipindahkan, lakukan langkah berikut sebelum publikasi:

1. Buat backup database dan `storage/app`.
2. Nonaktifkan akses publik sementara.
3. Identifikasi seluruh akun dan transaksi demo.
4. Bersihkan data melalui prosedur terkontrol yang mempertahankan integritas foreign key dan jurnal.
5. Jalankan seluruh test dan audit finansial setelah cleanup.

Jangan mengimpor database lokal sebelum langkah ini selesai.

## 7. Scheduler dan queue

Scheduler diperlukan untuk reminder, kedaluwarsa penawaran, pencarian tutor, batas pembayaran, lifecycle sesi, dan audit terjadwal. Tambahkan cron berikut setiap menit:

```cron
* * * * * cd /path/bimbelku-backend && php artisan schedule:run >> /dev/null 2>&1
```

Jalankan queue worker melalui Supervisor, systemd, atau process manager hosting:

```bash
php artisan queue:work --sleep=3 --tries=3 --timeout=120
```

Restart worker setelah deployment:

```bash
php artisan queue:restart
```

## 8. Permission server

User web server harus dapat menulis hanya ke:

- `bimbelku-backend/storage/`
- `bimbelku-backend/bootstrap/cache/`

Jangan memberi permission `777`. Gunakan owner/group web server dan permission minimum yang didukung hosting.

## 9. Pemeriksaan setelah deployment

```bash
php artisan about
php artisan migrate:status
php artisan route:list
php artisan finance:verify-ledger
php artisan optimize
```

Periksa juga:

- Endpoint health backend `/up` menghasilkan respons sukses.
- Landing page dan login terbuka melalui HTTPS.
- Request API tidak terkena CORS error.
- Registrasi dan verifikasi email bekerja.
- Login admin utama bekerja dan admin lain tidak aktif.
- Upload bukti masuk ke storage privat dan tidak dapat dibuka tanpa autentikasi.
- Scheduler menunjukkan heartbeat terbaru di panel admin.
- Email menggunakan SMTP, bukan `MAIL_MAILER=log`.
- Browser tidak menampilkan stack trace atau pesan debug Laravel.
- Tidak ada akun `@bimbelku.local`, `budi@guru.com`, atau `murid@bimbelku.com`.

## 10. Checklist siap publik

- [ ] `APP_ENV=production`.
- [ ] `APP_DEBUG=false`.
- [ ] `APP_KEY` production sudah dibuat.
- [ ] Semua URL menggunakan HTTPS dan domain asli.
- [ ] `SEED_DEMO_USERS=false`.
- [ ] `SEED_ADMIN_PASSWORD` sudah dihapus setelah initial seed.
- [ ] Database production tidak berisi akun atau transaksi demo.
- [ ] Password admin, database, dan SMTP unik.
- [ ] Document root backend menunjuk ke folder `public`.
- [ ] Frontend sudah dibuild dengan alamat API production.
- [ ] Migration dan seeder production berhasil.
- [ ] Scheduler dan queue worker aktif.
- [ ] Permission `storage` dan cache benar.
- [ ] Backup database dan storage aktif.
- [ ] Health check, login, email, upload privat, dan alur pembayaran diuji.
- [ ] Seluruh test otomatis lulus sebelum rilis.
