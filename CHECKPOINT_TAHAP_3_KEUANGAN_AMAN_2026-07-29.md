# Checkpoint Tahap 3 — Keuangan Aman

Tanggal: 29 Juli 2026

Dasar source: paket final Tahap 2.

## Keputusan kategori

Kategori aktif sekarang hanya:

- SD;
- SMP;
- SMA;
- Umum.

Perguruan Tinggi dan pilihan Semester dinonaktifkan. Migration tidak menghapus
transaksi lama. Data katalog lama diberi status tidak aktif agar referensi
historis tetap dapat dibaca.

## Perlindungan keuangan

### Jurnal berpasangan

Setiap pembayaran, pembentukan hak tutor, refund, dan pencairan menghasilkan
jurnal debit-kredit yang seimbang. Jurnal memakai kunci peristiwa unik dan hash
berantai. Model jurnal menolak perubahan serta penghapusan langsung.

### Pencegahan transaksi ganda

Mutasi keuangan mewajibkan header `Idempotency-Key`. Permintaan dengan kunci dan
isi yang sama memutar ulang jawaban pertama. Pemakaian kembali kunci untuk isi
yang berbeda ditolak.

### Akses admin keuangan

Admin harus:

1. memasukkan kata sandi untuk membuat rahasia TOTP;
2. memindai atau menyalin rahasia ke aplikasi autentikator;
3. mengonfirmasi kode enam digit;
4. membuka akses keuangan kembali ketika masa otorisasi habis.

Rahasia TOTP tersimpan terenkripsi. Akses sementara diikat pada token login.

### Perubahan rekening tutor

Perubahan rekening memerlukan kata sandi saat ini. Sistem menyimpan sidik data
rekening, menaikkan versi rekening, mengirim notifikasi, dan menahan pencairan
selama 24 jam.

### Pencairan besar

Nilai awal batas pencairan besar adalah Rp5.000.000 dan dapat diubah melalui
setting. Admin pertama meminta persetujuan. Admin kedua menyetujui. Admin yang
meminta tidak boleh menyetujui permintaannya sendiri. Persetujuan terikat pada
tutor, daftar booking, nominal, dan versi rekening.

### Audit

Tindakan pembayaran, refund, pencairan, komisi, tujuan pembayaran, rekening
tutor, dan otorisasi keuangan dicatat. Kata sandi dan kode TOTP tidak masuk ke
log. Nomor rekening pada payload audit disamarkan.

## Batas integrasi saat ini

Tahap 3 mengamankan pencatatan dan proses transfer manual. Aplikasi belum
memindahkan uang melalui payment gateway atau API bank karena penyedia belum
ditentukan. Kolom referensi penyedia sudah disiapkan untuk integrasi berikutnya.

## Pemeriksaan

Gunakan:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\test-tahap3.ps1
```

Skrip menggunakan `php artisan migrate --force`, bukan `migrate:fresh`.
