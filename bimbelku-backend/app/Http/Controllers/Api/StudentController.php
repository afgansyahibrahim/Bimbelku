<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Order;
use App\Models\Rating;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function checkOrderStatus(Request $request, string $id)
    {
        $order = Order::query()
            ->where('user_id', $request->user()->id)
            ->where(function ($query) use ($id) {
                $query->whereKey($id)->orWhere('order_id', $id);
            })
            ->with('refund')
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Tagihan tidak ditemukan.'], 404);
        }

        return response()->json([
            'status' => $order->status,
            'id' => $order->id,
            'order_id' => $order->order_id,
            'has_proof' => !empty($order->payment_proof),
            'rejection_reason' => $order->payment_rejection_reason,
            'refund' => $order->refund,
        ]);
    }

    public function getMyClasses(Request $request)
    {
        $studentId = $request->user()->id;
        $bookings = Booking::query()
            ->whereHas('participants', fn ($query) => $query
                ->where('student_id', $studentId)
                ->whereNotIn('status', ['cancelled', 'teacher_rejected', 'payment_expired']))
            ->with([
                'teacher.teacherProfile',
                'bookingRequest',
                'participants' => fn ($query) => $query->where('student_id', $studentId),
                'participants.bookingRequest',
                'participants.order.refund',
                'disputes' => fn ($query) => $query->where('student_id', $studentId)->latest(),
                'latestClassroomMessage.sender:id,name',
                'learningPlan',
                'latestLearningProgressReport' => fn ($query) => $query->where('student_id', $studentId),
            ])
            ->withCount([
                'learningProgressReports as student_learning_progress_reports_count' => fn ($query) => $query->where('student_id', $studentId),
            ])
            ->latest('start_at')
            ->limit(200)
            ->get();
        $ratedBookingIds = Rating::query()
            ->where('student_id', $studentId)
            ->whereIn('booking_id', $bookings->pluck('id'))
            ->pluck('booking_id')
            ->flip();

        $data = $bookings->map(function (Booking $booking) use ($ratedBookingIds) {
            $participant = $booking->participants->first();
            $learningRequest = $participant?->bookingRequest ?? $booking->bookingRequest;
            $classType = $learningRequest?->class_type ?? $booking->class_type;
            $profile = $booking->teacher?->teacherProfile;
            $hasSessionAccess = $participant?->order?->status === 'paid';
            $isRated = $ratedBookingIds->has($booking->id);
            $latestReport = $booking->latestLearningProgressReport;

            return [
                'id' => $booking->id,
                'request_id' => $learningRequest?->id,
                'title' => ($learningRequest?->subject_name ?? 'Bimbingan')
                    .' • '.($learningRequest?->chapter ?: $learningRequest?->topic ?: 'Sesi belajar'),
                'subject' => $learningRequest?->subject_name ?? 'Bimbingan',
                'education_level' => $learningRequest?->education_level,
                'grade' => $learningRequest?->grade,
                'chapter' => $learningRequest?->chapter,
                'subtopic' => $learningRequest?->subtopic,
                'topic' => $learningRequest?->topic,
                'mentor' => $booking->teacher?->name ?? 'Tutor',
                'mentor_avatar' => $profile?->photo ? asset('storage/'.$profile->photo) : null,
                'type' => $classType === 'group' ? 'Kelompok' : 'Privat',
                'method' => $booking->learning_mode,
                'status' => $booking->status,
                'participant_status' => $participant?->status,
                'start_at' => $booking->start_at,
                'end_at' => $booking->end_at,
                'payment_due_at' => $booking->payment_due_at,
                'address' => $hasSessionAccess && $booking->learning_mode === 'offline'
                    ? $booking->address
                    : null,
                'maps_link' => $hasSessionAccess && $booking->learning_mode === 'offline'
                    ? $booking->maps_link
                    : null,
                'meeting_link' => $hasSessionAccess && $booking->learning_mode === 'online'
                    ? $booking->meeting_link
                    : null,
                'amount' => (float) ($participant?->amount ?? $booking->total_amount),
                'completion_evidence_url' => $hasSessionAccess && $booking->completion_evidence
                    ? "bookings/{$booking->id}/completion-evidence"
                    : null,
                'completion_notes' => $booking->completion_notes,
                'completion_submitted_at' => $booking->completion_submitted_at,
                'objection_deadline' => $booking->objection_deadline,
                'approved_at' => $participant?->approved_at,
                'order' => $participant?->order,
                'refund' => $participant?->order?->refund,
                'dispute' => $booking->disputes->first(),
                'can_approve' => $booking->status === 'awaiting_student_approval'
                    && $participant?->status === 'awaiting_student_approval'
                    && !$participant?->approved_at
                    && $booking->objection_deadline?->isFuture(),
                'can_dispute' => $booking->status === 'awaiting_student_approval'
                    && $participant?->status === 'awaiting_student_approval'
                    && !$participant?->approved_at
                    && $booking->objection_deadline?->isFuture(),
                'can_rate' => $booking->status === 'completed'
                    && $participant?->status === 'approved'
                    && !$isRated,
                'can_report_teacher_absence' => in_array($booking->status, ['confirmed', 'in_progress'], true)
                    && $hasSessionAccess
                    && now()->gte($booking->start_at->copy()->addMinutes(15)),
                'workspace' => [
                    'can_open' => $hasSessionAccess,
                    'latest_message' => $booking->latestClassroomMessage ? [
                        'body' => $booking->latestClassroomMessage->body,
                        'sender_name' => $booking->latestClassroomMessage->sender?->name ?? 'Pengguna BimbelKu',
                        'created_at' => $booking->latestClassroomMessage->created_at,
                    ] : null,
                    'progress_percent' => (int) ($booking->learningPlan?->progress_percent ?? 0),
                    'progress_status' => $booking->learningPlan?->status,
                    'report_count' => (int) $booking->student_learning_progress_reports_count,
                    'latest_report' => $latestReport ? [
                        'session_number' => $latestReport->session_number,
                        'material_covered' => $latestReport->material_covered,
                        'progress_percent' => $latestReport->progress_percent,
                        'published_at' => $latestReport->published_at,
                    ] : null,
                ],
            ];
        });

        return response()->json($data);
    }
}
