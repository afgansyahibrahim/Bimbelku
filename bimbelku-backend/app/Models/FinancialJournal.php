<?php

namespace App\Models;

use App\Models\Concerns\ImmutableFinancialRecord;
use Illuminate\Database\Eloquent\Model;

class FinancialJournal extends Model
{
    use ImmutableFinancialRecord;

    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = [
        'occurred_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function entries()
    {
        return $this->hasMany(FinancialLedgerEntry::class);
    }
}
