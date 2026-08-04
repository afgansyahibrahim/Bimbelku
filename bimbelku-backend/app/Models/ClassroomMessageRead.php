<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassroomMessageRead extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['read_at' => 'datetime'];

    public function message()
    {
        return $this->belongsTo(ClassroomMessage::class, 'classroom_message_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
