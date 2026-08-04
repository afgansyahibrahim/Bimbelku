# Checkpoint Tahap 6C — Dokumen Historis

Tanggal awal: 1 Agustus 2026  
Status terbaru: **digantikan oleh Audit Checkpoint 1 tanggal 3 Agustus 2026.**

Tahap 6C sebelumnya menambahkan dashboard operasional admin, kontrol pencarian tutor, perluasan radius, penetapan tutor manual, pembayaran, refund, pencairan, dan audit. Setelah keputusan kebutuhan berubah, runtime disederhanakan menjadi:

1. hanya satu admin utama;
2. seluruh akses admin diberikan kepada admin utama;
3. pengelolaan admin tambahan ditutup;
4. halaman kode autentikator dihapus;
5. alur persetujuan admin kedua dihapus;
6. role, idempotensi, validasi transaksi, bukti transfer, dan audit tetap aktif.

Struktur migration lama tidak diubah atau diganti nama karena dapat sudah tercatat pada database instalasi pengguna. Runtime lama yang tidak dipakai dibersihkan melalui:

```powershell
cd C:\laragon\www\Website_Bimbelku
powershell -ExecutionPolicy Bypass -File .\scripts\apply-checkpoint1-cleanup.ps1
```

Pemeriksaan terbaru:

```powershell
npm run check:checkpoint1
npm run check:stage6c-final
npm run typecheck

cd bimbelku-backend
php artisan test --filter=CheckpointOneFoundationAuditTest
php artisan test --filter=StageSixCFinalRegressionTest
```

Batas verifikasi: tes Laravel dan build Vite harus dijalankan pada Laragon yang memiliki `vendor`, `node_modules`, dan database pengujian.
