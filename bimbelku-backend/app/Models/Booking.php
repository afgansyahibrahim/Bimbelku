<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    protected $hidden = ['completion_evidence'];
    protected $appends = ['completion_evidence_url'];

    protected $fillable = [
        'booking_request_id', 'student_id', 'teacher_id', 'order_id', 'start_at', 'end_at',
        'duration_hours', 'learning_mode', 'class_type', 'hourly_rate', 'total_amount', 'status',
        'payment_due_at', 'address', 'maps_link',
        'group_pool_id', 'commission_percent', 'gross_amount', 'teacher_net_amount',
        'completion_evidence', 'meeting_link', 'completion_notes', 'completion_submitted_at',
        'objection_deadline', 'student_approved_at', 'admin_review_required_at',
        'completed_at', 'payout_status',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'duration_hours' => 'integer',
        'hourly_rate' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'payment_due_at' => 'datetime',
        'commission_percent' => 'decimal:2',
        'gross_amount' => 'decimal:2',
        'teacher_net_amount' => 'decimal:2',
        'completion_submitted_at' => 'datetime',
        'objection_deadline' => 'datetime',
        'student_approved_at' => 'datetime',
        'admin_review_required_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function bookingRequest()
    {
        return $this->belongsTo(BookingRequest::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function participants()
    {
        return $this->hasMany(BookingParticipant::class);
    }

    public function groupPool()
    {
        return $this->belongsTo(GroupPool::class);
    }

    public function reports()
    {
        return $this->hasMany(SessionReport::class);
    }

    public function disputes()
    {
        return $this->hasMany(BookingDispute::class);
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class);
    }

    public function getCompletionEvidenceUrlAttribute(): ?string
    {
        return $this->completion_evidence ? "bookings/{$this->id}/completion-evidence" : null;
    }
}
