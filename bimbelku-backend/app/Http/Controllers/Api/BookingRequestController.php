<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BookingRequest;
use App\Models\CurriculumSubject;
use App\Models\PaymentSetting;
use App\Models\Notification;
use App\Models\Setting;
use App\Models\User;
use App\Services\GroupClassService;
use App\Services\HourlyRateService;
use App\Services\TeacherMatchingService;
use App\Support\EducationCatalog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class BookingRequestController extends Controller
{
    private const LEGACY_ACTIVE_STATUSES = [
        'group_forming', 'group_decision_required', 'matching', 'teacher_pending',
        'teacher_selected', 'teacher_accepted_waiting_group', 'no_teacher', 'expired',
        'student_cooldown', 'awaiting_payment', 'payment_submitted', 'payment_verified',
        'payment_rejected',
    ];

    private const LEGACY_HISTORY_STATUSES = [
        'cancelled', 'payment_expired', 'completed', 'refund_pending', 'refunded',
    ];

    public function index(
        Request $request,
        TeacherMatchingService $matchingService,
        GroupClassService $groupService
    ) {
        $groupService->markExpiredPools();
        $validated = $request->validate([
            'scope' => ['nullable', Rule::in(['active', 'history', 'all'])],
            'legacy_only' => ['nullable', 'boolean'],
        ]);
        $scope = $validated['scope'] ?? 'all';
        $legacyOnly = (bool) ($validated['legacy_only'] ?? false);

        $query = BookingRequest::query()
            ->where('student_id', $request->user()->id);

        if ($legacyOnly) {
            $query->whereNull('package_subject_id');
        }
        if ($scope === 'active') {
            $query->whereIn('status', self::LEGACY_ACTIVE_STATUSES);
        } elseif ($scope === 'history') {
            $query->whereIn('status', self::LEGACY_HISTORY_STATUSES);
        }

        $requests = $query
            ->with($this->studentRelations())
            ->latest()
            ->paginate(10);

        $requestIds = $requests->getCollection()->pluck('id');
        foreach ($requests->items() as $bookingRequest) {
            $this->refreshState($bookingRequest, $matchingService);
        }

        $refreshedRequests = BookingRequest::query()
            ->whereIn('id', $requestIds)
            ->with($this->studentRelations())
            ->get()
            ->keyBy('id');

        $requests->setCollection(
            $requestIds
                ->map(fn ($id) => $refreshedRequests->get($id))
                ->filter()
                ->map(fn (BookingRequest $item) => $this->prepareForStudent(
                    $item,
                    $request->user()->id
                ))
                ->values()
        );

        return response()->json([
            ...$requests->toArray(),
            'scope' => $scope,
            'legacy_only' => $legacyOnly,
            'active_count' => $legacyOnly
                ? BookingRequest::query()
                    ->where('student_id', $request->user()->id)
                    ->whereNull('package_subject_id')
                    ->whereIn('status', self::LEGACY_ACTIVE_STATUSES)
                    ->count()
                : null,
            'history_count' => $legacyOnly
                ? BookingRequest::query()
                    ->where('student_id', $request->user()->id)
                    ->whereNull('package_subject_id')
                    ->whereIn('status', self::LEGACY_HISTORY_STATUSES)
                    ->count()
                : null,
            'search_cooldown_until' => $request->user()->search_cooldown_until,
            'teacher_rejection_streak' => (int) $request->user()->teacher_rejection_streak,
        ]);
    }

    public function legacyStoreDisabled()
    {
        return response()->json([
            'message' => 'Pembuatan permintaan privat lama sudah ditutup. Silakan buat Paket Belajar dari halaman paket baru.',
            'code' => 'legacy_booking_creation_retired',
            'redirect_to' => '/student/packages/new',
        ], 410);
    }

    public function store(
        Request $request,
        TeacherMatchingService $matchingService,
        HourlyRateService $rateService,
        GroupClassService $groupService
    ) {
        $student = $request->user();
        $this->resetExpiredStudentRestriction($student);

        if ($student->search_cooldown_until?->isFuture()) {
            return response()->json([
                'message' => 'Pencarian tutor sedang dibatasi sampai '.$student->search_cooldown_until->translatedFormat('d M Y, H:i').' WIB.',
                'cooldown_until' => $student->search_cooldown_until,
            ], 429);
        }

        $request->merge([
            'subject_name' => trim((string) $request->input('subject_name')),
            'grade' => trim((string) $request->input('grade')),
            'chapter' => trim((string) $request->input('chapter')),
            'subtopic' => $request->filled('subtopic')
                ? trim((string) $request->input('subtopic'))
                : null,
            'topic' => $request->filled('topic')
                ? trim((string) $request->input('topic'))
                : null,
            'learning_goal' => $request->filled('learning_goal')
                ? trim((string) $request->input('learning_goal'))
                : null,
        ]);
        $validated = $request->validate([
            'subject_name' => ['required', 'string', 'max:120'],
            'education_level' => ['required', Rule::in(EducationCatalog::LEVELS)],
            'grade' => ['required', 'string', 'max:50'],
            'chapter' => ['required', 'string', 'max:180'],
            'subtopic' => ['nullable', 'string', 'max:220'],
            'topic' => ['nullable', 'string', 'max:1000'],
            'learning_goal' => ['nullable', 'string', 'max:1500'],
            'attachment' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'learning_mode' => ['required', Rule::in(['online', 'offline'])],
            'class_type' => ['required', Rule::in(['private'])],
            'scheduled_date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'duration_hours' => ['required', 'integer', Rule::in([1])],
            'address' => ['nullable', 'required_if:learning_mode,offline', 'string', 'max:1500'],
            'maps_link' => ['nullable', 'url:http,https', 'max:500'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'contact_number' => ['nullable', 'string', 'max:16', 'regex:/^\+?[0-9]{8,15}$/'],
        ]);
        if (!EducationCatalog::supports($validated['education_level'], $validated['grade'])) {
            return response()->json([
                'message' => 'Kelas tidak sesuai dengan jenjang yang dipilih.',
            ], 422);
        }

        $subject = CurriculumSubject::query()
            ->where('is_active', true)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($validated['subject_name'])])
            ->first();
        if (!$subject || !in_array($validated['grade'], $subject->grades ?? [], true)) {
            return response()->json([
                'message' => 'Mata pelajaran belum tersedia untuk kelas yang dipilih.',
            ], 422);
        }
        $validated['subject_name'] = $subject->name;

        $timezone = config('app.timezone', 'Asia/Jakarta');
        $startAt = Carbon::parse($validated['scheduled_date'].' '.$validated['start_time'], $timezone);
        $validated['duration_hours'] = 1;
        $endAt = $startAt->copy()->addHour();

        if ((int) $startAt->format('i') !== 0) {
            return response()->json([
                'message' => 'Jam mulai hanya boleh menggunakan menit 00.',
            ], 422);
        }
        if ($startAt->lessThanOrEqualTo(now())) {
            return response()->json(['message' => 'Pilih waktu mulai yang belum berlalu.'], 422);
        }

        if (!$startAt->isSameDay($endAt)) {
            return response()->json(['message' => 'Sesi harus selesai pada hari yang sama.'], 422);
        }

        $hasOverlap = BookingRequest::query()
            ->where('student_id', $student->id)
            ->whereIn('status', [
                'group_forming', 'group_decision_required', 'matching', 'teacher_pending',
                'no_teacher', 'expired', 'student_cooldown',
                'teacher_selected', 'teacher_accepted_waiting_group', 'awaiting_payment',
                'payment_submitted', 'payment_rejected', 'payment_verified', 'confirmed',
                'in_progress', 'awaiting_student_approval', 'disputed',
            ])
            ->where('scheduled_date', $startAt->toDateString())
            ->where('start_time', '<', $endAt->format('H:i:s'))
            ->where('end_time', '>', $startAt->format('H:i:s'))
            ->exists();

        if ($hasOverlap) {
            return response()->json(['message' => 'Anda sudah memiliki permintaan pada waktu tersebut.'], 422);
        }

        $bookingData = $validated;
        unset($bookingData['attachment']);
        $bookingData['curriculum_subject_id'] = $subject->id;

        if ($validated['learning_mode'] === 'offline') {
            $contactNumber = trim((string) ($validated['contact_number'] ?? $student->phone));
            if ($contactNumber === '') {
                return response()->json([
                    'message' => 'Nomor WhatsApp/telepon wajib diisi untuk kelas offline.',
                ], 422);
            }
            $bookingData['latitude'] = $validated['latitude'] ?? $student->latitude;
            $bookingData['longitude'] = $validated['longitude'] ?? $student->longitude;
            $bookingData['maps_link'] = $validated['maps_link'] ?? $student->maps_link;

            if ($bookingData['latitude'] === null || $bookingData['longitude'] === null) {
                return response()->json([
                    'message' => 'Titik lokasi wajib diaktifkan untuk pencarian tutor offline.',
                ], 422);
            }

            $student->forceFill([
                'address' => $validated['address'],
                'maps_link' => $bookingData['maps_link'],
                'latitude' => $bookingData['latitude'],
                'longitude' => $bookingData['longitude'],
                'phone' => $contactNumber,
            ])->save();
        } else {
            $bookingData['address'] = null;
            $bookingData['maps_link'] = null;
            $bookingData['latitude'] = null;
            $bookingData['longitude'] = null;
        }
        unset($bookingData['contact_number']);

        $hourlyRate = $rateService->resolve(
            $bookingData['subject_name'],
            $bookingData['education_level'],
            $bookingData['class_type'],
            $bookingData['learning_mode']
        );

        $attachmentPath = $request->hasFile('attachment')
            ? $request->file('attachment')->store('learning_requests', 'local')
            : null;
        $initialSearchHours = $matchingService->maximumSearchHours();

        try {
            $creation = DB::transaction(function () use (
                $student,
                $bookingData,
                $startAt,
                $endAt,
                $hourlyRate,
                $attachmentPath,
                $initialSearchHours,
                $groupService
            ) {
                // Kunci akun murid agar dua permintaan dari klik/perangkat
                // berbeda tidak lolos pada rentang waktu yang sama.
                $lockedStudent = User::query()
                    ->lockForUpdate()
                    ->findOrFail($student->id);
                if ($lockedStudent->search_cooldown_until?->isFuture()) {
                    abort(
                        429,
                        'Pencarian tutor sedang dibatasi sampai '
                        .$lockedStudent->search_cooldown_until->translatedFormat('d M Y, H:i')
                        .' WIB.'
                    );
                }

                $hasConcurrentOverlap = BookingRequest::query()
                    ->where('student_id', $lockedStudent->id)
                    ->whereIn('status', [
                        'group_forming', 'group_decision_required', 'matching', 'teacher_pending',
                        'no_teacher', 'expired', 'student_cooldown',
                        'teacher_selected', 'teacher_accepted_waiting_group', 'awaiting_payment',
                        'payment_submitted', 'payment_rejected', 'payment_verified', 'confirmed',
                        'in_progress', 'awaiting_student_approval', 'disputed',
                    ])
                    ->where('scheduled_date', $startAt->toDateString())
                    ->where('start_time', '<', $endAt->format('H:i:s'))
                    ->where('end_time', '>', $startAt->format('H:i:s'))
                    ->exists();
                if ($hasConcurrentOverlap) {
                    abort(422, 'Anda sudah memiliki permintaan pada waktu tersebut.');
                }

                $bookingRequest = BookingRequest::create([
                    ...$bookingData,
                    'student_id' => $lockedStudent->id,
                    'start_time' => $startAt->format('H:i:s'),
                    'end_time' => $endAt->format('H:i:s'),
                    'status' => 'matching',
                    'hourly_rate' => $hourlyRate,
                    'total_amount' => $hourlyRate * (int) $bookingData['duration_hours'],
                    'attachment' => $attachmentPath,
                    'search_radius_km' => $bookingData['learning_mode'] === 'offline' ? 3 : 12,
                    'search_started_at' => now(),
                    'search_expires_at' => now()->addHours($initialSearchHours),
                ]);
                if ($bookingRequest->class_type !== $bookingData['class_type']) {
                    abort(500, 'Jenis kelas gagal disimpan sesuai pilihan murid.');
                }
                $pool = $bookingRequest->class_type === 'group'
                    ? $groupService->joinOrCreate($bookingRequest)
                    : null;

                return ['request' => $bookingRequest, 'pool' => $pool];
            }, 3);
        } catch (\Throwable $exception) {
            if ($attachmentPath) {
                Storage::disk('local')->delete($attachmentPath);
            }
            throw $exception;
        }

        $bookingRequest = $creation['request'];
        if ($bookingRequest->class_type === 'group') {
            $pool = $creation['pool'];

            if ($pool->status === 'matching') {
                $primaryRequest = BookingRequest::query()
                    ->where('group_pool_id', $pool->id)
                    ->whereHas('groupMember', fn ($query) => $query->whereIn('status', ['waiting', 'joined']))
                    ->whereIn('status', ['matching', 'teacher_pending', 'no_teacher'])
                    ->orderByRaw(
                        'CASE WHEN student_id = ? THEN 0 ELSE 1 END',
                        [(int) $pool->created_by]
                    )
                    ->orderBy('id')
                    ->firstOrFail();
                $matchingService->dispatchNextOffer($primaryRequest);
            }
        } else {
            $matchingService->dispatchNextOffer($bookingRequest);
        }

        $fresh = $bookingRequest->fresh($this->studentRelations());

        return response()->json([
            'message' => match ($fresh->status) {
                'group_forming' => 'Ruang kelompok dibuat. Sistem sedang mencari murid dengan kebutuhan dan jadwal yang sama.',
                'teacher_pending' => $fresh->class_type === 'private'
                    ? 'Permintaan privat dibuat. Radar menemukan kandidat dan sedang menunggu jawaban tutor.'
                    : 'Permintaan kelompok dibuat. Radar menemukan kandidat dan sedang menunggu jawaban tutor.',
                'no_teacher' => $fresh->class_type === 'private'
                    ? 'Permintaan privat tersimpan, tetapi tutor belum ditemukan pada jangkauan saat ini.'
                    : 'Permintaan kelompok tersimpan, tetapi tutor belum ditemukan pada jangkauan saat ini.',
                default => $fresh->class_type === 'private'
                    ? 'Permintaan privat berhasil dibuat.'
                    : 'Permintaan kelompok berhasil dibuat.',
            },
            'data' => $this->prepareForStudent($fresh, $student->id),
        ], 201);
    }

    public function show(
        Request $request,
        BookingRequest $bookingRequest,
        TeacherMatchingService $matchingService
    ) {
        abort_unless($bookingRequest->student_id === $request->user()->id, 403);
        $this->refreshState($bookingRequest, $matchingService);

        return response()->json(
            $this->prepareForStudent(
                $bookingRequest->fresh($this->studentRelations()),
                $request->user()->id
            )
        );
    }

    public function expandRadius(
        Request $request,
        BookingRequest $bookingRequest,
        TeacherMatchingService $matchingService
    ) {
        abort_unless($bookingRequest->student_id === $request->user()->id, 403);

        $nextRadius = $matchingService->expandRadius(
            $bookingRequest,
            $request->user(),
            'Murid memilih melanjutkan pencarian pada jangkauan yang lebih luas.',
            'student'
        );
        $matchingService->dispatchNextOffer($bookingRequest->fresh());

        return response()->json([
            'message' => "Radar diperluas hingga {$nextRadius} km.",
            'radius' => $nextRadius,
        ]);
    }

    public function extendSearch(
        Request $request,
        BookingRequest $bookingRequest,
        TeacherMatchingService $matchingService
    ) {
        abort_unless($bookingRequest->student_id === $request->user()->id, 403);
        $deadline = DB::transaction(function () use (
            $request,
            $bookingRequest,
            $matchingService
        ) {
            $lockedRequest = BookingRequest::query()
                ->lockForUpdate()
                ->findOrFail($bookingRequest->id);
            abort_unless((int) $lockedRequest->student_id === (int) $request->user()->id, 403);
            if (!in_array($lockedRequest->status, ['expired', 'no_teacher'], true)) {
                abort(422, 'Pencarian ini belum memerlukan perpanjangan.');
            }

            $maximumHours = $matchingService->maximumSearchHours();
            $maximumDeadline = $lockedRequest->search_started_at->copy()->addHours($maximumHours);
            $classCutoff = $matchingService->startAt($lockedRequest);
            $resolvedDeadline = $maximumDeadline->min($classCutoff);

            if ($resolvedDeadline->isPast()) {
                abort(422, 'Jadwal kelas terlalu dekat untuk memperpanjang pencarian.');
            }

            $requestIds = $this->activeRequestIds($lockedRequest);
            BookingRequest::query()
                ->whereIn('id', $requestIds)
                ->whereIn('status', ['expired', 'no_teacher'])
                ->update([
                    'search_expires_at' => $resolvedDeadline,
                    'status' => 'matching',
                ]);

            return $resolvedDeadline;
        }, 3);

        $matchingService->dispatchNextOffer($bookingRequest->fresh());

        return response()->json([
            'message' => 'Pencarian diperpanjang hingga batas maksimal dua hari sejak permintaan awal.',
            'search_expires_at' => $deadline,
        ]);
    }

    public function teacherDecision(
        Request $request,
        BookingRequest $bookingRequest,
        TeacherMatchingService $matchingService,
        GroupClassService $groupService
    ) {
        abort_unless($bookingRequest->student_id === $request->user()->id, 403);
        $validated = $request->validate([
            'action' => ['required', Rule::in(['accept', 'reject'])],
            'reason' => ['nullable', Rule::in([
                'not_suitable', 'material_mismatch', 'distance_excess', 'system_error', 'other',
            ])],
            'note' => ['nullable', 'string', 'max:500'],
        ]);
        if ($validated['action'] === 'reject' && empty($validated['reason'])) {
            return response()->json(['message' => 'Alasan penolakan tutor wajib dipilih.'], 422);
        }
        if (
            $validated['action'] === 'reject'
            && in_array($validated['reason'] ?? null, ['not_suitable', 'other'], true)
            && mb_strlen(trim((string) ($validated['note'] ?? ''))) < 10
        ) {
            return response()->json([
                'message' => 'Jelaskan alasan penolakan sedikitnya 10 karakter.',
            ], 422);
        }

        if ($bookingRequest->status !== 'teacher_selected' || !$bookingRequest->booking) {
            return response()->json(['message' => 'Profil tutor ini sudah tidak menunggu keputusan.'], 422);
        }
        if ($bookingRequest->teacher_decision_deadline?->isPast()) {
            return response()->json([
                'message' => 'Batas keputusan profil tutor sudah berakhir. Muat ulang halaman untuk melihat status terbaru.',
            ], 422);
        }

        $student = $request->user();
        $booking = $bookingRequest->booking;
        $participant = $booking->participants()->where('student_id', $student->id)->firstOrFail();
        $order = $participant->order;

        if ($validated['action'] === 'accept') {
            $paymentSettings = PaymentSetting::query()->first();
            if (
                !$paymentSettings
                || blank($paymentSettings->bank_name)
                || blank($paymentSettings->account_number)
                || blank($paymentSettings->account_name)
            ) {
                return response()->json([
                    'message' => 'Rekening pembayaran belum dikonfigurasi admin. Profil tutor tetap tersimpan dan dapat diterima setelah rekening tersedia.',
                ], 503);
            }

            $paymentWindow = max(15, (int) (Setting::where('key', 'payment_window_minutes')->value('value') ?? 60));
            $paymentDueAt = now()->addMinutes($paymentWindow)
                ->min($booking->start_at->copy()->subMinutes(30));
            $groupSettlement = null;

            DB::transaction(function () use (
                $student,
                $bookingRequest,
                $paymentDueAt,
                $groupService,
                &$groupSettlement
            ) {
                $lockedPaymentSettings = PaymentSetting::query()
                    ->lockForUpdate()
                    ->first();
                if (
                    !$lockedPaymentSettings
                    || blank($lockedPaymentSettings->bank_name)
                    || blank($lockedPaymentSettings->account_number)
                    || blank($lockedPaymentSettings->account_name)
                ) {
                    abort(503, 'Rekening pembayaran belum dikonfigurasi admin.');
                }

                $lockedRequest = BookingRequest::query()
                    ->lockForUpdate()
                    ->findOrFail($bookingRequest->id);
                if ($lockedRequest->status !== 'teacher_selected') {
                    abort(422, 'Profil tutor ini sudah diproses.');
                }
                if ($lockedRequest->teacher_decision_deadline?->isPast()) {
                    abort(422, 'Batas keputusan profil tutor sudah berakhir.');
                }

                $lockedBooking = $lockedRequest->booking()->lockForUpdate()->firstOrFail();
                $lockedParticipant = $lockedBooking->participants()
                    ->where('student_id', $student->id)
                    ->lockForUpdate()
                    ->firstOrFail();
                $lockedOrder = $lockedParticipant->order()->lockForUpdate()->first();
                $lockedStudent = User::query()->lockForUpdate()->findOrFail($student->id);

                $lockedStudent->update([
                    'teacher_rejection_streak' => 0,
                    'last_teacher_rejection_at' => null,
                    'search_cooldown_until' => null,
                ]);

                if ($lockedBooking->class_type === 'private') {
                    $lockedParticipant->update(['status' => 'awaiting_payment']);
                    $lockedRequest->update([
                        'status' => 'awaiting_payment',
                        'payment_due_at' => $paymentDueAt,
                    ]);
                    $lockedOrder?->update(['status' => 'pending']);
                    $lockedBooking->update([
                        'status' => 'awaiting_payment',
                        'payment_due_at' => $paymentDueAt,
                    ]);
                } else {
                    $lockedParticipant->update(['status' => 'teacher_accepted']);
                    $lockedRequest->update(['status' => 'teacher_accepted_waiting_group']);
                    $groupSettlement = $groupService->settleAfterProfileDecision($lockedBooking);
                }
            });

            Notification::create([
                'user_id' => $booking->teacher_id,
                'title' => 'Profil diterima murid',
                'message' => 'Murid menerima pencocokan. Pembayaran sedang ditunggu.',
                'type' => 'success',
                'target_url' => '/guru/kelas',
            ]);

            return response()->json([
                'message' => $booking->class_type === 'group'
                    && ($groupSettlement['state'] ?? null) !== 'payment_open'
                        ? 'Tutor diterima. Pembayaran dibuka setelah seluruh anggota aktif memberikan keputusan.'
                        : 'Tutor diterima. Silakan selesaikan pembayaran.',
                'order_id' => $booking->class_type === 'private'
                    || ($groupSettlement['state'] ?? null) === 'payment_open'
                        ? $order?->id
                        : null,
                'payment_due_at' => $groupSettlement['payment_due_at'] ?? $paymentDueAt,
            ]);
        }

        $penaltyExempt = in_array(
            $validated['reason'] ?? null,
            ['material_mismatch', 'distance_excess', 'system_error'],
            true
        );
        $cooldownUntil = null;
        $attachmentToDelete = null;

        DB::transaction(function () use (
            $bookingRequest,
            $validated,
            $groupService,
            $student,
            $penaltyExempt,
            &$cooldownUntil,
            &$attachmentToDelete
        ) {
            $lockedRequest = BookingRequest::query()
                ->lockForUpdate()
                ->findOrFail($bookingRequest->id);
            if ($lockedRequest->status !== 'teacher_selected') {
                abort(422, 'Profil tutor ini sudah diproses.');
            }
            if ($lockedRequest->teacher_decision_deadline?->isPast()) {
                abort(422, 'Batas keputusan profil tutor sudah berakhir.');
            }

            $lockedBooking = $lockedRequest->booking()->lockForUpdate()->firstOrFail();
            $lockedParticipant = $lockedBooking->participants()
                ->where('student_id', $student->id)
                ->lockForUpdate()
                ->firstOrFail();
            $lockedOrder = $lockedParticipant->order()->lockForUpdate()->first();
            $lockedStudent = User::query()->lockForUpdate()->findOrFail($student->id);
            $cooldownUntil = $penaltyExempt
                ? null
                : $this->recordTeacherRejection($lockedStudent);

            $lockedParticipant->update(['status' => 'teacher_rejected']);
            $lockedOrder?->update(['status' => 'cancelled']);
            $lockedRequest->update([
                'status' => $lockedBooking->class_type === 'group'
                    ? 'cancelled'
                    : ($cooldownUntil ? 'student_cooldown' : 'matching'),
                'matched_teacher_id' => null,
                'teacher_rejection_reason' => ($validated['reason'] ?? 'other')
                    .(!empty($validated['note']) ? ': '.$validated['note'] : ''),
                'teacher_decision_deadline' => null,
            ]);

            if ($lockedBooking->class_type === 'private') {
                $lockedRequest->offers()
                    ->where('teacher_id', $lockedBooking->teacher_id)
                    ->where('status', 'accepted')
                    ->update(['status' => 'student_rejected']);
                $lockedBooking->update(['status' => 'student_rejected']);
            } else {
                $groupService->leave($lockedRequest);
                $groupService->settleAfterProfileDecision(
                    $lockedBooking,
                    'Peserta kelompok berkurang setelah pencocokan tutor'
                );
                if ($lockedRequest->attachment) {
                    $attachmentToDelete = $lockedRequest->attachment;
                    $lockedRequest->update(['attachment' => null]);
                }
            }
        });

        if ($attachmentToDelete) {
            Storage::disk('local')->delete($attachmentToDelete);
            Storage::disk('public')->delete($attachmentToDelete);
        }

        if ($booking->class_type === 'private' && !$cooldownUntil) {
            $matchingService->dispatchNextOffer($bookingRequest->fresh());
        }

        return response()->json([
            'message' => $cooldownUntil
                ? 'Tutor ditolak. Pencarian baru dibatasi sementara karena penolakan berulang.'
                : ($booking->class_type === 'group'
                    ? 'Tutor ditolak. Keanggotaan kelompok ini ditutup; Anda dapat membuat pencarian baru.'
                    : 'Tutor ditolak. Sistem melanjutkan pencarian secara otomatis.'),
            'cooldown_until' => $cooldownUntil,
        ]);
    }

    public function groupDecision(
        Request $request,
        BookingRequest $bookingRequest,
        GroupClassService $groupService,
        TeacherMatchingService $matchingService,
        HourlyRateService $rateService
    ) {
        abort_unless($bookingRequest->student_id === $request->user()->id, 403);
        $validated = $request->validate([
            'action' => ['required', Rule::in(['convert_private', 'cancel'])],
        ]);

        $rate = $rateService->resolve(
            $bookingRequest->subject_name,
            $bookingRequest->education_level,
            'private',
            $bookingRequest->learning_mode
        );

        $attachmentToDelete = null;
        DB::transaction(function () use (
            $bookingRequest,
            $validated,
            $groupService,
            $rate,
            &$attachmentToDelete
        ) {
            $lockedRequest = BookingRequest::query()
                ->lockForUpdate()
                ->findOrFail($bookingRequest->id);
            if ($lockedRequest->status !== 'group_decision_required') {
                abort(422, 'Keputusan kelompok tidak diperlukan pada permintaan ini.');
            }
            if ($lockedRequest->groupPool?->decision_deadline?->isPast()) {
                abort(422, 'Batas keputusan kelompok sudah berakhir.');
            }

            $groupService->leave($lockedRequest);
            if ($validated['action'] === 'cancel') {
                $attachmentToDelete = $lockedRequest->attachment;
                $lockedRequest->update([
                    'status' => 'cancelled',
                    'attachment' => null,
                ]);
                return;
            }

            $lockedRequest->update([
                'class_type' => 'private',
                'group_pool_id' => null,
                'status' => 'matching',
                'hourly_rate' => $rate,
                'total_amount' => $rate * $lockedRequest->duration_hours,
                'matched_teacher_id' => null,
            ]);
        }, 3);

        if ($attachmentToDelete) {
            Storage::disk('local')->delete($attachmentToDelete);
            Storage::disk('public')->delete($attachmentToDelete);
        }
        if ($validated['action'] === 'cancel') {
            return response()->json(['message' => 'Permintaan kelompok dibatalkan tanpa tagihan.']);
        }

        $matchingService->dispatchNextOffer($bookingRequest->fresh());

        return response()->json(['message' => 'Permintaan diubah menjadi privat. Radar tutor dijalankan kembali.']);
    }

    public function cancel(
        Request $request,
        BookingRequest $bookingRequest,
        GroupClassService $groupService,
        TeacherMatchingService $matchingService
    ) {
        abort_unless($bookingRequest->student_id === $request->user()->id, 403);
        $studentId = (int) $request->user()->id;
        $attachmentToDelete = null;
        $previousGroupPoolId = null;

        DB::transaction(function () use (
            $bookingRequest,
            $studentId,
            $groupService,
            &$attachmentToDelete,
            &$previousGroupPoolId
        ) {
            $lockedRequest = BookingRequest::query()
                ->lockForUpdate()
                ->findOrFail($bookingRequest->id);
            abort_unless((int) $lockedRequest->student_id === $studentId, 403);

            if (!in_array($lockedRequest->status, [
                'group_forming', 'group_decision_required', 'matching', 'teacher_pending',
                'no_teacher', 'expired', 'student_cooldown', 'teacher_accepted_waiting_group',
                'awaiting_payment', 'payment_rejected',
            ], true)) {
                abort(422, 'Permintaan ini tidak dapat dibatalkan.');
            }

            $booking = $lockedRequest->booking()->lockForUpdate()->first();
            $participant = $booking?->participants()
                ->where('student_id', $studentId)
                ->lockForUpdate()
                ->first();
            $order = $participant?->order()->lockForUpdate()->first();
            if ($order?->status === 'submitted') {
                abort(422, 'Permintaan tidak dapat dibatalkan ketika bukti pembayaran sedang diperiksa.');
            }

            $previousGroupPoolId = $lockedRequest->group_pool_id;
            $attachmentToDelete = $lockedRequest->attachment;

            $lockedRequest->offers()->where('status', 'pending')->update([
                'status' => 'cancelled',
                'responded_at' => now(),
            ]);
            if ($booking?->class_type === 'private') {
                $lockedRequest->offers()
                    ->where('status', 'accepted')
                    ->update(['status' => 'cancelled']);
            }

            if ($lockedRequest->group_pool_id) {
                $groupService->leave($lockedRequest);
            }

            $order?->update(['status' => 'cancelled']);
            $participant?->update(['status' => 'cancelled']);
            $lockedRequest->update([
                'status' => 'cancelled',
                'attachment' => null,
            ]);

            if ($booking?->class_type === 'private') {
                $booking->update(['status' => 'cancelled', 'payout_status' => 'cancelled']);
            } elseif ($booking) {
                $groupService->settleAfterProfileDecision(
                    $booking,
                    'Peserta membatalkan keikutsertaan setelah pencocokan tutor'
                );
            }
        }, 3);

        if ($attachmentToDelete) {
            Storage::disk('local')->delete($attachmentToDelete);
            Storage::disk('public')->delete($attachmentToDelete);
        }

        if ($previousGroupPoolId) {
            $nextRequest = BookingRequest::query()
                ->where('group_pool_id', $previousGroupPoolId)
                ->where('status', 'matching')
                ->orderBy('id')
                ->first();
            if ($nextRequest) {
                $matchingService->dispatchNextOffer($nextRequest);
            }
        }

        return response()->json(['message' => 'Permintaan berhasil dibatalkan.']);
    }

    private function prepareForStudent(BookingRequest $bookingRequest, int $studentId): BookingRequest
    {
        $teacherVisibleStatuses = [
            'teacher_selected', 'teacher_accepted_waiting_group', 'awaiting_payment',
            'payment_submitted', 'payment_rejected', 'payment_verified', 'confirmed',
            'in_progress', 'awaiting_student_approval', 'completed', 'disputed',
            'absence_review', 'refund_pending', 'refunded',
        ];

        if (!in_array($bookingRequest->status, $teacherVisibleStatuses, true)) {
            $bookingRequest->setRelation('matchedTeacher', null);
        }

        if ($bookingRequest->groupPool) {
            $bookingRequest->setAttribute(
                'group_member_count',
                $bookingRequest->groupPool->members
                    ->whereIn('status', ['waiting', 'joined', 'teacher_decision', 'awaiting_payment', 'paid'])
                    ->count()
            );
            $bookingRequest->setAttribute('group_minimum', $bookingRequest->groupPool->minimum_participants);
            $bookingRequest->setAttribute('group_maximum', $bookingRequest->groupPool->maximum_participants);
            $bookingRequest->setAttribute(
                'group_decision_deadline',
                $bookingRequest->groupPool->decision_deadline
            );
            $bookingRequest->setAttribute(
                'is_group_host',
                (int) $bookingRequest->groupPool->created_by === $studentId
            );
            if (
                $bookingRequest->learning_mode === 'offline'
                && $bookingRequest->latitude !== null
                && $bookingRequest->longitude !== null
                && $bookingRequest->groupPool->latitude !== null
                && $bookingRequest->groupPool->longitude !== null
            ) {
                $bookingRequest->setAttribute(
                    'group_meeting_distance_km',
                    round($this->distanceKm(
                        (float) $bookingRequest->latitude,
                        (float) $bookingRequest->longitude,
                        (float) $bookingRequest->groupPool->latitude,
                        (float) $bookingRequest->groupPool->longitude
                    ), 1)
                );
            }
        }

        $participant = $bookingRequest->booking?->participants
            ?->firstWhere('student_id', $studentId);
        if ($participant?->order) {
            $participant->order->setVisible([
                'id', 'order_id', 'status', 'amount', 'payment_rejection_reason',
            ]);
        }
        $bookingRequest->setAttribute('my_order', $participant?->order);
        $bookingRequest->setAttribute('has_attachment', !empty($bookingRequest->attachment));
        $bookingRequest->setHidden(array_values(array_unique([
            ...$bookingRequest->getHidden(),
            'attachment',
        ])));

        if ($bookingRequest->matchedTeacher) {
            $bookingRequest->matchedTeacher->setVisible(['id', 'name', 'teacher_profile', 'ratings']);
            $bookingRequest->matchedTeacher->ratings
                ?->each->setVisible(['rating']);
            if ($bookingRequest->matchedTeacher->teacherProfile) {
                $bookingRequest->matchedTeacher->teacherProfile->setVisible([
                    'title', 'bio', 'experience', 'photo', 'expertise', 'points',
                ]);
            }
        }

        if ($bookingRequest->booking) {
            $bookingRequest->booking->setVisible([
                'id', 'status', 'start_at', 'end_at', 'learning_mode', 'class_type',
                'payment_due_at', 'meeting_link',
            ]);
            if ($participant?->order?->status !== 'paid') {
                $bookingRequest->booking->setAttribute('meeting_link', null);
            }
            $bookingRequest->booking->unsetRelation('orders');
            $bookingRequest->booking->unsetRelation('participants');
            $bookingRequest->booking->unsetRelation('groupPool');
        }

        $bookingRequest->unsetRelation('student');
        $bookingRequest->unsetRelation('groupPool');
        $bookingRequest->unsetRelation('offers');

        return $bookingRequest;
    }

    private function refreshState(BookingRequest $bookingRequest, TeacherMatchingService $matchingService): void
    {
        $pendingOffer = $bookingRequest->offers->first();
        if ($pendingOffer && $pendingOffer->expires_at->isPast()) {
            $matchingService->expireOfferAndContinue($pendingOffer);
            return;
        }

        if (
            $bookingRequest->status === 'student_cooldown'
            && !$bookingRequest->student?->search_cooldown_until?->isFuture()
        ) {
            $resumed = BookingRequest::query()
                ->whereKey($bookingRequest->id)
                ->where('status', 'student_cooldown')
                ->update(['status' => 'matching']);
            if ($resumed) {
                $matchingService->dispatchNextOffer($bookingRequest->fresh());
            }
        }
        if (
            $bookingRequest->status === 'matching'
            && !$pendingOffer?->expires_at?->isFuture()
        ) {
            $matchingService->dispatchNextOffer($bookingRequest);
        }
    }

    private function resetExpiredStudentRestriction($student): void
    {
        if ($student->last_teacher_rejection_at?->lt(now()->subDays(7))) {
            $student->update([
                'teacher_rejection_streak' => 0,
                'last_teacher_rejection_at' => null,
                'search_cooldown_until' => null,
            ]);
            return;
        }

        if ($student->search_cooldown_until?->isPast()) {
            $student->update(['search_cooldown_until' => null]);
        }
    }

    private function recordTeacherRejection($student): ?Carbon
    {
        $streak = $student->last_teacher_rejection_at?->gte(now()->subDays(7))
            ? ((int) $student->teacher_rejection_streak + 1)
            : 1;
        $hours = match (true) {
            $streak >= 6 => 24,
            $streak === 5 => 12,
            $streak === 4 => 6,
            $streak === 3 => 1,
            default => 0,
        };
        $cooldownUntil = $hours > 0 ? now()->addHours($hours) : null;

        $student->update([
            'teacher_rejection_streak' => $streak,
            'last_teacher_rejection_at' => now(),
            'search_cooldown_until' => $cooldownUntil,
        ]);

        return $cooldownUntil;
    }

    private function distanceKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371;
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);
        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lonDelta / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function studentRelations(): array
    {
        return [
            'student',
            'matchedTeacher.teacherProfile.subjects',
            'matchedTeacher.ratings',
            'booking.orders',
            'booking.participants.order',
            'booking.groupPool',
            'groupPool.members',
            'offers' => fn ($query) => $query
                ->where('status', 'pending')
                ->latest('offered_at'),
        ];
    }

    private function activeRequestIds(BookingRequest $bookingRequest)
    {
        if (!$bookingRequest->group_pool_id) {
            return collect([$bookingRequest->id]);
        }

        return $bookingRequest->groupPool?->members()
            ->whereIn('status', ['waiting', 'joined'])
            ->pluck('booking_request_id') ?? collect();
    }
}
