<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\BookingRequest;
use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageFourLearningSessionTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_unpaid_student_cannot_open_internal_learning_session(): void
    {
        [$student, , $booking] = $this->makePrivateBooking('pending');
        Sanctum::actingAs($student);

        $this->getJson("/api/bookings/{$booking->id}/learning-session")
            ->assertForbidden();
    }

    public function test_internal_chat_rejects_external_contact_and_accepts_learning_message(): void
    {
        [$student, , $booking] = $this->makePrivateBooking();
        Sanctum::actingAs($student);

        $this->postJson("/api/bookings/{$booking->id}/messages", [
            'body' => 'Hubungi WhatsApp 081234567890.',
        ])->assertUnprocessable();

        $this->postJson("/api/bookings/{$booking->id}/messages", [
            'body' => 'Saya masih kesulitan pada persamaan linear.',
        ])->assertCreated();

        $this->assertDatabaseHas('classroom_messages', [
            'booking_id' => $booking->id,
            'sender_id' => $student->id,
            'body' => 'Saya masih kesulitan pada persamaan linear.',
        ]);
    }

    public function test_private_session_uses_pin_attendance_plan_and_progress_report(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-30 10:00:00', 'Asia/Jakarta'));
        [$student, $teacher, $booking] = $this->makePrivateBooking();

        Sanctum::actingAs($student);
        $pin = $this->postJson("/api/student/bookings/{$booking->id}/session-pin")
            ->assertOk()
            ->assertJsonStructure(['pin', 'expires_at'])
            ->json('pin');

        Sanctum::actingAs($teacher);
        $this->postJson("/api/teacher/bookings/{$booking->id}/check-in", [
            'pin' => $pin,
        ])->assertOk();

        $participant = $booking->participants()->firstOrFail();
        $this->putJson("/api/teacher/bookings/{$booking->id}/participant-attendance", [
            'attendances' => [[
                'participant_id' => $participant->id,
                'status' => 'present',
                'notes' => 'Murid hadir tepat waktu.',
            ]],
        ])->assertOk();

        $this->putJson("/api/teacher/bookings/{$booking->id}/learning-plan", [
            'initial_assessment' => 'Murid memahami operasi dasar tetapi belum stabil pada soal cerita.',
            'strengths' => 'Operasi bilangan dasar.',
            'challenges' => 'Mengubah soal cerita menjadi model matematika.',
            'learning_target' => 'Murid menyelesaikan delapan dari sepuluh soal persamaan linear.',
            'success_indicator' => 'Ketepatan jawaban mencapai sedikitnya delapan puluh persen.',
            'baseline_score' => 55,
            'target_score' => 80,
        ])->assertOk();

        Sanctum::actingAs($student);
        $this->postJson("/api/student/bookings/{$booking->id}/learning-plan/acknowledge")
            ->assertOk();

        Carbon::setTestNow(Carbon::parse('2026-07-30 10:50:00', 'Asia/Jakarta'));
        Sanctum::actingAs($teacher);
        $this->postJson("/api/teacher/bookings/{$booking->id}/check-out")
            ->assertOk();
        $this->postJson("/api/teacher/bookings/{$booking->id}/progress-reports", [
            'material_covered' => 'Persamaan linear satu variabel dan penerapannya.',
            'mastered_skills' => 'Murid dapat memindahkan ruas dan memeriksa hasil.',
            'difficulties' => 'Murid masih lambat ketika soal berbentuk cerita.',
            'next_exercise' => 'Kerjakan sepuluh soal cerita persamaan linear.',
            'attendance' => 'present',
            'progress_percent' => 65,
            'notes' => 'Kecepatan pengerjaan perlu dilatih.',
        ])->assertCreated();

        $this->assertDatabaseHas('session_attendances', [
            'booking_id' => $booking->id,
            'user_id' => $teacher->id,
            'role' => 'teacher',
        ]);
        $this->assertDatabaseHas('learning_plans', [
            'booking_id' => $booking->id,
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'progress_percent' => 65,
            'status' => 'active',
        ]);
        $this->assertDatabaseHas('learning_progress_reports', [
            'booking_id' => $booking->id,
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'session_number' => 1,
            'actual_duration_minutes' => 50,
            'progress_percent' => 65,
        ]);
    }

    private function makePrivateBooking(string $orderStatus = 'paid'): array
    {
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'active']);
        $scheduledStart = Carbon::parse('2026-07-30 10:00:00', 'Asia/Jakarta');
        $scheduledEnd = Carbon::parse('2026-07-30 11:00:00', 'Asia/Jakarta');
        $bookingRequest = BookingRequest::create([
            'student_id' => $student->id,
            'matched_teacher_id' => $teacher->id,
            'subject_name' => 'Matematika',
            'education_level' => 'SMP',
            'grade' => 'Kelas 7',
            'learning_mode' => 'online',
            'class_type' => 'private',
            'scheduled_date' => $scheduledStart->toDateString(),
            'start_time' => $scheduledStart->format('H:i:s'),
            'end_time' => $scheduledEnd->format('H:i:s'),
            'duration_hours' => 1,
            'status' => 'confirmed',
            'hourly_rate' => 50000,
            'total_amount' => 50000,
        ]);
        $booking = Booking::create([
            'booking_request_id' => $bookingRequest->id,
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'start_at' => $scheduledStart,
            'end_at' => $scheduledEnd,
            'duration_hours' => 1,
            'learning_mode' => 'online',
            'class_type' => 'private',
            'hourly_rate' => 50000,
            'total_amount' => 50000,
            'status' => 'confirmed',
            'commission_percent' => 20,
            'gross_amount' => $orderStatus === 'paid' ? 50000 : 0,
            'teacher_net_amount' => $orderStatus === 'paid' ? 40000 : 0,
            'payout_status' => 'locked',
        ]);
        $order = Order::create([
            'user_id' => $student->id,
            'booking_id' => $booking->id,
            'order_id' => 'INV-STAGE4-'.$booking->id,
            'amount' => 50000,
            'status' => $orderStatus,
        ]);
        BookingParticipant::create([
            'booking_id' => $booking->id,
            'booking_request_id' => $bookingRequest->id,
            'student_id' => $student->id,
            'order_id' => $order->id,
            'amount' => 50000,
            'status' => $orderStatus === 'paid' ? 'paid' : 'awaiting_payment',
        ]);
        $booking->update(['order_id' => $order->id]);
        $bookingRequest->update(['booking_id' => $booking->id]);

        return [$student, $teacher, $booking->fresh()];
    }
}
