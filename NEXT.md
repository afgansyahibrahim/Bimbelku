# STATUS TERBARU — 3 AGUSTUS 2026

Audit Checkpoint 1 telah menyinkronkan struktur, route, login, role, middleware, database, dan keputusan satu admin utama. Runtime tidak lagi memakai halaman autentikator atau persetujuan admin kedua; role, idempotensi, bukti transfer, dan audit tetap aktif. Acuan terbaru adalah `AUDIT_CHECKPOINT_1_STRUKTUR_ROUTE_LOGIN_ROLE_DATABASE_2026-08-03.md`.

Pekerjaan berikutnya adalah Audit Checkpoint 2 setelah tes runtime Checkpoint 1 dijalankan di Laragon. Jangan mengulang patch lama setelah patch Checkpoint 1.

---

PEDOMAN PENGEMBANGAN LANJUTAN WEBSITE BIMBELKU

Nama proyek: Website BimbelkuJenis dokumen: Aturan produk, daftar revisi, standar pengerjaan, dan standar pengujianSasaran pembaca: AI pengembang, programmer baru, reviewer, dan pemilik proyekStatus dokumen: Acuan utama setelah kode proyek dipahamiBahasa teknis: Ikuti istilah yang sudah digunakan pada kode

1. Fungsi Dokumen

Dokumen ini mengatur pengembangan lanjutan Website Bimbelku.

Kode proyek menjadi sumber kondisi teknis saat ini.

Dokumen ini menjadi sumber tujuan produk dan aturan bisnis.

Checkpoint terakhir menjadi sumber riwayat pengerjaan.

Keputusan terbaru pemilik proyek mengalahkan keputusan lama.

Asumsi pengembang tidak boleh mengalahkan aturan tertulis.

Pengembang wajib membaca seluruh dokumen sebelum mengubah kode.

Pengembang wajib memahami seluruh alur murid, guru, dan admin.

Pengembang wajib memeriksa frontend, backend, database, dan hak akses.

Pengembang tidak boleh langsung mengubah kode setelah menerima revisi.

Rancangan perubahan harus dijelaskan sebelum pengerjaan dimulai.

2. Target Mutu Proyek

Website harus mudah dipahami oleh pengguna baru.

Website harus berfungsi pada desktop, tablet, dan HP.

Alur pengguna harus pendek, jelas, dan tidak menyesatkan.

Data penting harus divalidasi kembali oleh backend.

Tindakan sensitif harus memiliki konfirmasi dan riwayat.

Setiap status harus memiliki arti dan perpindahan yang sah.

Setiap kegagalan harus menampilkan pesan dan tindakan lanjutan.

Fitur lama tidak boleh rusak akibat fitur baru.

Kode harus mudah dirawat oleh pengembang berikutnya.

Duplikasi kode harus dikurangi melalui komponen yang dapat digunakan ulang.

Perubahan database harus aman terhadap data lama.

Rilis hanya dilakukan setelah pengujian regresi selesai.

Target rilis adalah tidak memiliki bug yang diketahui.

Jaminan nol bug mutlak tidak dapat diberikan oleh dokumen.

Risiko harus dikurangi melalui pengujian, audit, dan checkpoint.

3. Tujuan Utama Website

Website Bimbelku menghubungkan murid dengan guru melalui pencocokan sistem.

Murid tidak mencari guru melalui daftar publik.

Murid tidak memilih guru secara langsung.

Sistem memilih kandidat guru berdasarkan kebutuhan pesanan.

Pembayaran dilakukan sebelum identitas lengkap guru dibuka.

Dana pembayaran diterima dan dikelola oleh admin.

Dana guru dicairkan setelah sesi dinyatakan sah.

Dana ditahan ketika keberatan atau sengketa masih aktif.

Setiap sesi memiliki jadwal, bukti, dan status yang jelas.

Setiap pengguna hanya dapat membuka data sesuai perannya.

Pengalaman murid, guru, dan admin harus memakai pola antarmuka yang konsisten.

4. Urutan Sumber Keputusan

Gunakan urutan berikut ketika ditemukan konflik:

Keputusan terbaru pemilik proyek.

Dokumen ini.

Checkpoint terakhir yang disetujui.

Aturan bisnis backend.

Implementasi frontend.

Kode lama yang belum diperbarui.

Asumsi pengembang.

Konflik harus ditulis sebelum kode diubah.

Pengembang harus menjelaskan pilihan penyelesaian.

Perubahan belum boleh dijalankan tanpa persetujuan.

5. Prosedur Awal Sebelum Pengerjaan

AI atau pengembang wajib membuat peta proyek terlebih dahulu.

Peta proyek harus mencakup bagian berikut:

stack frontend;

stack backend;

sistem autentikasi;

struktur route;

struktur API;

tabel database;

model utama;

status pesanan;

status pembayaran;

status sesi;

sistem notifikasi;

sistem chat;

sistem file;

sistem saldo;

sistem refund;

sistem sengketa;

role dan permission;

scheduler atau queue;

konfigurasi penyimpanan;

konfigurasi lokasi;

komponen antarmuka utama.

Peta tersebut harus memakai nama file dan nama tabel sebenarnya.

Pengembang harus menandai fitur yang sudah selesai.

Pengembang harus menandai fitur yang masih setengah selesai.

Pengembang harus menandai fitur yang belum tersedia.

Pengembang harus menandai kode mati dan duplikasi.

Pengembang harus menandai risiko keamanan.

Pengembang harus menandai perbedaan antara kode dan dokumen.

6. Batas Kebebasan Pengembang

Pengembang boleh melakukan tindakan berikut:

merapikan struktur komponen;

memperbaiki penamaan;

mengurangi duplikasi;

membuat komponen reusable;

memisahkan service;

memperbaiki validasi;

menambah pengujian;

memperbaiki responsivitas;

memperbaiki aksesibilitas;

memperbaiki performa;

menambah audit log;

menambah proteksi transaksi.

Pengembang dilarang melakukan tindakan berikut tanpa persetujuan:

mengganti arsitektur utama;

mengganti stack utama;

menghapus fitur lama;

mengubah alur pembayaran;

mengubah alur pencocokan guru;

membuka pencarian guru publik;

membuka identitas guru terlalu awal;

mengubah aturan saldo;

mengubah aturan refund;

mengubah aturan sengketa;

mengganti status bisnis;

menghapus data produksi;

mengubah struktur database secara manual;

menambahkan fitur di luar tampungan;

mengerjakan tahap berikutnya tanpa checkpoint.

BAGIAN A — ATURAN PRODUK TETAP

7. Peran Pengguna

7.1 Murid

Murid dapat membuat dan mengelola pesanan sendiri.

Murid dapat memilih kebutuhan pembelajaran.

Murid dapat memilih jadwal yang tersedia.

Murid dapat memilih kelas privat atau kelompok.

Murid dapat memilih pembelajaran online atau offline.

Murid dapat mengunggah bukti pembayaran.

Murid dapat melihat proses pencarian guru.

Murid dapat berkomunikasi setelah akses chat dibuka.

Murid dapat menyetujui penyelesaian sesi.

Murid dapat mengajukan keberatan sesuai batas waktu.

Murid hanya dapat membuka data miliknya.

7.2 Guru

Guru dapat mengatur profil dan kompetensi.

Guru dapat mengatur jadwal kosong.

Guru dapat menerima atau menolak penawaran.

Guru dapat mengikuti beberapa sesi tanpa benturan.

Guru dapat mengunggah bukti pelaksanaan.

Guru dapat menulis catatan pembelajaran.

Guru dapat melihat saldo dan riwayatnya.

Guru dapat mengajukan pencairan.

Guru dapat mengajukan banding terhadap penalti tertentu.

Guru hanya dapat membuka pesanan yang sah.

7.3 Admin

Admin dapat mengelola data operasional.

Admin dapat memverifikasi akun guru.

Admin dapat mengelola mata pelajaran.

Admin dapat mengelola tarif.

Admin dapat mengelola rekening penerimaan.

Admin dapat memverifikasi pembayaran.

Admin dapat mengawasi pencarian guru.

Admin dapat menetapkan guru secara manual.

Admin dapat memeriksa bukti sesi.

Admin dapat memproses refund.

Admin dapat menyelesaikan sengketa.

Admin dapat memproses pencairan.

Admin dapat melihat audit log sesuai izin.

Hak admin harus dibatasi berdasarkan permission.

8. Jenjang Pendidikan

Jenjang harus mengikuti keputusan final pada kode dan checkpoint.

Kategori yang pernah dibahas meliputi:

SD;

SMP;

SMA;

Perguruan Tinggi;

Umum.

Perguruan Tinggi menggunakan pilihan semester.

Rentang semester direncanakan dari Semester 1 sampai Semester 14.

Umum tidak disamakan dengan Perguruan Tinggi.

Umum digunakan untuk pembelajaran di luar struktur sekolah dan kampus.

Level Umum meliputi:

Semua tingkat;

Pemula;

Menengah;

Lanjutan.

Pengembang wajib memeriksa keputusan terakhir pada checkpoint.

Satu keputusan final harus diterapkan pada seluruh sistem.

Perubahan harus mencakup form, tarif, kompetensi, pesanan, dan pencocokan.

9. Aturan Pendaftaran dan Lokasi

Persetujuan kebijakan harus diwajibkan saat pendaftaran.

Persetujuan tidak boleh dicentang otomatis.

Lokasi dapat diminta melalui izin perangkat.

Penolakan izin tidak boleh merusak proses pendaftaran.

Lokasi harus diminta kembali saat layanan offline membutuhkan lokasi.

Lokasi murid tidak boleh dibuka kepada pengguna yang tidak berhak.

Koordinat rinci tidak boleh tampil sebelum hubungan bimbel terbentuk.

Data lokasi harus divalidasi oleh backend.

Perubahan lokasi aktif harus dicatat.

10. Aturan Pencocokan Guru

Pencocokan harus berjalan seperti sistem penawaran otomatis.

Murid tidak boleh melihat katalog guru untuk dipilih.

Sistem harus memeriksa kompetensi guru.

Sistem harus memeriksa jenjang yang dikuasai.

Sistem harus memeriksa mata pelajaran.

Sistem harus memeriksa metode online atau offline.

Sistem harus memeriksa jenis kelas.

Sistem harus memeriksa jadwal kosong.

Sistem harus memeriksa benturan pesanan.

Sistem harus memeriksa status verifikasi.

Sistem harus memeriksa status akun aktif.

Sistem harus memeriksa batas poin guru.

Sistem harus memeriksa radius untuk sesi offline.

Radius pencarian offline diperluas bertahap:

3 kilometer.

5 kilometer.

8 kilometer.

12 kilometer.

Perluasan radius harus tercatat.

Guru dapat menerima atau menolak penawaran.

Alasan penolakan harus disimpan.

Guru yang tidak merespons selama 12 jam harus ditandai.

Pencarian dapat diperpanjang hingga batas total dua hari.

Admin harus menerima notifikasi ketika guru belum ditemukan.

Admin dapat melakukan penugasan manual.

Penugasan manual tetap harus memeriksa semua syarat.

Satu pesanan hanya boleh diterima satu guru.

Penerimaan harus memakai transaksi database.

Penawaran lain harus dibatalkan setelah guru ditetapkan.

11. Aturan Penolakan Murid

Penolakan guru oleh murid harus dibatasi.

Penolakan ketiga memicu cooldown satu jam.

Pelanggaran berikutnya dapat memicu cooldown enam jam.

Pelanggaran berikutnya dapat memicu cooldown dua belas jam.

Pelanggaran berikutnya dapat memicu cooldown dua puluh empat jam.

Perhitungan harus dilakukan oleh backend.

Riwayat penolakan harus disimpan.

Admin harus dapat melihat riwayat tersebut.

Pengecualian hanya dapat diberikan oleh admin berizin.

12. Aturan Paket, Sesi, dan Jadwal

Murid memilih paket satu kali.

Jumlah sesi berasal dari paket.

Satu sesi memiliki durasi satu jam, kecuali tarif menentukan lain.

Setiap sesi memiliki mata pelajaran.

Setiap sesi memiliki tanggal dan jam.

Setiap sesi memiliki metode belajar.

Sesi offline memiliki lokasi pertemuan.

Guru dapat mengambil slot lain tanpa benturan.

Jadwal harus diperiksa kembali saat pesanan dikonfirmasi.

Jadwal harus diperiksa kembali saat guru menerima.

Jadwal harus diperiksa kembali saat perubahan disetujui.

Perubahan jadwal aktif membutuhkan persetujuan terkait.

Harga harus dihitung ulang setelah jadwal atau paket berubah.

13. Aturan Kelas Privat dan Kelompok

Jenis kelas harus dipilih pada awal pemesanan.

Jenis kelas harus tersimpan pada pesanan.

Privat berarti satu murid dengan satu guru.

Kelompok berarti beberapa murid pada sesi yang sama.

Kelas premium telah dibatalkan.

Semua guru diperlakukan setara dalam pilihan dasar.

Label ahli tidak boleh menaikkan tarif secara otomatis.

Jika kelas kelompok tidak memperoleh peserta, sistem harus menawarkan pilihan.

Pilihan dapat berupa perubahan menjadi privat atau pembatalan.

Perubahan harga harus ditampilkan sebelum konfirmasi.

Perubahan tidak boleh dilakukan tanpa persetujuan murid.

14. Aturan Pembayaran

Pembayaran dilakukan sebelum identitas lengkap guru dibuka.

Payment gateway eksternal tidak digunakan.

Pembayaran diarahkan ke rekening admin aktif.

Pesanan tidak boleh diproses tanpa rekening admin.

Rekening admin pertama harus dapat ditambahkan.

Tagihan lama tidak boleh menghalangi penambahan rekening pertama.

Guru tidak boleh menerima pesanan sebelum rekening tersedia.

Bukti pembayaran harus terhubung dengan satu pesanan.

Nominal harus diperiksa oleh backend.

Harga dari frontend tidak boleh dipercaya.

Admin harus memverifikasi pembayaran.

Status pembayaran tidak boleh diubah murid.

Klik ganda tidak boleh membuat pembayaran ganda.

Perubahan pesanan harus membatalkan konfirmasi lama.

Riwayat keputusan pembayaran harus disimpan.

15. Aturan Harga dan Komisi

Harga akhir harus dihitung oleh backend.

Perhitungan dapat memakai unsur berikut:

mata pelajaran;

jenjang;

tingkat;

jenis kelas;

metode belajar;

jumlah sesi;

durasi;

tarif aktif;

aturan kelompok.

Tarif lama tidak boleh dipercaya setelah pesanan diubah.

Komisi admin harus dihitung oleh backend.

Guru harus melihat nilai bruto.

Guru harus melihat potongan admin.

Guru harus melihat nilai bersih.

Riwayat perhitungan harus dapat diaudit.

16. Aturan Chat dan Identitas

Chat guru tidak tersedia sebelum hubungan bimbel terbentuk.

Murid tidak dapat menghubungi kandidat guru.

Guru hanya melihat informasi terbatas saat penawaran.

Identitas lengkap dibuka setelah guru ditetapkan.

Chat harus terkait dengan satu pesanan.

Pengguna lain tidak boleh membuka percakapan.

Admin dapat masuk saat sengketa membutuhkan pemeriksaan.

Riwayat chat tetap tersedia setelah sesi selesai.

Pengiriman pesan dapat dibatasi setelah penutupan kasus.

Lampiran harus divalidasi oleh backend.

Ukuran lampiran harus dibatasi.

Jenis lampiran harus dibatasi.

Lampiran harus dibuka melalui viewer internal.

17. Aturan Bukti Pelaksanaan

Guru harus mengunggah bukti sesi.

Bukti dapat memuat foto real-time.

Bukti dapat memuat waktu pengambilan.

Bukti dapat memuat lokasi saat dibutuhkan.

Bukti harus memuat catatan kegiatan.

Bukti harus memuat materi yang dibahas.

Bukti harus memuat status kehadiran.

Unggahan biasa tidak boleh menggantikan foto real-time saat diwajibkan.

Metadata bukti harus disimpan.

Hak akses file harus diperiksa oleh backend.

File tidak boleh memiliki URL publik permanen.

18. Aturan Penyelesaian Sesi

Guru mengajukan sesi selesai setelah kegiatan.

Murid dapat menyetujui penyelesaian.

Murid memiliki dua hari untuk mengajukan keberatan.

Persetujuan murid menutup keberatan normal.

Kasus khusus dapat diperiksa admin.

Dana belum boleh tersedia sebelum sesi sah.

Bukti tidak sah harus menghambat penyelesaian.

Status sesi harus mengikuti perpindahan yang sah.

19. Aturan Ketidakhadiran

Ketidakhadiran murid tanpa alasan sah dapat menyebabkan dana hangus.

Guru harus mengunggah bukti kehadiran.

Murid dapat mengajukan keberatan.

Keadaan darurat membutuhkan kronologi dan bukti.

Ketidakhadiran guru melarang pencairan dana.

Murid dapat meminta penggantian guru.

Murid dapat meminta refund sesuai keputusan admin.

Pelanggaran guru dapat mengurangi poin.

Keputusan harus memiliki alasan dan bukti.

20. Aturan Saldo dan Pencairan

Saldo guru hanya berasal dari sesi sah.

Saldo harus dibagi menjadi beberapa keadaan:

saldo tertahan;

saldo tersedia;

saldo diajukan;

saldo dicairkan;

saldo dikoreksi.

Dana sengketa harus tetap tertahan.

Pengajuan pencairan harus memakai rekening terverifikasi.

Admin harus memeriksa pengajuan.

Bukti transfer harus disimpan.

Setiap pencairan harus memiliki nomor referensi.

Perubahan saldo harus memakai transaksi database.

Saldo tidak boleh berubah tanpa ledger.

21. Aturan Refund

Refund dapat diproses pada kondisi yang disetujui.

Kondisi dapat meliputi:

guru tidak ditemukan;

guru tidak hadir;

kesalahan sistem;

pembatalan yang memenuhi syarat;

keputusan sengketa.

Refund harus mencatat alasan.

Refund harus mencatat nilai.

Refund harus mencatat rekening tujuan.

Refund harus mencatat admin pemroses.

Refund harus mencatat waktu.

Refund harus mencatat bukti transfer.

Refund tidak boleh diproses dua kali.

22. Aturan Sengketa

Dana harus ditahan selama sengketa aktif.

Batas penyelesaian sengketa adalah tujuh hari.

Admin harus melihat data pesanan.

Admin harus melihat jadwal.

Admin harus melihat pembayaran.

Admin harus melihat chat.

Admin harus melihat bukti guru.

Admin harus melihat bukti murid.

Admin harus melihat kronologi.

Admin harus melihat riwayat status.

Keputusan harus memiliki alasan.

Keputusan harus menghasilkan tindakan yang terukur.

Tindakan dapat berupa pencairan, refund, koreksi, atau penalti.

23. Aturan Penalti dan Poin Guru

Poin guru memengaruhi prioritas rekomendasi.

Poin tidak boleh menjadi satu-satunya syarat.

Penalti dapat berasal dari:

keterlambatan respons;

penolakan berulang;

tidak hadir;

pembatalan sepihak;

bukti tidak sah;

keluhan terbukti;

pelanggaran kebijakan.

Penghargaan dapat berasal dari:

kehadiran tepat waktu;

penyelesaian sah;

ulasan baik;

respons cepat;

bukti lengkap.

Setiap perubahan poin harus memiliki alasan.

Guru harus dapat melihat riwayat poin.

Banding harus tersedia untuk kasus tertentu.

24. Aturan Notifikasi

Notifikasi harus disimpan pada pusat notifikasi.

Notifikasi tidak boleh hanya muncul sebagai toast.

Notifikasi harus memiliki waktu.

Notifikasi harus memiliki status dibaca.

Notifikasi harus memiliki target halaman.

Notifikasi tidak boleh dibuat ganda.

Notifikasi penting tidak boleh langsung dihapus.

Hak akses target harus diperiksa kembali.

Pengiriman real-time dapat digunakan bila tersedia.

Fallback harus tersedia ketika real-time gagal.

25. Aturan File dan Viewer

Bukti pembayaran harus dibuka melalui viewer internal.

Bukti sesi harus dibuka melalui viewer internal.

Dokumen verifikasi harus dibuka melalui viewer internal.

Viewer gambar harus memiliki zoom 50–400 persen.

Viewer gambar harus memiliki rotasi 90 derajat.

Viewer harus mendukung scroll.

Viewer harus memiliki tombol tutup.

Viewer harus dapat ditutup dengan Escape.

PDF harus ditampilkan dalam website.

File tidak boleh dipaksa terunduh untuk pemeriksaan.

Unduhan hanya tersedia bagi pengguna berizin.

26. Aturan Keamanan

Semua hak akses harus diperiksa oleh backend.

Penyembunyian tombol bukan perlindungan.

Request harus dilindungi dari perubahan role.

ID objek harus diperiksa terhadap pemilik.

Harga harus dihitung kembali.

Status harus diperiksa kembali.

File harus diperiksa kembali.

Input harus divalidasi.

Output harus di-escape.

Token tidak boleh ditulis pada log.

Rahasia tidak boleh masuk repository.

File .env asli tidak boleh dibagikan.

Rate limit harus diterapkan pada endpoint sensitif.

Login harus memiliki proteksi percobaan berulang.

Reset kata sandi harus aman.

Audit log harus melindungi tindakan sensitif.

27. Aturan Database

Perubahan database harus memakai migration.

Migration harus memiliki rollback.

Data lama harus dipertahankan.

Kolom tidak boleh dihapus tanpa analisis.

Enum atau status harus diperiksa terhadap data lama.

Foreign key harus digunakan bila sesuai.

Index harus ditambahkan pada query utama.

Transaksi harus digunakan pada perubahan multi-tabel.

Ledger harus digunakan pada saldo.

Soft delete digunakan pada data yang perlu dipertahankan.

Penghapusan permanen harus dibatasi.

Seeder tidak boleh merusak data produksi.

28. Aturan API

Endpoint harus mengikuti pola proyek.

Respons sukses harus konsisten.

Respons gagal harus konsisten.

Kode HTTP harus sesuai kondisi.

Validasi harus dilakukan pada server.

Pesan error tidak boleh membocorkan detail internal.

Pagination harus digunakan pada daftar panjang.

Filter harus divalidasi.

Sorting harus dibatasi pada kolom aman.

Idempotency harus diterapkan pada tindakan sensitif.

Endpoint pembayaran harus mencegah duplikasi.

Endpoint penerimaan guru harus mencegah perlombaan data.

Endpoint pencairan harus memakai transaksi.

29. Aturan Antarmuka

Tampilan harus sederhana dan mudah dibaca.

Tombol utama harus terlihat jelas.

Tindakan berbahaya harus dibedakan.

Label tombol harus menjelaskan tindakan.

Gunakan “Batalkan Pesanan”, bukan hanya “Ya”.

Gunakan “Kembali Periksa Data”, bukan hanya “Tidak”.

Dialog utama harus berada di tengah layar.

Dialog panjang harus memiliki scroll internal.

Halaman belakang harus dikunci saat dialog terbuka.

Empty state harus menjelaskan tindakan berikutnya.

Error state harus menjelaskan tindakan berikutnya.

Loading state harus terlihat.

Tombol harus dinonaktifkan selama request.

Klik berulang tidak boleh mengirim request ganda.

30. Aturan Responsivitas dan Aksesibilitas

Seluruh halaman harus diuji pada ukuran berikut:

360 × 800 piksel;

390 × 844 piksel;

768 × 1024 piksel;

1024 × 768 piksel;

1280 piksel atau lebih.

Teks tidak boleh terpotong.

Modal tidak boleh keluar layar.

Tabel panjang harus memiliki scroll khusus.

Sidebar HP harus dapat ditutup.

Tombol harus mudah ditekan.

Kontras teks harus terbaca.

Form harus memiliki label.

Error tidak boleh dibedakan dengan warna saja.

Fokus keyboard harus terlihat.

Ikon harus memiliki nama aksesibel.

Zoom browser tidak boleh merusak fungsi utama.

BAGIAN B — DAFTAR 18 REVISI

31. Revisi 1 — Tutorial dalam Dialog Tengah

Masalah

Tutorial lama muncul sebagai kotak bagian atas.

Isi terpotong pada layar kecil.

Tombol tidak selalu terlihat.

Tutorial sulit dibaca pada HP.

Hasil Wajib

Tutorial harus muncul pada tengah layar.

Isi panjang harus memiliki scroll internal.

Gambar dapat ditambahkan pada setiap langkah.

Header dan tombol navigasi harus tetap terlihat.

Alur Pengguna

Pengguna menekan tombol tutorial.

Latar halaman dibuat redup.

Dialog muncul pada tengah layar.

Pengguna membaca teks dan gambar.

Pengguna menekan tombol berikutnya.

Pengguna dapat kembali ke langkah sebelumnya.

Pengguna dapat menutup tutorial.

Aturan Terkait

Gunakan aturan antarmuka pada Bagian 29.

Gunakan aturan responsivitas pada Bagian 30.

Status tutorial dapat disimpan per akun.

Larangan

Tutorial tidak boleh menempel pada bagian atas.

Tutorial tidak boleh keluar dari viewport.

Halaman belakang tidak boleh ikut bergulir.

Kriteria Selesai

Dialog terlihat penuh pada lebar 360 piksel.

Isi panjang dapat dibaca.

Tombol selalu dapat dijangkau.

Escape dapat menutup dialog.

Gambar tidak merusak tata letak.

Tutorial bekerja pada seluruh role.

Uji Minimum

isi pendek;

isi panjang;

tanpa gambar;

dengan gambar;

HP;

tablet;

desktop;

keyboard;

pembukaan ulang.

32. Revisi 2 — Dropdown Mata Pelajaran

Masalah

Dropdown dapat tertutup elemen lain.

Daftar panjang keluar dari layar.

Pilihan sulit ditemukan pada HP.

Hasil Wajib

Dropdown harus menyesuaikan ruang layar.

Daftar harus memiliki batas tinggi.

Daftar harus dapat digulir.

Pencarian dapat disediakan untuk daftar panjang.

Aturan Terkait

Gunakan aturan antarmuka pada Bagian 29.

Gunakan aturan responsivitas pada Bagian 30.

Nilai harus divalidasi backend.

Kriteria Selesai

Dropdown tidak keluar layar.

Semua pilihan dapat diakses.

Pilihan tersimpan dengan benar.

Klik luar menutup dropdown.

Navigasi keyboard berfungsi.

33. Revisi 3 — Penanda Menu Aktif

Masalah

Menu aktif dapat salah setelah perpindahan halaman.

Desktop dan HP dapat menunjukkan menu berbeda.

Hasil Wajib

Status aktif harus mengikuti route saat ini.

Menu induk ikut aktif saat submenu dibuka.

Refresh tidak boleh mengubah status aktif.

Kriteria Selesai

Satu menu utama ditandai.

Submenu mengaktifkan induk yang benar.

Desktop dan HP konsisten.

Refresh tidak menghasilkan status salah.

34. Revisi 4 — Halaman Pesan Seperti Marketplace

Masalah

Daftar percakapan belum mudah dipahami.

Isi chat belum terpisah jelas.

Tampilan HP belum nyaman.

Hasil Wajib

Desktop memakai dua panel.

Panel kiri memuat daftar percakapan.

Panel kanan memuat isi percakapan.

HP membuka daftar dan chat secara bergantian.

Data Panel Kiri

nama lawan bicara;

cuplikan pesan;

waktu terakhir;

status belum dibaca;

status pesanan.

Data Panel Kanan

identitas pengguna;

status pesanan;

isi percakapan;

lampiran;

input pesan;

tombol kirim.

Aturan Terkait

Gunakan aturan chat pada Bagian 16.

Gunakan aturan file pada Bagian 25.

Gunakan aturan keamanan pada Bagian 26.

Kriteria Selesai

pesan tidak terkirim ganda;

indikator belum dibaca berfungsi;

lampiran aman;

scroll menuju pesan terbaru;

pesan gagal dapat dikirim ulang;

HP tetap mudah digunakan.

35. Revisi 5 — Penyederhanaan Navigasi Murid

Masalah

Menu murid terlalu banyak.

Fungsi terkait tersebar pada beberapa halaman.

Hasil Wajib

Navigasi utama disederhanakan menjadi:

Beranda;

Pesanan Saya;

Pesan;

Notifikasi;

Saya.

Fitur lama harus dipindahkan ke kelompok sesuai.

Aturan Terkait

Gunakan aturan penanda menu pada Revisi 3.

Gunakan aturan responsivitas pada Bagian 30.

Kriteria Selesai

semua fitur lama tetap dapat ditemukan;

jumlah klik menuju fitur utama berkurang;

desktop dan HP memiliki fungsi sama;

menu aktif bekerja dengan benar.

36. Revisi 6 — Dashboard Murid

Masalah

Dashboard belum menunjukkan tindakan prioritas.

Informasi penting tersebar.

Hasil Wajib

Dashboard harus menampilkan:

pesanan aktif;

tagihan belum dibayar;

pembayaran diperiksa;

pencarian guru;

guru ditemukan;

jadwal terdekat;

pesan belum dibaca;

notifikasi terbaru;

sengketa aktif;

tombol membuat pesanan.

Aturan Terkait

Data harus berasal dari backend.

Kartu harus membuka halaman terkait.

Status harus memakai istilah yang konsisten.

Kriteria Selesai

data tidak memakai nilai palsu;

kartu memiliki target;

empty state tersedia;

loading state tersedia;

jadwal memakai zona waktu pengguna;

tampilan HP tetap jelas.

37. Revisi 7 — Halaman “Saya”

Masalah

Pengaturan akun tersebar.

Data keamanan dan lokasi belum terkelompok.

Hasil Wajib

Halaman “Saya” harus memuat:

Data pribadi

nama;

foto;

tanggal lahir;

nomor telepon;

email.

Data pendidikan

jenjang;

tingkat;

sekolah;

kebutuhan belajar.

Lokasi

alamat;

titik lokasi;

izin lokasi;

lokasi utama.

Keamanan

perubahan kata sandi;

perangkat aktif;

sesi login;

keluar dari semua perangkat.

Kebijakan

syarat layanan;

kebijakan privasi;

persetujuan lokasi;

persetujuan pemrosesan data.

Bantuan

tutorial;

pusat bantuan;

pengaduan;

kontak admin.

Aturan Terkait

Gunakan aturan pendaftaran pada Bagian 9.

Gunakan aturan keamanan pada Bagian 26.

Kriteria Selesai

perubahan divalidasi backend;

data penting memiliki riwayat;

kata sandi lama diperiksa;

lokasi tidak bocor;

sesi dapat dicabut;

HP tetap nyaman.

38. Revisi 8 — Paket dan Sesi

Masalah

Paket dan sesi dapat dipilih berulang.

Jumlah sesi dapat tidak konsisten.

Hasil Wajib

Paket dipilih satu kali.

Jumlah sesi mengikuti paket.

Setiap sesi memiliki mapel dan jadwal.

Ringkasan pembagian sesi harus terlihat.

Aturan Terkait

Gunakan aturan paket pada Bagian 12.

Gunakan aturan harga pada Bagian 15.

Kriteria Selesai

jumlah sesi tidak melebihi paket;

jumlah sesi tidak kurang saat pembayaran;

semua sesi memiliki mapel;

semua sesi memiliki jadwal;

benturan ditolak;

perubahan paket mengatur ulang data terkait;

harga dihitung ulang backend.

39. Revisi 9 — Konfirmasi Pesanan Sebelum Pembayaran

Masalah

Submit langsung mengarah ke pembayaran.

Kesalahan data terlambat diketahui.

Hasil Wajib

Submit harus membuka dialog ringkasan.

Pesanan belum langsung diproses.

Pengguna harus memeriksa rincian.

Pengguna dapat kembali mengubah data.

Pembayaran terbuka setelah konfirmasi.

Data Ringkasan

jenis layanan;

privat atau kelompok;

online atau offline;

mata pelajaran;

jenjang;

tingkat;

kebutuhan belajar;

paket;

jumlah sesi;

durasi;

tanggal;

jam;

lokasi;

tarif;

total;

aturan pembatalan.

Tombol

Kembali dan Ubah;

Konfirmasi Pesanan;

Lanjutkan ke Pembayaran.

Aturan Terkait

Gunakan aturan pembayaran pada Bagian 14.

Gunakan aturan harga pada Bagian 15.

Gunakan aturan antarmuka pada Bagian 29.

Kriteria Selesai

harga dihitung backend;

data tidak lengkap ditolak;

klik ganda tidak menggandakan pesanan;

perubahan data membatalkan konfirmasi;

dialog dapat digulir pada HP;

pembayaran belum aktif sebelum konfirmasi.

40. Revisi 10 — Penyimpanan Draf

Masalah

Isian hilang saat halaman tertutup.

Pengguna harus mengulang proses.

Hasil Wajib

Form harus disimpan sebagai draf.

Pengguna dapat melanjutkan draf.

Waktu penyimpanan terakhir harus terlihat.

Draf dapat dihapus.

Aturan Terkait

Draf harus terhubung dengan akun.

Draf bukan pesanan aktif.

Draf dihapus setelah pesanan berhasil.

Harga lama harus dihitung ulang.

Data sensitif tidak boleh disimpan terbuka.

Kriteria Selesai

refresh tidak menghilangkan draf;

draf dapat dilanjutkan;

draf dapat dihapus;

draf tidak mengganggu pesanan aktif;

konflik draf ditangani;

data sensitif tetap aman.

41. Revisi 11 — Indikator Tahapan Pemesanan

Masalah

Pengguna tidak mengetahui posisi proses.

Status terasa tidak jelas.

Hasil Wajib

Tahapan ditampilkan sebagai berikut:

Kebutuhan Belajar.

Paket dan Jadwal.

Periksa Pesanan.

Pembayaran.

Pencarian Guru.

Guru Ditemukan.

Bimbel Aktif.

Selesai.

Aturan Terkait

Status indikator harus berasal dari backend.

Tahap berikutnya terkunci sebelum syarat terpenuhi.

Tahap selesai harus ditandai.

Tahap aktif harus terlihat.

Kriteria Selesai

status tidak dapat dimanipulasi frontend;

refresh mempertahankan tahap;

tahap terkunci tidak dapat dibuka;

perubahan status memperbarui indikator;

tampilan HP tetap terbaca.

42. Revisi 12 — Kondisi Tampilan Halaman

Masalah

Beberapa halaman hanya memiliki kondisi data tersedia.

Kondisi gagal dan kosong belum seragam.

Hasil Wajib

Setiap halaman harus memiliki:

loading;

data tersedia;

data kosong;

proses berhasil;

proses gagal;

koneksi bermasalah;

akses ditolak;

data tidak ditemukan;

sesi berakhir;

proses diperiksa.

Aturan Terkait

Pesan harus menjelaskan tindakan berikutnya.

Detail internal tidak boleh ditampilkan.

Tombol harus dinonaktifkan selama request.

Kriteria Selesai

semua halaman utama memiliki state lengkap;

error dapat dipulihkan;

empty state memberi arah;

loading tidak membingungkan;

request ganda dicegah.

43. Revisi 13 — Pusat Notifikasi

Masalah

Toast hilang setelah ditutup.

Riwayat pemberitahuan tidak tersedia.

Hasil Wajib

Pusat notifikasi harus tersedia bagi semua role.

Notifikasi murid meliputi:

pembayaran;

pencarian guru;

guru ditemukan;

perubahan jadwal;

pesan;

sesi;

bukti;

keberatan;

refund.

Notifikasi guru meliputi:

penawaran;

batas respons;

pembatalan;

jadwal;

pesan;

sesi;

bukti;

saldo;

pencairan.

Notifikasi admin meliputi:

pembayaran;

pesanan tanpa guru;

bukti;

sengketa;

refund;

pencairan;

verifikasi akun.

Aturan Terkait

Gunakan aturan notifikasi pada Bagian 24.

Kriteria Selesai

notifikasi tidak ganda;

status dibaca tersimpan;

tautan membuka halaman benar;

“tandai semua dibaca” berfungsi;

hak akses target diperiksa.

44. Revisi 14 — Pembatasan Akses Chat

Masalah

Chat dapat terbuka terlalu awal.

Identitas dapat bocor.

Hasil Wajib

Sebelum pembayaran, chat guru tidak tersedia.

Saat pencarian, murid tidak melihat kandidat.

Setelah guru ditetapkan, chat dibuka.

Saat sengketa, admin dapat memeriksa chat.

Setelah selesai, riwayat tetap dapat dibaca.

Aturan Terkait

Gunakan aturan chat pada Bagian 16.

Gunakan aturan keamanan pada Bagian 26.

Kriteria Selesai

API tidak membocorkan identitas;

pengguna lain tidak dapat membuka chat;

chat terkait satu pesanan;

lampiran divalidasi;

riwayat sengketa terlindungi;

perubahan status memperbarui akses.

45. Revisi 15 — Audit HP dan Aksesibilitas

Masalah

Beberapa halaman hanya diuji pada desktop.

Modal dan tabel dapat terpotong pada HP.

Hasil Wajib

Audit harus mencakup:

navbar;

sidebar;

tabel;

form;

dropdown;

dialog;

tutorial;

viewer;

chat;

dashboard;

kartu pesanan;

pembayaran;

jadwal;

notifikasi.

Aturan Terkait

Gunakan seluruh aturan pada Bagian 30.

Kriteria Selesai

tidak ada teks terpotong;

tidak ada modal keluar layar;

tombol mudah ditekan;

label form tersedia;

fokus keyboard terlihat;

kontras terbaca;

zoom browser tidak merusak fungsi;

tabel panjang tetap dapat digunakan.

46. Revisi 16 — Penyelarasan Halaman Guru

Masalah

Pola halaman guru belum seragam.

Tindakan penting belum selalu dikonfirmasi.

Hasil Wajib

Audit harus mencakup:

dashboard;

profil;

kompetensi;

jadwal kosong;

penawaran;

pesanan aktif;

sesi;

bukti;

pesan;

notifikasi;

saldo;

pencairan;

riwayat;

pengaduan.

Aturan Terkait

Gunakan aturan role guru pada Bagian 7.2.

Gunakan aturan pencocokan pada Bagian 10.

Gunakan aturan bukti pada Bagian 17.

Gunakan aturan saldo pada Bagian 20.

Kriteria Selesai

konfirmasi tersedia;

penolakan meminta alasan;

penerimaan memeriksa jadwal;

klik ganda dicegah;

status seragam;

viewer internal digunakan;

empty state tersedia;

HP diuji;

saldo berasal dari backend.

47. Revisi 17 — Penyelarasan Panel Admin

Masalah

Pola pengelolaan berbeda antarhalaman.

Tindakan sensitif belum selalu menampilkan ringkasan.

Hasil Wajib

Audit harus mencakup:

dashboard;

pengguna;

verifikasi guru;

mata pelajaran;

jenjang;

tarif;

rekening;

pesanan;

pencarian guru;

pembayaran;

sesi;

bukti;

pengaduan;

sengketa;

refund;

saldo;

pencairan;

penalti;

audit log;

pengaturan.

Aturan Terkait

Gunakan aturan role admin pada Bagian 7.3.

Gunakan aturan keamanan pada Bagian 26.

Gunakan aturan database pada Bagian 27.

Kriteria Selesai

tindakan sensitif memakai dialog;

data ringkasan terlihat;

alasan penolakan diwajibkan;

penghapusan dibatasi;

filter konsisten;

dokumen memakai viewer;

admin pelaksana tercatat;

nilai lama dan baru tersimpan;

hak akses backend diperiksa.

48. Revisi 18 — Operasional Guru dan Admin

48.1 Penawaran Guru

Penawaran harus menampilkan:

mata pelajaran;

jenjang;

tingkat;

jenis kelas;

metode;

wilayah umum;

jadwal;

jumlah sesi;

perkiraan pendapatan;

batas waktu respons.

Data pribadi lengkap tidak boleh terlihat.

48.2 Penerimaan Guru

Backend harus memeriksa:

status pesanan;

status penawaran;

status akun;

kompetensi;

jadwal;

benturan;

jenis kelas;

metode;

radius;

poin.

Satu pesanan hanya dapat diterima satu guru.

48.3 Jadwal Guru

Guru dapat mengatur jam kosong.

Benturan harus ditolak.

Perubahan jadwal aktif memerlukan persetujuan.

48.4 Check-in dan Check-out

Guru melakukan check-in sebelum sesi.

Guru melakukan check-out setelah sesi.

Waktu harus disimpan.

Lokasi dapat disimpan saat diperlukan.

48.5 Bukti Sesi

Guru mengunggah foto real-time saat diwajibkan.

Guru menulis catatan kegiatan.

Guru mencatat materi.

Guru mencatat kehadiran murid.

48.6 Penyelesaian Sesi

Guru mengajukan sesi selesai.

Murid dapat menyetujui.

Murid memiliki dua hari untuk keberatan.

Admin menangani kasus khusus.

48.7 Ketidakhadiran Murid

Guru mengunggah bukti.

Dana dapat hangus sesuai kebijakan.

Keadaan darurat membutuhkan bukti.

48.8 Ketidakhadiran Guru

Dana tidak boleh dicairkan.

Murid dapat meminta penggantian.

Murid dapat meminta refund.

Poin guru dapat dikurangi.

48.9 Saldo Guru

Sistem menampilkan:

nilai bruto;

komisi admin;

nilai bersih;

saldo tertahan;

saldo tersedia;

saldo dicairkan.

48.10 Pencairan

Guru mendaftarkan rekening.

Admin memverifikasi rekening.

Pengajuan mencatat nominal dan tujuan.

Dana sengketa tidak dapat dicairkan.

48.11 Pembayaran Admin

Admin memeriksa nominal.

Admin memeriksa rekening tujuan.

Admin memeriksa waktu transfer.

Admin memeriksa bukti.

Admin memeriksa pesanan terkait.

48.12 Refund

Refund mencatat alasan.

Refund mencatat nilai.

Refund mencatat tujuan.

Refund mencatat admin.

Refund mencatat bukti.

48.13 Sengketa

Admin melihat seluruh bukti.

Dana ditahan.

Keputusan diberikan maksimal tujuh hari.

Keputusan harus memiliki alasan.

48.14 Penalti

Pelanggaran harus memiliki riwayat.

Guru dapat melihat penalti.

Banding tersedia untuk kasus tertentu.

48.15 Kontrol Pencarian

Admin melihat:

radius aktif;

kandidat;

penawaran;

respons;

penolakan;

waktu tersisa;

jumlah percobaan.

Admin dapat menetapkan guru secara manual.

48.16 Audit Log

Audit log minimal mencatat:

pelaku;

role;

tindakan;

objek;

nilai lama;

nilai baru;

waktu;

alasan;

alamat IP bila digunakan.

Audit log tidak boleh diubah admin biasa.

Kriteria Selesai Revisi 18

seluruh alur memiliki backend;

seluruh perubahan memiliki validasi;

transaksi mencegah data ganda;

saldo memakai ledger;

refund tidak dapat ganda;

sengketa menahan dana;

akses diperiksa backend;

audit log mencatat tindakan;

skenario gagal telah diuji;

data lama tetap dapat dipakai.

BAGIAN C — URUTAN PENGERJAAN

49. Tahap 1 — Fondasi Antarmuka

Kerjakan revisi berikut:

Revisi 1;

Revisi 2;

Revisi 3;

Revisi 12;

Revisi 15.

Tujuan tahap ini adalah membentuk komponen antarmuka yang stabil.

Komponen dasar harus digunakan ulang pada tahap berikutnya.

Checkpoint wajib dibuat setelah tahap selesai.

50. Tahap 2 — Alur Murid

Kerjakan revisi berikut:

Revisi 5;

Revisi 6;

Revisi 7;

Revisi 8;

Revisi 9;

Revisi 10;

Revisi 11;

Revisi 13;

Revisi 14.

Revisi 4 dapat dikerjakan bersama Revisi 14.

Checkpoint wajib dibuat setelah tahap selesai.

51. Tahap 3 — Guru, Admin, dan Operasional

Kerjakan revisi berikut:

Revisi 16;

Revisi 17;

Revisi 18.

Tahap ini melibatkan backend, database, transaksi, dan keamanan.

Checkpoint wajib dibuat setelah setiap kelompok fitur besar.

52. Aturan Checkpoint

Setiap checkpoint harus memuat:

nama tahap;

tanggal;

tujuan;

daftar file ditambah;

daftar file diubah;

daftar file dihapus;

migration;

endpoint;

tabel terdampak;

status fitur;

bug ditemukan;

bug diperbaiki;

hasil pengujian;

akun pengujian;

perintah pemasangan;

perintah migration;

perintah build;

langkah rollback;

risiko tersisa;

pekerjaan berikutnya.

Checkpoint harus disimpan sebagai file Markdown.

File proyek harus dibungkus setelah checkpoint.

Folder berikut tidak perlu disertakan:

node_modules;

vendor;

cache;

log besar;

file rahasia.

BAGIAN D — STANDAR PENGUJIAN

53. Pengujian Fungsional

Setiap fitur harus diuji pada kondisi normal.

Setiap fitur harus diuji pada data kosong.

Setiap fitur harus diuji pada data tidak valid.

Setiap fitur harus diuji pada request gagal.

Setiap fitur harus diuji pada koneksi lambat.

Setiap fitur harus diuji pada klik berulang.

Setiap fitur harus diuji pada sesi kedaluwarsa.

Setiap fitur harus diuji pada pengguna tanpa izin.

Setiap fitur harus diuji pada data lama.

54. Pengujian Role

Uji akun murid.

Uji akun guru.

Uji akun admin.

Uji admin dengan permission terbatas.

Uji pengguna tanpa autentikasi.

Uji pengguna yang mencoba membuka data role lain.

Uji perubahan role melalui request manual.

55. Pengujian Transaksi

Uji dua guru menerima pesanan bersamaan.

Uji dua request pembayaran bersamaan.

Uji dua request refund bersamaan.

Uji dua request pencairan bersamaan.

Uji perubahan jadwal bersamaan.

Uji rollback saat proses tengah gagal.

Uji saldo setelah rollback.

56. Pengujian Keamanan

Uji akses objek milik pengguna lain.

Uji manipulasi harga.

Uji manipulasi status.

Uji manipulasi role.

Uji unggahan file berbahaya.

Uji file terlalu besar.

Uji tipe file palsu.

Uji URL file tanpa izin.

Uji rate limit.

Uji error agar tidak membocorkan detail server.

57. Pengujian Performa

Uji halaman dengan data kosong.

Uji halaman dengan seratus data.

Uji halaman dengan seribu data bila relevan.

Uji query N+1.

Uji pagination.

Uji pencarian.

Uji filter.

Uji ukuran bundle frontend.

Uji request ganda.

Uji gambar besar.

Uji viewer PDF.

58. Pengujian Regresi

Setelah setiap revisi, uji kembali:

login;

registrasi;

reset kata sandi;

profil;

pesanan;

pembayaran;

pencocokan;

chat;

notifikasi;

jadwal;

bukti;

penyelesaian;

saldo;

pencairan;

refund;

sengketa;

admin.

Fitur lama harus tetap berjalan.

59. Pengujian Penerimaan

Fitur hanya dinyatakan selesai ketika:

antarmuka selesai;

API terhubung;

validasi backend tersedia;

hak akses diperiksa;

data tersimpan benar;

state gagal ditangani;

HP telah diuji;

desktop telah diuji;

console tidak memiliki error;

server tidak memiliki error;

migration berhasil;

rollback berhasil;

pengujian regresi selesai;

dokumentasi diperbarui;

checkpoint dibuat.

BAGIAN E — FORMAT INSTRUKSI KEPADA AI

60. Instruksi Pembuka

Gunakan instruksi berikut sebelum pengerjaan:

Kamu telah membaca dan memahami seluruh kode proyek Website Bimbelku.Kode menjadi sumber kondisi teknis saat ini.Dokumen ini menjadi sumber aturan produk dan target revisi.Checkpoint menjadi sumber riwayat pengerjaan.

Jangan langsung mengubah kode.Jelaskan masalah implementasi saat ini terlebih dahulu.Sebutkan file, route, endpoint, tabel, dan risiko yang terdampak.Hubungkan setiap revisi dengan aturan produk terkait.Jelaskan rencana pengujian sebelum pengerjaan.

Pertahankan fitur lama yang masih sesuai tujuan.Jangan membangun ulang sistem tanpa alasan teknis.Gunakan komponen reusable untuk pola yang berulang.Validasi bisnis harus dilakukan oleh backend.

Kerjakan revisi secara bertahap.Hentikan pengerjaan setelah checkpoint selesai.Jangan melanjutkan tahap berikutnya tanpa pemeriksaan.

61. Format Jawaban Analisis AI

Sebelum mengubah kode, AI harus memberikan:

Pemahaman masalah.

Kondisi kode saat ini.

Aturan terkait.

File terdampak.

Database terdampak.

API terdampak.

Risiko.

Urutan pengerjaan.

Skenario pengujian.

Hal yang belum pasti.

AI tidak boleh memulai perubahan sebelum bagian tersebut jelas.

62. Format Laporan Setelah Pengerjaan

Setelah pengerjaan, AI harus memberikan:

Ringkasan hasil.

File ditambah.

File diubah.

Migration ditambah.

Endpoint berubah.

Aturan bisnis diterapkan.

Bug ditemukan.

Bug diperbaiki.

Pengujian dijalankan.

Pengujian gagal.

Risiko tersisa.

Langkah menjalankan.

Langkah rollback.

Isi checkpoint.

BAGIAN F — LARANGAN AKHIR

63. Larangan Produk

Murid tidak boleh memilih guru langsung.

Profil guru tidak boleh dibuka sebelum waktunya.

Pembayaran tidak boleh dilewati.

Harga frontend tidak boleh dipercaya.

Status pesanan tidak boleh dilompati.

Satu pesanan tidak boleh diterima dua guru.

Dana sengketa tidak boleh dicairkan.

Refund tidak boleh diproses dua kali.

Saldo tidak boleh berubah tanpa ledger.

Chat tidak boleh dibuka tanpa hak.

Dokumen tidak boleh memiliki akses publik bebas.

64. Larangan Pengerjaan

AI tidak boleh mengubah kode tanpa analisis.

AI tidak boleh menghapus fitur tanpa persetujuan.

AI tidak boleh mengubah stack tanpa persetujuan.

AI tidak boleh mengubah database manual.

AI tidak boleh menyembunyikan bug.

AI tidak boleh menyatakan selesai karena tampilan muncul.

AI tidak boleh melewati pengujian HP.

AI tidak boleh melewati pengujian backend.

AI tidak boleh melanjutkan tahap tanpa checkpoint.

AI tidak boleh mengarang nama file atau tabel.

BAGIAN G — HASIL AKHIR YANG DIHARAPKAN

65. Kondisi Produk Setelah Seluruh Revisi

Murid dapat memesan bimbel tanpa kebingungan.

Murid dapat memeriksa rincian sebelum membayar.

Murid dapat memahami setiap tahap pesanan.

Guru menerima penawaran yang sesuai.

Guru tidak dapat mengambil jadwal bertabrakan.

Admin dapat mengawasi seluruh proses.

Pembayaran dapat diverifikasi dengan aman.

Bukti dapat diperiksa tanpa unduhan paksa.

Chat hanya terbuka pada waktu yang sah.

Saldo dan pencairan dapat diaudit.

Refund tidak dapat diproses ganda.

Sengketa menahan dana secara otomatis.

Setiap tindakan penting memiliki riwayat.

Seluruh halaman berfungsi pada HP.

Seluruh halaman memiliki loading, empty, success, dan error state.

Kode dapat dilanjutkan oleh pengembang berikutnya.

Checkpoint menjelaskan seluruh perubahan.

Bug yang diketahui harus diselesaikan sebelum rilis.

66. Penutup

Dokumen ini harus disimpan bersama checkpoint terakhir.

Dokumen ini harus diberikan bersama source code terbaru.

Perubahan keputusan harus dicatat pada bagian revisi dokumen.

Versi lama tidak boleh digunakan setelah versi baru disetujui.

Setiap pengembang harus menandatangani pemahaman melalui ringkasan tertulis.

Pengerjaan harus berhenti ketika aturan belum jelas.

Persetujuan pemilik proyek diperlukan untuk perubahan tujuan produk.

## Status Audit Lima Checkpoint — 3 Agustus 2026

- Checkpoint 1: struktur, route, login, role, middleware, dan database — selesai secara statis; tes runtime lokal wajib dijalankan.
- Checkpoint 2: admin, tutor, murid, kelas, jadwal, dan pembayaran — selesai secara statis; tes runtime lokal wajib dijalankan.
- Checkpoint 3: chat, notifikasi, laporan, perkembangan, upload, dan fitur pendukung — selesai secara statis; tes runtime lokal wajib dijalankan.
- Checkpoint 4 berikutnya: responsif, keamanan, performa, dan aksesibilitas.
- Checkpoint 5: regresi akhir, skenario lengkap, dan dokumentasi penutupan.

## Setelah Audit Checkpoint 4

1. Jalankan `CheckpointFourQualityAuditTest`, typecheck, lint, build, dan performance budget di Laragon.
2. Uji matriks desktop/tablet/HP serta keyboard.
3. Kirim output `FAIL` sebelum masuk Checkpoint 5.
4. Checkpoint 5 menjalankan regresi akhir dan skenario lengkap murid–tutor–admin.
