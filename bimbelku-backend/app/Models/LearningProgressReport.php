<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LearningProgressReport extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'session_number' => 'integer',
        'actual_duration_minutes' => 'integer',
        'progress_percent' => 'integer',
        'published_at' => 'datetime',
    ];

    public function topicLogs()
    {
        return $this->hasMany(PackageSessionTopicLog::class);
    }

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
