# Demo Kelas Murah — Mulai Sebelum Pembayaran (Presentasi Cepat)

Tujuan: menampilkan lifecycle Kelas Murah dari **penawaran yang sudah terbuka sekarang**, murid join, halaman pembayaran, verifikasi admin, kelas berjalan, laporan tutor, verifikasi admin, sampai progress murid — tanpa menunggu jam pembukaan pendaftaran dari form admin.

## Prinsip keamanan

- Seluruh shortcut ditolak di luar environment `local/testing`.
- Tidak ada perubahan aturan production.
- `pre-payment` hanya membuat fixture lokal yang registration window-nya sudah aktif.
- Join murid tetap melewati `CheapClassService::join()` production.
- Shortcut pembayaran tetap memakai `submitPayment()` dan `verifyPayment()` production.

## Akun

- Murid: `demo.student@bimbelku.local` / `password`
- Tutor: `demo.tutor@bimbelku.local` / `password`
- Admin: command akan mencetak admin utama yang dipakai. Bila belum ada admin aktif, dibuat `demo.admin@bimbelku.local` / `password`.

## Persiapan

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

Frontend biasanya: `http://localhost:8080`.

## Alur presentasi paling aman

### 1. Bersihkan fixture lama

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan demo:cheap-class reset
```

### 2. Buat demo BEFORE PAYMENT

```powershell
php artisan demo:cheap-class pre-payment
```

Kondisi awal:

- kelas `open`;
- pendaftaran sudah terbuka sekarang;
- murid utama belum memiliki enrollment/order;
- 1 murid demo lain sudah confirmed+paid;
- kuota min/max = 2, jadi pembayaran murid utama akan memenuhi syarat kelas;
- sesi dijadwalkan besok 18.00 supaya tidak keburu mulai ketika presentasi.

### 3. Chrome — Murid

Login murid, buka **Kelas Murah**.

Harus terlihat kelas demo dengan tombol:

`Gabung Kelas Murah`

Klik tombol tersebut. Sistem produksi akan:

- menahan kursi;
- membuat invoice/order pending;
- membawa murid ke halaman Payment.

Tunjukkan halaman Payment ke CEO.

### 4A. Pilihan manual — upload bukti dari UI

Isi data transfer + upload gambar bukti lalu kirim.

### 4B. Pilihan tercepat — shortcut bukti pembayaran

Setelah halaman Payment sudah diperlihatkan, terminal:

```powershell
php artisan demo:cheap-class payment-submitted
```

Command membuat bukti transfer demo lokal lalu mengirimnya menggunakan lifecycle pembayaran Kelas Murah.

### 5. Admin — verifikasi pembayaran

Login admin, buka:

`Admin -> Pembayaran`

Harus ada pembayaran Kelas Murah demo berstatus submitted. Klik **Bukti**, lalu **Terima pembayaran**.

Fallback bila waktu presentasi sangat sempit:

```powershell
php artisan demo:cheap-class payment-paid
```

Setelah diterima, karena peserta menjadi 2/2, kelas langsung `confirmed` dan tutor/Zoom tersedia.

### 6. Jadikan sesi sedang berlangsung

```powershell
php artisan demo:cheap-class session-live
```

Sekarang tampilkan:

- murid: kelas confirmed + tutor + Zoom;
- tutor: Kelas Murah aktif/berjalan.

### 7. Akhiri sesi tanpa menunggu satu jam

```powershell
php artisan demo:cheap-class session-ended
```

Tutor sekarang mendapat reminder wajib untuk mengisi laporan.

### 8. Tutor kirim laporan

Isi:

- jumlah hadir: 2;
- progress Bab: Selesai;
- catatan Bab;
- catatan sesi.

Submit -> status `awaiting_admin_verification`.

### 9. Admin verifikasi laporan

Boleh demonstrasikan `Minta Perbaikan` dahulu, lalu tutor revisi. Jika waktu sempit langsung `Konfirmasi Sesi`.

Setelah admin konfirmasi:

- sesi completed;
- karena demo hanya 1 sesi, kelas completed;
- progress resmi murid diperbarui;
- kelas pindah ke Riwayat.

## Command ringkas

```powershell
php artisan demo:cheap-class reset
php artisan demo:cheap-class pre-payment
php artisan demo:cheap-class status
php artisan demo:cheap-class payment-submitted
php artisan demo:cheap-class payment-paid
php artisan demo:cheap-class session-live
php artisan demo:cheap-class session-ended
php artisan demo:cheap-class status
```

`payment-submitted` dan `payment-paid` adalah fallback. Jika pembayaran dilakukan dari UI, tidak wajib menjalankan keduanya.

## Jangan dilakukan

Jangan menjalankan `reset` atau `pre-payment` ulang di tengah presentasi, karena fixture yang sedang dibuka akan diganti.
