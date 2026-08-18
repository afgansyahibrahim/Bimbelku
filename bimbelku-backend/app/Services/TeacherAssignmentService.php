<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\BookingRequest;
use App\Models\GroupPool;
use App\Models\MatchingOperationLog;
use App\Models\Notification;
use App\Models\Order;
use App\Models\PackageSession;
use App\Models\PaymentSetting;
use App\Models\Setting;
use App\Models\TeacherOffer;
use App\Models\TeacherProfile;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TeacherAssignmentService
{
    public function __construct(
        private readonly TeacherMatchingService $matchingService,
        private readonly HourlyRateService $rateService,
        private readonly TeacherOfferReleaseService $offerReleaseService,
        private readonly PackageCheckoutService $packageCheckoutService,
    ) {
    }

    public function candidateSummaries(BookingRequest $bookingRequest, string $search = ''): Collection
    {
        $search = mb_strtolower(trim($search));
        $bookingRequest->loadMissing([
            'packageSubject.sessions',
            'offers',
        ]);

        return $this->matchingService
            ->eligibleCandidates($bookingRequest)
            ->filter(fn (User $teacher) => $this->eligibilityError($teacher, $bookingRequest) === null)
            ->filter(function (User $teacher) use ($search) {
                if ($search === '') {
                    return true;
                }

                return str_contains(mb_strtolower($teacher->name), $search)
                    || str_contains(mb_strtolower((string) $teacher->email), $search);
            })
            ->take(50)
            ->map(function (User $teacher) use ($bookingRequest) {
                $profile = $teacher->teacherProfile;
                $previousOffer = $bookingRequest->offers
                    ->where('teacher_id', $teacher->id)
                    ->sortByDesc('offered_at')
                    ->first();

                return [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'points' => (int) ($profile?->points ?? 0),
                    'distance_km' => isset($teacher->match_distance_km)
                        ? round((float) $teacher->match_distance_km, 2)
                        : null,
                    'max_travel_km' => $profile?->max_travel_km,
                    'previous_offer' => $previousOffer ? [
                        'status' => $previousOffer->status,
                        'responded_at' => $previousOffer->responded_at?->toIso8601String(),
                        'rejection_reason' => $previousOffer->rejection_reason,
                    ] : null,
                ];
            })
            ->values();
    }

    public function eligibilityError(User $teacher, BookingRequest $bookingRequest): ?string
    {
        if ($teacher->role !== 'teacher' || $teacher->status !== 'active') {
            return 'Akun yang dipilih bukan tutor aktif.';
        }

        $teacher->loadMissing(['teacherProfile.subjects', 'availabilities']);
        $profile = $teacher->teacherProfile;
        if (!$profile?->verified_at) {
            return 'Tutor belum lolos verifikasi.';
        }
        if (!$profile->is_accepting_requests) {
            return 'Tutor sedang tidak menerima permintaan.';
        }
        if ((int) $profile->points <= 0) {
            return 'Poin tutor tidak memenuhi syarat untuk menerima murid.';
        }
        if ($profile->suspended_until?->isFuture()) {
            return 'Tutor sedang dibatasi sampai '.$profile->suspended_until->translatedFormat('d M Y, H:i').' WIB.';
        }

        $profile->setRelation('user', $teacher);
        if ($error = $this->matchingService->compatibilityError($profile, $bookingRequest)) {
            return $error;
        }

        if ($bookingRequest->package_subject_id) {
            $bookingRequest->loadMissing('packageSubject.sessions');
            foreach ($bookingRequest->packageSubject?->sessions ?? collect() as $session) {
                if ($this->matchingService->teacherHasConflict(
                    $teacher->id,
                    $session->scheduled_start_at,
                    $session->scheduled_end_at
                )) {
                    return 'Salah satu jadwal paket bertabrakan dengan kelas tutor.';
                }
                if ($this->teacherHasPackageConflict(
                    $teacher->id,
                    $session->scheduled_start_at,
                    $session->scheduled_end_at,
                    $bookingRequest->package_subject_id
                )) {
                    return 'Salah satu jadwal paket bertabrakan dengan paket lain yang ditangani tutor.';
                }
                if (!$this->teacherAvailableAt(
                    $teacher,
                    $session->scheduled_start_at,
                    $session->scheduled_end_at
                )) {
                    return 'Salah satu jadwal paket berada di luar jam tersedia tutor.';
                }
            }

            return null;
        }

        if ($this->matchingService->teacherHasConflict(
            $teacher->id,
            $this->matchingService->startAt($bookingRequest),
            $this->matchingService->endAt($bookingRequest)
        )) {
            return 'Jadwal tutor bertabrakan dengan kelas lain.';
        }

        return null;
    }

    public function assignManually(
        BookingRequest $bookingRequest,
        User $teacher,
        User $admin,
        string $reason
    ): array {
        return DB::transaction(function () use ($bookingRequest, $teacher, $admin, $reason) {
            $lockedRequest = BookingRequest::query()
                ->with([
                    'groupPool.members',
                    'packageSubject.package',
                    'packageSubject.sessions',
                    'offers',
                ])
                ->lockForUpdate()
                ->findOrFail($bookingRequest->id);

            abort_unless(
                in_array($lockedRequest->status, ['matching', 'teacher_pending', 'no_teacher'], true),
                422,
                'Permintaan ini tidak lagi menunggu tutor.'
            );
            abort_if(
                $this->matchingService->startAt($lockedRequest)->lte(now()),
                422,
                'Jadwal kelas sudah dimulai atau terlewati.'
            );
            abort_if(
                $error = $this->eligibilityError($teacher, $lockedRequest),
                422,
                $error
            );

            $requestIds = $this->activeRequestIds($lockedRequest);
            $beforeState = [
                'status' => $lockedRequest->status,
                'matched_teacher_id' => $lockedRequest->matched_teacher_id,
                'search_radius_km' => (int) $lockedRequest->search_radius_km,
                'pending_offer_teacher_ids' => TeacherOffer::query()
                    ->whereIn('booking_request_id', $requestIds)
                    ->where('status', 'pending')
                    ->pluck('teacher_id')
                    ->values()
                    ->all(),
            ];

            TeacherOffer::query()
                ->whereIn('booking_request_id', $requestIds)
                ->where('status', 'pending')
                ->update([
                    'status' => 'cancelled',
                    'responded_at' => now(),
                ]);

            $expiresAt = now()->addMinutes(10)
                ->min($this->matchingService->startAt($lockedRequest));
            abort_if($expiresAt->lte(now()), 422, 'Waktu penetapan tutor sudah tidak mencukupi.');

            $manualDistance = null;
            if (
                $lockedRequest->learning_mode === 'offline'
                && $lockedRequest->latitude !== null
                && $lockedRequest->longitude !== null
                && $teacher->teacherProfile?->latitude !== null
                && $teacher->teacherProfile?->longitude !== null
            ) {
                $manualDistance = $this->distanceKm(
                    (float) $lockedRequest->latitude,
                    (float) $lockedRequest->longitude,
                    (float) $teacher->teacherProfile->latitude,
                    (float) $teacher->teacherProfile->longitude,
                );
            }

            $manualOffer = TeacherOffer::create([
                'booking_request_id' => $lockedRequest->id,
                'teacher_id' => $teacher->id,
                'status' => 'pending',
                'distance_km' => $manualDistance,
                'offered_at' => now(),
                'expires_at' => $expiresAt,
            ]);

            BookingRequest::query()
                ->whereIn('id', $requestIds)
                ->whereIn('status', ['matching', 'teacher_pending', 'no_teacher'])
                ->update([
                    'status' => 'teacher_pending',
                    'matched_teacher_id' => $teacher->id,
                    'teacher_response_deadline' => $expiresAt,
                    'matching_attempts' => DB::raw('matching_attempts + 1'),
                ]);

            if ($lockedRequest->package_subject_id) {
                $lockedRequest->packageSubject?->update(['status' => 'teacher_pending']);
                $lockedRequest->packageSubject?->package?->update(['status' => 'teacher_pending']);
            }

            $assignment = $this->acceptOffer($manualOffer, $teacher);
            $freshRequest = $lockedRequest->fresh();

            MatchingOperationLog::create([
                'booking_request_id' => $lockedRequest->id,
                'actor_id' => $admin->id,
                'action' => 'teacher_assigned_manually',
                'reason' => trim($reason),
                'before_state' => $beforeState,
                'after_state' => [
                    'status' => $freshRequest->status,
                    'matched_teacher_id' => $teacher->id,
                    'booking_id' => $freshRequest->booking_id,
                ],
                'metadata' => [
                    'teacher_id' => $teacher->id,
                    'teacher_name' => $teacher->name,
                    'manual_offer_id' => $manualOffer->id,
                    'affected_request_ids' => $requestIds->values()->all(),
                    'source_type' => $lockedRequest->package_subject_id
                        ? 'package'
                        : ($lockedRequest->group_pool_id ? 'group' : 'single'),
                ],
            ]);

            Notification::create([
                'user_id' => $teacher->id,
                'title' => 'Penetapan kelas oleh admin',
                'message' => "Admin menetapkan Anda untuk {$lockedRequest->subject_name}. Buka jadwal dan ruang kelas untuk memeriksa detail.",
                'type' => 'info',
                'target_url' => '/guru/kelas',
            ]);

            return [
                'assignment' => $assignment,
                'booking_request' => $freshRequest,
            ];
        }, 3);
    }

    public function acceptOffer(TeacherOffer $teacherOffer, User $teacher): array
    {
        $teacherOffer->loadMissing('bookingRequest.packageSubject');
        if ($teacherOffer->bookingRequest?->package_subject_id) {
            return [
                'type' => 'package',
                'data' => $this->packageCheckoutService->acceptPackageOffer($teacherOffer, $teacher),
            ];
        }

        $result = DB::transaction(function () use ($teacherOffer, $teacher) {
            $offer = TeacherOffer::query()->lockForUpdate()->findOrFail($teacherOffer->id);
            $requestSnapshot = $offer->bookingRequest()->firstOrFail();
            $groupPool = $requestSnapshot->group_pool_id
                ? GroupPool::query()->lockForUpdate()->findOrFail($requestSnapshot->group_pool_id)
                : null;
            $bookingRequest = BookingRequest::query()
                ->with('student')
                ->lockForUpdate()
                ->findOrFail($requestSnapshot->id);

            abort_unless($offer->status === 'pending', 422, 'Penawaran ini sudah diproses.');
            abort_unless(
                $bookingRequest->status === 'teacher_pending'
                    && (int) $bookingRequest->matched_teacher_id === (int) $teacher->id,
                422,
                'Permintaan ini sudah dialihkan atau dibatalkan.'
            );
            abort_if($bookingRequest->class_type === 'group' && !$groupPool, 422, 'Data kelompok tidak lengkap.');
            abort_if($offer->expires_at->isPast(), 422, 'Batas waktu jawaban sudah berakhir.');

            $lockedTeacher = User::query()->lockForUpdate()->findOrFail($teacher->id);
            abort_unless($lockedTeacher->status === 'active', 422, 'Akun tutor sedang tidak aktif.');

            $profile = TeacherProfile::query()
                ->where('user_id', $teacher->id)
                ->lockForUpdate()
                ->first();
            abort_unless(
                $profile
                    && $profile->verified_at
                    && $profile->is_accepting_requests
                    && $profile->points > 0,
                422,
                'Profil tutor sedang tidak dapat menerima permintaan.'
            );
            if ($profile->suspended_until?->isFuture()) {
                abort(
                    422,
                    'Penerimaan murid dibatasi sampai '
                        .$profile->suspended_until->translatedFormat('d M Y, H:i')
                        .' WIB.'
                );
            }

            $paymentSettings = PaymentSetting::query()->lockForUpdate()->first();
            abort_unless(
                $paymentSettings
                    && filled($paymentSettings->bank_name)
                    && filled($paymentSettings->account_number)
                    && filled($paymentSettings->account_name),
                503,
                'Rekening pembayaran belum dikonfigurasi admin.'
            );

            $profile->setRelation('user', $lockedTeacher);
            abort_if(
                $error = $this->matchingService->compatibilityError($profile, $bookingRequest),
                422,
                $error
            );

            $startAt = $this->matchingService->startAt($bookingRequest);
            $endAt = $this->matchingService->endAt($bookingRequest);
            abort_if(
                $this->matchingService->teacherHasConflict($lockedTeacher->id, $startAt, $endAt),
                422,
                'Jadwal bertabrakan dengan kelas lain.'
            );

            $hourlyRate = $bookingRequest->hourly_rate !== null
                ? (int) round((float) $bookingRequest->hourly_rate)
                : $this->rateService->resolve(
                    $bookingRequest->subject_name,
                    $bookingRequest->education_level,
                    $bookingRequest->class_type,
                    $bookingRequest->learning_mode
                );
            $perStudentAmount = $hourlyRate * $bookingRequest->duration_hours;
            $commissionPercent = (float) (Setting::where('key', 'admin_fee')->value('value') ?? 20);
            $paymentWindow = max(10, (int) (Setting::where('key', 'payment_window_minutes')->value('value') ?? 30));
            $paymentDueAt = now()->addMinutes($paymentWindow)->min($startAt);
            abort_if($paymentDueAt->lte(now()), 422, 'Jadwal kelas sudah dimulai.');

            $memberRequests = $bookingRequest->class_type === 'group'
                ? BookingRequest::query()
                    ->where('group_pool_id', $bookingRequest->group_pool_id)
                    ->whereIn('status', ['matching', 'teacher_pending'])
                    ->with('student')
                    ->lockForUpdate()
                    ->get()
                : collect([$bookingRequest]);

            abort_if(
                $bookingRequest->class_type === 'group'
                    && $memberRequests->count() < (int) $groupPool?->minimum_participants,
                422,
                'Jumlah anggota kelompok belum memenuhi batas minimum.'
            );

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
                    'gross_amount' => 0,
                    'teacher_net_amount' => 0,
                    'commission_percent' => $commissionPercent,
                    'status' => $bookingRequest->class_type === 'group' ? 'payment_collecting' : 'awaiting_payment',
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
                    ['booking_id' => $booking->id, 'student_id' => $memberRequest->student_id],
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
                    'student_name' => $memberRequest->student?->name ?? 'Murid',
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
                    'target_url' => '/student/packages',
                ]);
            }

            $booking->update(['order_id' => $firstOrder?->id]);
            $offer->update(['status' => 'accepted', 'responded_at' => now()]);
            $bookingRequest->offers()->whereKeyNot($offer->id)->where('status', 'pending')->update([
                'status' => 'cancelled',
                'responded_at' => now(),
            ]);
            $profile->update(['no_response_streak' => 0, 'no_response_window_started_at' => null]);

            if ($groupPool) {
                $groupPool->update(['teacher_id' => $lockedTeacher->id, 'status' => 'payment_collecting']);
            }

            return ['booking' => $booking->fresh(['participants.order']), 'payment_due_at' => $paymentDueAt];
        }, 3);

        $acceptedBooking = $result['booking'];
        $this->offerReleaseService
            ->releaseConflictingForTeacher(
                $teacher->id,
                $acceptedBooking->start_at,
                $acceptedBooking->end_at,
                $teacherOffer->id,
                'Jadwal bentrok setelah tutor menerima sesi lain'
            )
            ->each(fn (BookingRequest $releasedRequest) => $this->matchingService->dispatchNextOffer($releasedRequest));

        return ['type' => 'single', 'data' => $result];
    }

    private function teacherHasPackageConflict(
        int $teacherId,
        Carbon $start,
        Carbon $end,
        ?int $ignoreSubjectId = null
    ): bool {
        return PackageSession::query()
            ->whereHas('subject', fn ($subjects) => $subjects
                ->where('assigned_teacher_id', $teacherId)
                ->when($ignoreSubjectId, fn ($query) => $query->whereKeyNot($ignoreSubjectId))
                ->whereHas('package', fn ($packages) => $packages
                    ->whereIn('status', [
                        'matching',
                        'teacher_pending',
                        'no_teacher',
                        'awaiting_payment',
                        'payment_rejected',
                        'payment_submitted',
                        'active',
                    ])))
            ->where('scheduled_start_at', '<', $end)
            ->where('scheduled_end_at', '>', $start)
            ->exists();
    }

    private function teacherAvailableAt(User $teacher, Carbon $start, Carbon $end): bool
    {
        return $this->matchingService->teacherAvailableAt($teacher, $start, $end);
    }

    private function distanceKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371;
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);
        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lonDelta / 2) ** 2;

        return round($earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a)), 2);
    }

    private function activeRequestIds(BookingRequest $bookingRequest): Collection
    {
        if (!$bookingRequest->group_pool_id) {
            return collect([$bookingRequest->id]);
        }

        $ids = $bookingRequest->groupPool?->members()
            ->whereIn('status', ['waiting', 'joined'])
            ->pluck('booking_request_id') ?? collect();

        return $ids->isNotEmpty() ? $ids : collect([$bookingRequest->id]);
    }
}
