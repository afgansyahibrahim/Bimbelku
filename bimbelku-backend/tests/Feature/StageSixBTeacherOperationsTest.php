<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\BookingRequest;
use App\Models\Order;
use App\Models\TeacherAvailability;
use App\Models\TeacherProfile;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageSixBTeacherOperationsTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_paid_chat_attachment_is_idempotent_and_gets_a_read_receipt(): void
    {
        Storage::fake('local');
        [$student, $teacher, $booking] = $this->makeBooking();
        $clientToken = 'f5bf860e-98f8-4f82-9b7c-5121d8b1f6e2';

        Sanctum::actingAs($student);
        $this->post("/api/bookings/{$booking->id}/messages", [
            'body' => 'Berikut latihan yang ingin dibahas.',
            'attachment' => UploadedFile::fake()->create('latihan.pdf', 40, 'application/pdf'),
            'client_token' => $clientToken,
        ])->assertCreated();
        $this->post("/api/bookings/{$booking->id}/messages", [
            'body' => 'Berikut latihan yang ingin dibahas.',
            'attachment' => UploadedFile::fake()->create('latihan.pdf', 40, 'application/pdf'),
            'client_token' => $clientToken,
        ])->assertOk();
        $this->assertDatabaseCount('classroom_messages', 1);

        Sanctum::actingAs($teacher);
        $this->getJson('/api/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.unread_count', 1);
        $this->getJson("/api/bookings/{$booking->id}/learning-session")
            ->assertOk();
        $this->assertDatabaseHas('classroom_message_reads', [
            'user_id' => $teacher->id,
        ]);
    }

    public function test_schedule_changes_only_after_the_other_party_approves(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-01 08:00:00', 'Asia/Jakarta'));
        [$student, $teacher, $booking] = $this->makeBooking(
            Carbon::parse('2026-08-02 10:00:00', 'Asia/Jakarta'),
            Carbon::parse('2026-08-02 11:00:00', 'Asia/Jakarta')
        );
        TeacherAvailability::create([
            'user_id' => $teacher->id,
            'day' => 'Senin',
            'is_active' => true,
            'start_time' => '08:00:00',
            'end_time' => '20:00:00',
        ]);

        Sanctum::actingAs($student);
        $changeId = $this->postJson("/api/bookings/{$booking->id}/schedule-changes", [
            'proposed_start_at' => '2026-08-03 14:00:00',
            'reason' => 'Ada kegiatan sekolah wajib pada jadwal lama dan waktunya tidak dapat dipindahkan.',
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'start_at' => '2026-08-02 10:00:00',
        ]);

        Sanctum::actingAs($teacher);
        $this->postJson("/api/bookings/{$booking->id}/schedule-changes/{$changeId}/respond", [
            'decision' => 'approved',
        ])->assertOk();
        $this->assertDatabaseHas('schedule_change_requests', [
            'id' => $changeId,
            'status' => 'approved',
        ]);
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'start_at' => '2026-08-03 14:00:00',
            'end_at' => '2026-08-03 15:00:00',
        ]);
    }

    public function test_teacher_payout_request_moves_ready_sessions_to_requested_once(): void
    {
        [$student, $teacher, $booking] = $this->makeBooking();
        $booking->update([
            'status' => 'completed',
            'completed_at' => now(),
            'gross_amount' => 100000,
            'teacher_net_amount' => 80000,
            'payout_status' => 'ready',
        ]);
        TeacherProfile::create([
            'user_id' => $teacher->id,
            'points' => 150,
            'bank_name' => 'Bank Contoh',
            'account_number' => '1234567890',
            'account_name' => $teacher->name,
            'bank_details_version' => 1,
        ]);

        Sanctum::actingAs($teacher);
        $this->postJson('/api/teacher/payout-requests', [
            'booking_ids' => [$booking->id],
        ], ['Idempotency-Key' => 'stage6b-payout-request-0001'])
            ->assertCreated();

        $this->assertDatabaseHas('teacher_payout_requests', [
            'teacher_id' => $teacher->id,
            'net_amount' => 80000,
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'payout_status' => 'requested',
        ]);
    }

    private function makeBooking(?Carbon $start = null, ?Carbon $end = null): array
    {
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'active']);
        $start ??= now()->addDay()->startOfHour();
        $end ??= $start->copy()->addHour();
        $bookingRequest = BookingRequest::create([
            'student_id' => $student->id,
            'matched_teacher_id' => $teacher->id,
            'subject_name' => 'Matematika',
            'education_level' => 'SMP',
            'grade' => 'Kelas 7',
            'learning_mode' => 'online',
            'class_type' => 'private',
            'scheduled_date' => $start->toDateString(),
            'start_time' => $start->format('H:i:s'),
            'end_time' => $end->format('H:i:s'),
            'duration_hours' => 1,
            'status' => 'confirmed',
            'hourly_rate' => 100000,
            'total_amount' => 100000,
        ]);
        $booking = Booking::create([
            'booking_request_id' => $bookingRequest->id,
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'start_at' => $start,
            'end_at' => $end,
            'duration_hours' => 1,
            'learning_mode' => 'online',
            'class_type' => 'private',
            'hourly_rate' => 100000,
            'total_amount' => 100000,
            'status' => 'confirmed',
            'commission_percent' => 20,
            'gross_amount' => 100000,
            'teacher_net_amount' => 80000,
            'payout_status' => 'locked',
        ]);
        $order = Order::create([
            'user_id' => $student->id,
            'booking_id' => $booking->id,
            'order_id' => 'INV-6B-'.$booking->id,
            'amount' => 100000,
            'status' => 'paid',
        ]);
        BookingParticipant::create([
            'booking_id' => $booking->id,
            'booking_request_id' => $bookingRequest->id,
            'student_id' => $student->id,
            'order_id' => $order->id,
            'amount' => 100000,
            'status' => 'paid',
        ]);
        $booking->update(['order_id' => $order->id]);
        $bookingRequest->update(['booking_id' => $booking->id]);

        return [$student, $teacher, $booking->fresh()];
    }
}
