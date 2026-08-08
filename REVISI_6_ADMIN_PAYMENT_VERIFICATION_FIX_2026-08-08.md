# Revisi 6 — Admin Payment Verification Fix

## Root cause
Tombol akhir **Tolak bukti** membuka `ConfirmDialog`, tetapi modal penolakan pembayaran berada di `z-[70]` sedangkan Radix AlertDialog global berada di `z-50`. Akibatnya dialog konfirmasi sebenarnya terbuka **di belakang backdrop**, sehingga dari sisi admin terlihat seperti tombol tidak bekerja / halaman macet. Tombol **Terima pembayaran** dari modal preview bukti (`z-[60]`) memiliki risiko yang sama.

## Perubahan
- Global `AlertDialog` dinaikkan ke `z-[600]` agar konfirmasi selalu berada di atas modal aplikasi.
- Payment Verification melakukan refresh otomatis bila server memberi 409/422 karena data admin sudah stale.
- Backend memberi pesan spesifik bila order sudah dibatalkan, ditolak, diterima, refund, expired, atau belum submit bukti.
- Riwayat pembayaran dapat difilter `Dibatalkan`.
- Penolakan pembayaran paket menyimpan `verified_at` dan `verified_by` agar jejak admin konsisten.

## Tidak diubah
- Murid tetap tidak dapat membatalkan tagihan ketika bukti sedang diperiksa (`submitted`).
- Admin tetap hanya bisa menerima/menolak bukti yang benar-benar berstatus `submitted`.
- Bukti lama pada transaksi yang kemudian dibatalkan tetap disimpan sebagai jejak audit.
