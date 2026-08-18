<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassroomConversationState extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'hidden_through_message_id' => 'integer',
        'hidden_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
