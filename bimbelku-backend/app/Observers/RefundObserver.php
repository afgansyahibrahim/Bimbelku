<?php

namespace App\Observers;

use App\Models\Refund;
use App\Services\FinancialLedgerService;

class RefundObserver
{
    public function created(Refund $refund): void
    {
        app(FinancialLedgerService::class)->recordRefundQueued($refund);
    }

    public function updated(Refund $refund): void
    {
        if ($refund->wasChanged('status') && $refund->status === 'paid') {
            $ledger = app(FinancialLedgerService::class);
            if ($refund->destination_method === 'bimbelku_balance') {
                $ledger->recordRefundCreditedToWallet($refund);
            } else {
                $ledger->recordRefundPaid($refund);
            }
        }
    }
}
