<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payout extends Model
{
    use HasFactory;

    protected $hidden = ['proof_url'];

    protected $fillable = [
        'user_id',
        'amount',
        'period',
        'total_classes',
        'proof_url', // Pastikan kolom ini ada di fillable
        'status',
        'booking_id',
        'gross_amount',
        'commission_amount',
        'processed_by',
        'processed_at',
        'booking_ids',
        'bank_name',
        'account_number',
        'account_name',
        'payout_approval_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'gross_amount' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'processed_at' => 'datetime',
        'booking_ids' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
