<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CheapClassEnrollment extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'decimal:2',
        'seat_expires_at' => 'datetime',
        'payment_submitted_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function cheapClass()
    {
        return $this->belongsTo(CheapClass::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function order()
    {
        return $this->hasOne(Order::class);
    }
}
