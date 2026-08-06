<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('classroom_conversation_states')) {
            return;
        }

        Schema::create('classroom_conversation_states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('conversation_key', 191);
            $table->unsignedBigInteger('hidden_through_message_id')->default(0);
            $table->timestamp('hidden_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'conversation_key'], 'conversation_states_user_key_unique');
            $table->index(['user_id', 'hidden_at'], 'conversation_states_user_hidden_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classroom_conversation_states');
    }
};
