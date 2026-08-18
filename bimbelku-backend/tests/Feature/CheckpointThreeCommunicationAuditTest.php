<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\BookingRequest;
use App\Models\ClassroomMessage;
use App\Models\ClassroomMessageRead;
use App\Models\LearningPlan;
use App\Models\LearningProgressReport;
use App\Models\Notification;
use App\Models\Order;
use App\Models\ParticipantAttendance;
use App\Models\SessionAttendance;
use App\Models\Ticket;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckpointThreeCommunicationAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_group_student_only_receives_own_progress_reports(): void
    {
        [$teacher, $students, $booking] = $this->makePaidBooking('group', 2);
        foreach ($students as $index => $student) {
            LearningProgressReport::create([
                'booking_id' => $booking->id,
                'student_id' => $student->id,
                'teacher_id' => $teacher->id,
                'session_number' => 1,
                'material_covered' => 'Materi khusus murid '.($index + 1),
                'mastered_skills' => 'Kemampuan yang telah dikuasai murid.',
                'next_exercise' => 'Latihan lanjutan untuk pertemuan berikutnya.',
                'attendance' => 'present',
                'actual_duration_minutes' => 60,
                'progress_percent' => 60 + $index,
                'published_at' => now(),
            ]);
        }

        Sanctum::actingAs($students[0]);
        $this->getJson("/api/bookings/{$booking->id}/learning-session")
            ->assertOk()
            ->assertJsonCount(1, 'progress_reports')
            ->assertJsonPath('progress_reports.0.student_id', $students[0]->id);

        $this->getJson('/api/student/classes')
            ->assertOk()
            ->assertJsonPath('0.workspace.report_count', 1)
            ->assertJsonPath('0.workspace.latest_report.material_covered', 'Materi khusus murid 1');
    }

    public function test_opening_chat_marks_all_unread_messages_even_above_one_hundred(): void
    {
        [$teacher, $students, $booking] = $this->makePaidBooking();
        $student = $students[0];
        $now = now();
        ClassroomMessage::insert(collect(range(1, 120))->map(fn ($number) => [
            'booking_id' => $booking->id,
            'sender_id' => $teacher->id,
            'body' => "Pesan {$number}",
            'message_type' => 'user',
            'created_at' => $now,
            'updated_at' => $now,
        ])->all());

        Sanctum::actingAs($student);
        $this->getJson("/api/bookings/{$booking->id}/learning-session")->assertOk();

        $this->assertSame(
            $booking->classroomMessages()->count(),
            ClassroomMessageRead::query()->where('user_id', $student->id)->count()
        );
    }

    public function test_paid_chat_restores_one_idempotent_system_message(): void
    {
        [, $students, $booking] = $this->makePaidBooking();
        Sanctum::actingAs($students[0]);

        $this->getJson('/api/conversations')->assertOk();
        $this->getJson("/api/bookings/{$booking->id}/learning-session")
            ->assertOk()
            ->assertJsonPath('messages.0.sender_role', 'system')
            ->assertJsonPath('messages.0.message_type', 'system');

        $this->getJson('/api/conversations')->assertOk();
        $this->assertDatabaseCount('classroom_messages', 1);
        $this->assertDatabaseHas('classroom_messages', [
            'booking_id' => $booking->id,
            'system_event_key' => 'order-connected',
        ]);
    }

    public function test_support_ticket_ordering_and_counterpart_notifications_work_on_sqlite(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'email' => 'admin@example.test',
        ]);
        config(['bimbelku.primary_admin_email' => 'admin@example.test']);
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);

        Sanctum::actingAs($student);
        $ticketId = $this->postJson('/api/tickets', [
            'subject' => 'Butuh bantuan pembayaran',
            'message' => 'Bukti pembayaran belum diperiksa oleh admin.',
        ])->assertCreated()->json('data.id');
        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'target_url' => '/admin/pesan',
        ]);

        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/tickets')
            ->assertOk()
            ->assertJsonPath('0.id', $ticketId);
        $this->postJson("/api/tickets/{$ticketId}/reply", [
            'message' => 'Pembayaran sedang kami periksa.',
        ])->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $student->id,
            'target_url' => '/student/help',
        ]);
    }

    public function test_progress_report_cannot_be_published_twice_for_same_session_and_student(): void
    {
        [$teacher, $students, $booking] = $this->makePaidBooking();
        $student = $students[0];
        $participant = $booking->participants()->firstOrFail();
        LearningPlan::create([
            'booking_id' => $booking->id,
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'initial_assessment' => 'Asesmen awal lengkap untuk kebutuhan pengujian.',
            'learning_target' => 'Target belajar lengkap untuk kebutuhan pengujian.',
            'success_indicator' => 'Indikator keberhasilan lengkap untuk pengujian.',
            'student_acknowledged_at' => now(),
            'status' => 'active',
        ]);
        SessionAttendance::create([
            'booking_id' => $booking->id,
            'user_id' => $teacher->id,
            'role' => 'teacher',
            'check_in_at' => now()->subHour(),
            'check_out_at' => now(),
            'pin_verified_at' => now()->subHour(),
        ]);
        ParticipantAttendance::create([
            'booking_id' => $booking->id,
            'booking_participant_id' => $participant->id,
            'student_id' => $student->id,
            'marked_by' => $teacher->id,
            'status' => 'present',
            'marked_at' => now(),
        ]);
        LearningProgressReport::create([
            'booking_id' => $booking->id,
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'session_number' => 1,
            'material_covered' => 'Laporan yang sudah diterbitkan sebelumnya.',
            'mastered_skills' => 'Kemampuan yang sudah dikuasai oleh murid.',
            'next_exercise' => 'Latihan berikutnya untuk murid.',
            'attendance' => 'present',
            'actual_duration_minutes' => 60,
            'progress_percent' => 70,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($teacher);
        $this->postJson("/api/teacher/bookings/{$booking->id}/progress-reports", [
            'material_covered' => 'Materi duplikat yang tidak boleh tersimpan.',
            'mastered_skills' => 'Kemampuan duplikat yang tidak boleh tersimpan.',
            'next_exercise' => 'Latihan duplikat yang tidak boleh tersimpan.',
            'progress_percent' => 80,
        ])->assertUnprocessable();

        $this->assertSame(1, LearningProgressReport::query()->where('booking_id', $booking->id)->count());
    }

    private function makePaidBooking(string $classType = 'private', int $studentCount = 1): array
    {
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'active']);
        $students = collect(range(1, $studentCount))
            ->map(fn () => User::factory()->create(['role' => 'student', 'status' => 'active']));
        $scheduledStart = Carbon::parse('2026-08-03 10:00:00', 'Asia/Jakarta');
        $scheduledEnd = Carbon::parse('2026-08-03 11:00:00', 'Asia/Jakarta');
        $bookingRequests = $students->map(fn (User $student) => BookingRequest::create([
            'student_id' => $student->id,
            'matched_teacher_id' => $teacher->id,
            'subject_name' => 'Matematika',
            'education_level' => 'SMP',
            'grade' => 'Kelas 7',
            'learning_mode' => 'online',
            'class_type' => $classType,
            'scheduled_date' => $scheduledStart->toDateString(),
            'start_time' => $scheduledStart->format('H:i:s'),
            'end_time' => $scheduledEnd->format('H:i:s'),
            'duration_hours' => 1,
            'status' => 'confirmed',
            'hourly_rate' => 50000,
            'total_amount' => 50000,
        ]));
        $booking = Booking::create([
            'booking_request_id' => $bookingRequests[0]->id,
            'student_id' => $students[0]->id,
            'teacher_id' => $teacher->id,
            'start_at' => $scheduledStart,
            'end_at' => $scheduledEnd,
            'duration_hours' => 1,
            'learning_mode' => 'online',
            'class_type' => $classType,
            'hourly_rate' => 50000,
            'total_amount' => 50000 * $studentCount,
            'status' => 'confirmed',
            'commission_percent' => 20,
            'gross_amount' => 50000 * $studentCount,
            'teacher_net_amount' => 40000 * $studentCount,
            'payout_status' => 'locked',
        ]);
        foreach ($students as $index => $student) {
            $order = Order::create([
                'user_id' => $student->id,
                'booking_id' => $booking->id,
                'order_id' => "INV-CP3-{$booking->id}-{$index}",
                'amount' => 50000,
                'status' => 'paid',
            ]);
            BookingParticipant::create([
                'booking_id' => $booking->id,
                'booking_request_id' => $bookingRequests[$index]->id,
                'student_id' => $student->id,
                'order_id' => $order->id,
                'amount' => 50000,
                'status' => 'paid',
            ]);
            $bookingRequests[$index]->update(['booking_id' => $booking->id]);
            if ($index === 0) {
                $booking->update(['order_id' => $order->id]);
            }
        }

        return [$teacher, $students, $booking->fresh()];
    }
}
