# Revisi 5 — Payment Error & Rate Limit Fix

Perubahan utama:

1. Bucket rate limit dipisahkan untuk `student-package-quote`, `student-package-create`, dan `student-payment-submit`. Quote tidak lagi menghabiskan jatah submit pembayaran.
2. Response 429 sekarang memakai pesan Indonesia, `error_code`, dan `retry_after_seconds`.
3. Pembayaran memeriksa ulang benturan jadwal sebelum bukti diterima, termasuk race check di transaction.
4. Error pembayaran sekarang membedakan: rate limit, jadwal bentrok, tagihan kedaluwarsa, kelas/paket tidak aktif, metode pembayaran belum tersedia, validation error, dan network error.
5. PaymentPage menampilkan notifikasi toast sekaligus alert persisten agar alasan kegagalan tidak hilang terlalu cepat.
6. Error jadwal saat membuat paket sekarang mencantumkan tanggal/jam yang bertabrakan.
7. Memperbaiki bug parameter `notify` pada `checkStatus` yang menimpa object notifier.

Tidak menghapus throttle, idempotency, validasi pembayaran, atau pemeriksaan otorisasi.
