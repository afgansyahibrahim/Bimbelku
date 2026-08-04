<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScheduleChangeRequest extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'original_start_at' => 'datetime',
        'original_end_at' => 'datetime',
        'proposed_start_at' => 'datetime',
        'proposed_end_at' => 'datetime',
        'decided_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function responses()
    {
        return $this->hasMany(ScheduleChangeResponse::class);
    }
}
