<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\ClassroomMessage;
use App\Models\Notification;
use App\Models\Rating;
use App\Models\ScheduleChangeResponse;
use App\Models\Setting;
use App\Models\TeacherAppeal;
use App\Models\TeacherOffer;
use App\Models\TeacherPayoutRequest;
use App\Models\TeacherPointLedger;
use App\Models\TeacherProfile;
use App\Models\User;
use App\Services\TeacherPointService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class TeacherOperationsController extends Controller
{
    public function dashboard(Request $request)
    {
        $teacherId = (int) $request->user()->id;
        $profile = TeacherProfile::query()->where('user_id', $teacherId)->first();
        $activeStatuses = [
            'confirmed',
            'in_progress',
            'awaiting_student_approval',
            'disputed',
            'absence_review',
            'admin_review_required',
        ];
        $classes = Booking::query()
            ->where('teacher_id', $teacherId)
            ->whereIn('status', [...$activeStatuses, 'completed'])
            ->with(['bookingRequest:id,subject_name,chapter', 'participants:id,booking_id,student_id,status'])
            ->latest('start_at')
            ->limit(100)
            ->get();
        $nextSession = $classes
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->filter(fn ($booking) => $booking->end_at->isFuture())
            ->sortBy('start_at')
            ->first();

        $pendingOffers = TeacherOffer::query()
            ->where('teacher_id', $teacherId)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->count();
        $unreadMessages = ClassroomMessage::query()
            ->where('sender_id', '!=', $teacherId)
            ->whereHas('booking', fn ($query) => $query->where('teacher_id', $teacherId))
            ->whereDoesntHave('reads', fn ($query) => $query->where('user_id', $teacherId))
            ->count();
        $scheduleAnswers = ScheduleChangeResponse::query()
            ->where('user_id', $teacherId)
            ->where('decision', 'pending')
            ->whereHas('request', fn ($query) => $query->where('status', 'pending'))
            ->count();

        $balance = Booking::query()
            ->where('teacher_id', $teacherId)
            ->where('status', 'completed')
            ->selectRaw("COALESCE(SUM(CASE WHEN payout_status = 'ready' THEN teacher_net_amount ELSE 0 END), 0) AS available")
            ->selectRaw("COALESCE(SUM(CASE WHEN payout_status = 'requested' THEN teacher_net_amount ELSE 0 END), 0) AS requested")
            ->selectRaw("COALESCE(SUM(CASE WHEN payout_status = 'locked' THEN teacher_net_amount ELSE 0 END), 0) AS held")
            ->first();
        $rating = Rating::query()
            ->where('teacher_id', $teacherId)
            ->selectRaw('COUNT(*) AS rating_count, COALESCE(AVG(rating), 0) AS rating_average')
            ->first();

        return response()->json([
            'teacher' => [
                'name' => $request->user()->name,
                'points' => (int) ($profile?->points ?? 0),
                'is_accepting_requests' => (bool) ($profile?->is_accepting_requests ?? false),
                'suspended_until' => $profile?->suspended_until,
            ],
            'priorities' => [
                'pending_offers' => $pendingOffers,
                'unread_messages' => $unreadMessages,
                'unread_notifications' => Notification::query()
                    ->where('user_id', $teacherId)
                    ->where('is_read', false)
                    ->count(),
                'schedule_responses' => $scheduleAnswers,
                'pending_appeals' => TeacherAppeal::query()
                    ->where('teacher_id', $teacherId)
                    ->where('status', 'pending')
                    ->count(),
            ],
            'classes' => [
                'active' => $classes->whereIn('status', $activeStatuses)->count(),
                'in_progress' => $classes->where('status', 'in_progress')->count(),
                'awaiting_student' => $classes->where('status', 'awaiting_student_approval')->count(),
                'student_count' => $classes->flatMap->participants->pluck('student_id')->unique()->count(),
                'next' => $nextSession ? [
                    'id' => $nextSession->id,
                    'subject' => $nextSession->bookingRequest?->subject_name ?? 'Bimbingan',
                    'chapter' => $nextSession->bookingRequest?->chapter,
                    'start_at' => $nextSession->start_at,
                    'end_at' => $nextSession->end_at,
                    'learning_mode' => $nextSession->learning_mode,
                    'status' => $nextSession->status,
                ] : null,
            ],
            'earnings' => [
                'held' => round((float) ($balance?->held ?? 0)),
                'available' => round((float) ($balance?->available ?? 0)),
                'requested' => round((float) ($balance?->requested ?? 0)),
            ],
            'rating' => [
                'average' => round((float) ($rating?->rating_average ?? 0), 1),
                'count' => (int) ($rating?->rating_count ?? 0),
            ],
        ]);
    }

    public function performance(Request $request)
    {
        $teacherId = (int) $request->user()->id;
        $profile = TeacherProfile::query()->where('user_id', $teacherId)->firstOrFail();
        $appealDays = max(
            1,
            min(30, (int) (Setting::where('key', 'teacher_appeal_window_days')->value('value') ?? 7))
        );
        $entries = TeacherPointLedger::query()
            ->where('teacher_id', $teacherId)
            ->with(['appeal', 'booking.bookingRequest:id,subject_name'])
            ->latest()
            ->limit(100)
            ->get()
            ->map(function (TeacherPointLedger $entry) use ($appealDays) {
                return [
                    'id' => $entry->id,
                    'booking_id' => $entry->booking_id,
                    'subject' => $entry->booking?->bookingRequest?->subject_name,
                    'change' => (int) $entry->change,
                    'balance_after' => (int) $entry->balance_after,
                    'reason' => $entry->reason,
                    'notes' => $entry->notes,
                    'created_at' => $entry->created_at,
                    'can_appeal' => $entry->change < 0
                        && !$entry->appeal
                        && $entry->created_at->gte(now()->subDays($appealDays)),
                    'appeal_deadline' => $entry->change < 0
                        ? $entry->created_at->copy()->addDays($appealDays)
                        : null,
                    'appeal' => $entry->appeal ? [
                        'id' => $entry->appeal->id,
                        'status' => $entry->appeal->status,
                        'reason' => $entry->appeal->reason,
                        'review_notes' => $entry->appeal->review_notes,
                        'created_at' => $entry->appeal->created_at,
                        'evidence_url' => $entry->appeal->evidence_path
                            ? "teacher-appeals/{$entry->appeal->id}/evidence"
                            : null,
                    ] : null,
                ];
            });
        $ratings = Rating::query()
            ->where('teacher_id', $teacherId)
            ->with(['student:id,name', 'booking.bookingRequest:id,subject_name'])
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (Rating $rating) => [
                'id' => $rating->id,
                'booking_id' => $rating->booking_id,
                'student_name' => $rating->student?->name ?? 'Murid BimbelKu',
                'subject' => $rating->booking?->bookingRequest?->subject_name,
                'rating' => (int) $rating->rating,
                'review' => $rating->review,
                'created_at' => $rating->created_at,
            ]);

        return response()->json([
            'points' => (int) $profile->points,
            'recommendation_status' => $this->recommendationStatus((int) $profile->points),
            'suspended_until' => $profile->suspended_until,
            'rating' => [
                'average' => round((float) $ratings->avg('rating'), 1),
                'count' => $ratings->count(),
                'distribution' => collect([5, 4, 3, 2, 1])->mapWithKeys(
                    fn ($star) => [(string) $star => $ratings->where('rating', $star)->count()]
                ),
            ],
            'ratings' => $ratings,
            'point_history' => $entries,
            'appeal_window_days' => $appealDays,
        ]);
    }

    public function storeAppeal(Request $request, TeacherPointLedger $teacherPointLedger)
    {
        abort_unless((int) $teacherPointLedger->teacher_id === (int) $request->user()->id, 403);
        $appealDays = max(
            1,
            min(30, (int) (Setting::where('key', 'teacher_appeal_window_days')->value('value') ?? 7))
        );
        abort_unless($teacherPointLedger->change < 0, 422, 'Riwayat ini bukan penalti yang dapat dibanding.');
        abort_unless(
            $teacherPointLedger->created_at->gte(now()->subDays($appealDays)),
            422,
            'Batas waktu pengajuan banding telah berakhir.'
        );

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:30', 'max:3000'],
            'evidence' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);
        $path = $request->hasFile('evidence')
            ? $request->file('evidence')->store('teacher_appeals', 'local')
            : null;

        try {
            $appeal = DB::transaction(function () use ($request, $teacherPointLedger, $validated, $path) {
                $entry = TeacherPointLedger::query()->lockForUpdate()->findOrFail($teacherPointLedger->id);
                if ($entry->appeal()->exists()) {
                    throw ValidationException::withMessages(['appeal' => 'Banding untuk penalti ini sudah diajukan.']);
                }
                $record = TeacherAppeal::create([
                    'teacher_id' => $request->user()->id,
                    'teacher_point_ledger_id' => $entry->id,
                    'reason' => trim($validated['reason']),
                    'evidence_path' => $path,
                    'evidence_name' => $request->file('evidence')?->getClientOriginalName(),
                    'status' => 'pending',
                ]);
                User::query()
                    ->where('role', 'admin')
                    ->where('status', 'active')
                    ->pluck('id')
                    ->each(fn ($adminId) => Notification::updateOrCreate(
                        ['unique_key' => "teacher-appeal:{$record->id}:{$adminId}"],
                        [
                            'user_id' => $adminId,
                            'title' => 'Banding penalti tutor',
                            'message' => "{$request->user()->name} mengajukan banding atas penalti {$entry->change} poin.",
                            'type' => 'warning',
                            'target_url' => '/admin/cases',
                            'is_read' => false,
                        ]
                    ));

                return $record;
            }, 3);
        } catch (\Throwable $exception) {
            if ($path) Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Banding berhasil dikirim. Penalti tetap berlaku sampai admin memutuskan.',
            'data' => $appeal,
        ], 201);
    }

    public function payoutRequests(Request $request)
    {
        return response()->json(TeacherPayoutRequest::query()
            ->where('teacher_id', $request->user()->id)
            ->latest('requested_at')
            ->limit(100)
            ->get()
            ->map(fn (TeacherPayoutRequest $item) => [
                'id' => $item->id,
                'booking_ids' => $item->booking_ids,
                'gross_amount' => (float) $item->gross_amount,
                'commission_amount' => (float) $item->commission_amount,
                'net_amount' => (float) $item->net_amount,
                'bank_name' => $item->bank_name,
                'account_number_masked' => $this->maskAccount($item->getRawOriginal('account_number')),
                'account_name' => $item->account_name,
                'status' => $item->status,
                'review_notes' => $item->review_notes,
                'requested_at' => $item->requested_at,
                'processed_at' => $item->processed_at,
            ]));
    }

    public function requestPayout(Request $request)
    {
        $validated = $request->validate([
            'booking_ids' => ['nullable', 'array', 'min:1', 'max:200'],
            'booking_ids.*' => ['integer', 'distinct', 'exists:bookings,id'],
        ]);
        $teacher = $request->user()->load('teacherProfile');
        $profile = $teacher->teacherProfile;
        if (!$profile || blank($profile->bank_name) || blank($profile->account_number) || blank($profile->account_name)) {
            return response()->json(['message' => 'Lengkapi rekening pencairan sebelum mengajukan saldo.'], 422);
        }
        if ($profile->payout_hold_until?->isFuture()) {
            return response()->json([
                'message' => 'Pencairan ditahan sampai '.$profile->payout_hold_until->translatedFormat('d M Y, H:i').' WIB.',
            ], 422);
        }

        $record = DB::transaction(function () use ($validated, $teacher) {
            $lockedProfile = TeacherProfile::query()
                ->where('user_id', $teacher->id)
                ->lockForUpdate()
                ->firstOrFail();
            if ($lockedProfile->payout_hold_until?->isFuture()) {
                abort(422, 'Pencairan masih ditahan setelah perubahan rekening.');
            }
            $bookings = Booking::query()
                ->where('teacher_id', $teacher->id)
                ->where('status', 'completed')
                ->where('payout_status', 'ready')
                ->when(!empty($validated['booking_ids']), fn ($query) => $query->whereIn('id', $validated['booking_ids']))
                ->lockForUpdate()
                ->get();
            if ($bookings->isEmpty()) {
                abort(422, 'Belum ada saldo tersedia yang dapat diajukan.');
            }
            if (!empty($validated['booking_ids']) && $bookings->count() !== count($validated['booking_ids'])) {
                abort(422, 'Sebagian sesi sudah diajukan atau belum siap dicairkan.');
            }

            $gross = (float) $bookings->sum('gross_amount');
            $net = (float) $bookings->sum('teacher_net_amount');
            $record = TeacherPayoutRequest::create([
                'teacher_id' => $teacher->id,
                'booking_ids' => $bookings->pluck('id')->sort()->values()->all(),
                'gross_amount' => $gross,
                'commission_amount' => max(0, $gross - $net),
                'net_amount' => $net,
                'bank_name' => $lockedProfile->bank_name,
                'account_number' => $lockedProfile->account_number,
                'account_name' => $lockedProfile->account_name,
                'bank_details_version' => (int) $lockedProfile->bank_details_version,
                'status' => 'pending',
                'requested_at' => now(),
            ]);
            $bookings->each->update([
                'payout_status' => 'requested',
                'payout_request_id' => $record->id,
            ]);

            Notification::updateOrCreate(
                ['unique_key' => "teacher-payout-request:{$record->id}:{$teacher->id}"],
                [
                    'user_id' => $teacher->id,
                    'title' => 'Pencairan diajukan',
                    'message' => 'Saldo Rp'.number_format($net, 0, ',', '.').' menunggu pemeriksaan admin.',
                    'type' => 'info',
                    'target_url' => '/guru/gaji',
                    'is_read' => false,
                ]
            );
            User::query()->where('role', 'admin')->where('status', 'active')->pluck('id')
                ->each(fn ($adminId) => Notification::updateOrCreate(
                    ['unique_key' => "teacher-payout-request:{$record->id}:{$adminId}"],
                    [
                        'user_id' => $adminId,
                        'title' => 'Pengajuan pencairan tutor',
                        'message' => "{$teacher->name} mengajukan Rp".number_format($net, 0, ',', '.').'.',
                        'type' => 'warning',
                        'target_url' => '/admin/finance',
                        'is_read' => false,
                    ]
                ));

            return $record;
        }, 3);

        return response()->json([
            'message' => 'Pencairan berhasil diajukan. Saldo dipindahkan ke status menunggu admin.',
            'data' => $record,
        ], 201);
    }

    public function resolveAppeal(
        Request $request,
        TeacherAppeal $teacherAppeal,
        TeacherPointService $pointService
    ) {
        $validated = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'notes' => ['required', 'string', 'min:20', 'max:3000'],
        ]);

        DB::transaction(function () use ($request, $teacherAppeal, $validated, $pointService) {
            $appeal = TeacherAppeal::query()
                ->with('pointEntry.booking')
                ->lockForUpdate()
                ->findOrFail($teacherAppeal->id);
            abort_unless($appeal->status === 'pending', 422, 'Banding ini sudah diputuskan.');
            $entry = $appeal->pointEntry;
            abort_unless($entry && $entry->change < 0, 422, 'Riwayat penalti tidak dapat ditemukan.');

            $appeal->update([
                'status' => $validated['decision'],
                'reviewed_by' => $request->user()->id,
                'review_notes' => $validated['notes'],
                'reviewed_at' => now(),
            ]);

            if ($validated['decision'] === 'approved') {
                $pointService->change(
                    (int) $appeal->teacher_id,
                    abs((int) $entry->change),
                    'Banding penalti disetujui',
                    $entry->booking,
                    $request->user(),
                    $validated['notes']
                );
                $teacher = User::query()->with('teacherProfile')->findOrFail($appeal->teacher_id);
                if ($teacher->status === 'banned' && (int) $teacher->teacherProfile?->points > 0) {
                    $teacher->update(['status' => $teacher->teacherProfile?->verified_at ? 'active' : 'pending']);
                }
            }

            Notification::updateOrCreate(
                ['unique_key' => "teacher-appeal-result:{$appeal->id}"],
                [
                    'user_id' => $appeal->teacher_id,
                    'title' => $validated['decision'] === 'approved'
                        ? 'Banding penalti disetujui'
                        : 'Banding penalti ditolak',
                    'message' => $validated['decision'] === 'approved'
                        ? 'Poin dari penalti telah dipulihkan. Buka halaman performa untuk rinciannya.'
                        : 'Admin mempertahankan penalti. Catatan keputusan tersedia pada halaman performa.',
                    'type' => $validated['decision'] === 'approved' ? 'success' : 'warning',
                    'target_url' => '/guru/performa',
                    'is_read' => false,
                ]
            );
        }, 3);

        return response()->json(['message' => 'Keputusan banding tutor berhasil disimpan.']);
    }

    private function recommendationStatus(int $points): string
    {
        return match (true) {
            $points >= 151 => 'Prioritas tinggi',
            $points >= 121 => 'Normal',
            $points >= 81 => 'Prioritas berkurang',
            $points >= 41 => 'Terbatas',
            $points >= 1 => 'Prioritas terendah',
            default => 'Dinonaktifkan',
        };
    }

    private function maskAccount(?string $value): string
    {
        $digits = preg_replace('/\D+/', '', (string) $value) ?? '';
        return $digits === '' ? '-' : str_repeat('•', max(0, strlen($digits) - 4)).substr($digits, -4);
    }
}
