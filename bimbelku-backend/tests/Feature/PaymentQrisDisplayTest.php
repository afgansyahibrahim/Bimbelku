<?php

namespace Tests\Feature;

use App\Models\PaymentSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentQrisDisplayTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_load_configured_qris_without_public_storage_link(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put(
            'payment_settings/qris.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nS0AAAAASUVORK5CYII=')
        );

        PaymentSetting::create([
            'singleton_key' => 1,
            'merchant_name' => 'BimbelKu Official',
            'bank_name' => 'Bank Contoh',
            'account_number' => '1234567890',
            'account_name' => 'BimbelKu Official',
            'qris_image' => 'payment_settings/qris.png',
        ]);

        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
        ]);
        Sanctum::actingAs($student);

        $this->getJson('/api/payment-settings')
            ->assertOk()
            ->assertJsonPath('qris_available', true);

        $endpoint = $this->getJson('/api/payment-settings')->json('qris_endpoint');
        $this->assertStringStartsWith('/payment-settings/qris?v=', $endpoint);

        $this->get('/api/payment-settings/qris')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
    }

    public function test_missing_qris_file_is_reported_instead_of_returning_broken_url(): void
    {
        Storage::fake('public');

        PaymentSetting::create([
            'singleton_key' => 1,
            'merchant_name' => 'BimbelKu Official',
            'bank_name' => 'Bank Contoh',
            'account_number' => '1234567890',
            'account_name' => 'BimbelKu Official',
            'qris_image' => 'payment_settings/missing.png',
        ]);

        $student = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
        ]);
        Sanctum::actingAs($student);

        $this->getJson('/api/payment-settings')
            ->assertOk()
            ->assertJsonPath('qris_available', false)
            ->assertJsonPath('qris_endpoint', null);

        $this->get('/api/payment-settings/qris')->assertNotFound();
    }
}
