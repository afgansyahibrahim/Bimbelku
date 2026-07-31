<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SessionAttendance extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['ip_hash'];

    protected $casts = [
        'check_in_at' => 'datetime',
        'check_out_at' => 'datetime',
        'pin_verified_at' => 'datetime',
        'latitude' => 'float',
        'longitude' => 'float',
        'accuracy_meters' => 'integer',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
