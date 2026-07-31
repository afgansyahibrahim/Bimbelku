# Pemasangan dan Pengujian Tahap 5

Paket ini dipasang di atas instalasi BimbelKu Tahap 4 final. Konfigurasi dan
database instalasi lama harus dipertahankan.

## Pemasangan aman

1. Hentikan frontend, backend, scheduler, dan queue BimbelKu.
2. Cadangkan folder proyek, database MySQL, serta `storage/app`.
3. Ekstrak ZIP Tahap 5 ke folder sementara.
4. Salin isi folder `Website_Bimbelku` ke proyek lama.
5. Jangan timpa `.env` frontend dan `bimbelku-backend\.env` milik instalasi.
6. Buka PowerShell dari folder utama proyek.
7. Jalankan:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap5.ps1
```

Skrip memasang dependensi, memeriksa frontend dan kontrak source, menjalankan
migration bertahap, menanam data awal Tahap 5, membuat storage link, dan
menjalankan seluruh tes Laravel.

Gunakan opsi berikut bila dependensi sudah terpasang:

```powershell
.\scripts\test-tahap5.ps1 -SkipInstall
```

## Uji manual paket multi-mapel

1. Admin membuka **Tahap 5** lalu memeriksa Paket, Slot Jadwal, Promo, Banner,
   dan Tutorial.
2. Admin memastikan rekening pembayaran sudah terisi.
3. Admin memastikan dua tutor aktif menguasai mapel berbeda dan mempunyai
   ketersediaan untuk seluruh jadwal uji.
4. Murid membuka **Cari Les**.
5. Murid memilih Paket Reguler delapan sesi.
6. Murid memilih dua mapel dan membagi sesi 4 + 4.
7. Murid memilih delapan tanggal dan jam dari daftar slot aplikasi.
8. Tutor pertama memeriksa seluruh jadwal mapelnya lalu menerima.
9. Tutor kedua menerima seluruh jadwal mapelnya.
10. Pastikan tagihan baru muncul setelah kedua tutor menerima.
11. Murid memasukkan kode promo atau memilih satu voucher.
12. Pastikan harga normal dicoret dan harga akhir sesuai hitungan.
13. Murid mengunggah bukti pembayaran.
14. Admin memverifikasi pembayaran.
15. Pastikan paket muncul di **Kelas Saya** dan semua sesi berstatus aktif.

## Uji manual konten

1. Admin mengunggah banner berukuran lebar.
2. Admin memilih tujuan internal dari daftar yang tersedia.
3. Pastikan banner murid berganti setiap empat detik.
4. Klik area banner dan tombol; keduanya harus membuka tujuan yang sama.
5. Coba geser banner pada ponsel.
6. Admin mengubah tutorial murid dan menambahkan beberapa langkah.
7. Buka tutorial dari akun murid, lalu periksa tombol sebelumnya, selanjutnya,
   lewati, selesai, indikator langkah, dan gestur geser.

## Uji manual perpanjangan

1. Siapkan paket aktif yang berakhir dalam tujuh hari.
2. Buka **Kelas Saya**.
3. Tekan **Perpanjang dengan Tutor Ini** pada salah satu mapel.
4. Pilih paket dan jadwal baru.
5. Pastikan tutor lama menerima penawaran prioritas.
6. Tolak penawaran pada skenario kedua dan pastikan radar mencari tutor lain.

## Scheduler

Jalankan scheduler pada terminal backend tersendiri:

```powershell
php artisan schedule:work
```

Scheduler dibutuhkan untuk penawaran kedaluwarsa, tagihan 48 jam, status sesi,
keberatan, dan antrean pemeriksaan yang sudah ada.

## Jangan dilakukan

- Jangan menjalankan `php artisan migrate:fresh`.
- Jangan menimpa `.env`.
- Jangan menghapus migration Tahap 1–4.
- Jangan mengaktifkan promo contoh `MURIDBARU20` sebelum syarat, kuota, dan
  nominalnya diperiksa admin.
- Jangan menguji pembayaran memakai database produksi.
