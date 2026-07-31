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
            app(FinancialLedgerService::class)->recordRefundPaid($refund);
        }
    }
}
