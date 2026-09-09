<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('email_verification_required_at')->nullable()->after('email_verified_at');
        });
        Schema::create('verification_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('purpose', 40);
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('sent_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'purpose', 'used_at'], 'verification_codes_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_codes');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('email_verification_required_at');
        });
    }
};
