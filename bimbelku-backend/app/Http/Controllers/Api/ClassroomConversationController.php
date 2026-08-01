<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\ClassroomConversationRead;
use App\Models\ClassroomMessage;
use App\Models\User;
use App\Services\ClassroomSystemMessageService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClassroomConversationController extends Controller
{
    public function __construct(
        private readonly ClassroomSystemMessageService $systemMessageService,
    ) {
    }

    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['student', 'teacher'], true), 403);

        $bookings = $this->accessibleBookings($user)
            ->with([
                'teacher:id,name',
                'teacher.teacherProfile:id,user_id,photo',
                'bookingRequest:id,subject_name,chapter,topic',
                'participants' => fn ($query) => $query
                    ->whereHas('order', fn ($order) => $order->where('status', 'paid'))
                    ->with([
                        'student:id,name,avatar',
                        'bookingRequest:id,subject_name,chapter,topic',
                    ]),
                'latestClassroomMessage.sender:id,name,role',
            ])
            ->latest('start_at')
            ->limit(100)
            ->get();

        $this->systemMessageService->ensureForBookings($bookings);
        $bookings->each->unsetRelation('latestClassroomMessage');
        $bookings->load('latestClassroomMessage.sender:id,name,role');

        $bookingIds = $bookings->pluck('id');
        $readCursors = ClassroomConversationRead::query()
            ->where('user_id', $user->id)
            ->whereIn('booking_id', $bookingIds)
            ->pluck('last_read_message_id', 'booking_id');

        $unreadCounts = ClassroomMessage::query()
            ->selectRaw('classroom_messages.booking_id, COUNT(*) as aggregate')
            ->leftJoin('classroom_conversation_reads as reads', function ($join) use ($user) {
                $join->on('reads.booking_id', '=', 'classroom_messages.booking_id')
                    ->where('reads.user_id', '=', $user->id);
            })
            ->whereIn('classroom_messages.booking_id', $bookingIds)
            ->where(function ($messages) use ($user) {
                $messages->where('classroom_messages.message_type', 'system')
                    ->orWhere('classroom_messages.sender_id', '!=', $user->id);
            })
            ->whereRaw('classroom_messages.id > COALESCE(reads.last_read_message_id, 0)')
            ->groupBy('classroom_messages.booking_id')
            ->pluck('aggregate', 'classroom_messages.booking_id');

        $conversations = $bookings
            ->map(fn (Booking $booking) => $this->conversationSummary(
                $booking,
                $user,
                (int) ($unreadCounts[$booking->id] ?? 0),
                (int) ($readCursors[$booking->id] ?? 0),
            ))
            ->sortByDesc(fn (array $conversation) => $conversation['last_activity_at'] ?? $conversation['start_at'])
            ->values();

        return response()->json([
            'conversations' => $conversations,
            'unread_count' => $conversations->sum('unread_count'),
        ]);
    }

    public function show(Request $request, Booking $booking)
    {
        $user = $request->user();
        $role = $this->roleFor($user, $booking);
        $this->ensurePaidAccess($user, $booking, $role);

        $booking->load([
            'teacher:id,name',
            'teacher.teacherProfile:id,user_id,photo',
            'bookingRequest:id,subject_name,chapter,topic',
            'participants' => fn ($query) => $query
                ->whereHas('order', fn ($order) => $order->where('status', 'paid'))
                ->with([
                    'student:id,name,avatar',
                    'bookingRequest:id,subject_name,chapter,topic',
                ]),
        ]);

        $this->systemMessageService->ensureOrderConnected($booking);

        $messages = $booking->classroomMessages()
            ->with('sender:id,name,role')
            ->latest('id')
            ->limit(100)
            ->get()
            ->reverse()
            ->values()
            ->map(fn (ClassroomMessage $message) => $this->messagePayload($message, $user));

        return response()->json([
            'conversation' => $this->conversationSummary($booking, $user, 0, 0),
            'messages' => $messages,
            'permissions' => [
                'can_chat' => in_array($booking->status, $this->interactiveStatuses(), true),
            ],
        ]);
    }

    public function markRead(Request $request, Booking $booking)
    {
        $user = $request->user();
        $role = $this->roleFor($user, $booking);
        $this->ensurePaidAccess($user, $booking, $role);

        $latestMessageId = (int) ($booking->classroomMessages()->max('id') ?? 0);

        DB::transaction(function () use ($booking, $user, $latestMessageId) {
            ClassroomConversationRead::updateOrCreate(
                [
                    'booking_id' => $booking->id,
                    'user_id' => $user->id,
                ],
                [
                    'last_read_message_id' => $latestMessageId ?: null,
                    'read_at' => now(),
                ],
            );
        });

        return response()->json([
            'message' => 'Percakapan ditandai sudah dibaca.',
            'last_read_message_id' => $latestMessageId ?: null,
        ]);
    }

    private function accessibleBookings(User $user): Builder
    {
        $query = Booking::query()
            ->whereNotNull('teacher_id')
            ->whereHas('participants', fn ($participants) => $participants
                ->whereHas('order', fn ($order) => $order->where('status', 'paid'))
            );

        if ($user->role === 'teacher') {
            return $query->where('teacher_id', $user->id);
        }

        return $query->whereHas('participants', fn ($participants) => $participants
            ->where('student_id', $user->id)
            ->whereHas('order', fn ($order) => $order->where('status', 'paid'))
        );
    }

    private function conversationSummary(
        Booking $booking,
        User $user,
        int $unreadCount,
        int $lastReadMessageId,
    ): array {
        $participant = $booking->participants
            ->firstWhere('student_id', $user->id)
            ?? $booking->participants->first();
        $requestSnapshot = $participant?->bookingRequest ?? $booking->bookingRequest;
        $lastMessage = $booking->latestClassroomMessage;

        if ($user->role === 'student') {
            $counterpartName = $booking->teacher?->name ?? 'Tutor BimbelKu';
            $counterpartAvatar = $booking->teacher?->teacherProfile?->photo
                ? asset('storage/'.$booking->teacher->teacherProfile->photo)
                : null;
        } else {
            $paidStudents = $booking->participants->pluck('student')->filter();
            $counterpartName = $booking->class_type === 'group' && $paidStudents->count() > 1
                ? $paidStudents->count().' murid'
                : ($paidStudents->first()?->name ?? 'Murid BimbelKu');
            $studentAvatar = $paidStudents->first()?->avatar;
            $counterpartAvatar = $studentAvatar ? asset('storage/'.$studentAvatar) : null;
        }

        $subject = $requestSnapshot?->subject_name ?? 'Bimbingan';
        $topic = $requestSnapshot?->chapter ?: $requestSnapshot?->topic;

        return [
            'booking_id' => $booking->id,
            'title' => $topic ? "{$subject} • {$topic}" : $subject,
            'subject' => $subject,
            'counterpart_name' => $counterpartName,
            'counterpart_avatar' => $counterpartAvatar,
            'class_type' => $booking->class_type,
            'learning_mode' => $booking->learning_mode,
            'status' => $booking->status,
            'start_at' => $booking->start_at?->toIso8601String(),
            'can_chat' => in_array($booking->status, $this->interactiveStatuses(), true),
            'unread_count' => $unreadCount,
            'last_read_message_id' => $lastReadMessageId ?: null,
            'last_activity_at' => ($lastMessage?->created_at ?? $booking->start_at)?->toIso8601String(),
            'last_message' => $lastMessage ? $this->messagePayload($lastMessage, $user) : null,
        ];
    }

    private function messagePayload(ClassroomMessage $message, User $user): array
    {
        $isSystem = $message->message_type === 'system';
        $metadata = $message->metadata ?? [];
        if ($isSystem) {
            $metadata['action_url'] = $user->role === 'teacher'
                ? ($metadata['action_url_teacher'] ?? '/guru/kelas')
                : ($metadata['action_url_student'] ?? '/student/my-classes');
            unset($metadata['action_url_student'], $metadata['action_url_teacher']);
        }

        return [
            'id' => $message->id,
            'body' => $message->body,
            'sender_id' => $message->sender_id,
            'sender_name' => $isSystem ? 'BimbelKu' : ($message->sender?->name ?? 'Pengguna BimbelKu'),
            'sender_role' => $isSystem ? 'system' : $message->sender?->role,
            'message_type' => $message->message_type ?: 'user',
            'system_event_key' => $message->system_event_key,
            'metadata' => $metadata ?: null,
            'is_mine' => !$isSystem && $message->sender_id === $user->id,
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }

    private function roleFor(User $user, Booking $booking): string
    {
        if ($user->role === 'teacher' && $booking->teacher_id === $user->id) {
            return 'teacher';
        }
        if (
            $user->role === 'student'
            && $booking->participants()->where('student_id', $user->id)->exists()
        ) {
            return 'student';
        }

        abort(403, 'Anda tidak terdaftar pada percakapan ini.');
    }

    private function ensurePaidAccess(User $user, Booking $booking, string $role): void
    {
        if ($role === 'teacher') {
            abort_unless(
                $booking->participants()
                    ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
                    ->exists(),
                403,
                'Percakapan dibuka setelah pembayaran dikonfirmasi.'
            );
            return;
        }

        abort_unless(
            $booking->participants()
                ->where('student_id', $user->id)
                ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
                ->exists(),
            403,
            'Percakapan dibuka setelah pembayaran dikonfirmasi.'
        );
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
}
