<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckpointOneFoundationAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('bimbelku.primary_admin_email', 'admin-utama@example.com');
    }

    public function test_public_registration_cannot_create_an_admin_account(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Admin Ilegal',
            'email' => 'admin-ilegal@example.com',
            'phone' => '081234567890',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'admin',
            'terms_accepted' => true,
            'privacy_accepted' => true,
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('users', ['email' => 'admin-ilegal@example.com']);
    }

    public function test_student_registration_rejects_a_future_birth_date(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Murid Masa Depan',
            'email' => 'future-student@example.com',
            'phone' => '081234567891',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'student',
            'date_of_birth' => now()->addDay()->toDateString(),
            'terms_accepted' => true,
            'privacy_accepted' => true,
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('users', ['email' => 'future-student@example.com']);
    }

    public function test_inactive_account_token_cannot_use_shared_authenticated_routes(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'banned',
        ]);
        Sanctum::actingAs($student);

        $this->getJson('/api/user')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Sesi tidak berlaku karena akun sedang tidak aktif.');
    }

    public function test_secondary_admin_token_is_rejected_before_any_authenticated_feature_runs(): void
    {
        User::factory()->create([
            'name' => 'Admin Utama',
            'email' => 'admin-utama@example.com',
            'role' => 'admin',
            'status' => 'active',
        ]);
        $secondary = User::factory()->create([
            'name' => 'Admin Lama',
            'email' => 'admin-lama@example.com',
            'role' => 'admin',
            'status' => 'active',
        ]);
        Sanctum::actingAs($secondary);

        $this->getJson('/api/user')
            ->assertUnauthorized()
            ->assertJsonPath(
                'message',
                'Sesi admin tidak berlaku. Project ini hanya menggunakan satu admin utama.'
            );
    }

    public function test_role_groups_cannot_be_crossed(): void
    {
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'active']);
        $admin = User::factory()->create([
            'email' => 'admin-utama@example.com',
            'role' => 'admin',
            'status' => 'active',
        ]);

        Sanctum::actingAs($student);
        $this->getJson('/api/teacher/dashboard-v2')->assertForbidden();
        $this->getJson('/api/admin/dashboard-stats')->assertForbidden();

        Sanctum::actingAs($teacher);
        $this->getJson('/api/student/dashboard-v2')->assertForbidden();
        $this->getJson('/api/admin/dashboard-stats')->assertForbidden();

        Sanctum::actingAs($admin);
        $this->getJson('/api/student/dashboard-v2')->assertForbidden();
        $this->getJson('/api/teacher/dashboard-v2')->assertForbidden();
    }

    public function test_removed_multi_admin_and_authenticator_endpoints_stay_unavailable(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin-utama@example.com',
            'role' => 'admin',
            'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/access-control')->assertNotFound();
        $this->getJson('/api/admin/finance-security')->assertNotFound();
        $this->postJson('/api/admin/finance-security/setup')->assertNotFound();
        $this->getJson('/api/admin/payout-approvals')->assertNotFound();
    }
}
