# Koreksi Admin Tunggal dan Basis Revisi Terbaru

Tanggal: 3 Agustus 2026

Basis perubahan:

1. `Website_Bimbelku(1).zip`;
2. patch penghapusan halaman autentikator admin;
3. patch tutorial terbaru yang mencegah halaman kosong setelah tutorial selesai.

## Admin tunggal

- Hanya satu akun admin utama yang digunakan.
- Admin utama memperoleh seluruh akses operasional.
- Menu dan endpoint pembuatan atau perubahan admin tambahan ditutup.
- URL lama `/admin/access-control` diarahkan ke dashboard admin.
- Audit perubahan tetap aktif dan tetap memakai rantai integritas.
- Data kolom permission lama dipertahankan untuk kompatibilitas database, tetapi tidak lagi membatasi admin utama.

## File frontend lama

Dua halaman berikut tidak lagi digunakan dan aman dihapus setelah patch dipasang:

- `src/pages/admin/AdminAccessControl.tsx`
- `src/pages/admin/FinanceSecurity.tsx`

Gunakan `scripts/apply-single-admin-cleanup.ps1` agar penghapusan dilakukan dengan aman.
