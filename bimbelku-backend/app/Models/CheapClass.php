<?php

namespace App\Models;

use App\Models\Concerns\HasAutomaticPublicCode;
use Illuminate\Database\Eloquent\Model;

class CheapClass extends Model
{
    use HasAutomaticPublicCode;

    protected $guarded = ['id'];

    protected $casts = [
        'subjects' => 'array',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'session_count' => 'integer',
        'registration_opens_at' => 'datetime',
        'registration_deadline' => 'datetime',
        'price_per_student' => 'decimal:2',
        'price_per_session' => 'decimal:2',
        'custom_price_per_student' => 'decimal:2',
        'minimum_participants' => 'integer',
        'maximum_participants' => 'integer',
        'payment_window_minutes' => 'integer',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'occurrence_week_start' => 'date',
        'template_settings_version' => 'integer',
        'template_snapshot' => 'array',
    ];

    protected function automaticPublicCodeColumn(): string
    {
        return 'package_code';
    }

    protected function buildAutomaticPublicCode(): string
    {
        $dateSource = $this->registration_opens_at ?? $this->starts_at ?? $this->created_at;
        $date = $dateSource ? $dateSource->format('Ymd') : now()->format('Ymd');

        return 'KMP-'.$date.'-'.$this->paddedPublicId();
    }

    public function template()
    {
        return $this->belongsTo(CheapClassTemplate::class, 'cheap_class_template_id');
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

    public function sessions()
    {
        return $this->hasMany(CheapClassSession::class)->orderBy('session_number');
    }

    public function enrollments()
    {
        return $this->hasMany(CheapClassEnrollment::class);
    }
}
