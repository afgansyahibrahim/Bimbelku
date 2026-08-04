<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherPayoutRequest extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['account_number'];

    protected $casts = [
        'booking_ids' => 'array',
        'gross_amount' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'requested_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function payout()
    {
        return $this->belongsTo(Payout::class);
    }
}
