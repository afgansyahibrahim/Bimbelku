<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    protected $guarded = ['id'];
    protected $hidden = ['proof'];
    protected $appends = ['proof_url'];

    protected $casts = [
        'amount' => 'decimal:2',
        'processed_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function processor()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function walletTransaction()
    {
        return $this->hasOne(CustomerWalletTransaction::class, 'refund_id');
    }

    public function getProofUrlAttribute(): ?string
    {
        return $this->proof ? "refunds/{$this->id}/proof" : null;
    }
}
