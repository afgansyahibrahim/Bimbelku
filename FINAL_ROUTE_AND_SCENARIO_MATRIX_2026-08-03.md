# Matriks Route dan Skenario Final Website BimbelKu

## Ringkasan route

- Frontend: 60 route non-wildcard dan satu wildcard 404.
- Tautan internal literal: 173.
- API: 184 action controller terpetakan secara statis.
- Route API aktif yang gagal dipetakan ke controller/method: 0 pada pemeriksaan statis.
- Route lama yang sengaja gagal/tidak tersedia: multi-admin, finance authenticator, dan payout approval dua admin.

## Route frontend publik

`/`, `/register`, `/login`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`, `/why-us`, `/access-denied`.

## Route frontend admin

`/admin`, `/admin/tutor-searches`, `/admin/guru`, `/admin/pembayaran`, `/admin/users`, `/admin/settings-payment`, `/admin/settings-footer`, `/admin/finance`, `/admin/refunds`, `/admin/pesan`, `/admin/notifikasi`, `/admin/classes`, `/admin/classes/:id`, `/admin/notes`, `/admin/settings-display`, `/admin/ratings`, `/admin/hourly-rates`, `/admin/learning-topics`, `/admin/subjects`, `/admin/cases`, `/admin/stage-five`, `/admin/audit-log`.

Redirect kompatibilitas lama: `/admin/finance-security` → `/admin/pembayaran`; `/admin/access-control` → `/admin`.

## Route frontend tutor

`/guru`, `/guru/kelas`, `/guru/profil`, `/guru/jadwal`, `/guru/permintaan`, `/guru/rekening`, `/guru/gaji`, `/guru/pesan`, `/guru/saya`, `/guru/performa`, `/guru/notifikasi`, `/guru/bantuan`.

## Route frontend murid

`/student/dashboard`, `/search`, `/student/find`, `/student/my-classes`, `/student/messages`, `/student/progress`, `/student/history`, `/student/profile`, `/student/account`, `/student/packages`, `/student/packages/new`, `/student/vouchers`, `/student/offers/:id`, `/student/help`, `/payment`.

## API route yang harus berhasil

### Publik

- `POST /api/register`
- `POST /api/login`
- `POST /api/forgot-password`
- `POST /api/reset-password`
- `GET /api/learning-catalog`
- `GET /api/settings/footer`
- `GET /api/socials`
- `GET /api/settings/teacher-cover`
- endpoint paket, slot, banner, tutorial, dan promosi publik.

### Pengguna terautentikasi

- profil, password, logout;
- tiket bantuan;
- notifikasi;
- file privat sesuai kepemilikan;
- learning session, chat, attachment, dan perubahan jadwal.

### Murid

- booking request, pencarian tutor, kelas, order, pembayaran, wallet;
- paket, voucher, promo, rating, persetujuan/keberatan sesi.

### Tutor

- penawaran, dashboard, profil, mapel, rekening, gaji, pencairan;
- kelas, absensi, check-in/out, rencana belajar, laporan perkembangan, jadwal.

### Admin

- dashboard, matching, tutor, pengguna, pembayaran, refund, pencairan;
- kasus, kelas, tiket, audit, katalog, harga, materi, paket, promo, banner, dan tutorial.

## Route yang harus gagal atau tidak terdaftar

- `/api/admin/access-control`
- `/api/admin/finance-security`
- `/api/admin/finance-security/setup`
- `/api/admin/payout-approvals`
- route admin kedua lainnya.

Route role silang juga harus menghasilkan 403: murid ke tutor/admin, tutor ke murid/admin, dan admin ke murid/tutor.

## Skenario dan akun uji

Test otomatis memakai akun sintetis di database pengujian SQLite:

- murid aktif;
- tutor pending dan tutor aktif pada test tahap terkait;
- admin utama;
- admin kedua untuk memastikan penolakan.

Akun MySQL lokal pengguna tidak dibaca atau diubah oleh penyusunan patch. Skenario manual harus memakai akun uji lokal yang dibuat khusus, bukan akun production.

## Status validasi

| Area | Statis | PHPUnit lokal | Manual browser |
|---|---|---|---|
| Route frontend/lazy import | Lulus | Tidak berlaku | Wajib |
| Route API/controller | Lulus | Wajib | Wajib untuk alur utama |
| Role dan token | Lulus | Wajib | Wajib |
| Pembayaran/refund/payout | Lulus statis | Wajib | Wajib |
| Chat/laporan/file privat | Lulus statis | Wajib | Wajib |
| Responsif/aksesibilitas | Lulus statis | Sebagian | Wajib |
| Build/performance | Checker tersedia | Tidak berlaku | `npm run check:final` wajib |
