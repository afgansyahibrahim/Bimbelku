<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasIndex('refunds', 'refunds_order_id_unique')) {
            if (! Schema::hasIndex('refunds', 'refunds_order_id_index')) {
                Schema::table('refunds', fn (Blueprint $table) => $table->index('order_id'));
            }
            Schema::table('refunds', fn (Blueprint $table) => $table->dropUnique('refunds_order_id_unique'));
        }
        Schema::table('refunds', function (Blueprint $table) {
            $table->string('source_type', 50)->nullable()->after('booking_id');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->decimal('wallet_refund_amount', 12, 2)->nullable()->after('amount');
            $table->decimal('external_refund_amount', 12, 2)->nullable()->after('wallet_refund_amount');
            $table->unique(['source_type', 'source_id'], 'refunds_source_unique');
        });
        DB::table('refunds')->orderBy('id')->eachById(function ($refund) {
            $order = DB::table('orders')->find($refund->order_id);
            $amount = (float) $refund->amount;
            $orderAmount = max(0.01, (float) ($order?->amount ?? $amount));
            $wallet = min($amount, round($amount * ((float) ($order?->wallet_applied_amount ?? 0) / $orderAmount), 2));
            DB::table('refunds')->where('id', $refund->id)->update([
                'source_type' => 'legacy_order',
                'source_id' => $refund->order_id,
                'wallet_refund_amount' => $wallet,
                'external_refund_amount' => round($amount - $wallet, 2),
            ]);
        });
    }

    public function down(): void
    {
        $hasDuplicateOrders = DB::table('refunds')
            ->select('order_id')
            ->whereNotNull('order_id')
            ->groupBy('order_id')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        Schema::table('refunds', function (Blueprint $table) {
            $table->dropUnique('refunds_source_unique');
            $table->dropColumn(['source_type', 'source_id', 'wallet_refund_amount', 'external_refund_amount']);
        });
        if (! $hasDuplicateOrders && ! Schema::hasIndex('refunds', 'refunds_order_id_unique')) {
            Schema::table('refunds', fn (Blueprint $table) => $table->unique('order_id'));
        }
        if (! $hasDuplicateOrders && Schema::hasIndex('refunds', 'refunds_order_id_index')) {
            Schema::table('refunds', fn (Blueprint $table) => $table->dropIndex('refunds_order_id_index'));
        }
    }
};
