# Revisi 7 — Penanda Merah Halaman Belum Dilihat

## Tujuan
Menambahkan indikator titik merah pada navigasi Student, Teacher, dan Admin ketika ada pembaruan/notifikasi yang relevan dengan halaman tersebut dan belum dilihat.

## Perilaku
- Titik merah muncul di menu desktop dan bottom navigation mobile.
- Admin: pembaruan pada menu yang tidak masuk 4 shortcut mobile digabung ke indikator `Menu`.
- Membuka halaman tujuan menandai notifikasi untuk halaman tersebut sebagai sudah dilihat melalui batch endpoint, sehingga titik hilang.
- Membaca notifikasi secara eksplisit juga menyelaraskan indikator.
- Notifikasi baru menyimpan `target_url` agar tahu halaman mana yang harus diberi indikator.
- Notifikasi lama tanpa `target_url` tetap didukung melalui fallback berdasarkan role + judul notifikasi, sehingga tidak perlu migrasi database khusus untuk data lama.

## Contoh target
### Student
- perubahan paket/tutor -> Kelas Saya
- kelas/sesi/progress -> Kelas Saya
- pesan kelas -> Pesan
- refund/pembayaran berakhir/ditolak -> Saya (Riwayat)
- bantuan -> Saya (Pusat Bantuan)

### Teacher
- permintaan bimbel baru -> Permintaan Bimbel
- kelas/jadwal/pembayaran murid -> Kelas Saya / Jadwal
- pesan kelas -> Pesan
- rekening/pencairan -> Rekening / Dompet & Gaji
- laporan/penalti -> Performa & Banding
- bantuan -> Pusat Bantuan

### Admin
- tutor baru -> Verifikasi tutor
- bukti pembayaran -> Pembayaran murid
- pencairan tutor/perubahan rekening -> Pencairan tutor
- refund -> Refund & saldo
- kasus/banding -> Pusat kasus
- tiket bantuan -> Pesan bantuan

## Backend
Endpoint baru:
- `POST /api/notifications/read-batch`

Endpoint hanya memperbarui notifikasi milik user yang sedang login.
Route statis `read-batch` dan `read-all` diletakkan sebelum route dinamis `{id}/read`, dan `{id}` dibatasi numerik.

## Performa
Indikator tidak membuat request berat di critical path. Fetch dilakukan non-critical/polling dan backend mengirim `attention_notifications` dalam payload ringkas (`id`, `is_read`, `target_url`). Admin hanya meminta 1 item notifikasi penuh karena yang dibutuhkan untuk nav adalah payload ringkas tersebut.

## Validasi source-level
Jalankan:

```powershell
npm run check:navigation-attention
npm run check:contracts
npm run check:pages
npm run check:php-static
npm run check:performance-revision1
npm run check:performance-whole-site
npm run check:payment-fix
npm run check:admin-payment-fix
npm run build
```

Catatan: `npm run build` membutuhkan `node_modules`/dependency Vite terpasang. Paket hasil revisi sengaja tidak menyertakan `node_modules`, `vendor`, `.env`, `.git`, atau `dist` lama.
