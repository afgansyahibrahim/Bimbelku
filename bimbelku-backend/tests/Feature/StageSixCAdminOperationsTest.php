<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingRequest;
use App\Models\MatchingOperationLog;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\TeacherAvailability;
use App\Models\TeacherOffer;
use App\Models\TeacherProfile;
use App\Models\TeacherSubject;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageSixCAdminOperationsTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_admin_can_monitor_offer_history_and_synchronize_an_overdue_search(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00', 'Asia/Jakarta'));
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'active']);
        $bookingRequest = $this->makeSearch($student, [
            'status' => 'teacher_pending',
            'matched_teacher_id' => $teacher->id,
            'teacher_response_deadline' => now()->subMinute(),
        ]);
        TeacherOffer::create([
            'booking_request_id' => $bookingRequest->id,
            'teacher_id' => $teacher->id,
            'status' => 'pending',
            'offered_at' => now()->subHours(2),
            'expires_at' => now()->subMinute(),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/tutor-searches?status=attention')
            ->assertOk()
            ->assertJsonPath('summary.attention', 1)
            ->assertJsonPath('data.0.id', $bookingRequest->id)
            ->assertJsonPath('data.0.active_offer.is_overdue', true);

        $this->getJson("/api/admin/tutor-searches/{$bookingRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.available_candidate_count', 0)
            ->assertJsonPath('data.offer_history.0.teacher.id', $teacher->id)
            ->assertJsonPath('data.offer_history.0.is_overdue', true);

        $this->postJson("/api/admin/tutor-searches/{$bookingRequest->id}/synchronize")
            ->assertOk();

        $this->assertDatabaseHas('teacher_offers', [
            'booking_request_id' => $bookingRequest->id,
            'teacher_id' => $teacher->id,
            'status' => 'expired',
        ]);
        $this->assertDatabaseHas('booking_requests', [
            'id' => $bookingRequest->id,
            'status' => 'no_teacher',
            'matched_teacher_id' => null,
        ]);
    }

    public function test_admin_can_expand_offline_radius_in_sequence_and_audit_the_reason(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00', 'Asia/Jakarta'));
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $bookingRequest = $this->makeSearch($student, [
            'status' => 'no_teacher',
            'search_radius_km' => 3,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/tutor-searches/{$bookingRequest->id}/expand-radius", [
            'reason' => 'Kandidat radius awal sudah habis dan jadwal murid semakin dekat.',
        ])
            ->assertOk()
            ->assertJsonPath('radius', 5);

        $bookingRequest->refresh();
        $this->assertSame(5, (int) $bookingRequest->search_radius_km);
        $this->assertSame('no_teacher', $bookingRequest->status);

        $this->postJson("/api/admin/tutor-searches/{$bookingRequest->id}/expand-radius", [
            'reason' => 'Pencarian lima kilometer belum menemukan tutor yang tersedia.',
        ])
            ->assertOk()
            ->assertJsonPath('radius', 8);

        $logs = MatchingOperationLog::query()
            ->where('booking_request_id', $bookingRequest->id)
            ->where('action', 'radius_expanded')
            ->oldest('id')
            ->get();

        $this->assertCount(2, $logs);
        $this->assertSame($admin->id, $logs->first()->actor_id);
        $this->assertSame(3, (int) $logs->first()->before_state['search_radius_km']);
        $this->assertSame(5, (int) $logs->first()->after_state['search_radius_km']);
        $this->assertSame(8, (int) $logs->last()->after_state['search_radius_km']);
    }

    public function test_admin_can_assign_an_eligible_teacher_manually(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00', 'Asia/Jakarta'));
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $teacher = $this->makeEligibleTeacher();
        $bookingRequest = $this->makeSearch($student, [
            'status' => 'no_teacher',
            'hourly_rate' => 100000,
            'total_amount' => 100000,
        ]);
        PaymentSetting::create([
            'merchant_name' => 'BimbelKu',
            'bank_name' => 'Bank Uji',
            'account_number' => '1234567890',
            'account_name' => 'BimbelKu Official',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/tutor-searches/{$bookingRequest->id}/candidates")
            ->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('data.0.id', $teacher->id);

        $this->postJson("/api/admin/tutor-searches/{$bookingRequest->id}/assign-teacher", [
            'teacher_id' => $teacher->id,
            'reason' => 'Tutor sudah dikonfirmasi bersedia oleh admin operasional.',
            'confirmed_teacher_consent' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.teacher.id', $teacher->id)
            ->assertJsonPath('data.assignment_type', 'single');

        $this->assertDatabaseHas('booking_requests', [
            'id' => $bookingRequest->id,
            'matched_teacher_id' => $teacher->id,
            'status' => 'awaiting_payment',
        ]);
        $this->assertDatabaseHas('teacher_offers', [
            'booking_request_id' => $bookingRequest->id,
            'teacher_id' => $teacher->id,
            'status' => 'accepted',
        ]);
        $this->assertDatabaseHas('bookings', [
            'booking_request_id' => $bookingRequest->id,
            'teacher_id' => $teacher->id,
            'status' => 'awaiting_payment',
        ]);
        $this->assertDatabaseHas('matching_operation_logs', [
            'booking_request_id' => $bookingRequest->id,
            'actor_id' => $admin->id,
            'action' => 'teacher_assigned_manually',
        ]);
    }

    public function test_manual_assignment_rejects_teacher_with_schedule_conflict(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00', 'Asia/Jakarta'));
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $otherStudent = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $teacher = $this->makeEligibleTeacher();
        $target = $this->makeSearch($student, [
            'status' => 'no_teacher',
            'hourly_rate' => 100000,
            'total_amount' => 100000,
        ]);
        $conflictingRequest = $this->makeSearch($otherStudent, [
            'status' => 'confirmed',
            'matched_teacher_id' => $teacher->id,
        ]);
        Booking::create([
            'booking_request_id' => $conflictingRequest->id,
            'student_id' => $otherStudent->id,
            'teacher_id' => $teacher->id,
            'start_at' => Carbon::parse('2026-08-02 15:00:00', 'Asia/Jakarta'),
            'end_at' => Carbon::parse('2026-08-02 16:00:00', 'Asia/Jakarta'),
            'duration_hours' => 1,
            'learning_mode' => 'offline',
            'class_type' => 'private',
            'hourly_rate' => 100000,
            'total_amount' => 100000,
            'status' => 'confirmed',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/tutor-searches/{$target->id}/assign-teacher", [
            'teacher_id' => $teacher->id,
            'reason' => 'Admin mencoba penetapan setelah komunikasi dengan tutor.',
            'confirmed_teacher_consent' => true,
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Jadwal tutor bertabrakan dengan kelas lain.');

        $this->assertDatabaseMissing('matching_operation_logs', [
            'booking_request_id' => $target->id,
            'action' => 'teacher_assigned_manually',
        ]);
        $this->assertDatabaseMissing('teacher_offers', [
            'booking_request_id' => $target->id,
            'teacher_id' => $teacher->id,
            'status' => 'accepted',
        ]);
    }

    public function test_dashboard_prioritizes_real_admin_work_queues(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00', 'Asia/Jakarta'));
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        User::factory()->create(['role' => 'teacher', 'status' => 'pending']);
        $this->makeSearch($student, ['status' => 'no_teacher']);
        Order::create([
            'user_id' => $student->id,
            'order_id' => 'INV-6C-ADMIN-1',
            'amount' => 125000,
            'status' => 'submitted',
            'payment_proof' => 'payment-proofs/testing.jpg',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/dashboard-stats')
            ->assertOk()
            ->assertJsonPath('counts.teachers', 1)
            ->assertJsonPath('counts.orders', 1)
            ->assertJsonPath('counts.matching_attention', 1)
            ->assertJsonFragment([
                'key' => 'matching',
                'href' => '/admin/tutor-searches?status=attention',
                'count' => 1,
            ]);
    }

    private function makeEligibleTeacher(): User
    {
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'status' => 'active',
        ]);
        $profile = TeacherProfile::create([
            'user_id' => $teacher->id,
            'latitude' => -7.250445,
            'longitude' => 112.768845,
            'max_travel_km' => 12,
            'points' => 150,
            'is_accepting_requests' => true,
            'verified_at' => now(),
        ]);
        TeacherSubject::create([
            'teacher_profile_id' => $profile->id,
            'name' => 'Matematika',
            'levels' => ['SD'],
            'is_active' => true,
            'is_online' => true,
            'is_offline' => true,
            'is_private_active' => true,
            'is_group_active' => true,
        ]);
        TeacherAvailability::create([
            'user_id' => $teacher->id,
            'day' => 'Minggu',
            'slots' => ['15:00'],
            'start_time' => '14:00:00',
            'end_time' => '17:00:00',
            'is_active' => true,
        ]);

        return $teacher->fresh('teacherProfile.subjects');
    }

    private function makeSearch(User $student, array $overrides = []): BookingRequest
    {
        return BookingRequest::create(array_merge([
            'student_id' => $student->id,
            'subject_name' => 'Matematika',
            'education_level' => 'SD',
            'grade' => 'Kelas 4',
            'learning_mode' => 'offline',
            'class_type' => 'private',
            'scheduled_date' => now()->addDay()->toDateString(),
            'start_time' => '15:00:00',
            'end_time' => '16:00:00',
            'duration_hours' => 1,
            'address' => 'Alamat pengujian privat',
            'latitude' => -7.250445,
            'longitude' => 112.768845,
            'status' => 'matching',
            'matching_attempts' => 1,
            'search_radius_km' => 3,
            'search_started_at' => now()->subHour(),
            'search_expires_at' => now()->addDay(),
        ], $overrides));
    }
}
