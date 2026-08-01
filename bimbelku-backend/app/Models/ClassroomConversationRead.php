<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassroomConversationRead extends Model
{
    protected $fillable = [
        'booking_id',
        'user_id',
        'last_read_message_id',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function lastReadMessage()
    {
        return $this->belongsTo(ClassroomMessage::class, 'last_read_message_id');
    }
}
