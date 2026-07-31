<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingRequest;
use App\Models\Notification;
use App\Models\Setting;
use App\Models\TeacherOffer;
use App\Models\TeacherProfile;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TeacherMatchingService
{
    private const ACTIVE_BOOKING_STATUSES = [
        'teacher_selected',
        'awaiting_payment',
        'payment_collecting',
        'payment_submitted',
        'confirmed',
        'in_progress',
        'awaiting_student_approval',
        'disputed',
        'absence_review',
    ];

    public function __construct(private readonly TeacherPointService $pointService)
    {
    }

    public function dispatchNextOffer(BookingRequest $bookingRequest): ?TeacherOffer
    {
        $bookingRequest->refresh();
        if ($bookingRequest->group_pool_id) {
            // Semua anggota kelompok memakai satu permintaan jangkar supaya
            // scheduler dan polling anggota tidak membuat penawaran ganda.
            $bookingRequest = BookingRequest::query()
                ->where('group_pool_id', $bookingRequest->group_pool_id)
                ->whereHas('groupMember', fn ($query) => $query->whereIn('status', ['waiting', 'joined']))
                ->whereIn('status', ['matching', 'teacher_pending', 'no_teacher'])
                ->orderByRaw(
                    'CASE WHEN student_id = ? THEN 0 ELSE 1 END',
                    [(int) ($bookingRequest->groupPool?->created_by ?? 0)]
                )
                ->oldest('id')
                ->first();
            if (!$bookingRequest) {
                return null;
            }
        }

        if (!in_array($bookingRequest->status, ['matching', 'teacher_pending', 'no_teacher'], true)) {
            return null;
        }

        if ($bookingRequest->class_type === 'group' && $bookingRequest->groupPool?->status === 'forming') {
            return null;
        }

        $bookingRequest->offers()
            ->where('status', 'pending')
            ->where('expires_at', '<=', now())
            ->get()
            ->each(fn (TeacherOffer $offer) => $this->expireOfferAndContinue($offer, false));

        $activeOffer = $bookingRequest->offers()
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->latest('offered_at')
            ->first();

        if ($activeOffer) {
            return $activeOffer;
        }

        $startAt = $this->startAt($bookingRequest);
        // Tahap 5 mengizinkan kelas mendadak. Penawaran dapat diterima sampai
        // waktu mulai, sedangkan tenggat pembayaran mengikuti sisa waktu nyata.
        $acceptanceCutoff = $startAt->copy();
        $maximumSearchDeadline = $bookingRequest->search_expires_at
            ?? $bookingRequest->search_started_at?->copy()->addHours($this->maximumSearchHours())
            ?? now()->addHours($this->maximumSearchHours());

        if (now()->greaterThanOrEqualTo($acceptanceCutoff) || now()->greaterThanOrEqualTo($maximumSearchDeadline)) {
            $this->updateRequestGroup($bookingRequest, [
                'status' => 'expired',
                'teacher_response_deadline' => null,
            ]);
            return null;
        }

        $endAt = $this->endAt($bookingRequest);
        $offerRequestIds = $bookingRequest->group_pool_id
            ? $bookingRequest->groupPool->members()->pluck('booking_request_id')
            : collect([$bookingRequest->id]);
        $alreadyOffered = TeacherOffer::query()
            ->whereIn('booking_request_id', $offerRequestIds)
            ->pluck('teacher_id');
        $candidates = $this->candidateQuery($bookingRequest, $alreadyOffered, $startAt, $endAt)
            ->limit(500)
            ->get();
        $candidate = $this->rankCandidates($bookingRequest, $candidates)->first();

        if (!$candidate) {
            $this->updateRequestGroup($bookingRequest, [
                'status' => 'no_teacher',
                'matched_teacher_id' => null,
                'teacher_response_deadline' => null,
            ]);

            Notification::create([
                'user_id' => $bookingRequest->student_id,
                'title' => 'Tutor belum ditemukan',
                'message' => $bookingRequest->learning_mode === 'offline' && $bookingRequest->search_radius_km < 12
                    ? "Belum ada tutor dalam radius {$bookingRequest->search_radius_km} km. Radius dapat diperluas dari halaman pencarian."
                    : 'Belum ada tutor yang cocok. Jadwal, materi, atau mode belajar dapat diubah.',
                'type' => 'warning',
            ]);

            return null;
        }

        $configuredDeadline = now()->addHours($this->teacherResponseHours());
        $expiresAt = $configuredDeadline->min($acceptanceCutoff)->min($maximumSearchDeadline);

        $offerResult = DB::transaction(function () use (
            $bookingRequest,
            $candidate,
            $expiresAt
        ) {
            $lockedRequest = BookingRequest::query()
                ->lockForUpdate()
                ->findOrFail($bookingRequest->id);
            if (!in_array($lockedRequest->status, ['matching', 'teacher_pending', 'no_teacher'], true)) {
                return ['offer' => null, 'created' => false];
            }

            $existing = $lockedRequest->offers()
                ->where('status', 'pending')
                ->where('expires_at', '>', now())
                ->latest('offered_at')
                ->first();
            if ($existing) {
                return ['offer' => $existing, 'created' => false];
            }

            $offer = TeacherOffer::create([
                'booking_request_id' => $lockedRequest->id,
                'teacher_id' => $candidate->id,
                'status' => 'pending',
                'distance_km' => $candidate->match_distance_km,
                'offered_at' => now(),
                'expires_at' => $expiresAt,
            ]);

            $this->updateRequestGroup($lockedRequest, [
                'status' => 'teacher_pending',
                'matched_teacher_id' => $candidate->id,
                'teacher_response_deadline' => $expiresAt,
            ], incrementAttempts: true);

            return ['offer' => $offer, 'created' => true];
        });

        $offer = $offerResult['offer'];
        if (!$offer || !$offerResult['created']) {
            return $offer;
        }

        Notification::create([
            'user_id' => $candidate->id,
            'title' => 'Permintaan bimbel baru',
            'message' => "Permintaan {$bookingRequest->subject_name} menunggu jawaban sampai {$expiresAt->translatedFormat('d M Y, H:i')} WIB.",
            'type' => 'info',
        ]);

        return $offer;
    }

    public function expireOfferAndContinue(TeacherOffer $offer, bool $continue = true): void
    {
        $expiredOffer = DB::transaction(function () use ($offer) {
            $lockedOffer = TeacherOffer::query()
                ->lockForUpdate()
                ->find($offer->id);

            if (!$lockedOffer || $lockedOffer->status !== 'pending') {
                return null;
            }

            $lockedOffer->update([
                'status' => 'expired',
                'responded_at' => now(),
                'no_response_penalty_applied' => true,
            ]);

            return $lockedOffer;
        });

        if (!$expiredOffer) {
            return;
        }

        $this->applyNoResponseRestriction($expiredOffer);

        $bookingRequest = $expiredOffer->bookingRequest;
        if (!$bookingRequest || !in_array($bookingRequest->status, ['teacher_pending', 'matching'], true)) {
            return;
        }

        $this->updateRequestGroup($bookingRequest, [
            'status' => 'matching',
            'matched_teacher_id' => null,
            'teacher_response_deadline' => null,
        ]);

        if ($continue) {
            $this->dispatchNextOffer($bookingRequest);
        }
    }

    public function expireStaleOffersForTeacher(int $teacherId): void
    {
        TeacherOffer::query()
            ->where('teacher_id', $teacherId)
            ->where('status', 'pending')
            ->where('expires_at', '<=', now())
            ->with('bookingRequest')
            ->get()
            ->each(fn (TeacherOffer $offer) => $this->expireOfferAndContinue($offer));
    }

    public function teacherHasConflict(int $teacherId, Carbon $startAt, Carbon $endAt, ?int $ignoreBookingId = null): bool
    {
        return Booking::query()
            ->where('teacher_id', $teacherId)
            ->whereIn('status', self::ACTIVE_BOOKING_STATUSES)
            ->when($ignoreBookingId, fn ($query) => $query->whereKeyNot($ignoreBookingId))
            ->where('start_at', '<', $endAt)
            ->where('end_at', '>', $startAt)
            ->exists();
    }

    public function hasAvailableCandidate(BookingRequest $bookingRequest): bool
    {
        $startAt = $this->startAt($bookingRequest);
        $endAt = $this->endAt($bookingRequest);
        $candidates = $this->candidateQuery(
            $bookingRequest,
            collect(),
            $startAt,
            $endAt
        )
            ->limit(100)
            ->get();

        return $this->rankCandidates($bookingRequest, $candidates)->isNotEmpty();
    }

    public function compatibilityError(
        TeacherProfile $profile,
        BookingRequest $bookingRequest
    ): ?string {
        $modeColumn = $bookingRequest->learning_mode === 'offline' ? 'is_offline' : 'is_online';
        $classTypeColumn = $bookingRequest->class_type === 'group'
            ? 'is_group_active'
            : 'is_private_active';

        $subjectMatches = $profile->subjects()
            ->where('name', $bookingRequest->subject_name)
            ->where('is_active', true)
            ->where($modeColumn, true)
            ->where($classTypeColumn, true)
            ->where(function ($levels) use ($bookingRequest) {
                $levels->whereNull('levels')
                    ->orWhereJsonContains('levels', $bookingRequest->education_level);
            })
            ->exists();

        if (!$subjectMatches) {
            return 'Mata pelajaran, jenjang, mode, atau jenis kelas tidak lagi sesuai dengan profil Anda.';
        }

        $dayName = $this->indonesianDayName($bookingRequest->scheduled_date->dayOfWeekIso);
        $scheduleMatches = $profile->user->availabilities()
            ->where('day', $dayName)
            ->where('is_active', true)
            ->where('start_time', '<=', $bookingRequest->start_time)
            ->where('end_time', '>=', $bookingRequest->end_time)
            ->exists();

        if (!$scheduleMatches) {
            return 'Rentang jadwal penawaran ini tidak lagi tersedia pada profil Anda.';
        }

        if ($bookingRequest->learning_mode !== 'offline') {
            return null;
        }

        if (
            $bookingRequest->latitude === null
            || $bookingRequest->longitude === null
            || $profile->latitude === null
            || $profile->longitude === null
        ) {
            return 'Titik lokasi tutor atau murid belum lengkap untuk kelas offline.';
        }

        $distance = $this->distanceKm(
            (float) $bookingRequest->latitude,
            (float) $bookingRequest->longitude,
            (float) $profile->latitude,
            (float) $profile->longitude,
        );
        $maximumDistance = min(
            (int) $bookingRequest->search_radius_km,
            max(1, (int) $profile->max_travel_km)
        );

        return $distance <= $maximumDistance
            ? null
            : "Jarak terbaru {$distance} km telah melampaui jangkauan {$maximumDistance} km.";
    }

    public function startAt(BookingRequest $bookingRequest): Carbon
    {
        return Carbon::parse(
            $bookingRequest->scheduled_date->format('Y-m-d').' '.$bookingRequest->start_time,
            config('app.timezone', 'Asia/Jakarta')
        );
    }

    public function endAt(BookingRequest $bookingRequest): Carbon
    {
        return Carbon::parse(
            $bookingRequest->scheduled_date->format('Y-m-d').' '.$bookingRequest->end_time,
            config('app.timezone', 'Asia/Jakarta')
        );
    }

    public function nextRadius(int $currentRadius): ?int
    {
        $radii = [3, 5, 8, 12];
        $index = array_search($currentRadius, $radii, true);

        if ($index === false) {
            return 3;
        }

        return $radii[$index + 1] ?? null;
    }

    private function candidateQuery(
        BookingRequest $bookingRequest,
        Collection $alreadyOffered,
        Carbon $startAt,
        Carbon $endAt
    ) {
        $dayName = $this->indonesianDayName($bookingRequest->scheduled_date->dayOfWeekIso);
        $modeColumn = $bookingRequest->learning_mode === 'offline' ? 'is_offline' : 'is_online';

        $query = User::query()
            ->where('role', 'teacher')
            ->where('status', 'active')
            ->whereNotIn('id', $alreadyOffered)
            ->whereHas('teacherProfile', function ($query) {
                $query->whereNotNull('verified_at')
                    ->where('is_accepting_requests', true)
                    ->where('points', '>', 0)
                    ->where(function ($cooldown) {
                        $cooldown->whereNull('suspended_until')->orWhere('suspended_until', '<=', now());
                    });
            })
            ->whereHas('teacherProfile.subjects', function ($query) use ($bookingRequest, $modeColumn) {
                $classTypeColumn = $bookingRequest->class_type === 'group'
                    ? 'is_group_active'
                    : 'is_private_active';

                $query->where('name', $bookingRequest->subject_name)
                    ->where('is_active', true)
                    ->where($modeColumn, true)
                    ->where($classTypeColumn, true)
                    ->where(function ($levels) use ($bookingRequest) {
                        $levels->whereNull('levels')
                            ->orWhereJsonContains('levels', $bookingRequest->education_level);
                    });
            })
            ->whereHas('availabilities', function ($query) use ($bookingRequest, $dayName) {
                $query->where('day', $dayName)
                    ->where('is_active', true)
                    ->where('start_time', '<=', $bookingRequest->start_time)
                    ->where('end_time', '>=', $bookingRequest->end_time);
            })
            ->whereDoesntHave('teacherBookings', function ($query) use ($startAt, $endAt) {
                $query->whereIn('status', self::ACTIVE_BOOKING_STATUSES)
                    ->where('start_at', '<', $endAt)
                    ->where('end_at', '>', $startAt);
            })
            ->whereDoesntHave('teacherOffers', function ($query) use ($bookingRequest) {
                $query->where('status', 'pending')
                    ->where('expires_at', '>', now())
                    ->whereHas('bookingRequest', function ($requests) use ($bookingRequest) {
                        $requests->where('scheduled_date', $bookingRequest->scheduled_date->format('Y-m-d'))
                            ->where('start_time', '<', $bookingRequest->end_time)
                            ->where('end_time', '>', $bookingRequest->start_time);
                    });
            })
            ->with(['teacherProfile.subjects']);

        if (
            $bookingRequest->learning_mode === 'offline'
            && $bookingRequest->latitude !== null
            && $bookingRequest->longitude !== null
        ) {
            $radius = max(1, min(12, (int) $bookingRequest->search_radius_km));
            $latitude = (float) $bookingRequest->latitude;
            $longitude = (float) $bookingRequest->longitude;
            $latitudeDelta = $radius / 111;
            $longitudeScale = max(0.2, abs(cos(deg2rad($latitude))));
            $longitudeDelta = $radius / (111 * $longitudeScale);

            $query->whereHas('teacherProfile', function ($profiles) use (
                $latitude,
                $longitude,
                $latitudeDelta,
                $longitudeDelta
            ) {
                $profiles
                    ->whereBetween('latitude', [
                        $latitude - $latitudeDelta,
                        $latitude + $latitudeDelta,
                    ])
                    ->whereBetween('longitude', [
                        $longitude - $longitudeDelta,
                        $longitude + $longitudeDelta,
                    ]);
            });
        }

        return $query;
    }

    private function rankCandidates(BookingRequest $bookingRequest, Collection $candidates): Collection
    {
        $continuityTeacherId = Booking::query()
            ->where('student_id', $bookingRequest->student_id)
            ->where('status', 'completed')
            ->where('learning_mode', $bookingRequest->learning_mode)
            ->where('class_type', $bookingRequest->class_type)
            ->whereHas('bookingRequest', function ($query) use ($bookingRequest) {
                $query->where('subject_name', $bookingRequest->subject_name)
                    ->where('education_level', $bookingRequest->education_level);
            })
            ->latest('completed_at')
            ->value('teacher_id');

        return $candidates
            ->filter(function (User $teacher) use ($bookingRequest) {
                $distance = null;

                if ($bookingRequest->learning_mode === 'offline') {
                    $profile = $teacher->teacherProfile;
                    if (
                        $bookingRequest->latitude === null
                        || $bookingRequest->longitude === null
                        || $profile?->latitude === null
                        || $profile?->longitude === null
                    ) {
                        return false;
                    }

                    $distance = $this->distanceKm(
                        (float) $bookingRequest->latitude,
                        (float) $bookingRequest->longitude,
                        (float) $profile->latitude,
                        (float) $profile->longitude,
                    );

                    if ($distance > (int) $bookingRequest->search_radius_km) {
                        return false;
                    }

                    if ($profile->max_travel_km && $distance > $profile->max_travel_km) {
                        return false;
                    }
                }

                $teacher->match_distance_km = $distance;
                return true;
            })
            ->sort(function (User $a, User $b) use ($bookingRequest, $continuityTeacherId) {
                if ($continuityTeacherId) {
                    $continuityA = $a->id === (int) $continuityTeacherId ? 0 : 1;
                    $continuityB = $b->id === (int) $continuityTeacherId ? 0 : 1;
                    if ($continuityA !== $continuityB) {
                        return $continuityA <=> $continuityB;
                    }
                }

                if ($bookingRequest->learning_mode === 'offline') {
                    $distanceBucketA = (int) floor(($a->match_distance_km ?? 9999) / 2);
                    $distanceBucketB = (int) floor(($b->match_distance_km ?? 9999) / 2);
                    if ($distanceBucketA !== $distanceBucketB) {
                        return $distanceBucketA <=> $distanceBucketB;
                    }
                }

                $pointWeightA = $this->pointService->recommendationWeight((int) ($a->teacherProfile->points ?? 0));
                $pointWeightB = $this->pointService->recommendationWeight((int) ($b->teacherProfile->points ?? 0));
                if ($pointWeightA !== $pointWeightB) {
                    return $pointWeightA <=> $pointWeightB;
                }

                $assignmentA = (int) ($a->teacherProfile->assignment_count ?? 0);
                $assignmentB = (int) ($b->teacherProfile->assignment_count ?? 0);
                if ($assignmentA !== $assignmentB) {
                    return $assignmentA <=> $assignmentB;
                }

                $randomA = crc32($bookingRequest->id.'|'.$a->id);
                $randomB = crc32($bookingRequest->id.'|'.$b->id);
                return $randomA <=> $randomB;
            })
            ->values();
    }

    private function applyNoResponseRestriction(TeacherOffer $offer): void
    {
        $result = DB::transaction(function () use ($offer) {
            $profile = TeacherProfile::query()
                ->where('user_id', $offer->teacher_id)
                ->lockForUpdate()
                ->first();

            if (!$profile) {
                return null;
            }

            $windowExpired = !$profile->no_response_window_started_at
                || $profile->no_response_window_started_at->lt(now()->subDays(30));
            $streak = $windowExpired ? 1 : ((int) $profile->no_response_streak + 1);
            $hours = match (true) {
                $streak >= 4 => 24,
                $streak === 3 => 12,
                $streak === 2 => 6,
                default => 3,
            };

            $profile->update([
                'no_response_streak' => $streak,
                'no_response_window_started_at' => $windowExpired
                    ? now()
                    : $profile->no_response_window_started_at,
                'suspended_until' => now()->addHours($hours),
            ]);

            return ['streak' => $streak, 'hours' => $hours];
        });

        if (!$result) {
            return;
        }

        if ($result['streak'] >= 2) {
            $this->pointService->change(
                $offer->teacher_id,
                -5,
                'Tidak merespons permintaan berulang',
                actor: null,
                notes: "Pembatasan menerima murid selama {$result['hours']} jam."
            );
        }

        Notification::create([
            'user_id' => $offer->teacher_id,
            'title' => 'Penerimaan murid dibatasi',
            'message' => "Permintaan tidak dijawab. Penawaran baru dihentikan selama {$result['hours']} jam.",
            'type' => 'warning',
        ]);
    }

    private function updateRequestGroup(
        BookingRequest $bookingRequest,
        array $attributes,
        bool $incrementAttempts = false
    ): void {
        $ids = collect([$bookingRequest->id]);
        if ($bookingRequest->group_pool_id) {
            $ids = $bookingRequest->groupPool->members()
                ->whereIn('status', ['waiting', 'joined'])
                ->pluck('booking_request_id');
        }

        if ($incrementAttempts) {
            BookingRequest::query()
                ->whereIn('id', $ids)
                ->whereIn('status', ['matching', 'teacher_pending', 'no_teacher'])
                ->increment('matching_attempts');
        }

        BookingRequest::query()
            ->whereIn('id', $ids)
            ->whereIn('status', ['matching', 'teacher_pending', 'no_teacher'])
            ->update($attributes);
    }

    private function teacherResponseHours(): int
    {
        return max(1, (int) (Setting::where('key', 'teacher_response_hours')->value('value') ?? 12));
    }

    private function maximumSearchHours(): int
    {
        return max(1, (int) (Setting::where('key', 'maximum_search_hours')->value('value') ?? 48));
    }

    private function indonesianDayName(int $isoDay): string
    {
        return [1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu', 7 => 'Minggu'][$isoDay];
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
}
