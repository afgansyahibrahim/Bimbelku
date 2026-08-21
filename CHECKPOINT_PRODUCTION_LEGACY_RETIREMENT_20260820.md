# CHECKPOINT — Production Legacy Retirement BimbelKu
Tanggal: 20 Agustus 2026

## Tujuan
Membersihkan runtime yang sudah resmi dipensiunkan sebelum hosting tanpa mengurangi produk final BimbelKu.

## Sistem final yang dipertahankan
- Paket Belajar private.
- Matching Tutor internal tetap memakai `BookingRequest` sebagai anchor internal.
- Materi: Mapel -> Bab -> Progress.
- Session Flow V2: Tutor siap -> Murid hadir -> belajar -> Hasil Belajar -> keputusan Murid/Admin.
- Kelas Kelompok memakai mesin `CheapClass`.
- Payment, wallet, refund, renewal, history, notification, dan Admin Monitoring tetap aktif.

## Runtime legacy yang dipensiunkan
1. Subbab/LearningTopic runtime.
2. PackageLearningTopic dan PackageSessionTopicLog sebagai storage progress.
3. Group Class V1 (`GroupPool`, `GroupMember`, `GroupClassService`).
4. Session Flow V1 (PIN, LearningPlan/approval target lama, completion evidence kamera legacy).
5. BookingRequest user-facing legacy dan attachment request lama.
6. Route Admin `/admin/learning-topics`; diganti `/admin/chapters`.

## Struktur pengganti
- `PackageChapter`
- `PackageSessionChapterLog`
- `/admin/chapters`
- migration `2026_08_20_120000_retire_preproduction_legacy_runtime.php`

Migration melakukan urutan aman:
1. membuat tabel Bab-native;
2. backfill progress Bab dari tabel compatibility lama;
3. backfill log sesi;
4. baru menghapus tabel/kolom legacy;
5. membersihkan konfigurasi Group V1 dan PIN V1.

## Hal yang sengaja TIDAK dihapus
- `BookingRequest` model dan matching internal.
- `TeacherOffer` dan matching services Paket Belajar.
- CheapClass/Kelas Kelompok.
- migration historis lama.
- CameraCapture yang masih dipakai verifikasi profil Tutor (bukan completion evidence sesi).
- Payment/history/refund/wallet/renewal.

## Validasi di environment artifact
- PHP syntax: PASS.
- TypeScript `tsc --noEmit`: PASS.
- API contract: 196 action API valid.
- Page routes: 69 routes / 194 literal links mapped.
- Production Legacy Retirement: 25/25 PASS.
- Session Presence V2: 6/6 PASS.
- Bab-only + Admin Monitoring: 23/23 PASS.
- Package Renewal: 29/29 PASS.
- Demo Kelas Kelompok: 21/21 PASS.
- Stage 6B active teacher operations: PASS.

## Batas validasi
`vendor` dan `node_modules` tidak tersedia di environment artifact, sehingga PHPUnit penuh dan production Vite build harus dijalankan di komputer lokal setelah patch dipasang.
