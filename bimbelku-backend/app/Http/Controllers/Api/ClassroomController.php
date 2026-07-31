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
            ])
            ->latest('start_at')
            ->limit(200)
            ->get();

        return response()->json($bookings->map(function (Booking $booking) {
            $request = $booking->bookingRequest;
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
                'subject' => $request?->subject_name,
                'education_level' => $request?->education_level,
                'grade' => $request?->grade,
                'chapter' => $request?->chapter,
                'subtopic' => $request?->subtopic,
                'topic' => $request?->topic,
                'learning_goal' => $request?->learning_goal,
                'attachment_url' => $request?->attachment ? "learning-attachments/{$request->id}" : null,
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
                'objection_deadline' => $booking->objection_deadline,
                'participants' => $booking->participants->map(function ($participant) {
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
                    ];
                })->values(),
                'latest_report' => $booking->reports->first(),
                'latest_dispute' => $booking->disputes->first(),
                'can_complete' => in_array($booking->status, ['confirmed', 'in_progress'], true)
                    && now()->gte($booking->end_at->copy()->subMinutes(15))
                    && (
                        $booking->class_type !== 'private'
                        || (
                            $booking->sessionAttendances
                                ->contains(fn ($attendance) => $attendance->pin_verified_at && $attendance->check_out_at)
                            && $booking->learningProgressReports->isNotEmpty()
                        )
                    ),
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
