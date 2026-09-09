<?php

namespace Tests\Feature;

use App\Models\LearningPackage;
use App\Models\TeacherOffer;
use App\Models\TeacherReplacementRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DemoTeacherReplacementCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_demo_can_finish_with_a_new_teacher_through_real_role_endpoints(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-04 10:00:00', 'Asia/Jakarta'));
        config()->set('features.teacher_replacement', true);
        $this->artisan('demo:teacher-replacement setup')->assertExitCode(0);

        [$student, $admin, $newTeacher, $package] = $this->fixtureRecords();
        $subject = $package->subjects()->firstOrFail();
        Sanctum::actingAs($student);
        $response = $this->postJson(
            "/api/student/packages/{$package->id}/subjects/{$subject->id}/teacher-replacements",
            [
                'reason_code' => 'learning_fit',
                'reason_detail' => 'Metode belajar saat ini kurang sesuai dan perlu guru baru untuk sesi berikutnya.',
            ],
            ['Idempotency-Key' => 'demo-replacement-submit-found'],
        )->assertCreated();
        $replacementId = (int) $response->json('data.id');

        Sanctum::actingAs($admin);
        $this->postJson(
            "/api/admin/teacher-replacements/{$replacementId}/approve",
            ['notes' => 'Pengajuan demo telah diperiksa dan pencarian guru pengganti dapat dimulai.'],
            ['Idempotency-Key' => 'demo-replacement-approve-found'],
        )->assertOk();

        $offer = TeacherOffer::query()->where('teacher_id', $newTeacher->id)->where('status', 'pending')->firstOrFail();
        Sanctum::actingAs($newTeacher);
        $this->postJson("/api/teacher/offers/{$offer->id}/accept")->assertOk();

        $replacement = TeacherReplacementRequest::findOrFail($replacementId);
        $this->assertSame('completed', $replacement->status);
        $this->assertSame($newTeacher->id, $subject->fresh()->assigned_teacher_id);
        $this->assertSame(1, $package->fresh()->used_sessions);
        $this->assertSame('paid', $package->orders()->firstOrFail()->status);
        $this->assertSame(2, $replacement->sessions()->where('status', 'rematched')->count());
    }

    public function test_demo_can_repeat_empty_search_then_complete_a_partial_refund(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-04 10:00:00', 'Asia/Jakarta'));
        config()->set('features.teacher_replacement', true);
        $this->artisan('demo:teacher-replacement setup')->assertExitCode(0);

        [$student, $admin, , $package] = $this->fixtureRecords();
        $subject = $package->subjects()->firstOrFail();
        Sanctum::actingAs($student);
        $replacementId = (int) $this->postJson(
            "/api/student/packages/{$package->id}/subjects/{$subject->id}/teacher-replacements",
            [
                'reason_code' => 'teacher_unavailable',
                'reason_detail' => 'Guru lama tidak dapat melanjutkan dan demo perlu mencari guru pengganti.',
            ],
            ['Idempotency-Key' => 'demo-replacement-submit-empty'],
        )->assertCreated()->json('data.id');

        Sanctum::actingAs($admin);
        $this->postJson(
            "/api/admin/teacher-replacements/{$replacementId}/approve",
            ['notes' => 'Pengajuan demo disetujui agar cabang pencarian tanpa kandidat dapat diuji.'],
            ['Idempotency-Key' => 'demo-replacement-approve-empty'],
        )->assertOk();
        $this->artisan('demo:teacher-replacement no-teacher')->assertExitCode(0);
        $this->assertSame('no_teacher', TeacherReplacementRequest::findOrFail($replacementId)->status);

        Sanctum::actingAs($student);
        $this->postJson(
            "/api/student/teacher-replacements/{$replacementId}/retry",
            [],
            ['Idempotency-Key' => 'demo-replacement-retry-empty'],
        )->assertOk();
        $this->artisan('demo:teacher-replacement no-teacher')->assertExitCode(0);
        $this->assertSame('no_teacher', TeacherReplacementRequest::findOrFail($replacementId)->status);

        Sanctum::actingAs($student);
        $this->postJson(
            "/api/student/teacher-replacements/{$replacementId}/request-refund",
            [],
            ['Idempotency-Key' => 'demo-replacement-refund'],
        )->assertCreated();
        $this->artisan('demo:teacher-replacement complete-refund')->assertExitCode(0);

        $replacement = TeacherReplacementRequest::findOrFail($replacementId);
        $this->assertSame('refunded', $replacement->status);
        $this->assertSame('completed', $package->fresh()->status);
        $this->assertSame('paid', $package->orders()->firstOrFail()->status);
        $this->assertSame(1, $package->fresh()->used_sessions);
        $this->assertSame(2, $replacement->sessions()->where('status', 'refunded')->count());
    }

    private function fixtureRecords(): array
    {
        $student = User::query()->where('email', 'demo.replacement.student@bimbelku.local')->firstOrFail();
        $admin = User::query()->where('role', 'admin')->where('status', 'active')->firstOrFail();
        $newTeacher = User::query()->where('email', 'demo.replacement.new@bimbelku.local')->firstOrFail();
        $package = LearningPackage::query()->where('package_code', 'like', 'DEMO-GGR-%')->latest('id')->firstOrFail();

        return [$student, $admin, $newTeacher, $package];
    }
}
