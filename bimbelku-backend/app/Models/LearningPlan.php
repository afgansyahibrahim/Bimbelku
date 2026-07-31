<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LearningPlan extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'baseline_score' => 'decimal:2',
        'target_score' => 'decimal:2',
        'progress_percent' => 'integer',
        'assessed_at' => 'datetime',
        'student_acknowledged_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
