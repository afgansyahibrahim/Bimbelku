# Checkpoint Tahap 5 — Revisi Pratinjau Berkas

Tanggal: 29 Juli 2026

## Dasar paket

Revisi ini diterapkan pada paket terbaru:

`BimbelKu_Tahap_5_Gabungan_Optimasi_Revisi_Validasi_Mapel_2026-07-28.zip`

Revisi Privat, Pembayaran, optimasi web, dan validasi mapel tetap dipertahankan.

## Bug

Tombol **Lihat** pada beberapa foto dan dokumen langsung menyimpan berkas ke folder Downloads.
Perilaku tersebut tidak sesuai dengan label dan tujuan tombol.

## Penyebab

- Frontend menambahkan atribut `download` setelah berkas terlindungi berhasil dimuat.
- Jalur verifikasi tutor dan lampiran murid memiliki logika unduhan cadangan yang sama.
- Backend sebenarnya sudah mengirim `Content-Disposition: inline`.

## Perbaikan

- Foto dan PDF terlindungi dibuka sebagai pratinjau pada tab browser.
- Tab pratinjau dibuka saat tombol diklik agar tidak diblokir sebagai pop-up asinkron.
- Jalur cadangan tidak lagi memaksa unduhan.
- Verifikasi tutor dan lampiran murid memakai satu fungsi pratinjau bersama.
- Label **Download CV** diubah menjadi **Lihat CV**.
- Label struk tutor diubah menjadi **Lihat struk**.
- Backend tetap membatasi akses berkas berdasarkan peran dan pemilik data.

## Perlindungan regresi

Pemeriksaan `npm run check:file-preview` memindai seluruh sumber frontend.
Pemeriksaan gagal jika atribut unduhan paksa ditambahkan kembali.

Tes Laravel juga memeriksa bahwa dokumen tutor dikirim sebagai pratinjau `inline`.

## Pengujian

Pemeriksaan workspace meluluskan:

- ESLint;
- TypeScript;
- 115 kontrak action API;
- pemeriksaan 82 berkas sumber tanpa unduhan paksa;
- build Vite terhadap 1.795 modul;
- anggaran JavaScript awal 95,0 KB gzip;
- anggaran CSS awal 16,6 KB gzip.

Runtime PHP tidak tersedia pada workspace penyusunan.
Tes Laravel perlu dijalankan melalui Laragon.

```powershell
cd C:\laragon\www\Website_Bimbelku
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap5.ps1 -SkipInstall
```

Hasil tes Laravel yang diharapkan:

```text
Tests: 35 passed
Pemeriksaan Tahap 5 lulus.
```

Tidak diperlukan migrasi, seeder, `npm ci`, atau `composer install`.
