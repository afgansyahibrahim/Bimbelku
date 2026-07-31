# Checkpoint Tahap 4 — Pencocokan, Sesi, dan Perkembangan

Tanggal: 30 Juli 2026  
Dasar source: paket final Tahap 3 tanpa Perguruan Tinggi  
Status: implementasi source selesai; tes Laravel dijalankan pada Laragon

## Hasil implementasi

- Pencocokan otomatis tetap memakai kompetensi, jadwal, status akun, poin,
  pemerataan, benturan, serta radius offline 3/5/8/12 kilometer.
- Permintaan lanjutan dengan mapel, jenjang, mode, dan tipe sama memprioritaskan
  tutor sebelumnya apabila tutor masih memenuhi seluruh syarat.
- Chat internal dibuka setelah pembayaran dikonfirmasi.
- Nomor telepon, email, akun media sosial, dan tautan luar ditolak oleh server.
- PIN enam angka dibuat oleh murid mendekati jadwal dan disimpan sebagai hash.
- Tutor melakukan check-in memakai PIN. Sesi offline memerlukan koordinat.
- Check-out mencatat durasi aktual pembelajaran.
- Tutor mengisi asesmen awal, kemampuan, kesulitan, target, dan indikator.
- Murid menyetujui target sebelum laporan perkembangan dapat diterbitkan.
- Laporan memuat materi, penguasaan, kesulitan, latihan, kehadiran, durasi,
  catatan, dan persentase progres.
- Penyelesaian sesi privat memerlukan check-in, check-out, serta laporan progres.
- Layanan kelompok tidak diperluas pada tahap ini. Fondasinya tetap tersimpan.

## Keamanan dan privasi

- Akses ruang belajar diperiksa berdasarkan kepemilikan kelas dan pembayaran.
- PIN asli tidak disimpan pada basis data.
- Alamat IP kehadiran disimpan sebagai hash.
- Lokasi tutor hanya dicatat ketika check-in offline.
- Pesan tidak membuka kontak pribadi antar pengguna.
- Data lama dan transaksi Tahap 1–3 tidak dihapus.

## Pemeriksaan lokal

- ESLint lulus.
- TypeScript lulus.
- Kontrak Tahap 4 lulus sebanyak 24 pemeriksaan.
- Sebanyak 132 aksi API memiliki controller dan method.
- Sebanyak 191 berkas PHP lulus pemeriksaan struktur.
- Build produksi memproses 1.802 modul.
- Bundle awal tetap berada dalam anggaran performa.

PHP, Composer, dan MySQL tidak tersedia pada lingkungan penyusunan. Jalankan
`scripts\test-tahap4-learning.ps1` melalui Laragon untuk migration dan tes
perilaku backend.

## Larangan instalasi

Jangan menjalankan `php artisan migrate:fresh`. Migration Tahap 4 bersifat
bertahap dan mempertahankan data yang sudah ada.
