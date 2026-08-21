# Production Legacy Retirement FIX2 — 20 Agustus 2026

## Masalah
Sisa 1 failure pada `StageFiveWorkflowTest` masih membuat `BookingRequest` langsung tanpa `package_subject_id`, sehingga endpoint accept yang memang memensiunkan flow langsung lama mengembalikan HTTP 410.

## Perbaikan
- Tidak mengubah code production dan tidak menghidupkan kembali flow BookingRequest V1.
- Fixture test diubah menjadi Paket Belajar modern: LearningPackage + PackageSubject + PackageSession + BookingRequest internal + Order paid.
- Assertion disesuaikan dengan kontrak final: tutor menerima paket yang sudah dibayar, package aktif, Booking confirmed dengan `presence_confirmation_v2`, tanpa keputusan murid kedua.

## Validasi lokal di sandbox
- `php -l tests/Feature/StageFiveWorkflowTest.php`: PASS.
- PHPUnit penuh harus dijalankan pada environment lokal yang memiliki `vendor`.
