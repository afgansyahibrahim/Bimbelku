<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LearningPackage extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'total_sessions' => 'integer',
        'used_sessions' => 'integer',
        'duration_hours' => 'integer',
        'subtotal_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'payment_due_at' => 'datetime',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function plan()
    {
        return $this->belongsTo(PackagePlan::class, 'package_plan_id');
    }

    public function promotion()
    {
        return $this->belongsTo(Promotion::class);
    }

    public function renewalOf()
    {
        return $this->belongsTo(self::class, 'renewal_of_id');
    }

    public function subjects()
    {
        return $this->hasMany(PackageSubject::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function promotionClaims()
    {
        return $this->hasMany(PromotionClaim::class);
    }
}
