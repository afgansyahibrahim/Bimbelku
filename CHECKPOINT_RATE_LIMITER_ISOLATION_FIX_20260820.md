# CHECKPOINT — Rate Limiter Isolation Fix
Tanggal: 20 Agustus 2026

## Masalah
Banyak route memakai numeric throttle generik seperti `throttle:5,1`, `throttle:10,1`, dan `throttle:60,1`. Counter generik dapat berbagi signature user/IP, sehingga request yang tidak berhubungan dapat saling menghabiskan kuota. Contoh paling terlihat: polling `/session-action/next` dapat ikut memengaruhi aksi pertama kali seperti perubahan rekening Tutor.

## Perbaikan
- Seluruh numeric/generic throttle di `routes/api.php` dipindahkan ke named limiter per aksi.
- `session-action-poll` dipisahkan dari semua aksi mutasi.
- `teacher-bank-change` dipisahkan dari payout, offer, session action, dan polling.
- Auth register/login/forgot/reset masing-masing memakai bucket terpisah.
- Aksi Student, Tutor, Admin, support, schedule, dan Kelas Kelompok memakai namespace masing-masing.
- Resource-specific action dapat menyertakan route key (booking, package, class, offer, dll.) agar request pada resource berbeda tidak saling mengganggu tanpa alasan.
- Idempotency dan financial audit yang sudah ada tetap dipertahankan.
- Error 429 dari named limiter sekarang menyertakan `error_code` dan `retry_after_seconds`.

## Regression guard
- `tests/Feature/RateLimiterIsolationTest.php`
- `scripts/check-rate-limiter-isolation.mjs`
- Checker lama yang mengunci numeric throttle disinkronkan ke named limiter.

## Validasi environment patch
- PHP syntax: PASS (183 file yang dipindai)
- Numeric throttle di routes/api.php: 0
- Rate Limiter Isolation: 39/39 PASS
- Payment error checker: PASS
- Banner/Kelas Kelompok checker: PASS
- Tahap 2 checker: PASS
- Production Legacy Retirement: 25/25 PASS
- Session Presence V2: 6/6 PASS
- Bab-only + Admin Monitoring: 23/23 PASS
- Package Renewal: 29/29 PASS
- Demo Kelas Kelompok: 21/21 PASS

Catatan: `vendor` dan `node_modules` tidak tersedia pada environment patch, sehingga `php artisan test` penuh dan build lokal tetap harus dijalankan pada Laragon pengguna.
