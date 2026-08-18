<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingParticipant extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function bookingRequest()
    {
        return $this->belongsTo(BookingRequest::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function attendance()
    {
        return $this->hasOne(ParticipantAttendance::class);
    }
}
