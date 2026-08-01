# CHECKPOINT 6 — Revisi 1–3

Tanggal: 31 Juli 2026

Checkpoint ini menutup tiga revisi pertama. Revisi 4 dikerjakan setelah checkpoint ini dan tidak dihitung sebagai bagian penutupan Revisi 1–3.

## Revisi 1 — Tutorial dialog tengah

Status: selesai.

Hasil utama:
- Tutorial tampil sebagai dialog di tengah layar melalui React Portal.
- Isi panjang dapat digulir tanpa memotong header dan tombol.
- Mendukung Escape, navigasi keyboard, focus trap, dan tampilan HP.
- Tutorial tersedia pada role murid, tutor, dan admin.

## Revisi 2 — Dropdown mata pelajaran

Status: selesai.

Hasil utama:
- Dropdown mapel dapat dicari dan tidak terpotong container.
- Posisi dapat menyesuaikan ruang atas/bawah.
- Mendukung keyboard, klik luar, daftar panjang, dan layar HP.
- Mapel ganda dalam satu paket dicegah.
- Pilihan mapel dibersihkan saat jenjang atau kelas berubah.

## Revisi 3 — Penanda menu aktif

Status: selesai.

Hasil utama:
- Aturan menu aktif dipusatkan di `src/lib/navigation.ts`.
- Halaman pembuatan paket hanya mengaktifkan Cari Les, bukan Kelas Saya sekaligus.
- Detail promo tetap mengaktifkan Voucher.
- `/search` dan `/student/find` tetap mengaktifkan Cari Les.
- Subhalaman admin dan tutor tetap mengaktifkan menu induk.
- Sidebar desktop dan navigasi bawah HP memakai aturan yang sama.
- Rute Pesan memiliki penanda aktif sendiri.

## Berkas inti Revisi 1–3

- `src/components/RoleQuickGuide.tsx`
- `src/components/SubjectCombobox.tsx`
- `src/pages/students/PackageBuilder.tsx`
- `src/lib/navigation.ts`
- `src/components/Navbar.tsx`
- `src/components/StudentLayout.tsx`
- `src/components/MobileBottomNav.tsx`
- `src/components/TeacherLayout.tsx`
- `src/components/AdminLayout.tsx`
- `scripts/check-revision1-tutorial.mjs`
- `scripts/check-revision2-subject-dropdown.mjs`
- `scripts/check-revision3-navigation.mjs`

## Pemeriksaan checkpoint

Jalankan dari folder frontend:

```powershell
npm run check:revision1
npm run check:revision2
npm run check:revision3
npm run typecheck
npm run build
```

## Batas checkpoint

- Revisi 4–18 belum dinyatakan selesai oleh checkpoint ini.
- Perubahan berikutnya tidak boleh merusak tutorial, dropdown mapel, atau penanda menu aktif.
- `CHECKPOINT_7.md` dibuat setelah Revisi 4, 5, dan 6 selesai serta diuji.
