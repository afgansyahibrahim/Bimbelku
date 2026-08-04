<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;

class ClassroomController extends Controller
{
    public function index(Request $request)
    {
        $bookings = Booking::query()
            ->where('teacher_id', $request->user()->id)
            ->whereNotIn('status', ['cancelled', 'student_rejected', 'payment_expired', 'expired'])
            ->with([
                'bookingRequest',
                'participants.student',
                'participants.bookingRequest',
                'participants.order.refund',
                'reports' => fn ($query) => $query->latest(),
                'disputes' => fn ($query) => $query->latest(),
                'sessionAttendances',
                'learningProgressReports',
                'participantAttendances',
                'latestClassroomMessage.sender:id,name',
                'scheduleChangeRequests' => fn ($query) => $query
                    ->where('status', 'pending')
                    ->with('responses')
                    ->latest(),
            ])
            ->latest('start_at')
            ->limit(200)
            ->get();

        $teacherId = (int) $request->user()->id;

        return response()->json($bookings->map(function (Booking $booking) use ($teacherId) {
            $bookingRequest = $booking->bookingRequest;
            $canSeeFullAddress = $booking->learning_mode === 'offline'
                && in_array($booking->status, [
                    'confirmed',
                    'in_progress',
                    'awaiting_student_approval',
                    'disputed',
                    'absence_review',
                    'admin_review_required',
                    'completed',
                ], true);

            return [
                'id' => $booking->id,
                'subject' => $bookingRequest?->subject_name,
                'education_level' => $bookingRequest?->education_level,
                'grade' => $bookingRequest?->grade,
                'chapter' => $bookingRequest?->chapter,
                'subtopic' => $bookingRequest?->subtopic,
                'topic' => $bookingRequest?->topic,
                'learning_goal' => $bookingRequest?->learning_goal,
                'attachment_url' => $bookingRequest?->attachment ? "learning-attachments/{$bookingRequest->id}" : null,
                'method' => $booking->learning_mode,
                'type' => $booking->class_type,
                'status' => $booking->status,
                'start_at' => $booking->start_at,
                'end_at' => $booking->end_at,
                'duration_hours' => $booking->duration_hours,
                'meeting_link' => $booking->meeting_link,
                'address' => $canSeeFullAddress ? $booking->address : null,
                'maps_link' => $canSeeFullAddress ? $booking->maps_link : null,
                'gross_amount' => $booking->gross_amount,
                'teacher_net_amount' => $booking->teacher_net_amount,
                'commission_percent' => $booking->commission_percent,
                'payout_status' => $booking->payout_status,
                'completion_evidence_url' => $booking->completion_evidence
                    ? "bookings/{$booking->id}/completion-evidence"
                    : null,
                'completion_notes' => $booking->completion_notes,
                'completion_capture_source' => $booking->completion_capture_source,
                'completion_captured_at' => $booking->completion_captured_at,
                'objection_deadline' => $booking->objection_deadline,
                $booking->participants->map(function ($participant) use ($booking) {
                    $hasSessionAccess = $participant->order?->status === 'paid';

                    return [
                        'id' => $participant->id,
                        'student_id' => $participant->student_id,
                        'name' => $hasSessionAccess
                            ? $participant->student?->name
                            : 'Murid BimbelKu',
                        'status' => $participant->status,
                        'amount' => $participant->amount,
                        'order_status' => $participant->order?->status,
                        'refund_status' => $participant->order?->refund?->status,
                        'attendance' => optional($booking->participantAttendances
                            ->firstWhere('booking_participant_id', $participant->id))->only([
                                'status', 'notes', 'marked_at',
                            ]),
                    ];
                })->values(),
                'latest_message' => $booking->latestClassroomMessage ? [
                    'body' => $booking->latestClassroomMessage->body,
                    'sender_name' => $booking->latestClassroomMessage->sender?->name,
                    'created_at' => $booking->latestClassroomMessage->created_at,
                    'has_attachment' => (bool) $booking->latestClassroomMessage->attachment_path,
                ] : null,
                'unread_message_count' => $booking->classroomMessages()
                    ->where('sender_id', '!=', $teacherId)
                    ->whereDoesntHave('reads', fn ($query) => $query->where('user_id', $teacherId))
                    ->count(),
                'pending_schedule_change' => $booking->scheduleChangeRequests->first(),
                'latest_report' => $booking->reports->first(),
                'latest_dispute' => $booking->disputes->first(),
                'can_complete' => in_array($booking->status, ['confirmed', 'in_progress'], true)
                    && now()->gte($booking->end_at->copy()->subMinutes(15))
                    && $booking->sessionAttendances
                        ->contains(fn ($attendance) => $attendance->pin_verified_at && $attendance->check_out_at)
                    && $booking->participants
                        ->filter(fn ($participant) => $participant->order?->status === 'paid')
                        ->every(fn ($participant) => $booking->participantAttendances
                            ->contains('booking_participant_id', $participant->id))
                    && $booking->participants
                        ->filter(fn ($participant) => $participant->order?->status === 'paid')
                        ->filter(function ($participant) use ($booking) {
                            $status = $booking->participantAttendances
                                ->firstWhere('booking_participant_id', $participant->id)?->status;
                            return in_array($status, ['present', 'late', 'partial'], true);
                        })
                        ->every(fn ($participant) => $booking->learningProgressReports
                            ->contains('student_id', $participant->student_id)),
                'can_report_absence' => in_array($booking->status, ['confirmed', 'in_progress'], true)
                    && now()->gte($booking->start_at->copy()->addMinutes(15)),
                'can_report_emergency' => !in_array($booking->status, [
                    'completed', 'cancelled', 'refunded', 'emergency_refund_pending',
                ], true),
            ];
        }));
    }

    public function update(Request $request, int $id)
    {
        $booking = Booking::query()
            ->where('teacher_id', $request->user()->id)
            ->findOrFail($id);
        $validated = $request->validate([
            'meeting_link' => ['nullable', 'url:http,https', 'max:500'],
        ]);

        if ($booking->learning_mode !== 'online') {
            return response()->json(['message' => 'Tautan pertemuan hanya tersedia untuk kelas online.'], 422);
        }
        if (!in_array($booking->status, ['confirmed', 'in_progress'], true)) {
            return response()->json([
                'message' => 'Tautan pertemuan hanya dapat diubah setelah pembayaran dikonfirmasi dan sebelum sesi ditutup.',
            ], 422);
        }
        if (!$booking->participants()->whereHas('order', fn ($query) => $query->where('status', 'paid'))->exists()) {
            return response()->json(['message' => 'Belum ada pembayaran yang dikonfirmasi untuk sesi ini.'], 422);
        }
        if (now()->greaterThanOrEqualTo($booking->end_at)) {
            return response()->json(['message' => 'Tautan tidak dapat diubah setelah sesi berakhir.'], 422);
        }

        $booking->update($validated);

        return response()->json([
            'message' => 'Tautan pertemuan berhasil disimpan.',
            'data' => $booking->fresh(),
        ]);
    }
}
