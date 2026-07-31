<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\FinanceAuthorization;
use App\Models\FinancialJournal;
use App\Models\Order;
use App\Models\TeacherProfile;
use App\Models\User;
use App\Support\EducationCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageThreeFinanceSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_higher_education_is_removed_from_supported_levels(): void
    {
        $this->assertSame(['SD', 'SMP', 'SMA', 'Umum'], EducationCatalog::LEVELS);
        $this->assertArrayNotHasKey('Perguruan Tinggi', EducationCatalog::GRADES_BY_LEVEL);
    }

    public function test_sensitive_admin_finance_action_requires_two_factor_authorization(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/commission-setting', [
            'admin_fee' => 18,
        ], ['Idempotency-Key' => 'finance-locked-test'])
            ->assertStatus(423)
            ->assertJsonPath('code', 'FINANCE_2FA_SETUP_REQUIRED');
    }

    public function test_idempotency_key_replays_one_finance_mutation(): void
    {
        $admin = $this->authorizedAdmin();
        Sanctum::actingAs($admin);
        $headers = ['Idempotency-Key' => 'commission-change-0001'];

        $first = $this->postJson('/api/admin/commission-setting', ['admin_fee' => 17], $headers)
            ->assertOk();
        $second = $this->postJson('/api/admin/commission-setting', ['admin_fee' => 17], $headers)
            ->assertOk();

        $this->assertSame($first->getContent(), $second->getContent());
        $this->assertDatabaseCount('idempotency_records', 1);
        $this->assertDatabaseHas('settings', ['key' => 'admin_fee', 'value' => '17']);
    }

    public function test_paid_order_creates_balanced_immutable_journal(): void
    {
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $order = Order::create([
            'user_id' => $student->id,
            'order_id' => 'INV-LEDGER-001',
            'amount' => 125000,
            'status' => 'submitted',
            'payment_proof' => 'payment_proofs/example.jpg',
        ]);

        $order->update(['status' => 'paid']);

        $journal = FinancialJournal::query()
            ->where('event_key', "order:{$order->id}:payment_received")
            ->with('entries')
            ->firstOrFail();
        $debit = $journal->entries->where('side', 'debit')->sum('amount');
        $credit = $journal->entries->where('side', 'credit')->sum('amount');

        $this->assertSame((float) $debit, (float) $credit);
        $this->assertSame(125000.0, (float) $debit);
        $this->expectException(\LogicException::class);
        $journal->update(['description' => 'Tidak boleh diubah']);
    }

    public function test_teacher_bank_change_requires_password_and_holds_payout(): void
    {
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'status' => 'active',
            'password' => Hash::make('TeacherPass123!'),
        ]);
        TeacherProfile::create(['user_id' => $teacher->id]);
        Sanctum::actingAs($teacher);

        $this->postJson('/api/teacher/bank', [
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'account_name' => 'Tutor Aman',
            'current_password' => 'TeacherPass123!',
        ], ['Idempotency-Key' => 'teacher-bank-change-0001'])
            ->assertOk()
            ->assertJsonStructure(['payout_hold_until']);

        $profile = $teacher->teacherProfile()->firstOrFail();
        $this->assertTrue($profile->payout_hold_until->isFuture());
        $this->assertSame(1, $profile->bank_details_version);
        $this->assertNotNull($profile->bank_account_fingerprint);
    }

    public function test_high_value_payout_needs_a_different_admin_approval(): void
    {
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'active']);
        TeacherProfile::create([
            'user_id' => $teacher->id,
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'account_name' => 'Tutor Besar',
        ]);
        $booking = Booking::create([
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'start_at' => now()->subHours(2),
            'end_at' => now()->subHour(),
            'duration_hours' => 1,
            'learning_mode' => 'online',
            'class_type' => 'private',
            'hourly_rate' => 7500000,
            'total_amount' => 7500000,
            'status' => 'completed',
            'commission_percent' => 20,
            'gross_amount' => 7500000,
            'teacher_net_amount' => 6000000,
            'completed_at' => now(),
            'payout_status' => 'ready',
        ]);
        $adminOne = $this->authorizedAdmin();
        $adminTwo = $this->authorizedAdmin();

        Sanctum::actingAs($adminOne);
        $approvalId = $this->postJson('/api/admin/payout-approvals', [
            'teacher_id' => $teacher->id,
            'booking_ids' => [$booking->id],
        ], ['Idempotency-Key' => 'large-payout-request-0001'])
            ->assertStatus(202)
            ->json('data.id');

        $this->postJson("/api/admin/payout-approvals/{$approvalId}/approve", [], [
            'Idempotency-Key' => 'large-payout-self-approval-0001',
        ])->assertUnprocessable();

        Sanctum::actingAs($adminTwo);
        $this->postJson("/api/admin/payout-approvals/{$approvalId}/approve", [], [
            'Idempotency-Key' => 'large-payout-second-approval-0001',
        ])->assertOk();

        $this->assertDatabaseHas('payout_approvals', [
            'id' => $approvalId,
            'requested_by' => $adminOne->id,
            'approved_by' => $adminTwo->id,
            'status' => 'approved',
        ]);
    }

    private function authorizedAdmin(): User
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'finance_totp_secret' => 'JBSWY3DPEHPK3PXP',
            'finance_totp_confirmed_at' => now(),
        ]);
        FinanceAuthorization::create([
            'user_id' => $admin->id,
            'token_fingerprint' => hash('sha256', 'no-bearer-token'),
            'verified_at' => now(),
            'expires_at' => now()->addMinutes(10),
        ]);

        return $admin;
    }
}
