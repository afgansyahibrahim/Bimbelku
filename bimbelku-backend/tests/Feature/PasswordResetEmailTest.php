<?php

namespace Tests\Feature;

use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_email_contains_canonical_frontend_link_and_both_bodies(): void
    {
        Mail::fake();
        config(['app.frontend_url' => 'https://bimbelku.example']);
        $user = User::factory()->create(['email' => 'murid@example.com']);

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('message', 'Jika email terdaftar, link reset akan dikirim.');

        Mail::assertSent(ResetPasswordMail::class, function (ResetPasswordMail $mail) use ($user): bool {
            $this->assertTrue($mail->hasTo($user->email));
            $this->assertStringStartsWith(
                'https://bimbelku.example/reset-password?',
                $mail->resetUrl
            );
            $mail->assertSeeInHtml('Reset Password');
            $mail->assertSeeInHtml($mail->resetUrl);
            $mail->assertSeeInText($mail->resetUrl);

            $query = (string) parse_url($mail->resetUrl, PHP_URL_QUERY);
            parse_str($query, $parameters);
            $this->assertSame($user->email, $parameters['email'] ?? null);
            $this->assertNotEmpty($parameters['token'] ?? null);

            $record = DB::table('password_reset_tokens')
                ->where('email', $user->email)
                ->first();
            $this->assertNotNull($record);
            $this->assertTrue(Hash::check((string) $parameters['token'], $record->token));
            $this->assertNotSame((string) $parameters['token'], $record->token);

            return true;
        });
    }

    public function test_reset_email_has_a_sixty_second_server_cooldown(): void
    {
        Mail::fake();
        $user = User::factory()->create(['email' => 'cooldown@example.com']);

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk();
        $firstTokenHash = DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->value('token');

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertStatus(429)
            ->assertJsonPath('error_code', 'password_reset_cooldown')
            ->assertJsonPath('retry_after_seconds', 60)
            ->assertHeader('Retry-After', '60');

        Mail::assertSentCount(1);
        $this->assertSame(
            $firstTokenHash,
            DB::table('password_reset_tokens')->where('email', $user->email)->value('token')
        );

        $this->travel(61)->seconds();

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk();

        Mail::assertSentCount(2);
        $this->assertNotSame(
            $firstTokenHash,
            DB::table('password_reset_tokens')->where('email', $user->email)->value('token')
        );
    }

    public function test_unknown_email_gets_the_same_generic_response_and_cooldown(): void
    {
        Mail::fake();
        $email = 'tidak-ada@example.com';

        $this->postJson('/api/forgot-password', ['email' => $email])
            ->assertOk()
            ->assertJsonPath('message', 'Jika email terdaftar, link reset akan dikirim.');

        $this->postJson('/api/forgot-password', ['email' => $email])
            ->assertStatus(429)
            ->assertJsonPath('error_code', 'password_reset_cooldown');

        Mail::assertNothingSent();
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $email]);
    }
}
