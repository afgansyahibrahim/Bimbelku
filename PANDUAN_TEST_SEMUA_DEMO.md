# Panduan Test Semua Demo BimbelKu

Panduan ini menggabungkan pengujian otomatis dan pengujian manual untuk seluruh command demo yang tersedia di BimbelKu:

1. Paket Belajar dan Session Flow V2.
2. Kelas Kelompok dari pendaftaran sampai laporan sesi.
3. Perpanjangan Paket Belajar.
4. Penggantian guru dan refund sesi tersisa.

> **Penting:** jalankan command `demo:*` hanya pada environment `local` atau `testing`. Command tersebut mengubah data database lokal dan sengaja ditolak pada production.

## 1. Persiapan

Kebutuhan minimum:

- Node.js 20+, npm 10+, PHP 8.2+, Composer 2.
- MySQL/MariaDB aktif.
- Frontend dan backend sudah memiliki file `.env` yang benar.
- `APP_ENV=local` pada `bimbelku-backend/.env`.
- Migration sudah dijalankan.

Dari root project, siapkan frontend:

```powershell
npm ci
npm run dev
```

Frontend normalnya dapat dibuka di `http://127.0.0.1:8080`.

Pada terminal kedua, siapkan backend:

```powershell
cd bimbelku-backend
composer install
php artisan optimize:clear
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

Pada terminal ketiga, jalankan scheduler agar lifecycle berbasis waktu tetap diproses:

```powershell
cd bimbelku-backend
php artisan schedule:work
```

Gunakan browser/profil browser yang berbeda untuk murid, guru, dan admin agar sesi login tidak saling menggantikan. Command demo akan menampilkan kembali akun, kode paket, ID booking, dan langkah berikutnya setiap kali dijalankan.

## 2. Pemeriksaan otomatis

Jalankan pemeriksaan khusus implementasi demo dari root project:

```powershell
npm run check:demo-session
npm run check:demo-cheap-class
npm run check:package-renewal
npm run check:demo-teacher-replacement
```

Semua perintah harus selesai tanpa `FAIL` dan exit code harus `0`.

Jalankan feature test yang berhubungan langsung dengan fixture dan alur demo:

```powershell
cd bimbelku-backend
php artisan test --filter=StageOneSessionActionReminderTest
php artisan test --filter=SessionPresenceFlowV2Test
php artisan test --filter=DemoCheapClassCommandTest
php artisan test --filter=DemoPackageRenewalCommandTest
php artisan test --filter=DemoTeacherReplacementCommandTest
```

Untuk regresi lengkap, jalankan:

```powershell
cd ..
npm run check

cd bimbelku-backend
php artisan test
```

`npm run check` sudah mencakup lint, TypeScript, pemeriksaan kontrak, seluruh pemeriksaan tahap, build produksi, dan pemeriksaan performa. Karena durasinya lebih panjang, gunakan empat pemeriksaan demo khusus saat iterasi cepat dan regresi lengkap sebelum rilis.

## 3. Akun demo

Sebagian besar demo memakai akun berikut dengan password `password`:

| Peran | Email |
| --- | --- |
| Murid | `demo.student@bimbelku.local` |
| Murid kedua Kelas Kelompok | `demo.student2@bimbelku.local` |
| Guru | `demo.tutor@bimbelku.local` |
| Admin demo | `demo.admin@bimbelku.local` |

Demo penggantian guru memakai akun terpisah:

| Peran | Email | Password |
| --- | --- | --- |
| Murid | `demo.replacement.student@bimbelku.local` | `password` |
| Guru lama | `demo.replacement.old@bimbelku.local` | `password` |
| Calon guru baru | `demo.replacement.new@bimbelku.local` | `password` |
| Admin fallback | `demo.replacement.admin@bimbelku.local` | `password` |

Jika database sudah mempunyai admin utama, command dapat memakai admin tersebut sebagai pengganti admin demo. Dalam kondisi itu, login menggunakan email dan password admin utama yang sudah dikonfigurasi. Selalu ikuti akun admin yang dicetak oleh command.

## 4. Demo Paket Belajar dan Session Flow V2

Tujuan: menguji kehadiran guru, kehadiran murid, akhir sesi, laporan hasil belajar per bab, dan konfirmasi murid tanpa menunggu jadwal asli.

### Siapkan data

```powershell
cd bimbelku-backend
php artisan demo:session-reminder reset
php artisan demo:session-reminder setup
php artisan demo:session-reminder status
```

Catat akun, kode paket, booking ID, dan jadwal yang ditampilkan.

### Uji melalui UI

1. Login sebagai guru, buka **Ruang Belajar**, lalu klik **Saya Siap Mengajar**.
2. Login sebagai murid di browser lain, buka **Kelas Saya**, lalu klik **Saya Sudah Hadir**.
3. Pastikan kedua status kehadiran tampil dan sesi dapat digunakan seperti biasa.
4. Percepat sesi ke jendela check-out:

   ```powershell
   php artisan demo:session-reminder checkout-ready
   ```

5. Refresh halaman guru, klik **Akhiri Sesi**, lalu isi dan kirim hasil belajar per bab.
6. Refresh halaman murid. Pilih **Sesi Sesuai** untuk alur sukses atau **Ada masalah** untuk memeriksa alur keberatan.
7. Periksa kondisi akhir:

   ```powershell
   php artisan demo:session-reminder status
   ```

Hasil yang diharapkan:

- Guru dan murid dapat mencatat kehadiran dengan urutan yang benar.
- Tombol akhir sesi tersedia setelah `checkout-ready`.
- Laporan guru tersimpan dan dapat ditinjau murid.
- Pilihan murid mengubah status sesi sesuai alur persetujuan atau masalah.
- Aturan booking production 24 jam tidak berubah.

Setelah selesai:

```powershell
php artisan demo:session-reminder reset
```

## 5. Demo Kelas Kelompok

Tujuan: menguji pendaftaran, pembayaran, verifikasi admin, sesi live, laporan guru, revisi admin, progres murid, dan penyelesaian kelas.

### Alur lengkap dari sebelum pembayaran

```powershell
cd bimbelku-backend
php artisan demo:cheap-class reset
php artisan demo:cheap-class pre-payment
php artisan demo:cheap-class status
```

1. Login sebagai murid dan buka **Kelas Kelompok** (`/student/kelas-murah`).
2. Pilih kelas demo dan klik **Gabung Kelas Kelompok**.
3. Pastikan halaman pembayaran muncul dan kursi murid tertahan.
4. Unggah bukti pembayaran melalui UI. Jika ingin mempercepat tanpa unggah manual, jalankan:

   ```powershell
   php artisan demo:cheap-class payment-submitted
   ```

5. Login sebagai admin, buka **Pembayaran** (`/admin/pembayaran`), lihat bukti, lalu klik **Terima pembayaran**. Shortcut lokal bila diperlukan:

   ```powershell
   php artisan demo:cheap-class payment-paid
   ```

6. Pastikan pembayaran menjadi `paid` dan kelas menjadi `confirmed`.
7. Percepat jadwal ke sesi aktif:

   ```powershell
   php artisan demo:cheap-class session-live
   ```

8. Login sebagai guru, buka `/guru/kelas-murah`, lalu klik **Saya Hadir & Mulai Mengajar**.
9. Di akun murid, periksa popup/status kelas dan akses bergabung yang muncul.
10. Percepat waktu ke akhir sesi:

    ```powershell
    php artisan demo:cheap-class session-ended
    ```

11. Refresh halaman guru, isi jumlah peserta hadir, progres bab, dan catatan, lalu kirim laporan sesi.
12. Login sebagai admin dan buka `/admin/kelas-murah/jadwal`.
13. Uji **Minta Perbaikan**, pastikan guru dapat merevisi dan mengirim ulang laporan.
14. Setelah laporan benar, klik **Konfirmasi Sesi** sebagai admin.
15. Login sebagai murid, buka halaman progres kelas dan **Riwayat**. Untuk kelas satu sesi, paket harus menjadi `completed`.
16. Periksa status akhir:

    ```powershell
    php artisan demo:cheap-class status
    ```

### Shortcut langsung ke sesi live

Jika hanya ingin mengetes kehadiran, penutupan, dan laporan tanpa alur pembayaran:

```powershell
php artisan demo:cheap-class reset
php artisan demo:cheap-class setup
```

Command `setup` langsung menyiapkan kelas yang sedang berada pada waktu belajar. Lanjutkan dari langkah guru membuka `/guru/kelas-murah`.

Hasil yang diharapkan:

- Pendaftaran membuat order dan menahan kursi.
- Bukti transfer dapat diperiksa admin dan pembayaran dapat disetujui.
- Kelas hanya dapat dibuat live setelah kondisi pembayaran terpenuhi.
- Kehadiran guru membuka pengalaman sesi untuk murid.
- Setelah waktu selesai, guru wajib mengirim laporan.
- Admin dapat meminta revisi atau mengonfirmasi laporan.
- Progres dan riwayat murid mencerminkan hasil akhir.

Setelah selesai:

```powershell
php artisan demo:cheap-class reset
```

## 6. Demo Perpanjangan Paket

Tujuan: menguji paket lama yang selesai, pemilihan materi lanjutan, pembayaran paket baru, prioritas tutor lama, sesi terakhir, dan perpindahan paket ke riwayat.

### Siapkan paket lama

```powershell
cd bimbelku-backend
php artisan demo:package-renewal reset
php artisan demo:package-renewal setup
php artisan demo:package-renewal status
```

Command menyiapkan Paket 1 berstatus `completed` dengan materi lama 100%.

### Uji melalui UI

1. Login sebagai murid, buka **Kelas Saya** lalu **Riwayat**.
2. Pada paket lama, klik **Perpanjang dengan Tutor Ini**.
3. Pilih materi lanjutan **Fungsi dan Persamaan Kuadrat**.
4. Susun empat jadwal yang lolos validasi lead time pada UI, lalu selesaikan checkout sampai tagihan Paket 2 dibuat.
5. Percepat pembayaran Paket 2:

   ```powershell
   php artisan demo:package-renewal payment-paid
   ```

6. Login sebagai guru, buka **Permintaan Bimbel**, lalu terima permintaan perpanjangan.
7. Pastikan Paket 2 menjadi aktif. Jangan melanjutkan sebelum guru menerima penawaran.
8. Percepat Paket 2 ke pertemuan terakhir:

   ```powershell
   php artisan demo:package-renewal final-session-ready
   ```

9. Guru klik **Saya Siap Mengajar**, kemudian murid klik **Saya Sudah Hadir**.
10. Percepat sesi terakhir ke jendela akhir sesi:

    ```powershell
    php artisan demo:package-renewal checkout-ready
    ```

11. Guru mengakhiri sesi dan mengisi hasil belajar.
12. Murid memilih **Sesi Sesuai** atau **Ada masalah**. Untuk alur sukses, pilih **Sesi Sesuai**.
13. Pastikan Paket 2 berpindah ke **Riwayat** setelah sesi terakhir disetujui.
14. Periksa status dan daftar materi:

    ```powershell
    php artisan demo:package-renewal status
    ```

Hasil yang diharapkan:

- Paket lama tetap tersimpan sebagai riwayat.
- Materi yang sudah 100% mengarahkan murid ke materi lanjutan.
- Pembayaran memulai penawaran prioritas kepada tutor lama.
- Tutor harus menerima sebelum Paket 2 aktif.
- Penyelesaian sesi terakhir memindahkan Paket 2 ke riwayat.

Setelah selesai:

```powershell
php artisan demo:package-renewal reset
```

## 7. Demo Penggantian Guru

Tujuan: menguji pengajuan murid, persetujuan admin, kandidat guru baru, pencarian ulang ketika guru tidak ditemukan, dan refund sesi tersisa.

Pastikan fitur aktif:

```dotenv
FEATURE_TEACHER_REPLACEMENT=true
```

Kemudian jalankan:

```powershell
cd bimbelku-backend
php artisan config:clear
php artisan demo:teacher-replacement reset
php artisan demo:teacher-replacement setup
php artisan demo:teacher-replacement status
```

Fixture awal berisi satu sesi selesai dan dua sesi mendatang bersama guru lama.

### Skenario A: guru pengganti ditemukan

1. Login sebagai murid penggantian guru.
2. Buka paket aktif dan ajukan penggantian guru melalui UI.
3. Login sebagai admin, periksa pengajuan, lalu setujui.
4. Login sebagai calon guru baru, buka penawaran/permintaan yang masuk, lalu terima.
5. Pastikan paket/sesi mendatang memakai guru baru, sedangkan riwayat sesi lama tetap memakai guru lama.
6. Jalankan `php artisan demo:teacher-replacement status` untuk mencocokkan status database dengan UI.

### Skenario B: guru tidak ditemukan lalu cari lagi

Mulai dari fixture baru:

```powershell
php artisan demo:teacher-replacement reset
php artisan demo:teacher-replacement setup
php artisan demo:teacher-replacement candidate-off
```

1. Login sebagai murid, ajukan penggantian guru.
2. Login sebagai admin dan setujui pengajuan.
3. Paksa pencarian mencapai kondisi tidak ada guru:

   ```powershell
   php artisan demo:teacher-replacement no-teacher
   ```

4. Pastikan murid melihat pilihan **Cari lagi**, **Ubah jadwal**, dan **Refund**.
5. Selama kandidat masih `off`, uji **Cari lagi** dan pastikan pencarian tetap gagal secara wajar.
6. Aktifkan kandidat:

   ```powershell
   php artisan demo:teacher-replacement candidate-on
   ```

7. Coba **Cari lagi**, lalu pastikan calon guru baru menerima penawaran.

### Skenario C: refund sesi tersisa

Mulai lagi dari fixture baru, ajukan dan setujui penggantian, lalu arahkan ke `no_teacher` seperti Skenario B. Setelah itu:

```powershell
php artisan demo:teacher-replacement refund-ready
```

1. Login sebagai murid dan buka **Riwayat Transaksi**.
2. Pilih tujuan refund yang tersedia.
3. Login sebagai admin dan buka **Refund & Saldo**, lalu selesaikan refund melalui UI.
4. Jika hanya membutuhkan shortcut lokal sampai selesai, jalankan:

   ```powershell
   php artisan demo:teacher-replacement complete-refund
   ```

5. Pastikan refund sesi tersisa masuk ke Saldo BimbelKu, sementara order asli tetap `paid` untuk menjaga audit transaksi.
6. Periksa status akhir:

   ```powershell
   php artisan demo:teacher-replacement status
   ```

Hasil yang diharapkan:

- Penggantian hanya berjalan setelah disetujui admin.
- Riwayat guru lama tidak ditimpa.
- Pencarian tanpa kandidat berakhir pada opsi pemulihan yang benar.
- Mengaktifkan kandidat memungkinkan pencarian berikutnya menemukan guru.
- Refund hanya mencakup sesi tersisa dan tidak mengubah order asli menjadi belum dibayar.

Setelah selesai:

```powershell
php artisan demo:teacher-replacement reset
```

## 8. Reset seluruh fixture demo

Jalankan ini setelah presentasi atau sebelum mengulang semua skenario:

```powershell
cd bimbelku-backend
php artisan demo:session-reminder reset
php artisan demo:cheap-class reset
php artisan demo:package-renewal reset
php artisan demo:teacher-replacement reset
php artisan optimize:clear
```

Beberapa command sengaja mempertahankan akun dan riwayat finansial/sesi untuk kebutuhan audit. `reset` menonaktifkan atau mengarsipkan fixture aktif; command ini bukan penghapus seluruh histori database.

## 9. Troubleshooting

### Command demo ditolak

Pastikan `APP_ENV=local`, kemudian jalankan:

```powershell
cd bimbelku-backend
php artisan optimize:clear
```

### UI tidak berubah setelah command dijalankan

- Refresh halaman dan pastikan login memakai peran yang benar.
- Pastikan frontend mengarah ke API backend yang sedang dijalankan.
- Hentikan backend lama, lalu jalankan kembali `php artisan serve` dari folder `bimbelku-backend` project ini.
- Periksa kondisi fixture dengan subcommand `status` yang sesuai.

### Route atau tabel tidak ditemukan

```powershell
cd bimbelku-backend
php artisan migrate
php artisan optimize:clear
php artisan route:list
```

### Tahap command dijalankan terlalu cepat

Command akan memberi pesan kondisi yang belum terpenuhi. Selesaikan tindakan UI yang diminta, jalankan `status`, lalu ulangi tahap tersebut. Contoh penting: guru harus menerima perpanjangan sebelum `demo:package-renewal final-session-ready` dijalankan.

## 10. Checklist kelulusan akhir

- [ ] Empat pemeriksaan npm terkait demo lulus.
- [ ] Lima feature test demo dan Session Flow V2 lulus.
- [ ] Kehadiran guru dan murid pada sesi privat berhasil.
- [ ] Laporan sesi privat dan respons murid berhasil.
- [ ] Kelas Kelompok berhasil dari pendaftaran sampai `completed`.
- [ ] Revisi laporan Kelas Kelompok oleh admin dan guru berhasil.
- [ ] Paket selesai dapat diperpanjang dengan tutor lama.
- [ ] Paket perpanjangan selesai dan berpindah ke riwayat.
- [ ] Penggantian guru berhasil ketika kandidat tersedia.
- [ ] Kondisi `no_teacher`, pencarian ulang, dan perubahan ketersediaan kandidat berhasil.
- [ ] Refund sesi tersisa selesai tanpa merusak status order asli.
- [ ] Seluruh fixture aktif sudah di-reset setelah pengujian.
