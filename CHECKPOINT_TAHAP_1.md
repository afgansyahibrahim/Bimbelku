# Checkpoint Tahap 1 — Fondasi, Frontend, dan Akun

Tanggal konsolidasi: 1 Agustus 2026  
Status: seluruh catatan Tahap 1 lama digabung ke dokumen ini.

## Ruang lingkup

Tahap 1 membentuk fondasi frontend React/TypeScript dan akun tiga peran. Alur
lama tetap dipertahankan ketika belum menjadi sasaran perubahan.

## Hasil utama

- Peran publik terdiri atas murid dan tutor. Admin hanya dibuat melalui seeder.
- Murid aktif setelah registrasi. Tutor menunggu verifikasi dokumen admin.
- Dokumen wajib tutor mencakup identitas, foto langsung, dan kualifikasi.
- Sertifikat pendukung bersifat opsional.
- Pencarian tutor memakai radar otomatis dengan radius 3, 5, 8, dan 12 km.
- Validasi jadwal, lokasi, kontak, tautan, dan berkas diterapkan di frontend.
- Pembayaran manual memeriksa rekening pengirim dan bukti transfer.
- Sesi kedaluwarsa dan status offline ditangani secara konsisten.
- Dialog bawaan browser diganti dialog aplikasi.
- Tombol ikon utama dan modal diberi label aksesibel.
- Animasi mengikuti `prefers-reduced-motion`.

## Akun murid dan wali

- Tanggal lahir diwajibkan bagi murid.
- Murid di bawah 18 tahun wajib melengkapi data serta persetujuan wali.
- Data wali mencakup nama, nomor, hubungan, dan waktu persetujuan.
- Data wali tidak dibuka melalui respons registrasi umum.
- Perubahan data wali diarahkan melalui Pusat Bantuan.

Migration fondasi wali:

`2026_07_29_000100_add_minor_guardian_consent_to_users_table.php`

## Privasi dan hak akses

- Kontak, alamat, koordinat, data wali, rekening, dan dokumen privat disembunyikan.
- Pemilik akun dan admin memakai endpoint berizin untuk membuka data terkait.
- Akun tutor `pending` tidak dapat login.
- Perubahan dokumen atau kompetensi tutor aktif memicu pemeriksaan ulang.
- Akun salah peran diarahkan ke halaman Akses Dibatasi.

## Berkas fondasi utama

- `src/components/SessionLifecycle.tsx`
- `src/lib/validation.ts`
- `src/pages/AccessDenied.tsx`
- migration persetujuan wali

## Verifikasi

ESLint, TypeScript, kontrak API, build Vite, pratinjau berkas, struktur PHP, dan
anggaran performa telah dipakai sebagai pemeriksaan. Pengujian Laravel dan
database dilakukan melalui Laragon.

## Catatan keputusan terbaru

Keputusan jenjang yang sempat berubah pada Tahap 1 telah digantikan keputusan
final Tahap 5. Jenjang aktif saat ini tercantum pada `CHECKPOINT_TAHAP_5.md`.
