<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\BookingRequest;
use App\Models\GroupPool;
use App\Models\Notification;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Setting;
use App\Models\TeacherOffer;
use App\Models\TeacherProfile;
use App\Services\HourlyRateService;
use App\Services\PackageCheckoutService;
use App\Services\TeacherMatchingService;
use App\Services\TeacherOfferReleaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TeacherOfferController extends Controller
{
    public function index(Request $request, TeacherMatchingService $matchingService)
    {
        $matchingService->expireStaleOffersForTeacher($request->user()->id);

        $offers = TeacherOffer::query()
            ->where('teacher_id', $request->user()->id)
            ->whereIn('status', ['pending', 'accepted', 'rejected', 'expired', 'student_rejected'])
            ->with([
                'bookingRequest.student',
                'bookingRequest.groupPool.members.bookingRequest',
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
                $activeMemberCount = $request->groupPool?->members
                    ->whereIn('status', ['waiting', 'joined'])
                    ->count() ?? 1;
                $minimumMemberCount = (int) ($request->groupPool?->minimum_participants ?? 1);
                $perStudentAmount = (float) $request->total_amount;
                $minimumGross = $request->class_type === 'group'
                    ? $perStudentAmount * $minimumMemberCount
                    : $perStudentAmount;
                $allMembersGross = $request->class_type === 'group'
                    ? $perStudentAmount * max($minimumMemberCount, $activeMemberCount)
                    : $perStudentAmount;
                $request->setAttribute(
                    'group_member_count',
                    $activeMemberCount
                );
                $request->setAttribute(
                    'attachment_url',
                    $request->attachment ? "/learning-attachments/{$request->id}" : null
                );
                $request->setAttribute('commission_percent', $effectiveCommission);
                $request->setAttribute('amount_per_student', $perStudentAmount);
                $request->setAttribute('gross_amount_minimum', $minimumGross);
                $request->setAttribute('gross_amount_if_all_pay', $allMembersGross);
                $request->setAttribute(
                    'estimated_net_minimum',
                    round($minimumGross * (100 - $effectiveCommission) / 100)
                );
                $request->setAttribute(
                    'estimated_net_if_all_pay',
                    round($allMembersGross * (100 - $effectiveCommission) / 100)
                );
                $request->setAttribute(
                    'estimated_net_amount',
                    round($minimumGross * (100 - $effectiveCommission) / 100)
                );
                $request->setAttribute(
                    'group_learning_requests',
                    $request->class_type === 'group'
                        ? $request->groupPool?->members
                            ->whereIn('status', ['waiting', 'joined'])
                            ->map(function ($member) {
                                $memberRequest = $member->bookingRequest;

                                return $memberRequest ? [
                                    'request_id' => $memberRequest->id,
                                    'chapter' => $memberRequest->chapter,
                                    'subtopic' => $memberRequest->subtopic,
                                    'topic' => $memberRequest->topic,
                                    'learning_goal' => $memberRequest->learning_goal,
                                    'has_attachment' => !empty($memberRequest->attachment),
                                    'attachment_url' => $memberRequest->attachment
                                        ? "/learning-attachments/{$memberRequest->id}"
                                        : null,
                                ] : null;
                            })
                            ->filter()
                            ->values()
                        : collect()
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
                $request->unsetRelation('groupPool');
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

        return response()->json($offers);
    }

    public function accept(
        Request $request,
        TeacherOffer $teacherOffer,
        TeacherMatchingService $matchingService,
        HourlyRateService $rateService,
        TeacherOfferReleaseService $offerReleaseService,
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

        $result = DB::transaction(function () use (
            $teacherOffer,
            $request,
            $matchingService,
            $rateService
        ) {
            $offer = TeacherOffer::query()->lockForUpdate()->findOrFail($teacherOffer->id);
            $requestSnapshot = $offer->bookingRequest()->firstOrFail();
            $groupPool = $requestSnapshot->group_pool_id
                ? GroupPool::query()->lockForUpdate()->findOrFail($requestSnapshot->group_pool_id)
                : null;
            $bookingRequest = BookingRequest::query()
                ->lockForUpdate()
                ->findOrFail($requestSnapshot->id);

            if ($offer->status !== 'pending') {
                return ['error' => 'Penawaran ini sudah diproses.', 'status' => 422];
            }
            if (
                $bookingRequest->status !== 'teacher_pending'
                || (int) $bookingRequest->matched_teacher_id !== (int) $request->user()->id
            ) {
                return ['error' => 'Permintaan ini sudah dialihkan atau dibatalkan.', 'status' => 422];
            }
            if ($bookingRequest->class_type === 'group' && !$groupPool) {
                return ['error' => 'Data kelompok tidak lengkap. Penawaran tidak dapat diterima.', 'status' => 422];
            }
            if ($offer->expires_at->isPast()) {
                return ['error' => 'Batas waktu jawaban sudah berakhir.', 'status' => 422, 'expired' => true];
            }

            $lockedTeacher = \App\Models\User::query()
                ->lockForUpdate()
                ->findOrFail($request->user()->id);
            if ($lockedTeacher->status !== 'active') {
                return ['error' => 'Akun tutor sedang tidak aktif.', 'status' => 422];
            }

            // Mengunci profil membuat dua penawaran pada waktu yang bertabrakan
            // tidak dapat diterima bersamaan dari dua perangkat.
            $profile = TeacherProfile::query()
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->first();
            if (
                !$profile
                || !$profile->verified_at
                || !$profile->is_accepting_requests
                || $profile->points <= 0
            ) {
                return ['error' => 'Profil Anda sedang tidak dapat menerima permintaan.', 'status' => 422];
            }
            if ($profile->suspended_until?->isFuture()) {
                return [
                    'error' => 'Penerimaan murid dibatasi sampai '.$profile->suspended_until->translatedFormat('d M Y, H:i').' WIB.',
                    'status' => 422,
                ];
            }

            $paymentSettings = PaymentSetting::query()
                ->lockForUpdate()
                ->first();
            if (
                !$paymentSettings
                || blank($paymentSettings->bank_name)
                || blank($paymentSettings->account_number)
                || blank($paymentSettings->account_name)
            ) {
                return [
                    'error' => 'Rekening pembayaran belum dikonfigurasi admin. Penawaran dapat diterima setelah rekening tersedia.',
                    'status' => 503,
                ];
            }

            $profile->setRelation('user', $lockedTeacher);
            $compatibilityError = $matchingService->compatibilityError($profile, $bookingRequest);
            if ($compatibilityError) {
                return ['error' => $compatibilityError, 'status' => 422];
            }

            $startAt = $matchingService->startAt($bookingRequest);
            $endAt = $matchingService->endAt($bookingRequest);
            if ($matchingService->teacherHasConflict($lockedTeacher->id, $startAt, $endAt)) {
                return ['error' => 'Jadwal bertabrakan dengan kelas lain.', 'status' => 422];
            }

            $hourlyRate = $bookingRequest->hourly_rate !== null
                ? (int) round((float) $bookingRequest->hourly_rate)
                : $rateService->resolve(
                    $bookingRequest->subject_name,
                    $bookingRequest->education_level,
                    $bookingRequest->class_type,
                    $bookingRequest->learning_mode
                );
            $perStudentAmount = $hourlyRate * $bookingRequest->duration_hours;
            $commissionPercent = (float) (Setting::where('key', 'admin_fee')->value('value') ?? 20);
            $paymentWindow = max(
                10,
                (int) (Setting::where('key', 'payment_window_minutes')->value('value') ?? 30)
            );
            $paymentDueAt = now()->addMinutes($paymentWindow)->min($startAt);
            if ($paymentDueAt->lessThanOrEqualTo(now())) {
                return ['error' => 'Jadwal kelas sudah dimulai. Penawaran tidak dapat diterima.', 'status' => 422];
            }

            $memberRequests = $bookingRequest->class_type === 'group'
                ? BookingRequest::query()
                    ->where('group_pool_id', $bookingRequest->group_pool_id)
                    ->whereIn('status', ['matching', 'teacher_pending'])
                    ->lockForUpdate()
                    ->get()
                : collect([$bookingRequest]);

            if (
                $bookingRequest->class_type === 'group'
                && $memberRequests->count() < (int) $groupPool?->minimum_participants
            ) {
                return ['error' => 'Jumlah anggota kelompok belum memenuhi batas minimum.', 'status' => 422];
            }

            $booking = Booking::updateOrCreate(
                ['booking_request_id' => $bookingRequest->id],
                [
                    'student_id' => $bookingRequest->student_id,
                    'teacher_id' => $lockedTeacher->id,
                    'group_pool_id' => $bookingRequest->group_pool_id,
                    'start_at' => $startAt,
                    'end_at' => $endAt,
                    'duration_hours' => $bookingRequest->duration_hours,
                    'learning_mode' => $bookingRequest->learning_mode,
                    'class_type' => $bookingRequest->class_type,
                    'hourly_rate' => $hourlyRate,
                    'total_amount' => $perStudentAmount,
                    // Pendapatan baru diakui setelah bukti transfer peserta
                    // diverifikasi admin.
                    'gross_amount' => 0,
                    'teacher_net_amount' => 0,
                    'commission_percent' => $commissionPercent,
                    'status' => $bookingRequest->class_type === 'group'
                        ? 'payment_collecting'
                        : 'awaiting_payment',
                    'payment_due_at' => $paymentDueAt,
                    'address' => $groupPool?->address ?? $bookingRequest->address,
                    'maps_link' => $groupPool?->maps_link ?? $bookingRequest->maps_link,
                    'completion_evidence' => null,
                    'completion_notes' => null,
                    'completion_submitted_at' => null,
                    'objection_deadline' => null,
                    'student_approved_at' => null,
                    'completed_at' => null,
                    'payout_status' => 'locked',
                ]
            );

            $booking->participants()->update(['status' => 'cancelled']);
            $firstOrder = null;

            foreach ($memberRequests as $memberRequest) {
                $participant = BookingParticipant::updateOrCreate(
                    [
                        'booking_id' => $booking->id,
                        'student_id' => $memberRequest->student_id,
                    ],
                    [
                        'booking_request_id' => $memberRequest->id,
                        'amount' => $perStudentAmount,
                        'status' => 'awaiting_payment',
                        'approved_at' => null,
                    ]
                );

                $snapshot = [
                    'flow_version' => 3,
                    'booking_id' => $booking->id,
                    'booking_request_id' => $memberRequest->id,
                    'teacher_id' => $lockedTeacher->id,
                    'teacher_name' => $lockedTeacher->name,
                    'student_name' => $memberRequest->student->name,
                    'subject' => $memberRequest->subject_name,
                    'education_level' => $memberRequest->education_level,
                    'grade' => $memberRequest->grade,
                    'chapter' => $memberRequest->chapter,
                    'subtopic' => $memberRequest->subtopic,
                    'topic' => $memberRequest->topic,
                    'type' => $memberRequest->class_type === 'private' ? 'Privat' : 'Kelompok',
                    'method' => $memberRequest->learning_mode,
                    'start_at' => $startAt->toIso8601String(),
                    'end_at' => $endAt->toIso8601String(),
                    'duration_hours' => $memberRequest->duration_hours,
                    'hourly_rate' => $hourlyRate,
                    'admin_fee_percent' => $commissionPercent,
                ];

                $order = Order::create([
                    'user_id' => $memberRequest->student_id,
                    'classroom_id' => null,
                    'booking_id' => $booking->id,
                    'amount' => $perStudentAmount,
                    'status' => 'pending',
                    'class_details_snapshot' => $snapshot,
                    'order_id' => 'INV-'.now()->format('YmdHis').'-'.$memberRequest->id.'-'.random_int(10, 99),
                ]);

                $participant->update(['order_id' => $order->id]);
                $firstOrder ??= $order;
                $memberRequest->update([
                    'booking_id' => $booking->id,
                    'status' => 'awaiting_payment',
                    'matched_teacher_id' => $lockedTeacher->id,
                    'teacher_decision_deadline' => null,
                    'payment_due_at' => $paymentDueAt,
                    'hourly_rate' => $hourlyRate,
                    'total_amount' => $perStudentAmount,
                ]);

                Notification::create([
                    'user_id' => $memberRequest->student_id,
                    'title' => 'Tutor menerima permintaan',
                    'message' => "{$lockedTeacher->name} menerima permintaan. Tagihan sudah tersedia sampai {$paymentDueAt->translatedFormat('H:i')} WIB.",
                    'type' => 'success',
                ]);
            }

            $booking->update(['order_id' => $firstOrder?->id]);
            $offer->update(['status' => 'accepted', 'responded_at' => now()]);
            $bookingRequest->offers()->whereKeyNot($offer->id)->where('status', 'pending')->update([
                'status' => 'cancelled',
                'responded_at' => now(),
            ]);
            $profile->update([
                'no_response_streak' => 0,
                'no_response_window_started_at' => null,
            ]);

            if ($groupPool) {
                $groupPool->update([
                    'teacher_id' => $lockedTeacher->id,
                    'status' => 'payment_collecting',
                ]);
            }

            return [
                'booking' => $booking->fresh(['participants.order']),
                'payment_due_at' => $paymentDueAt,
            ];
        });

        if (isset($result['expired'])) {
            $matchingService->expireOfferAndContinue($teacherOffer);
        }
        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['status']);
        }

        $acceptedBooking = $result['booking'];
        $offerReleaseService
            ->releaseConflictingForTeacher(
                $request->user()->id,
                $acceptedBooking->start_at,
                $acceptedBooking->end_at,
                $teacherOffer->id,
                'Jadwal bentrok setelah tutor menerima sesi lain'
            )
            ->each(fn (BookingRequest $releasedRequest) => $matchingService
                ->dispatchNextOffer($releasedRequest));

        return response()->json([
            'message' => 'Permintaan diterima. Tagihan murid sudah dibuka.',
            'data' => $result,
        ]);
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

            $requestIds = collect([$bookingRequest->id]);
            if ($bookingRequest->group_pool_id) {
                $requestIds = $bookingRequest->groupPool?->members()
                    ->whereIn('status', ['waiting', 'joined'])
                    ->pluck('booking_request_id') ?? $requestIds;
            }
            BookingRequest::query()
                ->whereIn('id', $requestIds)
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
