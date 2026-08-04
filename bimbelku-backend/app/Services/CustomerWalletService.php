<?php

namespace App\Services;

use App\Models\CustomerWallet;
use App\Models\CustomerWalletTransaction;
use App\Models\Refund;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CustomerWalletService
{
    public function creditRefund(Refund $refund, ?int $actorId = null): CustomerWalletTransaction
    {
        $eventKey = "refund:{$refund->id}:wallet_credit";
        $existing = CustomerWalletTransaction::query()->where('event_key', $eventKey)->first();
        if ($existing) {
            return $existing;
        }

        if ((float) $refund->amount <= 0) {
            throw new InvalidArgumentException('Nominal refund harus lebih besar dari nol.');
        }

        try {
            return DB::transaction(function () use ($refund, $actorId, $eventKey) {
                $lockedRefund = Refund::query()->lockForUpdate()->findOrFail($refund->id);
                if ($lockedRefund->status !== 'pending') {
                    $existing = CustomerWalletTransaction::query()->where('event_key', $eventKey)->first();
                    if ($existing) {
                        return $existing;
                    }
                    abort(422, 'Refund ini sudah diproses.');
                }

                User::query()->whereKey($lockedRefund->user_id)->lockForUpdate()->firstOrFail();

                CustomerWallet::query()->firstOrCreate(
                    ['user_id' => $lockedRefund->user_id],
                    ['current_balance' => 0, 'currency' => 'IDR']
                );
                $wallet = CustomerWallet::query()
                    ->where('user_id', $lockedRefund->user_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $before = round((float) $wallet->current_balance, 2);
                $amount = round((float) $lockedRefund->amount, 2);
                $after = round($before + $amount, 2);

                $wallet->update(['current_balance' => $after]);

                return CustomerWalletTransaction::create([
                    'customer_wallet_id' => $wallet->id,
                    'user_id' => $lockedRefund->user_id,
                    'refund_id' => $lockedRefund->id,
                    'actor_id' => $actorId,
                    'event_key' => $eventKey,
                    'type' => 'refund_credit',
                    'direction' => 'credit',
                    'amount' => $amount,
                    'balance_before' => $before,
                    'balance_after' => $after,
                    'description' => "Refund pesanan {$lockedRefund->order_id} masuk ke Saldo BimbelKu",
                    'metadata' => [
                        'order_id' => $lockedRefund->order_id,
                        'reason' => $lockedRefund->reason,
                    ],
                    'created_at' => now(),
                ]);
            }, 3);
        } catch (QueryException $exception) {
            $existing = CustomerWalletTransaction::query()->where('event_key', $eventKey)->first();
            if ($existing) {
                return $existing;
            }
            throw $exception;
        }
    }

    public function snapshot(int $userId, int $limit = 100): array
    {
        $wallet = CustomerWallet::query()->where('user_id', $userId)->first();

        return [
            'balance' => round((float) ($wallet?->current_balance ?? 0), 2),
            'currency' => $wallet?->currency ?? 'IDR',
            'transactions' => $wallet
                ? $wallet->transactions()
                    ->with('refund:id,order_id,reason')
                    ->limit(max(1, min($limit, 200)))
                    ->get()
                    ->map(fn (CustomerWalletTransaction $transaction) => [
                        'id' => $transaction->id,
                        'type' => $transaction->type,
                        'direction' => $transaction->direction,
                        'amount' => (float) $transaction->amount,
                        'balance_after' => (float) $transaction->balance_after,
                        'description' => $transaction->description,
                        'refund' => $transaction->refund ? [
                            'id' => $transaction->refund->id,
                            'order_id' => $transaction->refund->order_id,
                            'reason' => $transaction->refund->reason,
                        ] : null,
                        'created_at' => $transaction->created_at,
                    ])
                    ->values()
                : collect(),
        ];
    }
}
