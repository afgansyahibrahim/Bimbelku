# Tutorial Pasang — Production Legacy Retirement

> Migration cleanup bersifat destructive/irreversible. Backup database lokal sebelum migrate.

## 1. Timpa changed files
Ekstrak ZIP changed files ke root project BimbelKu dan izinkan overwrite.

## 2. Hapus file yang resmi retired
Jalankan PowerShell dari root project:

```powershell
$files = Get-Content ".\DELETED_FILES_PRODUCTION_LEGACY_RETIREMENT.txt"
foreach ($file in $files) {
    Remove-Item $file -Force -ErrorAction SilentlyContinue
}
```

Cek:

```powershell
$files | ForEach-Object { "$_ = $(Test-Path $_)" }
```

Semua harus `False`.

## 3. Backup database
Paling aman lakukan export database melalui HeidiSQL/Laragon sebelum lanjut. Jika database memang hanya demo/testing dan boleh dibuat ulang, tetap disarankan menyimpan satu backup.

## 4. Backend

```powershell
cd bimbelku-backend
php artisan optimize:clear
composer dump-autoload
php artisan migrate
php artisan test
```

Migration harus selesai tanpa error dan seluruh test harus PASS sebelum lanjut.

## 5. Frontend

```powershell
cd ..
npx tsc --noEmit
npm run build
```

Keduanya harus selesai tanpa error.

## 6. Checker cleanup

```powershell
node scripts/check-production-legacy-retirement.mjs
node scripts/check-session-presence-v2.mjs
node scripts/check-stage2-bab-monitoring-scalability.mjs
node scripts/check-package-renewal-flow.mjs
node scripts/check-demo-cheap-class.mjs
```

Target utama:
- Production Legacy Retirement 25/25 PASS
- Session Presence V2 6/6 PASS
- Bab-only + Admin Monitoring 23/23 PASS
- Package Renewal 29/29 PASS
- Demo Kelas Kelompok 21/21 PASS

## 7. Scan reference legacy
Jika `rg`/ripgrep tersedia:

```powershell
rg -n "LearningTopic|PackageLearningTopic|learning_topic_id|learningTopics|GroupPool|GroupMember|GroupClassService|LearningPlan|student_generate_pin|session_pin|LegacyRequests|BookingRequestController|learning-attachments" src bimbelku-backend/app bimbelku-backend/routes
```

Untuk runtime aktif hasilnya harus kosong.

## 8. Jalankan development server
Terminal backend:

```powershell
cd bimbelku-backend
php artisan serve
```

Terminal frontend:

```powershell
npm run dev
```

## 9. Cek manual singkat
- Admin -> Materi Kurikulum harus membuka `/admin/chapters`.
- Murid -> Buat Paket hanya Mapel + Bab.
- Tutor/Murid -> Session V2 tanpa PIN.
- Kelas Kelompok tetap normal.
- Renewal dan Progress tetap Bab-based.
- Admin Monitoring tetap searchable/paginated.

## Catatan deployment production
Jangan upload `node_modules`. Gunakan hasil `npm run build`.
Untuk backend production gunakan dependency tanpa package dev:

```powershell
composer install --no-dev --optimize-autoloader
```

Tests, demo command, checker, dan checkpoint boleh tetap disimpan di repository development tetapi tidak perlu ikut artifact hosting production.
