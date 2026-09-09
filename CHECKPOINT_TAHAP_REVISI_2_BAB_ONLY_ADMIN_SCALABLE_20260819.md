# CHECKPOINT TAHAP REVISI 2 — BAB-ONLY + ADMIN MONITORING SCALABLE

Tanggal: 19 Agustus 2026  
Baseline: Tahap Revisi 1 User Testing UX + Mobile  
Scope: penyederhanaan struktur akademik dan skalabilitas Monitoring Kelas Admin.

## Tujuan

1. Menghilangkan Subbab dari seluruh flow aktif pengguna agar murid/tutor cukup memahami **Mapel → Bab → Progress**.
2. Menjaga histori paket lama tanpa migration destruktif.
3. Mengubah Monitoring Kelas Admin agar tidak mengambil seluruh data sekaligus dan tetap nyaman pada mobile 320–430 px.
4. Menjaga seluruh keputusan Tahap 1, payment, Saldo BimbelKu, renewal 12/24 jam, Paket Belajar, dan Kelas Kelompok.

## A. Bab-only

### Flow pengguna baru

- Package Builder hanya meminta Bab.
- Request pembuatan paket baru tidak lagi mengirim `learning_topic_ids`.
- Katalog Package Builder memakai `chapters_only=1`, sehingga query daftar materi legacy tidak dijalankan untuk flow baru.
- Target/Hasil Belajar dan Progress ditampilkan per Bab.
- Tutor mengirim `chapter_updates` saat mencatat hasil belajar.
- Persentase progress Paket Belajar dihitung dari **jumlah Bab selesai / total Bab**.
- Riwayat Sesi mengelompokkan log lama menjadi perubahan per Bab.
- Renewal membaca status Bab lama. Bila semua Bab selesai, Bab paket baru tidak dipilih otomatis; murid memilih Bab lanjutan atau Bab lama sebagai penguatan.

### Compatibility data lama

Database Subbab/topik **tidak dihapus** pada tahap ini.

- `package_learning_topics` tetap menjadi storage compatibility.
- Paket baru membuat satu baris compatibility per Bab dengan `learning_topic_id = null`.
- Paket lama yang memiliki beberapa topik di satu Bab diagregasi oleh `PackageChapterProgress` menjadi satu status Bab.
- Payload legacy `learning_topics` / `topic_updates` masih diterima/dikirim pada backend untuk client/history lama, tetapi UI baru tidak menggunakannya.
- Tidak ada DROP table/column pada tahap ini.

## B. Admin Monitoring scalable

`/admin/classes` sekarang:

- default ke scope `attention` / **Perlu Tindakan**;
- hanya menerima scope `attention`, `active`, `upcoming`, `history`;
- server-side pagination, default 20 dan maksimum 50 per request;
- server-side search berdasarkan tutor, mapel, atau Bab;
- server-side filter jenis kelas, status, dan tanggal;
- filter tanggal memakai range `start_at` agar index dapat digunakan, bukan `DATE(start_at)`;
- list hanya eager-load data ringan dan `withCount` peserta;
- data peserta/report/dispute lengkap baru dimuat pada endpoint Detail;
- mobile memakai card list (`md:hidden`), bukan tabel desktop yang dipaksa mengecil;
- search debounce 400 ms;
- tab `Aktif` tidak memasukkan seluruh kelas confirmed masa depan; kelas confirmed masa depan masuk `Akan Datang`.

Migration baru:

`2026_08_19_190000_add_admin_monitoring_booking_index.php`

menambahkan index:

`bookings(class_type, status, start_at)`

Index `bookings(status, start_at)` yang sudah ada tidak dibuat ulang.

## Mobile requirement

Tahap 2 mempertahankan target utama 320–430 px:

- Package Builder Bab-only memakai grid responsif.
- Progress murid/tutor memakai card Bab responsif.
- Monitoring Admin pada mobile menggunakan cards, controls full-width, dan pagination ringkas.
- Tidak ada kebutuhan horizontal-scroll pada list monitoring mobile.
- Touch target aksi utama dipertahankan sekitar 44 px atau lebih.

## Regression guard yang ikut diperbarui

Checker lama yang memang mengunci desain Bab→Subbab diperbarui karena kontrak produknya resmi berubah menjadi Bab-only. Checker compatibility lain tetap dipertahankan.

Checker baru:

`npm run check:user-testing-stage2`

Hasil source-level di checkpoint:

- `check:user-testing-stage1`: 15/15 PASS
- `check:user-testing-stage2`: 23/23 PASS
- `check:stage4-progress`: PASS
- `check:stage5-session-progress`: PASS
- `check:session-final`: 19/19 PASS
- `check:session-draft-guidance`: 5/5 PASS
- `check:session-target-guidance`: 7/7 PASS
- `check:cheap-class-session-verification`: 20/20 PASS
- `check:cheap-class-popup`: 11/11 PASS
- `check:demo-cheap-class`: 21/21 PASS
- `check:package-renewal`: 29/29 PASS
- `check:stage2-wallet`: 38/38 PASS
- seluruh source checker `check-*.mjs`: **65/66 PASS**; satu yang tidak dapat dijalankan adalah performance budget karena membutuhkan hasil `npm run build`.
- TypeScript syntax transpile untuk seluruh file TS/TSX Tahap 2: PASS.
- PHP syntax seluruh source backend: **304/304 PASS**.

## Yang belum dapat diklaim PASS di container

Checkpoint tidak membawa `node_modules` dan `bimbelku-backend/vendor`.

Karena itu:

- `npm run typecheck` penuh tidak dapat dinilai di container; global `tsc` berhenti karena dependency React/lucide/router tidak tersedia.
- `npm run build` tidak dapat dijalankan.
- PHPUnit/Laravel runtime tidak dapat dijalankan.

Semua harus dijalankan ulang di Laragon pengguna setelah overlay dan `php artisan migrate`.

## Regression test source yang diperbarui

- `StageFivePackageExperienceTest`: pembuatan paket baru Bab-only tanpa `learning_topic_ids`, plus assertion compatibility row per Bab.
- `StageOneSessionActionReminderTest`: progress sesi memakai `chapter_updates`.
- `StageSixCAdminOperationsTest`: test baru attention-first, pagination 20/page, page 2, dan server search Monitoring Kelas.

## Tidak diubah

- Paket Belajar baru: lead time 24 jam.
- Renewal tanpa tutor lama: 24 jam.
- Renewal tutor lama yang sama: 12 jam.
- Lifecycle private PIN → attendance → target → checkout → hasil belajar → kamera → approval murid.
- Kelas Kelompok tetap report tutor → verifikasi admin, tanpa PIN/foto/approval murid.
- Saldo BimbelKu dan refund tender-preserving.
- `BookingRequest` legacy tetap dipertahankan.
- Nama internal `cheap_class` tetap internal; UI tetap “Kelas Kelompok”.

## Tahap berikutnya

Tahap Revisi 3:

- visual polish landing (navbar, hero tutor custom, card mapel, Cara Kerja, trust, CTA, animasi);
- audit mobile visual seluruh role;
- dead-code / zero-reference cleanup yang aman;
- final regression Murid + Tutor + Admin + Payment + Progress + Renewal + Demo.
