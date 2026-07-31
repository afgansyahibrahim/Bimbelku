# Checkpoint Tahap 5 — Final Jenjang Umum dan Perbaikan Audit

Tanggal pemeriksaan: 29 Juli 2026

## Dasar revisi

Perbaikan diterapkan pada paket:

`BimbelKu_Tahap_5_Gabungan_Optimasi_Revisi_Tanpa_Perguruan_Tinggi_2026-07-29.zip`

Paket tersebut sudah membawa revisi Privat, pembayaran, validasi mapel,
optimasi, serta viewer bukti internal.

## Cakupan jenjang

Layanan memakai empat pilihan:

1. SD;
2. SMP;
3. SMA;
4. Umum.

Umum meliputi Semua tingkat, Pemula, Menengah, dan Lanjutan.

Perguruan Tinggi tidak ditampilkan dan tidak diterima oleh API.

## Perbaikan hasil audit

Perbaikan berikut telah diterapkan:

- pendaftaran murid hanya menerima empat jenjang yang didukung;
- akun murid lama dibersihkan dari nilai universitas atau semester;
- mapel lama tidak dapat diaktifkan tanpa jenjang;
- kelas atau tingkat mapel harus sesuai dengan jenjang;
- mapel lama dapat diaktifkan setelah admin memilih cakupan valid;
- topik dan bab lama dengan pasangan jenjang tidak valid dinonaktifkan;
- teks universitas pada halaman pengelolaan mapel telah dihapus;
- pemeriksaan jenjang otomatis ditambahkan pada skrip pengujian.

Riwayat pesanan, transaksi, pembayaran, dan unggahan tidak diubah.

## Revisi lama yang dipertahankan

- Optimasi pemuatan katalog dan API.
- Deduplikasi permintaan data.
- Indeks database untuk query yang sering dipakai.
- Alur kelas Privat dan pembayaran.
- Normalisasi nama mapel tanpa duplikasi kapital atau spasi.
- Viewer foto dengan zoom sampai 400 persen dan putar.
- Viewer PDF di dalam website.
- Pratinjau berkas tanpa pemaksaan unduhan.

## Hasil pemeriksaan

Pemeriksaan berikut telah lulus:

- ESLint;
- TypeScript;
- 115 kontrak API;
- konsistensi jenjang frontend dan backend;
- viewer internal pada 85 berkas sumber;
- build produksi 1.798 modul;
- anggaran performa;
- parser 159 berkas PHP.

Tes Laravel berjumlah 39 setelah tiga tes regresi ditambahkan.
Tes tersebut dijalankan melalui PHP Laragon setelah paket dipasang.
