Saat ini tersedia 4 command demo. Jalankan dari PowerShell di folder backend.

  Set-Location "C:\laragon\www\Website_Bimbelku\bimbelku-backend"
  php artisan optimize:clear

  ### 1. Demo Kelas Kelompok / Cheap Class

  Jalankan bertahap sambil mengikuti tampilan website:

  # Bersihkan demo sebelumnya
  php artisan demo:cheap-class reset

  # Siapkan kelas sebelum pembayaran
  php artisan demo:cheap-class pre-payment

  # Periksa kondisi demo
  php artisan demo:cheap-class status

  # Simulasikan murid mengirim bukti pembayaran
  php artisan demo:cheap-class payment-submitted

  # Simulasikan admin menyetujui pembayaran
  php artisan demo:cheap-class payment-paid

  # Jadikan sesi sedang berlangsung
  php artisan demo:cheap-class session-live

  # Akhiri sesi
  php artisan demo:cheap-class session-ended

  # Periksa hasil akhirnya
  php artisan demo:cheap-class status

  Akun:

  Murid: demo.student@bimbelku.local
  Tutor: demo.tutor@bimbelku.local
  Password: password

  ### 2. Demo Session Reminder / Alur Sesi

  # Bersihkan demo sebelumnya
  php artisan demo:session-reminder reset

  # Buat paket dan sesi demo
   

  # Periksa status
  php artisan demo:session-reminder status

  Setelah setup:

  1. Tutor menekan “Saya Siap Mengajar”.
  2. Murid menekan “Saya Sudah Hadir”.
  3. Jalankan:

  php artisan demo:session-reminder checkout-ready

  Kemudian tutor bisa mengakhiri sesi dan mengisi hasil belajar.

  ### 3. Demo Perpanjangan Paket / Renewal

  # Bersihkan renewal aktif sebelumnya
  php artisan demo:package-renewal reset

  # Buat Paket 1 yang sudah selesai
  php artisan demo:package-renewal setup

  # Periksa status
  php artisan demo:package-renewal status

  Setelah itu murid membuat perpanjangan melalui website. Lanjutkan:

  # Simulasikan pembayaran Paket 2
  php artisan demo:package-renewal payment-paid

  Tutor kemudian menerima permintaan lewat website. Setelah diterima:

  # Percepat Paket 2 ke sesi terakhir
  php artisan demo:package-renewal final-session-ready

  Setelah tutor dan murid melakukan konfirmasi kehadiran:

  # Jadikan sesi siap diakhiri
  php artisan demo:package-renewal checkout-ready

  # Periksa hasil
  php artisan demo:package-renewal status

  Jangan menjalankan semua tahap sekaligus karena beberapa tahap membutuhkan tindakan di website terlebih dahulu.

  ### 4. Demo Ganti Guru

  # Arsipkan fixture aktif sebelumnya
  php artisan demo:teacher-replacement reset

  # Buat paket aktif: 1 sesi selesai dan 2 sesi mendatang
  php artisan demo:teacher-replacement setup

  # Periksa status kapan saja
  php artisan demo:teacher-replacement status

  Akun:

  Murid: demo.replacement.student@bimbelku.local
  Guru lama: demo.replacement.old@bimbelku.local
  Guru baru: demo.replacement.new@bimbelku.local
  Password: password

  Alur guru ditemukan:

  1. Murid membuka Kelas Saya dan mengajukan ganti guru pada mapel demo.
  2. Admin membuka Pusat Kasus > Penggantian Guru lalu menyetujui.
  3. Guru baru membuka Permintaan Bimbel lalu menerima offer.
  4. Jalankan status. Dua sesi mendatang harus berpindah, sementara sesi selesai tetap milik guru lama.

  Alur pencarian berulang sampai refund:

  1. Ulangi reset dan setup, lalu murid mengajukan dan admin menyetujui.
  2. Jalankan: php artisan demo:teacher-replacement no-teacher
  3. Murid dapat menekan Cari lagi. Selama kandidat mati, percepat setiap siklus gagal dengan menjalankan no-teacher lagi.
  4. Murid juga dapat memilih Ubah jadwal untuk membuktikan aturan minimal 24 jam.
  5. Setelah tetap tidak ditemukan, murid memilih Refund sisa sesi. Shortcut pembuat antrean: refund-ready.
  6. Murid memilih tujuan refund dan Admin menyelesaikannya melalui Refund & Saldo. Shortcut lokal sampai selesai: complete-refund.

  Variasi kandidat:

  php artisan demo:teacher-replacement candidate-off
  php artisan demo:teacher-replacement candidate-on

  `candidate-off` membuat pencarian tetap gagal. Setelah `candidate-on`, klik Cari lagi agar guru pengganti ditemukan.





 ### Menjalankan demo

  cd C:\laragon\www\Website_Bimbelku\bimbelku-backend

  php artisan demo:teacher-replacement reset
  php artisan demo:teacher-replacement setup
  php artisan demo:teacher-replacement status

  Alur berhasil mendapatkan guru:

  1. Login sebagai murid dan ajukan ganti guru.
  2. Login admin dan setujui permintaan.
  3. Login sebagai guru kandidat lalu terima penawaran.
  4. Sistem memindahkan dua sesi mendatang tanpa membuat paket baru.

  Alur guru tidak ditemukan sampai refund:

  php artisan demo:teacher-replacement no-teacher

  Setelah murid menekan Cari Lagi, jalankan kembali command tersebut untuk menyimulasikan pencarian berikutnya yang gagal. Setelah batas
  pencarian tercapai, murid dapat meminta refund.

  Untuk mempercepat demonstrasi refund:

  php artisan demo:teacher-replacement refund-ready
  php artisan demo:teacher-replacement complete-refund




  - Murid: demo.replacement.student@bimbelku.local
  - Guru lama: demo.replacement.old@bimbelku.local
  - Guru pengganti: demo.replacement.new@bimbelku.local
  - Password semuanya: password