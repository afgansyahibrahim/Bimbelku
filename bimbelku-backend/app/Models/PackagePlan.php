<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PackagePlan extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'session_count' => 'integer',
        'validity_days' => 'integer',
        'maximum_subjects' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function packages()
    {
        return $this->hasMany(LearningPackage::class);
    }
}
