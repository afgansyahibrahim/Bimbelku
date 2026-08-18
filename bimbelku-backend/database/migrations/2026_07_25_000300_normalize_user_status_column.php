<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'status')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('status', 30)->default('active')->change();
            });
        }
    }

    public function down(): void
    {
        // Status tetap berbentuk string agar nilai active, pending, rejected, dan banned aman digunakan.
    }
};
