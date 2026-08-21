# Tutorial Uji Cepat — Tahap Revisi 1 Mobile

## Jalankan project
Backend:
```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan optimize:clear
php artisan serve
```

Frontend:
```powershell
cd C:\laragon\www\Website_Bimbelku
npm run dev -- --host
```

Buka URL Vite yang tercetak; pada setup saat ini biasanya `http://localhost:8080`.

## 7 cek user testing
1. **Register/Profile** — buat murid baru, isi jenjang + kelas + sekolah, login, buka Profile; data tidak boleh kosong.
2. **Riwayat Pembayaran** — menu murid harus langsung menyediakan Riwayat Pembayaran.
3. **Lokasi** — Profile hanya menampilkan alamat + Atur Lokasi. Latitude/Longitude/Link Google Maps tidak boleh muncul sebagai input.
4. **Profile Menu** — klik profil kanan atas. Desktop = dropdown; mobile = sheet. Coba Profil dan Logout.
5. **Reset Mapel** — Cari Les, pilih mapel, tekan X; pilihan mapel dan materi/Bab dependent harus reset.
6. **Jam Belajar** — picker menjelaskan bahwa ini waktu yang diinginkan; group Pagi/Siang/Sore & malam; tutor belum dianggap tersedia.
7. **Naming** — UI murid, tutor, admin harus menulis Kelas Kelompok.

## Cek mobile
DevTools → responsive: 320 px, 360 px, 390 px, 430 px.
Pastikan tidak ada horizontal scrollbar, teks tidak terpotong, tombol penting mudah ditekan, popup tidak keluar viewport, dan bottom nav tidak menutupi profile sheet.

Jika ada satu langkah gagal, jangan reset demo atau database dulu. Kirim screenshot + URL halaman + role yang sedang login.
