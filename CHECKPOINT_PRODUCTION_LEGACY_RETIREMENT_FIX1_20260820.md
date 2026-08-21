# CHECKPOINT — Production Legacy Retirement Fix 1
Tanggal: 20 Agustus 2026

Hotfix ini dibuat setelah full PHPUnit lokal melaporkan 16 gagal / 174 lulus.

## Root cause yang diperbaiki
1. Learning Catalog tetap Bab-only tetapi mengembalikan `topics: []` sebagai compatibility response key tanpa query Subbab.
2. Session Flow V2 dibuat null-safe untuk field `notes` opsional.
3. Session Flow V2 dapat menutup booking privat lama yang tidak memiliki PackageSession tanpa menghidupkan kembali UI/route BookingRequest lama. Paket Belajar tetap menghitung progress dari Bab native.
4. Helper `hasExactBookChapters()` pada CurriculumCatalogSeeder dikembalikan setelah terhapus saat retirement Subbab.
5. Regression StageSixC Admin Matching dimodernisasi menjadi fixture Paket Belajar, bukan direct BookingRequest V1 yang memang sudah dipensiunkan.

## Yang TIDAK dikembalikan
- Subbab/LearningTopic runtime
- Group Class V1
- Session PIN V1
- LegacyRequests UI
- BookingRequestController user-facing
- LearningAttachmentController legacy

## Validasi sandbox
- PHP syntax: PASS pada semua file hotfix
- Production Legacy Retirement: 25/25 PASS
- Session Presence V2: 6/6 PASS
- Stage 6C-B contract: PASS
- API contract: 196 action PASS
- PHP static: 298 file PASS

Full PHPUnit tetap harus dijalankan lokal karena environment sandbox tidak membawa `vendor`.
