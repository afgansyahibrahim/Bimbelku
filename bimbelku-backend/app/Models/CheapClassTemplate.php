<?php

namespace App\Models;

use App\Models\Concerns\HasAutomaticPublicCode;
use Illuminate\Database\Eloquent\Model;

class CheapClassTemplate extends Model
{
    use HasAutomaticPublicCode;

    protected $guarded = ['id'];

    protected $casts = [
        'subjects' => 'array',
        'first_session_date' => 'date',
        'recurrence_days' => 'array',
        'duration_minutes' => 'integer',
        'session_count' => 'integer',
        'price_per_student' => 'decimal:2',
        'price_per_session' => 'decimal:2',
        'custom_price_per_student' => 'decimal:2',
        'minimum_participants' => 'integer',
        'maximum_participants' => 'integer',
        'registration_window_hours' => 'integer',
        'registration_closes_before_minutes' => 'integer',
        'payment_window_minutes' => 'integer',
        'recurrence_enabled' => 'boolean',
        'recurrence_anchor_at' => 'datetime',
        'next_publish_at' => 'datetime',
        'last_published_at' => 'datetime',
        'last_skipped_at' => 'datetime',
        'last_generation_failed_at' => 'datetime',
        'settings_version' => 'integer',
        'is_active' => 'boolean',
    ];

    protected function automaticPublicCodeColumn(): string
    {
        return 'template_code';
    }

    protected function buildAutomaticPublicCode(): string
    {
        return 'KMT-'.$this->paddedPublicId(10);
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function subject()
    {
        return $this->belongsTo(CurriculumSubject::class, 'curriculum_subject_id');
    }

    public function chapterCatalog()
    {
        return $this->belongsTo(CurriculumChapter::class, 'curriculum_chapter_id');
    }

    public function classes()
    {
        return $this->hasMany(CheapClass::class);
    }
}
