<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PackageChapter extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'sort_order' => 'integer',
        'needs_review' => 'boolean',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function subject()
    {
        return $this->belongsTo(PackageSubject::class, 'package_subject_id');
    }

    public function curriculumChapter()
    {
        return $this->belongsTo(CurriculumChapter::class, 'curriculum_chapter_id');
    }

    public function logs()
    {
        return $this->hasMany(PackageSessionChapterLog::class);
    }
}
