<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LearningTimeSlot extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
