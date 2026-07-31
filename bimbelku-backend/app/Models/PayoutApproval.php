<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayoutApproval extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'booking_ids' => 'array',
        'amount' => 'decimal:2',
        'approved_at' => 'datetime',
        'consumed_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
