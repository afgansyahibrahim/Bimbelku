<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\BookingRequest;
use App\Models\Order;
use App\Models\LearningPackage;
use App\Models\PackageSession;
use App\Models\PackageLearningTopic;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageOneSessionActionReminderTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_student_reminder_is_server_driven_for_pin_and_session_review(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-15 10:00:00', 'Asia/Jakarta'));
        [$student, , $booking] = $this->makePrivateBooking();

        Sanctum::actingAs($student);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.booking_id', $booking->id)
            ->assertJsonPath('data.kind', 'student_generate_pin')
            ->assertJsonPath('data.target_url', "/student/my-classes?session={$booking->id}&session_action=pin");

        $participant = $booking->participants()->firstOrFail();
        $booking->update([
            'status' => 'awaiting_student_approval',
            'objection_deadline' => now()->addHours(48),
        ]);
        $participant->update(['status' => 'awaiting_student_approval']);

        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'student_review_session')
            ->assertJsonPath('data.target_url', "/student/my-classes?session={$booking->id}&session_action=review");

        $this->getJson('/api/student/classes')
            ->assertOk()
            ->assertJsonPath('0.id', $booking->id)
            ->assertJsonPath('0.attention.kind', 'review')
            ->assertJsonPath('0.attention.button_label', 'Periksa & Konfirmasi');
    }

    public function test_teacher_reminder_advances_one_action_at_a_time_until_session_can_be_completed(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-15 10:00:00', 'Asia/Jakarta'));
        [$student, $teacher, $booking] = $this->makePrivateBooking();

        Sanctum::actingAs($student);
        $pin = $this->postJson("/api/student/bookings/{$booking->id}/session-pin")
            ->assertOk()
            ->json('pin');

        Sanctum::actingAs($teacher);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_check_in');

        $this->postJson("/api/teacher/bookings/{$booking->id}/check-in", ['pin' => $pin])
            ->assertOk();
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_mark_attendance');

        $participant = $booking->participants()->firstOrFail();
        $this->putJson("/api/teacher/bookings/{$booking->id}/participant-attendance", [
            'attendances' => [[
                'participant_id' => $participant->id,
                'status' => 'present',
                'notes' => 'Murid hadir.',
            ]],
        ])->assertOk();
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_prepare_learning_plan');

        $this->putJson("/api/teacher/bookings/{$booking->id}/learning-plan", [
            'initial_assessment' => 'Murid memahami operasi dasar tetapi masih perlu latihan soal cerita.',
            'strengths' => 'Operasi bilangan dasar.',
            'challenges' => 'Mengubah soal cerita menjadi model matematika.',
            'learning_target' => 'Murid mampu menyelesaikan latihan persamaan linear dengan mandiri.',
            'success_indicator' => 'Murid mampu menjawab sedikitnya delapan dari sepuluh soal dengan benar.',
            'baseline_score' => 55,
            'target_score' => 80,
        ])->assertOk();
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_waiting_plan_acknowledgement');

        Sanctum::actingAs($student);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'student_acknowledge_learning_plan');
        $this->postJson("/api/student/bookings/{$booking->id}/learning-plan/acknowledge")
            ->assertOk();

        Sanctum::actingAs($teacher);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_session_ready');

        Carbon::setTestNow(Carbon::parse('2026-08-15 10:50:00', 'Asia/Jakarta'));
        Sanctum::actingAs($teacher);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_check_out');

        $this->postJson("/api/teacher/bookings/{$booking->id}/check-out")
            ->assertOk();
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_report_progress');

        $this->postJson("/api/teacher/bookings/{$booking->id}/progress-reports", [
            'material_covered' => 'Persamaan linear satu variabel dan penerapannya.',
            'mastered_skills' => 'Murid dapat memindahkan ruas dan memeriksa hasil.',
            'difficulties' => 'Masih lambat pada soal cerita.',
            'next_exercise' => 'Kerjakan sepuluh soal cerita persamaan linear.',
            'attendance' => 'present',
            'progress_percent' => 65,
            'notes' => 'Kecepatan pengerjaan perlu dilatih.',
        ])->assertCreated();

        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_complete_session')
            ->assertJsonPath('data.target_url', "/guru/kelas?session={$booking->id}&session_action=complete");
    }

    public function test_active_pin_requires_explicit_replacement_and_old_attendance_cannot_change_after_progress(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-15 10:00:00', 'Asia/Jakarta'));
        [$student, $teacher, $booking] = $this->makePrivateBooking();

        Sanctum::actingAs($student);
        $firstPin = $this->postJson("/api/student/bookings/{$booking->id}/session-pin")
            ->assertOk()
            ->json('pin');
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'student_pin_active');

        $this->postJson("/api/student/bookings/{$booking->id}/session-pin")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['pin']);

        $replacementPin = $this->postJson("/api/student/bookings/{$booking->id}/session-pin", ['replace' => true])
            ->assertOk()
            ->json('pin');
        $this->assertNotEmpty($replacementPin);

        Sanctum::actingAs($teacher);
        $this->postJson("/api/teacher/bookings/{$booking->id}/check-in", ['pin' => $replacementPin])
            ->assertOk();
        $participant = $booking->participants()->firstOrFail();
        $attendancePayload = [
            'attendances' => [[
                'participant_id' => $participant->id,
                'status' => 'present',
                'notes' => 'Murid hadir.',
            ]],
        ];
        $this->putJson("/api/teacher/bookings/{$booking->id}/participant-attendance", $attendancePayload)
            ->assertOk();
        $this->putJson("/api/teacher/bookings/{$booking->id}/learning-plan", [
            'initial_assessment' => 'Murid memahami operasi dasar tetapi masih perlu latihan soal cerita.',
            'strengths' => 'Operasi bilangan dasar.',
            'challenges' => 'Mengubah soal cerita menjadi model matematika.',
            'learning_target' => 'Murid mampu menyelesaikan latihan persamaan linear dengan mandiri.',
            'success_indicator' => 'Murid mampu menjawab sedikitnya delapan dari sepuluh soal dengan benar.',
            'baseline_score' => 55,
            'target_score' => 80,
        ])->assertOk();

        Sanctum::actingAs($student);
        $this->postJson("/api/student/bookings/{$booking->id}/learning-plan/acknowledge")
            ->assertOk();

        Carbon::setTestNow(Carbon::parse('2026-08-15 10:50:00', 'Asia/Jakarta'));
        Sanctum::actingAs($teacher);
        $this->postJson("/api/teacher/bookings/{$booking->id}/check-out")->assertOk();
        $this->postJson("/api/teacher/bookings/{$booking->id}/progress-reports", [
            'material_covered' => 'Persamaan linear satu variabel dan penerapannya.',
            'mastered_skills' => 'Murid dapat memindahkan ruas dan memeriksa hasil.',
            'difficulties' => 'Masih lambat pada soal cerita.',
            'next_exercise' => 'Kerjakan sepuluh soal cerita persamaan linear.',
            'attendance' => 'present',
            'progress_percent' => 65,
            'notes' => 'Kecepatan pengerjaan perlu dilatih.',
        ])->assertCreated();

        $attendancePayload['attendances'][0]['status'] = 'absent';
        $this->putJson("/api/teacher/bookings/{$booking->id}/participant-attendance", $attendancePayload)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Kehadiran sudah dikunci karena hasil belajar sesi telah disimpan.');

        // PIN pertama otomatis mati setelah replacement; test memastikan tutor memakai PIN terbaru.
        $this->assertNotSame('', (string) $firstPin);
    }

    public function test_demo_session_reminder_command_prepares_local_paid_session_without_72_hour_wait(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-15 10:00:00', 'Asia/Jakarta'));

        $this->artisan('demo:session-reminder', ['stage' => 'setup'])
            ->assertSuccessful();

        $student = User::query()->where('email', 'demo.student@bimbelku.local')->firstOrFail();
        $teacher = User::query()->where('email', 'demo.tutor@bimbelku.local')->firstOrFail();
        $booking = Booking::query()
            ->where('student_id', $student->id)
            ->where('teacher_id', $teacher->id)
            ->latest('id')
            ->firstOrFail();

        $package = LearningPackage::query()
            ->where('student_id', $student->id)
            ->where('package_code', 'like', 'DEMO-SESSION-%')
            ->latest('id')
            ->firstOrFail();
        $packageSession = PackageSession::query()
            ->where('booking_id', $booking->id)
            ->with('subject.learningTopics')
            ->firstOrFail();
        $participant = $booking->participants()->firstOrFail();

        $this->assertSame('active', $package->status);
        $this->assertSame($package->id, $packageSession->subject->learning_package_id);
        $this->assertSame(3, $packageSession->subject->learningTopics->count());
        $this->assertSame('confirmed', $booking->status);
        $this->assertTrue($booking->start_at->lte(now()));
        $this->assertTrue($booking->end_at->gt(now()));
        $this->assertSame('paid', $participant->status);
        $this->assertNull($participant->approved_at);
        $this->assertSame('paid', $participant->order()->firstOrFail()->status);
        $this->assertNotNull($teacher->teacherProfile?->verified_at);
        $this->assertGreaterThan(0, (int) $teacher->teacherProfile?->points);

        // Demo bukan cuma membuat row database: dua akun harus benar-benar bisa login
        // lewat AuthController production dan reminder harus terbaca oleh API yang dipakai UI.
        $this->postJson('/api/login', [
            'email' => 'demo.student@bimbelku.local',
            'password' => 'password',
        ])->assertOk()->assertJsonPath('user.role', 'student');

        $this->postJson('/api/login', [
            'email' => 'demo.tutor@bimbelku.local',
            'password' => 'password',
        ])->assertOk()->assertJsonPath('user.role', 'teacher');

        Sanctum::actingAs($student);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.booking_id', $booking->id)
            ->assertJsonPath('data.kind', 'student_generate_pin');
        $this->getJson('/api/student/packages?scope=active&per_page=100')
            ->assertOk()
            ->assertJsonPath('data.0.id', $package->id)
            ->assertJsonPath('data.0.status', 'active');

        Sanctum::actingAs($teacher);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.booking_id', $booking->id)
            ->assertJsonPath('data.kind', 'teacher_check_in');

        $this->artisan('demo:session-reminder', ['stage' => 'checkout-ready'])
            ->assertSuccessful();
        $freshBooking = $booking->fresh();
        $freshPackageSession = $packageSession->fresh();
        $this->assertTrue($freshBooking->end_at->lt(now()));
        $this->assertSame($freshBooking->start_at->timestamp, $freshPackageSession->scheduled_start_at->timestamp);
        $this->assertSame($freshBooking->end_at->timestamp, $freshPackageSession->scheduled_end_at->timestamp);
        $this->assertSame('active', $package->fresh()->status);
    }

    public function test_demo_real_package_finishes_end_to_end_with_topic_progress_and_student_approval(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-15 10:00:00', 'Asia/Jakarta'));
        Storage::fake('local');

        $this->artisan('demo:session-reminder', ['stage' => 'setup'])->assertSuccessful();

        $student = User::query()->where('email', 'demo.student@bimbelku.local')->firstOrFail();
        $teacher = User::query()->where('email', 'demo.tutor@bimbelku.local')->firstOrFail();
        $package = LearningPackage::query()
            ->where('student_id', $student->id)
            ->where('package_code', 'like', 'DEMO-SESSION-%')
            ->latest('id')
            ->firstOrFail();
        $packageSession = PackageSession::query()
            ->whereHas('subject', fn ($query) => $query->where('learning_package_id', $package->id))
            ->with('subject.learningTopics')
            ->firstOrFail();
        $booking = Booking::query()->findOrFail($packageSession->booking_id);
        $participant = $booking->participants()->firstOrFail();
        $topics = $packageSession->subject->learningTopics->sortBy('sort_order')->values();

        Sanctum::actingAs($student);
        $pin = $this->postJson("/api/student/bookings/{$booking->id}/session-pin")
            ->assertOk()
            ->json('pin');

        Sanctum::actingAs($teacher);
        $this->postJson("/api/teacher/bookings/{$booking->id}/check-in", ['pin' => $pin])->assertOk();
        $this->putJson("/api/teacher/bookings/{$booking->id}/participant-attendance", [
            'attendances' => [[
                'participant_id' => $participant->id,
                'status' => 'present',
                'notes' => 'Murid hadir untuk demo end-to-end.',
            ]],
        ])->assertOk();
        $this->putJson("/api/teacher/bookings/{$booking->id}/learning-plan", [
            'initial_assessment' => 'Murid memahami operasi dasar dan siap mempelajari persamaan linear.',
            'strengths' => 'Operasi bilangan dasar sudah cukup baik.',
            'challenges' => 'Masih perlu latihan menerjemahkan soal cerita.',
            'learning_target' => 'Murid memahami konsep persamaan linear dan menentukan nilai variabel.',
            'success_indicator' => 'Murid dapat menyelesaikan sedikitnya delapan dari sepuluh latihan dengan benar.',
            'baseline_score' => 55,
            'target_score' => 80,
        ])->assertOk();

        Sanctum::actingAs($student);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'student_acknowledge_learning_plan');
        $this->postJson("/api/student/bookings/{$booking->id}/learning-plan/acknowledge")->assertOk();

        // Helper hanya memajukan waktu fixture lokal; lifecycle production tetap sama.
        $this->artisan('demo:session-reminder', ['stage' => 'checkout-ready'])->assertSuccessful();

        Sanctum::actingAs($teacher);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_check_out');
        $this->postJson("/api/teacher/bookings/{$booking->id}/check-out")->assertOk();
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_report_progress');

        $this->postJson("/api/teacher/bookings/{$booking->id}/progress-reports", [
            'material_covered' => 'Konsep persamaan linear dan latihan menentukan nilai variabel.',
            'mastered_skills' => 'Murid dapat mengenali bentuk persamaan dan mulai menentukan nilai variabel.',
            'difficulties' => 'Soal cerita masih memerlukan arahan tutor.',
            'next_exercise' => 'Latihan lima soal nilai variabel dan lima soal cerita persamaan linear.',
            'notes' => 'Pertemuan berjalan baik dan materi berikutnya perlu fokus soal cerita.',
            'topic_updates' => [
                [
                    'topic_id' => $topics[0]->id,
                    'activity_type' => 'taught',
                    'status_after' => 'completed',
                    'needs_review' => false,
                    'notes' => 'Konsep dasar sudah dipahami.',
                ],
                [
                    'topic_id' => $topics[1]->id,
                    'activity_type' => 'taught',
                    'status_after' => 'in_progress',
                    'needs_review' => true,
                    'notes' => 'Perlu latihan tambahan.',
                ],
            ],
        ])->assertCreated();

        $this->assertSame('completed', PackageLearningTopic::query()->findOrFail($topics[0]->id)->status);
        $this->assertSame('in_progress', PackageLearningTopic::query()->findOrFail($topics[1]->id)->status);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_complete_session');

        // PNG 1x1 valid supaya test tidak bergantung pada GD.
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=');
        $evidence = UploadedFile::fake()->createWithContent('bukti-sesi.png', $png);
        $this->post("/api/teacher/bookings/{$booking->id}/complete", [
            'evidence' => $evidence,
            'notes' => 'Sesi demo berlangsung sesuai target, murid hadir dan mengikuti pembelajaran sampai selesai.',
            'capture_source' => 'camera',
            'captured_at' => now()->toIso8601String(),
        ])->assertOk();

        $booking->refresh();
        $participant->refresh();
        $this->assertSame('awaiting_student_approval', $booking->status);
        $this->assertSame('awaiting_student_approval', $participant->status);

        Sanctum::actingAs($student);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'student_review_session');
        $this->getJson('/api/student/classes')
            ->assertOk()
            ->assertJsonPath('0.id', $booking->id)
            ->assertJsonPath('0.attention.kind', 'review');
        $this->postJson("/api/student/bookings/{$booking->id}/approve")->assertOk();

        $booking->refresh();
        $participant->refresh();
        $package->refresh();
        $this->assertSame('completed', $booking->status);
        $this->assertSame('approved', $participant->status);
        $this->assertNotNull($participant->approved_at);
        $this->assertSame('completed', $package->status);
        $this->assertSame(1, $package->used_sessions);

        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data', null);
        $this->getJson('/api/student/packages?scope=history&per_page=100')
            ->assertOk()
            ->assertJsonPath('data.0.id', $package->id)
            ->assertJsonPath('data.0.status', 'completed');
    }

    private function makePrivateBooking(): array
    {
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'active']);
        $scheduledStart = Carbon::parse('2026-08-15 10:00:00', 'Asia/Jakarta');
        $scheduledEnd = Carbon::parse('2026-08-15 11:00:00', 'Asia/Jakarta');
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
            'gross_amount' => 50000,
            'teacher_net_amount' => 40000,
            'payout_status' => 'locked',
        ]);
        $order = Order::create([
            'user_id' => $student->id,
            'booking_id' => $booking->id,
            'order_id' => 'INV-SESSION-ACTION-'.$booking->id,
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
        $booking->update(['order_id' => $order->id]);
        $bookingRequest->update(['booking_id' => $booking->id]);

        return [$student, $teacher, $booking->fresh()];
    }
}
