# Checkpoint Tahap 1 — Penyempurnaan Frontend

Tanggal: 28 Juli 2026  
Dasar proyek: folder kerja terbaru `Website_Bimbelku`  
Status: selesai dan lolos pemeriksaan statis

## Ruang lingkup

Tahap ini hanya menyempurnakan frontend React/TypeScript berdasarkan rancangan BimbelKu terbaru. Berkas backend Laravel tidak diubah.

## Hasil utama

### Pencarian dan radar

- Radar hanya tampil ketika sistem benar-benar mencari atau menunggu tutor.
- Tahap radius offline tetap mengikuti 3 km, 5 km, 8 km, dan maksimal 12 km.
- Status radar memiliki keterangan yang dapat dibaca pembaca layar.
- Validasi jadwal mencegah sesi melewati tengah malam.
- Durasi minimal privat dan kelompok diperiksa sebelum permintaan dikirim.
- Pencarian offline mewajibkan titik lokasi, alamat, nomor kontak, dan format tautan peta yang benar.
- Lampiran materi dibatasi pada format yang diizinkan dan maksimal 5 MB.
- Alasan penolakan khusus wajib dijelaskan agar cooldown tidak terpicu dari data kosong.

### Pembayaran manual

- Nomor rekening pengirim dan bukti transfer diperiksa sebelum dikirim.
- Bukti transfer dibatasi pada JPG, PNG, atau WebP maksimal 5 MB.
- Diperbaiki kondisi yang sebelumnya dapat menonaktifkan tombol unggah ketika API tidak mengirim `payment_due_at`.
- Popup tagihan langsung menampilkan hitung mundur tanpa jeda awal.
- Pembatalan tagihan memakai dialog aplikasi, mendukung tombol Escape, dan tidak memakai dialog bawaan browser.

### Profil, verifikasi, dan berkas

- Nomor kontak murid dan tutor diperiksa dengan aturan yang sama.
- Foto profil, QRIS, sampul, ikon sosial, bukti refund, bukti pencairan, dokumen verifikasi, lampiran bantuan, dan bukti kelas memiliki batas format serta ukuran di sisi klien.
- Tautan Google Maps, media sosial, dan kelas online diperiksa sebelum disimpan.
- Foto profil murid pada header sekarang membaca field API `avatar_url` dengan fallback untuk data lama.
- URL pratinjau lampiran bantuan dilepas setelah tidak digunakan.

### Navigasi, sesi, dan notifikasi

- Halaman baru `Akses Dibatasi` mencegah akun salah peran diarahkan diam-diam ke halaman peran lain.
- Peran akun yang tidak dikenal tidak lagi otomatis dianggap sebagai murid saat login.
- Respons 401 dari pemanggilan API baru maupun halaman lama menutup sesi secara konsisten.
- Sesi kedaluwarsa membersihkan token dan data pembayaran lokal, lalu menampilkan notifikasi aplikasi.
- Status offline ditampilkan sebagai banner aplikasi dan koneksi pulih menghasilkan toast.
- Notifikasi tutor sekarang mendeteksi ID notifikasi terbaru, bukan perubahan jumlah belum dibaca, sehingga pesan baru tidak terlewat ketika jumlahnya tetap.
- Navigasi bertingkat admin, tutor, dan murid menandai menu aktif dengan tepat.
- Halaman pesan admin diperbaiki untuk tampilan ponsel.

### Dialog dan aksesibilitas

- Aksi keluar, pembatalan, keputusan kelas, verifikasi pembayaran, refund, pencairan, dan aksi sensitif lain memakai dialog aplikasi.
- Tidak ditemukan pemakaian `window.alert`, `window.confirm`, atau `window.prompt`.
- Tombol ikon utama memiliki label aksesibel.
- Modal penting memiliki peran dialog dan dapat ditutup melalui Escape.
- Animasi mengikuti preferensi `prefers-reduced-motion`.
- Kelas animasi lonceng yang sebelumnya belum didefinisikan sudah ditambahkan.

## Berkas frontend utama yang ditambahkan

- `src/components/SessionLifecycle.tsx`
- `src/lib/validation.ts`
- `src/pages/AccessDenied.tsx`

## Pemeriksaan

Perintah:

```bash
npm run check
```

Hasil:

- ESLint: lulus tanpa error.
- TypeScript `tsc --noEmit`: lulus.
- Build Vite produksi: lulus.
- Modul yang diproses: 1.783.
- Pencarian statis dialog bawaan browser: tidak ditemukan.
- Berkas backend yang berubah pada Tahap 1: tidak ada.

## Batas tahap

Build frontend membuktikan kode dapat dikompilasi, tetapi belum membuktikan seluruh transaksi berjalan pada Laravel/MySQL nyata. Validasi endpoint, transaksi database, scheduler, otorisasi backend, dan pengujian alur tiga peran dilanjutkan pada Tahap 2 dan Tahap 4 sesuai rencana lima tahap.

## Posisi melanjutkan

Tahap berikutnya adalah **Tahap 2 — Penyelesaian backend**. Gunakan folder proyek checkpoint ini sebagai dasar; jangan kembali ke ZIP tanggal 25 Juli atau versi sebelum revisi.
