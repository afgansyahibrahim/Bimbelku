<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\ClassroomMessage;
use App\Models\ClassroomMessageRead;
use App\Models\LearningPlan;
use App\Models\LearningProgressReport;
use App\Models\Notification;
use App\Models\ParticipantAttendance;
use App\Models\ScheduleChangeRequest;
use App\Models\SessionAttendance;
use App\Models\Setting;
use App\Models\User;
use App\Services\ClassroomSystemMessageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LearningSessionController extends Controller
{
    public function __construct(private readonly ClassroomSystemMessageService $systemMessages)
    {
    }

    public function conversations(Request $request)
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['student', 'teacher'], true), 403);

        $query = Booking::query()
            ->whereIn('status', $this->interactiveStatuses())
            ->with([
                'teacher:id,name',
                'teacher.teacherProfile:id,user_id,photo',
                'bookingRequest:id,subject_name,chapter,topic',
                'participants.student:id,name',
                'participants.order:id,status',
                'latestClassroomMessage.sender:id,name',
            ]);
        if ($user->role === 'teacher') {
            $query->where('teacher_id', $user->id)
                ->whereHas('participants.order', fn ($orders) => $orders->where('status', 'paid'));
        } else {
            $query->whereHas('participants', function ($participants) use ($user) {
                $participants->where('student_id', $user->id)
                    ->whereHas('order', fn ($orders) => $orders->where('status', 'paid'));
            });
        }

        $bookings = $query->latest('start_at')->limit(100)->get();
        $this->systemMessages->ensureForBookings($bookings);
        $bookings->load(['latestClassroomMessage.sender:id,name']);

        $payload = $bookings->map(function (Booking $booking) use ($user) {
            $latest = $booking->latestClassroomMessage;
            $unread = $booking->classroomMessages()
                // Badge percakapan hanya menghitung pesan dari lawan bicara.
                // Pesan sistem tetap tampil dan ditandai dibaca saat ruang dibuka,
                // tetapi tidak boleh menambah angka pesan baru untuk kedua pihak.
                ->where('sender_id', '!=', $user->id)
                ->where('message_type', '!=', 'system')
                ->whereDoesntHave('reads', fn ($reads) => $reads->where('user_id', $user->id))
                ->count();
            $paidStudents = $booking->participants
                ->filter(fn ($participant) => $participant->order?->status === 'paid');
            $counterpartName = $user->role === 'teacher'
                ? ($booking->class_type === 'group'
                    ? $paidStudents->count().' murid'
                    : ($paidStudents->first()?->student?->name ?? 'Murid BimbelKu'))
                : ($booking->teacher?->name ?? 'Tutor BimbelKu');

            return [
                'booking_id' => $booking->id,
                'subject' => $booking->bookingRequest?->subject_name ?? 'Bimbingan',
                'title' => $booking->bookingRequest?->chapter
                    ?: $booking->bookingRequest?->topic
                    ?: 'Ruang belajar',
                'counterpart_name' => $counterpartName,
                'counterpart_avatar' => $user->role === 'student'
                    ? ($booking->teacher?->teacherProfile?->photo
                        ? asset('storage/'.$booking->teacher->teacherProfile->photo)
                        : null)
                    : null,
                'class_type' => $booking->class_type,
                'status' => $booking->status,
                'start_at' => $booking->start_at,
                'unread_count' => $unread,
                'latest_message' => $latest ? [
                    'body' => $latest->body ?: ($latest->attachment_path ? 'Mengirim lampiran' : ''),
                    'sender_name' => $latest->message_type === 'system'
                        ? 'BimbelKu'
                        : ($latest->sender?->name ?? 'Pengguna BimbelKu'),
                    'created_at' => $latest->created_at,
                    'has_attachment' => (bool) $latest->attachment_path,
                ] : null,
            ];
        })->sortByDesc(fn ($item) => $item['latest_message']['created_at'] ?? $item['start_at'])->values();

        return response()->json(['data' => $payload]);
    }

    public function show(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);
        $this->systemMessages->ensureOrderConnected($booking);

        $booking->load([
            'teacher:id,name',
            'bookingRequest:id,subject_name,education_level,grade,chapter,subtopic,topic,learning_goal',
            'participants.student:id,name',
            'participants.bookingRequest',
            'participants.order:id,status',
            'learningPlan',
            'learningProgressReports' => function ($query) use ($role, $request) {
                $query->with('student:id,name')->oldest('session_number');
                if ($role === 'student') {
                    $query->where('student_id', $request->user()->id);
                }
            },
            'sessionAttendances.user:id,name',
            'participantAttendances',
            'scheduleChangeRequests' => fn ($query) => $query
                ->with(['requester:id,name,role', 'responses.user:id,name,role'])
                ->latest()
                ->limit(10),
        ]);

        $this->markConversationRead($booking, $request->user());

        $messages = $booking->classroomMessages()
            ->with(['sender:id,name,role', 'reads'])
            ->latest('id')
            ->limit(100)
            ->get()
            ->reverse()
            ->values()
            ->map(fn (ClassroomMessage $message) => $this->messagePayload(
                $message,
                (int) $request->user()->id,
                $role,
            ));

        $participant = $booking->participants
            ->firstWhere('student_id', $request->user()->id)
            ?? $booking->participants->first(
                fn ($item) => $item->order?->status === 'paid'
            );
        $requestSnapshot = $participant?->bookingRequest ?? $booking->bookingRequest;
        $teacherAttendance = $booking->sessionAttendances
            ->firstWhere('user_id', $booking->teacher_id);
        $paidParticipants = $booking->participants
            ->filter(fn ($item) => $item->order?->status === 'paid');
        $participantPayload = $paidParticipants->map(function ($item) use ($booking, $role, $request) {
            if ($role === 'student' && (int) $item->student_id !== (int) $request->user()->id) {
                return null;
            }
            $attendance = $booking->participantAttendances
                ->firstWhere('booking_participant_id', $item->id);

            return [
                'participant_id' => $item->id,
                'student_id' => $item->student_id,
                'name' => $item->student?->name ?? 'Murid BimbelKu',
                'attendance' => $attendance ? [
                    'status' => $attendance->status,
                    'notes' => $attendance->notes,
                    'marked_at' => $attendance->marked_at,
                ] : null,
            ];
        })->filter()->values();
        $scheduleChanges = $booking->scheduleChangeRequests->map(function ($change) use ($request) {
            $myResponse = $change->responses->firstWhere('user_id', $request->user()->id);
            return [
                'id' => $change->id,
                'requested_by' => $change->requested_by,
                'requester_name' => $change->requester?->name ?? 'Pengguna BimbelKu',
                'requester_role' => $change->requester_role,
                'original_start_at' => $change->original_start_at,
                'original_end_at' => $change->original_end_at,
                'proposed_start_at' => $change->proposed_start_at,
                'proposed_end_at' => $change->proposed_end_at,
                'reason' => $change->reason,
                'status' => $change->status,
                'expires_at' => $change->expires_at,
                'my_decision' => $myResponse?->decision,
                'can_respond' => $change->status === 'pending'
                    && $myResponse?->decision === 'pending'
                    && (!$change->expires_at || $change->expires_at->isFuture()),
                'responses' => $change->responses->map(fn ($response) => [
                    'user_name' => $response->user?->name ?? 'Pengguna',
                    'role' => $response->user?->role,
                    'decision' => $response->decision,
                    'responded_at' => $response->responded_at,
                ])->values(),
            ];
        })->values();

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
            'progress_reports' => $booking->learningProgressReports->map(fn (LearningProgressReport $report) => [
                'id' => $report->id,
                'student_id' => $report->student_id,
                'student_name' => $report->student?->name ?? 'Murid BimbelKu',
                'session_number' => $report->session_number,
                'material_covered' => $report->material_covered,
                'mastered_skills' => $report->mastered_skills,
                'difficulties' => $report->difficulties,
                'next_exercise' => $report->next_exercise,
                'attendance' => $report->attendance,
                'progress_percent' => $report->progress_percent,
                'notes' => $report->notes,
                'actual_duration_minutes' => $report->actual_duration_minutes,
                'published_at' => $report->published_at,
            ])->values(),
            'attendance' => $teacherAttendance,
            'participants' => $participantPayload,
            'schedule_changes' => $scheduleChanges,
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
                'can_mark_attendance' => $role === 'teacher'
                    && $teacherAttendance
                    && in_array($booking->status, ['in_progress', 'confirmed'], true),
                'can_manage_plan' => $role === 'teacher'
                    && $booking->class_type === 'private'
                    && in_array($booking->status, $this->interactiveStatuses(), true),
                'can_acknowledge_plan' => $role === 'student'
                    && $booking->learningPlan
                    && !$booking->learningPlan->student_acknowledged_at,
                'can_report_progress' => $this->canReportProgress($booking, $role, $teacherAttendance),
                'can_request_schedule_change' => in_array($role, ['student', 'teacher'], true)
                    && $booking->status === 'confirmed'
                    && now()->lt($booking->start_at),
            ],
        ]);
    }

    public function storeMessage(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);

        abort_unless(in_array($role, ['student', 'teacher'], true), 403);
        abort_unless(in_array($booking->status, $this->interactiveStatuses(), true), 422, 'Chat kelas sudah ditutup.');

        $maxMb = max(1, min(10, (int) (Setting::where('key', 'chat_attachment_max_mb')->value('value') ?? 5)));
        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:1000', 'required_without:attachment'],
            'attachment' => [
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,webp,pdf',
                'max:'.($maxMb * 1024),
                'required_without:body',
            ],
            'client_token' => ['nullable', 'uuid'],
        ]);
        $body = trim((string) ($validated['body'] ?? ''));
        if ($body !== '' && $this->containsExternalContact($body)) {
            throw ValidationException::withMessages([
                'body' => 'Nomor telepon, email, akun media sosial, dan tautan luar tidak boleh dikirim.',
            ]);
        }
        $clientToken = $validated['client_token'] ?? (string) Str::uuid();
        $existing = ClassroomMessage::query()
            ->where('booking_id', $booking->id)
            ->where('sender_id', $request->user()->id)
            ->where('client_token', $clientToken)
            ->first();
        if ($existing) {
            return response()->json([
                'message' => 'Pesan yang sama sudah tersimpan.',
                'data' => $this->messagePayload($existing, $request->user()->id),
            ]);
        }

        $path = $request->hasFile('attachment')
            ? $request->file('attachment')->store('classroom_attachments', 'local')
            : null;
        try {
            $message = DB::transaction(function () use (
                $request,
                $booking,
                $body,
                $path,
                $clientToken
            ) {
                $record = ClassroomMessage::create([
                    'booking_id' => $booking->id,
                    'sender_id' => $request->user()->id,
                    'body' => $body,
                    'attachment_path' => $path,
                    'attachment_name' => $request->file('attachment')?->getClientOriginalName(),
                    'attachment_mime' => $request->file('attachment')?->getMimeType(),
                    'attachment_size' => $request->file('attachment')?->getSize(),
                    'client_token' => $clientToken,
                ]);

                foreach ($this->chatRecipientIds($booking, (int) $request->user()->id) as $recipientId) {
                    Notification::updateOrCreate(
                        ['unique_key' => "classroom-message:{$record->id}:{$recipientId}"],
                        [
                            'user_id' => $recipientId,
                            'title' => 'Pesan kelas baru',
                            'message' => $body !== '' ? Str::limit($body, 140) : 'Lampiran baru dikirim melalui chat BimbelKu.',
                            'type' => 'info',
                            'target_url' => $this->messageTargetUrl($recipientId, $booking),
                            'is_read' => false,
                        ]
                    );
                }

                return $record;
            }, 3);
        } catch (\Throwable $exception) {
            if ($path) Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Pesan terkirim melalui chat BimbelKu.',
            'data' => $this->messagePayload($message, $request->user()->id),
        ], 201);
    }

    public function generatePin(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);

        abort_unless($role === 'student', 403);
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

            $paidParticipantCount = $booking->participants()
                ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
                ->count();
            $markedParticipantCount = ParticipantAttendance::query()
                ->where('booking_id', $booking->id)
                ->count();
            if ($paidParticipantCount < 1 || $markedParticipantCount !== $paidParticipantCount) {
                throw ValidationException::withMessages([
                    'attendance' => 'Kehadiran seluruh murid harus dicatat sebelum check-out.',
                ]);
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

    public function storeParticipantAttendance(Request $request, Booking $booking)
    {
        $role = $this->sessionRole($request->user(), $booking);
        $this->ensurePaidAccess($request->user(), $booking, $role);
        abort_unless($role === 'teacher', 403);
        abort_unless(in_array($booking->status, ['confirmed', 'in_progress'], true), 422, 'Kehadiran tidak dapat diubah pada status ini.');
        abort_unless(
            $booking->sessionAttendances()->where('user_id', $request->user()->id)->exists(),
            422,
            'Check-in tutor harus dilakukan sebelum mencatat kehadiran murid.'
        );

        $validated = $request->validate([
            'attendances' => ['required', 'array', 'min:1', 'max:20'],
            'attendances.*.participant_id' => ['required', 'integer', 'distinct'],
            'attendances.*.status' => ['required', Rule::in(['present', 'late', 'partial', 'absent', 'excused'])],
            'attendances.*.notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $records = DB::transaction(function () use ($request, $booking, $validated) {
            $paidParticipants = $booking->participants()
                ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
                ->lockForUpdate()
                ->get();
            $submittedIds = collect($validated['attendances'])
                ->pluck('participant_id')
                ->map(fn ($id) => (int) $id)
                ->sort()
                ->values()
                ->all();
            $expectedIds = $paidParticipants->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->sort()
                ->values()
                ->all();
            if ($submittedIds !== $expectedIds) {
                throw ValidationException::withMessages([
                    'attendances' => 'Kehadiran harus mencakup seluruh peserta berbayar pada kelas ini.',
                ]);
            }

            return collect($validated['attendances'])->map(function ($item) use (
                $request,
                $booking,
                $paidParticipants
            ) {
                $participant = $paidParticipants->firstWhere('id', (int) $item['participant_id']);
                abort_unless($participant, 422, 'Peserta tidak terdaftar pada sesi ini.');

                return ParticipantAttendance::updateOrCreate(
                    ['booking_participant_id' => $participant->id],
                    [
                        'booking_id' => $booking->id,
                        'student_id' => $participant->student_id,
                        'marked_by' => $request->user()->id,
                        'status' => $item['status'],
                        'notes' => trim((string) ($item['notes'] ?? '')) ?: null,
                        'marked_at' => now(),
                    ]
                );
            });
        }, 3);

        return response()->json([
            'message' => 'Kehadiran seluruh murid berhasil disimpan.',
            'data' => $records,
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

        $plan = $booking->learningPlan;
        if ($booking->class_type === 'private') {
            abort_unless($plan?->student_acknowledged_at, 422, 'Target belajar harus disetujui murid terlebih dahulu.');
        }
        $attendance = $booking->sessionAttendances()
            ->where('user_id', $request->user()->id)
            ->first();
        abort_unless($attendance?->check_out_at, 422, 'Check-out harus dicatat sebelum laporan dibuat.');

        $validated = $request->validate([
            'student_id' => [
                Rule::requiredIf($booking->class_type === 'group'),
                'nullable',
                'integer',
                'exists:users,id',
            ],
            'material_covered' => ['required', 'string', 'min:10', 'max:3000'],
            'mastered_skills' => ['required', 'string', 'min:10', 'max:3000'],
            'difficulties' => ['nullable', 'string', 'max:3000'],
            'next_exercise' => ['required', 'string', 'min:10', 'max:3000'],
            'attendance' => ['nullable', Rule::in(['present', 'late', 'partial', 'excused'])],
            'progress_percent' => ['required', 'integer', 'between:0,100'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);
        $studentId = $booking->class_type === 'group'
            ? (int) $validated['student_id']
            : (int) $plan->student_id;
        $participant = $booking->participants()
            ->where('student_id', $studentId)
            ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
            ->first();
        abort_unless($participant, 422, 'Murid tidak terdaftar sebagai peserta berbayar.');
        $participantAttendance = ParticipantAttendance::query()
            ->where('booking_participant_id', $participant->id)
            ->first();
        abort_unless($participantAttendance, 422, 'Kehadiran murid belum dicatat.');
        if ($participantAttendance->status === 'absent') {
            return response()->json([
                'message' => 'Murid yang tidak hadir dilaporkan melalui alur ketidakhadiran, bukan laporan perkembangan.',
            ], 422);
        }
        $validated['attendance'] = $participantAttendance->status;
        unset($validated['student_id']);
        $durationMinutes = max(
            1,
            $attendance->check_in_at->diffInMinutes($attendance->check_out_at)
        );

        $report = DB::transaction(function () use (
            $booking,
            $request,
            $plan,
            $validated,
            $durationMinutes,
            $studentId
        ) {
            $existingReport = LearningProgressReport::query()
                ->where('booking_id', $booking->id)
                ->where('student_id', $studentId)
                ->lockForUpdate()
                ->first();
            if ($existingReport) {
                throw ValidationException::withMessages([
                    'student_id' => 'Laporan perkembangan untuk murid ini sudah diterbitkan pada sesi tersebut.',
                ]);
            }
            $sessionNumber = 1;

            $report = LearningProgressReport::create([
                ...$validated,
                'booking_id' => $booking->id,
                'student_id' => $studentId,
                'teacher_id' => $request->user()->id,
                'session_number' => $sessionNumber,
                'actual_duration_minutes' => $durationMinutes,
                'published_at' => now(),
            ]);
            if ($plan && (int) $plan->student_id === $studentId) {
                $plan->update([
                    'progress_percent' => $validated['progress_percent'],
                    'status' => $validated['progress_percent'] >= 100 ? 'completed' : 'active',
                ]);
            }
            Notification::create([
                'user_id' => $studentId,
                'title' => 'Laporan perkembangan tersedia',
                'message' => "Tutor menerbitkan laporan sesi {$sessionNumber}. Progres target tercatat {$validated['progress_percent']}%.",
                'type' => 'success',
                'target_url' => '/student/progress',
                'unique_key' => "progress-report:{$booking->id}:{$studentId}:{$sessionNumber}",
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

    private function messagePayload(
        ClassroomMessage $message,
        int $viewerId,
        ?string $viewerRole = null,
    ): array {
        $message->loadMissing('sender:id,name,role');
        $isSystem = $message->message_type === 'system';
        $metadata = is_array($message->metadata) ? $message->metadata : [];
        $actionUrl = $viewerRole === 'teacher'
            ? ($metadata['action_url_teacher'] ?? null)
            : ($metadata['action_url_student'] ?? null);

        return [
            'id' => $message->id,
            'body' => $message->body,
            'message_type' => $message->message_type ?: 'user',
            'system_event_key' => $message->system_event_key,
            'metadata' => [
                ...$metadata,
                'action_url' => $actionUrl,
            ],
            'sender_id' => $message->sender_id,
            'sender_name' => $isSystem ? 'BimbelKu' : ($message->sender?->name ?? 'Pengguna BimbelKu'),
            'sender_role' => $isSystem ? 'system' : $message->sender?->role,
            'is_mine' => !$isSystem && (int) $message->sender_id === $viewerId,
            'is_read' => $message->relationLoaded('reads') && $message->reads->isNotEmpty(),
            'attachment' => $message->attachment_path ? [
                'name' => $message->attachment_name,
                'mime' => $message->attachment_mime,
                'size' => (int) $message->attachment_size,
                'url' => "classroom-messages/{$message->id}/attachment",
            ] : null,
            'created_at' => $message->created_at,
        ];
    }

    private function markConversationRead(Booking $booking, User $viewer): void
    {
        $booking->classroomMessages()
            ->where(function ($messages) use ($viewer) {
                $messages->where('sender_id', '!=', $viewer->id)
                    ->orWhere('message_type', 'system');
            })
            ->whereDoesntHave('reads', fn ($reads) => $reads->where('user_id', $viewer->id))
            ->select('id')
            ->orderBy('id')
            ->chunkById(200, function ($messages) use ($viewer) {
                $now = now();
                ClassroomMessageRead::insertOrIgnore($messages->map(fn ($message) => [
                    'classroom_message_id' => $message->id,
                    'user_id' => $viewer->id,
                    'read_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all());
            });
    }

    private function canReportProgress(
        Booking $booking,
        string $role,
        ?SessionAttendance $teacherAttendance,
    ): bool {
        if ($role !== 'teacher' || !$teacherAttendance?->check_out_at) {
            return false;
        }
        if ($booking->class_type === 'private' && !$booking->learningPlan?->student_acknowledged_at) {
            return false;
        }

        $reportedStudentIds = $booking->learningProgressReports
            ->pluck('student_id')
            ->map(fn ($id) => (int) $id);

        return $booking->participants
            ->filter(fn ($participant) => $participant->order?->status === 'paid')
            ->contains(fn ($participant) => !$reportedStudentIds->contains((int) $participant->student_id));
    }

    private function chatRecipientIds(Booking $booking, int $senderId): array
    {
        return collect([$booking->teacher_id])
            ->merge($booking->participants()
                ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
                ->pluck('student_id'))
            ->map(fn ($id) => (int) $id)
            ->reject(fn ($id) => $id === $senderId)
            ->unique()
            ->values()
            ->all();
    }

    private function messageTargetUrl(int $recipientId, Booking $booking): string
    {
        return $recipientId === (int) $booking->teacher_id
            ? "/guru/pesan?booking={$booking->id}"
            : "/student/messages?booking={$booking->id}";
    }
}
