<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageSixCFinalRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('bimbelku.primary_admin_email', '');
    }

    public function test_single_admin_finance_has_no_authenticator_route(): void
    {
        Sanctum::actingAs($this->activeAdmin());

        $this->getJson('/api/admin/finance-security')->assertNotFound();
        $this->getJson('/api/admin/finance/payments')
            ->assertOk()
            ->assertJsonStructure(['summary', 'pending', 'history']);
        $this->getJson('/api/admin/finance/refunds')->assertOk();
        $this->getJson('/api/admin/finance')->assertOk();
    }

    public function test_single_admin_has_all_modules_even_with_legacy_permission_data(): void
    {
        $admin = $this->activeAdmin([
            'admin_type' => 'standard_admin',
            'admin_permissions' => [],
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/dashboard-stats')->assertOk();
        $this->getJson('/api/admin/tutor-searches')->assertOk();
        $this->getJson('/api/admin/finance/payments')->assertOk();
        $this->getJson('/api/admin/finance/refunds')->assertOk();
        $this->getJson('/api/admin/finance')->assertOk();
        $this->getJson('/api/admin/audit-log')->assertOk();
    }

    public function test_admin_management_and_second_approval_routes_remain_disabled(): void
    {
        Sanctum::actingAs($this->activeAdmin());

        $this->getJson('/api/admin/access-control')->assertNotFound();
        $this->getJson('/api/admin/payout-approvals')->assertNotFound();
        $this->postJson('/api/admin/payout-approvals', [])->assertNotFound();
    }

    public function test_second_admin_cannot_login_when_primary_admin_exists(): void
    {
        $primary = $this->activeAdmin([
            'email' => 'admin-utama@example.com',
        ]);
        $secondary = $this->activeAdmin([
            'email' => 'admin-lama@example.com',
        ]);

        $this->postJson('/api/login', [
            'email' => $secondary->email,
            'password' => 'password',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Project ini hanya menggunakan satu akun admin utama.');

        $this->postJson('/api/login', [
            'email' => $primary->email,
            'password' => 'password',
        ])->assertOk();
    }

    public function test_student_teacher_and_admin_routes_remain_isolated(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
        ]);
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'status' => 'active',
        ]);
        $admin = $this->activeAdmin();

        Sanctum::actingAs($student);
        $this->getJson('/api/admin/dashboard-stats')->assertForbidden();
        $this->getJson('/api/teacher/dashboard-v2')->assertForbidden();

        Sanctum::actingAs($teacher);
        $this->getJson('/api/student/dashboard-v2')->assertForbidden();
        $this->getJson('/api/admin/dashboard-stats')->assertForbidden();

        Sanctum::actingAs($admin);
        $this->getJson('/api/student/dashboard-v2')->assertForbidden();
        $this->getJson('/api/teacher/dashboard-v2')->assertForbidden();
    }

    private function activeAdmin(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'role' => 'admin',
            'status' => 'active',
            'admin_type' => 'single_admin',
            'admin_permissions' => null,
        ], $overrides));
    }
}
