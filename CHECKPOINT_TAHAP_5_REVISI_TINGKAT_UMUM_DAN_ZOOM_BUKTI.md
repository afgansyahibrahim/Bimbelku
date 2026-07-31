# Checkpoint Tahap 5 — Tingkat Umum dan Zoom Bukti

Tanggal pemeriksaan: 29 Juli 2026

## Dasar revisi

Revisi dibuat dari paket:

`BimbelKu_Tahap_5_Gabungan_Optimasi_Revisi_Pratinjau_Berkas_2026-07-29.zip`

Seluruh perbaikan Privat, pembayaran, validasi mapel, optimasi, dan pratinjau
`inline` tetap dipertahankan.

## Perubahan jenjang

Katalog pendidikan sekarang memakai lima pilihan:

1. SD;
2. SMP;
3. SMA;
4. Perguruan Tinggi;
5. Umum.

Perguruan Tinggi memakai pilihan Semester 1 sampai Semester 14. Program studi
dan kebutuhan tugas dapat ditulis pada tujuan belajar atau catatan tambahan.

Umum dipisahkan dari Perguruan Tinggi. Pilihan tingkat Umum meliputi:

- Semua tingkat;
- Pemula;
- Menengah;
- Lanjutan.

Pilihan baru telah disambungkan ke:

- pendaftaran murid dan tutor;
- profil kompetensi tutor;
- katalog mata pelajaran;
- materi atau bab;
- tarif khusus;
- pemesanan murid;
- validasi backend;
- pencocokan tutor;
- pengelompokan kelas.

Katalog awal ditambah untuk kebutuhan kuliah, bahasa, teknologi, keterampilan,
musik, keagamaan, dan persiapan tes. Admin tetap dapat menambah atau mengubah
mapel dan materi.

## Perubahan pratinjau bukti

Foto bukti tidak lagi dibuka melalui tab baru. Berkas ditampilkan melalui
viewer internal.

Fungsi viewer:

- klik foto untuk membuka detail;
- zoom 50–400 persen;
- klik gambar untuk beralih antara 100 dan 200 persen;
- putar gambar 90 derajat;
- tutup melalui tombol, area luar, atau tombol `Esc`;
- tampilkan PDF pada halaman yang sama;
- hilangkan pemaksaan unduhan;
- pertahankan pemeriksaan hak akses backend.

Viewer dipakai pada bukti pembayaran, bukti pelaksanaan, laporan kasus,
lampiran materi, dokumen tutor, CV, struk pencairan, refund, dan lampiran
percakapan.

## Perlindungan data lama

Revisi tidak membutuhkan perubahan struktur tabel. Riwayat SD–SMA, transaksi,
unggahan, dan nilai lama tetap dipertahankan.

Seeder hanya menambah atau menggabungkan katalog. Seeder tidak menghapus
transaksi lama.

## Cara memasang

Salin paket terbaru ke folder proyek, lalu pilih **Replace**. Pertahankan:

- `.env` frontend;
- `bimbelku-backend/.env`;
- database MySQL;
- `bimbelku-backend/storage/app`;
- tautan `public/storage`.

Jalankan:

```powershell
cd C:\laragon\www\Website_Bimbelku
npm ci

cd bimbelku-backend
composer install
php artisan migrate
php artisan db:seed --class=CurriculumCatalogSeeder
php artisan optimize:clear
php artisan storage:link

cd ..
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap5.ps1 -SkipInstall
```

Jangan menjalankan `php artisan migrate:fresh`.

## Pemeriksaan

Pemeriksaan workspace yang dapat dijalankan telah lulus:

- ESLint;
- TypeScript;
- 115 kontrak action API;
- pemeriksaan viewer internal;
- build produksi;
- anggaran performa.

Tes Laravel dan seeder nyata harus dijalankan melalui PHP Laragon.

## Uji manual

1. Pilih **Perguruan Tinggi**, Semester 9, dan Akuntansi.
2. Pastikan mapel serta bab dapat dipilih.
3. Pilih **Umum**, Pemula, dan Komputer Dasar.
4. Pastikan permintaan dapat dibuat.
5. Masuk sebagai admin dan buka bukti pembayaran.
6. Klik foto bukti, lalu uji zoom serta putar.
7. Buka dokumen PDF tutor.
8. Pastikan PDF tampil tanpa masuk ke folder Downloads.
