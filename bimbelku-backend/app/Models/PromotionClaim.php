<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromotionClaim extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'claimed_at' => 'datetime',
        'reserved_at' => 'datetime',
        'used_at' => 'datetime',
        'released_at' => 'datetime',
    ];

    public function promotion()
    {
        return $this->belongsTo(Promotion::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function package()
    {
        return $this->belongsTo(LearningPackage::class, 'learning_package_id');
    }
}
