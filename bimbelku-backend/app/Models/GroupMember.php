<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GroupMember extends Model
{
    protected $guarded = ['id'];

    public function pool()
    {
        return $this->belongsTo(GroupPool::class, 'group_pool_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function bookingRequest()
    {
        return $this->belongsTo(BookingRequest::class);
    }
}
