<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\PackageSession;
use App\Models\ScheduleChangeRequest;
use App\Models\ScheduleChangeResponse;
use App\Models\Setting;
use App\Services\TeacherMatchingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ScheduleChangeController extends Controller
{
    private const ACTIVE_STATUSES = [
        'confirmed',
        'in_progress',
        'awaiting_student_approval',
        'disputed',
        'absence_review',
        'admin_review_required',
    ];

    public function store(
        Request $request,
        Booking $booking,
        TeacherMatchingService $matchingService
    ) {
        $role = $this->authorizeMember($request, $booking);
        $validated = $request->validate([
            'proposed_start_at' => ['required', 'date'],
            'reason' => ['required', 'string', 'min:20', 'max:1500'],
        ]);

        $proposedStart = Carbon::parse($validated['proposed_start_at']);
        $proposedEnd = $proposedStart->copy()->addMinutes(
            max(1, $booking->start_at->diffInMinutes($booking->end_at))
        );
        $this->validateProposal($booking, $proposedStart, $proposedEnd, $matchingService);

        $change = DB::transaction(function () use (
            $request,
            $booking,
            $role,
            $validated,
            $proposedStart,
            $proposedEnd,
            $matchingService
        ) {
            $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);
            $this->authorizeMember($request, $lockedBooking);
            $this->validateProposal($lockedBooking, $proposedStart, $proposedEnd, $matchingService);

            if ($lockedBooking->scheduleChangeRequests()->where('status', 'pending')->lockForUpdate()->exists()) {
                throw ValidationException::withMessages([
                    'schedule' => 'Masih ada permintaan perubahan jadwal yang menunggu jawaban.',
                ]);
            }

            $responseHours = max(
                1,
                min(48, (int) (Setting::where('key', 'schedule_change_response_hours')->value('value') ?? 24))
            );
            $record = ScheduleChangeRequest::create([
                'booking_id' => $lockedBooking->id,
                'requested_by' => $request->user()->id,
                'requester_role' => $role,
                'original_start_at' => $lockedBooking->start_at,
                'original_end_at' => $lockedBooking->end_at,
                'proposed_start_at' => $proposedStart,
                'proposed_end_at' => $proposedEnd,
                'reason' => trim($validated['reason']),
                'status' => 'pending',
                'expires_at' => now()->addHours($responseHours)->min($lockedBooking->start_at),
            ]);

            $requiredUserIds = $this->requiredResponders($lockedBooking, (int) $request->user()->id);
            foreach ($requiredUserIds as $userId) {
                ScheduleChangeResponse::create([
                    'schedule_change_request_id' => $record->id,
                    'user_id' => $userId,
                    'decision' => 'pending',
                ]);
                Notification::updateOrCreate(
                    ['unique_key' => "schedule-change:{$record->id}:{$userId}"],
                    [
                        'user_id' => $userId,
                        'title' => 'Perubahan jadwal menunggu jawaban',
                        'message' => 'Jadwal baru hanya berlaku setelah seluruh pihak menyetujuinya.',
                        'type' => 'warning',
                        'target_url' => $this->targetUrlFor($userId, $lockedBooking),
                        'is_read' => false,
                    ]
                );
            }

            return $record->load(['requester:id,name,role', 'responses.user:id,name,role']);
        }, 3);

        return response()->json([
            'message' => 'Permintaan perubahan jadwal dikirim. Jadwal lama tetap berlaku sampai disetujui.',
            'data' => $change,
        ], 201);
    }

    public function respond(
        Request $request,
        Booking $booking,
        ScheduleChangeRequest $scheduleChangeRequest,
        TeacherMatchingService $matchingService
    ) {
        $this->authorizeMember($request, $booking);
        abort_unless($scheduleChangeRequest->booking_id === $booking->id, 404);
        $validated = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'rejected'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        if ($validated['decision'] === 'rejected' && mb_strlen(trim((string) ($validated['notes'] ?? ''))) < 10) {
            return response()->json(['message' => 'Jelaskan alasan penolakan sedikitnya 10 karakter.'], 422);
        }

        $result = DB::transaction(function () use (
            $request,
            $booking,
            $scheduleChangeRequest,
            $validated,
            $matchingService
        ) {
            $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);
            $change = ScheduleChangeRequest::query()
                ->where('booking_id', $lockedBooking->id)
                ->lockForUpdate()
                ->findOrFail($scheduleChangeRequest->id);
            if ($change->status !== 'pending') {
                abort(422, 'Permintaan perubahan jadwal sudah diproses.');
            }
            if ($change->expires_at?->isPast()) {
                $change->update(['status' => 'expired', 'decided_at' => now()]);
                abort(422, 'Batas waktu jawaban perubahan jadwal telah berakhir.');
            }

            $response = ScheduleChangeResponse::query()
                ->where('schedule_change_request_id', $change->id)
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->firstOrFail();
            if ($response->decision !== 'pending') {
                abort(422, 'Jawaban Anda sudah tersimpan.');
            }
            $response->update([
                'decision' => $validated['decision'],
                'notes' => trim((string) ($validated['notes'] ?? '')) ?: null,
                'responded_at' => now(),
            ]);

            if ($validated['decision'] === 'rejected') {
                $change->update(['status' => 'rejected', 'decided_at' => now()]);
                $this->notifyScheduleDecision($lockedBooking, $change, 'rejected');

                return ['status' => 'rejected', 'change' => $change->fresh('responses.user')];
            }

            $pendingResponses = ScheduleChangeResponse::query()
                ->where('schedule_change_request_id', $change->id)
                ->where('decision', 'pending')
                ->lockForUpdate()
                ->exists();
            if ($pendingResponses) {
                return ['status' => 'pending', 'change' => $change->fresh('responses.user')];
            }

            $this->validateProposal(
                $lockedBooking,
                $change->proposed_start_at,
                $change->proposed_end_at,
                $matchingService
            );
            $lockedBooking->update([
                'start_at' => $change->proposed_start_at,
                'end_at' => $change->proposed_end_at,
            ]);
            $lockedBooking->bookingRequest?->update([
                'scheduled_date' => $change->proposed_start_at->toDateString(),
                'start_time' => $change->proposed_start_at->format('H:i:s'),
                'end_time' => $change->proposed_end_at->format('H:i:s'),
            ]);
            PackageSession::query()->where('booking_id', $lockedBooking->id)->update([
                'scheduled_start_at' => $change->proposed_start_at,
                'scheduled_end_at' => $change->proposed_end_at,
            ]);
            if ($lockedBooking->groupPool) {
                $lockedBooking->groupPool->update([
                    'scheduled_date' => $change->proposed_start_at->toDateString(),
                    'start_time' => $change->proposed_start_at->format('H:i:s'),
                    'end_time' => $change->proposed_end_at->format('H:i:s'),
                ]);
            }
            $change->update(['status' => 'approved', 'decided_at' => now()]);
            $this->notifyScheduleDecision($lockedBooking, $change, 'approved');

            return ['status' => 'approved', 'change' => $change->fresh('responses.user')];
        }, 3);

        $message = match ($result['status']) {
            'approved' => 'Jadwal baru disetujui dan langsung menggantikan jadwal lama.',
            'rejected' => 'Perubahan jadwal ditolak. Jadwal lama tetap berlaku.',
            default => 'Jawaban tersimpan. Sistem masih menunggu pihak lain.',
        };

        return response()->json(['message' => $message, 'data' => $result['change']]);
    }

    private function authorizeMember(Request $request, Booking $booking): string
    {
        if ($request->user()->role === 'teacher' && (int) $booking->teacher_id === (int) $request->user()->id) {
            abort_unless($booking->participants()->whereHas('order', fn ($query) => $query->where('status', 'paid'))->exists(), 403);
            return 'teacher';
        }
        if ($request->user()->role === 'student' && $booking->participants()
            ->where('student_id', $request->user()->id)
            ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
            ->exists()) {
            return 'student';
        }

        abort(403, 'Anda tidak terdaftar pada sesi ini.');
    }

    private function validateProposal(
        Booking $booking,
        Carbon $startAt,
        Carbon $endAt,
        TeacherMatchingService $matchingService
    ): void {
        abort_unless($booking->status === 'confirmed', 422, 'Jadwal hanya dapat diubah sebelum sesi dimulai.');
        $noticeHours = max(
            1,
            min(48, (int) (Setting::where('key', 'schedule_change_min_notice_hours')->value('value') ?? 6))
        );
        if ($startAt->lt(now()->addHours($noticeHours))) {
            throw ValidationException::withMessages([
                'proposed_start_at' => "Jadwal baru harus diajukan sedikitnya {$noticeHours} jam sebelumnya.",
            ]);
        }
        if ($startAt->gt(now()->addMonths(6))) {
            throw ValidationException::withMessages([
                'proposed_start_at' => 'Jadwal baru tidak boleh lebih dari enam bulan.',
            ]);
        }
        if ((int) $startAt->format('i') !== 0) {
            throw ValidationException::withMessages([
                'proposed_start_at' => 'Jam mulai hanya boleh menggunakan menit 00.',
            ]);
        }
        if ($matchingService->teacherHasConflict($booking->teacher_id, $startAt, $endAt, $booking->id)) {
            throw ValidationException::withMessages(['proposed_start_at' => 'Jadwal tutor bertabrakan dengan kelas lain.']);
        }

        $teacher = $booking->teacher;
        if (!$teacher || !$matchingService->teacherAvailableAt($teacher, $startAt, $endAt)) {
            throw ValidationException::withMessages(['proposed_start_at' => 'Jadwal baru berada di luar jam kosong tutor.']);
        }

        $studentIds = $booking->participants()
            ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
            ->pluck('student_id');
        $studentConflict = Booking::query()
            ->whereKeyNot($booking->id)
            ->whereIn('status', self::ACTIVE_STATUSES)
            ->where('start_at', '<', $endAt)
            ->where('end_at', '>', $startAt)
            ->whereHas('participants', fn ($query) => $query->whereIn('student_id', $studentIds))
            ->exists();
        if ($studentConflict) {
            throw ValidationException::withMessages(['proposed_start_at' => 'Jadwal baru bertabrakan dengan kelas peserta.']);
        }
    }

    private function requiredResponders(Booking $booking, int $requesterId): array
    {
        return collect([$booking->teacher_id])
            ->merge($booking->participants()
                ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
                ->pluck('student_id'))
            ->map(fn ($id) => (int) $id)
            ->reject(fn ($id) => $id === $requesterId)
            ->unique()
            ->values()
            ->all();
    }

    private function notifyScheduleDecision(
        Booking $booking,
        ScheduleChangeRequest $change,
        string $status
    ): void {
        collect([$booking->teacher_id])
            ->merge($booking->participants()->pluck('student_id'))
            ->unique()
            ->each(function ($userId) use ($booking, $change, $status) {
                Notification::updateOrCreate(
                    ['unique_key' => "schedule-change-result:{$change->id}:{$userId}"],
                    [
                        'user_id' => $userId,
                        'title' => $status === 'approved' ? 'Jadwal baru disetujui' : 'Perubahan jadwal ditolak',
                        'message' => $status === 'approved'
                            ? 'Seluruh pihak menyetujui perubahan. Jadwal kelas telah diperbarui.'
                            : 'Salah satu pihak menolak perubahan. Jadwal lama tetap berlaku.',
                        'type' => $status === 'approved' ? 'success' : 'warning',
                        'target_url' => $this->targetUrlFor((int) $userId, $booking),
                        'is_read' => false,
                    ]
                );
            });
    }

    private function targetUrlFor(int $userId, Booking $booking): string
    {
        return $userId === (int) $booking->teacher_id ? '/guru/kelas' : '/student/my-classes';
    }
}
