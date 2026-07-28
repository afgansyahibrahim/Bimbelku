<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $guarded = ['id'];
    protected $hidden = ['payment_proof'];
    protected $appends = ['payment_proof_url'];

    protected $casts = [
        'amount' => 'decimal:2',
        'class_details_snapshot' => 'array',
        'payment_submitted_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function classroom() {
        return $this->belongsTo(Classroom::class);
    }

    public function booking() {
        return $this->belongsTo(Booking::class);
    }

    public function legacyBooking() {
        return $this->hasOne(Booking::class);
    }

    public function participant() {
        return $this->hasOne(BookingParticipant::class);
    }

    public function refund() {
        return $this->hasOne(Refund::class);
    }

    public function getPaymentProofUrlAttribute(): ?string
    {
        return $this->payment_proof ? "orders/{$this->id}/payment-proof" : null;
    }
}
