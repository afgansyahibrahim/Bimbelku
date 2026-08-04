<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckpointFourQualityAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_responses_send_baseline_security_headers(): void
    {
        $this->getJson('/api/route-yang-tidak-ada')
            ->assertNotFound()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');
    }

    public function test_bearer_authenticated_responses_are_not_cacheable(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
        ]);
        $token = $student->createToken('checkpoint-four')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertHeader('Pragma', 'no-cache');

        $response = $this->withToken($token)->getJson('/api/user');
        $this->assertStringContainsString(
            'no-store',
            (string) $response->headers->get('Cache-Control')
        );
    }

    public function test_api_tokens_have_a_finite_default_lifetime(): void
    {
        $this->assertSame(720, config('sanctum.expiration'));
    }
}
