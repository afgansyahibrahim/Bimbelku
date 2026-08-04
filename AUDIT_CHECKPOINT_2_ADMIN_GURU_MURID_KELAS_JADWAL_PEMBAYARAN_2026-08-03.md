# Audit Checkpoint 2 — Admin, Tutor, Murid, Kelas, Jadwal, dan Pembayaran

Tanggal audit: 3 Agustus 2026  
Basis kode: full project terbaru + patch tutorial terbaru + penghapusan autentikator admin + admin tunggal + Audit Checkpoint 1.

## Ruang lingkup

Checkpoint ini memeriksa alur operasional utama berikut:

- 22 halaman admin;
- 12 halaman tutor;
- 12 halaman murid;
- 20 controller operasional terkait;
- 34 route murid, 25 route tutor, dan 82 route admin;
- kelas privat dan kelompok;
- pencarian/penetapan tutor;
- jadwal mengajar dan benturan waktu;
- tagihan, bukti pembayaran, verifikasi, komisi, saldo, pencairan, dan rekening penerimaan.

Chat, notifikasi, laporan perkembangan, dan upload mendalam dilanjutkan pada Checkpoint 3. Responsif, aksesibilitas, performa browser, serta keamanan lanjutan diperiksa pada Checkpoint 4.

## Ringkasan hasil

| No | Halaman/Fitur | Role | Jenis Masalah | Risiko | Penyebab | File Terkait | Solusi | Status |
|---:|---|---|---|---|---|---|---|---|
| 1 | Jadwal mengajar | Tutor | Logika/validasi | Tinggi | Backend menerima menit seperti `09:05`, padahal aturan produk mewajibkan interval 10 menit. Input browser juga belum memakai langkah 600 detik. | `TeacherScheduleController.php`, `ManageSchedule.tsx` | Validasi kelipatan 10 menit diterapkan di frontend dan backend; input memakai `step={600}`. | Diperbaiki |
| 2 | Dashboard murid | Murid | Data salah | Sedang | Jumlah pesan belum dibaca selalu dikirim sebagai `0`, bukan dihitung dari database. | `StudentPackageController.php` | Menghitung pesan dari kelas yang benar-benar diikuti dan telah dibayar, lalu mengecualikan pesan yang sudah dibaca. | Diperbaiki |
| 3 | Rekening penerimaan | Admin | Konsistensi pembayaran | Tinggi | Larangan mengganti rekening hanya melihat tagihan booking aktif; tagihan paket aktif belum ikut diperiksa. | `AdminController.php` | Query penguncian rekening diperluas ke `learningPackage.payment_due_at` dan bukti transfer yang menunggu pemeriksaan. | Diperbaiki |
| 4 | Blokir akun murid | Admin/Murid | Kesalahan logika bisnis | Sedang | Pemblokiran semua role memanggil layanan pelepasan penawaran tutor. Murid yang diblokir dapat memicu proses yang seharusnya khusus tutor. | `AdminController.php` | Role pengguna dikunci dan dicatat dalam transaksi; pelepasan penawaran hanya dijalankan jika role yang diblokir adalah tutor. | Diperbaiki |
| 5 | Pemeriksaan Tahap 6C-A | Admin | Regresi checker | Sedang | Checker masih mewajibkan menu “Keamanan keuangan” yang sudah sengaja dihapus pada keputusan admin tunggal. | `scripts/check-stage6c-a.mjs` | Kontrak disinkronkan dengan keputusan terbaru tanpa mengurangi pemeriksaan menu pembayaran dan pencairan. | Diperbaiki |
| 6 | Audit otomatis Checkpoint 2 | Semua | Kekurangan pengujian | Sedang | Belum ada pemeriksaan khusus yang menjaga lima perbaikan operasional di atas. | `scripts/check-checkpoint2.mjs`, `CheckpointTwoOperationsAuditTest.php` | Ditambahkan kontrak statis dan tes fitur Laravel untuk interval jadwal, tagihan paket aktif, serta pesan belum dibaca. | Ditambahkan |

## Hal yang diperiksa dan dinyatakan konsisten secara statis

### Admin

- Hanya admin utama yang dapat melewati middleware admin.
- Verifikasi pembayaran hanya menerima order berstatus `submitted` dan bukti transfer yang tersedia.
- Alasan wajib diberikan saat pembayaran ditolak.
- Order dikunci ulang dalam transaksi sebelum status berubah.
- Pencairan hanya mengambil booking `completed` dengan status dana `ready` atau `requested`.
- Pencairan memakai `lockForUpdate`, bukti transfer privat, rekening snapshot, dan mencegah sesi dicairkan dua kali.
- Perubahan rekening penerimaan diblokir selama ada tagihan aktif atau bukti transfer yang belum diperiksa.
- Pemblokiran akun admin melalui menu pengguna ditolak.
- Pencarian tutor, perluasan radius, dan penetapan manual tetap tersedia.

### Tutor

- Penawaran hanya dapat diterima/ditolak oleh tutor pemilik penawaran.
- Jadwal mengajar terdiri dari tujuh hari unik dan jam selesai harus lebih besar dari jam mulai.
- Menit mulai/selesai wajib berada pada interval 10 menit.
- Perubahan jadwal melepaskan penawaran yang sudah tidak aman dan menjalankan pencarian berikutnya.
- Permintaan pencairan mengunci booking yang dipilih serta memindahkan status dana menjadi `requested`.
- Rekening tutor dan masa tahan rekening tetap diperiksa sebelum pencairan.

### Murid

- Daftar kelas hanya mengambil kelas yang memiliki hubungan peserta dengan murid tersebut.
- Akses sesi penuh baru diberikan setelah order peserta berstatus `paid`.
- Detail paket dibatasi dengan pemeriksaan `student_id`.
- Pembayaran hanya dapat diajukan untuk order milik murid dan status yang masih dapat dibayar.
- Pembatalan dan kedaluwarsa mengunci order serta memperbarui peserta, booking, penawaran, dan paket terkait dalam transaksi.
- Jumlah pesan belum dibaca pada dashboard kini berasal dari database.

### Kelas dan jadwal

- Route kelas admin, tutor, dan murid dipisahkan berdasarkan role.
- Jadwal tutor menggunakan interval 10 menit pada UI dan API.
- Proses pembayaran memakai kunci baris sebelum mengubah status booking/order.
- Alur kelompok mempertahankan peserta lain ketika satu pembayaran berubah.
- Pemeriksaan benturan dan skenario dua pengguna pada database nyata tetap harus dijalankan melalui tes Laravel di Laragon.

## File yang diubah

1. `bimbelku-backend/app/Http/Controllers/Api/AdminController.php`
2. `bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php`
3. `bimbelku-backend/app/Http/Controllers/Api/TeacherScheduleController.php`
4. `src/pages/teacher/ManageSchedule.tsx`
5. `scripts/check-stage6c-a.mjs`
6. `scripts/check-checkpoint2.mjs`
7. `bimbelku-backend/tests/Feature/CheckpointTwoOperationsAuditTest.php`
8. `package.json`
9. Dokumen audit dan pemasangan Checkpoint 2.

## File yang dihapus

Tidak ada file runtime yang dihapus pada Checkpoint 2. Tidak ditemukan file dalam ruang lingkup ini yang aman dibuang tanpa masuk ke audit dependensi/performa Checkpoint 4. Menghapus source hanya untuk mengecilkan folder tidak dibenarkan bila tidak memberi pengaruh pada bundle browser.

## Hasil pengujian di lingkungan penyusunan

Lulus:

- `npm run check:checkpoint1`
- `npm run check:checkpoint2`
- `npm run check:contracts` — 184 action API cocok dengan controller/method.
- `npm run check:file-preview`
- kontrak Tahap 2, 3, 4, 5, 6A, 6B, 6C-A, 6C-B, 6C-C, 6C-D, dan 6C-final;
- pemetaan 60 route frontend dan 173 tautan internal;
- pemeriksaan struktur PHP — 247 file;
- `php -l` pada 247 file PHP;
- pemeriksaan sintaks 118 file TypeScript/TSX menggunakan transpiler TypeScript global.

Belum dapat dijalankan di lingkungan penyusunan:

- PHPUnit/Laravel runtime karena folder `vendor` tidak tersedia;
- `npm run typecheck`, ESLint, dan build Vite penuh karena `node_modules` tidak tersedia;
- pengujian MySQL nyata, termasuk dua murid memesan slot yang sama secara bersamaan;
- pengujian browser manual untuk seluruh tombol dan ukuran layar.

## Bug yang belum selesai pada checkpoint ini

Tidak ada bug statis terbuka yang sengaja ditinggalkan dalam ruang lingkup Checkpoint 2. Namun status runtime baru dapat dinyatakan lulus setelah perintah pengujian lokal pada dokumen pemasangan berhasil.

## Checkpoint berikutnya

Checkpoint 3: chat, notifikasi, laporan, perkembangan murid, upload, bukti privat, pusat bantuan, dan fitur pendukung.
