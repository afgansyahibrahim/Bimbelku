<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingDispute;
use App\Models\BookingRequest;
use App\Models\ClassroomMessage;
use App\Models\CurriculumChapter;
use App\Models\CurriculumSubject;
use App\Models\LearningTopic;
use App\Models\LearningPackage;
use App\Models\LearningTimeSlot;
use App\Models\MatchingOperationLog;
use App\Models\Notification;
use App\Models\PackageLearningTopic;
use App\Models\PackagePlan;
use App\Models\PackageRenewal;
use App\Models\PackageSession;
use App\Models\PackageSubject;
use App\Models\Promotion;
use App\Models\PromotionClaim;
use App\Models\Refund;
use App\Services\HourlyRateService;
use App\Services\PackageCheckoutService;
use App\Support\EducationCatalog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StudentPackageController extends Controller
{
    public function plans()
    {
        return response()->json(
            PackagePlan::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('session_count')
                ->get()
        );
    }

    public function timeSlots()
    {
        return response()->json(
            LearningTimeSlot::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('start_time')
                ->get()
                ->filter(fn (LearningTimeSlot $slot) => substr((string) $slot->start_time, 3, 2) === '00'
                    && substr((string) $slot->start_time, 0, 5) < '23:00')
                ->values()
        );
    }

    public function index(Request $request)
    {
        $packages = LearningPackage::query()
            ->where('student_id', $request->user()->id)
            ->with([
                'plan',
                'promotion',
                'subjects.assignedTeacher.teacherProfile',
                'subjects.learningTopics',
                'subjects.sessions.booking',
                'orders' => fn ($query) => $query->latest(),
            ])
            ->latest()
            ->paginate(20);

        $packages->getCollection()->transform(
            fn (LearningPackage $package) => $this->formatPackage($package)
        );

        return response()->json($packages);
    }

    public function show(Request $request, LearningPackage $learningPackage)
    {
        abort_unless($learningPackage->student_id === $request->user()->id, 403);
        $learningPackage->load([
            'plan',
            'promotion',
            'subjects.assignedTeacher.teacherProfile',
            'subjects.learningTopics',
            'subjects.sessions.booking',
            'orders' => fn ($query) => $query->latest(),
        ]);

        return response()->json($this->formatPackage($learningPackage));
    }

    public function dashboard(Request $request)
    {
        $studentId = $request->user()->id;
        $packages = LearningPackage::query()
            ->where('student_id', $studentId)
            ->whereNotIn('status', ['cancelled', 'payment_expired', 'completed'])
            ->with(['plan', 'subjects.assignedTeacher', 'subjects.learningTopics', 'subjects.sessions.booking'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (LearningPackage $package) => $this->formatPackage($package));

        $nextBooking = Booking::query()
            ->where('student_id', $studentId)
            ->whereIn('status', ['confirmed', 'in_progress', 'awaiting_student_approval'])
            ->where('end_at', '>=', now())
            ->with(['teacher:id,name', 'bookingRequest:id,subject_name,chapter'])
            ->orderBy('start_at')
            ->first();

        $voucherCount = PromotionClaim::query()
            ->where('user_id', $studentId)
            ->where('status', 'available')
            ->whereHas('promotion', fn ($query) => $query
                ->where('is_active', true)
                ->where(fn ($dates) => $dates->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                ->where(fn ($dates) => $dates->whereNull('ends_at')->orWhere('ends_at', '>=', now())))
            ->count();
        $notifications = Notification::query()
            ->where('user_id', $studentId)
            ->latest()
            ->limit(5)
            ->get(['id', 'title', 'message', 'type', 'is_read', 'created_at']);
        $activeDisputes = BookingDispute::query()
            ->where('student_id', $studentId)
            ->whereNotIn('status', ['resolved', 'rejected', 'cancelled'])
            ->count();
        $unreadMessages = ClassroomMessage::query()
            ->where('sender_id', '!=', $studentId)
            ->whereHas('booking', function ($bookings) use ($studentId) {
                $bookings
                    ->whereIn('status', [
                        'confirmed', 'in_progress', 'awaiting_student_approval', 'disputed',
                        'absence_review', 'admin_review_required', 'completed',
                    ])
                    ->whereHas('participants', fn ($participants) => $participants
                        ->where('student_id', $studentId)
                        ->whereHas('order', fn ($orders) => $orders->where('status', 'paid')));
            })
            ->whereDoesntHave('reads', fn ($reads) => $reads->where('user_id', $studentId))
            ->count();

        return response()->json([
            'packages' => $packages,
            'next_session' => $nextBooking ? [
                'id' => $nextBooking->id,
                'subject' => $nextBooking->bookingRequest?->subject_name,
                'chapter' => $nextBooking->bookingRequest?->chapter,
                'teacher_name' => $nextBooking->teacher?->name,
                'learning_mode' => $nextBooking->learning_mode,
                'status' => $nextBooking->status,
                'start_at' => $nextBooking->start_at,
                'end_at' => $nextBooking->end_at,
            ] : null,
            'voucher_count' => $voucherCount,
            'unread_messages_count' => $unreadMessages,
            'active_disputes_count' => $activeDisputes,
            'recent_notifications' => $notifications,
        ]);
    }

    public function tutorialStatus(Request $request)
    {
        $hasMultiSubjectPackage = LearningPackage::query()
            ->where('student_id', $request->user()->id)
            ->whereHas('subjects', null, '>=', 2)
            ->exists();

        return response()->json([
            'has_multi_subject_package' => $hasMultiSubjectPackage,
        ]);
    }

    public function store(
        Request $request,
        HourlyRateService $rateService,
        PackageCheckoutService $checkoutService
    ) {
        // Draf lama dapat membawa hari, bab, atau subbab yang sama lebih dari sekali.
        // Duplikasi dinormalisasi sebelum validasi tanpa mengubah jadwal pengguna.
        if (is_array($request->input('subjects'))) {
            $normalizedInputSubjects = collect($request->input('subjects'))->map(function ($item) {
                if (!is_array($item)) {
                    return $item;
                }

                foreach (['curriculum_chapter_ids', 'learning_topic_ids', 'weekdays'] as $field) {
                    if (!is_array($item[$field] ?? null)) {
                        continue;
                    }

                    $item[$field] = collect($item[$field])
                        ->map(fn ($value) => is_numeric($value) ? (int) $value : $value)
                        ->uniqueStrict()
                        ->values()
                        ->all();
                }

                return $item;
            })->all();

            $request->merge(['subjects' => $normalizedInputSubjects]);
        }

        $validated = $request->validate([
            'package_plan_id' => ['required', 'integer', 'exists:package_plans,id'],
            'education_level' => ['required', Rule::in(EducationCatalog::LEVELS)],
            'grade' => ['required', 'string', 'max:50'],
            'learning_mode' => ['required', Rule::in(['online', 'offline'])],
            'duration_hours' => ['nullable', 'integer', Rule::in([1, 2])],
            'promotion_code' => ['nullable', 'string', 'max:60'],
            'promotion_claim_id' => ['nullable', 'integer', 'exists:promotion_claims,id'],
            'renewal_of_id' => ['nullable', 'integer', 'exists:learning_packages,id'],
            'subjects' => ['required', 'array', 'min:1'],
            'subjects.*.curriculum_subject_id' => ['required', 'integer', 'distinct', 'exists:curriculum_subjects,id'],
            'subjects.*.curriculum_chapter_ids' => ['nullable', 'array', 'min:1', 'max:8'],
            'subjects.*.curriculum_chapter_ids.*' => ['integer', 'distinct', 'exists:curriculum_chapters,id'],
            'subjects.*.learning_topic_ids' => ['nullable', 'array', 'min:1', 'max:40'],
            'subjects.*.learning_topic_ids.*' => ['integer', 'distinct', 'exists:learning_topics,id'],
            'subjects.*.learning_goal' => ['nullable', 'string', 'max:1500'],
            'subjects.*.preferred_teacher_id' => ['nullable', 'integer', 'exists:users,id'],
            'subjects.*.weekdays' => ['required', 'array', 'min:1', 'max:4'],
            'subjects.*.weekdays.*' => ['required', 'integer', 'between:1,7'],
            'subjects.*.schedules' => ['required', 'array', 'min:1'],
            'subjects.*.schedules.*' => ['required', 'date'],
        ], [
            'subjects.*.curriculum_subject_id.distinct' => 'Satu mata pelajaran tidak boleh dipilih lebih dari sekali.',
            'subjects.*.curriculum_chapter_ids.*.distinct' => 'Bab yang sama tidak boleh dipilih lebih dari sekali.',
            'subjects.*.learning_topic_ids.*.distinct' => 'Subbab yang sama tidak boleh dipilih lebih dari sekali.',
            'subjects.*.weekdays.max' => 'Setiap mata pelajaran hanya boleh memiliki maksimal 4 hari belajar.',
        ]);
        abort_if(
            filled($validated['promotion_code'] ?? null) && filled($validated['promotion_claim_id'] ?? null),
            422,
            'Gunakan satu voucher atau satu kode promo.'
        );
        abort_unless(
            EducationCatalog::supports($validated['education_level'], $validated['grade']),
            422,
            'Kelas atau tingkat tidak sesuai jenjang.'
        );

        $student = $request->user();
        $durationHours = (int) ($validated['duration_hours'] ?? 1);
        if ($validated['learning_mode'] === 'offline') {
            abort_if(
                blank($student->address) || $student->latitude === null || $student->longitude === null,
                422,
                'Alamat dan titik lokasi profil wajib dilengkapi untuk paket offline.'
            );
        }

        $plan = PackagePlan::query()->where('is_active', true)->findOrFail($validated['package_plan_id']);
        abort_if(count($validated['subjects']) > $plan->maximum_subjects, 422, "Paket ini maksimal {$plan->maximum_subjects} mata pelajaran.");
        $activeSlotTimes = LearningTimeSlot::query()
            ->where('is_active', true)
            ->pluck('start_time')
            ->map(fn ($time) => substr((string) $time, 0, 5))
            ->filter(fn (string $time) => substr($time, 3, 2) === '00' && $time < '23:00')
            ->values()
            ->all();
        abort_if(empty($activeSlotTimes), 422, 'Admin belum mengaktifkan slot jadwal belajar.');

        $subjectsById = CurriculumSubject::query()
            ->where('is_active', true)
            ->whereIn('id', collect($validated['subjects'])->pluck('curriculum_subject_id'))
            ->get()
            ->keyBy('id');
        abort_if($subjectsById->count() !== count($validated['subjects']), 422, 'Salah satu mata pelajaran tidak aktif.');

        $totalSchedules = collect($validated['subjects'])->sum(fn (array $item) => count($item['schedules']));
        abort_unless($totalSchedules === $plan->session_count, 422, "Jumlah jadwal harus tepat {$plan->session_count} sesi.");

        $normalizedSubjects = [];
        $allStarts = collect();
        foreach ($validated['subjects'] as $item) {
            $subject = $subjectsById[$item['curriculum_subject_id']];
            abort_if(
                $subject->education_levels
                    && !in_array($validated['education_level'], $subject->education_levels, true),
                422,
                "{$subject->name} tidak tersedia pada jenjang ini."
            );
            abort_if(
                $subject->grades
                    && !in_array($validated['grade'], $subject->grades, true),
                422,
                "{$subject->name} tidak tersedia pada kelas atau tingkat ini."
            );

            $starts = collect($item['schedules'])->map(function (string $value) use (
                $student,
                $activeSlotTimes,
                $durationHours
            ) {
                $start = Carbon::parse($value, config('app.timezone', 'Asia/Jakarta'))->seconds(0);
                abort_if($start->lt(now()->addHours(72)), 422, 'Jadwal paket paling cepat dimulai 72 jam dari sekarang.');
                abort_unless($start->format('i') === '00', 422, 'Semua jadwal hanya boleh memakai menit 00.');
                abort_unless(
                    in_array($start->format('H:i'), $activeSlotTimes, true),
                    422,
                    'Jam yang dipilih tidak termasuk slot jam penuh yang aktif.'
                );
                abort_if(
                    ((int) $start->format('H')) + $durationHours > 23,
                    422,
                    'Jam mulai terlalu malam untuk durasi pertemuan yang dipilih.'
                );
                $this->assertStudentHasNoConflict($student->id, $start, $start->copy()->addHours($durationHours));
                return $start;
            })->sortBy(fn (Carbon $date) => $date->timestamp)->values();
            abort_if($starts->unique(fn (Carbon $date) => $date->timestamp)->count() !== $starts->count(), 422, 'Jadwal dalam satu mapel tidak boleh sama.');
            abort_if(
                $starts->map(fn (Carbon $date) => $date->format('H:i'))->unique()->count() !== 1,
                422,
                'Semua hari pada satu mata pelajaran harus memakai jam yang sama.'
            );
            if (empty($item['curriculum_chapter_ids']) || empty($item['learning_topic_ids'])) {
                throw ValidationException::withMessages([
                    'subjects' => "Pilih sedikitnya satu bab dan satu subbab untuk {$subject->name}.",
                ]);
            }
            $chapterIds = collect($item['curriculum_chapter_ids'])->map(fn ($id) => (int) $id)->unique()->values();
            $chapters = CurriculumChapter::query()
                ->where('curriculum_subject_id', $subject->id)
                ->where('education_level', $validated['education_level'])
                ->where('grade', $validated['grade'])
                ->where('is_active', true)
                ->whereIn('id', $chapterIds)
                ->orderBy('sort_order')
                ->get();
            abort_unless($chapters->count() === $chapterIds->count(), 422, "Salah satu bab {$subject->name} tidak sesuai kelas atau sudah tidak aktif.");

            $topicIds = collect($item['learning_topic_ids'])->map(fn ($id) => (int) $id)->unique()->values();
            $topics = LearningTopic::query()
                ->where('subject_name', $subject->name)
                ->where('education_level', $validated['education_level'])
                ->where('grade', $validated['grade'])
                ->where('is_active', true)
                ->whereIn('chapter', $chapters->pluck('title'))
                ->whereIn('id', $topicIds)
                ->orderBy('sort_order')
                ->get();
            abort_unless($topics->count() === $topicIds->count(), 422, "Salah satu subbab {$subject->name} tidak sesuai bab atau sudah tidak aktif.");
            $allStarts = $allStarts->merge($starts);

            $unitPrice = $rateService->resolve(
                $subject->name,
                $validated['education_level'],
                'private',
                $validated['learning_mode']
            );
            $normalizedSubjects[] = [
                ...$item,
                'subject' => $subject,
                'starts' => $starts,
                'chapters' => $chapters,
                'topics' => $topics,
                'unit_price' => $unitPrice,
                'subtotal' => $unitPrice * $durationHours * $starts->count(),
            ];
        }
        $sortedStarts = $allStarts->sortBy(fn (Carbon $date) => $date->timestamp)->values();
        for ($index = 0; $index < $sortedStarts->count() - 1; $index++) {
            abort_if(
                $sortedStarts[$index]->copy()->addHours($durationHours)->gt($sortedStarts[$index + 1]),
                422,
                'Dua jadwal dalam paket tidak boleh bertumpang tindih.'
            );
        }
        abort_if(
            $allStarts->max()?->diffInDays($allStarts->min()) > $plan->validity_days,
            422,
            "Rentang jadwal melebihi masa penggunaan {$plan->validity_days} hari."
        );

        $renewalOf = null;
        if (!empty($validated['renewal_of_id'])) {
            $renewalOf = LearningPackage::query()
                ->where('student_id', $student->id)
                ->with('subjects.learningTopics')
                ->findOrFail($validated['renewal_of_id']);
            abort_unless($this->canRenew($renewalOf), 422, 'Perpanjangan baru tersedia tujuh hari sebelum paket berakhir.');
            foreach ($normalizedSubjects as $item) {
                if (empty($item['preferred_teacher_id'])) continue;
                $oldSubject = $renewalOf->subjects->firstWhere('subject_name', $item['subject']->name);
                abort_unless(
                    $oldSubject && (int) $oldSubject->assigned_teacher_id === (int) $item['preferred_teacher_id'],
                    422,
                    'Tutor prioritas harus berasal dari mapel yang sama pada paket lama.'
                );
            }
        }

        $subtotal = collect($normalizedSubjects)->sum('subtotal');
        [$promotion, $claim] = $this->resolvePromotion($student->id, $validated);
        $discount = $promotion
            ? $checkoutService->calculateDiscount(
                $promotion,
                $subtotal,
                $plan->id,
                $validated['education_level'],
                collect($normalizedSubjects)->pluck('subject.name')->all(),
                $validated['learning_mode'],
                $student,
                $claim
            )
            : 0;

        [$package, $order] = DB::transaction(function () use (
            $student,
            $plan,
            $validated,
            $normalizedSubjects,
            $subtotal,
            $discount,
            $promotion,
            $claim,
            $checkoutService,
            $renewalOf,
            $durationHours
        ) {
            \App\Models\User::query()->lockForUpdate()->findOrFail($student->id);
            foreach ($normalizedSubjects as $item) {
                foreach ($item['starts'] as $start) {
                    $this->assertStudentHasNoConflict(
                        $student->id,
                        $start,
                        $start->copy()->addHours($durationHours)
                    );
                }
            }
            $package = LearningPackage::create([
                'student_id' => $student->id,
                'package_plan_id' => $plan->id,
                'promotion_id' => $promotion?->id,
                'renewal_of_id' => $renewalOf?->id,
                'package_code' => 'BKU-'.now()->format('ymdHis').'-'.$student->id.'-'.random_int(10, 99),
                'education_level' => $validated['education_level'],
                'grade' => $validated['grade'],
                'learning_mode' => $validated['learning_mode'],
                'duration_hours' => $durationHours,
                'address' => $validated['learning_mode'] === 'offline' ? $student->address : null,
                'maps_link' => $validated['learning_mode'] === 'offline' ? $student->maps_link : null,
                'status' => 'awaiting_payment',
                'total_sessions' => $plan->session_count,
                'subtotal_amount' => $subtotal,
                'discount_amount' => $discount,
                'total_amount' => $subtotal - $discount,
            ]);

            foreach ($normalizedSubjects as $item) {
                $chapterLabel = $this->compactLabel($item['chapters']->pluck('title'));
                $topicLabel = $this->compactLabel($item['topics']->pluck('name'));
                $packageSubject = PackageSubject::create([
                    'learning_package_id' => $package->id,
                    'curriculum_subject_id' => $item['subject']->id,
                    'curriculum_chapter_id' => $item['chapters']->first()?->id,
                    'curriculum_chapter_ids' => $item['chapters']->pluck('id')->map(fn ($id) => (int) $id)->all(),
                    'learning_topic_ids' => $item['topics']->pluck('id')->map(fn ($id) => (int) $id)->all(),
                    'preferred_teacher_id' => $item['preferred_teacher_id'] ?? null,
                    'subject_name' => $item['subject']->name,
                    'chapter' => $chapterLabel,
                    'subtopic' => $topicLabel,
                    'learning_goal' => $item['learning_goal'] ?? null,
                    'allocated_sessions' => $item['starts']->count(),
                    'unit_price' => $item['unit_price'],
                    'subtotal_amount' => $item['subtotal'],
                    'status' => 'awaiting_payment',
                ]);

                $previousSubject = $renewalOf?->subjects->firstWhere('subject_name', $item['subject']->name);
                foreach ($item['topics']->values() as $index => $topic) {
                    $previousTopic = $previousSubject?->learningTopics
                        ?->firstWhere('learning_topic_id', $topic->id);
                    PackageLearningTopic::create([
                        'package_subject_id' => $packageSubject->id,
                        'curriculum_chapter_id' => $item['chapters']->firstWhere('title', $topic->chapter)?->id,
                        'learning_topic_id' => $topic->id,
                        'chapter' => $topic->chapter,
                        'title' => $topic->name,
                        'normalized_title' => mb_strtolower(preg_replace('/\s+/u', ' ', trim($topic->name))),
                        'status' => $previousTopic?->status ?? 'not_started',
                        'needs_review' => (bool) ($previousTopic?->needs_review ?? false),
                        'sort_order' => $index + 1,
                        'started_at' => $previousTopic?->started_at,
                        'completed_at' => $previousTopic?->completed_at,
                    ]);
                }

                foreach ($item['starts']->values() as $index => $start) {
                    PackageSession::create([
                        'package_subject_id' => $packageSubject->id,
                        'sequence' => $index + 1,
                        'scheduled_start_at' => $start,
                        'scheduled_end_at' => $start->copy()->addHours($durationHours),
                        'status' => 'awaiting_payment',
                    ]);
                }

                $firstStart = $item['starts']->first();
                BookingRequest::create([
                    'student_id' => $student->id,
                    'package_subject_id' => $packageSubject->id,
                    'subject_name' => $item['subject']->name,
                    'curriculum_subject_id' => $item['subject']->id,
                    'education_level' => $validated['education_level'],
                    'grade' => $validated['grade'],
                    'chapter' => $chapterLabel,
                    'subtopic' => $topicLabel,
                    'topic' => $item['learning_goal'] ?? null,
                    'learning_goal' => $item['learning_goal'] ?? null,
                    'learning_mode' => $validated['learning_mode'],
                    'class_type' => 'private',
                    'scheduled_date' => $firstStart->toDateString(),
                    'start_time' => $firstStart->format('H:i:s'),
                    'end_time' => $firstStart->copy()->addHours($durationHours)->format('H:i:s'),
                    'duration_hours' => $durationHours,
                    'address' => $package->address,
                    'maps_link' => $package->maps_link,
                    'latitude' => $validated['learning_mode'] === 'offline' ? $student->latitude : null,
                    'longitude' => $validated['learning_mode'] === 'offline' ? $student->longitude : null,
                    'status' => 'awaiting_payment',
                    'search_radius_km' => 3,
                    'search_started_at' => null,
                    'search_expires_at' => null,
                    'hourly_rate' => $item['unit_price'],
                    'total_amount' => $item['subtotal'],
                ]);

                if ($renewalOf) {
                    $oldSubject = $renewalOf->subjects->firstWhere('subject_name', $item['subject']->name);
                    if ($oldSubject) {
                        PackageRenewal::create([
                            'old_package_id' => $renewalOf->id,
                            'new_package_id' => $package->id,
                            'old_package_subject_id' => $oldSubject->id,
                            'old_teacher_id' => $oldSubject->assigned_teacher_id,
                            'status' => 'requested',
                        ]);
                    }
                }
            }

            if ($promotion) {
                $checkoutService->reservePromotion($promotion, $student, $package, $claim);
            }

            return [$package, $checkoutService->createInvoiceBeforeMatching($package)];
        }, 3);

        $snapshot = $order->class_details_snapshot ?? [];

        return response()->json([
            'message' => 'Paket dibuat. Selesaikan pembayaran agar pencarian tutor dapat dimulai.',
            'data' => $this->formatPackage($package->fresh([
                'plan', 'promotion', 'subjects.assignedTeacher', 'subjects.learningTopics', 'subjects.sessions.booking', 'orders',
            ])),
            'order' => [
                'order_id' => $order->id,
                'order_number' => $order->order_id,
                'amount' => (float) $order->amount,
                'status' => $order->status,
                'payment_due_at' => $package->payment_due_at,
                'subject' => $snapshot['subject'] ?? 'Paket belajar',
                'type' => ($snapshot['method'] ?? 'online').' - '.($snapshot['type'] ?? 'Paket Privat'),
                'tutor_name' => $snapshot['teacher_name'] ?? 'Dicari setelah pembayaran',
                'scheduled_at' => $snapshot['start_at'] ?? null,
                'subtotal_amount' => (float) $order->subtotal_amount,
                'discount_amount' => (float) $order->discount_amount,
                'package_name' => $snapshot['package_name'] ?? $plan->name,
                'duration_hours' => $durationHours,
                'total_learning_hours' => $plan->session_count * $durationHours,
            ],
        ], 201);
    }

    public function claim(Request $request, int $promotion)
    {
        $userId = $request->user()->id;
        $selectedPromotion = Promotion::query()->find($promotion);
        abort_if($selectedPromotion === null, 404, 'Penawaran tidak ditemukan atau sudah dihapus.');

        [$claimed, $alreadyClaimed] = DB::transaction(function () use ($selectedPromotion, $userId) {
            $lockedPromotion = Promotion::query()->lockForUpdate()->find($selectedPromotion->id);
            abort_if($lockedPromotion === null, 404, 'Penawaran tidak ditemukan atau sudah dihapus.');
            abort_unless($lockedPromotion->isAvailable(), 422, 'Penawaran sudah berakhir atau dinonaktifkan.');
            $existing = PromotionClaim::query()
                ->where('promotion_id', $lockedPromotion->id)
                ->where('user_id', $userId)
                ->where('status', 'available')
                ->lockForUpdate()
                ->first();
            if ($existing) {
                return [$existing, true];
            }

            $usedQuota = $lockedPromotion->claims()
                ->whereIn('status', ['available', 'reserved', 'used'])
                ->lockForUpdate()
                ->count();
            abort_if(
                $lockedPromotion->total_quota !== null && $usedQuota >= $lockedPromotion->total_quota,
                422,
                'Kuota penawaran sudah habis.'
            );
            $userUsage = $lockedPromotion->claims()
                ->where('user_id', $userId)
                ->whereIn('status', ['available', 'reserved', 'used'])
                ->count();
            abort_if($userUsage >= $lockedPromotion->per_user_limit, 422, 'Batas klaim akun telah tercapai.');

            return [
                PromotionClaim::create([
                    'promotion_id' => $lockedPromotion->id,
                    'user_id' => $userId,
                    'status' => 'available',
                    'claimed_at' => now(),
                ]),
                false,
            ];
        }, 3);

        if ($alreadyClaimed) {
            return response()->json(['message' => 'Penawaran sudah berada di Voucher Saya.', 'data' => $claimed]);
        }

        return response()->json(['message' => 'Penawaran masuk ke Voucher Saya.', 'data' => $claimed], 201);
    }

    public function vouchers(Request $request)
    {
        return response()->json(
            PromotionClaim::query()
                ->where('user_id', $request->user()->id)
                ->with('promotion')
                ->latest('claimed_at')
                ->paginate(30)
        );
    }

    public function retryMatching(
        Request $request,
        LearningPackage $learningPackage,
        PackageCheckoutService $checkoutService
    ) {
        abort_unless($learningPackage->student_id === $request->user()->id, 403);
        $subjectIds = DB::transaction(function () use ($learningPackage, $request) {
            $package = LearningPackage::query()
                ->with('subjects.bookingRequest')
                ->lockForUpdate()
                ->findOrFail($learningPackage->id);
            abort_unless(
                in_array($package->status, ['matching', 'teacher_pending', 'no_teacher'], true),
                422,
                'Pencarian paket ini sudah tidak dapat diulang.'
            );

            $subjects = $package->subjects->filter(function (PackageSubject $subject) {
                $requestStatus = $subject->bookingRequest?->status;
                return $subject->status === 'no_teacher' || $requestStatus === 'no_teacher';
            });
            abort_if($subjects->isEmpty(), 422, 'Tidak ada mata pelajaran yang perlu dicari ulang.');

            foreach ($subjects as $subject) {
                $bookingRequest = $subject->bookingRequest;
                $currentRadius = (int) ($bookingRequest?->search_radius_km ?? 3);
                $nextRadius = match ($currentRadius) {
                    3 => 5,
                    5 => 8,
                    default => 12,
                };
                $bookingRequest?->update([
                    'status' => 'matching',
                    'matched_teacher_id' => null,
                    'teacher_response_deadline' => null,
                    'search_radius_km' => $nextRadius,
                    'search_started_at' => now(),
                    'search_expires_at' => now()->addHours(48),
                ]);
                $subject->update(['status' => 'matching']);
                if ($bookingRequest && $nextRadius > $currentRadius) {
                    MatchingOperationLog::create([
                        'booking_request_id' => $bookingRequest->id,
                        'actor_id' => $request->user()->id,
                        'action' => 'radius_expanded',
                        'reason' => 'Murid mengulang pencarian paket pada jangkauan yang lebih luas.',
                        'before_state' => [
                            'status' => 'no_teacher',
                            'search_radius_km' => $currentRadius,
                        ],
                        'after_state' => [
                            'status' => 'matching',
                            'search_radius_km' => $nextRadius,
                        ],
                        'metadata' => [
                            'source' => 'student_package',
                            'package_id' => $package->id,
                            'package_subject_id' => $subject->id,
                        ],
                    ]);
                }
            }
            $package->update(['status' => 'matching']);

            return $subjects->pluck('id')->all();
        }, 3);

        $noTeacher = false;
        PackageSubject::query()
            ->whereIn('id', $subjectIds)
            ->with('bookingRequest')
            ->get()
            ->each(function (PackageSubject $subject) use ($checkoutService, &$noTeacher) {
                if (!$checkoutService->dispatchSubject($subject)) {
                    $subject->update(['status' => 'no_teacher']);
                    $noTeacher = true;
                }
            });
        $learningPackage->update(['status' => $noTeacher ? 'no_teacher' : 'matching']);

        return response()->json([
            'message' => $noTeacher
                ? 'Pencarian diulang, tetapi belum ada tutor yang tersedia. Coba kembali nanti.'
                : 'Radar kembali mencari tutor pada jangkauan yang lebih luas.',
        ]);
    }

    public function cancel(Request $request, LearningPackage $learningPackage)
    {
        abort_unless($learningPackage->student_id === $request->user()->id, 403);
        [$teacherIds, $refundPending] = DB::transaction(function () use ($learningPackage) {
            $package = LearningPackage::query()
                ->with(['subjects.sessions', 'subjects.bookingRequest.offers', 'promotionClaims', 'orders'])
                ->lockForUpdate()
                ->findOrFail($learningPackage->id);
            abort_unless(
                in_array($package->status, ['matching', 'teacher_pending', 'no_teacher'], true),
                422,
                'Paket ini tidak dapat dibatalkan dari tahap pencarian.'
            );

            $paidOrder = $package->orders->where('status', 'paid')->sortByDesc('id')->first();
            $refundPending = (bool) $paidOrder;
            $nextStatus = $refundPending ? 'refund_pending' : 'cancelled';
            $teacherIds = collect();
            foreach ($package->subjects as $subject) {
                $subject->update(['status' => $nextStatus]);
                $subject->sessions()->update(['status' => $nextStatus]);
                $bookingRequest = $subject->bookingRequest;
                if ($bookingRequest) {
                    $teacherIds = $teacherIds->merge(
                        $bookingRequest->offers
                            ->whereIn('status', ['pending', 'accepted'])
                            ->pluck('teacher_id')
                    );
                    $bookingRequest->offers()
                        ->whereIn('status', ['pending', 'accepted'])
                        ->update(['status' => 'cancelled', 'responded_at' => now()]);
                    $bookingRequest->update(['status' => $nextStatus]);
                }
            }
            $package->promotionClaims()
                ->where('status', 'reserved')
                ->update([
                    'status' => 'available',
                    'released_at' => now(),
                    'learning_package_id' => null,
                ]);
            PackageRenewal::query()
                ->where('new_package_id', $package->id)
                ->whereIn('status', ['requested', 'tutor_accepted'])
                ->update(['status' => 'cancelled']);
            $package->update(['status' => $nextStatus]);
            if ($paidOrder) {
                $paidOrder->update(['status' => 'refund_pending']);
                Refund::firstOrCreate(
                    ['order_id' => $paidOrder->id],
                    [
                        'user_id' => $package->student_id,
                        'booking_id' => $paidOrder->booking_id,
                        'amount' => $paidOrder->amount,
                        'reason' => 'Paket dibatalkan murid saat pencarian tutor',
                        'status' => 'pending',
                    ]
                );
            }

            return [$teacherIds->filter()->unique()->values(), $refundPending];
        }, 3);

        $teacherIds->each(fn (int $teacherId) => Notification::create([
            'user_id' => $teacherId,
            'title' => 'Permintaan paket dibatalkan',
            'message' => "Murid membatalkan pencarian paket {$learningPackage->package_code}. Penawaran tidak lagi aktif.",
            'type' => 'info',
        ]));

        if ($refundPending) {
            \App\Models\User::query()->where('role', 'admin')->pluck('id')->each(
                fn (int $adminId) => Notification::create([
                    'user_id' => $adminId,
                    'title' => 'Refund paket menunggu proses',
                    'message' => "Paket {$learningPackage->package_code} dibatalkan saat pencarian tutor.",
                    'type' => 'warning',
                ])
            );
        }

        return response()->json([
            'message' => $refundPending
                ? 'Pencarian dihentikan. Pengembalian dana masuk antrean admin.'
                : 'Pencarian paket dibatalkan dan voucher dikembalikan.',
        ]);
    }

    public function previewPromotion(
        Request $request,
        HourlyRateService $rateService,
        PackageCheckoutService $checkoutService
    ) {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:60'],
            'promotion_claim_id' => ['nullable', 'integer'],
            'package_plan_id' => ['required', 'integer', 'exists:package_plans,id'],
            'education_level' => ['required', Rule::in(EducationCatalog::LEVELS)],
            'learning_mode' => ['required', Rule::in(['online', 'offline'])],
            'duration_hours' => ['nullable', 'integer', Rule::in([1, 2])],
            'subjects' => ['required', 'array', 'min:1'],
            'subjects.*.curriculum_subject_id' => ['required', 'integer', 'exists:curriculum_subjects,id'],
            'subjects.*.session_count' => ['required', 'integer', 'min:1'],
        ]);
        abort_if(filled($validated['code'] ?? null) && filled($validated['promotion_claim_id'] ?? null), 422);

        [$promotion, $claim] = $this->resolvePromotion($request->user()->id, [
            'promotion_code' => $validated['code'] ?? null,
            'promotion_claim_id' => $validated['promotion_claim_id'] ?? null,
        ]);
        $durationHours = (int) ($validated['duration_hours'] ?? 1);
        $subjects = CurriculumSubject::query()
            ->whereIn('id', collect($validated['subjects'])->pluck('curriculum_subject_id'))
            ->get()
            ->keyBy('id');
        $subtotal = collect($validated['subjects'])->sum(function (array $item) use ($subjects, $validated, $rateService, $durationHours) {
            $subject = $subjects[$item['curriculum_subject_id']] ?? null;
            abort_unless($subject, 422, 'Mata pelajaran tidak ditemukan.');
            return $rateService->resolve(
                $subject->name,
                $validated['education_level'],
                'private',
                $validated['learning_mode']
            ) * $durationHours * $item['session_count'];
        });
        $discount = $promotion
            ? $checkoutService->calculateDiscount(
                $promotion,
                $subtotal,
                $validated['package_plan_id'],
                $validated['education_level'],
                $subjects->pluck('name')->all(),
                $validated['learning_mode'],
                $request->user(),
                $claim
            )
            : 0;

        return response()->json([
            'promotion' => $promotion,
            'duration_hours' => $durationHours,
            'total_learning_hours' => $durationHours * collect($validated['subjects'])->sum('session_count'),
            'lines' => collect($validated['subjects'])->map(function (array $item) use ($subjects, $validated, $rateService, $durationHours) {
                $subject = $subjects[$item['curriculum_subject_id']];
                $unit = $rateService->resolve(
                    $subject->name,
                    $validated['education_level'],
                    'private',
                    $validated['learning_mode']
                );
                return [
                    'curriculum_subject_id' => $subject->id,
                    'subject_name' => $subject->name,
                    'session_count' => $item['session_count'],
                    'duration_hours' => $durationHours,
                    'unit_price' => $unit,
                    'meeting_price' => $unit * $durationHours,
                    'subtotal_amount' => $unit * $durationHours * $item['session_count'],
                ];
            })->values(),
            'subtotal_amount' => $subtotal,
            'discount_amount' => $discount,
            'total_amount' => $subtotal - $discount,
        ]);
    }

    private function resolvePromotion(int $userId, array $validated): array
    {
        if (!empty($validated['promotion_claim_id'])) {
            $claim = PromotionClaim::query()
                ->where('user_id', $userId)
                ->where('status', 'available')
                ->with('promotion')
                ->find($validated['promotion_claim_id']);
            abort_unless($claim && $claim->promotion, 422, 'Voucher tidak ditemukan atau sudah tidak dapat digunakan.');
            abort_unless($claim->promotion->isAvailable(), 422, 'Voucher sudah berakhir atau dinonaktifkan.');
            return [$claim->promotion, $claim];
        }
        if (!empty($validated['promotion_code'])) {
            $promotion = Promotion::query()
                ->whereRaw('UPPER(code) = ?', [mb_strtoupper(trim($validated['promotion_code']))])
                ->first();
            abort_unless($promotion, 422, 'Kode promo tidak ditemukan.');
            abort_unless($promotion->isAvailable(), 422, 'Kode promo sudah berakhir atau dinonaktifkan.');
            $availableClaim = PromotionClaim::query()
                ->where('user_id', $userId)
                ->where('promotion_id', $promotion->id)
                ->where('status', 'available')
                ->oldest('claimed_at')
                ->first();
            abort_if(
                $promotion->claim_required && !$availableClaim,
                422,
                'Promo ini harus diklaim lebih dahulu dari halaman penawaran.'
            );
            return [$promotion, $availableClaim];
        }

        return [null, null];
    }

    private function assertStudentHasNoConflict(int $studentId, Carbon $start, Carbon $end): void
    {
        $bookingConflict = Booking::query()
            ->where('student_id', $studentId)
            ->whereIn('status', [
                'awaiting_payment', 'payment_submitted', 'confirmed', 'in_progress',
                'awaiting_student_approval', 'disputed', 'admin_review_required',
            ])
            ->where('start_at', '<', $end)
            ->where('end_at', '>', $start)
            ->exists();
        $packageConflict = PackageSession::query()
            ->whereHas('subject.package', fn ($query) => $query
                ->where('student_id', $studentId)
                ->whereNotIn('status', ['cancelled', 'payment_expired', 'completed']))
            ->where('scheduled_start_at', '<', $end)
            ->where('scheduled_end_at', '>', $start)
            ->exists();
        abort_if($bookingConflict || $packageConflict, 422, 'Jadwal bertabrakan dengan sesi lain.');
    }

    private function canRenew(LearningPackage $package): bool
    {
        return $package->expires_at
            && now()->gte($package->expires_at->copy()->subDays(7))
            && in_array($package->status, ['active', 'completed'], true);
    }

    private function formatPackage(LearningPackage $package): array
    {
        $completed = $package->subjects
            ->flatMap->sessions
            ->filter(fn (PackageSession $session) => $session->booking?->status === 'completed')
            ->count();
        if ((int) $package->used_sessions !== $completed) {
            $package->used_sessions = $completed;
        }

        return [
            'id' => $package->id,
            'package_code' => $package->package_code,
            'status' => $package->status,
            'plan' => $package->plan,
            'education_level' => $package->education_level,
            'grade' => $package->grade,
            'learning_mode' => $package->learning_mode,
            'duration_hours' => (int) ($package->duration_hours ?? 1),
            'total_learning_hours' => $package->total_sessions * (int) ($package->duration_hours ?? 1),
            'total_sessions' => $package->total_sessions,
            'used_sessions' => $completed,
            'remaining_sessions' => max(0, $package->total_sessions - $completed),
            'subtotal_amount' => (float) $package->subtotal_amount,
            'discount_amount' => (float) $package->discount_amount,
            'total_amount' => (float) $package->total_amount,
            'payment_due_at' => $package->payment_due_at,
            'starts_at' => $package->starts_at,
            'expires_at' => $package->expires_at,
            'promotion' => $package->promotion,
            'can_renew' => $this->canRenew($package),
            'subjects' => $package->subjects->map(fn (PackageSubject $subject) => [
                'id' => $subject->id,
                'curriculum_subject_id' => $subject->curriculum_subject_id,
                'name' => $subject->subject_name,
                'chapter' => $subject->chapter,
                'subtopic' => $subject->subtopic,
                'curriculum_chapter_ids' => $subject->curriculum_chapter_ids ?? [],
                'learning_topic_ids' => $subject->learning_topic_ids ?? [],
                'learning_topics' => $subject->learningTopics->map(fn (PackageLearningTopic $topic) => [
                    'id' => $topic->id,
                    'catalog_topic_id' => $topic->learning_topic_id,
                    'chapter' => $topic->chapter,
                    'title' => $topic->title,
                    'status' => $topic->status,
                ])->values(),
                'learning_goal' => $subject->learning_goal,
                'allocated_sessions' => $subject->allocated_sessions,
                'unit_price' => (float) $subject->unit_price,
                'status' => $subject->status,
                'teacher' => $subject->assignedTeacher ? [
                    'id' => $subject->assignedTeacher->id,
                    'name' => $subject->assignedTeacher->name,
                    'avatar_url' => $subject->assignedTeacher->teacherProfile?->photo
                        ? asset('storage/'.$subject->assignedTeacher->teacherProfile->photo)
                        : null,
                ] : null,
                'sessions' => $subject->sessions->map(fn (PackageSession $session) => [
                    'id' => $session->id,
                    'sequence' => $session->sequence,
                    'start_at' => $session->scheduled_start_at,
                    'end_at' => $session->scheduled_end_at,
                    'status' => $session->booking?->status ?? $session->status,
                    'booking_id' => $session->booking_id,
                ])->values(),
            ])->values(),
            'latest_order' => $package->orders->first(),
        ];
    }
    private function compactLabel($values): ?string
    {
        $items = collect($values)->filter()->map(fn ($value) => trim((string) $value))->unique()->values();
        if ($items->isEmpty()) return null;
        $first = (string) $items->first();
        return $items->count() > 1 ? $first.' +'.($items->count() - 1) : $first;
    }

}
