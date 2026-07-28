<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Struktur slots sudah dibuat oleh migration sebelumnya.
        // Migration ini dipertahankan sebagai penanda kompatibilitas riwayat database.
    }

    public function down(): void
    {
        // Tidak ada perubahan skema yang perlu dibatalkan.
    }
};
