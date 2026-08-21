# Checkpoint Tahap 5.8.4 — Kelas Murah Pre-Payment Demo

## Tujuan

Menambahkan fixture presentasi lokal agar Kelas Murah dapat ditunjukkan **mulai sebelum pembayaran**, tanpa menunggu jam pembukaan pendaftaran pada form admin.

## Stage baru

- `php artisan demo:cheap-class pre-payment`
- `php artisan demo:cheap-class payment-submitted`
- `php artisan demo:cheap-class payment-paid`
- `php artisan demo:cheap-class session-live`

Stage lama tetap dipertahankan:

- `setup`
- `session-ended`
- `status`
- `reset`

## Flow fixture pre-payment

1. Kelas dibuat `open`, registration window sudah aktif sekarang.
2. Murid utama belum join dan belum punya order.
3. Murid kedua seeded `confirmed + paid`.
4. Tutor demo mendapat teacher subject + availability yang valid sehingga `join()` production tetap lolos.
5. Murid utama klik Join lewat UI -> `CheapClassService::join()` production membuat `seat_held + pending order`.
6. `payment-submitted` memakai `CheapClassService::submitPayment()` dan proof fixture lokal.
7. Admin dapat approve dari UI; `payment-paid` tersedia sebagai fallback dan memakai `CheapClassService::verifyPayment()`.
8. Karena kuota 2/2, kelas dapat confirmed segera setelah pembayaran utama valid.
9. `session-live` hanya menggeser waktu fixture confirmed ke sesi yang sedang berjalan.
10. `session-ended` memakai lifecycle lama untuk masuk `report_required`.

## Guard

- Command tetap hanya `local/testing`.
- Tidak ada migration.
- Tidak ada perubahan frontend.
- Tidak ada perubahan business rule production.
- Setup lama yang langsung confirmed tetap tersedia untuk regression/manual test lama.

## Validasi container

- `php -l DemoCheapClass.php`: PASS
- `php -l DemoCheapClassCommandTest.php`: PASS
- `node scripts/check-demo-cheap-class.mjs`: 21/21 PASS
- Runtime PHPUnit tidak dijalankan di container checkpoint karena `vendor/` tidak disertakan.
