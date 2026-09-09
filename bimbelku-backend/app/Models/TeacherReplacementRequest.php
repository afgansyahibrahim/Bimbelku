<?php

namespace App\Models;

use App\Support\TeacherReplacementState;
use Illuminate\Database\Eloquent\Model;

class TeacherReplacementRequest extends Model
{
    public const OPEN_STATUSES = TeacherReplacementState::OPEN;

    protected $guarded = ['id'];

    protected $hidden = ['evidence_path'];

    protected $appends = ['evidence_url', 'has_evidence'];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'search_started_at' => 'datetime',
        'completed_at' => 'datetime',
        'version' => 'integer',
    ];

    public function package()
    {
        return $this->belongsTo(LearningPackage::class, 'learning_package_id');
    }

    public function subject()
    {
        return $this->belongsTo(PackageSubject::class, 'package_subject_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function oldTeacher()
    {
        return $this->belongsTo(User::class, 'old_teacher_id');
    }

    public function newTeacher()
    {
        return $this->belongsTo(User::class, 'new_teacher_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function sessions()
    {
        return $this->hasMany(TeacherReplacementSession::class);
    }

    public function matchingRequest()
    {
        return $this->hasOne(BookingRequest::class);
    }

    public function transitionTo(string $status, array $attributes = []): self
    {
        TeacherReplacementState::assertCanTransition((string) $this->status, $status);
        $this->fill([
            ...$attributes,
            'status' => $status,
            'version' => (int) $this->version + 1,
        ])->save();

        return $this;
    }

    public function getEvidenceUrlAttribute(): ?string
    {
        return $this->evidence_path ? "teacher-replacements/{$this->id}/evidence" : null;
    }

    public function getHasEvidenceAttribute(): bool
    {
        return ! empty($this->evidence_path);
    }
}
