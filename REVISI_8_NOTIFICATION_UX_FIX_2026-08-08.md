# Revisi 8 — Notification UX & indikator Saya

Perubahan:

- Murid sekarang memiliki route khusus `/student/notifications`.
- Menu `Saya > Notifikasi` tidak lagi mengarah ke Dashboard.
- `Dashboard > Notifikasi Terbaru > Semua` sekarang menuju Pusat Notifikasi.
- Klik notifikasi membuka detail terlebih dahulu, tidak langsung memindahkan halaman.
- Jika notifikasi memiliki tindakan lanjutan, modal menampilkan tombol dengan tujuan yang jelas, misalnya `Buka Pembayaran & Riwayat`, `Buka Kelas Saya`, atau `Buka Pusat Bantuan`.
- Notifikasi umum tanpa target dijelaskan sebagai informasi saja dan tidak memaksa navigasi.
- Titik merah pada menu `Saya` sekarang dijabarkan lagi di dalam halaman Saya menggunakan badge merah `Baru` pada submenu yang benar-benar perlu dilihat.
- Profil dipisahkan dari group halaman induk Saya agar membuka `/student/account` tidak otomatis menandai notifikasi profil sebagai sudah dibaca.
- Status indikator disinkronkan segera setelah notifikasi dibaca.
- Mobile bottom nav mengenali `/student/notifications` sebagai bagian menu Saya.

Validasi source-level:

```text
npm run check:notification-ux
npm run typecheck
npm run check:navigation-attention
npm run check:pages
npm run check:contracts
```

Untuk produksi/preview tetap lakukan build baru:

```text
npm run build
npm run preview -- --port 8080
```
