# Checkpoint Tahap 5 — Revisi Validasi Mapel

Tanggal: 28 Juli 2026

## Bug

Penambahan mapel dengan perbedaan kapital atau jumlah spasi menghasilkan HTTP 422.
Endpoint seharusnya mengembalikan mapel lama dengan HTTP 200.

Contoh nilai yang harus dianggap sama:

- `Kimia Eksperimen`
- `kimia eksperimen`
- `  kimia    eksperimen `

## Penyebab

Aturan `unique` dijalankan sebelum endpoint mencari `normalized_name` yang sudah ada.
Proses pengembalian mapel lama tidak pernah tercapai.

## Perbaikan

- Validasi pembuatan mapel tidak lagi menolak `normalized_name` yang sudah ada.
- Endpoint mencari nama normalisasi setelah validasi data dasar.
- Mapel lama dikembalikan dengan HTTP 200 dan `created: false`.
- Mapel nonaktif diaktifkan kembali saat dipilih.
- Validasi `unique` tetap diterapkan saat admin mengubah nama mapel.

## Pengujian Laragon

Jalankan dari folder utama proyek:

```powershell
cd C:\laragon\www\Website_Bimbelku
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap5.ps1 -SkipInstall
```

Hasil yang diharapkan:

```text
Tests: 34 passed
Pemeriksaan Tahap 5 lulus.
```

Tidak diperlukan migrasi, seeder, atau pemasangan dependensi ulang.
