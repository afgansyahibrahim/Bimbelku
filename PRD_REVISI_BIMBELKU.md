# PRD BimbelKu — Revisi Final

Versi keputusan: 30 Juli 2026  
Status: sumber acuan produk dan implementasi

## 1. Tujuan produk

BimbelKu membantu murid memperoleh tutor yang benar-benar sesuai tanpa menjadikan aplikasi sebagai katalog untuk memilih-milih pengajar. Sistem mencocokkan kebutuhan belajar, jadwal, mode, performa, pemerataan kesempatan, dan jarak.

Istilah resmi dalam produk adalah **tutor**. Tidak ada status premium atau profesional. Semua tutor wajib melewati standar verifikasi yang sama.

## 2. Peran

### Murid

- Mendaftar dan menyetujui kebijakan layanan.
- Memilih paket, membagi sesi per mapel, serta memilih tanggal dan slot aplikasi.
- Mengaktifkan lokasi untuk kelas offline.
- Meninjau satu profil tutor hasil pencocokan.
- Menerima atau menolak hasil dengan alasan.
- Mentransfer biaya ke admin dan mengunggah bukti.
- Mengikuti sesi, menyetujui penyelesaian, atau mengajukan keberatan.
- Melihat transaksi, refund, kelas, notifikasi, dan bantuan.
- Mengklaim voucher, memasukkan kode promo, serta memperpanjang dengan tutor lama.

### Tutor

- Mengunggah dokumen verifikasi.
- Memilih satu mata pelajaran utama dan satu atau beberapa jenjang.
- Mengatur mode mengajar, lokasi, jarak tempuh, dan jam tersedia.
- Menerima atau menolak penawaran.
- Melihat materi sebelum menerima.
- Menambahkan tautan pertemuan untuk kelas online.
- Mengunggah bukti penyelesaian.
- Melaporkan murid tidak hadir atau keadaan darurat.
- Melihat poin, pendapatan, dan bukti pencairan.

### Admin

- Memverifikasi tutor.
- Mengatur tarif online/offline, privat/kelompok, dan tarif khusus materi bila perlu.
- Mengatur komisi, rekening pembayaran, jumlah kelompok, serta waktu tunggu.
- Memverifikasi atau menolak bukti pembayaran.
- Memeriksa kelas, laporan, keberatan, keadaan darurat, dan bukti penyelesaian.
- Mentransfer refund dan pendapatan tutor secara manual.
- Mengelola materi, pengguna, ulasan, notifikasi, bantuan, dan tampilan publik.
- Mengelola paket, slot jadwal, promo, banner, dan tutorial.

## 3. Pendaftaran dan persetujuan

- Murid langsung aktif setelah pendaftaran.
- Tutor berstatus menunggu sampai diverifikasi admin.
- Waktu persetujuan, versi kebijakan, IP, dan user-agent dicatat.
- Dokumen tutor terdiri dari kartu identitas, foto wajah langsung, ijazah/kualifikasi, dan sertifikat pendukung opsional.
- Perubahan dokumen verifikasi tutor aktif memicu pemeriksaan ulang dan menutup token login aktif.
- Tutor dengan poin nol dinonaktifkan.

## 4. Materi belajar

Struktur utama:

```text
Jenjang → Kelas → Mata pelajaran → Bab → Submateri
```

Murid juga dapat menulis tujuan, catatan, dan mengunggah satu lampiran. Admin mengelola katalog bab dan submateri. Jika materi belum tersedia, murid tetap dapat menjelaskan kebutuhan melalui catatan.

Materi kurikulum harus bersumber dari rujukan yang sah. Produk lain hanya boleh menjadi referensi pola tampilan, bukan sumber untuk menyalin data berhak cipta.

## 5. Paket dan jadwal

- Paket awal terdiri dari 1 sesi/7 hari, 4 sesi/30 hari, 8 sesi/30 hari,
  dan 12 sesi/30 hari.
- Paket 4, 8, dan 12 sesi memuat maksimal 1, 2, dan 3 mapel.
- Satu sesi berlangsung tepat 60 menit.
- Murid membagi jumlah sesi per mapel dan memilih seluruh jadwal sejak awal.
- Jam tidak diketik bebas; murid memilih slot aktif yang dikelola admin.
- Jadwal paling cepat dimulai 72 jam dari waktu pemesanan.
- Tutor mengisi rentang jam kosong untuk setiap hari.
- Tutor hanya dapat menerima jika seluruh sesi mapelnya berada dalam rentang tersebut.
- Benturan menggunakan aturan interval: sesi baru tidak boleh memotong sesi atau penawaran aktif.
- Sisa rentang tetap dapat digunakan. Contoh: tersedia 18.00–22.00, terisi 18.00–20.00, maka 20.00–22.00 tetap dapat dipesan.
- Satu paket dapat mempunyai tutor berbeda untuk setiap mapel.

## 6. Pencocokan tutor

Urutan kelayakan:

1. Akun tutor aktif dan terverifikasi.
2. Tutor menerima permintaan baru dan tidak sedang dibatasi.
3. Mata pelajaran dan jenjang sesuai.
4. Mode serta jenis kelas aktif.
5. Jadwal tersedia dan tidak bertabrakan.
6. Untuk offline, koordinat dan radius memenuhi.
7. Poin, pemerataan jumlah penugasan, serta pengacakan deterministik menentukan urutan.

Radius offline:

```text
3 km → 5 km → 8 km → 12 km
```

Tutor terdekat diprioritaskan per kelompok jarak. Tutor mendatangi alamat murid. Sebelum pembayaran dikonfirmasi, tutor hanya melihat jarak perkiraan; alamat lengkap baru dibuka setelah pembayaran diterima admin.

Tampilan pencarian memakai radar animasi, status proses yang jelas, radius aktif, dan tombol tindakan; bukan spinner generik.

## 7. Respons tutor dan masa pencarian

- Penawaran tutor memiliki batas maksimal 12 jam, tetapi otomatis dipendekkan jika jadwal sudah dekat.
- Pencarian pertama berlangsung maksimal 12 jam.
- Murid dapat memperpanjang sampai maksimal 48 jam sejak permintaan awal.
- Tutor yang tidak menjawab dibatasi menerima murid selama 3 jam.
- Pengulangan dalam jendela 30 hari meningkatkan pembatasan menjadi 6, 12, dan 24 jam.
- Mulai pengulangan kedua, poin berkurang 5.
- Penolakan aktif oleh tutor tidak otomatis mengurangi poin.
- Untuk perpanjangan, tutor lama mendapat penawaran prioritas dan slot pembayaran
  ditahan paling lama 48 jam setelah seluruh tutor menerima.

## 8. Profil tutor dan penolakan murid

Profil hanya muncul setelah tutor menerima. Murid tidak memperoleh katalog maupun daftar pembanding.

Penolakan berurutan yang bukan akibat kesalahan materi, jarak, atau sistem:

| Penolakan | Pembatasan |
|---:|---:|
| 1–2 | Tidak ada |
| 3 | 1 jam |
| 4 | 6 jam |
| 5 | 12 jam |
| 6 atau lebih | 24 jam |

Hitungan kembali nol setelah tutor diterima atau setelah tujuh hari tanpa penolakan.

## 9. Harga, promo, dan komisi

- Harga ditentukan admin dan dihitung per sesi 60 menit.
- Online dan offline dapat memiliki harga berbeda.
- Privat dan kelompok dapat memiliki harga berbeda.
- Tarif khusus mata pelajaran/jenjang dapat menggantikan tarif bawaan.
- Nilai awal instalasi baru adalah Rp40.000 per sesi untuk empat kombinasi mode/jenis.
- Promo mendukung potongan persentase atau nominal, kuota, periode, minimal
  transaksi, batas akun, paket, jenjang, mapel, mode, dan murid baru.
- Satu transaksi hanya memakai satu voucher atau satu kode promo.
- Harga akhir dan kelayakan promo selalu dihitung backend.
- Komisi awal admin adalah 20%.
- Persentase komisi disimpan pada booking sehingga perubahan admin tidak mengubah transaksi lama.
- Tidak ada biaya perjalanan otomatis.

## 10. Pembayaran manual

Alur paket:

1. Semua tutor mapel menerima seluruh jadwalnya.
2. Tagihan agregat paket dibuka.
3. Murid memilih satu voucher atau memasukkan satu kode promo.
4. Murid mentransfer ke rekening admin.
5. Murid mengunggah bukti, nama pengirim, bank, serta nomor rekening/e-wallet asal sebagai tujuan refund bila diperlukan.
6. Admin membandingkan bukti dengan mutasi rekening.
7. Admin menerima atau menolak dengan alasan.
8. Bukti ditolak dapat diunggah ulang sebelum tenggat.
9. Setelah diterima, seluruh sesi paket dikonfirmasi dan masuk ke Kelas Saya.

Rekening tujuan tidak dapat diubah admin selama masih ada tagihan aktif atau bukti transfer yang menunggu pemeriksaan. Ketentuan ini mencegah instruksi transfer berubah di tengah proses.

Tidak ada payment gateway, QRIS dinamis, webhook pembayaran, escrow otomatis, atau transfer otomatis. Gambar QRIS statis dapat dipasang admin sebagai salah satu instruksi transfer.

## 11. Kelas kelompok

- Kelas kelompok ditunda dan tidak dipromosikan pada landing page atau alur paket.
- Fondasi lama tetap dipertahankan untuk kompatibilitas data dan pengembangan berikutnya.
- Tahap 5 menggunakan paket kelas privat.

## 12. Pelaksanaan dan penyelesaian

Tutor mengunggah foto bukti dan catatan minimal setelah mendekati waktu sesi. Setelah itu:

- Murid memiliki 48 jam untuk menyetujui atau mengajukan keberatan.
- Persetujuan murid bersifat final.
- Keberatan menahan pencairan dan masuk Pusat Kasus admin.
- Jika murid diam selama 48 jam, penyelesaian tidak otomatis disahkan; admin wajib memeriksa.
- Pendapatan baru berstatus siap cair setelah seluruh peserta terkait selesai diputuskan.

## 13. Ketidakhadiran

### Murid tidak hadir

- Tutor dapat melapor setelah keterlambatan lebih dari 15 menit.
- Kronologi dan bukti wajib.
- Admin menerima atau menolak laporan.
- Jika diterima, pembayaran murid hangus dan menjadi pendapatan tutor.
- Jika ditolak, tutor dapat dikenai pengurangan poin.

### Tutor tidak hadir

- Murid dapat melapor setelah keterlambatan lebih dari 15 menit.
- Admin memeriksa bukti.
- Jika diterima, seluruh peserta yang membayar mendapat refund penuh.
- Tutor mendapat sanksi poin sesuai keputusan admin.

## 14. Keadaan darurat

Tutor wajib mengisi:

- jenis kejadian;
- kronologi;
- waktu;
- lokasi;
- dampak terhadap sesi;
- bukti yang jelas dan dapat dipercaya.

Laporan boleh dibuat setelah jadwal terbentuk. Refund penuh peserta langsung masuk antrean admin. Admin tetap memeriksa validitas laporan. Laporan ditolak menghasilkan sanksi. Kejadian berulang tetap diperiksa admin untuk mencegah penyalahgunaan.

## 15. Poin tutor

- Poin awal 150.
- Maksimum 200.
- Poin 0 menonaktifkan akun.
- Rating 5 memberi +2.
- Rating 4 memberi +1.
- Rating 3 tidak mengubah poin.
- Rating 2 memberi −5.
- Rating 1 memberi −10.
- Sanksi kasus dapat bernilai −5, −10, −15, −20, atau −30.

| Poin | Perlakuan rekomendasi |
|---:|---|
| 151–200 | Prioritas |
| 121–150 | Normal |
| 81–120 | Dikurangi |
| 41–80 | Sangat dibatasi |
| 1–40 | Paling rendah |
| 0 | Dinonaktifkan |

Semua perubahan disimpan pada buku besar poin dengan alasan, booking, aktor, dan saldo akhir.

## 16. Refund dan pencairan

- Refund selalu penuh untuk kasus yang disetujui.
- Tujuan refund memakai bank/e-wallet asal yang dicatat bersama bukti pembayaran.
- Admin mentransfer refund secara manual dan mengunggah bukti.
- Pendapatan tutor dihitung dari peserta yang benar-benar berhak menjadi pendapatan.
- Nilai bersih = nilai bruto × (100 − persentase komisi).
- Admin mengelompokkan booking siap cair per tutor, mentransfer manual, lalu mengunggah bukti.
- Booking yang sudah dicairkan tidak dapat dicairkan ulang.

## 17. Notifikasi dan konfirmasi

- Semua hasil aksi memakai toast aplikasi.
- Keluar akun, menerima tutor, membatalkan, menyetujui penyelesaian, menerima pembayaran, menghapus data, memutus kasus, refund, dan pencairan memakai dialog aplikasi.
- Tidak ada notifikasi bawaan browser.
- Polling hanya berjalan ketika tab terlihat dan memakai interval ringan.
- Dashboard murid memakai banner CRUD yang berganti setiap empat detik.
- Banner dapat membuka halaman internal aman atau tautan HTTPS.
- Tutorial carousel per peran dapat dibuka kembali dan dikelola admin.

## 18. Privasi dan keamanan

- API dibatasi dengan Sanctum dan middleware peran.
- Pengguna hanya dapat membuka sumber daya miliknya.
- Dokumen identitas, lampiran materi, bukti pembayaran, bukti sesi, laporan, sengketa, refund, pencairan, dan lampiran bantuan disimpan privat.
- Endpoint file memeriksa admin, pemilik, tutor yang dipasangkan, atau peserta.
- Data koordinat dan alamat lengkap tidak diberikan kepada tutor sebelum pembayaran dikonfirmasi; calon tutor hanya melihat jarak perkiraan.
- Kata sandi di-hash; token reset juga disimpan dalam bentuk hash.
- Reset kata sandi menutup seluruh token login.
- Login, registrasi, dan reset password dibatasi laju permintaannya.
- Origin CORS berasal dari konfigurasi.

## 19. Kriteria penerimaan

- Murid tidak dapat memilih tutor dari daftar.
- Tutor di luar slot atau berbenturan tidak pernah ditawarkan.
- Murid tidak dapat mengirim jam yang tidak termasuk slot aktif admin.
- Tagihan paket tidak terbuka sebelum seluruh tutor mapel menerima.
- Harga promo tidak dapat dimanipulasi dari frontend.
- Voucher atau kode promo tidak dapat dipakai dua kali pada transaksi yang sama.
- Radius offline tidak melebihi 12 km.
- Jumlah dan komisi tidak berubah setelah transaksi dibuat.
- Pembayaran tidak mengonfirmasi kelas tanpa keputusan admin.
- Bukti yang ditolak dapat diperbaiki.
- Refund/payout tidak dapat diproses dua kali.
- Murid tidak dapat keberatan setelah menyetujui.
- Tutor atau murid yang bukan bagian sesi tidak dapat membuka bukti.
- Tombol berisiko selalu meminta konfirmasi khusus aplikasi.
- Seluruh halaman utama dapat dibangun tanpa error TypeScript.
