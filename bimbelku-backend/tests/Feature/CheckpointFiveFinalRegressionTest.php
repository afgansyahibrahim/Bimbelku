<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CheckpointFiveFinalRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_login_use_the_session_logout_and_cannot_reuse_the_token(): void
    {
        $student = User::factory()->create([
            'name' => 'Murid Regresi Akhir',
            'email' => 'murid-regresi@example.com',
            'password' => Hash::make('Password123!'),
            'role' => 'student',
            'status' => 'active',
        ]);

        $login = $this->postJson('/api/login', [
            'email' => $student->email,
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('user.id', $student->id)
            ->assertJsonPath('user.role', 'student');

        $token = (string) $login->json('access_token');
        $this->assertNotSame('', $token);

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('id', $student->id)
            ->assertJsonPath('role', 'student');

        $this->withToken($token)
            ->postJson('/api/logout')
            ->assertOk();

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_pending_teacher_cannot_login_before_admin_verification(): void
    {
        $teacher = User::factory()->create([
            'email' => 'tutor-pending-regresi@example.com',
            'password' => Hash::make('Password123!'),
            'role' => 'teacher',
            'status' => 'pending',
        ]);

        $this->postJson('/api/login', [
            'email' => $teacher->email,
            'password' => 'Password123!',
        ])->assertForbidden()
            ->assertJsonPath('message', 'Akun tutor Anda sedang menunggu verifikasi admin.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_public_bootstrap_endpoints_remain_accessible_without_a_token(): void
    {
        $this->getJson('/api/learning-catalog?compact=1')
            ->assertOk()
            ->assertJsonStructure([
                'subjects',
                'subject_options',
                'chapters',
                'topics',
                'education_levels',
                'grades_by_level',
                'class_types',
                'learning_modes',
            ]);

        $this->getJson('/api/settings/footer')->assertOk();
        $this->getJson('/api/socials')->assertOk();
        $this->getJson('/api/settings/teacher-cover')->assertOk();
    }

    public function test_critical_role_routes_keep_their_authentication_and_role_middleware(): void
    {
        $this->assertRouteMiddleware('GET', '/api/student/dashboard-v2', [
            'auth:sanctum',
            'active.account',
            'role:student',
        ]);
        $this->assertRouteMiddleware('GET', '/api/teacher/dashboard-v2', [
            'auth:sanctum',
            'active.account',
            'role:teacher',
        ]);
        $this->assertRouteMiddleware('GET', '/api/admin/dashboard-stats', [
            'auth:sanctum',
            'active.account',
            'role:admin',
            'admin.audit',
            'admin.permission',
        ]);
    }

    public function test_removed_multi_admin_and_authenticator_routes_are_not_registered(): void
    {
        foreach ([
            ['GET', '/api/admin/access-control'],
            ['GET', '/api/admin/finance-security'],
            ['POST', '/api/admin/finance-security/setup'],
            ['GET', '/api/admin/payout-approvals'],
            ['POST', '/api/admin/payout-approvals'],
        ] as [$method, $uri]) {
            $this->assertFalse(
                $this->routeExists($method, $uri),
                "Rute lama {$method} {$uri} tidak boleh kembali terdaftar."
            );
        }
    }

    private function assertRouteMiddleware(string $method, string $uri, array $expected): void
    {
        $route = app('router')->getRoutes()->match(Request::create($uri, $method));
        $middleware = $route->gatherMiddleware();

        foreach ($expected as $name) {
            $this->assertContains(
                $name,
                $middleware,
                "Middleware {$name} tidak ditemukan pada {$method} {$uri}."
            );
        }
    }

    private function routeExists(string $method, string $uri): bool
    {
        foreach (app('router')->getRoutes()->getRoutes() as $route) {
            if (
                in_array(strtoupper($method), $route->methods(), true)
                && '/'.ltrim($route->uri(), '/') === $uri
            ) {
                return true;
            }
        }

        return false;
    }
}
