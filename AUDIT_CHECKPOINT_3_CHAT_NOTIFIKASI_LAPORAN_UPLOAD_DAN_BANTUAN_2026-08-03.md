# Audit Checkpoint 3 — Chat, Notifikasi, Laporan, Upload, dan Bantuan

Tanggal audit: 3 Agustus 2026  
Basis kode: full project terbaru + seluruh patch sampai Checkpoint 2 + perbaikan penetapan tutor manual.

## Ruang lingkup

Checkpoint ini memeriksa chat kelas, pesan sistem otomatis, penanda pesan dibaca, notifikasi, laporan perkembangan, privasi kelas kelompok, pusat bantuan, lampiran chat/tiket, dokumen tutor, dan file privat.

## Ringkasan hasil

| No | Halaman/Fitur | Role | Masalah | Risiko | Penyebab | Solusi | Status |
|---:|---|---|---|---|---|---|---|
| 1 | Laporan kelas kelompok | Murid | Laporan peserta lain dapat ikut terkirim | Kritis | Relasi laporan dimuat tanpa filter `student_id` | Endpoint sesi dan dashboard hanya mengambil laporan milik murid yang login | Diperbaiki |
| 2 | Chat kelas | Tutor/Murid | Pesan sistem pesanan tidak lagi terhubung ke alur aktif | Tinggi | Service lama hanya dipakai controller yang sudah tidak diroute | Service pesan sistem diintegrasikan ke `LearningSessionController` aktif | Diperbaiki |
| 3 | Status pesan dibaca | Tutor/Murid | Pesan lama tetap belum dibaca setelah jumlah pesan melebihi 100 | Sedang | Hanya 100 ID terbaru yang ditandai dibaca | Seluruh pesan belum dibaca diproses bertahap dengan `chunkById` | Diperbaiki |
| 4 | Laporan sesi | Tutor | Laporan sesi yang sama dapat diterbitkan berulang | Tinggi | Nomor laporan terus ditambah walau satu booking mewakili satu sesi | Duplikasi per booking dan murid ditolak dalam transaksi | Diperbaiki |
| 5 | Pusat bantuan | Semua | Urutan tiket gagal pada SQLite dan preview balasan tidak stabil | Tinggi | Query memakai `FIELD()` khusus MySQL dan eager limit relasi | Diganti `CASE WHEN` portabel dan relasi `latestReply()` | Diperbaiki |
| 6 | Notifikasi bantuan | Admin/Tutor/Murid | Pihak lawan tidak diberi tahu saat tiket dibuat, dibalas, atau ditutup | Sedang | Controller tidak membuat notifikasi counterpart | Notifikasi idempoten dan tautan sesuai role ditambahkan | Diperbaiki |
| 7 | Notifikasi pengguna | Semua | ID notifikasi asing/tidak ada tetap mengembalikan sukses | Sedang | `find()` diam-diam menghasilkan `null` | Pencarian dibatasi pemilik dan memakai `findOrFail()` | Diperbaiki |
| 8 | Unduhan file privat | Semua | Nama file dapat membawa karakter header berbahaya | Tinggi | Nama asli dipakai langsung pada `Content-Disposition` | Basename serta CR/LF, slash, dan kutip dibersihkan | Diperbaiki |
| 9 | Source lama chat | Pengembang | Controller/model/checker lama tidak lagi dipakai | Rendah | Alur chat sudah berpindah ke learning session | Tiga file mati dibuang; migration historis tetap dipertahankan | Diperbaiki |
| 10 | UI laporan kelompok | Tutor | Identitas murid tidak terlihat pada kartu laporan | Sedang | Payload dan tipe UI tidak membawa nama murid | `student_name` ditambahkan pada payload dan judul laporan | Diperbaiki |

## File runtime yang diubah

- `bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php`
- `bimbelku-backend/app/Http/Controllers/Api/StudentController.php`
- `bimbelku-backend/app/Http/Controllers/Api/TicketController.php`
- `bimbelku-backend/app/Http/Controllers/Api/NotificationController.php`
- `bimbelku-backend/app/Http/Controllers/Api/ProtectedFileController.php`
- `bimbelku-backend/app/Http/Controllers/Api/LearningAttachmentController.php`
- `bimbelku-backend/app/Http/Controllers/Api/TeacherDocumentController.php`
- `bimbelku-backend/app/Models/ClassroomMessage.php`
- `bimbelku-backend/app/Models/Ticket.php`
- `src/components/MarketplaceMessages.tsx`
- `src/components/LearningSessionHub.tsx`
- `src/components/StudentWorkspaceList.tsx`
- `src/pages/common/HelpCenter.tsx`
- `src/pages/admin/AdminMessages.tsx`

## File yang ditambahkan

- `bimbelku-backend/tests/Feature/CheckpointThreeCommunicationAuditTest.php`
- `scripts/check-checkpoint3.mjs`
- `scripts/apply-checkpoint3-cleanup.ps1`
- dokumen audit dan pemasangan Checkpoint 3.

## File yang dihapus oleh script pembersihan

- `bimbelku-backend/app/Http/Controllers/Api/ClassroomConversationController.php`
- `bimbelku-backend/app/Models/ClassroomConversationRead.php`
- `scripts/check-revision4-messages.mjs`

Migration `2026_07_31_000100_create_classroom_conversation_reads_table.php` tidak dihapus karena mungkin sudah tercatat pada database lama.

## Hasil pengujian di lingkungan penyusunan

Lulus:

- `npm run check:checkpoint1`
- `npm run check:checkpoint2`
- `npm run check:checkpoint3`
- pemeriksaan kontrak 184 action API;
- pemetaan 60 route frontend dan 173 tautan internal;
- pemeriksaan statis dan `php -l` pada 246 file PHP;
- `tsc --noEmit`.

Belum dapat dijalankan di lingkungan penyusunan:

- PHPUnit/Laravel runtime karena folder `vendor` tidak tersedia;
- build Vite penuh karena `node_modules` tidak tersedia;
- pengujian browser manual dan upload file nyata.

## Tes runtime baru

`CheckpointThreeCommunicationAuditTest` memeriksa:

1. murid kelompok hanya melihat laporan miliknya;
2. lebih dari 100 pesan dapat seluruhnya ditandai dibaca;
3. pesan sistem pesanan dibuat satu kali secara idempoten;
4. daftar tiket aman pada SQLite dan notifikasi counterpart terkirim;
5. laporan sesi duplikat ditolak.

## Bug yang belum selesai

Tidak ada bug statis yang sengaja ditinggalkan dalam ruang lingkup Checkpoint 3. Status runtime baru dinyatakan lulus setelah tes di Laragon berhasil.

## Checkpoint berikutnya

Checkpoint 4: responsif desktop/tablet/HP, aksesibilitas, keamanan lanjutan, performa, query N+1, ukuran asset, dan audit dependensi/file yang tidak diperlukan.
