<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PackageSession extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'sequence' => 'integer',
        'scheduled_start_at' => 'datetime',
        'scheduled_end_at' => 'datetime',
    ];

    public function subject()
    {
        return $this->belongsTo(PackageSubject::class, 'package_subject_id');
    }

    public function topicLogs()
    {
        return $this->hasMany(PackageSessionTopicLog::class);
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
