<?php

namespace Tests\Feature;

use App\Models\LearningPackage;
use App\Models\PackagePlan;
use App\Models\TeacherOffer;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DemoPackageRenewalCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_completed_package_can_be_renewed_and_demo_reaches_second_package_final_session(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-15 16:00:00', 'Asia/Jakarta'));

        $this->artisan('demo:package-renewal setup')->assertExitCode(0);

        $student = User::query()->where('email', 'demo.student@bimbelku.local')->firstOrFail();
        $teacher = User::query()->where('email', 'demo.tutor@bimbelku.local')->firstOrFail();
        $source = LearningPackage::query()
            ->where('student_id', $student->id)
            ->where('package_code', 'like', 'DEMO-RENEW-SOURCE-%')
            ->with('subjects.chapters')
            ->latest('id')
            ->firstOrFail();

        Sanctum::actingAs($student);
        $this->getJson('/api/student/packages?scope=history&per_page=100')
            ->assertOk()
            ->assertJsonPath('data.0.can_renew', true);

        $subject = $source->subjects->firstOrFail();
        $newChapter = \App\Models\CurriculumChapter::query()
            ->where('curriculum_subject_id', $subject->curriculum_subject_id)
            ->where('title', 'Fungsi dan Persamaan Kuadrat')
            ->firstOrFail();
        $plan = PackagePlan::query()->where('is_active', true)->where('session_count', 4)->firstOrFail();

        $starts = collect([1, 3, 5, 7])->map(
            fn (int $days) => now()->addDays($days)->setTime(18, 0)->format('Y-m-d H:i:s')
        )->all();

        $subjectPayload = [
            'curriculum_subject_id' => $subject->curriculum_subject_id,
            'curriculum_chapter_ids' => [$subject->curriculum_chapter_id, $newChapter->id],
            'learning_goal' => 'Melanjutkan materi baru dan menguatkan satu materi lama.',
            'weekdays' => [1, 2, 3, 4],
            'schedules' => $starts,
        ];
        $basePayload = [
            'package_plan_id' => $plan->id,
            'education_level' => 'SMP',
            'grade' => 'Kelas 7',
            'learning_mode' => 'online',
            'duration_hours' => 1,
            'subjects' => [$subjectPayload],
        ];

        // Jadwal pertama hanya sekitar 26 jam dari testNow: pesanan baru tetap
        // harus ditolak oleh rule 72 jam.
        $this->postJson('/api/student/packages', $basePayload, ['Idempotency-Key' => 'demo-new-package-under-72h'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Jadwal paket paling cepat dimulai 72 jam dari sekarang.');

        // Renewal tanpa memilih tutor lama juga tetap dianggap matching biasa,
        // sehingga masih membutuhkan lead time 72 jam.
        $renewalWithoutSameTutor = $basePayload;
        $renewalWithoutSameTutor['renewal_of_id'] = $source->id;
        $this->postJson('/api/student/packages', $renewalWithoutSameTutor, ['Idempotency-Key' => 'demo-renewal-without-old-tutor'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Jadwal paket paling cepat dimulai 72 jam dari sekarang.');

        // Saat tutor lama dipilih pada mapel yang sama, renewal boleh memakai
        // lead time 24 jam dan jadwal di bawah 72 jam ini harus lolos.
        $renewalPayload = $basePayload;
        $renewalPayload['renewal_of_id'] = $source->id;
        $renewalPayload['subjects'][0]['preferred_teacher_id'] = $teacher->id;
        $response = $this->postJson('/api/student/packages', $renewalPayload, ['Idempotency-Key' => 'demo-renewal-flow'])
            ->assertCreated()
            ->assertJsonPath('data.renewal_of_id', $source->id)
            ->assertJsonPath('data.status', 'awaiting_payment');

        $renewalId = (int) $response->json('data.id');
        $this->getJson("/api/student/packages/{$source->id}")
            ->assertOk()
            ->assertJsonPath('can_renew', false);
        $renewal = LearningPackage::query()->with('subjects.chapters')->findOrFail($renewalId);
        $this->assertTrue($renewal->subjects->first()->chapters->every(fn ($topic) => $topic->status === 'not_started'));
        $reviewTopic = $renewal->subjects->first()->chapters->firstWhere('curriculum_chapter_id', $subject->curriculum_chapter_id);
        $this->assertNotNull($reviewTopic);
        $this->assertTrue((bool) $reviewTopic->needs_review);

        $this->artisan('demo:package-renewal payment-paid')->assertExitCode(0);

        $offer = TeacherOffer::query()
            ->where('teacher_id', $teacher->id)
            ->where('status', 'pending')
            ->whereHas('bookingRequest.packageSubject', fn ($query) => $query->where('learning_package_id', $renewalId))
            ->firstOrFail();

        Sanctum::actingAs($teacher);
        $this->postJson("/api/teacher/offers/{$offer->id}/accept")
            ->assertOk();

        $this->assertDatabaseHas('learning_packages', [
            'id' => $renewalId,
            'status' => 'active',
            'renewal_of_id' => $source->id,
        ]);

        $this->artisan('demo:package-renewal final-session-ready')->assertExitCode(0);

        $renewal->refresh();
        $this->assertSame('active', $renewal->status);
        $this->assertSame(3, (int) $renewal->used_sessions);

        $finalBooking = $renewal->fresh()->subjects()->firstOrFail()->sessions()->where('sequence', 4)->firstOrFail()->booking()->firstOrFail();
        $this->assertSame('presence_confirmation_v2', $finalBooking->session_flow_version);

        Sanctum::actingAs($teacher);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'teacher_mark_ready');
        $this->postJson("/api/teacher/bookings/{$finalBooking->id}/ready", [
            'focus_note' => 'Review akhir Bab Persamaan Linear.',
        ])->assertOk();

        Sanctum::actingAs($student);
        $this->getJson('/api/session-action/next')
            ->assertOk()
            ->assertJsonPath('data.kind', 'student_confirm_presence');
    }
}
