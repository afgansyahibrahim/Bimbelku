# Checkpoint Tahap 3 — Keuangan Aman dan Pembersihan

Tanggal konsolidasi: 1 Agustus 2026  
Status: catatan keuangan dan pembersihan Tahap 3 digabung ke dokumen ini.

## Keuangan aman

- Pembayaran, hak tutor, refund, dan pencairan menghasilkan jurnal berpasangan.
- Jurnal memakai kunci peristiwa unik serta hash berantai.
- Record jurnal tidak dapat diubah atau dihapus melalui model biasa.
- Mutasi keuangan memakai `Idempotency-Key` untuk mencegah transaksi ganda.
- Akses keuangan admin dilindungi TOTP dan masa otorisasi terbatas.
- Rahasia TOTP disimpan terenkripsi.
- Perubahan rekening tutor memerlukan kata sandi dan menghasilkan audit.
- Pencairan besar memerlukan persetujuan sesuai aturan sistem.
- Selisih buku besar dapat diperiksa melalui perintah verifikasi keuangan.

Migration utama:

`2026_07_29_000300_harden_stage_three_finance.php`

## Pembersihan proyek

Berkas hanya dihapus ketika terbukti tidak dipakai. Migration, model,
controller, service, middleware, route, seeder, factory, halaman, dan komponen
aktif tetap dipertahankan untuk menjaga instalasi serta riwayat.

Jenis yang dibersihkan:

- berkas contoh bawaan yang tidak menguji fungsi;
- folder kosong;
- hasil build dan cache yang dapat dibuat ulang;
- dependensi frontend yang tidak dikonfigurasi;
- artefak lokal yang tidak boleh masuk paket distribusi.

Jenis yang dipertahankan:

- migration historis;
- berkas penyimpanan pengguna;
- konfigurasi `.env` milik mesin pengguna;
- tes yang menjaga regresi alur;
- dokumentasi pemasangan dan rollback.

## Verifikasi

Pemeriksaan Tahap 3 mencakup struktur jurnal, middleware, route keuangan,
ketiadaan perubahan record immutable, TypeScript, ESLint, struktur PHP, dan
build produksi.

## Aturan pemasangan

`migrate:fresh` tidak digunakan pada database yang berisi data. Folder
`storage/app`, file `.env`, dan database MySQL selalu dipertahankan.
