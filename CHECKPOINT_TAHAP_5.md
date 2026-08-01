# Checkpoint Tahap 5 — Alur Utama, Katalog, dan Responsif

Tanggal: 28 Juli 2026  
Dasar pengerjaan: checkpoint Tahap 4 dan catatan revisi pengguna

## Status

Implementasi Tahap 5 sudah selesai pada source code. Frontend, kontrak API, build
produksi, dan sintaks PHP telah diperiksa di workspace. Tes Laravel sudah
ditambahkan, tetapi masih harus dijalankan melalui PHP dan Composer di Laragon
sebelum paket dipasang pada website utama.

Dokumen ini telah menggabungkan seluruh catatan kecil Tahap 5. Berkas terpisah
untuk optimasi web, paket dan promo, pratinjau berkas, Privat, pembayaran,
validasi mapel, dan perubahan jenjang sudah tidak diperlukan.

Tidak ada database MySQL pengguna yang dibuka, dikosongkan, atau diubah selama
pengerjaan ini. Migration baru tidak memakai `migrate:fresh`.

## Keputusan final hasil seluruh revisi Tahap 5

- Jenjang aktif terdiri atas SD, SMP, SMA, dan Umum.
- Perguruan Tinggi serta pilihan semester tidak ditampilkan pada alur aktif.
- Katalog, tarif, kompetensi tutor, dan pemesanan memakai sumber mapel yang sama.
- Nama mapel dinormalisasi agar kapital dan spasi tidak membuat duplikasi.
- Kelas Privat dipertahankan sebagai alur utama. Kelas kelompok ditunda.
- Viewer internal membuka foto dan PDF tanpa memaksa unduhan.
- Foto dapat diperbesar 50–400 persen dan diputar 90 derajat.
- Query katalog, dashboard, daftar kelas, dan transaksi telah dioptimalkan.
- Paket, promo, voucher, banner, tutorial, dan dashboard telah ditambahkan.
- Riwayat lama tidak dihapus ketika jenjang atau mapel dinonaktifkan.

Urutan pembayaran yang tertulis pada bagian alur Tahap 5 merupakan riwayat
implementasi saat itu. Keputusan tersebut telah digantikan Tahap 6A. Alur aktif
sekarang ialah pembayaran disetujui lebih dahulu, kemudian pencarian tutor.

## Hasil Tahap 5

### Alur kelas dan pembayaran

- Tutor yang menerima permintaan langsung membuka tagihan murid.
- Keputusan kedua dari murid untuk memilih profil tutor tidak lagi diperlukan
  pada permintaan baru.
- Status utama menjadi:
  `menunggu tutor → belum dibayar → diperiksa admin → lunas → kelas aktif`.
- Tagihan baru memakai batas pembayaran 30 menit atau sampai waktu mulai kelas,
  mana yang lebih dahulu.
- Slot tutor ditahan selama tagihan dan pemeriksaan bukti masih aktif.
- Tagihan kedaluwarsa dibatalkan oleh scheduler serta diperiksa kembali ketika
  murid membuka tagihan atau riwayat.
- Bukti yang ditolak wajib mempunyai alasan dan dapat diunggah ulang sebelum
  tenggat.
- Admin dan tutor menerima notifikasi ketika bukti transfer diunggah.
- Murid dan tutor menerima notifikasi setelah keputusan admin.
- Tombol pembayaran tersedia pada Pencarian, Kelas Saya, pengingat tagihan, dan
  Riwayat Transaksi.
- Filter **Belum dibayar** memakai status `pending` dan menampilkan tindakan
  **Bayar sekarang**.

### Kelas Saya

- Error tombol **Lihat detail** diperbaiki dengan melengkapi impor ikon yang
  digunakan dialog.
- Dialog detail menampilkan jadwal, materi, tutor, mode, biaya, status
  pembayaran, akses kelas, bukti pelaksanaan, sengketa, dan refund.
- Tagihan yang masih aktif dapat dibuka langsung dari kartu atau dialog detail.

### Jadwal

- Batas tunggu 90 menit atau dua jam dihapus dari permintaan baru.
- Waktu mulai memakai kelipatan 10 menit: `00, 10, 20, 30, 40, 50`.
- Waktu yang sudah berlalu tetap ditolak.
- Jadwal mendadak dapat dipilih selama waktu mulai belum lewat, tutor tersedia,
  dan sesi selesai pada hari yang sama.
- Tenggat jawaban tutor dan pembayaran otomatis dipendekkan jika waktu mulai
  kelas lebih dekat.

### Katalog mata pelajaran dan bab

- Tabel pusat `curriculum_subjects` dan `curriculum_chapters` ditambahkan.
- Katalog awal memuat 49 mapel, termasuk 48 mapel sekolah kelas 1–12 dan satu
  mapel umum Akuntansi.
- Terdapat 295 pasangan mapel–kelas dan 1.394 rekaman bab awal.
- Judul buku yang tersedia langsung dari SIBI dicatat sebagai judul buku.
- Mapel dengan variasi buku atau edisi memakai struktur materi awal yang dapat
  disesuaikan admin.
- Submateri tidak diwajibkan.
- Murid dapat memilih **Seluruh materi mapel** dan **Seluruh materi dalam bab**.
- Admin memiliki menu **Mata Pelajaran** untuk menambah, mengubah, mengaktifkan,
  atau menonaktifkan mapel.
- Mapel yang sudah dipakai tidak dihapus dari riwayat; sistem menonaktifkannya.
- Nama mapel dinormalisasi agar kapital dan spasi tidak membuat duplikasi.
- Menu **Materi Kurikulum** mengelola bab berdasarkan jenjang, kelas, dan mapel.
- Tarif khusus memakai dropdown pencarian. Jika nama belum ada, admin dapat
  menambahkannya langsung dari dropdown lalu melanjutkan pengisian tarif.
- Registrasi tutor, profil tutor, tarif, materi, dan pemesanan memakai katalog
  yang sama.

### Handphone dan tablet

- Sidebar murid, tutor, dan admin menjadi panel tersembunyi pada handphone dan
  tablet.
- Tombol menu membuka sidebar, lapisan gelap menutup area belakang, dan sidebar
  tertutup otomatis setelah pindah halaman.
- Sidebar permanen baru tampil pada layar desktop lebar (`xl`).
- Lebar sidebar dibatasi 88% viewport agar tombol tutup selalu terlihat.
- Layout utama memakai tinggi viewport dinamis agar aman pada browser mobile.
- Header, jarak konten, dialog, dropdown notifikasi, kartu pembayaran, dan tombol
  aksi menyesuaikan layar kecil.
- Tabel admin tetap dapat digunakan melalui gulir horizontal.
- Tampilan pesan admin berubah menjadi daftar atau detail bergantian pada layar
  kecil.

## Perubahan database

Migration baru:

`2026_07_28_000300_create_stage_five_curriculum_catalog.php`

Migration tersebut:

1. membuat `curriculum_subjects`;
2. membuat `curriculum_chapters`;
3. menambahkan referensi katalog pada tarif, kompetensi tutor, dan permintaan;
4. menetapkan batas pembayaran 30 menit;
5. membuka tagihan lama yang masih berhenti pada keputusan profil tutor;
6. menandai alur lama yang waktunya sudah lewat sebagai kedaluwarsa.

Setelah migration, jalankan seeder katalog secara terpisah:

```powershell
php artisan db:seed --class=CurriculumCatalogSeeder
```

Seeder menggunakan `updateOrCreate`, sehingga aman dijalankan ulang dan tidak
menghapus mapel, pengguna, kelas, transaksi, atau data lama.

## Hasil pemeriksaan workspace

| Pemeriksaan | Hasil |
| --- | --- |
| ESLint | Lulus tanpa error |
| TypeScript | Lulus tanpa error |
| Kontrak API | Lulus, 115 action |
| Build produksi | Lulus, 1.793 modul |
| Parser PHP | Lulus, 154 berkas |
| Katalog seeder | 49 mapel, 295 pasangan mapel–kelas, 1.394 bab |
| Tes regresi Tahap 5 | 4 metode tes baru disiapkan |

`npm audit --omit=dev` masih melaporkan dua entri high dari satu advisory React
Router pada mode React Server Components. Aplikasi ini memakai Vite SPA dan
`BrowserRouter`, tidak memakai React Server Components atau server action.
Registry belum menyediakan versi perbaikan. Catatan ini perlu diperiksa kembali
ketika React Router menerbitkan versi baru.

Tes regresi Tahap 5 mencakup:

- isi katalog dan bab setiap kelas yang didukung;
- pencegahan duplikasi mapel karena kapital atau spasi;
- penerimaan waktu terdekat pada kelipatan 10 menit;
- penolakan menit yang bukan kelipatan 10;
- pembuatan tagihan langsung ketika tutor menerima.

Tes Laravel belum dijalankan di workspace karena folder `vendor`, PHP native,
dan Composer tidak tersedia. Semua berkas PHP sudah lulus pemeriksaan sintaks.

## Batas pemakaian

- Pembayaran masih berupa transfer manual dan unggah bukti, bukan payment
  gateway.
- QRIS tetap opsional; rekening admin wajib lengkap.
- Judul bab dapat berbeda menurut buku sekolah dan edisi. Admin dapat mengubah
  katalog tanpa mengubah transaksi lama.
- `php artisan schedule:work` atau cron Laravel perlu aktif agar tenggat diproses
  setiap menit tanpa menunggu pengguna membuka halaman.
- Jangan menjalankan `php artisan migrate:fresh` pada database utama.

## Sumber katalog

- Sistem Informasi Perbukuan Indonesia:
  https://buku.kemendikdasmen.go.id/
- Permendikdasmen Nomor 13 Tahun 2025:
  https://www.kemendikdasmen.go.id/download/file/1392

## Langkah berikutnya

Ikuti `TAHAP_5_PASANG_DAN_UJI.md`. Tahap 5 baru dinyatakan lolos pada perangkat
pengguna setelah `scripts/test-tahap5.ps1` dan pemeriksaan manual tiga peran
selesai tanpa error.
