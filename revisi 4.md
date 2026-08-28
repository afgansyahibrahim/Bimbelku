# Revisi 4 — Konfirmasi dan Rencana Perbaikan

## Status klarifikasi terbaru

- Guru memiliki maksimal satu mapel/bidang utama. Privat dan kelompok adalah pengaturan layanan terpisah; privat aktif secara bawaan, kelompok tidak aktif.
- Grafik diprioritaskan di dashboard admin desktop: jumlah sesi/pesanan per periode dan status sesi. Mobile menampilkan ringkasan dan satu grafik penting dalam satu kolom.
- Register desktop memenuhi lebar layar: sisi kiri/ilustrasi sekitar setengah layar dan form lebih lebar; mobile dipertahankan.
- Paket 1 sesi maksimal memilih 1 hari; paket 4 sesi maksimal memilih 2 hari. Beberapa sesi boleh jatuh pada hari yang sama dan berulang mengikuti interval sistem.
- Footer dapat menambah/mengedit beberapa tautan media sosial. Ikon dipilih dari katalog bawaan (Instagram, Facebook, YouTube, dan ikon umum lain), bukan upload manual.
- Filter tutor berdasarkan mapel saja; jenjang hanya milik murid.
- Chat memiliki scroll internal pada daftar pesan, sementara area di luar chat tetap dapat di-scroll sendiri. Saat dibuka, chat langsung ke pesan terakhir.

## Rencana before–after per revisi

| No | Before | After dan rencana implementasi aman |
|---|---|---|
| 1 | Harga yang dihapus menyisakan `0` sehingga input baru menjadi `050000`. | Input boleh kosong saat diedit, leading zero dihapus saat input/submit, nominal harus positif, dan nilai mentah dipisahkan dari format tampilan. Uji backspace, paste, blur, submit, dan format ribuan. |
| 2 | Guru dapat memiliki mapel tidak sesuai bidang. | Satu guru hanya satu mapel. Privat/kelompok adalah pilihan layanan terpisah, dengan privat aktif sebagai default. Batasi di UI dan validasi backend; data lama berlebih dilaporkan untuk ditinjau. |
| 3 | Admin tidak punya grafik operasional. | Tambahkan kartu angka + grafik sesi/pesanan dan status sesi di desktop. Ini prioritas karena admin perlu melihat antrean, beban kerja, tren, dan sesi bermasalah secara cepat. Mobile memakai layout satu kolom dan hanya grafik terpenting agar tidak sempit. Validasi grafik terhadap hitungan tabel. |
| 4 | Register desktop berupa box sempit di tengah dengan ruang kosong kiri-kanan. | Gunakan layout desktop memenuhi layar; sisi kiri/ilustrasi kira-kira 50% dan form lebih lebar di kanan. Terapkan hanya pada breakpoint desktop agar mobile tidak rusak. |
| 5 | Pengguna sering harus bertanya pusat bantuan; chatbot belum pasti biaya/kuotanya. | Fase pertama: FAQ statis singkat, terkelompok, dapat dicari, dan memiliki fallback ke pusat bantuan. Chatbot AI baru dievaluasi setelah data pertanyaan terkumpul; target gratis 100 jawaban/hari tidak dijamin tanpa provider yang sesuai. |
| 6 | Paket 1 sesi dapat memilih 4 hari; paket 4 sesi 4 hari. | Konfigurasi batas hari unik: paket 1 = 1, paket 4 = 2. Sesi berulang boleh berada di hari yang sama. Tampilkan penghitung batas, nonaktifkan pilihan berlebih, dan validasi ulang saat submit. |
| 7 | Nama profil desktop tertutup garis/elemen biru. | Atur ulang lebar, padding, alignment, dan overflow agar nama panjang tetap terbaca tanpa menimpa elemen visual. Uji zoom dan berbagai panjang nama. |
| 8 | Detail audit berupa JSON mentah. | Tampilkan kalimat perubahan: siapa, kapan, field apa, nilai sebelum, dan sesudah (contoh: “Harga diubah dari Rp40.000 menjadi Rp50.000”). JSON asli tetap disimpan untuk teknis, tetapi disembunyikan dari tampilan umum. |
| 9 | Footer tidak muncul/tersimpan dan ikon perlu diunduh manual. | Perbaiki skema database, endpoint, validasi URL, urutan, status aktif, dan fallback. Admin memilih ikon katalog bawaan lalu menambah beberapa URL media sosial; simpan identifier ikon, bukan file. |
| 10 | Tabel tutor tidak menampilkan mapel dan belum ada filter. | Tambah kolom mapel dan filter mapel server-side yang bisa digabung pencarian/pagination. Jenjang tidak ditambahkan karena hanya atribut murid. Data kosong tampil “Belum diisi”. |
| 11 | Scroll chat menggerakkan seluruh halaman. | Jadikan daftar pesan satu-satunya scroll container internal; area luar chat tetap punya scroll sendiri bila konten panjang. Composer/header tetap terjangkau. Saat membuka percakapan, scroll ke pesan terakhir; jangan memaksa lompat jika user sedang membaca pesan lama. Terapkan konsisten untuk murid dan guru, lalu cek admin. |

## Urutan dan pengamanan

1. Migration/aturan backend: 1, 2, 6, 8, 9.
2. Dashboard dan tabel admin: 3, 10.
3. Responsive/UI dan chat: 4, 7, 11.
4. FAQ: 5 (chatbot fase terpisah).

Sebelum perubahan database, buat backup dan migration yang dapat dibatalkan. Kerjakan satu nomor per rilis kecil, gunakan feature flag untuk modul baru, pertahankan data lama, dan uji peran admin/guru/murid pada desktop/mobile. Smoke test akhir wajib mencakup register, pemesanan, pembayaran, chat, footer, grafik, dan audit.

## Satu hal yang masih opsional untuk diputuskan

Untuk grafik, rekomendasi default adalah rentang mingguan dengan pilihan harian/bulanan. Jika kebutuhan admin lebih condong ke laporan keuangan, grafik pendapatan dapat ditambahkan sebagai tahap kedua setelah definisi perhitungannya disepakati.
