<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherPointLedger extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'change' => 'integer',
        'balance_after' => 'integer',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function appeal()
    {
        return $this->hasOne(TeacherAppeal::class);
    }
}
