<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Tabel "sessions" adalah tabel sesi autentikasi Laravel.
        // Migrasi lama ini sengaja dibuat no-op agar tidak mencampurkan data kelas.
    }

    public function down(): void
    {
        // Tidak ada perubahan skema.
    }
};
