# Rancangan Sistem Pemesanan dan Pencarian Guru Bimbelku

## 1. Tujuan dokumen

Dokumen ini menjadi acuan utama untuk memperbaiki alur pemesanan, pemilihan jadwal, pembayaran, pencarian guru, respons guru, dan penanganan pesanan yang gagal memperoleh guru.

Target akhirnya adalah sistem yang:

- mudah dipahami murid, guru, dan admin;
- ringan serta tidak melakukan proses yang tidak diperlukan;
- cepat mencari guru tanpa membanjiri guru dengan penawaran;
- melindungi guru dari pesanan main-main;
- tidak membiarkan pesanan berhenti tanpa kejelasan;
- mempunyai status dan batas waktu yang tegas;
- mudah dipantau serta dipulihkan ketika proses otomatis bermasalah;
- mempunyai aturan yang terpusat sehingga tampilan dan backend tidak berbeda.

## 2. Prinsip utama

1. **Pembayaran dilakukan sebelum pencarian guru dimulai.** Hal ini mengurangi risiko murid membuat pesanan main-main dan menyita waktu guru.
2. **Pembayaran belum berarti guru sudah dijamin.** Uang harus tetap dapat ditelusuri dan ditangani dengan jelas apabila guru tidak ditemukan.
3. **Guru yang tersedia belum tentu menerima.** Karena itu, sistem menggunakan istilah peluang atau tingkat ketersediaan, bukan janji “pasti ada guru”.
4. **Maksimal tiga penawaran guru aktif dalam waktu bersamaan.** Slot yang kosong langsung diisi kandidat berikutnya tanpa menunggu satu gelombang selesai.
5. **Jadwal rekomendasi tidak boleh mengubah aturan paket secara diam-diam.** Hari, jumlah pertemuan, jarak antarsesi, dan pola mingguan harus tetap masuk akal.
6. **Semua proses otomatis harus dapat dilihat dan dipulihkan.** Admin perlu mengetahui kapan pencarian berikutnya berjalan dan mengapa pesanan belum bergerak.

## 3. Istilah

- **Lead time:** jarak minimal antara waktu pemesanan dan dimulainya sesi pertama. Contoh: pemesanan minimal 24 jam sebelum kelas pertama.
- **Kandidat:** guru yang memenuhi seluruh syarat dasar pesanan.
- **Penawaran aktif:** permintaan mengajar yang sedang menunggu jawaban seorang guru.
- **Rolling pool:** sistem yang selalu menjaga maksimal tiga penawaran aktif dan langsung mengisi slot yang kosong.
- **Batas pencarian:** waktu terakhir sistem diperbolehkan mencari guru sebelum sesi pertama.
- **Tidak merespons:** guru tidak menekan Terima atau Tolak sampai penawaran kedaluwarsa.
- **Menolak:** guru secara sadar menekan tombol Tolak. Guru ini tidak ditawari ulang pesanan yang sama.

## 4. Alur utama pemesanan

```text
Murid memilih layanan dan jadwal
              ↓
Sistem memvalidasi seluruh tanggal pertemuan
              ↓
Sistem menampilkan tingkat peluang memperoleh guru
              ↓
Murid melakukan checkout dan pembayaran
              ↓
Admin/sistem memverifikasi pembayaran
              ↓
Pencarian guru dimulai dengan rolling pool maksimal 3 guru
              ↓
      ┌───────┴────────┐
      ↓                ↓
Guru menerima     Belum ada guru
      ↓                ↓
Pesanan aktif     Cari kandidat berikutnya/
dan penawaran     tawarkan tindakan kepada murid
lain ditutup
```

### 4.1 Sebelum checkout

Sistem harus memeriksa:

- mata pelajaran dan jenjang;
- mode belajar online atau offline;
- lokasi dan radius untuk kelas offline;
- tanggal mulai;
- pola hari dan frekuensi per minggu;
- jam mulai dan durasi;
- seluruh tanggal pertemuan dalam paket;
- lead time sesi pertama;
- jam operasional;
- kemungkinan tersedianya guru yang sama untuk seluruh sesi.

Jika peluang memperoleh guru rendah, murid boleh tetap melanjutkan, tetapi sistem harus memberikan peringatan dan menawarkan jadwal alternatif.

### 4.2 Pembayaran

- Pesanan belum masuk proses pencarian sebelum pembayaran terverifikasi.
- Batas pembayaran tidak boleh sama persis dengan batas akhir pencarian guru.
- Harus tersedia waktu yang cukup setelah verifikasi pembayaran untuk menjalankan pencarian.
- Nominal, bukti pembayaran, waktu verifikasi, dan petugas verifikasi harus tercatat.
- Jika pencarian berakhir tanpa guru, status dana dan pilihan murid harus ditampilkan dengan jelas.

### 4.3 Saran batas waktu

Nilai akhir sebaiknya dapat diubah melalui pengaturan, bukan ditulis berulang di banyak file.

| Aturan | Rekomendasi awal |
|---|---:|
| Pemesanan baru sebelum sesi pertama | minimal 24 jam |
| Perpanjangan dengan guru yang sama | minimal 12 jam |
| Masa berlaku satu penawaran guru | 60 menit |
| Pengingat penawaran | sekitar menit ke-30 |
| Penawaran ulang guru yang diam | maksimal 1 kali setelah kandidat baru habis |

Angka tersebut adalah nilai awal yang perlu diuji dalam penggunaan nyata. Batas pembayaran dan batas pencarian harus dihitung agar tidak menyisakan waktu nol setelah pembayaran diverifikasi.

## 5. Pemilihan tanggal, hari, dan jam

### 5.1 Tanggal dan hari tidak dipilih secara terpisah

Murid memilih tanggal mulai, lalu nama hari diturunkan otomatis dari tanggal tersebut. Hal ini mencegah kombinasi yang bertentangan, misalnya tanggal yang sebenarnya Selasa tetapi diberi label Rabu.

### 5.2 Pola jadwal paket

Murid memilih pola yang teratur sesuai frekuensi paket, misalnya:

- 1 kali per minggu: Rabu;
- 2 kali per minggu: Selasa dan Jumat;
- 3 kali per minggu: Senin, Rabu, dan Jumat.

Sistem kemudian menghasilkan seluruh tanggal pertemuan. Jumlah pertemuan dan frekuensi tidak boleh berubah hanya karena rekomendasi ketersediaan guru.

Contoh paket dua kali seminggu:

```text
Tanggal mulai : Selasa, 1 September
Pola          : Selasa dan Jumat
Jam           : 16.00

1. Selasa, 1 September  — 16.00
2. Jumat, 4 September   — 16.00
3. Selasa, 8 September  — 16.00
4. Jumat, 11 September  — 16.00
```

### 5.3 Aturan daftar jam

- Jam yang tampil harus berasal dari satu konfigurasi jam operasional.
- Pilihan malam tidak boleh hilang hanya karena pembangkitan slot berhenti terlalu awal.
- Jam terakhir harus memperhitungkan durasi kelas. Jika operasional berakhir pukul 21.00 dan durasi 90 menit, kelas tidak boleh dimulai pukul 20.30.
- Zona waktu menggunakan zona sistem yang ditetapkan, untuk sekarang `Asia/Jakarta`.
- Validasi di tampilan dan backend wajib menggunakan aturan yang sama.

## 6. Fitur “Rekomendasikan jadwal terbaik”

Fitur ini merupakan pelengkap pemilihan jadwal manual, bukan pengganti dan bukan penutup bug pada daftar jam.

### 6.1 Tujuan

- membantu murid menemukan waktu dengan peluang respons lebih tinggi;
- mengurangi pesanan yang masuk ke jadwal tanpa kandidat;
- mempercepat pencarian tanpa membuat pola hari acak;
- tetap memberikan kendali akhir kepada murid.

### 6.2 Perilaku utama

Tombol **Rekomendasikan jadwal terbaik** ditempatkan di bagian pemilihan jadwal.

Secara default sistem memakai mode **Pertahankan hari**:

- tanggal dan pola hari tidak berubah;
- sistem hanya mencari jam lain yang lebih berpeluang;
- seluruh sesi paket diperiksa, bukan hanya sesi pertama;
- rekomendasi dibatasi maksimal tiga pilihan terbaik.

Pilihan tambahan **Lihat alternatif hari** hanya dibuka atas tindakan murid:

- sistem boleh menyarankan pola hari lain yang tetap teratur;
- frekuensi dan jumlah pertemuan tidak berubah;
- perubahan tidak diterapkan sebelum murid menyetujuinya;
- seluruh rangkaian tanggal ditampilkan sebelum dikonfirmasi.

### 6.3 Informasi yang ditampilkan

Gunakan bahasa probabilitas:

```text
Jadwal pilihanmu
Selasa dan Jumat, 19.00
Peluang memperoleh guru: Rendah

Rekomendasi dengan hari yang sama
Selasa dan Jumat, 17.00 — Tinggi
Selasa dan Jumat, 16.00 — Tinggi

Alternatif pola hari
Rabu dan Sabtu, 17.00 — Sangat tinggi
```

Hindari kalimat “pasti ada guru”. Jika jumlah kandidat ditampilkan, tulis sebagai perkiraan, misalnya “sekitar lima guru berpotensi tersedia”.

### 6.4 Cara menilai rekomendasi

Sebuah jadwal hanya mendapat nilai tinggi jika guru yang sama berpotensi memenuhi seluruh sesi. Penilaian dapat mempertimbangkan:

- jumlah kandidat untuk seluruh rangkaian pertemuan;
- aktivitas terbaru kandidat;
- tingkat dan kecepatan respons kandidat;
- kecocokan mata pelajaran, jenjang, dan mode;
- jarak untuk kelas offline;
- bentrok jadwal;
- beban mengajar kandidat;
- lead time yang tersisa.

Contoh label awal:

| Label | Kondisi awal |
|---|---|
| Sangat tinggi | banyak kandidat yang cocok untuk seluruh sesi |
| Tinggi | setidaknya beberapa kandidat kuat |
| Terbatas | hanya sedikit kandidat |
| Tidak tersedia | tidak ada kandidat yang memenuhi syarat saat diperiksa |

Batas jumlah kandidat sebaiknya menjadi konfigurasi dan disesuaikan setelah ada data penggunaan.

## 7. Penyaringan dan pengurutan guru

Pencarian dibagi menjadi dua tahap agar mudah ditelusuri.

### 7.1 Syarat mutlak

Guru harus:

- berstatus aktif dan terverifikasi;
- sedang menerima permintaan;
- mengajar mata pelajaran berdasarkan ID yang stabil, bukan hanya kesamaan tulisan nama;
- sesuai dengan jenjang dan mode pembelajaran;
- tersedia untuk seluruh sesi paket;
- tidak memiliki jadwal bentrok;
- berada dalam radius yang diizinkan untuk kelas offline;
- tidak pernah menolak pesanan yang sama;
- tidak sedang terkena pembatasan yang sah.

### 7.2 Urutan kandidat

Guru yang lolos dapat diurutkan berdasarkan gabungan:

1. guru yang dipilih secara eksplisit untuk perpanjangan;
2. kecocokan dengan kebutuhan pesanan;
3. aktivitas terbaru;
4. tingkat respons dan median waktu respons;
5. kualitas atau poin yang relevan;
6. jarak untuk kelas offline;
7. beban/jumlah penugasan agar pembagian tetap adil;
8. riwayat belajar dengan murid sebagai nilai tambah.

Catatan:

- Guru sebelumnya mendapat prioritas tambahan, tetapi tidak selalu mutlak, kecuali murid memang memilih perpanjangan bersama guru tersebut.
- Guru baru tidak boleh otomatis terkubur karena belum mempunyai banyak data respons.
- Poin kualitas tidak boleh dianggap sama dengan kemungkinan guru merespons.
- Rumus penilaian harus dapat dijelaskan dan dicatat untuk kebutuhan audit.

## 8. Mekanisme rolling pool tiga guru

### 8.1 Aturan dasar

- Maksimal tiga guru menerima penawaran aktif untuk satu pesanan.
- Setiap guru mempunyai waktu respons sendiri selama 60 menit.
- Jika guru menolak, slot langsung diberikan kepada kandidat berikutnya.
- Jika penawaran kedaluwarsa, slot langsung diberikan kepada kandidat berikutnya.
- Tidak perlu menunggu seluruh kelompok awal selesai.
- Guru pertama yang menerima menjadi guru pesanan melalui transaksi atomik.
- Penawaran aktif lain langsung ditutup sebagai `dibatalkan karena guru telah ditemukan`.

### 8.2 Contoh waktu

```text
00:00  Penawaran dikirim kepada A, B, dan C
00:05  A menolak → sistem langsung menawarkan kepada D
00:12  B menolak → sistem langsung menawarkan kepada E
00:30  C mendapat pengingat karena belum menjawab
00:42  D menerima → D ditetapkan sebagai guru
00:42  Penawaran C dan E otomatis ditutup
```

### 8.3 Penawaran ulang

- Guru yang menolak tidak ditawari ulang pesanan yang sama.
- Guru yang tidak merespons boleh ditawari ulang maksimal satu kali.
- Penawaran ulang hanya dilakukan setelah kandidat baru habis dan telah melewati jeda yang ditentukan.
- Sebelum penawaran kedaluwarsa, sistem cukup mengirim satu pengingat agar tidak melakukan spam.
- Pengabaian penawaran ulang yang sama tidak boleh menggandakan hukuman secara berlebihan.

## 9. Radius kelas offline

Murid menentukan batas jarak maksimal yang masih dapat diterima. Sistem dapat mencari bertahap, misalnya:

```text
3 km → 5 km → 8 km → 12 km
```

Pelebaran hanya boleh sampai batas yang disetujui murid. Setiap perubahan radius harus terlihat pada status pencarian. Jika murid tidak menyetujui pelebaran otomatis, sistem meminta persetujuan sebelum melanjutkan.

Jarak bukan satu-satunya ukuran. Sistem juga harus mempertimbangkan apakah perjalanan realistis terhadap jadwal guru sebelum dan sesudah sesi tersebut.

## 10. Respons, pengingat, dan perlindungan guru

Guru menerima informasi yang cukup sebelum menjawab:

- mata pelajaran dan jenjang;
- mode online/offline;
- area umum untuk offline tanpa membuka data sensitif terlalu awal;
- seluruh tanggal dan jam pertemuan;
- durasi dan jumlah sesi;
- kompensasi yang relevan;
- sisa waktu untuk merespons;
- konsekuensi jika berulang kali tidak merespons.

Aturan perlindungan:

- sekali tidak merespons belum langsung menyebabkan penangguhan;
- sistem lebih dahulu mengirim pengingat;
- pembatasan hanya diberlakukan jika pola tidak merespons terjadi berulang pada pesanan berbeda;
- penolakan aktif tidak dihukum karena lebih membantu daripada membiarkan penawaran kedaluwarsa;
- guru dapat mematikan sementara penerimaan pesanan;
- murid yang sudah membayar tidak dapat mengubah jadwal secara sepihak setelah guru menerima.

## 11. Status pesanan

Status harus mewakili kondisi nyata dan tidak memakai satu status untuk beberapa arti berbeda.

| Status | Arti |
|---|---|
| `draft` | Pesanan belum diselesaikan |
| `awaiting_payment` | Menunggu pembayaran |
| `payment_review` | Bukti pembayaran menunggu verifikasi |
| `matching` | Sistem aktif mencari guru |
| `retry_scheduled` | Pencarian berikutnya sudah dijadwalkan |
| `action_required` | Membutuhkan keputusan murid atau admin |
| `teacher_found` | Guru telah menerima dan ditetapkan |
| `active` | Paket pembelajaran sedang berjalan |
| `completed` | Seluruh kewajiban paket selesai |
| `cancelled` | Pesanan dibatalkan |
| `refund_pending` | Pengembalian dana sedang diproses |
| `refunded` | Dana telah dikembalikan |

Hindari menggunakan `no_teacher` untuk sekaligus berarti sedang menunggu retry, kandidat habis, dan pencarian sudah berakhir. Ketiga keadaan tersebut memerlukan tindakan serta pesan yang berbeda.

## 12. Informasi status untuk murid

Halaman pesanan setidaknya menunjukkan:

- status saat ini;
- jumlah penawaran aktif tanpa membuka identitas guru sebelum diperlukan;
- waktu pembaruan pencarian berikutnya;
- batas akhir pencarian;
- radius yang sedang digunakan untuk offline;
- tindakan yang tersedia;
- penjelasan mengenai dana jika pencarian gagal.

Contoh:

```text
Sedang mencari guru
3 guru sedang dihubungi.
Pencarian diperbarui otomatis paling lambat dalam 42 menit.
Batas pencarian: 31 Agustus, 17.00 WIB.
```

Jika pencarian tidak dapat diteruskan:

```text
Kami belum menemukan guru untuk seluruh jadwalmu.

[Lihat jadwal rekomendasi]
[Perluas radius]
[Ubah ke kelas online]
[Ajukan pengembalian dana]
```

## 13. Penanganan ketika guru tidak ditemukan

Urutannya:

1. isi terus rolling pool dari kandidat baru;
2. perluas radius secara bertahap jika sudah diizinkan;
3. kirim satu penawaran ulang kepada guru yang sebelumnya tidak merespons;
4. tawarkan jadwal dengan peluang lebih tinggi;
5. tawarkan perubahan mode jika relevan dan disetujui murid;
6. hentikan pencarian pada batas waktu;
7. minta keputusan murid atau proses pengembalian dana sesuai kebijakan.

Sistem tidak boleh melakukan retry tanpa batas atau terus memindai pesanan yang sebenarnya sudah mencapai keadaan akhir.

## 14. Kebutuhan halaman admin

Admin perlu melihat:

- semua penawaran aktif, bukan hanya satu “guru aktif”;
- guru yang menerima, menolak, tidak merespons, atau dibatalkan;
- waktu kedaluwarsa masing-masing penawaran;
- kandidat yang masih tersisa;
- alasan seorang guru tidak lolos penyaringan;
- waktu pencarian berikutnya;
- batas akhir pencarian;
- tahap radius saat ini;
- riwayat retry dan perubahan jadwal;
- status pembayaran serta pengembalian dana;
- kesehatan scheduler/worker pencarian.

Tindakan manual admin seperti mulai ulang pencarian, memperluas radius, atau mengubah jadwal harus membersihkan jadwal retry lama yang sudah tidak berlaku dan mencatat siapa yang melakukan perubahan.

## 15. Keandalan proses otomatis

- Scheduler harus berjalan teratur di server hosting.
- Gunakan heartbeat untuk mencatat kapan scheduler terakhir berhasil bekerja.
- Admin mendapat peringatan jika heartbeat terlambat.
- Proses harus idempoten: dijalankan dua kali tidak boleh membuat penawaran ganda.
- Penetapan guru harus menggunakan transaksi dan penguncian agar dua guru tidak menang bersamaan.
- Setiap retry mempunyai batas jumlah dan waktu.
- Nilai `next_matching_at` yang sudah tidak relevan harus dibersihkan saat status atau jadwal berubah.
- Pesanan yang selesai, dibatalkan, atau mencapai batas akhir tidak boleh terus dipindai.
- Pengiriman notifikasi yang gagal dicatat dan dapat dicoba ulang secara terbatas.

## 16. Notifikasi

### Untuk guru

- penawaran baru;
- pengingat sebelum kedaluwarsa;
- penawaran dibatalkan karena guru lain menerima;
- konfirmasi ketika berhasil mendapatkan pesanan;
- pemberitahuan jika status menerima permintaan dinonaktifkan.

### Untuk murid

- pembayaran diterima/diverifikasi;
- pencarian guru dimulai;
- jadwal perlu diperbaiki;
- guru ditemukan;
- pencarian mencapai batas waktu;
- perubahan radius atau jadwal yang membutuhkan persetujuan;
- status pengembalian dana.

### Untuk admin

- pembayaran menunggu terlalu lama;
- pesanan gagal bergerak;
- scheduler tidak sehat;
- kandidat habis;
- proses refund membutuhkan tindakan.

## 17. Privasi dan keamanan

- Guru hanya melihat data yang diperlukan sebelum menerima.
- Alamat lengkap dan kontak pribadi tidak dibuka ke semua kandidat.
- Setelah satu guru ditetapkan, akses kandidat lain harus dicabut.
- Semua keputusan sensitif dicatat dalam audit log.
- Endpoint Terima/Tolak harus memeriksa pemilik penawaran, masa berlaku, dan status pesanan.
- Perubahan jadwal, radius, pembayaran, serta refund memerlukan otorisasi sesuai peran.

## 18. Sumber aturan tunggal

Aturan berikut harus disimpan secara terpusat agar frontend, backend, scheduler, dan dokumentasi tidak saling bertentangan:

- jam operasional dan interval slot;
- lead time pemesanan baru;
- lead time perpanjangan;
- masa berlaku penawaran;
- waktu pengingat;
- jumlah maksimal penawaran aktif;
- tahap radius;
- batas retry;
- batas pencarian sebelum sesi pertama;
- ambang label peluang ketersediaan.

Perubahan pengaturan tidak boleh diam-diam menimpa nilai yang sudah dipilih saat deployment produksi. Migrasi basis data perlu mempertahankan nilai yang telah ada.

## 19. Pengujian wajib

### Jadwal

- pilihan jam pagi, siang, sore, dan malam muncul sesuai aturan;
- durasi tidak melewati jam operasional;
- tanggal dan nama hari selalu konsisten;
- pola satu, dua, dan tiga kali seminggu menghasilkan tanggal yang benar;
- rekomendasi tidak mengubah jumlah sesi atau mengacak hari;
- guru yang disarankan tersedia untuk seluruh sesi.

### Matching

- tiga penawaran awal dibuat;
- satu penolakan langsung diisi kandidat berikutnya;
- satu kedaluwarsa langsung diisi kandidat berikutnya;
- tidak pernah ada lebih dari tiga penawaran aktif;
- dua penerimaan bersamaan hanya menghasilkan satu guru;
- penawaran lain dibatalkan setelah guru ditemukan;
- guru yang menolak tidak ditawari ulang;
- guru yang diam hanya ditawari ulang satu kali;
- mata pelajaran dicocokkan menggunakan ID;
- batas radius dan konflik jadwal dipatuhi.

### Kegagalan dan pemulihan

- scheduler terlambat terdeteksi;
- menjalankan job dua kali tidak menggandakan penawaran;
- retry lama dibersihkan setelah reschedule atau tindakan admin;
- pesanan tidak terus diproses setelah batas akhir;
- notifikasi gagal dapat dicoba ulang tanpa duplikasi;
- tidak ada pesanan yang berhenti tanpa status atau tindakan berikutnya.

### Pembayaran dan refund

- pencarian tidak dimulai sebelum verifikasi;
- pembayaran menjelang sesi tidak menciptakan waktu pencarian nol;
- satu murid dengan beberapa invoice melihat pesanan yang benar;
- pembatalan dan pengembalian dana mempunyai audit log.

## 20. Tahapan implementasi

### Tahap 1 — Satukan aturan dan perbaiki bug dasar

- perbaiki pembangkitan pilihan jam termasuk jam malam;
- samakan lead time pada frontend, backend, pengujian, dan dokumentasi;
- gunakan ID mata pelajaran untuk pencocokan;
- bedakan status menunggu retry, membutuhkan tindakan, dan pencarian berakhir;
- pastikan pembayaran menyisakan waktu pencarian yang cukup.

### Tahap 2 — Bangun rolling pool

- batasi tiga penawaran aktif;
- isi slot langsung setelah penolakan/kedaluwarsa;
- buat penerimaan pertama menang secara atomik;
- tambahkan pengingat dan aturan penawaran ulang;
- tampilkan seluruh penawaran pada admin.

### Tahap 3 — Rekomendasi jadwal

- hitung kandidat untuk seluruh rangkaian sesi;
- tambahkan mode Pertahankan hari;
- tambahkan alternatif pola hari yang membutuhkan persetujuan;
- tampilkan label peluang dan maksimal tiga rekomendasi;
- periksa ulang ketersediaan saat checkout dan setelah pembayaran diverifikasi.

### Tahap 4 — Keandalan dan observasi

- scheduler heartbeat;
- audit log;
- retry notifikasi;
- pemantauan pesanan yang tidak bergerak;
- metrik waktu pencarian dan respons guru.

### Tahap 5 — Penyempurnaan berdasarkan data

- sesuaikan durasi penawaran;
- sesuaikan ambang label ketersediaan;
- evaluasi urutan kandidat dan pemerataan;
- ukur jadwal rekomendasi yang paling sering dipilih;
- perbaiki kebijakan penalti dari pola nyata, bukan dugaan.

## 21. Metrik keberhasilan

- median waktu dari pembayaran terverifikasi sampai guru ditemukan;
- persentase pesanan memperoleh guru sebelum batas akhir;
- tingkat respons dan median waktu respons guru;
- jumlah penawaran per pesanan;
- persentase murid yang memilih jadwal rekomendasi;
- persentase pencarian yang membutuhkan intervensi admin;
- jumlah pesanan yang berhenti tanpa progres;
- persentase refund karena guru tidak ditemukan;
- pemerataan jumlah penugasan antar-guru yang sama-sama memenuhi syarat.

## 22. Keputusan yang telah disepakati

- Pembayaran dilakukan terlebih dahulu untuk melindungi guru dari pesanan main-main.
- Pencarian memakai maksimal tiga penawaran aktif.
- Sistem menggunakan rolling pool, bukan menunggu satu gelombang tiga guru selama satu jam penuh.
- Penawaran berlaku sekitar 60 menit dan dapat diberi pengingat di tengah waktu.
- Guru yang menolak tidak ditawari ulang pesanan yang sama.
- Guru yang tidak merespons dapat ditawari ulang sekali setelah kandidat baru habis.
- Fitur rekomendasi jadwal digunakan sebagai pelengkap.
- Rekomendasi tidak menjanjikan guru pasti tersedia.
- Secara default rekomendasi mempertahankan hari dan hanya menyesuaikan jam.
- Alternatif hari harus tetap berpola rapi serta membutuhkan persetujuan murid.
- Jumlah dan frekuensi pertemuan tidak boleh berubah akibat rekomendasi.
- Target produksi adalah sistem yang dapat dipantau setelah dipindahkan dari Laragon ke hosting.

## 23. Hal yang masih perlu ditetapkan sebelum produksi

- kebijakan dan lama proses refund;
- batas maksimal radius offline;
- nilai final lead time setiap jenis pesanan;
- batas waktu pembayaran;
- batas akhir pencarian terhadap sesi pertama;
- kanal notifikasi yang digunakan;
- definisi aktivitas terbaru guru;
- rumus awal skor respons dan pemerataan;
- ambang jumlah kandidat untuk label peluang;
- jam operasional final setiap mode atau wilayah.

Keputusan ini sebaiknya ditetapkan sebagai konfigurasi bisnis dan diuji pada data simulasi sebelum situs dipublikasikan.

## 24. Ringkasan rancangan akhir

Murid memilih jadwal yang teratur dan dapat meminta rekomendasi jam dengan peluang memperoleh guru lebih tinggi. Setelah pembayaran diverifikasi, sistem menyaring guru berdasarkan syarat mutlak dan menjaga maksimal tiga penawaran aktif. Penolakan atau penawaran kedaluwarsa langsung digantikan kandidat berikutnya. Guru pertama yang menerima ditetapkan secara aman, sedangkan penawaran lain ditutup. Jika kandidat habis, sistem menjalankan perluasan yang disetujui, satu kesempatan penawaran ulang bagi guru yang diam, lalu meminta tindakan murid atau memproses pengembalian dana sebelum pesanan menjadi tidak jelas.

Dokumen ini menjadi sumber rancangan. Implementasi, teks antarmuka, pengujian, dan dokumentasi operasional harus merujuk pada aturan yang sama.
