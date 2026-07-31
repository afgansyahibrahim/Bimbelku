# Checkpoint Tahap 1 — Fondasi Sistem dan Akun

Tanggal: 29 Juli 2026  
Dasar source: revisi Tingkat Umum, Perguruan Tinggi, dan pratinjau bukti

## Status

Implementasi source Tahap 1 telah selesai. Data lama tidak dihapus dan migration
baru tidak memakai `migrate:fresh`.

Frontend, kontrak API, build produksi, batas performa, dan sintaks PHP telah
diperiksa. Tes Laravel perlu dijalankan melalui Laragon sebelum perubahan
diterapkan pada database utama.

## Keputusan yang diterapkan

- Peran akun terdiri atas murid, tutor, dan admin.
- Murid aktif setelah registrasi berhasil.
- Tutor tetap berstatus `pending` sampai dokumennya disetujui admin.
- Admin tidak dapat dibuat melalui halaman registrasi publik.
- Persyaratan tutor terdiri atas kartu identitas, foto wajah langsung, dan
  ijazah atau bukti kualifikasi.
- Sertifikat pendukung bersifat opsional.
- Tes materi, wawancara, microteaching, dan masa percobaan tidak digunakan.
- Kategori pembelajaran terdiri atas SD, SMP, SMA, Perguruan Tinggi, dan Umum.
- Perguruan Tinggi memakai semester.
- Umum memakai Semua tingkat, Pemula, Menengah, dan Lanjutan.

## Perubahan fondasi akun

### Persetujuan orang tua atau wali

- Tanggal lahir wajib diisi pada registrasi murid baru.
- Murid di bawah 18 tahun wajib melengkapi data orang tua atau wali.
- Nama, nomor kontak, hubungan, dan waktu persetujuan wali dicatat.
- Persetujuan wali tidak dikirim melalui respons registrasi.
- Murid dapat melihat ringkasan data wali pada profilnya.
- Admin dapat memeriksa data wali melalui Manajemen Akun Pengguna.
- Perubahan data wali diarahkan melalui Pusat Bantuan.

### Perlindungan data pribadi

- Nomor telepon, alamat, koordinat, dan data wali disembunyikan dari serialisasi
  model pengguna.
- Nomor tutor, koordinat, dan rekening disembunyikan dari serialisasi profil
  tutor.
- Pemilik akun tetap dapat melihat datanya melalui endpoint profil khusus.
- Admin tetap dapat memeriksa data yang diperlukan melalui endpoint berperan.
- Nomor tutor tidak lagi diberikan kepada murid.
- Nomor murid tidak lagi diberikan kepada tutor.
- Dokumen tutor tetap disimpan pada disk privat.
- Dokumen hanya dapat dibuka oleh tutor pemilik atau admin.

### Hak akses

- Filter daftar pengguna admin hanya menerima peran murid atau tutor.
- Akun tutor `pending` tidak dapat login.
- Perubahan status tutor tetap memerlukan keputusan admin.
- Perubahan dokumen atau kompetensi tutor aktif memicu pemeriksaan ulang.

## Perubahan database

Migration baru:

`2026_07_29_000100_add_minor_guardian_consent_to_users_table.php`

Kolom yang ditambahkan:

- `date_of_birth`
- `guardian_name`
- `guardian_phone`
- `guardian_relationship`
- `guardian_consent_at`

Semua kolom dibuat `nullable`. Akun lama tetap dapat digunakan.

## Pengujian yang ditambahkan

- Registrasi murid anak ditolak tanpa persetujuan wali.
- Data wali tersimpan setelah persetujuan diberikan.
- Data wali tidak muncul pada respons registrasi.
- Murid dewasa dapat mendaftar tanpa data wali.
- Murid tidak dapat membuka dokumen tutor lain.
- Filter admin tidak dapat dipakai untuk mengambil daftar akun admin.
- Kontak, koordinat, dan rekening tutor tidak muncul pada serialisasi umum.
- Verifikasi tutor tetap berhasil tanpa tes tambahan.

## Hasil pemeriksaan workspace

| Pemeriksaan | Hasil |
|---|---|
| ESLint | Lulus |
| TypeScript | Lulus |
| Kontrak API | Lulus, 115 action |
| Pratinjau berkas | Lulus |
| Build produksi | Lulus, 1.798 modul |
| Anggaran performa | Lulus |
| Parser PHP | Lulus, 158 berkas |
| Tes Laravel | Disiapkan untuk Laragon |

## Batas Tahap 1

Pemesanan bertahap, pencocokan tutor, chat internal, PIN sesi, laporan belajar,
dan sistem keuangan diteruskan pada tahap berikutnya. Source lama untuk fitur
tersebut tetap dipertahankan, tetapi tidak diperluas dalam checkpoint ini.

