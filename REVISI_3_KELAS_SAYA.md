# Revisi 3 — Kelas Saya

Perubahan fokus pada navigasi dan penyaringan kelas tanpa mengubah API atau business logic.

- Halaman `/student/my-classes` memiliki tombol **Kembali ke Kelas Saya** menuju `/student/packages`.
- Daftar kelas murid memiliki filter **Mata pelajaran** yang hanya dibentuk dari mapel yang benar-benar terdapat pada kelas murid.
- Daftar kelas murid memiliki urutan **Jadwal paling dekat** (default) dan **Jadwal paling jauh**, mengikuti prinsip pengurutan halaman guru: jadwal mendatang selalu didahulukan, lalu riwayat.
- Detail kelas murid dan guru memiliki tombol **Kembali ke daftar kelas**.
- Ruang belajar yang dibuka dari detail kelas memiliki tombol **Kembali ke detail kelas**.
- Tidak ada endpoint API, schema database, role, authorization, atau business logic yang diubah.
