<?php

namespace App\Observers;

use App\Models\Order;
use App\Services\FinancialLedgerService;

class OrderObserver
{
    public function updated(Order $order): void
    {
        if (!$order->wasChanged('status')) {
            return;
        }

        $previousStatus = (string) $order->getOriginal('status');
        $currentStatus = (string) $order->status;
        $ledger = app(FinancialLedgerService::class);

        if ($currentStatus === 'paid') {
            $ledger->recordPaymentReceived($order);
        }

        if ($currentStatus === 'refund_pending') {
            if (!in_array($previousStatus, ['paid', 'refund_pending', 'refunded'], true)) {
                $ledger->recordPaymentReceived($order);
            }
            if ($order->refund) {
                $ledger->recordRefundQueued($order->refund);
            }
        }
    }
}
