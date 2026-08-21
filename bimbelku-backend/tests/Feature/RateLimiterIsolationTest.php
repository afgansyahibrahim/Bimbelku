<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class RateLimiterIsolationTest extends TestCase
{
    public function test_api_routes_do_not_use_shared_numeric_throttle_buckets(): void
    {
        $routes = file_get_contents(base_path('routes/api.php'));

        $this->assertIsString($routes);
        $this->assertDoesNotMatchRegularExpression(
            '/throttle:\\d+\\s*,\\s*\\d+/',
            $routes,
            'Gunakan named rate limiter agar aksi berbeda tidak berbagi counter user/IP.',
        );
    }

    public function test_sensitive_polling_and_financial_actions_have_separate_named_limiters(): void
    {
        $required = [
            'session-action-poll',
            'account-password-change',
            'student-cheap-class-join',
            'student-session-presence-confirm',
            'student-package-retry',
            'teacher-offer-action',
            'teacher-bank-change',
            'teacher-payout-request',
            'teacher-session-ready',
            'teacher-session-checkout',
            'admin-cheap-class-template-create',
            'admin-matching-synchronize',
            'auth-login',
            'auth-forgot-password',
        ];

        foreach ($required as $name) {
            $this->assertNotNull(
                RateLimiter::limiter($name),
                "Named limiter [{$name}] belum terdaftar.",
            );
        }
    }
}
