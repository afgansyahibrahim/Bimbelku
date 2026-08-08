# Revisi 9 — Matching Tutor & Fallback

Perubahan utama:

1. Seluruh search window paket/booking menggunakan satu sumber `TeacherMatchingService::maximumSearchHours()` (default 48 jam, maksimum 48 jam).
2. Saat kandidat habis, backend mencatat alasan `matching_exhausted` dengan kode dan pesan yang dapat dibaca murid:
   - `no_qualified_tutor`
   - `radius_exhausted`
   - `radius_max_exhausted`
   - `schedule_unavailable`
   - `candidates_exhausted`
   - `no_current_candidate`
3. `Cari Lagi` tetap benar-benar memulai pencarian baru. Untuk offline radius bergerak 3 → 5 → 8 → 12 km.
4. Pada scope maksimum (offline 12 km atau online), pengecekan ulang tanpa perubahan jadwal hanya diizinkan satu kali. Setelah itu tombol Cari Lagi hilang sehingga tidak ada loop 48 jam tanpa batas.
5. Ditambah alur `Ubah Jadwal` khusus mapel yang berstatus `no_teacher`. Pembayaran tidak dibuat ulang. Jadwal diubah, radius offline kembali ke 3 km, timer pencarian dimulai ulang, lalu matching berjalan dengan jadwal baru.
6. History offer lama tidak dihapus. Setelah `schedule_changed`, teacher yang pernah menolak jadwal lama boleh dievaluasi kembali karena kondisinya sudah berubah. Untuk retry biasa tanpa perubahan jadwal, tutor yang pernah ditawari tetap dikecualikan.
7. Halaman Kelas Saya menampilkan alasan mengapa tutor belum ditemukan dan aksi yang tersedia.

Tidak ada migration database baru.

Validasi source-level:

```powershell
npm run check:matching-fallback
npm run check:contracts
npm run check:pages
npm run check:php-static
npm run build
```
