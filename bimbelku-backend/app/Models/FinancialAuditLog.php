<?php

namespace App\Models;

use App\Models\Concerns\ImmutableFinancialRecord;
use Illuminate\Database\Eloquent\Model;

class FinancialAuditLog extends Model
{
    use ImmutableFinancialRecord;

    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = [
        'payload' => 'encrypted:array',
        'ip_address' => 'encrypted',
        'user_agent' => 'encrypted',
        'created_at' => 'datetime',
    ];
}
