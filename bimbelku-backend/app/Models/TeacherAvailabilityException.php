<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherAvailabilityException extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
