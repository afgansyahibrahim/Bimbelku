# Pasang dan Uji — Checkpoint 5

## 1. Cadangkan project dan database

```powershell
Copy-Item "C:\laragon\www\Website_Bimbelku" "C:\laragon\www\Website_Bimbelku_backup_cp5" -Recurse
```

Ekspor database `bimbelku` melalui HeidiSQL/phpMyAdmin sebelum patch dipasang.

## 2. Pasang patch

Ekstrak ZIP ke:

```text
C:\laragon\www\Website_Bimbelku
```

Pilih **Replace/Timpa**. Tidak ada migration, dependency, atau file runtime yang perlu dihapus pada Checkpoint 5.

## 3. Jalankan regresi final otomatis

Dari PowerShell:

```powershell
cd C:\laragon\www\Website_Bimbelku
powershell -ExecutionPolicy Bypass -File .\scripts\run-final-regression.ps1
```

Script berhenti pada kegagalan pertama. Salin seluruh output mulai dari judul test yang gagal sampai pesan error terakhir.

## 4. Perintah manual bila script PowerShell diblokir

Backend:

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan optimize:clear
php artisan test --filter=CheckpointOneFoundationAuditTest
php artisan test --filter=CheckpointTwoOperationsAuditTest
php artisan test --filter=CheckpointThreeCommunicationAuditTest
php artisan test --filter=CheckpointFourQualityAuditTest
php artisan test --filter=CheckpointFiveFinalRegressionTest
php artisan test --filter=StageFourLearningSessionTest
php artisan test --filter=StageSixBTeacherOperationsTest
php artisan test --filter=StageThreeFinanceSecurityTest
php artisan test --filter=StageSixCAdminOperationsTest
php artisan test --filter=StageSixCFinanceOperationsTest
php artisan test --filter=StageSixCFinalRegressionTest
```

Frontend:

```powershell
cd C:\laragon\www\Website_Bimbelku
npm run check:final
```

## 5. Uji manual minimum tiga role

### Murid

1. Daftar atau login sebagai murid.
2. Lengkapi profil dan lokasi untuk kelas offline.
3. Buat permintaan privat dan paket.
4. Buka tagihan, unggah bukti, lalu cek status setelah verifikasi admin.
5. Buka kelas, chat, lampiran, laporan perkembangan, penilaian, dan bantuan.
6. Pastikan murid kelompok tidak melihat laporan murid lain.

### Tutor

1. Login sebagai tutor terverifikasi.
2. Atur jadwal interval 10 menit.
3. Terima/tolak penawaran.
4. Buka kelas dan chat.
5. Check-in, rencana belajar, absensi, laporan perkembangan, dan penyelesaian.
6. Cek saldo, rekening, dan permintaan pencairan.

### Admin utama

1. Login dengan admin utama; admin kedua harus ditolak.
2. Verifikasi tutor dan pembayaran.
3. Pantau/luaskan pencarian tutor dan tetapkan tutor manual.
4. Kelola kasus, refund, pencairan, pengguna, kelas, katalog, dan konten.
5. Periksa audit log dan bukti privat.
6. Pastikan menu autentikator dan pengelolaan admin tambahan tidak kembali.

## 6. Uji layar

Gunakan Chrome Device Mode (`F12`, lalu `Ctrl+Shift+M`) pada:

- 320 × 568;
- 360 × 800;
- 390 × 844;
- 430 × 932;
- 768 × 1024;
- 1024 × 768;
- 1366 × 768;
- 1920 × 1080.

Periksa sidebar, notifikasi, tutorial, dropdown, modal, chat, tabel, upload, preview file, dan tombol bawah.

## 7. Uji pemulihan layar kosong

Untuk memastikan fallback tersedia, ubah sementara satu lazy import ke nama file salah pada salinan backup saja, lalu buka route tersebut. Halaman harus menampilkan pesan **“Halaman tidak berhasil dimuat”**, bukan layar putih. Kembalikan file setelah uji.

Jangan melakukan simulasi ini pada project utama tanpa backup.

## 8. Kriteria lulus

Checkpoint 5 lulus hanya jika:

- seluruh test Laravel di atas `PASS`;
- `npm run check:final` exit code 0;
- build production berhasil;
- tidak ada route utama yang kosong;
- skenario murid, tutor, dan admin dapat diselesaikan;
- tidak ada kebocoran data antar pengguna;
- tidak ada transaksi ganda pada pengulangan klik;
- tampilan minimum 320 piksel tetap dapat digunakan.
