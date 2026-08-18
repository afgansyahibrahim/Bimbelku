<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PackageSessionTopicLog extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['needs_review_after' => 'boolean'];

    public function session()
    {
        return $this->belongsTo(PackageSession::class, 'package_session_id');
    }

    public function topic()
    {
        return $this->belongsTo(PackageLearningTopic::class, 'package_learning_topic_id');
    }

    public function progressReport()
    {
        return $this->belongsTo(LearningProgressReport::class, 'learning_progress_report_id');
    }
}
