# Tahap 3 — Pasang dan Uji

## 1. Cadangkan instalasi lama

Cadangkan:

- database MySQL;
- folder `bimbelku-backend/storage/app`;
- file `.env` frontend dan backend.

Jangan menyalin `.env` dari ZIP untuk menimpa konfigurasi yang sudah berjalan.

## 2. Perbarui source

Salin source Tahap 3 ke folder proyek. Jangan menyalin `node_modules`, `vendor`,
`dist`, atau database dari instalasi lain.

## 3. Jalankan pemeriksaan otomatis

Buka PowerShell dari folder utama proyek:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap3.ps1
```

Skrip akan:

1. memasang dependensi frontend dan backend;
2. menjalankan lint, TypeScript, pemeriksaan kontrak, dan build;
3. membersihkan cache Laravel;
4. menjalankan migration bertahap;
5. memperbarui katalog aktif;
6. menjalankan tes Tahap 3 dan seluruh tes Laravel;
7. memeriksa rantai jurnal keuangan.

Gunakan `-SkipInstall` bila dependensi sudah tersedia. Gunakan `-SkipMigration`
hanya pada database tes yang migration Tahap 3-nya sudah diterapkan.

## 4. Aktifkan scheduler

Pada terminal backend terpisah:

```powershell
php artisan schedule:work
```

Scheduler menjalankan pemeriksaan jurnal setiap hari pukul 02.00 serta proses
tenggat sistem lainnya.

## 5. Uji manual

### Katalog

- Form murid hanya menampilkan SD, SMP, SMA, dan Umum.
- Form tutor tidak menampilkan Perguruan Tinggi atau Semester.
- Transaksi lama tetap dapat dibaca.

### Admin keuangan

- Buka menu Keamanan Keuangan.
- Aktifkan TOTP memakai aplikasi autentikator.
- Masukkan kode enam digit untuk membuka akses.
- Pastikan halaman keuangan terkunci kembali setelah masa otorisasi habis.

### Transaksi ganda

- Klik verifikasi atau pencairan satu kali.
- Ulangi permintaan dengan kunci idempotensi yang sama.
- Pastikan tidak ada jurnal, refund, atau pencairan kedua.

### Rekening tutor

- Ganti rekening dengan kata sandi yang benar.
- Pastikan notifikasi terkirim.
- Pastikan pencairan ditahan selama 24 jam.

### Pencairan besar

- Buat pencairan minimal Rp5.000.000.
- Minta persetujuan sebagai admin pertama.
- Pastikan admin pertama tidak dapat menyetujui sendiri.
- Setujui memakai admin kedua, lalu proses pencairan.

## Larangan

Jangan menjalankan:

```powershell
php artisan migrate:fresh
```

Perintah tersebut menghapus seluruh tabel dan data.
