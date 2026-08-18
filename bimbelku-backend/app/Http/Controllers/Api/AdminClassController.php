<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;

class AdminClassController extends Controller
{
    private const MONITORED_STATUSES = [
        'confirmed',
        'in_progress',
        'awaiting_student_approval',
        'disputed',
        'absence_review',
        'admin_review_required',
        'completed',
        'emergency_refund_pending',
        'refund_pending',
        'partially_refunded',
        'refunded',
    ];

    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $bookings = Booking::query()
            ->whereIn('status', self::MONITORED_STATUSES)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($searchQuery) use ($search) {
                    $searchQuery
                        ->whereHas('teacher', fn ($teacher) => $teacher->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('bookingRequest', function ($bookingRequest) use ($search) {
                            $bookingRequest
                                ->where('subject_name', 'like', "%{$search}%")
                                ->orWhere('chapter', 'like', "%{$search}%")
                                ->orWhere('subtopic', 'like', "%{$search}%");
                        });
                });
            })
            ->with([
                'teacher:id,name',
                'bookingRequest:id,subject_name,chapter,subtopic',
                'participants:id,booking_id,status',
            ])
            ->latest('start_at')
            ->limit(300)
            ->get();

        return response()->json($bookings->map(function (Booking $booking) {
            $request = $booking->bookingRequest;
            $participantCount = $booking->participants
                ->whereNotIn('status', ['cancelled', 'teacher_rejected', 'payment_expired'])
                ->count();
            $isCompleted = $booking->status === 'completed';

            return [
                'id' => $booking->id,
                'title' => $this->classTitle($booking),
                'subject' => $request?->subject_name ?? 'Bimbingan',
                'type' => $booking->class_type === 'group' ? 'Kelompok' : 'Privat',
                'method' => $booking->learning_mode,
                'status' => $booking->status,
                'status_label' => $this->statusLabel($booking->status),
                'teacher_name' => $booking->teacher?->name ?? 'Tutor tidak ditemukan',
                'student_count' => $participantCount,
                'total_sessions' => 1,
                'completed_sessions' => $isCompleted ? 1 : 0,
                'progress' => $this->progress($booking->status),
                'start_at' => $booking->start_at,
                'end_at' => $booking->end_at,
            ];
        })->values());
    }

    public function show(int $id)
    {
        $booking = Booking::query()
            ->whereIn('status', self::MONITORED_STATUSES)
            ->with([
                'teacher.teacherProfile',
                'bookingRequest',
                'participants.student',
                'participants.order.refund',
                'reports' => fn ($query) => $query->latest(),
                'disputes' => fn ($query) => $query->latest(),
            ])
            ->findOrFail($id);

        $request = $booking->bookingRequest;
        $profile = $booking->teacher?->teacherProfile;
        $participants = $booking->participants
            ->whereNotIn('status', ['cancelled', 'teacher_rejected', 'payment_expired'])
            ->values();

        return response()->json([
            'info' => [
                'id' => $booking->id,
                'title' => $this->classTitle($booking),
                'subject' => $request?->subject_name ?? 'Bimbingan',
                'chapter' => $request?->chapter,
                'subtopic' => $request?->subtopic,
                'type' => $booking->class_type === 'group' ? 'Kelompok' : 'Privat',
                'method' => $booking->learning_mode,
                'status' => $booking->status,
                'status_label' => $this->statusLabel($booking->status),
                'price' => (float) $booking->total_amount,
                'gross_amount' => (float) $booking->gross_amount,
                'teacher_net_amount' => (float) $booking->teacher_net_amount,
                'commission_percent' => (float) $booking->commission_percent,
                'payout_status' => $booking->payout_status,
                'progress' => $this->progress($booking->status),
                'location' => $booking->learning_mode === 'offline'
                    ? ($booking->address ?: 'Alamat belum tersedia')
                    : 'Kelas online',
                'meeting_link' => $booking->learning_mode === 'online'
                    ? $booking->meeting_link
                    : null,
                'start_at' => $booking->start_at,
                'end_at' => $booking->end_at,
                'completion_evidence_url' => $booking->completion_evidence_url,
                'completion_notes' => $booking->completion_notes,
            ],
            'teacher' => [
                'id' => $booking->teacher?->id,
                'name' => $booking->teacher?->name ?? 'Tutor tidak ditemukan',
                'email' => $booking->teacher?->email,
                'phone' => $profile?->whatsapp_number,
                'photo' => \App\Support\PublicMedia::url($profile?->photo),
            ],
            'students' => $participants->map(function ($participant) {
                return [
                    'id' => $participant->student?->id,
                    'name' => $participant->student?->name ?? 'Murid tidak ditemukan',
                    'email' => $participant->student?->email,
                    'phone' => $participant->student?->phone,
                    'status' => $participant->status,
                    'order_status' => $participant->order?->status,
                    'amount' => (float) $participant->amount,
                    'refund_status' => $participant->order?->refund?->status,
                    'joined_at' => $participant->created_at,
                ];
            })->values(),
            'sessions' => [[
                'id' => $booking->id,
                'title' => $request?->chapter ?: $request?->subtopic ?: 'Sesi bimbingan',
                'date' => $booking->start_at?->translatedFormat('l, d F Y H:i').' WIB',
                'is_completed' => $booking->status === 'completed',
                'material' => $request?->subtopic ?: $request?->topic ?: 'Materi belum dirinci',
            ]],
            'latest_report' => $booking->reports->first(),
            'latest_dispute' => $booking->disputes->first(),
        ]);
    }

    private function classTitle(Booking $booking): string
    {
        $request = $booking->bookingRequest;
        $detail = $request?->chapter ?: $request?->subtopic;

        return trim(($request?->subject_name ?? 'Bimbingan').($detail ? " · {$detail}" : ''));
    }

    private function progress(string $status): int
    {
        return match ($status) {
            'confirmed' => 25,
            'in_progress' => 50,
            'awaiting_student_approval', 'disputed', 'absence_review', 'admin_review_required' => 75,
            'completed', 'emergency_refund_pending', 'refund_pending', 'partially_refunded', 'refunded' => 100,
            default => 0,
        };
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'confirmed' => 'Dikonfirmasi',
            'in_progress' => 'Sedang berlangsung',
            'awaiting_student_approval' => 'Menunggu persetujuan murid',
            'disputed' => 'Dalam keberatan',
            'absence_review' => 'Kehadiran diperiksa',
            'admin_review_required' => 'Menunggu tinjauan admin',
            'completed' => 'Selesai',
            'emergency_refund_pending' => 'Refund keadaan darurat',
            'refund_pending' => 'Refund diproses',
            'partially_refunded' => 'Sebagian direfund',
            'refunded' => 'Direfund',
            default => $status,
        };
    }
}
