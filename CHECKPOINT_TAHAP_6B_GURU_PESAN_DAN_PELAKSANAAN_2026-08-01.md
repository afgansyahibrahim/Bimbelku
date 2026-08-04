# Checkpoint Tahap 6B — Guru, Pesan, dan Pelaksanaan Kelas

> **Dokumen historis:** aturan autentikator dan admin kedua di dokumen ini sudah digantikan oleh Audit Checkpoint 1 tanggal 3 Agustus 2026.

Tanggal checkpoint: 1 Agustus 2026  
Fondasi: BimbelKu Tahap 6A Revisi Final  
Status: Tahap 6B selesai pada kode dan pemeriksaan otomatis. Tahap 6C belum dikerjakan.

## Hasil utama

Alur tutor sekarang dapat dijalankan dengan urutan berikut:

> Penawaran masuk → tutor memeriksa seluruh jadwal → terima/tolak → kelas aktif → chat kelas → usulan jadwal bila perlu → PIN dan check-in → kehadiran seluruh murid → check-out → laporan perkembangan → foto bukti langsung → persetujuan murid/admin → saldo tersedia → pengajuan pencairan → transfer admin.

Alur 6A tidak diubah. Paket tetap dibayar dan diverifikasi sebelum pencarian tutor dimulai. Identitas, chat, lampiran, alamat lengkap, dan ruang belajar hanya terbuka untuk hubungan kelas berbayar yang sah.

## Dashboard dan navigasi tutor

Navigasi HP tutor menggunakan lima menu:

1. Beranda
2. Permintaan
3. Kelas
4. Pesan
5. Saya

Halaman Beranda memakai endpoint `/api/teacher/dashboard-v2` dan menempatkan pekerjaan menunggu pada bagian paling atas:

- penawaran yang perlu dijawab;
- pesan belum dibaca;
- persetujuan perubahan jadwal;
- notifikasi baru;
- banding yang sedang diproses.

Ringkasan berikutnya memuat kelas aktif, jumlah murid, penilaian, sesi terdekat, serta saldo ditahan, tersedia, dan diajukan.

Halaman `/guru/saya` menjadi pusat profil, jadwal, pendapatan, rekening, performa, banding, notifikasi, dan bantuan.

## Penawaran mengajar

- Kartu penawaran tetap menyembunyikan data pribadi sebelum akses sah terbuka.
- Tutor melihat mapel, jenjang, materi, mode, durasi, tarif bruto, komisi admin, estimasi bersih, dan seluruh sesi paket.
- Penerimaan diperiksa ulang oleh backend terhadap status akun, verifikasi profil, poin, penangguhan, kompetensi, mode, radius, jam tersedia, dan bentrok kelas.
- Penawaran paket menjelaskan bahwa paket sudah dibayar dan tidak membuat invoice kedua.
- Penolakan meminta alasan terstruktur dan catatan tambahan.
- Penolakan karena jarak tidak mengurangi poin tutor.
- Tombol penerimaan dikunci saat request berjalan untuk mencegah jawaban ganda.

## Pesan bergaya marketplace

Halaman `/guru/pesan` dan `/student/messages` menggunakan komponen percakapan yang sama.

- Desktop memakai daftar percakapan dan panel chat berdampingan.
- HP menampilkan satu panel pada satu waktu dengan tombol kembali yang jelas.
- Pencarian percakapan bekerja pada nama, mapel, dan judul kelas.
- Pesan menampilkan waktu, pengirim, status terkirim/dibaca, dan jumlah pesan belum dibaca.
- Polling hanya berjalan ketika halaman terlihat.
- Pesan gagal tetap disimpan pada antarmuka dan memiliki tombol Coba kirim ulang.
- `client_token` UUID mencegah retry membuat pesan ganda.
- Lampiran mendukung JPG, PNG, WebP, dan PDF maksimal 5 MB.
- Lampiran disimpan pada disk privat dan dibuka melalui viewer internal berizin.
- Nomor telepon, email, media sosial, akun luar, dan tautan eksternal tetap ditolak backend.
- Chat hanya memuat booking aktif dengan peserta berstatus pembayaran `paid`.

## Pelaksanaan kelas

Ruang Belajar mengatur urutan kerja tutor:

1. murid membuat PIN mendekati jadwal;
2. tutor check-in memakai PIN;
3. sesi offline juga memeriksa lokasi perangkat;
4. tutor mencatat status seluruh peserta: hadir, terlambat, hadir sebagian, tidak hadir, atau izin;
5. kehadiran seluruh peserta harus tersimpan sebelum check-out;
6. tutor melakukan check-out;
7. laporan perkembangan diterbitkan untuk setiap murid yang hadir;
8. bukti penyelesaian baru dapat dikirim.

Kelas kelompok mendukung catatan kehadiran dan laporan perkembangan per murid. Murid tidak hadir menggunakan alur laporan ketidakhadiran, sedangkan keadaan darurat memakai alur terpisah dengan bukti dan kronologi.

## Bukti pelaksanaan

- Unggah galeri untuk bukti penyelesaian diganti kamera langsung.
- Kamera belakang digunakan sebagai nilai awal.
- Frontend mengirim `capture_source=camera` dan `captured_at`.
- Backend menolak foto yang diambil lebih dari 20 menit sebelumnya atau bertanggal masa depan lebih dari lima menit.
- Bukti baru dapat dikirim pada 15 menit terakhir sesi sampai batas grace period.
- Check-in, check-out, kehadiran seluruh murid, dan laporan setiap murid yang hadir wajib lengkap.
- Bukti, catatan, waktu pengambilan, dan masa keberatan disimpan pada booking.

## Perubahan jadwal dengan persetujuan

- Tutor atau murid berbayar dapat mengajukan waktu mulai baru sebelum sesi berjalan.
- Durasi kelas tidak berubah.
- Jadwal lama tetap berlaku saat permintaan masih menunggu.
- Backend memeriksa batas waktu pengajuan, enam bulan maksimum, jam tersedia tutor, bentrok tutor, dan bentrok seluruh peserta.
- Semua pihak terdampak menerima permintaan jawaban.
- Satu penolakan mempertahankan jadwal lama dan membutuhkan alasan minimal sepuluh karakter.
- Jadwal baru diterapkan hanya setelah seluruh pihak menyetujui.
- Booking, booking request, package session, dan group pool diperbarui dalam transaksi yang sama.

## Pendapatan, komisi, dan pencairan

Dompet tutor memisahkan empat saldo:

| Saldo | Arti |
|---|---|
| Ditahan | Masa keberatan, sengketa, atau pemeriksaan belum selesai. |
| Tersedia | Sesi sah dan dapat diajukan tutor. |
| Diajukan | Pengajuan sedang diperiksa admin. |
| Dibayar | Pencairan telah dicatat masuk rekening. |

Setiap sesi siap cair menampilkan nilai bruto, komisi admin, dan pendapatan bersih. Tutor dapat mengajukan seluruh sesi tersedia. Backend mengunci booking, memeriksa rekening dan masa penahanan rekening, membuat snapshot tujuan transfer, lalu mengubah status sesi menjadi `requested` agar tidak diajukan dua kali.

Runtime terbaru memakai satu admin utama dengan idempotensi, audit, penahanan setelah perubahan rekening, dan bukti transfer privat; autentikator serta admin kedua tidak lagi digunakan. Pengajuan yang sama diproses sebagai satu kelompok terpisah dari saldo baru tutor.

## Performa, pelanggaran, penilaian, dan banding

Halaman `/guru/performa` memuat:

- poin saat ini dan tingkat rekomendasi;
- status penangguhan;
- nilai rata-rata serta sebaran bintang 1–5;
- ulasan murid;
- seluruh perubahan poin;
- batas waktu banding;
- status serta catatan keputusan banding.

Tutor hanya dapat membanding penalti bernilai negatif, satu kali per catatan, paling lambat tujuh hari secara default. Bukti banding disimpan privat. Admin menerima kasus pada Pusat Kasus dan dapat menerima atau menolak banding. Jika diterima, poin penalti dipulihkan melalui ledger baru agar jejak lama tidak dihapus.

## Pusat notifikasi

- Halaman `/guru/notifikasi` menampilkan semua pemberitahuan.
- Filter Semua dan Belum dibaca tersedia.
- Pencarian isi notifikasi tersedia.
- Baca semua memakai satu endpoint backend.
- Notifikasi memiliki `target_url` internal dan membuka pekerjaan tujuan.
- Dropdown header terkunci di dalam viewport HP.
- Teks panjang dibungkus dan tidak membuat halaman bergeser horizontal.
- `unique_key` mencegah pemberitahuan transaksi penting dibuat berulang.

## Migrasi baru

`database/migrations/2026_08_01_000300_build_stage_six_b_teacher_operations.php`

Tabel baru:

- `classroom_message_reads`
- `participant_attendances`
- `schedule_change_requests`
- `schedule_change_responses`
- `teacher_appeals`
- `teacher_payout_requests`

Kolom baru:

- notifikasi: `target_url`, `unique_key`;
- pesan: data lampiran dan `client_token`;
- booking: sumber/waktu foto selesai dan referensi pengajuan pencairan.

Pengaturan baru:

- `teacher_appeal_window_days=7`
- `schedule_change_min_notice_hours=6`
- `schedule_change_response_hours=24`
- `chat_attachment_max_mb=5`

## Endpoint utama Tahap 6B

| Endpoint | Fungsi |
|---|---|
| `GET /api/teacher/dashboard-v2` | Ringkasan prioritas tutor. |
| `GET /api/conversations` | Daftar percakapan sah murid/tutor. |
| `GET /api/bookings/{booking}/learning-session` | Chat, sesi, peserta, progres, dan perubahan jadwal. |
| `POST /api/bookings/{booking}/messages` | Kirim pesan/lampiran idempoten. |
| `GET /api/classroom-messages/{message}/attachment` | Viewer lampiran privat. |
| `PUT /api/teacher/bookings/{booking}/participant-attendance` | Simpan kehadiran seluruh peserta. |
| `POST /api/bookings/{booking}/schedule-changes` | Ajukan perubahan jadwal. |
| `POST /api/bookings/{booking}/schedule-changes/{change}/respond` | Setujui/tolak perubahan. |
| `GET /api/teacher/performance` | Nilai, poin, penalti, dan banding. |
| `POST /api/teacher/point-ledgers/{entry}/appeals` | Ajukan banding tutor. |
| `POST /api/admin/teacher-appeals/{appeal}/resolve` | Putuskan banding. |
| `GET /api/teacher/salary` | Saldo dan rincian pendapatan. |
| `POST /api/teacher/payout-requests` | Ajukan pencairan sesi tersedia. |
| `GET /api/notifications` | Pusat notifikasi dengan filter. |
| `POST /api/notifications/read-all` | Tandai semua sudah dibaca. |

## UI/UX HP

- Header menampilkan judul ringkas dan tidak menghilangkan konteks halaman.
- Navigasi bawah memakai lima kolom dan menghormati safe area perangkat.
- Chat tidak memakai tabel atau lebar minimum desktop.
- Daftar chat dan ruang chat berganti panel pada layar sempit.
- Dashboard memakai kartu prioritas dan metrik dua kolom.
- Dompet memakai kartu dua kolom tanpa tabel horizontal.
- Detail penghasilan memakai tiga kolom kecil yang tetap berada di dalam kartu.
- Dialog kelas, progres, jadwal, bukti, dan banding memiliki tinggi maksimum serta gulir vertikal.
- Halaman rekening memakai preview kartu dengan batas lebar layar dan nomor terpotong aman.
- Hero profil, permintaan, kelas, dan jadwal memakai padding serta ukuran judul khusus HP.
- Dropdown notifikasi memakai jarak kiri/kanan viewport, bukan lebar tetap.
- Target sentuh utama memiliki tinggi sekitar 44 piksel atau lebih.

## Pemeriksaan otomatis

`npm run check` lulus dan mencakup:

- ESLint;
- TypeScript `tsc --noEmit`;
- 182 kontrak route-controller API;
- pemeriksaan viewer file privat;
- kontrak Tahap 2, 3, 4, 5, 6A, dan 6B;
- pemetaan 56 rute, 167 tautan literal, dan seluruh modul lazy;
- pemeriksaan statis 225 berkas PHP;
- build produksi 1.824 modul;
- anggaran performa JavaScript awal 97,9 KB gzip dan CSS awal 19,7 KB gzip.

Pengujian backend baru tersedia pada `tests/Feature/StageSixBTeacherOperationsTest.php` untuk:

- lampiran chat, retry idempoten, dan read receipt;
- perubahan jadwal yang baru berlaku setelah persetujuan;
- pengajuan pencairan yang mengunci sesi tepat satu kali.

Tes Tahap 4 juga diperbarui agar kehadiran murid dicatat sebelum check-out.

## Batas verifikasi runtime

Binary PHP dan Composer tidak tersedia pada mesin checkpoint. `php artisan test` belum dijalankan dan tidak dicatat sebagai lulus. Mesin browser juga tidak tersedia, sehingga screenshot otomatis 360/390 piksel belum dapat dibuat. Struktur responsif, breakpoint, viewport, safe area, build, dan kontrak kode telah diperiksa, tetapi pengujian Laragon serta perangkat nyata wajib dilakukan sebelum deploy.

## Skenario uji manual

Aktifkan akun demo hanya pada lingkungan lokal dengan `SEED_DEMO_USERS=true`:

- Tutor: `budi@guru.com` / `password123`
- Murid: `murid@bimbelku.com` / `password123`
- Admin: isi `SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD` minimal 12 karakter pada `.env` lokal.

Skenario minimal:

1. buat dan bayar paket dari akun murid;
2. verifikasi pembayaran dari admin;
3. terima penawaran dari tutor dan pastikan bentrok ditolak;
4. buka chat dari tutor dan murid, kirim lampiran, lalu lihat status baca;
5. ajukan perubahan jadwal dan pastikan jadwal lama tidak berubah sebelum persetujuan;
6. lakukan PIN, check-in, catat semua kehadiran, dan check-out;
7. terbitkan laporan setiap murid yang hadir;
8. ambil foto bukti langsung dan kirim penyelesaian;
9. setujui dari murid atau jalankan pemeriksaan kasus;
10. periksa saldo bruto/komisi/bersih, ajukan pencairan, lalu selesaikan transfer admin;
11. buat penalti pengujian, ajukan banding, dan putuskan dari Pusat Kasus;
12. ulangi pada lebar 360, 390, 768, dan 1280 piksel.

## Cara menjalankan

Frontend:

```bash
npm ci
npm run check
npm run dev
```

Backend:

```bash
cd bimbelku-backend
composer install
php artisan migrate
php artisan test
php artisan serve
```

Untuk data lokal demo:

```bash
php artisan db:seed
```

## Rollback

Rollback satu batch migrasi:

```bash
php artisan migrate:rollback --step=1
```

Rollback migrasi 6B menghapus tabel operasional baru dan kolom tambahannya. Lakukan hanya pada lingkungan pengembangan setelah backup. Berkas chat, bukti banding, dan data pencairan pada storage perlu dikelola sesuai kebijakan retensi; jangan menghapus data produksi secara manual.

## Bagian yang belum dikerjakan

Tahap 6C belum dimulai. Penyusunan ulang dashboard/menu admin, kontrol pencarian tutor, perluasan radius, penetapan tutor manual, pemisahan monitoring pembayaran/pencairan, refund/saldo BimbelKu, pemisahan hak admin, audit perubahan lengkap, dan pengujian lintas peran akhir tetap menjadi ruang lingkup checkpoint berikutnya.
