# CHECKPOINT — Whole-site UI & Mobile Hardening
Tanggal: 20 Agustus 2026

## Latar belakang
Audit ini dibuat setelah demo Session Flow V2 menemukan pola masalah responsif pada beberapa area sekaligus: judul kartu keluar viewport, layout terlihat miring/tidak sejajar di layar sempit, toggle Promo menimpa label, serta risiko popup/modal/dropdown berada di layer atau ukuran yang tidak aman pada Android kecil.

## Prinsip perbaikan
Perbaikan dilakukan di akar/shared component lebih dulu, lalu pada halaman berisiko tinggi. Tidak ada perubahan business rule, database, payment, matching, Session Flow V2, Kelas Kelompok, maupun Production Legacy Retirement.

## Perbaikan shared
- Button: tidak lagi memaksa `whitespace-nowrap` pada mobile; teks panjang boleh wrap dan tombol memiliki `min-w-0/max-w-full`.
- Dialog: ukuran mengikuti viewport mobile (`dvh`), `overflow-x-hidden`, judul/deskripsi wrap-safe.
- AlertDialog: hardening yang sama dengan Dialog.
- Select: chevron tidak menyempitkan label; overlay tetap di atas dialog/editor.
- Global mobile guard: article/form/dialog tidak boleh memaksa viewport melebar; dynamic text memakai overflow-wrap; input 16px pada mobile; toast dibatasi viewport.

## Halaman/fitur yang di-hardening
- Murid — Kelas Saya
- Murid — Paket Saya
- Murid — Kelas Kelompok
- Tutor — Kelas Saya / Manage Classes
- Tutor — Tawaran / Booking Guru
- Ruang Belajar Session Flow V2
- Admin — Monitoring Kelas
- Admin — Detail Kelas
- Admin — Manajemen User
- Admin — Editor Promo/Voucher
- Popup pembayaran/pembatalan
- Detail notifikasi Tutor
- ResponsiveMultiSelect

## Temuan khusus dari screenshot
1. Judul kelas panjang keluar viewport: diperbaiki dengan min-width guard + break/wrap pada card Murid dan Tutor.
2. Toggle Promo menimpa tulisan: kontrol status dibuat full-width pada mobile dan switch dibuat `shrink-0`.
3. Ruang Belajar terlalu rapat pada mobile: dialog dipadatkan, tab 3 kolom dibuat lebih compact untuk <360 px.
4. Modal/popup custom: di mobile diarahkan menjadi bottom-sheet/viewport-safe dan tidak memakai blur berat sebagai default.

## Static regression
- Whole-site UI Mobile Safety: 26/26 PASS
- Stage 5.3 Progress/Landing Mobile: PASS
- Admin Promotion Editor: 10/10 PASS
- Rate Limiter Isolation: 39/39 PASS
- Production Legacy Retirement: 25/25 PASS
- Session Presence V2: 6/6 PASS
- Bab-only + Admin Monitoring: 23/23 PASS
- Package Renewal: 29/29 PASS
- Demo Kelas Kelompok: 21/21 PASS
- API contract: 196 actions PASS
- Page routes: 69 routes / 194 literal links PASS
- PHP static: 299 files PASS

## Catatan environment
Sandbox tidak memiliki `node_modules` dan backend `vendor`, sehingga `npx tsc --noEmit`, `npm run build`, dan PHPUnit penuh harus dijalankan di Laragon lokal setelah patch dioverwrite.

## Migration
Tidak ada migration baru pada patch ini.
