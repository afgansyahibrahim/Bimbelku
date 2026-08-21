# CHECKPOINT — Admin Promotion Editor Fix — 20 Aug 2026

## Masalah
1. Popup multi-select Sasaran Mapel pada Create/Edit Promo terbuka di belakang editor Promo.
2. Kontrol `Promo aktif` berada di bagian paling bawah form sebagai checkbox kecil sehingga sulit ditemukan.

## Akar masalah
- Editor Promo memakai layer `z-[200]`.
- `ResponsiveMultiSelect` membuka Radix Dialog dengan overlay/content default `z-50`, sehingga portal dialog berada di belakang editor.
- Create dan Edit memakai komponen `PromoFields` yang sama, sehingga keduanya terdampak.

## Perbaikan
- Dialog global dinaikkan ke overlay `z-[400]` dan content `z-[401]`; Select tetap `z-[500]`.
- `Promo aktif` dipindahkan ke bagian paling atas form sebagai status control yang jelas: `AKTIF / NONAKTIF` + switch.
- Checkbox promo aktif lama di bagian bawah dihapus agar tidak duplikat.
- Backend tetap memakai field `is_active` yang sudah ada; tidak ada migration.

## Validasi source
- `node scripts/check-admin-promotion-editor.mjs` -> 10/10 PASS.
- API contract -> 196 action PASS.
- Frontend page route contract -> 69 route PASS.
- Rate Limiter Isolation -> 39/39 PASS.

Catatan: checker `check-stage5-experience.mjs` pada snapshot base masih memiliki kegagalan kontrak scheduler lama yang tidak berkaitan dengan perubahan editor Promo dan tidak disentuh patch ini.
