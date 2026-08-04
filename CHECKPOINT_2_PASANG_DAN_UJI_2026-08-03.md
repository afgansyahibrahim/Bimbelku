# Pasang dan Uji — Audit Checkpoint 2

## 1. Cadangkan project dan database

Project:

```powershell
Copy-Item "C:\laragon\www\Website_Bimbelku" "C:\laragon\www\Website_Bimbelku_backup_cp2" -Recurse
```

Database dapat diekspor melalui HeidiSQL/phpMyAdmin sebelum patch dipasang.

## 2. Pasang patch

Ekstrak patch ke:

```text
C:\laragon\www\Website_Bimbelku
```

Pilih **Replace/Timpa**. Tidak ada migration, dependency, atau file yang perlu dihapus pada Checkpoint 2.

## 3. Bersihkan cache backend

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan optimize:clear
```

## 4. Jalankan tes backend

```powershell
php artisan test --filter=CheckpointTwoOperationsAuditTest
php artisan test --filter=StageSixCAdminOperationsTest
php artisan test --filter=StageSixCFinanceOperationsTest
php artisan test --filter=StageSixCFinalRegressionTest
```

Bila salah satu gagal, simpan seluruh output error; jangan menghapus database atau migration.

## 5. Jalankan pemeriksaan frontend dari folder yang benar

```powershell
cd C:\laragon\www\Website_Bimbelku

npm run check:checkpoint2
npm run check:contracts
npm run check:stage6c-a
npm run check:stage6c-final
npm run typecheck
npm run build
```

Pastikan prompt terminal menunjukkan:

```text
PS C:\laragon\www\Website_Bimbelku>
```

## 6. Jalankan website

```powershell
npm run dev
```

Gunakan terminal terpisah untuk backend:

```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan serve
```

## 7. Uji manual minimum

1. Tutor menyimpan jadwal dengan menit `09:05` — harus ditolak.
2. Tutor menyimpan `09:10–10:20` — harus berhasil.
3. Murid membuka dashboard setelah menerima pesan tutor — angka pesan belum dibaca harus bertambah.
4. Buat paket yang masih menunggu pembayaran, lalu admin mencoba mengganti rekening penerimaan — harus ditolak.
5. Admin memblokir murid — akun keluar, tetapi pencarian tutor lain tidak boleh ikut berubah.
6. Admin memverifikasi satu pembayaran dan mencoba mengulang aksi yang sama — proses kedua harus ditolak/idempoten.
7. Admin memproses pencairan dengan bukti transfer — sesi yang sama tidak boleh dapat dicairkan lagi.
