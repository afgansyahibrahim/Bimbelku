# Checkpoint Tahap 2 — Backend, Mobile, dan Permintaan Les

Tanggal konsolidasi: 1 Agustus 2026  
Status: catatan backend dan mobile Tahap 2 digabung ke dokumen ini.

## Ruang lingkup

Tahap 2 menyelesaikan backend Laravel untuk akun, permintaan, pencocokan,
pembayaran, pelaksanaan, refund, dan pencairan. Formulir permintaan juga
disusun untuk penggunaan HP.

## Backend dan keamanan

- Profil murid mendukung `PUT` serta multipart `POST + _method=PUT`.
- Tutor tidak dapat memakai endpoint murid untuk melewati verifikasi.
- Kandidat tutor harus aktif, terverifikasi, tersedia, cocok, dan tidak bentrok.
- Kelayakan tutor diperiksa ulang ketika penawaran diterima.
- Transaksi dan penguncian data mencegah penerimaan jadwal bersamaan.
- Scheduler melepas penawaran kedaluwarsa dan mengulang pencarian yang macet.
- Bukti pembayaran tepat waktu tetap dapat diperiksa setelah tenggat unggah.
- Peserta belum membayar tidak dapat membuka data kelas atau mengajukan tindakan.
- Bukti privat hanya dapat dibuka oleh pemilik terkait atau admin.
- Poin tutor dibatasi dan seluruh perubahannya dicatat.

Migration penguatan:

`2026_07_28_000100_harden_stage_two_backend.php`

## Mobile dan permintaan

- Navigasi bawah disediakan untuk murid dan tutor.
- Formulir permintaan dibagi menjadi materi, kebutuhan kelas, jadwal, dan ringkasan.
- Pemeriksaan ketersediaan tutor tidak membuka identitas atau jumlah kandidat.
- Endpoint `POST /api/student/tutor-availability` dibatasi untuk murid.
- Lampiran, alamat, kontak, lokasi, serta jadwal divalidasi sebelum dikirim.
- Pusat Bantuan dan riwayat pencairan disusun ulang untuk layar kecil.

## Keuangan dan penyelesaian

- Rekening pembayaran admin dijaga sebagai satu konfigurasi aktif.
- Penolakan bukti wajib menyertakan alasan.
- Refund, sengketa, persetujuan, dan pencairan memakai pemeriksaan status ulang.
- Snapshot transaksi menjaga nilai lama saat pengaturan berubah.
- Bukti pelaksanaan memiliki masa unggah. Keberatan murid memiliki tenggat 48 jam.

## Pengujian

- `StageTwoBackendSecurityTest`
- `StageTwoMobileBookingTest`
- `TeacherPointServiceTest`
- kontrak route-controller dan pemeriksaan struktur PHP

## Catatan keputusan terbaru

Urutan pembayaran pada Tahap 2 sudah digantikan oleh Tahap 6A. Alur aktif kini
mewajibkan pembayaran disetujui sebelum pencarian tutor dimulai.
