<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\ClassroomMessage;
use App\Models\LearningPlan;
use App\Models\LearningProgressReport;
use App\Models\Notification;
use App\Models\SessionAttendance;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LearningSessionController extends Controller
{
    public function show(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);

        $booking->load([
            'teacher:id,name',
            'bookingRequest:id,subject_name,education_level,grade,chapter,subtopic,topic,learning_goal',
            'participants.student:id,name',
            'participants.bookingRequest',
            'participants.order:id,status',
            'learningPlan',
            'learningProgressReports' => fn ($query) => $query->oldest('session_number'),
            'sessionAttendances.user:id,name',
        ]);

        $messages = $booking->classroomMessages()
            ->with('sender:id,name,role')
            ->latest('id')
            ->limit(100)
            ->get()
            ->reverse()
            ->values()
            ->map(fn (ClassroomMessage $message) => [
                'id' => $message->id,
                'body' => $message->body,
                'sender_id' => $message->sender_id,
                'sender_name' => $message->sender?->name ?? 'Pengguna BimbelKu',
                'sender_role' => $message->sender?->role,
                'is_mine' => $message->sender_id === $request->user()->id,
                'created_at' => $message->created_at,
            ]);

        $participant = $booking->participants
            ->firstWhere('student_id', $request->user()->id)
            ?? $booking->participants->first(
                fn ($item) => $item->order?->status === 'paid'
            );
        $requestSnapshot = $participant?->bookingRequest ?? $booking->bookingRequest;
        $teacherAttendance = $booking->sessionAttendances
            ->firstWhere('user_id', $booking->teacher_id);

        return response()->json([
            'booking' => [
                'id' => $booking->id,
                'subject' => $requestSnapshot?->subject_name ?? 'Bimbingan',
                'education_level' => $requestSnapshot?->education_level,
                'grade' => $requestSnapshot?->grade,
                'chapter' => $requestSnapshot?->chapter,
                'subtopic' => $requestSnapshot?->subtopic,
                'topic' => $requestSnapshot?->topic,
                'requested_goal' => $requestSnapshot?->learning_goal,
                'teacher_name' => $booking->teacher?->name ?? 'Tutor',
                'student_name' => $participant?->student?->name ?? 'Murid',
                'learning_mode' => $booking->learning_mode,
                'class_type' => $booking->class_type,
                'status' => $booking->status,
                'start_at' => $booking->start_at,
                'end_at' => $booking->end_at,
                'session_started_at' => $booking->session_started_at,
                'session_ended_at' => $booking->session_ended_at,
            ],
            'role' => $role,
            'messages' => $messages,
            'learning_plan' => $booking->learningPlan,
            'progress_reports' => $booking->learningProgressReports,
            'attendance' => $teacherAttendance,
            'permissions' => [
                'can_chat' => in_array($booking->status, $this->interactiveStatuses(), true),
                'can_generate_pin' => $role === 'student'
                    && $this->withinCheckInWindow($booking)
                    && !$teacherAttendance,
                'can_check_in' => $role === 'teacher'
                    && $this->withinCheckInWindow($booking)
                    && !$teacherAttendance,
                'can_check_out' => $role === 'teacher'
                    && $teacherAttendance
                    && !$teacherAttendance->check_out_at,
                'can_manage_plan' => $role === 'teacher'
                    && $booking->class_type === 'private'
                    && in_array($booking->status, $this->interactiveStatuses(), true),
                'can_acknowledge_plan' => $role === 'student'
                    && $booking->learningPlan
                    && !$booking->learningPlan->student_acknowledged_at,
                'can_report_progress' => $role === 'teacher'
                    && $booking->class_type === 'private'
                    && $booking->learningPlan?->student_acknowledged_at
                    && $teacherAttendance?->check_out_at,
            ],
        ]);
    }

    public function storeMessage(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);

        abort_unless(in_array($role, ['student', 'teacher'], true), 403);
        abort_unless(in_array($booking->status, $this->interactiveStatuses(), true), 422, 'Chat kelas sudah ditutup.');

        $validated = $request->validate([
            'body' => ['required', 'string', 'min:1', 'max:1000'],
        ]);
        $body = trim($validated['body']);
        if ($this->containsExternalContact($body)) {
            throw ValidationException::withMessages([
                'body' => 'Nomor telepon, email, akun media sosial, dan tautan luar tidak boleh dikirim.',
            ]);
        }

        $message = ClassroomMessage::create([
            'booking_id' => $booking->id,
            'sender_id' => $request->user()->id,
            'body' => $body,
        ]);

        return response()->json([
            'message' => 'Pesan terkirim melalui chat BimbelKu.',
            'data' => [
                'id' => $message->id,
                'body' => $message->body,
                'sender_id' => $message->sender_id,
                'sender_name' => $request->user()->name,
                'sender_role' => $request->user()->role,
                'is_mine' => true,
                'created_at' => $message->created_at,
            ],
        ], 201);
    }

    public function generatePin(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);

        abort_unless($role === 'student', 403);
        abort_unless($booking->class_type === 'private', 422, 'PIN Tahap 4 hanya tersedia untuk sesi privat.');
        abort_unless($this->withinCheckInWindow($booking), 422, 'PIN tersedia mendekati jadwal sesi.');
        abort_if(
            $booking->sessionAttendances()->where('user_id', $booking->teacher_id)->exists(),
            422,
            'Tutor sudah melakukan check-in.'
        );

        $pin = (string) random_int(100000, 999999);
        $minutes = max(5, min(
            20,
            (int) (Setting::where('key', 'session_pin_minutes')->value('value') ?? 10)
        ));
        $expiresAt = now()->addMinutes($minutes);

        $booking->forceFill([
            'session_pin_hash' => Hash::make($pin),
            'session_pin_expires_at' => $expiresAt,
        ])->save();

        return response()->json([
            'message' => 'PIN dibuat. Berikan PIN hanya kepada tutor yang hadir.',
            'pin' => $pin,
            'expires_at' => $expiresAt,
        ]);
    }

    public function teacherCheckIn(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);

        abort_unless($role === 'teacher', 403);
        abort_unless($booking->class_type === 'private', 422, 'Check-in Tahap 4 hanya tersedia untuk sesi privat.');
        abort_unless($this->withinCheckInWindow($booking), 422, 'Check-in hanya tersedia mendekati jadwal sesi.');

        $rules = [
            'pin' => ['required', 'digits:6'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'accuracy_meters' => ['nullable', 'integer', 'min:0', 'max:5000'],
        ];
        if ($booking->learning_mode === 'offline') {
            $rules['latitude'][0] = 'required';
            $rules['longitude'][0] = 'required';
        }
        $validated = $request->validate($rules);

        $attendance = DB::transaction(function () use ($booking, $request, $validated) {
            $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);
            if ($lockedBooking->sessionAttendances()->where('user_id', $request->user()->id)->exists()) {
                throw ValidationException::withMessages(['pin' => 'Tutor sudah melakukan check-in.']);
            }
            if (
                !$lockedBooking->session_pin_hash
                || !$lockedBooking->session_pin_expires_at
                || $lockedBooking->session_pin_expires_at->isPast()
                || !Hash::check($validated['pin'], $lockedBooking->session_pin_hash)
            ) {
                throw ValidationException::withMessages(['pin' => 'PIN salah atau sudah kedaluwarsa.']);
            }

            if ($lockedBooking->learning_mode === 'offline') {
                $this->validateSessionLocation(
                    $lockedBooking,
                    (float) $validated['latitude'],
                    (float) $validated['longitude']
                );
            }

            $attendance = SessionAttendance::create([
                'booking_id' => $lockedBooking->id,
                'user_id' => $request->user()->id,
                'role' => 'teacher',
                'check_in_at' => now(),
                'latitude' => $validated['latitude'] ?? null,
                'longitude' => $validated['longitude'] ?? null,
                'accuracy_meters' => $validated['accuracy_meters'] ?? null,
                'pin_verified_at' => now(),
                'ip_hash' => hash_hmac('sha256', (string) $request->ip(), (string) config('app.key')),
            ]);

            $lockedBooking->forceFill([
                'status' => 'in_progress',
                'session_started_at' => now(),
                'session_pin_hash' => null,
                'session_pin_expires_at' => null,
            ])->save();

            return $attendance;
        });

        return response()->json([
            'message' => 'Check-in berhasil. Waktu mulai sesi telah dicatat.',
            'data' => $attendance,
        ]);
    }

    public function teacherCheckOut(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);
        abort_unless($role === 'teacher', 403);

        $attendance = DB::transaction(function () use ($booking, $request) {
            $attendance = SessionAttendance::query()
                ->where('booking_id', $booking->id)
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->first();

            if (!$attendance) {
                throw ValidationException::withMessages(['session' => 'Check-in harus dilakukan terlebih dahulu.']);
            }
            if ($attendance->check_out_at) {
                throw ValidationException::withMessages(['session' => 'Check-out sudah tercatat.']);
            }

            $attendance->update(['check_out_at' => now()]);
            Booking::query()->whereKey($booking->id)->update(['session_ended_at' => now()]);

            return $attendance->fresh();
        });

        return response()->json([
            'message' => 'Check-out berhasil. Durasi sesi telah dicatat.',
            'data' => $attendance,
        ]);
    }

    public function storePlan(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);

        abort_unless($role === 'teacher', 403);
        abort_unless($booking->class_type === 'private', 422, 'Rencana belajar Tahap 4 hanya tersedia untuk sesi privat.');

        $validated = $request->validate([
            'initial_assessment' => ['required', 'string', 'min:20', 'max:3000'],
            'strengths' => ['nullable', 'string', 'max:2000'],
            'challenges' => ['nullable', 'string', 'max:2000'],
            'learning_target' => ['required', 'string', 'min:10', 'max:2000'],
            'success_indicator' => ['required', 'string', 'min:10', 'max:2000'],
            'baseline_score' => ['nullable', 'numeric', 'between:0,100'],
            'target_score' => ['nullable', 'numeric', 'between:0,100', 'gte:baseline_score'],
        ]);
        $studentId = $this->paidStudentId($booking);

        $plan = LearningPlan::updateOrCreate(
            ['booking_id' => $booking->id],
            [
                ...$validated,
                'student_id' => $studentId,
                'teacher_id' => $request->user()->id,
                'progress_percent' => $booking->learningPlan?->progress_percent ?? 0,
                'status' => 'waiting_student',
                'assessed_at' => now(),
                'student_acknowledged_at' => null,
            ]
        );
        Notification::create([
            'user_id' => $studentId,
            'title' => 'Target belajar menunggu persetujuan',
            'message' => 'Tutor telah menerbitkan asesmen awal dan target belajar. Periksa melalui Ruang Belajar.',
            'type' => 'info',
        ]);

        return response()->json([
            'message' => 'Asesmen awal dan target belajar disimpan. Murid perlu menyetujuinya.',
            'data' => $plan,
        ]);
    }

    public function acknowledgePlan(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);
        abort_unless($role === 'student', 403);

        $plan = $booking->learningPlan;
        abort_unless($plan, 404, 'Rencana belajar belum dibuat tutor.');
        abort_unless($plan->student_id === $request->user()->id, 403);

        if (!$plan->student_acknowledged_at) {
            $plan->update([
                'student_acknowledged_at' => now(),
                'status' => 'active',
            ]);
        }

        return response()->json([
            'message' => 'Target belajar telah disetujui.',
            'data' => $plan->fresh(),
        ]);
    }

    public function storeProgressReport(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);
        abort_unless($role === 'teacher', 403);
        abort_unless($booking->class_type === 'private', 422, 'Laporan Tahap 4 hanya tersedia untuk sesi privat.');

        $plan = $booking->learningPlan;
        abort_unless($plan?->student_acknowledged_at, 422, 'Target belajar harus disetujui murid terlebih dahulu.');
        $attendance = $booking->sessionAttendances()
            ->where('user_id', $request->user()->id)
            ->first();
        abort_unless($attendance?->check_out_at, 422, 'Check-out harus dicatat sebelum laporan dibuat.');

        $validated = $request->validate([
            'material_covered' => ['required', 'string', 'min:10', 'max:3000'],
            'mastered_skills' => ['required', 'string', 'min:10', 'max:3000'],
            'difficulties' => ['nullable', 'string', 'max:3000'],
            'next_exercise' => ['required', 'string', 'min:10', 'max:3000'],
            'attendance' => ['required', Rule::in(['present', 'late', 'partial'])],
            'progress_percent' => ['required', 'integer', 'between:0,100'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);
        $durationMinutes = max(
            1,
            $attendance->check_in_at->diffInMinutes($attendance->check_out_at)
        );

        $report = DB::transaction(function () use (
            $booking,
            $request,
            $plan,
            $validated,
            $durationMinutes
        ) {
            $sessionNumber = (int) LearningProgressReport::query()
                ->where('booking_id', $booking->id)
                ->lockForUpdate()
                ->max('session_number') + 1;

            $report = LearningProgressReport::create([
                ...$validated,
                'booking_id' => $booking->id,
                'student_id' => $plan->student_id,
                'teacher_id' => $request->user()->id,
                'session_number' => $sessionNumber,
                'actual_duration_minutes' => $durationMinutes,
                'published_at' => now(),
            ]);
            $plan->update([
                'progress_percent' => $validated['progress_percent'],
                'status' => $validated['progress_percent'] >= 100 ? 'completed' : 'active',
            ]);
            Notification::create([
                'user_id' => $plan->student_id,
                'title' => 'Laporan perkembangan tersedia',
                'message' => "Tutor menerbitkan laporan sesi {$sessionNumber}. Progres target tercatat {$validated['progress_percent']}%.",
                'type' => 'success',
            ]);

            return $report;
        });

        return response()->json([
            'message' => 'Laporan sesi dan progres murid berhasil diterbitkan.',
            'data' => $report,
        ], 201);
    }

    private function sessionRole(User $user, Booking $booking): string
    {
        if ($user->role === 'admin') {
            return 'admin';
        }
        if ($user->role === 'teacher' && $booking->teacher_id === $user->id) {
            return 'teacher';
        }
        if (
            $user->role === 'student'
            && $booking->participants()->where('student_id', $user->id)->exists()
        ) {
            return 'student';
        }

        abort(403, 'Anda tidak terdaftar pada sesi ini.');
    }

    private function ensurePaidAccess(User $user, Booking $booking, string $role): void
    {
        if ($role === 'admin') {
            return;
        }
        if ($role === 'teacher') {
            abort_unless(
                $booking->participants()
                    ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
                    ->exists(),
                403,
                'Chat dan pelaksanaan dibuka setelah pembayaran dikonfirmasi.'
            );
            return;
        }

        abort_unless(
            $booking->participants()
                ->where('student_id', $user->id)
                ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
                ->exists(),
            403,
            'Chat dan pelaksanaan dibuka setelah pembayaran dikonfirmasi.'
        );
    }

    private function paidStudentId(Booking $booking): int
    {
        $participant = $booking->participants()
            ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
            ->oldest('id')
            ->first();
        abort_unless($participant, 422, 'Belum ada pembayaran murid yang dikonfirmasi.');

        return (int) $participant->student_id;
    }

    private function interactiveStatuses(): array
    {
        return [
            'confirmed',
            'in_progress',
            'awaiting_student_approval',
            'disputed',
            'absence_review',
            'admin_review_required',
            'completed',
        ];
    }

    private function withinCheckInWindow(Booking $booking): bool
    {
        if (!in_array($booking->status, ['confirmed', 'in_progress'], true)) {
            return false;
        }
        $before = max(
            0,
            (int) (Setting::where('key', 'session_checkin_before_minutes')->value('value') ?? 30)
        );
        $after = max(
            15,
            (int) (Setting::where('key', 'session_checkin_after_minutes')->value('value') ?? 60)
        );

        return now()->between(
            $booking->start_at->copy()->subMinutes($before),
            $booking->start_at->copy()->addMinutes($after)
        );
    }

    private function validateSessionLocation(Booking $booking, float $latitude, float $longitude): void
    {
        $booking->loadMissing('bookingRequest');
        $request = $booking->bookingRequest;
        if ($request?->latitude === null || $request?->longitude === null) {
            throw ValidationException::withMessages([
                'latitude' => 'Koordinat lokasi sesi belum tersedia. Hubungi admin.',
            ]);
        }
        $distance = $this->distanceKm(
            (float) $request->latitude,
            (float) $request->longitude,
            $latitude,
            $longitude
        );
        $tolerance = max(
            0.1,
            min(3, (float) (Setting::where('key', 'session_location_tolerance_km')->value('value') ?? 1))
        );
        if ($distance > $tolerance) {
            throw ValidationException::withMessages([
                'latitude' => "Lokasi check-in berjarak {$distance} km dari lokasi sesi.",
            ]);
        }
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

    private function containsExternalContact(string $body): bool
    {
        return preg_match('/\b(?:https?:\/\/|www\.)\S+/iu', $body) === 1
            || preg_match('/\b(?:[a-z0-9-]+\.)+(?:com|id|net|org|me|io|co)\b/iu', $body) === 1
            || preg_match('/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu', $body) === 1
            || preg_match('/(?<!\d)(?:\+?62|0)[\s().-]*(?:\d[\s().-]*){8,13}(?!\d)/u', $body) === 1
            || preg_match('/(?:^|\s)@[a-z0-9_.]{3,}/iu', $body) === 1
            || preg_match('/\b(?:whats?app|telegram|instagram|facebook|tiktok|discord|line|wa|ig)\b/iu', $body) === 1;
    }
}
