<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingRequest extends Model
{
    protected $hidden = ['attachment', 'latitude', 'longitude'];

    protected $fillable = [
        'student_id', 'matched_teacher_id', 'subject_name', 'education_level', 'grade', 'topic',
        'learning_mode', 'class_type', 'scheduled_date', 'start_time', 'end_time', 'duration_hours',
        'address', 'maps_link', 'latitude', 'longitude', 'status', 'matching_attempts', 'hourly_rate',
        'total_amount', 'teacher_response_deadline', 'payment_due_at', 'group_pool_id', 'chapter',
        'subtopic', 'learning_goal', 'attachment', 'search_radius_km', 'search_started_at',
        'search_expires_at', 'teacher_decision_deadline', 'teacher_rejection_reason', 'booking_id',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'duration_hours' => 'integer',
        'matching_attempts' => 'integer',
        'hourly_rate' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'teacher_response_deadline' => 'datetime',
        'payment_due_at' => 'datetime',
        'search_radius_km' => 'integer',
        'search_started_at' => 'datetime',
        'search_expires_at' => 'datetime',
        'teacher_decision_deadline' => 'datetime',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function matchedTeacher()
    {
        return $this->belongsTo(User::class, 'matched_teacher_id');
    }

    public function offers()
    {
        return $this->hasMany(TeacherOffer::class);
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function primaryBooking()
    {
        return $this->hasOne(Booking::class);
    }

    public function groupPool()
    {
        return $this->belongsTo(GroupPool::class);
    }

    public function groupMember()
    {
        return $this->hasOne(GroupMember::class);
    }

    public function participant()
    {
        return $this->hasOne(BookingParticipant::class);
    }
}
