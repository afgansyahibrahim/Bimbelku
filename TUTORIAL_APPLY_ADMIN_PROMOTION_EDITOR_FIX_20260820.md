# Tutorial Apply — Admin Promotion Editor Fix

1. Ekstrak ZIP changed files ke root project:
   `C:\laragon\www\Website_Bimbelku`
2. Pilih Replace/Overwrite.
3. Tidak ada migration dan tidak ada file yang perlu dihapus.
4. Jalankan dari root project:

```powershell
cd C:\laragon\www\Website_BimbelKu
npx tsc --noEmit
npm run build
node scripts/check-admin-promotion-editor.mjs
```

Target checker: `Admin Promotion Editor Fix 10/10`.

Sesudah itu jalankan `npm run dev`, buka Admin -> Paket, Promo & Konten -> Promo. Cek Create dan Edit:
- Status promo terlihat paling atas dan bisa ON/OFF.
- Sasaran mapel membuka popup di depan editor, bukan di belakang.
