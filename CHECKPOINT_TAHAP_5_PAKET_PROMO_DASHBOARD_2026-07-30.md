# Checkpoint Tahap 5 — Paket, Promo, Konten, dan Dashboard

Tanggal: 30 Juli 2026  
Dasar source: Tahap 4 Pencocokan, Sesi, dan Perkembangan final 30 Juli 2026  
Status: implementasi source selesai; tes Laravel penuh dijalankan melalui Laragon

## Cakupan yang selesai

### Paket belajar

- Paket Coba Belajar: 1 sesi, 7 hari, maksimal 1 mapel.
- Paket Bulanan Dasar: 4 sesi, 30 hari, maksimal 1 mapel.
- Paket Bulanan Reguler: 8 sesi, 30 hari, maksimal 2 mapel.
- Paket Bulanan Intensif: 12 sesi, 30 hari, maksimal 3 mapel.
- Satu sesi berlangsung tepat 60 menit.
- Murid membagi sesi untuk setiap mapel dan memilih seluruh jadwal sejak awal.
- Slot dimulai tepat pada pergantian jam dan minimal 72 jam dari waktu pemesanan.
- Pilihan jam berasal dari daftar slot aktif yang dikelola admin; murid tidak
  mengetik jam bebas.
- Sistem memeriksa benturan murid, ketersediaan tutor, kompetensi, dan lokasi offline.
- Satu paket dapat mempunyai tutor berbeda untuk setiap mapel.
- Satu tagihan agregat baru dibuka setelah semua tutor menerima.
- Seluruh slot ditahan paling lama 48 jam selama pembayaran.
- Paket aktif masuk ke halaman **Kelas Saya** setelah verifikasi admin.

### Perpanjangan tutor

- Tombol **Perpanjang dengan Tutor Ini** muncul tujuh hari sebelum paket berakhir.
- Perpanjangan dapat dipilih per mapel.
- Tutor lama diprioritaskan, tetapi tetap memeriksa kompetensi, jadwal, status, dan poin.
- Tutor lama harus menerima seluruh jadwal baru.
- Sistem mencari tutor lain apabila tutor lama tidak tersedia atau menolak.
- Murid dapat memperluas pencarian atau membatalkan paket sebelum tagihan dibuka.

### Promo, voucher, dan kode

- Promo mendukung potongan persentase atau nominal.
- Admin dapat mengatur periode, kuota, batas akun, pembelian minimum, paket,
  jenjang, mapel, mode belajar, dan khusus murid baru.
- Murid dapat mengklaim penawaran ke **Voucher Saya**.
- Murid juga dapat memasukkan kode promo saat membeli paket.
- Satu transaksi memakai satu voucher atau satu kode promo.
- Kuota dan penggunaan akun dikunci di database untuk mencegah klaim bersamaan.
- Harga akhir selalu dihitung backend.
- Halaman pembayaran menampilkan harga normal dicoret, harga akhir, label
  persentase kecil, serta nominal penghematan.

### Banner dan tutorial

- Banner dashboard berganti otomatis setiap empat detik.
- Banner dapat digeser, dihentikan sementara, diklik, dan diarahkan ke tujuan.
- Admin dapat mengelola gambar, tulisan, tombol, sasaran, urutan, periode, status,
  dan tujuan banner.
- Tujuan internal dibatasi pada daftar halaman aman.
- Tautan luar wajib memakai HTTPS.
- Tutorial murid, tutor, dan admin memakai carousel langkah dan dikelola melalui CRUD.

### Dashboard dan navigasi

- Dashboard murid menyesuaikan status paket, pencarian tutor, pembayaran, sesi
  berikutnya, sisa sesi, progres, voucher, dan jadwal.
- Navigasi bawah murid: Beranda, Kelas Saya, Cari Les, Voucher, dan Akun.
- Tombol pesan kelas mengambang tersedia pada layout murid.
- Panel admin Tahap 5 mengelola paket, slot jam, promo, banner, dan tutorial.

### Landing page

- Identitas oranye dan struktur dasar tetap dipertahankan.
- Hero menjadi dua kolom dengan visual radar dan kartu tutor.
- Baris kepercayaan, cara kerja, pratinjau paket, dan pratinjau dashboard ditambahkan.
- Kelas grup tidak dipromosikan karena masih ditunda.
- Penyebutan harga diubah menjadi harga per sesi.

## Keamanan dan konsistensi data

- Pembuatan paket memakai kunci idempotensi.
- Klaim promo, penerimaan tutor, pembukaan tagihan, dan verifikasi pembayaran
  memakai transaksi serta penguncian baris.
- Status paket, mapel, sesi, booking, peserta, order, dan klaim promo diperbarui
  dalam transaksi yang sama.
- Scheduler membedakan tagihan paket dari tagihan sesi tunggal dan melepaskan
  seluruh slot ketika batas 48 jam berakhir.
- Pembayaran yang baru diverifikasi setelah sesi pertama dimulai masuk antrean
  refund penuh; paket tidak diaktifkan.
- Gambar dibatasi ke JPG, PNG, atau WebP maksimal 5 MB.
- Bukti pembayaran tetap disimpan privat seperti pada Tahap 3.
- Migration Tahap 5 tidak menghapus data Tahap 1–4.

## Pemeriksaan

- ESLint lulus.
- TypeScript lulus.
- Pemeriksaan struktur PHP lulus.
- Kontrak Tahap 1–4 tetap dijalankan.
- Kontrak pengalaman Tahap 5 memeriksa migration, rute, aturan paket, promo,
  pembayaran, CRUD, dashboard, navigasi, dan landing page.
- Build produksi dan anggaran performa dijalankan oleh `npm run check`.
- Tes Laravel tambahan tersedia pada
  `tests/Feature/StageFivePackageExperienceTest.php`.

PHP, Composer, dan MySQL tidak tersedia pada lingkungan penyusunan. Jalankan
`scripts\test-tahap5.ps1` melalui PowerShell Laragon untuk migration serta tes
perilaku backend.

## Batas Tahap 5

- Paket tiga bulan belum diaktifkan; admin dapat menambahkannya setelah evaluasi.
- Satu transaksi belum mendukung penumpukan beberapa voucher.
- Cashback, referral, payment gateway, dan pencairan otomatis belum dibuat.
- Banner awal memakai latar gradasi sampai admin mengunggah gambar final.
- Kelas grup tetap berada sebagai fondasi lama dan bukan bagian alur paket Tahap 5.

## Larangan pemasangan

Jangan menjalankan `php artisan migrate:fresh`. Perintah tersebut menghapus
seluruh data. Gunakan migration bertahap dari paket ini.
