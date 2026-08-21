# TUTORIAL PASANG — Whole-site UI & Mobile Hardening

## 1. Pasang patch
Ekstrak ZIP changed files ke:

`C:\laragon\www\Website_BimbelKu`

Pilih **Replace / Overwrite**.

Tidak ada file yang perlu dihapus dan tidak ada migration baru.

## 2. Validasi frontend
Buka PowerShell:

```powershell
cd C:\laragon\www\Website_BimbelKu
npx tsc --noEmit
npm run build
```

Jika salah satu gagal, berhenti dan kirim error ke ChatGPT.

## 3. Checker UI
Jika build PASS:

```powershell
node scripts/check-ui-mobile-safety.mjs
node scripts/check-admin-promotion-editor.mjs
node scripts/check-rate-limiter-isolation.mjs
```

Target utama:
- Whole-site UI Mobile Safety 26/26
- Admin Promotion Editor Fix 10/10
- Rate Limiter Isolation PASS 39/39

## 4. Jalankan web untuk cek manual
Terminal backend:

```powershell
cd C:\laragon\www\Website_BimbelKu\bimbelku-backend
php artisan optimize:clear
php artisan serve
```

Terminal frontend:

```powershell
cd C:\laragon\www\Website_BimbelKu
npm run dev
```

## 5. Urutan cek manual setelah patch
Jangan cek semuanya sekaligus. Lanjut demo dari titik terakhir:
1. Tutor — Kelas Saya / Ruang Belajar.
2. Murid — Kelas Saya.
3. Admin — Edit Promo.

Setelah tiga halaman itu aman, lanjutkan flow demo Session V2.
