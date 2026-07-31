# Memasang dan Menguji BimbelKu Tahap 5

Paket Tahap 5 dapat disalin ke folder proyek lama lalu dipilih **Replace**.
Database, berkas `.env`, dan unggahan lama tetap dipertahankan.

## Sebelum replace

Cadangkan:

1. folder proyek lama;
2. `.env` pada folder frontend;
3. `bimbelku-backend/.env`;
4. `bimbelku-backend/storage/app`;
5. database MySQL BimbelKu.

Jangan ikut menimpa `.env` dengan contoh konfigurasi. ZIP Tahap 5 memang tidak
menyertakan `.env`.

## Cara replace

1. Ekstrak ZIP Tahap 5.
2. Salin seluruh isi folder proyek dari ZIP.
3. Tempel ke folder proyek lama.
4. Pilih **Replace the files in the destination**.
5. Pastikan dua `.env` lama dan folder unggahan masih ada.

## Perintah setelah replace

Buka Terminal VS Code atau Terminal Laragon pada folder utama proyek:

```powershell
npm ci

cd bimbelku-backend
composer install
php artisan migrate
php artisan db:seed --class=CurriculumCatalogSeeder
php artisan optimize:clear
php artisan storage:link
```

Catatan:

- Gunakan `php artisan migrate`, bukan `migrate:fresh`.
- Pesan `The link already exists` dari `storage:link` tidak bermasalah.
- Seeder katalog dapat dijalankan ulang dan tidak menghapus data lama.
- Jika server produksi meminta konfirmasi seeder, tambahkan `--force`.

## Menjalankan pemeriksaan otomatis

Kembali ke folder utama proyek:

```powershell
cd ..
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap5.ps1 -SkipInstall
```

Hilangkan `-SkipInstall` jika dependensi belum dipasang:

```powershell
.\scripts\test-tahap5.ps1
```

Tes Laravel memakai SQLite sementara. Database MySQL utama tidak dihapus atau
diisi ulang oleh skrip tersebut.

## Menjalankan scheduler lokal

Buka terminal kedua pada folder backend:

```powershell
php artisan schedule:work
```

Biarkan terminal tersebut terbuka saat menguji tenggat pembayaran, penawaran,
kelas kelompok, dan penyelesaian sesi.

## Pemeriksaan manual

### Admin

1. Login sebagai admin.
2. Buka **Mata Pelajaran**.
3. Cari Matematika dan pastikan babnya terhitung.
4. Tambah satu mapel percobaan lalu pastikan nama duplikat beda kapital tidak
   membuat data kedua.
5. Buka **Materi Kurikulum** dan tambah satu bab.
6. Buka **Tarif Per Jam → Tambah tarif khusus**.
7. Ketik nama mapel untuk memfilter dropdown.
8. Ketik mapel baru dan pilih tindakan **Tambahkan sebagai mapel baru**.
9. Isi rekening tujuan. QRIS boleh dikosongkan.

### Murid dan tutor

1. Login sebagai murid.
2. Pilih kelas, mapel, **Seluruh materi mapel**, mode, dan jenis kelas.
3. Pilih waktu terdekat pada menit kelipatan 10.
4. Login sebagai tutor dan terima permintaan.
5. Login kembali sebagai murid.
6. Pastikan tagihan tampil pada:
   - pengingat kanan bawah;
   - Pencarian;
   - Kelas Saya → Lihat detail;
   - Riwayat Transaksi → Belum dibayar.
7. Klik **Bayar sekarang** dan unggah gambar bukti percobaan.
8. Login admin dan tolak bukti dengan alasan.
9. Login murid dan unggah ulang bukti.
10. Login admin dan terima pembayaran.
11. Pastikan kelas menjadi aktif dan akses kelas tampil.

### Handphone dan tablet

Uji minimal pada lebar:

- 360 piksel;
- 768 piksel;
- 1024 piksel;
- desktop 1280 piksel atau lebih.

Pada tiga ukuran pertama:

- sidebar harus tersembunyi saat halaman dibuka;
- tombol menu harus membuka sidebar;
- ketukan di luar sidebar harus menutupnya;
- perpindahan halaman harus menutup sidebar;
- dialog dapat digulir;
- tombol pembayaran, unggah, dan keputusan admin dapat ditekan;
- tabel admin dapat digulir ke samping;
- tidak ada bagian penting yang tertutup pengingat pembayaran.

## Akun pengujian

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Admin | `admin@bimbelku.com` | `admin123456789` |
| Tutor | `budi@guru.com` | `password123` |
| Murid | `murid@bimbelku.com` | `password123` |

Akun tersebut tersedia jika pengaturan demo user pada `.env` sebelumnya sudah
diaktifkan dan `DatabaseSeeder` pernah dijalankan. Seeder katalog Tahap 5 tidak
mengubah kata sandi akun.

## Jika terjadi error

Simpan:

- seluruh output PowerShell;
- tangkapan layar halaman;
- `bimbelku-backend/storage/logs/laravel.log`;
- nama peran dan langkah terakhir sebelum error.

Jangan memperbaiki error dengan `migrate:fresh` pada database utama.
