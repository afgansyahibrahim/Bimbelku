# CHECKPOINT TAHAP REVISI 3 — USER FEEDBACK FIX
Tanggal: 19 Agustus 2026

Baseline: BimbelKu PROJECT FULL FINAL TAHAP REVISI 3.

## Revisi yang diterapkan

1. Landing page dikembalikan ke komposisi yang lebih tenang.
   - TrustStrip 4 poin di bawah Hero dihapus.
   - Urutan section kembali mengikuti struktur lama: Hero → Cara Kerja → Kenapa BimbelKu → Mata Pelajaran → preview produk → CTA.
   - Hero kembali memakai visual matching/radar yang ringan tanpa stock photo.
   - Copy tetap sinkron dengan runtime: Bab-only dan durasi 1 atau 2 jam.
   - Cara Kerja disederhanakan menjadi 3 langkah.

2. Kelas Kelompok murid, termasuk paket 1 sesi.
   - Jadwal sesi selalu tampil, termasuk saat hanya 1 sesi.
   - Informasi pembayaran dibuat menjadi panel yang menyatu dengan card.
   - Status bukti pembayaran tidak lagi tampil sebagai strip kuning yang menyerupai tombol.
   - Status review menjadi panel informatif “Pembayaran sedang diperiksa”.

3. Profile Quick Menu mobile.
   - Blur backdrop mobile dihapus.
   - Mobile tetap memakai sheet dari bawah dengan background solid dan dim ringan.
   - Desktop popup tetap dipertahankan.

4. Pemilihan jam Paket Belajar.
   - Desktop: popover ringan yang terikat ke field Jam Belajar.
   - Mobile: bottom sheet solid dengan dim ringan.
   - Backdrop gelap + blur seperti alert/notifikasi dihapus.

5. Monitoring Admin mobile.
   - Native select Android pada filter Jenis dan Status diganti dengan custom Select Radix yang collision-aware.
   - Dropdown dibatasi viewport dan tidak boleh keluar layar.
   - Audit source memastikan tidak ada native `<select>` lain yang tersisa di frontend.

## Compatibility
Tidak ada business flow yang dihapus. BookingRequest legacy, LearningTopic, PackageLearningTopic, migration lama, payment/history compatibility, dan command demo tetap dipertahankan.

## Validasi source
- Tahap 1 cutover/mobile checker: PASS.
- Tahap 2 Bab-only + Admin Monitoring: 23/23 PASS.
- Kelas Kelompok UI/backend sync: PASS.
- Package Renewal: 29/29 PASS.
- Tahap 3 user-feedback checker: PASS.
- TS/TSX syntax sweep: 135 files PASS.
- PHP syntax sweep: 304 files PASS.

Production build tetap perlu dijalankan di environment user yang sudah memiliki node_modules dan vendor.
