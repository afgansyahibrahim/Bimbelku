<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScheduleChangeResponse extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['responded_at' => 'datetime'];

    public function request()
    {
        return $this->belongsTo(ScheduleChangeRequest::class, 'schedule_change_request_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
