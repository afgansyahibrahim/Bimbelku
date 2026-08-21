# TUTORIAL UJI TAHAP REVISI 3 — FINAL

## 1. Install & static check
```bash
npm ci
npm run typecheck
npm run build
npm run check:user-testing-stage1
npm run check:user-testing-stage2
npm run check:user-testing-stage3
npm run check:stage4-progress
npm run check:stage5-session-progress
npm run check:session-final
npm run check:session-draft-guidance
npm run check:package-renewal
```

## 2. Landing desktop
Buka `/` pada lebar desktop.
Cek:
- Navbar memakai branding BimbelKu.
- Navbar tetap sticky dan berubah halus saat scroll.
- Hero menjelaskan matching tutor dan tidak memakai stock photo.
- Durasi yang tertulis 1 atau 2 jam.
- Card mapel punya icon family konsisten.
- Cara Kerja urut dan mudah dibaca.
- Trust section berisi benefit nyata.
- Preview Paket/Progress lama tetap ada.
- CTA akhir hanya punya satu tombol utama `Cari Bimbingan`.

## 3. Landing mobile
Uji minimal 320, 360, 375, 390, 412, dan 430 px.
Cek:
- Tidak ada horizontal overflow.
- Hamburger dapat dibuka/ditutup.
- Card Mapel tetap 2 kolom jika cukup ruang dan tidak terpotong.
- Hero badge tidak keluar layar.
- Cara Kerja menjadi vertical flow yang mudah dibaca.
- CTA dan Footer tidak memotong konten.

## 4. Murid
Regression utama:
- Register → Profile.
- Cari Bimbingan / Package Builder.
- Mapel → Bab tanpa Subbab.
- Payment.
- Kelas Saya.
- Target/approval/session.
- Progress Bab.
- Riwayat.
- Renewal.
- Kelas Kelompok.

Pastikan top bar/profile quick menu tetap seperti Tahap 1.

## 5. Tutor
Regression utama:
- Profile.
- Pada lokasi tidak ada input Latitude/Longitude manual.
- `Atur lokasi` mengambil lokasi perangkat.
- Permintaan tutor.
- Sesi → Absensi → Target → Mengajar → Hasil Belajar/Progress.
- Kelas Kelompok.
- Renewal.

## 6. Admin
Regression utama:
- Monitoring default Perlu Tindakan.
- Search/filter/pagination server-side.
- Detail baru load saat dibuka.
- Payment/verifikasi/refund.
- Kelas Kelompok.
- Riwayat.

Pastikan tidak ada perubahan yang mengembalikan fitur `Tampilkan Semua`.

## 7. Naming sweep
Di UI aktif jangan ada:
- `Bimbel Cerdas`.
- `Kelas Murah`.
- `Subbab` untuk flow baru.
- input `Latitude` / `Longitude`.
- input link Google Maps manual.

## 8. Final browser check
- Tidak ada console error penting.
- Keyboard focus terlihat.
- Reduced-motion tidak memaksa animasi looping.
- Empty/loading/error state tetap dapat dipakai.
- Tidak ada fitur lama yang hilang dari Murid/Tutor/Admin.
