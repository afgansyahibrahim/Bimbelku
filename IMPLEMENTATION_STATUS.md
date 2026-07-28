# Status Implementasi BimbelKu

Tanggal pemeriksaan: 28 Juli 2026

## Selesai diimplementasikan

### Fondasi

- React, TypeScript, Vite, Tailwind, dan komponen UI.
- Laravel 12 API, Sanctum, MySQL, middleware peran.
- Konfigurasi API terpusat dan CORS berbasis environment.
- Lazy loading seluruh halaman utama.

### Murid

- Pendaftaran dengan persetujuan kebijakan.
- Pencarian privat/kelompok berdasarkan materi, jadwal, dan mode.
- Pengambilan titik lokasi untuk offline.
- Radar pencarian dan perluasan radius 3/5/8/12 km.
- Status pencarian, keputusan profil, cooldown penolakan, dan pembatalan.
- Pembayaran manual, tujuan refund, unggah ulang bukti ditolak, dan penghitung tenggat.
- Kelas, penyelesaian, keberatan, tutor tidak hadir, rating, transaksi, dan refund.

### Tutor

- Registrasi dan verifikasi dokumen.
- Satu mata pelajaran, banyak jenjang, mode, lokasi, dan jarak tempuh.
- Jadwal rentang harian.
- Penawaran 12 jam, deteksi benturan, serta pembatasan tidak merespons.
- Detail bab, submateri, tujuan, catatan, dan lampiran murid.
- Tautan kelas online, bukti selesai, murid absen, serta keadaan darurat.
- Poin, pendapatan siap cair, riwayat, rekening, dan bukti pencairan.

### Admin

- Dashboard operasional.
- Verifikasi tutor dan pemeriksaan dokumen privat.
- Pengguna aktif/diblokir.
- Tarif bawaan dan tarif khusus.
- Komisi dengan snapshot transaksi.
- Kapasitas/waktu tunggu kelompok.
- Katalog bab dan submateri.
- Verifikasi pembayaran manual.
- Monitoring kelas.
- Pusat kasus: laporan, sengketa, tinjau bukti, refund.
- Pencairan pendapatan tutor.
- Moderasi rating, notifikasi, bantuan, footer, dan tampilan publik.

### Keamanan

- Dokumen dan bukti sensitif memakai penyimpanan privat.
- Akses file diperiksa berdasarkan peran dan kepemilikan.
- Token reset password tersimpan dalam bentuk hash.
- Reset password mencabut token login.
- Perubahan kata sandi menutup sesi lain dan penggantian berkas gagal tidak menghapus berkas lama.
- Rate limiting autentikasi, pembuatan pesanan, bantuan, dan unggah pembayaran.
- Rekening admin dikunci dari perubahan ketika pembayaran masih aktif atau sedang diperiksa.
- Akun admin awal tidak memakai kredensial bawaan; harus diberikan lewat environment.
- Tidak ada endpoint publik untuk mengubah skema atau memperbaiki database.

### UX

- Dialog konfirmasi global buatan aplikasi.
- Toast sukses, peringatan, dan error.
- Tidak ada `window.alert`, `window.confirm`, atau `window.prompt`.
- Loading radar khusus pencarian lokasi/tutor.
- Empty state, status badge, alasan penolakan, dan tindakan berikutnya.

## Pemeriksaan yang sudah dijalankan

- `npm run lint`: selesai tanpa error.
- `npm run typecheck`: lulus.
- `npm run build`: lulus.
- 1.783 modul frontend berhasil diproses pada build terakhir.
- 148 berkas PHP berhasil diparse tanpa kesalahan sintaks.
- 106 aksi rute API berhasil dicocokkan dengan metode controller.
- Pencarian statis tidak menemukan dialog bawaan browser.
- Seluruh 71 berkas sumber TypeScript/TSX aktif dapat dijangkau dari entry point.
- Penghapusan menyeluruh berkas dan dependensi lama dijadwalkan khusus pada Tahap 3.
- Audit dependensi produksi tidak menemukan advisory tingkat tinggi atau kritis.

ESLint selesai tanpa error atau peringatan. Typecheck dan build produksi juga lulus.

`npm audit` masih melaporkan dua advisory tingkat sedang pada React Router 6 yang tidak memiliki patch pada jalur versi tersebut. Pola yang terdampak—SSR hydration/deserialisasi dan tujuan navigasi tidak tepercaya—tidak digunakan aplikasi ini: BimbelKu adalah SPA Vite dan semua tujuan `Link`/`navigate` berasal dari konstanta internal. Versi dikunci agar perubahan tak terduga tidak masuk saat instalasi.

## Verifikasi yang harus dilakukan pada mesin deployment

Runtime PHP, Composer, dan MySQL tidak tersedia di lingkungan penyusunan artefak ini. Setelah instalasi pada mesin target, jalankan:

```bash
cd bimbelku-backend
composer install
php artisan migrate --seed
php artisan test
php artisan route:list
php artisan schedule:work
composer audit
```

Kemudian uji alur berikut dengan tiga akun terpisah:

1. Admin memverifikasi tutor.
2. Tutor mengaktifkan profil dan jadwal.
3. Murid mencari kelas online.
4. Tutor menerima.
5. Murid menerima profil dan mengunggah pembayaran.
6. Admin menerima pembayaran.
7. Tutor mengirim bukti selesai.
8. Murid menyetujui atau mengajukan keberatan.
9. Admin memproses pencairan atau refund.
10. Ulangi untuk offline dan kelompok.

## Batas integrasi

- Sistem pembayaran bersifat pencatatan dan verifikasi manual.
- Aplikasi tidak terhubung ke bank, payment gateway, atau layanan transfer.
- Akurasi pembayaran tetap bergantung pada pemeriksaan mutasi rekening admin.
- Daftar kurikulum lengkap perlu diisi admin sesuai sumber resmi.
- Isi hukum final harus ditinjau pihak yang berwenang sebelum produksi.
