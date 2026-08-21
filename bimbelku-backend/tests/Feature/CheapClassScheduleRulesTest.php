<?php

namespace Tests\Feature;

use App\Models\CheapClass;
use App\Models\CurriculumChapter;
use App\Models\CurriculumSubject;
use App\Models\User;
use App\Services\CheapClassService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheapClassScheduleRulesTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_opening_date_controls_registration_and_first_session_uses_next_selected_day(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-13 08:00:00', 'Asia/Jakarta'));
        [$subject, $chapter] = $this->catalog();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'status' => 'active']));

        $response = $this->postJson(
            '/api/admin/cheap-class-templates',
            $this->payload($subject, $chapter),
            ['Idempotency-Key' => 'cheap-class-stage3-date-0001']
        );

        $response->assertCreated();
        $package = CheapClass::query()->firstOrFail();

        // Senin 17 Agustus pukul 08.00 dibuka selama 24 jam. Setelah jeda
        // 60 menit, slot pilihan terdekat adalah Selasa 18 Agustus pukul 10.00.
        $this->assertSame('2026-08-17 08:00:00', $package->registration_opens_at->format('Y-m-d H:i:s'));
        $this->assertSame('2026-08-18 08:00:00', $package->registration_deadline->format('Y-m-d H:i:s'));
        $this->assertSame('2026-08-18 10:00:00', $package->starts_at->format('Y-m-d H:i:s'));
        $this->assertSame('2026-08-18 10:00:00', $package->sessions()->firstOrFail()->starts_at->format('Y-m-d H:i:s'));
    }

    public function test_one_session_package_rejects_more_than_one_learning_day(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-13 08:00:00', 'Asia/Jakarta'));
        [$subject, $chapter] = $this->catalog();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'status' => 'active']));

        $this->postJson(
            '/api/admin/cheap-class-templates',
            $this->payload($subject, $chapter, [
                'session_count' => 1,
                'weekdays' => [1, 2],
                'price_per_student' => 25000,
            ]),
            ['Idempotency-Key' => 'cheap-class-stage3-one-day-0001']
        )
            ->assertStatus(422)
            ->assertJsonPath('message', 'Paket 1 sesi hanya boleh memilih 1 hari belajar.');

        $this->assertDatabaseCount('cheap_classes', 0);
    }

    public function test_recurring_package_preserves_weekly_opening_and_computed_session_offset(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-13 08:00:00', 'Asia/Jakarta'));
        [$subject, $chapter] = $this->catalog();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'status' => 'active']));

        $this->postJson(
            '/api/admin/cheap-class-templates',
            $this->payload($subject, $chapter, ['recurrence_enabled' => true]),
            ['Idempotency-Key' => 'cheap-class-stage3-recurring-0001']
        )->assertCreated();

        $first = CheapClass::query()->firstOrFail();
        $template = $first->template()->firstOrFail();
        Carbon::setTestNow($template->next_publish_at->copy());
        $stats = app(CheapClassService::class)->publishDueRecurringPackages();

        $this->assertSame(1, $stats['created']);
        $second = CheapClass::query()->where('id', '!=', $first->id)->firstOrFail();
        $this->assertSame('2026-08-24 08:00:00', $second->registration_opens_at->format('Y-m-d H:i:s'));
        $this->assertSame('2026-08-25 08:00:00', $second->registration_deadline->format('Y-m-d H:i:s'));
        $this->assertSame('2026-08-25 10:00:00', $second->starts_at->format('Y-m-d H:i:s'));
    }

    private function payload(CurriculumSubject $subject, CurriculumChapter $chapter, array $overrides = []): array
    {
        return [
            'subjects' => [[
                'subject_name' => $subject->name,
                'curriculum_chapter_id' => $chapter->id,
            ]],
            'education_level' => 'SD',
            'grade' => 'Kelas 6',
            'topic' => null,
            'registration_open_date' => '2026-08-17',
            'registration_open_time' => '08:00',
            'start_time' => '10:00',
            'duration_minutes' => 60,
            'session_count' => 4,
            'weekdays' => [1, 2],
            'price_per_session' => 25000,
            'use_custom_price' => false,
            'custom_price_per_student' => null,
            'minimum_participants' => 2,
            'maximum_participants' => 6,
            'registration_window_hours' => 24,
            'registration_closes_before_minutes' => 60,
            'payment_window_minutes' => 60,
            'recurrence_enabled' => false,
            ...$overrides,
        ];
    }

    private function catalog(): array
    {
        $subject = CurriculumSubject::create([
            'name' => 'Matematika',
            'normalized_name' => 'matematika',
            'education_levels' => ['SD'],
            'grades' => ['Kelas 6'],
            'is_active' => true,
        ]);
        $chapter = CurriculumChapter::create([
            'curriculum_subject_id' => $subject->id,
            'education_level' => 'SD',
            'grade' => 'Kelas 6',
            'title' => 'Pecahan',
            'normalized_title' => 'pecahan',
            'is_active' => true,
        ]);

        return [$subject, $chapter];
    }
}
