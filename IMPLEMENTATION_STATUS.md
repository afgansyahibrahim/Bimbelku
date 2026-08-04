# Status Implementasi BimbelKu

Tanggal pemeriksaan: 3 Agustus 2026

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
- Chat internal, PIN kehadiran, persetujuan target, dan laporan perkembangan.
- Paket 1/4/8/12 sesi, pembagian multi-mapel, slot aplikasi, serta satu tagihan paket.
- Kelas Saya, dashboard adaptif, Voucher Saya, kode promo, dan perpanjangan tutor lama.

### Tutor

- Registrasi dan verifikasi dokumen.
- Satu mata pelajaran, banyak jenjang, mode, lokasi, dan jarak tempuh.
- Jadwal rentang harian.
- Penawaran 12 jam, deteksi benturan, serta pembatasan tidak merespons.
- Detail bab, submateri, tujuan, catatan, dan lampiran murid.
- Tautan kelas online, bukti selesai, murid absen, serta keadaan darurat.
- Asesmen awal, check-in lokasi/PIN, check-out, dan laporan sesi.
- Poin, pendapatan siap cair, riwayat, rekening, dan bukti pencairan.
- Penawaran paket yang menampilkan seluruh jadwal mapel sebelum diterima.

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
- Satu admin utama memproses keuangan tanpa halaman autentikator terpisah.
- Pencairan besar tetap memakai bukti transfer, konfirmasi, idempotensi, dan audit tanpa admin kedua.
- Log audit tindakan keuangan.
- Moderasi rating, notifikasi, bantuan, footer, dan tampilan publik.
- CRUD paket, slot jam, promo, banner, dan tutorial.
- Kontrol pencarian tutor, perluasan radius, dan penetapan tutor manual.
- Pemisahan dashboard pembayaran, pencairan, serta refund dan saldo.
- Satu admin utama dengan seluruh akses; halaman serta endpoint pembuatan admin tambahan ditutup, sedangkan audit perubahan tetap aktif.
- Regresi akhir lintas murid, tutor, dan admin.

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
- Jurnal keuangan berpasangan dengan hash berantai dan baris yang tidak dapat diedit.
- Kunci idempotensi untuk mutasi pembayaran, refund, pencairan, komisi, dan rekening tutor.
- Seluruh tindakan keuangan memerlukan admin utama serta tetap melewati role, validasi server, idempotensi, dan audit.
- Perubahan rekening tutor memerlukan kata sandi dan menahan pencairan selama 24 jam.
- Pencairan bernilai besar memerlukan bukti transfer dan konfirmasi eksplisit admin utama.
- Nominal keuangan dihitung serta divalidasi pada server.
- Kontak pribadi serta tautan luar ditolak oleh chat kelas.
- PIN sesi disimpan sebagai hash dan alamat IP kehadiran disimpan sebagai hash.
- Penyelesaian privat memerlukan kehadiran terverifikasi dan laporan progres.

### Katalog aktif

- SD, SMP, SMA, dan Umum.
- Perguruan Tinggi serta Semester dinonaktifkan.
- Baris katalog lama dinonaktifkan agar riwayat transaksi tetap utuh.

### UX

- Dialog konfirmasi global buatan aplikasi.
- Toast sukses, peringatan, dan error.
- Tidak ada `window.alert`, `window.confirm`, atau `window.prompt`.
- Loading radar khusus pencarian lokasi/tutor.
- Empty state, status badge, alasan penolakan, dan tindakan berikutnya.
- Navigasi bawah khusus murid dan tutor pada layar ponsel.
- Formulir permintaan empat langkah dengan ringkasan akhir.
- Pemeriksaan awal slot tutor sebelum permintaan dikirim.
- Panduan singkat berbasis peran dan halaman.
- Pusat Bantuan responsif dengan tiket yang dijawab admin.
- Riwayat pencairan memakai kartu pada ponsel dan tabel pada desktop.
- Banner dashboard berganti setiap empat detik dan tutorial memakai carousel geser.
- Landing page mempunyai hero radar, alur visual, pratinjau paket, dan dashboard.

## Pemeriksaan yang sudah dijalankan

Pembaruan Tahap 6C menambahkan pemeriksaan kontrak 6C-A sampai 6C-final, tes admin tunggal, audit perubahan, pencarian tutor, refund/saldo, serta isolasi lintas peran. Tes Laravel final tetap harus dijalankan pada Laragon karena checkpoint penyusunan tidak mempunyai Composer/vendor.


- `npm run lint`: selesai tanpa error.
- `npm run typecheck`: lulus.
- `npm run build`: lulus.
- 1.812 modul frontend berhasil diproses pada build terakhir.
- Pemeriksaan frontend Tahap 3: lint dan TypeScript lulus.
- Kontrak keamanan Tahap 3 memeriksa kategori, jurnal, idempotensi, audit,
  penahanan rekening, serta pencairan admin tunggal.
- 184 action rute API memiliki controller dan method yang sesuai.
- 248 berkas PHP lulus pemeriksaan struktur dan sintaks pada Audit Checkpoint 1.
- Kontrak Tahap 4 lulus sebanyak 24 pemeriksaan.
- Kontrak pengalaman Tahap 5 lulus sebanyak 75 pemeriksaan.
- Build produksi memproses sedikitnya 1.812 modul.
- Bundle awal lulus anggaran: JavaScript 97,4 KB gzip dan CSS 18,3 KB gzip.
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
3. Murid membuat paket dua mapel dan memilih slot aplikasi.
4. Setiap tutor memeriksa seluruh jadwal mapelnya lalu menerima.
5. Murid memilih voucher atau kode lalu mengunggah pembayaran setelah semua tutor menerima.
6. Admin menerima pembayaran.
7. Tutor mengirim bukti selesai.
8. Murid menyetujui atau mengajukan keberatan.
9. Admin utama menguji pembayaran, pencairan, refund, idempotensi, dan audit.
10. Admin memproses pencairan atau refund dengan bukti transfer.
11. Uji pencairan besar menggunakan konfirmasi eksplisit admin utama.
12. Ulangi untuk paket offline dan perpanjangan tutor lama.

## Batas integrasi

- Sistem pembayaran bersifat pencatatan dan verifikasi manual.
- Aplikasi tidak terhubung ke bank, payment gateway, atau layanan transfer.
- Akurasi pembayaran tetap bergantung pada pemeriksaan mutasi rekening admin.
- Jurnal internal tidak menggantikan rekonsiliasi harian dengan mutasi bank.
- Daftar kurikulum lengkap perlu diisi admin sesuai sumber resmi.
- Isi hukum final harus ditinjau pihak yang berwenang sebelum produksi.

## Audit Checkpoint 2 — 3 Agustus 2026

Pemeriksaan operasional kedua mencakup 22 halaman admin, 12 halaman tutor, 12 halaman murid, 20 controller terkait, serta route kelas, jadwal, pencarian tutor, pembayaran, dan pencairan.

Perbaikan yang diterapkan:

- jadwal tutor wajib memakai interval 10 menit pada frontend dan backend;
- dashboard murid menghitung pesan belum dibaca dari database;
- rekening penerimaan tidak dapat diganti ketika tagihan paket masih aktif;
- pemblokiran murid tidak lagi menjalankan pelepasan penawaran tutor;
- checker 6C-A disinkronkan dengan penghapusan halaman keamanan keuangan;
- kontrak statis dan tes Laravel khusus Checkpoint 2 ditambahkan.

Hasil di lingkungan penyusunan: 184 action API terpetakan, 60 route frontend dan 173 tautan internal terpetakan, 247 file PHP lulus `php -l`, dan 118 file TypeScript/TSX lulus pemeriksaan sintaks. Tes Laravel runtime, typecheck penuh, ESLint, build Vite, serta pengujian MySQL konkurensi wajib dijalankan di Laragon.


## Audit Checkpoint 3 — Komunikasi dan file privat

Checkpoint ketiga memperbaiki privasi laporan kelas kelompok, mengembalikan pesan sistem pesanan ke controller chat aktif, menandai seluruh pesan belum dibaca tanpa batas 100, mencegah laporan sesi ganda, membuat query tiket portabel, menambahkan notifikasi bantuan untuk pihak lawan, dan mengamankan nama unduhan file privat.

Tes lokal utama: `php artisan test --filter=CheckpointThreeCommunicationAuditTest`.

## Audit Checkpoint 4 — 3 Agustus 2026

Responsif, keamanan, performa, dan aksesibilitas dasar telah diaudit. Ditambahkan header keamanan, masa aktif/pembersihan token Sanctum, skip link/fokus dialog, dynamic viewport, strategi gambar, optimasi sampul tutor, host Vite lokal yang lebih aman, serta cleanup source/build usang. Status runtime menunggu PHPUnit, typecheck, build, performance budget, dan matriks layar di Laragon.
