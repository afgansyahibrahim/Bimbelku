<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('classroom_conversation_reads')) {
            return;
        }

        Schema::create('classroom_conversation_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('last_read_message_id')
                ->nullable()
                ->constrained('classroom_messages')
                ->nullOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->unique(['booking_id', 'user_id'], 'classroom_conversation_reads_booking_user_unique');
            $table->index(['user_id', 'read_at'], 'classroom_conversation_reads_user_read_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classroom_conversation_reads');
    }
};
