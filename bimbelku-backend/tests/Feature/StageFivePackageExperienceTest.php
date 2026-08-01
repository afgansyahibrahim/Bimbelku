<?php

namespace Tests\Feature;

use App\Models\CurriculumSubject;
use App\Models\PackagePlan;
use App\Models\Promotion;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\CurriculumCatalogSeeder;
use Database\Seeders\StageFiveExperienceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageFivePackageExperienceTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_default_plans_banners_and_role_tutorials_are_available(): void
    {
        $this->seed(StageFiveExperienceSeeder::class);

        $this->getJson('/api/package-plans')
            ->assertOk()
            ->assertJsonCount(4)
            ->assertJsonPath('0.name', 'Coba Belajar')
            ->assertJsonPath('3.name', 'Bulanan Intensif');

        $this->getJson('/api/learning-time-slots')
            ->assertOk()
            ->assertJsonCount(13)
            ->assertJsonPath('0.start_time', '08:00:00');

        $this->getJson('/api/content/banners?audience=student')
            ->assertOk()
            ->assertJsonCount(2);

        $this->getJson('/api/content/tutorials?role=student&context=dashboard')
            ->assertOk()
            ->assertJsonPath('0.role', 'student')
            ->assertJsonCount(4, '0.steps');

        $this->getJson('/api/content/tutorials?role=student&context=package-builder')
            ->assertOk()
            ->assertJsonPath('0.title', 'Memesan dua atau lebih mata pelajaran')
            ->assertJsonCount(5, '0.steps');
    }

    public function test_admin_banner_crud_rejects_an_unsafe_internal_destination(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $payload = [
            'title' => 'Banner uji',
            'description' => 'Banner aman untuk murid.',
            'button_text' => 'Buka',
            'image' => UploadedFile::fake()->image('banner.jpg', 1200, 500),
            'audience' => 'student',
            'destination_kind' => 'internal',
            'destination_url' => '/admin/users/delete-all',
            'sort_order' => 1,
            'is_active' => true,
        ];

        $this->post('/api/admin/stage-five/banners', $payload)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Tujuan internal tidak diizinkan.');

        $payload['image'] = UploadedFile::fake()->image('banner-aman.jpg', 1200, 500);
        $payload['destination_url'] = '/student/packages/new';
        $this->post('/api/admin/stage-five/banners', $payload)
            ->assertCreated()
            ->assertJsonPath('data.destination_url', '/student/packages/new');
    }

    public function test_promotion_claim_is_idempotent_and_total_quota_is_enforced(): void
    {
        $promotion = Promotion::create([
            'title' => 'Promo satu kuota',
            'code' => 'SATUKUOTA',
            'discount_type' => 'percentage',
            'discount_value' => 20,
            'minimum_purchase' => 0,
            'total_quota' => 1,
            'per_user_limit' => 1,
            'claim_required' => true,
            'is_active' => true,
        ]);
        $firstStudent = User::factory()->create(['role' => 'student', 'status' => 'active']);
        Sanctum::actingAs($firstStudent);

        $this->postJson("/api/student/promotions/{$promotion->id}/claim")
            ->assertCreated();
        $this->postJson("/api/student/promotions/{$promotion->id}/claim")
            ->assertOk();
        $this->assertDatabaseCount('promotion_claims', 1);

        $secondStudent = User::factory()->create(['role' => 'student', 'status' => 'active']);
        Sanctum::actingAs($secondStudent);
        $this->postJson("/api/student/promotions/{$promotion->id}/claim")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Kuota penawaran sudah habis.');
    }

    public function test_package_requires_the_exact_session_count_and_hour_slots(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-30 10:00:00', 'Asia/Jakarta'));
        $this->seed(CurriculumCatalogSeeder::class);
        $this->seed(StageFiveExperienceSeeder::class);
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        Sanctum::actingAs($student);

        $plan = PackagePlan::query()->where('slug', 'bulanan-dasar')->firstOrFail();
        $subject = CurriculumSubject::query()
            ->where('normalized_name', 'matematika')
            ->firstOrFail();
        $base = [
            'package_plan_id' => $plan->id,
            'education_level' => 'SMP',
            'grade' => 'Kelas 7',
            'learning_mode' => 'online',
            'subjects' => [[
                'curriculum_subject_id' => $subject->id,
                'learning_goal' => 'Menguatkan aljabar dasar.',
                'schedules' => [
                    '2026-08-03 15:00:00',
                    '2026-08-10 15:00:00',
                    '2026-08-17 15:00:00',
                ],
            ]],
        ];

        $this->postJson('/api/student/packages', $base, ['Idempotency-Key' => 'stage5-wrong-count'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Jumlah jadwal harus tepat 4 sesi.');

        $base['subjects'][0]['schedules'] = [
            '2026-08-03 15:30:00',
            '2026-08-10 15:00:00',
            '2026-08-17 15:00:00',
            '2026-08-24 15:00:00',
        ];
        $this->postJson('/api/student/packages', $base, ['Idempotency-Key' => 'stage5-wrong-minute'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Jam yang dipilih tidak termasuk slot aktif dari aplikasi.');
    }

    public function test_duration_multiplies_quote_and_total_learning_hours(): void
    {
        $this->seed(CurriculumCatalogSeeder::class);
        $this->seed(StageFiveExperienceSeeder::class);
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        Sanctum::actingAs($student);

        $plan = PackagePlan::query()->where('slug', 'bulanan-dasar')->firstOrFail();
        $subject = CurriculumSubject::query()
            ->where('normalized_name', 'matematika')
            ->firstOrFail();
        $payload = [
            'package_plan_id' => $plan->id,
            'education_level' => 'SMP',
            'learning_mode' => 'online',
            'subjects' => [[
                'curriculum_subject_id' => $subject->id,
                'session_count' => $plan->session_count,
            ]],
        ];

        $oneHour = $this->postJson('/api/student/packages/quote', [
            ...$payload,
            'duration_hours' => 1,
        ])->assertOk();
        $threeHours = $this->postJson('/api/student/packages/quote', [
            ...$payload,
            'duration_hours' => 3,
        ])->assertOk();

        $this->assertSame(
            (float) $oneHour->json('total_amount') * 3,
            (float) $threeHours->json('total_amount')
        );
        $threeHours
            ->assertJsonPath('duration_hours', 3)
            ->assertJsonPath('total_learning_hours', $plan->session_count * 3)
            ->assertJsonPath('lines.0.duration_hours', 3);
    }
}
