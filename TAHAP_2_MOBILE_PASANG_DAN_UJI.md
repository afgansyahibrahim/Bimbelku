# Memasang dan Menguji Tahap 2

## 1. Buat cadangan

Salin folder proyek lama. Ekspor database melalui phpMyAdmin. Simpan folder
`bimbelku-backend/storage/app`.

Jangan menjalankan `php artisan migrate:fresh`.

## 2. Ekstrak paket

Ekstrak ZIP ke folder baru, misalnya:

`C:\laragon\www\Website_Bimbelku_Tahap2`

Salin file berikut dari proyek lama:

- `bimbelku-backend\.env`
- `.env`, jika konfigurasi frontend disimpan di sana.

Jangan menyalin folder `node_modules` atau `vendor` dari proyek lama.

## 3. Pasang dependensi

Buka PowerShell pada folder utama:

```powershell
npm ci
cd bimbelku-backend
composer install
php artisan optimize:clear
php artisan migrate
cd ..
```

Tahap 2 tidak menambah migration database. Perintah `migrate` tetap dijalankan
untuk memastikan migration Tahap 1 telah terpasang.

## 4. Jalankan tes otomatis

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap2.ps1 -SkipInstall
```

Tes backend memakai SQLite sementara. Database MySQL utama tidak dikosongkan.

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

## 6. Uji melalui ponsel atau mode responsif

Periksa lebar 360, 390, 412, dan 768 piksel.

### Murid

1. Login sebagai murid.
2. Pastikan panduan awal muncul satu kali.
3. Pastikan navigasi bawah dapat digunakan.
4. Buka menu Cari.
5. Isi empat langkah permintaan.
6. Pilih mode online dan periksa status slot tutor.
7. Pilih mode offline dan aktifkan izin lokasi.
8. Pastikan permintaan belum meminta pembayaran.
9. Periksa status permintaan pada kartu.
10. Buat tiket bantuan dan periksa balasan admin.

### Tutor

1. Login sebagai tutor aktif.
2. Pastikan navigasi bawah berbeda dari murid.
3. Buka Permintaan dan periksa kartu tawaran.
4. Buka Jadwal dan simpan rentang ketersediaan.
5. Buka Dompet melalui menu samping.
6. Pastikan riwayat pencairan berbentuk kartu pada ponsel.
7. Buka Pusat Bantuan dan kirim tiket uji.

## 7. Hasil yang diharapkan

- Formulir tidak menampilkan seluruh isian sekaligus.
- Tombol bawah tidak menutupi isi halaman.
- Slot tutor diperiksa tanpa nama atau foto tutor.
- Permintaan tetap dapat dibuat saat slot awal belum ditemukan.
- Pembayaran baru dibuka setelah tutor menerima permintaan.
