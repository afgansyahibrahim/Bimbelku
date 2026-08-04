<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassroomMessage extends Model
{
    protected $hidden = ['attachment_path'];

    protected $fillable = [
        'booking_id',
        'sender_id',
        'body',
        'message_type',
        'system_event_key',
        'metadata',
        'attachment_path',
        'attachment_name',
        'attachment_mime',
        'attachment_size',
        'client_token',
    ];

    protected $casts = [
        'attachment_size' => 'integer',
        'metadata' => 'array',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function reads()
    {
        return $this->hasMany(ClassroomMessageRead::class);
    }
}
