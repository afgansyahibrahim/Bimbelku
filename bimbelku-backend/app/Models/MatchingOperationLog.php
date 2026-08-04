<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MatchingOperationLog extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = [
        'before_state' => 'array',
        'after_state' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function bookingRequest()
    {
        return $this->belongsTo(BookingRequest::class);
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
