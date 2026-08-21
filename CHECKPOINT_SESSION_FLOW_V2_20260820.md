# CHECKPOINT — Session Flow V2 BimbelKu
Tanggal: 20 Agustus 2026

## Tujuan
Menyederhanakan sesi Paket Belajar agar ramah anak SD/SMP tanpa melemahkan kontrol sistem.

Flow baru untuk sesi privat baru:

Tutor `Saya Siap Mengajar` → Murid `Saya Sudah Hadir` → Belajar → Tutor `Akhiri Sesi` → `Hasil Belajar` → Murid `Sesi Sesuai` / `Ada masalah`.

## Yang berubah
- Sesi privat baru memakai `presence_confirmation_v2`.
- PIN tidak muncul pada Session Flow V2.
- Target Belajar panjang dan approval target tidak menjadi gate pada V2.
- Tutor boleh menulis `Fokus hari ini` singkat dan opsional.
- Konfirmasi hadir murid otomatis membuat kehadiran tutor + murid dan mencatat waktu mulai resmi.
- Untuk sesi offline, lokasi tutor tetap diverifikasi saat `Saya Siap Mengajar`; koordinat disimpan internal, bukan diisi manual oleh user.
- Tutor tetap wajib melakukan check-out dan menyimpan Hasil Belajar.
- V2 tidak memakai foto bukti penyelesaian rutin.
- Progress Bab dari laporan Tutor bersifat provisional sampai Murid memilih `Sesi Sesuai` atau Admin menyatakan sesi valid.
- `Ada masalah` menahan payout dan membawa kasus ke Admin.
- Admin melihat audit trail: waktu Tutor siap, Murid hadir, sesi berakhir, durasi aktual, fokus, dan ringkasan hasil belajar.
- Jika Murid tidak memberi keputusan sampai batas review, sesi masuk `admin_review_required`, bukan otomatis disetujui.

## Compatibility
- Database PIN, LearningPlan lama, completion evidence lama, migration lama, dan histori tidak dihapus.
- Default kolom migration adalah `legacy_pin_v1`, sehingga data lama tidak tiba-tiba berubah flow.
- Session lama tetap dapat memakai PIN + Target Belajar + evidence lama.
- Session privat baru dari aktivasi paket/matching menggunakan V2.
- Kelas Kelompok tidak diubah.

## Pengamanan penting
- Tutor tidak dapat menandai siap setelah status sesi berubah menjadi no-show/admin review/dll.
- Murid tidak dapat mengonfirmasi hadir setelah status sesi berubah.
- Setelah kehadiran V2 terkonfirmasi, Tutor tidak dapat melaporkan Murid tidak hadir dan Murid tidak dapat memakai laporan Tutor tidak hadir untuk sesi yang sudah resmi dimulai; masalah setelah mulai memakai `Ada masalah`.
- Request dikunci dengan row lock/state guard dan UI menahan double-submit.
- Payout tetap `locked` sampai penyelesaian sesi sah.

## Progress Bab
Pada V2, laporan Tutor membuat log `before → after`, tetapi `PackageLearningTopic` belum diubah saat laporan disimpan. Perubahan Bab baru dikomit ketika:
1. Murid menekan `Sesi Sesuai`; atau
2. Admin menyatakan sesi valid.

Jika Murid melapor masalah/refund, progress tidak ikut dianggap final.

## Penyelesaian masalah Admin
Versi ini menggunakan keputusan finansial yang sudah terbukti di mesin BimbelKu:
- `Sesi valid · hak tutor diproses`
- `Refund penuh murid`

Reschedule otomatis dan partial refund tidak ditambahkan diam-diam pada migrasi ini karena mesin Refund lama masih berorientasi full-order refund. Menambah opsi tersebut dengan aman membutuhkan refactor ledger/refund tersendiri dan regression finansial khusus. Ini sengaja dibatasi agar Session Flow V2 tidak merusak payment/history yang sudah stabil.

## Regression yang ikut diperbaiki
`DemoCheapClassCommandTest` pre-payment join sekarang mengirim `Idempotency-Key`, sesuai middleware production.

`DemoPackageRenewalCommandTest` disinkronkan ke Bab-only dan final session Paket 2 sekarang mengharapkan Session Flow V2.

## Validasi artifact environment
- PHP syntax: 306/306 file PASS.
- TS/TSX transpile syntax: 135/135 file PASS.
- `check-session-presence-v2.mjs`: 23/23 PASS.
- Tahap 2 Bab-only + monitoring checker: PASS.
- Tahap 3 visual checker: PASS.
- Package Renewal checker: PASS.
- Demo Kelas Kelompok checker: PASS.
- Session Workflow Final checker: 19/19 PASS.
- Session Draft & Guidance checker: 5/5 PASS.
- Session Target Guidance legacy compatibility checker: 7/7 PASS.
- Kelas Kelompok Session Verification checker: 20/20 PASS.

PHPUnit penuh tidak dijalankan pada artifact environment karena folder `vendor` tidak tersedia. Jalankan regression final di project lokal setelah `php artisan migrate`.
