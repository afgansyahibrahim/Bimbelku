# Catatan Revisi Final

Dokumen ini merangkum perubahan utama dari rancangan lama ke keputusan terbaru.

## Dihapus

- Katalog dan pencarian tutor manual.
- Pemilihan tutor dari banyak profil.
- Negosiasi jadwal setelah pemesanan dan input jam paket secara bebas.
- Payment gateway, webhook, QRIS dinamis, dan pencairan otomatis.
- Layanan premium/profesional.
- Biaya perjalanan otomatis.
- Endpoint perbaikan database yang dapat dipanggil publik.
- Frontend Vite ganda di dalam backend.
- Komponen pembayaran/rating lama yang sudah tidak dipakai.
- Dependensi `lovable-tagger`, React Query, library UI, serta puluhan komponen Shadcn yang tidak digunakan.
- Lockfile Bun lama dari paket final; proyek memakai npm dan `package-lock.json` sebagai acuan tunggal.

## Diubah

- Murid memilih tanggal dan jam sebelum pencarian.
- Tutor mengisi rentang jam tersedia.
- Pencocokan memeriksa benturan sampai level interval waktu.
- Profil tutor tampil setelah tutor menerima, sebelum pembayaran.
- Pembayaran masuk ke admin secara manual.
- Radius offline berubah menjadi 3, 5, 8, dan 12 km.
- Tutor terdekat diprioritaskan dengan pemerataan penugasan.
- Harga dipusatkan pada admin dan dihitung per sesi 60 menit.
- Komisi awal menjadi 20% dan disimpan per transaksi.
- Istilah pengajar diseragamkan menjadi tutor.
- Bukti sensitif dipindahkan ke penyimpanan privat.
- Reset kata sandi memakai token ter-hash dan URL frontend dari environment.

## Ditambahkan

- Radar animasi pada proses pencarian.
- Kelas kelompok dengan kapasitas dan waktu tunggu admin.
- Pilihan ubah kelompok menjadi privat atau batal.
- Cooldown murid akibat penolakan tutor berulang.
- Pembatasan tutor akibat tidak menjawab.
- Poin tutor 0–200 dan buku besar perubahan.
- Bukti pelaksanaan dan masa keberatan 48 jam.
- Laporan murid/tutor tidak hadir.
- Laporan keadaan darurat beserta kronologi dan bukti.
- Pusat Kasus admin.
- Antrean refund penuh serta bukti transfer.
- Pencairan manual tutor dengan rekonsiliasi bruto, komisi, dan netto.
- Dialog konfirmasi global dan notifikasi aplikasi.
- Halaman admin materi dan tarif.
- Proteksi dokumen/bukti per peran.
- Paket 1, 4, 8, dan 12 sesi dengan pembagian maksimal tiga mapel.
- Slot jam yang dikelola admin dan dipilih dari aplikasi.
- Pencocokan tutor per mapel serta satu tagihan setelah seluruh tutor menerima.
- Perpanjangan per mapel dengan prioritas tutor lama.
- Voucher, kode promo, kuota, sasaran promo, dan harga coret.
- Banner dashboard empat detik serta tutorial carousel yang dikelola admin.
- Dashboard murid adaptif dan navigasi Beranda, Kelas Saya, Cari Les, Voucher, Akun.
- Penyempurnaan landing page tanpa mengganti identitas oranye.

## Prinsip kompatibilitas

- Migration final memindahkan berkas sensitif lama dari disk publik ke disk privat dan menghapus salinan publik setelah salinan privat terverifikasi.
- Transaksi lama mempertahankan persentase komisinya.
- Migration final membersihkan tabel/kolom harga paket lama yang sudah tidak dipakai, sementara transaksi historis tetap dibaca melalui snapshot.
- Akun demo hanya dibuat jika `SEED_DEMO_USERS=true`.
