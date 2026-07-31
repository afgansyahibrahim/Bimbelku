# Riset Katalog Mata Pelajaran BimbelKu — Tahap 5

Tanggal pemeriksaan: 28 Juli 2026  
Kurikulum acuan: Kurikulum Merdeka berdasarkan Permendikdasmen Nomor 13 Tahun 2025  
Sumber struktur: regulasi kurikulum dan buku siswa pada Sistem Informasi Perbukuan Indonesia (SIBI)

## 1. Keputusan struktur data

Katalog disusun dengan urutan berikut:

`Jenjang → Kelas → Kelompok mapel → Mata pelajaran → Bab → Subbab opsional`

Subbab tidak diwajibkan saat murid memesan kelas. Opsi **Seluruh materi dalam bab** disediakan sebagai pilihan awal. Murid tetap dapat menulis kesulitan khusus melalui kolom catatan.

Setiap data kurikulum perlu menyimpan:

- nama kurikulum;
- tahun atau edisi;
- jenjang;
- kelas;
- kelompok mapel;
- nama mapel;
- nama bab;
- nomor urut;
- status wajib atau pilihan;
- status aktif;
- sumber buku.

Judul bab yang tersedia langsung dari buku siswa dicatat sebagai judul buku SIBI.
Untuk mapel yang buku atau edisinya berbeda antar sekolah, seeder memakai struktur
materi awal yang dapat disesuaikan admin. Capaian Pembelajaran pemerintah disusun
per fase, bukan sebagai satu daftar bab nasional. Penyimpanan edisi diperlukan agar
perubahan buku tidak merusak transaksi lama.

## 2. Cakupan mata pelajaran

### Kelas 1–2

- Pendidikan Agama Islam dan Budi Pekerti
- Pendidikan Agama Kristen dan Budi Pekerti
- Pendidikan Agama Katolik dan Budi Pekerti
- Pendidikan Agama Buddha dan Budi Pekerti
- Pendidikan Agama Hindu dan Budi Pekerti
- Pendidikan Agama Khonghucu dan Budi Pekerti
- Pendidikan Pancasila
- Bahasa Indonesia
- Matematika
- Pendidikan Jasmani, Olahraga, dan Kesehatan
- Seni Musik
- Seni Rupa
- Seni Teater
- Seni Tari
- Muatan Lokal

### Kelas 3–4

Seluruh mapel kelas 1–2 tetap tersedia. Mapel berikut ditambahkan:

- Ilmu Pengetahuan Alam dan Sosial
- Bahasa Inggris

### Kelas 5–6

Seluruh mapel kelas 3–4 tetap tersedia. Mapel berikut ditambahkan sebagai pilihan:

- Koding dan Kecerdasan Artifisial

### Kelas 7–9

- Enam pilihan Pendidikan Agama dan Budi Pekerti
- Pendidikan Pancasila
- Bahasa Indonesia
- Matematika
- Ilmu Pengetahuan Alam
- Ilmu Pengetahuan Sosial
- Bahasa Inggris
- Pendidikan Jasmani, Olahraga, dan Kesehatan
- Informatika
- Seni Musik
- Seni Rupa
- Seni Teater
- Seni Tari
- Prakarya Budi Daya
- Prakarya Kerajinan
- Prakarya Rekayasa
- Prakarya Pengolahan
- Koding dan Kecerdasan Artifisial sebagai pilihan
- Muatan Lokal

### Kelas 10

- Enam pilihan Pendidikan Agama dan Budi Pekerti
- Pendidikan Pancasila
- Bahasa Indonesia
- Matematika
- Ilmu Pengetahuan Alam
- Fisika sebagai bagian muatan IPA
- Kimia sebagai bagian muatan IPA
- Biologi sebagai bagian muatan IPA
- Ilmu Pengetahuan Sosial
- Sosiologi sebagai bagian muatan IPS
- Ekonomi sebagai bagian muatan IPS
- Sejarah sebagai bagian muatan IPS
- Geografi sebagai bagian muatan IPS
- Bahasa Inggris
- Pendidikan Jasmani, Olahraga, dan Kesehatan
- Informatika
- Seni Musik
- Seni Rupa
- Seni Teater
- Seni Tari
- Prakarya Budi Daya
- Prakarya Kerajinan
- Prakarya Rekayasa
- Prakarya Pengolahan
- Koding dan Kecerdasan Artifisial sebagai pilihan
- Muatan Lokal

IPA dan IPS kelas 10 dapat diajarkan secara terintegrasi, bergantian, atau paralel. Katalog BimbelKu perlu menyediakan induk IPA/IPS dan bidang turunannya.

### Kelas 11–12: mapel wajib

- Enam pilihan Pendidikan Agama dan Budi Pekerti
- Pendidikan Pancasila
- Bahasa Indonesia
- Matematika
- Bahasa Inggris
- Pendidikan Jasmani, Olahraga, dan Kesehatan
- Sejarah
- Seni Musik
- Seni Rupa
- Seni Teater
- Seni Tari

### Kelas 11–12: mapel pilihan

- Matematika Tingkat Lanjut
- Fisika
- Kimia
- Biologi
- Geografi
- Sejarah Tingkat Lanjut
- Sosiologi
- Ekonomi
- Bahasa Indonesia Tingkat Lanjut
- Bahasa Inggris Tingkat Lanjut
- Bahasa Arab
- Bahasa Jepang
- Bahasa Jerman
- Bahasa Korea
- Bahasa Mandarin
- Bahasa Prancis
- Antropologi
- Informatika
- Koding dan Kecerdasan Artifisial
- Prakarya dan Kewirausahaan Budi Daya
- Prakarya dan Kewirausahaan Kerajinan
- Prakarya dan Kewirausahaan Rekayasa
- Prakarya dan Kewirausahaan Pengolahan
- Muatan Lokal
- Mapel lain yang dikembangkan sekolah

## 3. Aturan pengisian bab

1. Bab buku SIBI dipakai jika tersedia; struktur awal lainnya dapat disesuaikan menurut buku sekolah.
2. Satu nama bab hanya dibuat sekali pada kombinasi kurikulum, kelas, dan mapel.
3. Perbedaan kapital dan spasi tidak membuat data baru.
4. Subbab bersifat opsional.
5. Opsi **Seluruh materi mapel** ditempatkan sebelum daftar bab.
6. Opsi **Bab/materi lain** disediakan untuk perbedaan buku sekolah.
7. Teks bebas disimpan sebagai catatan, bukan sebagai mapel atau bab baru.
8. Tutor dicocokkan berdasarkan mapel dan jenjang. Bab tidak menggugurkan tutor yang sesuai.
9. Mapel tanpa bab diberi status **Materi belum dilengkapi**.
10. Data lama tidak dihapus saat edisi baru diterbitkan. Edisi lama dinonaktifkan.

## 4. Perubahan antarmuka yang diperlukan

### Pemesanan murid

- Kelas diambil dari profil, tetapi tetap dapat diubah.
- Mapel ditampilkan setelah kelas dipilih.
- Mapel wajib dan pilihan dipisahkan.
- Dropdown mapel dan bab memiliki pencarian.
- Pilihan awal bab ialah **Seluruh materi mapel**.
- Subbab tidak wajib.
- Catatan kebutuhan belajar tetap tersedia.

### Profil tutor

- Mapel dipilih dari katalog yang sama.
- Mapel tidak menerima teks bebas.
- Jenjang yang dikuasai tetap diverifikasi admin.
- Perubahan mapel memerlukan pemeriksaan ulang.

### Tarif khusus

- Dropdown mapel langsung terbuka.
- Kolom pencarian memfilter daftar.
- Teks yang belum cocok menampilkan tindakan penambahan mapel.
- Mapel baru dinormalisasi untuk mencegah duplikasi.
- Tarif dasar dipakai selama tarif khusus belum dibuat.

### Admin

- Impor awal dilakukan melalui seeder, bukan input manual.
- Admin dapat menambah muatan lokal atau mapel sekolah.
- Mapel yang telah digunakan hanya dapat dinonaktifkan.
- Bab dapat diperbarui per edisi tanpa mengubah transaksi lama.

## 5. Penilaian pengalaman pengguna

Kesan awal platform sudah lebih dari cukup dari sisi cakupan proses. Pemesanan, pencocokan tutor, pembayaran, kelas, bukti sesi, sengketa, dan pencairan telah dipikirkan.

Kekurangan utama masih berada pada kejelasan alur, bukan jumlah fitur:

1. Tombol detail kelas murid harus dapat dibuka.
2. Tagihan belum dibayar harus langsung terlihat setelah tutor menerima.
3. Filter transaksi belum dibayar harus menampilkan tagihan terkait.
4. Jadwal perlu memakai kelipatan sepuluh menit tanpa batas tunggu dua jam.
5. Pilihan online atau offline harus terlihat sebelum pencarian tutor dimulai.
6. Status pencarian tutor perlu menampilkan batas waktu dan langkah berikutnya.
7. Opsi seluruh materi perlu tersedia agar pemilihan bab tidak terasa memaksa.
8. Katalog besar perlu pencarian dan pengelompokan. Daftar panjang biasa akan melelahkan.
9. Guru yang hanya boleh memilih satu mapel dapat memperkecil pasokan tutor pada mapel langka.
10. Mapel agama, seni, muatan lokal, dan pilihan SMA tidak boleh ditampilkan sekaligus tanpa filter kelas.

Prioritas sebelum menambah fitur baru ialah memperbaiki alur detail kelas, pembayaran, transaksi, jadwal, dan katalog.

Pengelompokan bertahap juga didukung oleh penelitian pilihan konsumen. Pilihan berlebihan dapat menurunkan motivasi dan mempersulit keputusan pengguna.

## 6. Referensi

Kementerian Pendidikan Dasar dan Menengah Republik Indonesia. (2025). *Peraturan Menteri Pendidikan Dasar dan Menengah Republik Indonesia Nomor 13 Tahun 2025 tentang perubahan atas Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 12 Tahun 2024 tentang kurikulum pada pendidikan anak usia dini, jenjang pendidikan dasar, dan jenjang pendidikan menengah*. https://www.kemendikdasmen.go.id/download/file/1392

Kementerian Pendidikan Dasar dan Menengah Republik Indonesia. (n.d.). *Sistem Informasi Perbukuan Indonesia*. Retrieved July 28, 2026, from https://buku.kemendikdasmen.go.id/

Kementerian Pendidikan Dasar dan Menengah Republik Indonesia. (2025). *Peraturan Menteri Pendidikan Dasar dan Menengah Republik Indonesia Nomor 12 Tahun 2025 tentang standar isi pada pendidikan anak usia dini, jenjang pendidikan dasar, dan jenjang pendidikan menengah*. https://peraturan.bpk.go.id/Details/322494/permendikdasmen-no-12-tahun-2025

Iyengar, S. S., & Lepper, M. R. (2000). When choice is demotivating: Can one desire too much of a good thing? *Journal of Personality and Social Psychology, 79*(6), 995–1006. https://doi.org/10.1037/0022-3514.79.6.995
