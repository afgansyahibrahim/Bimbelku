<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PackageSubject extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'allocated_sessions' => 'integer',
        'unit_price' => 'decimal:2',
        'subtotal_amount' => 'decimal:2',
    ];

    public function package()
    {
        return $this->belongsTo(LearningPackage::class, 'learning_package_id');
    }

    public function curriculumSubject()
    {
        return $this->belongsTo(CurriculumSubject::class);
    }

    public function assignedTeacher()
    {
        return $this->belongsTo(User::class, 'assigned_teacher_id');
    }

    public function preferredTeacher()
    {
        return $this->belongsTo(User::class, 'preferred_teacher_id');
    }

    public function sessions()
    {
        return $this->hasMany(PackageSession::class);
    }

    public function bookingRequest()
    {
        return $this->hasOne(BookingRequest::class);
    }
}
