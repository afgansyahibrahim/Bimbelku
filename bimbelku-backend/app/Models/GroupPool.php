<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GroupPool extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'scheduled_date' => 'date',
        'duration_hours' => 'integer',
        'latitude' => 'float',
        'longitude' => 'float',
        'minimum_participants' => 'integer',
        'maximum_participants' => 'integer',
        'join_deadline' => 'datetime',
        'decision_deadline' => 'datetime',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function members()
    {
        return $this->hasMany(GroupMember::class);
    }

    public function booking()
    {
        return $this->hasOne(Booking::class);
    }
}
