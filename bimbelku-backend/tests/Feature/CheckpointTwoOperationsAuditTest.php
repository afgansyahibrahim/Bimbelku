<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\BookingRequest;
use App\Models\ClassroomMessage;
use App\Models\LearningPackage;
use App\Models\Order;
use App\Models\PackagePlan;
use App\Models\PaymentSetting;
use App\Models\User;
use App\Services\TeacherMatchingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckpointTwoOperationsAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_schedule_rejects_minutes_outside_full_hour_intervals(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'active']);
        Sanctum::actingAs($teacher);

        $schedules = collect(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'])
            ->map(fn (string $day) => [
                'day' => $day,
                'is_active' => $day === 'Senin',
                'ranges' => $day === 'Senin' ? [[
                    'start_time' => '09:05',
                    'end_time' => '10:00',
                ]] : [],
            ])->all();

        $this->postJson('/api/teacher/schedule', ['schedules' => $schedules])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Jam Senin hanya boleh memakai menit 00.');
    }

    public function test_teacher_schedule_supports_multiple_non_overlapping_ranges(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'active']);
        Sanctum::actingAs($teacher);

        $schedules = collect(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'])
            ->map(fn (string $day) => [
                'day' => $day,
                'is_active' => $day === 'Senin',
                'ranges' => $day === 'Senin' ? [
                    ['start_time' => '08:00', 'end_time' => '12:00'],
                    ['start_time' => '13:00', 'end_time' => '18:00'],
                    ['start_time' => '19:00', 'end_time' => '21:00'],
                ] : [],
            ])->all();

        $this->postJson('/api/teacher/schedule', ['schedules' => $schedules])
            ->assertOk()
            ->assertJsonPath('message', 'Rentang jadwal mengajar berhasil disimpan.');

        $matching = app(TeacherMatchingService::class);
        $timezone = config('app.timezone', 'Asia/Jakarta');
        $this->assertTrue($matching->teacherAvailableAt(
            $teacher,
            Carbon::parse('2026-08-10 09:00:00', $timezone),
            Carbon::parse('2026-08-10 10:00:00', $timezone),
        ));
        $this->assertFalse($matching->teacherAvailableAt(
            $teacher,
            Carbon::parse('2026-08-10 12:00:00', $timezone),
            Carbon::parse('2026-08-10 13:00:00', $timezone),
        ));
        $this->assertTrue($matching->teacherAvailableAt(
            $teacher,
            Carbon::parse('2026-08-10 20:00:00', $timezone),
            Carbon::parse('2026-08-10 21:00:00', $timezone),
        ));
    }

    public function test_payment_destination_cannot_change_while_package_invoice_is_active(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        PaymentSetting::create([
            'singleton_key' => 1,
            'merchant_name' => 'BimbelKu',
            'bank_name' => 'BCA',
            'account_number' => '111111',
            'account_name' => 'BimbelKu',
        ]);
        $plan = PackagePlan::create([
            'name' => 'Paket Uji',
            'slug' => 'paket-uji',
            'session_count' => 1,
            'validity_days' => 30,
            'maximum_subjects' => 1,
            'is_active' => true,
        ]);
        $package = LearningPackage::create([
            'student_id' => $student->id,
            'package_plan_id' => $plan->id,
            'package_code' => 'BKU-CP2-001',
            'education_level' => 'SMP',
            'grade' => 'Kelas 7',
            'learning_mode' => 'online',
            'duration_hours' => 1,
            'status' => 'awaiting_payment',
            'total_sessions' => 1,
            'subtotal_amount' => 100000,
            'discount_amount' => 0,
            'total_amount' => 100000,
            'payment_due_at' => now()->addDay(),
        ]);
        Order::create([
            'user_id' => $student->id,
            'learning_package_id' => $package->id,
            'order_id' => 'INV-CP2-PACKAGE',
            'amount' => 100000,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin);
        $this->postJson('/api/admin/payment-settings', [
            'merchant_name' => 'BimbelKu Baru',
            'bank_name' => 'Mandiri',
            'account_number' => '222222',
            'account_name' => 'BimbelKu Baru',
        ], ['Idempotency-Key' => 'cp2-payment-setting'])
            ->assertUnprocessable();
    }

    public function test_student_dashboard_returns_real_unread_message_count(): void
    {
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'active']);
        $bookingRequest = BookingRequest::create([
            'student_id' => $student->id,
            'matched_teacher_id' => $teacher->id,
            'subject_name' => 'Matematika',
            'education_level' => 'SMP',
            'grade' => 'Kelas 7',
            'learning_mode' => 'online',
            'class_type' => 'private',
            'scheduled_date' => now()->addDays(3)->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'duration_hours' => 1,
            'status' => 'confirmed',
            'hourly_rate' => 50000,
            'total_amount' => 50000,
        ]);
        $booking = Booking::create([
            'booking_request_id' => $bookingRequest->id,
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'start_at' => now()->addDays(3)->setTime(9, 0),
            'end_at' => now()->addDays(3)->setTime(10, 0),
            'duration_hours' => 1,
            'learning_mode' => 'online',
            'class_type' => 'private',
            'hourly_rate' => 50000,
            'total_amount' => 50000,
            'status' => 'confirmed',
        ]);
        $order = Order::create([
            'user_id' => $student->id,
            'booking_id' => $booking->id,
            'order_id' => 'INV-CP2-CHAT',
            'amount' => 50000,
            'status' => 'paid',
        ]);
        BookingParticipant::create([
            'booking_id' => $booking->id,
            'booking_request_id' => $bookingRequest->id,
            'student_id' => $student->id,
            'order_id' => $order->id,
            'amount' => 50000,
            'status' => 'paid',
        ]);
        ClassroomMessage::create([
            'booking_id' => $booking->id,
            'sender_id' => $teacher->id,
            'body' => 'Pesan tutor yang belum dibaca.',
        ]);

        Sanctum::actingAs($student);
        $this->getJson('/api/student/dashboard-v2')
            ->assertOk()
            ->assertJsonPath('unread_messages_count', 1);
    }
}
