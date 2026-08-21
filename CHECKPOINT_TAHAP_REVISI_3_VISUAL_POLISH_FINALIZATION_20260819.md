# CHECKPOINT TAHAP REVISI 3 — VISUAL POLISH + FINALIZATION
Tanggal: 19 Agustus 2026

## Baseline
Tahap 3 dikerjakan dari:
1. FULL Tahap Revisi 1.
2. Seluruh overlay file perubahan Tahap Revisi 2.

Tahap 3 tidak mengubah business model utama Paket Belajar, Kelas Kelompok, payment, matching, progress Bab, session workflow, renewal, atau Admin Monitoring scalable.

## Perubahan utama

### 1. Navbar landing — polish, bukan redesign fungsi
- Branding visual diganti menjadi BimbelKu dan tidak lagi memakai logo bertuliskan “Bimbel Cerdas”.
- Sticky navbar, blur, active state, hover, dan transition saat scroll diperhalus.
- CTA Daftar Gratis tetap tersedia.
- User yang sudah login tetap mendapat identitas, Dashboard, dan Logout.
- Mobile tetap memakai menu responsif dengan `aria-expanded` dan touch target yang aman.
- Top bar Murid/Tutor/Admin tidak dibongkar karena hasil audit menunjukkan strukturnya sudah layak dipertahankan.

### 2. Hero — matching tutor lebih mudah dipahami
- Tidak memakai stock photo orang.
- Visual pusat menjadi ilustrasi tutor custom ringan berbasis komponen/vector UI.
- Badge utama: Mapel, Online, Jadwal cocok, Tutor ditemukan.
- Copy runtime disinkronkan menjadi durasi 1 atau 2 jam.
- Progress disebut berbasis Bab.
- Animasi memakai `motion-safe` dan global reduced-motion tetap aktif.

### 3. Mata Pelajaran
- Emoji campuran diganti satu icon family (`lucide-react`).
- Setiap mapel mendapat aksen dan subtitle berbeda.
- Copy menjadi Mapel → Jenjang → Bab → Tujuan → Jadwal.
- Layout tetap 2 kolom pada mobile dan 4 kolom desktop.

### 4. Cara Kerja
Urutan dipertegas menjadi:
1. Tentukan kebutuhan.
2. Periksa & bayar.
3. Tutor dicocokkan.
4. Mulai belajar.

Pada mobile card tersusun vertikal; desktop tetap horizontal dengan connector visual.

### 5. Trust section
Menggunakan benefit yang benar-benar ada di sistem:
- Tutor terverifikasi.
- Pembayaran tercatat.
- Progress terdokumentasi.
- Jadwal sesuai kebutuhan.

Tidak ada statistik/testimoni palsu.

### 6. CTA akhir
- Satu CTA utama: `Cari Bimbingan`.
- Link Daftar Gratis tetap tersedia secara subtle dan tetap memakai `RegistrationGuardLink` agar user yang sudah login tidak diarahkan salah.

### 7. Application-wide consistency
- “Bimbel Cerdas” pada active frontend diganti menjadi “BimbelKu”.
- Quick Guide Paket Belajar disinkronkan menjadi 1 atau 2 jam.
- Profil Tutor tidak lagi meminta input Latitude/Longitude manual.
- Tutor cukup memakai `Atur lokasi`; koordinat tetap disimpan internal untuk matching offline.
- Tidak ada “Kelas Murah” pada active frontend.
- Tidak ada “Subbab” pada active frontend flow baru.

### 8. Safe dead-code / legacy cleanup
Dihapus hanya setelah zero-reference terbukti:
- `public/bimbel_cerdas.png` — asset branding lama dan sudah tidak direferensikan.

Tetap dipertahankan:
- `BookingRequest` legacy.
- `LearningTopic` / `PackageLearningTopic` dan compatibility Subbab lama.
- migration lama.
- payment/history compatibility.
- demo command dan regression checker yang masih berguna.

## Regression yang dijalankan
PASS:
- Tahap Revisi 1: 15/15.
- Tahap Revisi 2: 23/23.
- Progress redesign.
- Session-progress guidance.
- Session Workflow Final: 19/19.
- Session Draft & Guidance: 5/5.
- Package Renewal: 29/29.
- Route mapping: 70 routes.
- Landing subject sync.
- Landing registration guard.
- Performance whole-site source-level.
- Tahap Revisi 3 visual finalization.
- 136 file TS/TSX lolos syntax transpilation sweep.
- 286 file PHP lolos `php -l`.

## Catatan build environment
Arsip sumber tidak menyertakan `node_modules` dan `vendor`. Registry npm tidak dapat diakses dari environment eksekusi ini, sehingga `npm ci`, `npm run typecheck`, dan production `npm run build` tidak dapat dijalankan penuh di sini.

Di local project yang memiliki dependency, jalankan:

```bash
npm ci
npm run typecheck
npm run build
npm run check:user-testing-stage3
```

Lalu jalankan test Laravel sesuai environment lokal setelah `vendor` tersedia.

## Status
Tahap 3 source-level implementation: SELESAI.
Final release candidate dinyatakan setelah production build + manual browser regression pada environment lokal lolos.
