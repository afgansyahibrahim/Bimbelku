<?php

namespace App\Models;

use App\Models\Concerns\ImmutableFinancialRecord;
use Illuminate\Database\Eloquent\Model;

class FinancialLedgerEntry extends Model
{
    use ImmutableFinancialRecord;

    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function journal()
    {
        return $this->belongsTo(FinancialJournal::class, 'financial_journal_id');
    }
}
