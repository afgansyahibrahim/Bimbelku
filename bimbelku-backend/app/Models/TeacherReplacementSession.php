<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherReplacementSession extends Model
{
    protected $guarded = ['id'];

    public function replacement()
    {
        return $this->belongsTo(TeacherReplacementRequest::class, 'teacher_replacement_request_id');
    }

    public function packageSession()
    {
        return $this->belongsTo(PackageSession::class);
    }

    public function oldBooking()
    {
        return $this->belongsTo(Booking::class, 'old_booking_id');
    }

    public function newBooking()
    {
        return $this->belongsTo(Booking::class, 'new_booking_id');
    }
}
