<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\FinancialJournal;
use App\Models\FinancialLedgerEntry;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Refund;
use App\Models\Setting;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class FinancialLedgerService
{
    public function recordPaymentReceived(Order $order): FinancialJournal
    {
        return $this->record(
            "order:{$order->id}:payment_received",
            'payment_received',
            Order::class,
            $order->id,
            "Dana tagihan {$order->order_id} diterima",
            [
                ['account' => 'platform_cash', 'side' => 'debit', 'amount' => $order->amount],
                ['account' => 'customer_funds', 'side' => 'credit', 'amount' => $order->amount],
            ]
        );
    }

    public function recordRefundQueued(Refund $refund): FinancialJournal
    {
        return $this->record(
            "refund:{$refund->id}:queued",
            'refund_queued',
            Refund::class,
            $refund->id,
            "Dana refund pesanan {$refund->order_id} ditahan",
            [
                ['account' => 'customer_funds', 'side' => 'debit', 'amount' => $refund->amount],
                ['account' => 'refunds_payable', 'side' => 'credit', 'amount' => $refund->amount],
            ]
        );
    }

    public function recordBookingSettled(Booking $booking): FinancialJournal
    {
        $gross = (float) $booking->gross_amount;
        $net = (float) $booking->teacher_net_amount;
        $commission = max(0, $gross - $net);

        return $this->record(
            "booking:{$booking->id}:settled",
            'booking_settled',
            Booking::class,
            $booking->id,
            "Hak tutor dan komisi sesi {$booking->id} dibentuk",
            [
                ['account' => 'customer_funds', 'side' => 'debit', 'amount' => $gross],
                ['account' => 'tutor_payable', 'side' => 'credit', 'amount' => $net],
                ['account' => 'platform_revenue', 'side' => 'credit', 'amount' => $commission],
            ]
        );
    }

    public function recordPayout(Payout $payout): FinancialJournal
    {
        return $this->record(
            "payout:{$payout->id}:completed",
            'payout_completed',
            Payout::class,
            $payout->id,
            "Hak tutor {$payout->user_id} dicairkan",
            [
                ['account' => 'tutor_payable', 'side' => 'debit', 'amount' => $payout->amount],
                ['account' => 'platform_cash', 'side' => 'credit', 'amount' => $payout->amount],
            ]
        );
    }

    public function recordRefundPaid(Refund $refund): FinancialJournal
    {
        return $this->record(
            "refund:{$refund->id}:paid",
            'refund_paid',
            Refund::class,
            $refund->id,
            "Refund pesanan {$refund->order_id} dicairkan",
            [
                ['account' => 'refunds_payable', 'side' => 'debit', 'amount' => $refund->amount],
                ['account' => 'platform_cash', 'side' => 'credit', 'amount' => $refund->amount],
            ]
        );
    }

    public function recordRefundCreditedToWallet(Refund $refund): FinancialJournal
    {
        return $this->record(
            "refund:{$refund->id}:wallet_credited",
            'refund_wallet_credited',
            Refund::class,
            $refund->id,
            "Refund pesanan {$refund->order_id} masuk ke Saldo BimbelKu",
            [
                ['account' => 'refunds_payable', 'side' => 'debit', 'amount' => $refund->amount],
                ['account' => 'customer_wallet_liability', 'side' => 'credit', 'amount' => $refund->amount],
            ]
        );
    }

    public function record(
        string $eventKey,
        string $eventType,
        ?string $referenceType,
        ?int $referenceId,
        string $description,
        array $entries
    ): FinancialJournal {
        $existing = FinancialJournal::query()->where('event_key', $eventKey)->first();
        if ($existing) {
            return $existing;
        }

        $debit = 0;
        $credit = 0;
        $normalizedEntries = [];
        foreach ($entries as $entry) {
            $cents = (int) round((float) $entry['amount'] * 100);
            if ($cents < 0 || !in_array($entry['side'], ['debit', 'credit'], true)) {
                throw new InvalidArgumentException('Baris jurnal keuangan tidak valid.');
            }
            if ($entry['side'] === 'debit') {
                $debit += $cents;
            } else {
                $credit += $cents;
            }
            $normalizedEntries[] = [
                'account' => (string) $entry['account'],
                'side' => (string) $entry['side'],
                'amount' => number_format($cents / 100, 2, '.', ''),
                'currency' => 'IDR',
            ];
        }
        if ($debit <= 0 || $debit !== $credit) {
            throw new InvalidArgumentException('Jurnal keuangan harus seimbang.');
        }
        $entries = $normalizedEntries;

        try {
            return DB::transaction(function () use (
                $eventKey,
                $eventType,
                $referenceType,
                $referenceId,
                $description,
                $entries
            ) {
                Setting::query()
                    ->where('key', 'finance_ledger_chain_lock')
                    ->lockForUpdate()
                    ->firstOrFail();
                $previousHash = FinancialJournal::query()
                    ->latest('id')
                    ->value('entry_hash');
                $occurredAt = now()->startOfSecond();
                $actorId = Auth::id();
                $hashPayload = json_encode([
                    'previous_hash' => $previousHash,
                    'event_key' => $eventKey,
                    'event_type' => $eventType,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'actor_id' => $actorId,
                    'description' => $description,
                    'occurred_at' => $occurredAt->toISOString(),
                    'entries' => $entries,
                ], JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);

                $journal = FinancialJournal::create([
                    'uuid' => (string) Str::uuid(),
                    'event_key' => $eventKey,
                    'event_type' => $eventType,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'actor_id' => $actorId,
                    'description' => $description,
                    'previous_hash' => $previousHash,
                    'entry_hash' => hash('sha256', (string) $hashPayload),
                    'occurred_at' => $occurredAt,
                ]);

                foreach ($entries as $entry) {
                    FinancialLedgerEntry::create([
                        'financial_journal_id' => $journal->id,
                        'account_code' => $entry['account'],
                        'side' => $entry['side'],
                        'amount' => round((float) $entry['amount'], 2),
                        'currency' => $entry['currency'],
                    ]);
                }

                return $journal->load('entries');
            }, 3);
        } catch (QueryException $exception) {
            $existing = FinancialJournal::query()->where('event_key', $eventKey)->first();
            if ($existing) {
                return $existing;
            }
            throw $exception;
        }
    }
}
