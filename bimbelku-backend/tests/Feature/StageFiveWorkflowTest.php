<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingRequest;
use App\Models\CurriculumSubject;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\TeacherAvailability;
use App\Models\TeacherOffer;
use App\Models\TeacherProfile;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\CurriculumCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageFiveWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_catalog_seeds_subjects_and_chapters_for_every_supported_school_grade(): void
    {
        $this->seed(CurriculumCatalogSeeder::class);

        $this->assertGreaterThanOrEqual(60, CurriculumSubject::query()->where('is_active', true)->count());
        $this->assertDatabaseHas('curriculum_subjects', [
            'normalized_name' => 'akuntansi',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('curriculum_subjects', [
            'normalized_name' => 'komputer dasar',
            'is_active' => true,
        ]);

        CurriculumSubject::query()
            ->whereJsonDoesntContain('education_levels', 'Umum')
            ->with('chapters')
            ->get()
            ->each(function (CurriculumSubject $subject) {
                foreach ($subject->grades ?? [] as $grade) {
                    $this->assertTrue(
                        $subject->chapters->contains('grade', $grade),
                        "{$subject->name} belum mempunyai bab untuk {$grade}."
                    );
                }
            });

        $this->getJson('/api/learning-catalog')
            ->assertOk()
            ->assertJsonStructure([
                'subjects',
                'subject_options' => [['id', 'name', 'education_levels', 'grades']],
                'chapters' => [['id', 'subject_id', 'subject_name', 'education_level', 'grade', 'title']],
                'grades_by_level',
            ])
            ->assertJsonPath('education_levels.3', 'Umum')
            ->assertJsonPath('grades_by_level.Umum.0', 'Semua tingkat')
            ->assertJsonPath('grades_by_level.Umum.1', 'Pemula')
            ->assertJsonPath('grades_by_level.Umum.3', 'Lanjutan');
    }

    public function test_catalog_can_load_compact_data_then_only_the_selected_grade_details(): void
    {
        $this->seed(CurriculumCatalogSeeder::class);

        $this->getJson('/api/learning-catalog?compact=1')
            ->assertOk()
            ->assertJsonCount(0, 'chapters')
            ->assertJsonCount(0, 'topics')
            ->assertJsonStructure([
                'subjects',
                'subject_options' => [['id', 'name', 'education_levels', 'grades']],
                'education_levels',
                'grades_by_level',
            ]);

        $response = $this->getJson(
            '/api/learning-catalog?subject_name=Matematika'
            .'&education_level=SMP&grade=Kelas%207'
        )
            ->assertOk();

        $this->assertNotEmpty($response->json('chapters'));
        collect($response->json('chapters'))->each(function (array $chapter) {
            $this->assertSame('Matematika', $chapter['subject_name']);
            $this->assertSame('SMP', $chapter['education_level']);
            $this->assertSame('Kelas 7', $chapter['grade']);
        });
    }

    public function test_admin_can_add_a_subject_without_creating_case_or_space_duplicates(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $created = $this->postJson('/api/admin/subjects', [
            'name' => 'Kimia Eksperimen',
            'group_name' => 'Tambahan admin',
            'education_levels' => ['SMA'],
            'grades' => ['Kelas 10', 'Kelas 11', 'Kelas 12'],
        ])->assertCreated();

        $duplicate = $this->postJson('/api/admin/subjects', [
            'name' => '  kimia    eksperimen ',
            'group_name' => 'Tambahan admin',
            'education_levels' => ['SMA'],
            'grades' => ['Kelas 10', 'Kelas 11', 'Kelas 12'],
        ])->assertOk();

        $this->assertSame(
            $created->json('data.id'),
            $duplicate->json('data.id')
        );
        $this->assertDatabaseCount('curriculum_subjects', 1);
    }

    public function test_reactivating_inactive_subject_restores_supported_scope(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $subject = CurriculumSubject::create([
            'name' => 'Kimia Eksperimen',
            'normalized_name' => 'kimia eksperimen',
            'group_name' => 'Tambahan admin',
            'education_levels' => [],
            'grades' => [],
            'is_active' => false,
        ]);

        $this->postJson('/api/admin/subjects', [
            'name' => 'Kimia Eksperimen',
            'education_levels' => ['SMA'],
            'grades' => ['Kelas 10', 'Kelas 11', 'Kelas 12'],
        ])
            ->assertOk()
            ->assertJsonPath('data.id', $subject->id)
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.education_levels.0', 'SMA')
            ->assertJsonPath('data.grades.0', 'Kelas 10');
    }

    public function test_subject_rejects_grade_outside_selected_education_level(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/subjects', [
            'name' => 'Biologi SMA',
            'education_levels' => ['SMA'],
            'grades' => ['Kelas 2'],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('grades');
    }

    public function test_updating_subject_level_without_grades_refreshes_grade_scope(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $subject = CurriculumSubject::create([
            'name' => 'Fisika Adaptif',
            'normalized_name' => 'fisika adaptif',
            'group_name' => 'Tambahan admin',
            'education_levels' => ['SMP'],
            'grades' => ['Kelas 7', 'Kelas 8', 'Kelas 9'],
            'is_active' => true,
        ]);

        $this->putJson("/api/admin/subjects/{$subject->id}", [
            'name' => 'Fisika Adaptif',
            'education_levels' => ['SMA'],
        ])
            ->assertOk()
            ->assertJsonPath('data.education_levels.0', 'SMA')
            ->assertJsonPath('data.grades.0', 'Kelas 10');

        $subject->refresh();
        $this->assertSame(['Kelas 10', 'Kelas 11', 'Kelas 12'], $subject->grades);
    }

    public function test_student_cannot_create_a_legacy_booking_request_directly(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
        ]);
        Sanctum::actingAs($student);

        $this->postJson('/api/student/booking-requests', [
            'subject_name' => 'Matematika',
            'education_level' => 'SMP',
            'grade' => 'Kelas 7',
            'chapter' => 'Seluruh materi mapel',
            'learning_mode' => 'online',
            'class_type' => 'private',
            'scheduled_date' => now()->addDay()->toDateString(),
            'start_time' => '11:00',
            'duration_hours' => 1,
        ])
            ->assertStatus(410)
            ->assertJsonPath('code', 'legacy_booking_creation_retired')
            ->assertJsonPath('redirect_to', '/student/packages/new');

        $this->assertDatabaseCount('booking_requests', 0);
    }

    public function test_legacy_booking_creation_is_retired_before_old_payload_validation(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
        ]);
        Sanctum::actingAs($student);

        $this->postJson('/api/student/booking-requests', [
            'education_level' => 'Perguruan Tinggi',
            'grade' => 'Semester 1',
        ])
            ->assertStatus(410)
            ->assertJsonPath('code', 'legacy_booking_creation_retired')
            ->assertJsonPath('redirect_to', '/student/packages/new');

        $this->assertDatabaseCount('booking_requests', 0);
    }

    public function test_teacher_acceptance_opens_the_invoice_without_a_second_student_decision(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-28 10:03:00', 'Asia/Jakarta'));
        $this->seed(CurriculumCatalogSeeder::class);

        $teacher = User::factory()->create([
            'role' => 'teacher',
            'status' => 'active',
            'phone' => '081200000001',
        ]);
        $profile = TeacherProfile::create([
            'user_id' => $teacher->id,
            'whatsapp_number' => '081200000001',
            'points' => 150,
            'is_accepting_requests' => true,
            'verified_at' => now()->subDay(),
        ]);
        $subject = CurriculumSubject::query()->where('normalized_name', 'matematika')->firstOrFail();
        $profile->subjects()->create([
            'name' => 'Matematika',
            'curriculum_subject_id' => $subject->id,
            'levels' => ['SMP'],
            'is_active' => true,
            'is_online' => true,
            'is_offline' => false,
            'is_private_active' => true,
            'is_group_active' => true,
        ]);
        TeacherAvailability::create([
            'user_id' => $teacher->id,
            'day' => 'Selasa',
            'start_time' => '06:00:00',
            'end_time' => '22:00:00',
            'slots' => [],
            'is_active' => true,
        ]);
        PaymentSetting::create([
            'singleton_key' => 1,
            'merchant_name' => 'BimbelKu Official',
            'bank_name' => 'Bank Uji',
            'account_number' => '1234567890',
            'account_name' => 'BimbelKu',
        ]);

        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
            'phone' => '081200000002',
        ]);
        $legacyRequest = BookingRequest::create([
            'student_id' => $student->id,
            'matched_teacher_id' => $teacher->id,
            'subject_name' => 'Matematika',
            'curriculum_subject_id' => $subject->id,
            'education_level' => 'SMP',
            'grade' => 'Kelas 7',
            'chapter' => 'Seluruh materi mapel',
            'learning_mode' => 'online',
            'class_type' => 'private',
            'scheduled_date' => '2026-07-28',
            'start_time' => '11:00:00',
            'end_time' => '12:00:00',
            'duration_hours' => 1,
            'status' => 'teacher_pending',
            'matching_attempts' => 1,
            'hourly_rate' => 50000,
            'total_amount' => 50000,
            'search_radius_km' => 3,
            'search_started_at' => now(),
            'search_expires_at' => now()->addHours(12),
            'teacher_response_deadline' => now()->addMinutes(10),
        ]);
        $offer = TeacherOffer::create([
            'booking_request_id' => $legacyRequest->id,
            'teacher_id' => $teacher->id,
            'status' => 'pending',
            'offered_at' => now(),
            'expires_at' => now()->addMinutes(10),
        ]);

        Sanctum::actingAs($teacher);
        $this->postJson("/api/teacher/offers/{$offer->id}/accept")
            ->assertOk()
            ->assertJsonPath('message', 'Permintaan diterima. Tagihan murid sudah dibuka.');

        $booking = Booking::query()->firstOrFail();
        $order = Order::query()->firstOrFail();
        $this->assertSame('awaiting_payment', $booking->status);
        $this->assertSame('private', $booking->class_type);
        $this->assertNull($booking->group_pool_id);
        $this->assertSame('pending', $order->status);
        $this->assertSame($student->id, $order->user_id);
        $this->assertSame('Privat', $order->class_details_snapshot['type']);
        $this->assertDatabaseHas('booking_requests', [
            'student_id' => $student->id,
            'status' => 'awaiting_payment',
            'class_type' => 'private',
            'group_pool_id' => null,
        ]);
    }
}
