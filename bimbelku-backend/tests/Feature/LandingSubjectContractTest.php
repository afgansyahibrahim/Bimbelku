<?php

namespace Tests\Feature;

use App\Models\CurriculumSubject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class LandingSubjectContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_catalog_contains_only_eight_active_curriculum_subjects(): void
    {
        foreach ([
            'Matematika',
            'Bahasa Indonesia',
            'Bahasa Inggris',
            'Fisika',
            'Kimia',
            'Biologi',
            'Ekonomi',
            'Akuntansi',
            'Informatika',
        ] as $name) {
            CurriculumSubject::create([
                'name' => $name,
                'normalized_name' => mb_strtolower($name),
                'group_name' => 'Uji',
                'education_levels' => ['SMA'],
                'grades' => ['Kelas 10'],
                'is_active' => $name !== 'Kimia',
            ]);
        }

        Cache::forget('learning_catalog.payload');

        $response = $this->getJson('/api/learning-catalog?compact=1')
            ->assertOk()
            ->assertJsonCount(8, 'landing_subjects')
            ->assertJsonStructure([
                'landing_subjects' => [['id', 'name']],
            ]);

        $this->assertSame([
            'Matematika',
            'Bahasa Indonesia',
            'Bahasa Inggris',
            'Fisika',
            'Biologi',
            'Ekonomi',
            'Akuntansi',
            'Informatika',
        ], collect($response->json('landing_subjects'))->pluck('name')->all());

        $this->assertNotContains('Kimia', $response->json('landing_subjects.*.name'));
    }
}
