<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassroomMessage extends Model
{
    protected $fillable = ['booking_id', 'sender_id', 'body'];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
