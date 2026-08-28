<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CheapClassSession extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'session_number' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'progress_updates' => 'array',
        'progress_recorded_at' => 'datetime',
        'attended_participants_count' => 'integer',
        'report_submitted_at' => 'datetime',
        'admin_reviewed_at' => 'datetime',
        'teacher_started_at' => 'datetime',
        'report_revision_count' => 'integer',
    ];

    public function cheapClass()
    {
        return $this->belongsTo(CheapClass::class);
    }
}
