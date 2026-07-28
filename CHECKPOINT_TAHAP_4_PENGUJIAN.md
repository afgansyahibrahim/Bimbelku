# Checkpoint Tahap 4 — Pengujian dan Perbaikan

Tanggal: 28 Juli 2026  
Dasar pengerjaan: checkpoint Tahap 3

## Status

Bagian frontend, kontrak API, parser PHP, dan pengujian logika yang dapat dijalankan
di workspace sudah selesai. Tahap 4 belum dinyatakan lulus penuh sampai rangkaian
tes Laravel dijalankan melalui PHP, Composer, dan SQLite/MySQL di Laragon.

Tidak ada database pengguna yang dibuka, diubah, atau dikosongkan selama pengerjaan
checkpoint ini.

## Perbaikan yang diterapkan

### Profil dan keamanan akun

- Sampul profil disimpan per akun pada kolom `users.profile_cover`.
- Murid dan tutor dapat mengunggah sampulnya sendiri.
- Sampul global tutor tetap dipakai sebagai fallback jika tutor belum memiliki
  sampul pribadi.
- Kolom kata sandi dilepas dari formulir biodata murid.
- Perubahan kata sandi dipindahkan ke dialog Keamanan dengan endpoint terpisah.
- Kata sandi saat ini wajib diverifikasi.
- Kata sandi baru minimal delapan karakter, harus dikonfirmasi, dan harus berbeda.
- Setelah perubahan berhasil, token akun pada perangkat lain dicabut.
- Waktu perubahan kata sandi disimpan pada `users.password_updated_at`.
- Reset kata sandi juga memperbarui cap waktu keamanan tersebut.

### Registrasi dan konfigurasi lokal

- Registrasi murid dan tutor memiliki pengujian regresi khusus.
- Tutor baru tetap berstatus `pending` dan dokumen verifikasinya diuji tetap privat.
- `FRONTEND_URL` dipisahkan dari `FRONTEND_ORIGINS`.
- Pemisahan tersebut mencegah tautan reset kata sandi rusak ketika CORS menerima
  alamat `127.0.0.1` dan `localhost` sekaligus.
- Contoh konfigurasi sekarang mengizinkan kedua alamat frontend lokal.

### Otomasi pengujian

- `npm run check` sekarang juga memeriksa kontrak route-controller API.
- `scripts/check-api-contract.mjs` memeriksa seluruh action API.
- `scripts/test-tahap4.ps1` menjalankan instalasi dan tes frontend serta backend.
- Tes Laravel pada skrip memakai SQLite `:memory:` dan tidak menyentuh MySQL utama.
- `TAHAP_4_UJI_LARAGON.md` berisi prosedur uji MySQL terpisah dan akun pengujian.

## Hasil pemeriksaan yang sudah dijalankan

| Pemeriksaan | Hasil |
| --- | --- |
| Instalasi bersih frontend (`npm ci`) | Lulus, 295 paket |
| ESLint | Lulus tanpa error |
| TypeScript | Lulus tanpa error |
| Kontrak API | Lulus, 107 action memiliki controller dan method |
| Build produksi | Lulus, 1.791 modul |
| Smoke test Vite | Enam rute utama dan aset JavaScript merespons HTTP 200 |
| Parser PHP nyata | Lulus, 147 berkas |
| Batas poin tutor | Lulus, 13 kasus |
| JSON package/lockfile | Valid |
| Pemisahan frontend URL dan CORS | Lulus |

Rute frontend yang diuji:

- `/`
- `/register`
- `/login`
- `/student/profile`
- `/guru/profil`
- `/admin`

## Tes Laravel yang disiapkan

Total rancangan pengujian saat ini adalah 28 kasus setelah data provider diperluas.
Cakupannya meliputi:

- registrasi murid aktif;
- registrasi tutor pending;
- privasi dokumen tutor;
- sampul pribadi murid dan tutor;
- perubahan serta reset kata sandi;
- hak akses profil;
- verifikasi tutor satu kali;
- rekening pembayaran tunggal;
- laporan ketidakhadiran;
- pelepasan penawaran tutor yang tidak layak atau berbenturan;
- seluruh batas rekomendasi poin tutor.

Tes tersebut belum dijalankan di workspace karena PHP native, Composer, vendor
Laravel, dan server MySQL tidak tersedia. Berkas tes sudah lolos parser PHP.

## Catatan audit dependensi

`react-router-dom` memakai rilis stabil terbaru `7.18.1`. Audit npm masih
melaporkan dua entri high yang berasal dari satu advisory pada mode React Server
Components. BimbelKu adalah SPA Vite dengan `BrowserRouter` dan tidak memakai
React Server Components atau action server, sehingga jalur terdampak tidak
digunakan. Versi lebih lama tidak dipilih karena terkena advisory navigasi umum
yang relevan untuk SPA.

Catatan ini harus diperiksa kembali ketika React Router merilis versi stabil
sesudah `7.18.1`.

## Verifikasi wajib di Laragon

Buka PowerShell pada folder utama paket lalu jalankan:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap4.ps1
```

Jika dependensi sudah terpasang:

```powershell
.\scripts\test-tahap4.ps1 -SkipInstall
```

Untuk uji MySQL, gunakan database baru `bimbelku_tahap4_test` dan ikuti
`TAHAP_4_UJI_LARAGON.md`. Jangan menjalankan `migrate:fresh` pada database utama.

## Akun pengujian

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Admin | `admin@bimbelku.com` | `admin123456789` |
| Tutor | `budi@guru.com` | `password123` |
| Murid | `murid@bimbelku.com` | `password123` |

## Batas menuju Tahap 5

Tahap 5 baru layak dimulai setelah output `scripts/test-tahap4.ps1` pada Laragon
berakhir dengan pesan `Tahap 4 lulus`. Jika ada kegagalan, simpan seluruh output
PowerShell dan `storage/logs/laravel.log` untuk perbaikan lanjutan pada Tahap 4.
