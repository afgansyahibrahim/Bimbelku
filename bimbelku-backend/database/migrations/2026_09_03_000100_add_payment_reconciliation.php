<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('external_received_amount', 15, 2)->default(0)->after('wallet_applied_amount');
            $table->decimal('payment_outstanding_amount', 15, 2)->default(0)->after('external_received_amount');
            $table->decimal('payment_surplus_amount', 15, 2)->default(0)->after('payment_outstanding_amount');
            $table->string('payment_reconciliation_status', 30)->nullable()->after('payment_surplus_amount')->index();
            $table->timestamp('top_up_due_at')->nullable()->after('payment_reconciliation_status');
        });

        Schema::create('payment_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sequence');
            $table->string('proof_path')->nullable();
            $table->string('sender_name', 150)->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('sender_account_number', 80)->nullable();
            $table->string('status', 30)->default('submitted')->index();
            $table->decimal('received_amount', 15, 2)->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->unique(['order_id', 'sequence']);
            $table->index(['order_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_submissions');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['payment_reconciliation_status']);
            $table->dropColumn([
                'external_received_amount',
                'payment_outstanding_amount',
                'payment_surplus_amount',
                'payment_reconciliation_status',
                'top_up_due_at',
            ]);
        });
    }
};
