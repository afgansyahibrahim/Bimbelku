<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HourlyRate extends Model
{
    protected $fillable = [
        'subject_name', 'curriculum_subject_id', 'education_level', 'class_type',
        'learning_mode', 'amount', 'is_active',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];
}
