# PRD BimbelKu — Revisi Final

Versi keputusan: 27 Juli 2026  
Status: sumber acuan produk dan implementasi

## 1. Tujuan produk

BimbelKu membantu murid memperoleh tutor yang benar-benar sesuai tanpa menjadikan aplikasi sebagai katalog untuk memilih-milih pengajar. Sistem mencocokkan kebutuhan belajar, jadwal, mode, performa, pemerataan kesempatan, dan jarak.

Istilah resmi dalam produk adalah **tutor**. Tidak ada status premium atau profesional. Semua tutor wajib melewati standar verifikasi yang sama.

## 2. Peran

### Murid

- Mendaftar dan menyetujui kebijakan layanan.
- Menentukan materi, tanggal, jam, durasi, mode, dan jenis kelas.
- Mengaktifkan lokasi untuk kelas offline.
- Meninjau satu profil tutor hasil pencocokan.
- Menerima atau menolak hasil dengan alasan.
- Mentransfer biaya ke admin dan mengunggah bukti.
- Mengikuti sesi, menyetujui penyelesaian, atau mengajukan keberatan.
- Melihat transaksi, refund, kelas, notifikasi, dan bantuan.

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

## 5. Jadwal

- Tidak ada paket dengan masa berlaku atau negosiasi jadwal setelah pencocokan.
- Murid memilih tanggal, jam mulai, dan durasi sejak awal.
- Tutor mengisi rentang jam kosong untuk setiap hari.
- Tutor hanya menjadi kandidat jika seluruh sesi berada dalam rentang tersebut.
- Benturan menggunakan aturan interval: sesi baru tidak boleh memotong sesi atau penawaran aktif.
- Sisa rentang tetap dapat digunakan. Contoh: tersedia 18.00–22.00, terisi 18.00–20.00, maka 20.00–22.00 tetap dapat dipesan.
- Implementasi menerima durasi 1–4 jam dan menolak sesi yang melewati pergantian hari.

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

## 9. Harga dan komisi

- Harga ditentukan admin dan dihitung per jam.
- Online dan offline dapat memiliki harga berbeda.
- Privat dan kelompok dapat memiliki harga berbeda.
- Tarif khusus mata pelajaran/jenjang dapat menggantikan tarif bawaan.
- Nilai awal instalasi baru adalah Rp40.000 per jam untuk empat kombinasi mode/jenis.
- Komisi awal admin adalah 20%.
- Persentase komisi disimpan pada booking sehingga perubahan admin tidak mengubah transaksi lama.
- Tidak ada biaya perjalanan otomatis.

## 10. Pembayaran manual

Alur:

1. Tutor menerima permintaan.
2. Murid menerima profil.
3. Tagihan dibuka.
4. Murid mentransfer ke rekening admin.
5. Murid mengunggah bukti, nama pengirim, bank, serta nomor rekening/e-wallet asal sebagai tujuan refund bila diperlukan.
6. Admin membandingkan bukti dengan mutasi rekening.
7. Admin menerima atau menolak dengan alasan.
8. Bukti ditolak dapat diunggah ulang sebelum tenggat.
9. Setelah diterima, kelas dikonfirmasi.

Rekening tujuan tidak dapat diubah admin selama masih ada tagihan aktif atau bukti transfer yang menunggu pemeriksaan. Ketentuan ini mencegah instruksi transfer berubah di tengah proses.

Tidak ada payment gateway, QRIS dinamis, webhook pembayaran, escrow otomatis, atau transfer otomatis. Gambar QRIS statis dapat dipasang admin sebagai salah satu instruksi transfer.

## 11. Kelas kelompok

- Kelompok dibentuk otomatis dari materi, jenjang, jadwal, mode, dan lokasi yang kompatibel.
- Minimal, maksimal, dan waktu tunggu dapat diubah admin.
- Nilai awal: minimal 2, maksimal 5, waktu tunggu 24 jam.
- Pencarian tutor dimulai setelah jumlah minimum terpenuhi.
- Pembayaran baru dibuka setelah semua anggota aktif menerima profil tutor.
- Kelas dapat dimulai setelah jumlah pembayaran minimum terpenuhi.
- Anggota yang tidak membayar sampai tenggat dikeluarkan.
- Jika pembayaran minimum tidak terpenuhi, pembayaran yang sudah diterima masuk antrean refund penuh.
- Jika kelompok belum terbentuk, murid memilih mengubah ke privat atau membatalkan.
- Identitas anggota tidak dibuka kepada anggota lain.

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
- Radius offline tidak melebihi 12 km.
- Jumlah dan komisi tidak berubah setelah transaksi dibuat.
- Pembayaran tidak mengonfirmasi kelas tanpa keputusan admin.
- Bukti yang ditolak dapat diperbaiki.
- Refund/payout tidak dapat diproses dua kali.
- Murid tidak dapat keberatan setelah menyetujui.
- Tutor atau murid yang bukan bagian sesi tidak dapat membuka bukti.
- Tombol berisiko selalu meminta konfirmasi khusus aplikasi.
- Seluruh halaman utama dapat dibangun tanpa error TypeScript.
