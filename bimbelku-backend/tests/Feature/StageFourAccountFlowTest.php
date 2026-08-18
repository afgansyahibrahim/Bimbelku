<?php

namespace Tests\Feature;

use App\Models\TeacherProfile;
use App\Models\User;
use Database\Seeders\CurriculumCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageFourAccountFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_minor_student_registration_requires_guardian_consent(): void
    {
        $birthDate = now()->subYears(12)->toDateString();
        $payload = [
            'name' => 'Murid Anak',
            'email' => 'murid.anak@example.com',
            'phone' => '081234567891',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
            'date_of_birth' => $birthDate,
            'terms_accepted' => true,
            'privacy_accepted' => true,
        ];

        $this->postJson('/api/register', $payload)
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Nama orang tua atau wali wajib diisi untuk murid di bawah 18 tahun.'
            );

        $response = $this->postJson('/api/register', [
            ...$payload,
            'guardian_name' => 'Wali Murid',
            'guardian_phone' => '081234567892',
            'guardian_relationship' => 'orang_tua',
            'guardian_consent' => true,
        ]);

        $response
            ->assertCreated()
            ->assertJsonMissing(['guardian_name' => 'Wali Murid'])
            ->assertJsonMissing(['guardian_phone' => '081234567892']);

        $this->assertDatabaseHas('users', [
            'email' => 'murid.anak@example.com',
            'date_of_birth' => $birthDate,
            'guardian_name' => 'Wali Murid',
            'guardian_phone' => '081234567892',
            'guardian_relationship' => 'orang_tua',
        ]);
        $this->assertNotNull(
            User::query()->where('email', 'murid.anak@example.com')->value('guardian_consent_at')
        );
    }

    public function test_adult_student_registration_does_not_require_guardian_data(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Murid Dewasa',
            'email' => 'murid.dewasa@example.com',
            'phone' => '081234567893',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
            'date_of_birth' => now()->subYears(20)->toDateString(),
            'terms_accepted' => true,
            'privacy_accepted' => true,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'email' => 'murid.dewasa@example.com',
            'guardian_name' => null,
            'guardian_consent_at' => null,
        ]);
    }

    public function test_student_registration_creates_an_active_account(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Murid Tahap Empat',
            'email' => 'murid.tahap4@example.com',
            'phone' => '0000000000',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
            'date_of_birth' => now()->subYears(20)->toDateString(),
            'terms_accepted' => true,
            'privacy_accepted' => true,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.role', 'student')
            ->assertJsonPath('user.status', 'active');

        $this->assertDatabaseHas('users', [
            'email' => 'murid.tahap4@example.com',
            'role' => 'student',
            'status' => 'active',
        ]);
    }

    public function test_teacher_registration_remains_pending_with_private_documents(): void
    {
        $this->seed(CurriculumCatalogSeeder::class);
        Storage::fake('local');
        Storage::fake('public');

        $response = $this->post('/api/register', [
            'name' => 'Tutor Tahap Empat',
            'email' => 'tutor.tahap4@example.com',
            'phone' => '081234567899',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'teacher',
            'terms_accepted' => '1',
            'privacy_accepted' => '1',
            'expertise' => 'Matematika',
            'levels' => ['SD', 'SMP'],
            'teaching_method' => 'hybrid',
            'identity_document' => UploadedFile::fake()->image('identitas.jpg'),
            'live_selfie' => UploadedFile::fake()->image('selfie.jpg'),
            'qualification_document' => UploadedFile::fake()->create(
                'ijazah.pdf',
                100,
                'application/pdf'
            ),
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.role', 'teacher')
            ->assertJsonPath('user.status', 'pending');

        $teacher = User::query()->where('email', 'tutor.tahap4@example.com')->firstOrFail();
        $profile = $teacher->teacherProfile()->firstOrFail();

        Storage::disk('local')->assertExists($profile->identity_document);
        Storage::disk('local')->assertExists($profile->live_selfie);
        Storage::disk('local')->assertExists($profile->qualification_document);
        Storage::disk('public')->assertMissing($profile->identity_document);
        $this->assertArrayNotHasKey('phone', $teacher->toArray());
        $this->assertArrayNotHasKey('whatsapp_number', $profile->toArray());
        $this->assertArrayNotHasKey('latitude', $profile->toArray());
        $this->assertArrayNotHasKey('account_number', $profile->toArray());
    }

    public function test_student_cannot_open_another_users_teacher_document(): void
    {
        Storage::fake('local');
        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
        ]);
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'status' => 'pending',
        ]);
        $path = UploadedFile::fake()->image('identitas.jpg')->store(
            'teacher_identity',
            'local'
        );
        TeacherProfile::create([
            'user_id' => $teacher->id,
            'identity_document' => $path,
            'points' => 150,
            'is_accepting_requests' => false,
        ]);
        Sanctum::actingAs($student);

        $this->get("/api/teachers/{$teacher->id}/documents/identity_document")
            ->assertForbidden();
    }

    public function test_admin_user_listing_rejects_the_admin_role_filter(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users?role=admin')
            ->assertUnprocessable();
    }

    public function test_student_can_save_a_personal_cover_without_changing_password(): void
    {
        Storage::fake('public');
        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
            'phone' => '081234567890',
            'password' => Hash::make('password123'),
        ]);
        Sanctum::actingAs($student);

        $this->post('/api/user', [
            '_method' => 'PUT',
            'name' => 'Murid Bersampul',
            'phone' => '081234567890',
            'profile_cover' => UploadedFile::fake()->image('sampul.jpg', 1200, 400),
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Murid Bersampul');

        $student->refresh();
        $this->assertNotNull($student->profile_cover);
        Storage::disk('public')->assertExists($student->profile_cover);
        $this->assertTrue(Hash::check('password123', $student->password));
    }

    public function test_password_is_changed_through_a_separate_endpoint(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
            'phone' => '081234567890',
            'password' => Hash::make('password123'),
        ]);
        Sanctum::actingAs($student);

        $this->putJson('/api/user/password', [
            'current_password' => 'password123',
            'password' => 'password456',
            'password_confirmation' => 'password456',
        ])
            ->assertOk()
            ->assertJsonStructure(['message', 'password_updated_at']);

        $student->refresh();
        $this->assertTrue(Hash::check('password456', $student->password));
        $this->assertNotNull($student->password_updated_at);
    }

    public function test_password_reset_updates_the_security_timestamp(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
            'password' => Hash::make('password123'),
        ]);
        DB::table('password_reset_tokens')->insert([
            'email' => $student->email,
            'token' => Hash::make('valid-reset-token'),
            'created_at' => now(),
        ]);

        $this->postJson('/api/reset-password', [
            'email' => $student->email,
            'token' => 'valid-reset-token',
            'password' => 'password456',
            'password_confirmation' => 'password456',
        ])->assertOk();

        $student->refresh();
        $this->assertTrue(Hash::check('password456', $student->password));
        $this->assertNotNull($student->password_updated_at);
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => $student->email,
        ]);
    }

    public function test_frontend_url_and_cors_origins_are_configured_separately(): void
    {
        $this->assertSame('http://127.0.0.1:8080', config('app.frontend_url'));
        $this->assertContains('http://127.0.0.1:8080', config('cors.allowed_origins'));
        $this->assertContains('http://localhost:8080', config('cors.allowed_origins'));
        $this->assertSame('2026-07-29', config('app.policy_version'));
    }

    public function test_teacher_personal_cover_does_not_trigger_reverification(): void
    {
        Storage::fake('public');
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'status' => 'active',
            'phone' => '081234567890',
        ]);
        $verifiedAt = now()->subDay();
        TeacherProfile::create([
            'user_id' => $teacher->id,
            'whatsapp_number' => '081234567890',
            'points' => 150,
            'is_accepting_requests' => true,
            'verified_at' => $verifiedAt,
        ]);
        Sanctum::actingAs($teacher);

        $this->post('/api/teacher/profile', [
            'name' => $teacher->name,
            'whatsapp_number' => '081234567890',
            'profile_cover' => UploadedFile::fake()->image('sampul-tutor.jpg', 1200, 400),
        ])
            ->assertOk()
            ->assertJsonPath('reverification_required', false);

        $teacher->refresh();
        $this->assertSame('active', $teacher->status);
        $this->assertNotNull($teacher->profile_cover);
        Storage::disk('public')->assertExists($teacher->profile_cover);
        $this->assertNotNull($teacher->teacherProfile->verified_at);
    }
}
