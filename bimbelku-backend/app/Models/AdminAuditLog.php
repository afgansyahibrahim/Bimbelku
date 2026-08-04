<?php

namespace App\Models;

use App\Models\Concerns\ImmutableFinancialRecord;
use Illuminate\Database\Eloquent\Model;

class AdminAuditLog extends Model
{
    use ImmutableFinancialRecord;

    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = [
        'actor_id' => 'integer',
        'response_status' => 'integer',
        'target_id' => 'integer',
        'request_payload' => 'encrypted:array',
        'before_state' => 'encrypted:array',
        'after_state' => 'encrypted:array',
        'metadata' => 'encrypted:array',
        'ip_address' => 'encrypted',
        'user_agent' => 'encrypted',
        'created_at' => 'datetime',
    ];

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
