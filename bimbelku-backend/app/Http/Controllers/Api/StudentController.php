<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\LearningPlan;
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
            ->with(['refund', 'cheapClassEnrollment.cheapClass'])
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Tagihan tidak ditemukan.'], 404);
        }

        $cheapEnrollment = $order->cheapClassEnrollment;
        $cheapClass = $cheapEnrollment?->cheapClass;
        $isCheapClass = $order->cheap_class_enrollment_id !== null;
        $canCancel = $isCheapClass
            && $cheapEnrollment
            && $cheapClass?->registration_deadline?->isFuture()
            && in_array($cheapEnrollment->status, ['seat_held', 'payment_rejected'], true)
            && in_array($order->status, ['pending', 'rejected'], true);
        $canResubmit = $isCheapClass
            && $cheapEnrollment?->status === 'payment_rejected'
            && $order->status === 'rejected'
            && $cheapEnrollment?->seat_expires_at?->isFuture()
            && $cheapClass?->registration_deadline?->isFuture()
            && in_array($cheapClass?->status, ['open', 'registration_closed', 'awaiting_verification'], true)
            && $cheapClass->enrollments()->where('status', 'confirmed')->count() < (int) $cheapClass->maximum_participants;
        $cheapClassCancelled = $isCheapClass
            && ($cheapEnrollment?->status === 'cancellation_pending' || $cheapClass?->status === 'cancelled');
        $capacityAlreadyFull = $isCheapClass
            && !$cheapClassCancelled
            && $cheapClass
            && $cheapClass->enrollments()->where('status', 'confirmed')->count() >= (int) $cheapClass->maximum_participants;
        $refundReasonIfAccepted = $cheapClassCancelled
            ? 'class_cancelled'
            : ($capacityAlreadyFull ? 'capacity_full' : null);
        $willRefundIfAccepted = $isCheapClass
            && $order->status === 'submitted'
            && $refundReasonIfAccepted !== null;

        return response()->json([
            'status' => $order->status,
            'id' => $order->id,
            'order_id' => $order->order_id,
            'has_proof' => !empty($order->payment_proof),
            'rejection_reason' => $order->payment_rejection_reason,
            'order_kind' => $isCheapClass ? 'cheap_class' : ($order->learning_package_id ? 'package' : 'booking'),
            'enrollment_status' => $cheapEnrollment?->status,
            'cheap_class_status' => $cheapClass?->status,
            'cheap_class_cancellation_reason' => $cheapClass?->cancellation_reason,
            'can_cancel' => (bool) $canCancel,
            'can_resubmit' => (bool) $canResubmit,
            'will_refund_if_accepted' => (bool) $willRefundIfAccepted,
            'refund_reason_if_accepted' => $order->status === 'submitted' ? $refundReasonIfAccepted : null,
            'wallet_reserved_amount' => (float) $order->wallet_reserved_amount,
            'wallet_applied_amount' => (float) $order->wallet_applied_amount,
            'external_payment_amount' => round(max(0, (float) $order->amount - (float) ($order->status === 'submitted' ? $order->wallet_reserved_amount : $order->wallet_applied_amount)), 2),
            'payment_provider' => $order->payment_provider,
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
                // Relasi latestOfMany memilih laporan terbaru untuk seluruh kelas.
                // Pada kelas kelompok, laporan peserta lain dapat terpilih terlebih
                // dahulu ketika waktu publikasi sama. Data murid harus difilter
                // sebelum urutan terbaru ditentukan.
                'learningProgressReports' => fn ($query) => $query
                    ->where('student_id', $studentId)
                    ->with(['topicLogs.topic'])
                    ->orderByDesc('published_at')
                    ->orderByDesc('id'),
            ])
            ->withCount([
                'learningProgressReports as student_learning_progress_reports_count' => fn ($query) => $query->where('student_id', $studentId),
            ])
            ->latest('start_at')
            ->limit(200)
            ->get();
        $packageSubjectIds = $bookings
            ->map(function (Booking $booking) {
                $participant = $booking->participants->first();
                $learningRequest = $participant?->bookingRequest ?? $booking->bookingRequest;

                return $learningRequest?->package_subject_id;
            })
            ->filter()
            ->unique()
            ->values();
        $sharedPlans = $packageSubjectIds->isEmpty()
            ? collect()
            : LearningPlan::query()
                ->where('student_id', $studentId)
                ->whereIn('package_subject_id', $packageSubjectIds)
                ->latest('id')
                ->get()
                ->unique('package_subject_id')
                ->keyBy('package_subject_id');
        $ratedBookingIds = Rating::query()
            ->where('student_id', $studentId)
            ->whereIn('booking_id', $bookings->pluck('id'))
            ->pluck('booking_id')
            ->flip();

        $data = $bookings->map(function (Booking $booking) use ($ratedBookingIds, $sharedPlans) {
            $participant = $booking->participants->first();
            $learningRequest = $participant?->bookingRequest ?? $booking->bookingRequest;
            $classType = $learningRequest?->class_type ?? $booking->class_type;
            $profile = $booking->teacher?->teacherProfile;
            $hasSessionAccess = $participant?->order?->status === 'paid';
            $isRated = $ratedBookingIds->has($booking->id);
            $latestReport = $booking->learningProgressReports->first();
            $learningPlan = $booking->learningPlan
                ?: $sharedPlans->get($learningRequest?->package_subject_id);
            $needsPlanAcknowledgement = in_array($booking->status, ['confirmed', 'in_progress'], true)
                && $classType !== 'group'
                && $learningPlan
                && !$learningPlan->student_acknowledged_at;
            $canApprove = $booking->status === 'awaiting_student_approval'
                && $participant?->status === 'awaiting_student_approval'
                && !$participant?->approved_at
                && $booking->objection_deadline?->isFuture();
            $attention = $canApprove
                ? [
                    'kind' => 'review',
                    'title' => 'Sesi menunggu keputusanmu',
                    'message' => 'Tutor sudah menyelesaikan sesi. Periksa bukti dan hasil belajar sebelum menyatakan sesi sesuai.',
                    'button_label' => 'Periksa & Konfirmasi',
                    'target_url' => "/student/my-classes?session={$booking->id}&session_action=review",
                ]
                : ($needsPlanAcknowledgement ? [
                    'kind' => 'plan',
                    'title' => 'Target belajar perlu diperiksa',
                    'message' => 'Tutor sudah menyiapkan target belajar. Periksa lalu setujui agar alur sesi dapat dilanjutkan.',
                    'button_label' => 'Periksa Target Belajar',
                    'target_url' => "/student/my-classes?session={$booking->id}&session_action=plan",
                ] : null);

            return [
                'id' => $booking->id,
                'request_id' => $learningRequest?->id,
                'package_subject_id' => $learningRequest?->package_subject_id,
                'title' => ($learningRequest?->subject_name ?? 'Bimbingan')
                    .' • '.($learningRequest?->chapter ?: $learningRequest?->topic ?: 'Sesi belajar'),
                'subject' => $learningRequest?->subject_name ?? 'Bimbingan',
                'education_level' => $learningRequest?->education_level,
                'grade' => $learningRequest?->grade,
                'chapter' => $learningRequest?->chapter,
                'subtopic' => $learningRequest?->subtopic,
                'topic' => $learningRequest?->topic,
                'mentor' => $booking->teacher?->name ?? 'Tutor',
                'mentor_avatar' => \App\Support\PublicMedia::url($profile?->photo),
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
                'can_approve' => $canApprove,
                'can_dispute' => $canApprove,
                'attention' => $attention,
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
                    'progress_percent' => (int) ($learningPlan?->progress_percent ?? 0),
                    'progress_status' => $learningPlan?->status,
                    'report_count' => (int) $booking->student_learning_progress_reports_count,
                    'latest_report' => $latestReport ? [
                        'id' => $latestReport->id,
                        'session_number' => $latestReport->session_number,
                        'material_covered' => $latestReport->material_covered,
                        'mastered_skills' => $latestReport->mastered_skills,
                        'difficulties' => $latestReport->difficulties,
                        'next_exercise' => $latestReport->next_exercise,
                        'notes' => $latestReport->notes,
                        'progress_percent' => $latestReport->progress_percent,
                        'no_material_change' => (bool) $latestReport->no_material_change,
                        'no_change_reason' => $latestReport->no_change_reason,
                        'published_at' => $latestReport->published_at,
                        'topics' => $latestReport->topicLogs->map(fn ($log) => [
                            'topic_id' => $log->package_learning_topic_id,
                            'chapter' => $log->topic?->chapter,
                            'title' => $log->topic?->title,
                            'activity_type' => $log->activity_type,
                            'status_before' => $log->status_before,
                            'status_after' => $log->status_after,
                            'needs_review' => (bool) $log->needs_review_after,
                            'notes' => $log->notes,
                        ])->values(),
                    ] : null,
                ],
            ];
        });

        return response()->json($data);
    }
}
