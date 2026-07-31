# Memasang dan Menguji Tahap 1

## 1. Buat cadangan

Salin folder proyek yang sedang dipakai. Ekspor database melalui phpMyAdmin.
Simpan folder `bimbelku-backend/storage/app`.

Jangan menjalankan `php artisan migrate:fresh`.

## 2. Pasang source

Ekstrak paket ke folder baru, misalnya:

`C:\laragon\www\Website_Bimbelku_Tahap1`

Salin `.env` backend lama ke:

`bimbelku-backend\.env`

Pastikan `POLICY_VERSION` memakai:

```dotenv
POLICY_VERSION=2026-07-29
```

## 3. Pasang dependensi

Buka PowerShell pada folder utama proyek:

```powershell
npm ci
cd bimbelku-backend
composer install
php artisan optimize:clear
php artisan migrate
php artisan db:seed --class=CurriculumCatalogSeeder
cd ..
```

Migration hanya menambah kolom data wali. Seeder katalog memakai
`updateOrCreate` dan tidak menghapus pengguna, kelas, transaksi, atau data lama.

## 4. Jalankan tes otomatis

Masih pada folder utama proyek:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap1.ps1 -SkipInstall
```

Tes memakai SQLite sementara. Database MySQL utama tidak dikosongkan.

## 5. Jalankan aplikasi

Terminal pertama:

```powershell
npm run dev
```

Terminal kedua:

```powershell
cd bimbelku-backend
php artisan serve --host=127.0.0.1 --port=8000
```

## 6. Pemeriksaan manual

### Murid dewasa

1. Daftar sebagai murid.
2. Isi tanggal lahir dengan usia minimal 18 tahun.
3. Pastikan formulir wali tidak muncul.
4. Pastikan akun dapat login.

### Murid anak

1. Daftar sebagai murid.
2. Isi tanggal lahir dengan usia di bawah 18 tahun.
3. Pastikan formulir orang tua atau wali muncul.
4. Kosongkan persetujuan dan pastikan pendaftaran ditolak.
5. Lengkapi data wali dan pastikan pendaftaran berhasil.
6. Periksa ringkasan wali pada profil murid.

### Tutor

1. Daftar sebagai tutor.
2. Unggah kartu identitas, foto wajah langsung, dan bukti kualifikasi.
3. Jangan unggah sertifikat opsional.
4. Pastikan akun tetap dapat dikirim untuk verifikasi.
5. Pastikan tutor belum dapat login sebelum admin menyetujui.
6. Pastikan admin dapat membuka dokumen dan mengaktifkan tutor.

### Kategori

Pastikan pilihan berikut muncul pada registrasi, profil tutor, katalog, tarif,
materi, dan pemesanan:

- SD
- SMP
- SMA
- Perguruan Tinggi
- Umum

Perguruan Tinggi harus menampilkan semester. Umum harus menampilkan Semua
tingkat, Pemula, Menengah, dan Lanjutan.

