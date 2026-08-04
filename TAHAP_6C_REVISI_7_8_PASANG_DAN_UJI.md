# Tahap 6C — Memasang Revisi 7 dan 8

Patch ini melanjutkan project yang sudah memasang Tahap 6C Revisi 1–6.

## Isi revisi

### Revisi 7 — Pemisahan kewenangan admin

- Superadmin memiliki seluruh kewenangan.
- Admin terbatas hanya dapat membuka menu, halaman, dan endpoint yang diberikan.
- Kewenangan dipisah untuk dashboard, pencarian tutor, pembayaran, pencairan, refund, tutor, kasus, pengguna, kelas, konten, bantuan, pengaturan, pengelolaan admin, dan audit.
- Keamanan dua langkah keuangan otomatis tersedia untuk admin yang mempunyai salah satu modul pembayaran, pencairan, atau refund tanpa memberi akses ke modul keuangan lain.
- Admin tidak dapat mengubah akses akun sendiri.
- Admin biasa tidak dapat mengubah superadmin atau memberikan kewenangan yang tidak dimilikinya.
- Superadmin aktif terakhir tidak dapat diturunkan atau dinonaktifkan.
- Perubahan akses menutup seluruh token login lama akun tujuan.
- Rute admin yang belum mempunyai pemetaan kewenangan ditolak secara otomatis.

### Revisi 8 — Audit perubahan admin

- Seluruh permintaan mutasi `POST`, `PUT`, `PATCH`, dan `DELETE` pada grup admin dicatat.
- Catatan memuat pelaku, kewenangan, aksi, target, alasan, payload yang sudah disaring, kondisi sebelum, kondisi sesudah, status respons, IP, perangkat, dan waktu.
- Kata sandi, token, data wali, kontak, lokasi, dan nomor rekening disamarkan atau tidak disimpan secara mentah.
- Catatan audit dienkripsi pada database.
- Catatan audit tidak dapat diubah atau dihapus melalui model aplikasi.
- Setiap catatan memiliki `previous_hash` dan `entry_hash`. Perubahan langsung pada database dapat terdeteksi dari pemeriksaan rantai integritas.
- Mutasi berhasil dan pencatatan audit berada dalam transaksi yang sama. Jika audit gagal, perubahan utama ikut dibatalkan.
- Percobaan yang ditolak atau gagal validasi tetap dicatat dengan status yang sesuai.

## 1. Pasang patch

Ekstrak patch ke:

```text
C:\laragon\www\Website_Bimbelku
```

Pilih **Replace/Timpa**. Jangan menghapus `.env`, database, atau folder unggahan.

## 2. Jalankan migrasi

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan migrate
php artisan optimize:clear
```

Migrasi menjadikan seluruh akun admin lama sebagai superadmin agar tidak terjadi kehilangan akses. Setelah masuk, superadmin dapat membuat admin terbatas atau menurunkan admin lain secara sengaja.

## 3. Jalankan pengujian backend

```powershell
php artisan test --filter=StageSixCAccessAuditTest
```

Lanjutkan pengujian keseluruhan bila tes khusus berhasil:

```powershell
php artisan test
```

## 4. Jalankan pemeriksaan frontend

```powershell
cd C:\laragon\www\Website_Bimbelku
npm run check:stage6c-d
npm run typecheck
npm run dev
```

Tidak ada dependency npm baru. `npm install` tidak perlu diulang jika `node_modules` sudah tersedia.

## 5. Login ulang

Keluar dari akun admin lalu login kembali agar `admin_type` dan `admin_permissions` terbaru tersimpan di browser. Ketika superadmin mengubah akses admin lain, seluruh sesi lama admin tersebut otomatis ditutup.

## 6. Skenario uji manual minimum

1. Login sebagai superadmin dan buka **Kontrol Akses Admin**.
2. Buat admin pembayaran saja. Pastikan admin tersebut dapat membuka Pembayaran dan Keamanan Keuangan, tetapi tidak dapat membuka Pencairan atau Refund.
3. Buat admin pencarian tutor saja. Pastikan menu keuangan dan data pengguna tidak terlihat.
4. Ubah kewenangan salah satu admin dan pastikan sesi lamanya terputus.
5. Coba membuka URL admin yang tidak berizin secara langsung. Backend harus mengembalikan 403.
6. Lakukan satu perubahan admin, misalnya mengubah status pengguna atau memperluas radius tutor.
7. Buka **Audit Perubahan** dan periksa pelaku, target, alasan, data sebelum, data sesudah, serta status rantai integritas.
8. Pastikan nomor rekening, kata sandi, token, alamat, dan data pribadi tidak tampil mentah pada audit.

## Rollback pengembangan

Backup database terlebih dahulu. Untuk membatalkan migrasi terakhir pada lingkungan pengembangan:

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan migrate:rollback --step=1
php artisan optimize:clear
```

Rollback menghapus tabel audit dan kolom kewenangan admin. Jangan menjalankan rollback di produksi tanpa ekspor audit dan rencana pemulihan akses.

## Status checkpoint

`CHECKPOINT_TAHAP_6C` belum dibuat karena Revisi 9, yaitu pengujian lintas peran dan regresi akhir, belum dikerjakan.
