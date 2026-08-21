<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BookingRequest;
use App\Models\Setting;
use App\Models\TeacherOffer;
use App\Services\PackageCheckoutService;
use App\Services\TeacherMatchingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TeacherOfferController extends Controller
{
    public function index(Request $request, TeacherMatchingService $matchingService)
    {
        $matchingService->expireStaleOffersForTeacher($request->user()->id);
        $validated = $request->validate([
            'scope' => ['nullable', Rule::in(['active', 'history'])],
        ]);
        $scope = $validated['scope'] ?? 'active';
        $statuses = $scope === 'history'
            ? ['accepted', 'rejected', 'expired', 'student_rejected', 'cancelled']
            : ['pending'];

        $offers = TeacherOffer::query()
            ->where('teacher_id', $request->user()->id)
            ->whereIn('status', $statuses)
            ->with([
                'bookingRequest.student',
                'bookingRequest.booking.orders',
                'bookingRequest.packageSubject.package.plan',
                'bookingRequest.packageSubject.sessions',
            ])
            ->latest('offered_at')
            ->paginate(15);

        $commissionPercent = max(
            0,
            min(100, (float) (Setting::where('key', 'admin_fee')->value('value') ?? 20))
        );

        $offers->getCollection()->transform(function (TeacherOffer $offer) use ($commissionPercent) {
            $request = $offer->bookingRequest;
            $effectiveCommission = (float) (
                $request?->booking?->commission_percent
                ?? $commissionPercent
            );
            $canSeeFullAddress = $offer->status === 'accepted'
                && in_array($request?->booking?->status, [
                    'confirmed',
                    'in_progress',
                    'awaiting_student_approval',
                    'disputed',
                    'absence_review',
                    'admin_review_required',
                    'completed',
                ], true);

            if ($request) {
                $perStudentAmount = (float) $request->total_amount;
                $request->setAttribute('source_label', 'Paket Belajar');
                $request->setAttribute('commission_percent', $effectiveCommission);
                $request->setAttribute('amount_per_student', $perStudentAmount);
                $request->setAttribute('gross_amount_minimum', $perStudentAmount);
                $request->setAttribute('gross_amount_if_all_pay', $perStudentAmount);
                $request->setAttribute(
                    'estimated_net_amount',
                    round($perStudentAmount * (100 - $effectiveCommission) / 100)
                );
                if ($request->student && !$canSeeFullAddress) {
                    $request->student->setAttribute('name', 'Murid BimbelKu');
                }
                $request->student?->setVisible(['id', 'name']);
                $request->setHidden(array_values(array_unique([
                    ...$request->getHidden(),
                    'attachment',
                    'phone',
                    'latitude',
                    'longitude',
                ])));
                $request->unsetRelation('booking');
            }

            if (!$canSeeFullAddress && $request) {
                $request->setAttribute('address', null);
                $request->setAttribute('maps_link', null);
                $request->setAttribute('latitude', null);
                $request->setAttribute('longitude', null);
            }

            return $offer;
        });

        return response()->json([
            ...$offers->toArray(),
            'scope' => $scope,
            'active_count' => TeacherOffer::query()
                ->where('teacher_id', $request->user()->id)
                ->where('status', 'pending')
                ->count(),
            'history_count' => TeacherOffer::query()
                ->where('teacher_id', $request->user()->id)
                ->whereIn('status', ['accepted', 'rejected', 'expired', 'student_rejected', 'cancelled'])
                ->count(),
        ]);
    }

    public function accept(
        Request $request,
        TeacherOffer $teacherOffer,
        PackageCheckoutService $packageCheckoutService
    ) {
        abort_unless($teacherOffer->teacher_id === $request->user()->id, 403);

        $teacherOffer->loadMissing('bookingRequest.packageSubject');
        if ($teacherOffer->bookingRequest?->package_subject_id) {
            $result = $packageCheckoutService->acceptPackageOffer($teacherOffer, $request->user());

            return response()->json([
                'message' => $result['package_activated']
                    ? 'Seluruh tutor menerima paket. Jadwal belajar sudah aktif.'
                    : 'Permintaan paket diterima. Sistem masih mencari tutor untuk mapel lain.',
                'data' => $result,
            ]);
        }

        return response()->json([
            'message' => 'Flow penawaran langsung lama sudah dipensiunkan. Muat ulang daftar permintaan.',
        ], 410);
    }

    public function reject(
        Request $request,
        TeacherOffer $teacherOffer,
        TeacherMatchingService $matchingService
    ) {
        abort_unless($teacherOffer->teacher_id === $request->user()->id, 403);

        $validated = $request->validate([
            'reason' => ['required', Rule::in(['too_far', 'schedule', 'material', 'personal', 'other'])],
            'note' => ['nullable', 'string', 'max:500'],
        ]);
        if (
            $validated['reason'] === 'other'
            && mb_strlen(trim((string) ($validated['note'] ?? ''))) < 10
        ) {
            return response()->json([
                'message' => 'Jelaskan alasan lain sedikitnya 10 karakter.',
            ], 422);
        }

        $result = DB::transaction(function () use ($teacherOffer, $validated, $request) {
            $offer = TeacherOffer::query()->lockForUpdate()->findOrFail($teacherOffer->id);
            if ($offer->status !== 'pending') {
                abort(422, 'Penawaran ini sudah diproses.');
            }
            if ($offer->expires_at->isPast()) {
                return ['expired' => true];
            }

            $bookingRequest = $offer->bookingRequest()
                ->lockForUpdate()
                ->firstOrFail();
            if (
                $bookingRequest->status !== 'teacher_pending'
                || (int) $bookingRequest->matched_teacher_id !== (int) $request->user()->id
            ) {
                abort(422, 'Permintaan ini sudah dialihkan atau dibatalkan.');
            }

            $offer->update([
                'status' => 'rejected',
                'responded_at' => now(),
                'rejection_reason' => $validated['reason']
                    .(!empty($validated['note']) ? ': '.$validated['note'] : ''),
            ]);

            BookingRequest::query()
                ->whereKey($bookingRequest->id)
                ->where('status', 'teacher_pending')
                ->where('matched_teacher_id', $request->user()->id)
                ->update([
                    'status' => 'matching',
                    'matched_teacher_id' => null,
                    'teacher_response_deadline' => null,
                ]);

            return ['expired' => false];
        });

        if ($result['expired']) {
            $matchingService->expireOfferAndContinue($teacherOffer);

            return response()->json([
                'message' => 'Batas waktu jawaban sudah berakhir.',
            ], 422);
        }

        $matchingService->dispatchNextOffer($teacherOffer->bookingRequest);

        return response()->json([
            'message' => $validated['reason'] === 'too_far'
                ? 'Permintaan ditolak karena jarak. Poin tidak dikurangi.'
                : 'Permintaan ditolak dan dialihkan kepada tutor berikutnya.',
        ]);
    }
}
