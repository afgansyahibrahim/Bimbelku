# Tutorial Demo Session Flow V2

## 1. Setelah memasang file perubahan
Dari backend:

```bash
php artisan optimize:clear
php artisan migrate
php artisan test
```

Jangan lanjut demo jika migration atau test gagal. Kirim output failure lebih dulu.

## 2. Siapkan demo Session Flow V2

```bash
php artisan demo:session-reminder reset
php artisan demo:session-reminder setup --flow=presence
```

Command akan menampilkan akun Demo Murid, Demo Tutor, Booking ID, dan jadwal.

## 3. Alur browser
Gunakan dua browser/profile berbeda.

Tutor:
1. Login akun Demo Tutor.
2. Buka Kelas Saya.
3. Buka sesi demo.
4. Tekan `Saya Siap Mengajar`.
5. `Fokus hari ini` boleh kosong atau diisi singkat.

Murid:
1. Login akun Demo Murid.
2. Buka Kelas Saya.
3. Buka sesi demo yang meminta tindakan.
4. Pastikan tidak ada PIN.
5. Tekan `Saya Sudah Hadir`.

Setelah itu sesi resmi `in_progress`.

## 4. Percepat ke akhir sesi

```bash
php artisan demo:session-reminder checkout-ready
```

Tutor refresh halaman:
1. Tekan `Akhiri Sesi`.
2. Buka `Hasil belajar`.
3. Pilih progress Bab.
4. Isi ringkasan hasil belajar.
5. Simpan.

Tidak ada tahap upload foto pada V2.

## 5A. Happy path
Murid refresh Kelas Saya:
- buka sesi;
- cek hasil belajar;
- tekan `Sesi Sesuai`.

Hasil yang diharapkan:
- booking `completed`;
- payout `ready`;
- progress Bab baru dikomit;
- sesi/paket mengikuti lifecycle normal.

## 5B. Problem path
Ulangi setup demo lalu jalankan sampai Tutor menyimpan Hasil Belajar.

Murid:
- tekan `Ada masalah`;
- pilih masalah yang paling sesuai;
- detail tambahan dan bukti bersifat opsional;
- kirim ke Admin.

Admin:
- buka `Pusat Kasus` → `Keberatan murid`;
- lihat `Jejak sesi otomatis`;
- periksa waktu Tutor siap, Murid hadir, durasi aktual, fokus, hasil belajar, dan bukti jika ada;
- pilih `Sesi valid · hak tutor diproses` atau `Refund penuh murid`;
- isi catatan keputusan;
- simpan.

## 6. Demo Renewal
Renewal yang menghasilkan Paket 2 baru juga memakai Session Flow V2.

```bash
php artisan demo:package-renewal reset
php artisan demo:package-renewal setup
```

Ikuti workflow renewal yang sudah ada sampai Paket 2 aktif. Sesi final Paket 2 tidak lagi meminta PIN; urutannya `Saya Siap Mengajar` → `Saya Sudah Hadir` → Hasil Belajar → keputusan Murid.
