# CHECKPOINT — Tahap Revisi 1 User Testing UX + Mobile
Tanggal: 19 Agustus 2026
Baseline: Tahap 5.8.4 — Cheap Class Pre-Payment Demo

## Tujuan
Menindaklanjuti batch pertama hasil user testing tanpa mengubah fondasi bisnis Paket Belajar, Kelas Kelompok, payment, Saldo BimbelKu, progress/session final, atau renewal. Seluruh perubahan UI pada tahap ini wajib mobile-friendly, khususnya lebar 320–430 px.

## Perubahan Tahap 1

### 1. Riwayat Pembayaran lebih mudah diakses
- Menu murid sekarang memiliki item **Riwayat Pembayaran** menuju halaman transaksi yang sudah ada.
- Judul halaman dan shortcut akun memakai istilah yang sama.
- Tidak membuat ledger/payment flow baru; tetap memakai sumber transaksi existing.

### 2. Bug data register → Profile
- Registrasi murid sekarang memisahkan **Jenjang** dari **Kelas/Tingkat**.
- `student_education_level`, `grade`, `school_name`, dan data profil relevan tersimpan ke record user yang sama.
- Backend memvalidasi kecocokan kelas dengan jenjang bila keduanya dikirim.
- Regression test ditambahkan untuk alur register → login → `/api/user`.

### 3. Lokasi dibuat manusiawi
- Input Latitude, Longitude, dan Link Google Maps tidak ditampilkan kepada murid.
- UI hanya meminta alamat dan tombol **Atur Lokasi / Atur Ulang Lokasi**.
- Koordinat tetap disimpan otomatis di belakang layar untuk fitur offline/GPS.
- Pesan error tidak lagi menyuruh user memasukkan koordinat manual.

### 4. Profile quick menu
- Header murid dan tutor memakai menu profil cepat.
- Menampilkan avatar/inisial, nama, email, role, Profil, Pusat Akun (bila tersedia), dan Logout.
- Desktop/tablet: dropdown animasi.
- Mobile: sheet lebar aman di atas bottom navigation dan safe-area.
- Tutup dengan klik area luar atau tombol Escape.

### 5. Reset mata pelajaran
- Subject combobox memiliki tombol **X** saat field terisi.
- Reset memanggil `onChange("")`; pada Package Builder handler existing ikut membersihkan Bab/material dependent.
- Touch target tombol reset dan trigger dropdown minimal 44 px untuk mobile.

### 6. Pemilih jam Cari Les
- Copy tidak lagi menyiratkan tutor sudah tersedia.
- Jadwal diposisikan sebagai **waktu belajar yang diinginkan murid**; tutor baru dicari setelah pesanan dibuat.
- Pilihan dikelompokkan: Pagi, Siang, Sore & malam.
- Mobile: bottom sheet, 3 kolom; layar lebih lebar 4 kolom.
- Menggunakan `100dvh`, safe-area, scroll internal, touch target 48 px, Escape/overlay close, dan animasi ringan.

### 7. Kelas Murah → Kelas Kelompok
- Seluruh label user-facing pada frontend/backend message diubah menjadi **Kelas Kelompok**.
- Identifier internal tetap `CheapClass`, `cheap_class`, `/kelas-murah`, dan `demo:cheap-class` agar kompatibilitas tidak rusak.

## Mobile acceptance criteria — WAJIB
- Target utama: 320–430 px.
- Tidak boleh horizontal overflow pada UI yang diubah.
- CTA utama full-width di layar kecil bila ruang terbatas.
- Touch target aksi penting sekitar 44–48 px.
- Modal pemilih jam memakai viewport dinamis (`100dvh`) dan safe-area.
- Profile menu mobile tidak menabrak bottom navigation.
- Form register stack vertikal secara natural di layar kecil.
- Animasi singkat dan informatif, bukan penghalang interaksi.

## Validasi source-level yang PASS di checkpoint
- `npm run typecheck`
- `npm run check:user-testing-stage1` → 15/15 PASS
- `npm run check:stage1-cutover-mobile`
- `npm run check:demo-cheap-class` → 21/21 PASS
- `npm run check:cheap-class-popup` → 11/11 PASS
- `npm run check:cheap-class-session-verification` → 20/20 PASS
- `npm run check:cheap-class-payment-lifecycle`
- `npm run check:package-renewal` → 29/29 PASS
- `npm run check:stage2-wallet` → 38/38 PASS
- `npm run check:stage2-payment-archives`
- `npm run check:session-target-guidance` → 7/7 PASS
- `npm run check:session-draft-guidance` → 5/5 PASS
- `npm run check:session-final` → 19/19 PASS
- PHP syntax: 11/11 file PHP yang berubah PASS `php -l`.

## Validasi yang belum dapat dijalankan di container checkpoint
- `npm run build`: environment checkpoint tidak membawa `node_modules`, sehingga binary `vite` tidak tersedia (`vite: not found`).
- PHPUnit/Laravel runtime: folder `bimbelku-backend/vendor` tidak ada pada checkpoint.

Ini bukan klaim build/runtime PASS. Jalankan di Laragon pengguna yang memiliki dependency lengkap.

## Uji Laragon yang disarankan
Frontend:
```powershell
cd C:\laragon\www\Website_Bimbelku
npm run typecheck
npm run check:user-testing-stage1
npm run build
```

Backend:
```powershell
cd C:\laragon\www\Website_Bimbelku\bimbelku-backend
php artisan optimize:clear
php artisan test --filter=StageFourAccountFlowTest
php artisan test --filter=CheapClassWorkflowTest
php artisan test --filter=StageOneSessionActionReminderTest
```

## Manual QA mobile utama
Gunakan Chrome DevTools responsive pada minimal 320, 360, 390, dan 430 px:
1. Register murid → pilih Jenjang + Kelas/Tingkat → login → Profile harus tetap terisi.
2. Header → buka menu profil → sheet tidak tertutup bottom nav → Profil dan Logout dapat ditekan.
3. Cari Les → pilih Mapel → tekan X → mapel dan Bab dependent bersih.
4. Cari Les → buka pemilih jam → group waktu terbaca, tombol nyaman disentuh, tidak overflow.
5. Profile → lokasi → hanya alamat + Atur Lokasi terlihat; tidak ada input koordinat/link Maps.
6. Sidebar/drawer → Riwayat Pembayaran dapat diakses.
7. Sweep murid/tutor/admin → label yang terlihat adalah **Kelas Kelompok**.

## Scope yang sengaja belum dikerjakan
Tahap Revisi 2 tetap terpisah:
- menghilangkan Subbab dari user/business flow menjadi Bab-only;
- redesign scalable Admin Monitoring (server pagination/filter/search/detail-on-demand/index).
