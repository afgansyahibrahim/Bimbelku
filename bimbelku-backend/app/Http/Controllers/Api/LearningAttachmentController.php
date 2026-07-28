<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BookingRequest;
use App\Models\TeacherOffer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LearningAttachmentController extends Controller
{
    public function show(Request $request, BookingRequest $bookingRequest)
    {
        $user = $request->user();
        $offerRequestIds = $bookingRequest->group_pool_id
            ? $bookingRequest->groupPool?->members()
                ->whereIn('status', ['waiting', 'joined'])
                ->pluck('booking_request_id') ?? collect([$bookingRequest->id])
            : collect([$bookingRequest->id]);
        $teacherHasOffer = $user->role === 'teacher'
            && TeacherOffer::query()
                ->whereIn('booking_request_id', $offerRequestIds)
                ->where('teacher_id', $user->id)
                ->whereIn('status', ['pending', 'accepted'])
                ->exists();
        $allowed = $user->role === 'admin'
            || (int) $bookingRequest->student_id === (int) $user->id
            || (
                $user->role === 'teacher'
                && (int) $bookingRequest->matched_teacher_id === (int) $user->id
                && in_array($bookingRequest->status, [
                    'teacher_pending',
                    'teacher_selected',
                    'teacher_accepted_waiting_group',
                    'awaiting_payment',
                    'payment_submitted',
                    'payment_rejected',
                    'payment_verified',
                    'confirmed',
                    'in_progress',
                    'awaiting_student_approval',
                    'completed',
                    'disputed',
                    'absence_review',
                    'teacher_absence_review',
                    'admin_review_required',
                ], true)
                && $teacherHasOffer
            );

        abort_unless($allowed, 403);
        abort_unless($bookingRequest->attachment, 404);

        $headers = [
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline; filename="'.basename($bookingRequest->attachment).'"',
        ];

        if (Storage::disk('local')->exists($bookingRequest->attachment)) {
            return Storage::disk('local')->response($bookingRequest->attachment, null, $headers);
        }

        abort(404);
    }
}
