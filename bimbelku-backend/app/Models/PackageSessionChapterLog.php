<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PackageSessionChapterLog extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['needs_review_after' => 'boolean'];

    public function session()
    {
        return $this->belongsTo(PackageSession::class, 'package_session_id');
    }

    public function chapter()
    {
        return $this->belongsTo(PackageChapter::class, 'package_chapter_id');
    }

    public function progressReport()
    {
        return $this->belongsTo(LearningProgressReport::class, 'learning_progress_report_id');
    }
}
