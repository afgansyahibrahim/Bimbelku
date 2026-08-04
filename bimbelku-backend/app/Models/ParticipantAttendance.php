<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ParticipantAttendance extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['marked_at' => 'datetime'];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function participant()
    {
        return $this->belongsTo(BookingParticipant::class, 'booking_participant_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
