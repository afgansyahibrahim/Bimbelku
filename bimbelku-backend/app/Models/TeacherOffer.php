<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherOffer extends Model
{
    protected $fillable = [
        'booking_request_id', 'teacher_id', 'status', 'distance_km', 'offered_at',
        'expires_at', 'responded_at', 'rejection_reason', 'no_response_penalty_applied',
    ];

    protected $casts = [
        'distance_km' => 'float',
        'offered_at' => 'datetime',
        'expires_at' => 'datetime',
        'responded_at' => 'datetime',
        'no_response_penalty_applied' => 'boolean',
    ];

    public function bookingRequest()
    {
        return $this->belongsTo(BookingRequest::class);
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
