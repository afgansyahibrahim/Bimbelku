<?php

namespace App\Observers;

use App\Models\Payout;
use App\Services\FinancialLedgerService;

class PayoutObserver
{
    public function created(Payout $payout): void
    {
        if ($payout->status === 'completed') {
            app(FinancialLedgerService::class)->recordPayout($payout);
        }
    }
}
