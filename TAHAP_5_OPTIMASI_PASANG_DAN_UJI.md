# Pemasangan dan Pengujian Tahap 5 Optimasi

## 1. Salin paket

Ekstrak ZIP ke:

`C:\laragon\www\Website_Bimbelku`

Pilih **Replace**. Jangan hapus `.env`, database, atau folder unggahan lama.

## 2. Pasang dependensi dan migrasi

Jalankan PowerShell:

```powershell
cd C:\laragon\www\Website_Bimbelku
npm ci

cd bimbelku-backend
composer install
php artisan migrate
php artisan optimize:clear
php artisan storage:link
```

Pesan `public\storage link already exists` dapat diabaikan.

Jangan menjalankan:

```powershell
php artisan migrate:fresh
```

## 3. Jalankan pemeriksaan

```powershell
cd C:\laragon\www\Website_Bimbelku
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap5.ps1 -SkipInstall
```

Skrip memakai SQLite sementara. Database MySQL utama tidak dihapus.

## 4. Jalankan aplikasi

Terminal backend:

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan serve
```

Terminal frontend:

```powershell
cd C:\laragon\www\Website_Bimbelku
npm run dev
```

Scheduler tenggat pembayaran:

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan schedule:work
```

## 5. Uji alur utama

### Murid dan tutor

1. Login sebagai murid.
2. Pilih **Privat 1-on-1**.
3. Pilih mapel, kelas, dan bab.
4. Buat permintaan pada menit kelipatan sepuluh.
5. Login sebagai tutor.
6. Terima permintaan.
7. Login kembali sebagai murid.
8. Pastikan tagihan tampil pada **Belum Dibayar**.
9. Pastikan kelas tetap berlabel **Privat**.

### Pembayaran

1. Isi rekening admin.
2. Buka tagihan murid.
3. Isi nama pengirim.
4. Isi bank asal.
5. Isi nomor rekening asal.
6. Unggah bukti uji.
7. Terima pembayaran melalui admin.
8. Pastikan kelas berubah menjadi aktif.

### Responsivitas

1. Uji lebar 360 piksel.
2. Uji lebar 768 piksel.
3. Uji tablet mode lanskap.
4. Pastikan sidebar dapat dibuka dan ditutup.
5. Pastikan dialog tidak keluar dari layar.
6. Pastikan tabel dapat digeser tanpa menutup tombol.

## 6. Uji waktu muat

Gunakan build produksi:

```powershell
npm run build
npm run preview
```

Mode `npm run dev` membawa alat pengembangan. Mode tersebut dapat terasa lebih lambat.

