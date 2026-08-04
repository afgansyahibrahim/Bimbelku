<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingRequest;
use App\Models\FinancialJournal;
use App\Models\Order;
use App\Models\TeacherProfile;
use App\Models\User;
use App\Support\EducationCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageThreeFinanceSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('bimbelku.primary_admin_email', '');
    }

    public function test_higher_education_is_removed_from_supported_levels(): void
    {
        $this->assertSame(['SD', 'SMP', 'SMA', 'Umum'], EducationCatalog::LEVELS);
        $this->assertArrayNotHasKey('Perguruan Tinggi', EducationCatalog::GRADES_BY_LEVEL);
    }

    public function test_single_admin_can_use_finance_without_authenticator(): void
    {
        $admin = $this->activeAdmin();
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/commission-setting', [
            'admin_fee' => 18,
        ], ['Idempotency-Key' => 'single-admin-finance-0001'])
            ->assertOk();

        $this->getJson('/api/admin/finance/payments')->assertOk();
        $this->getJson('/api/admin/finance/refunds')->assertOk();
        $this->getJson('/api/admin/finance')->assertOk();
        $this->getJson('/api/admin/finance-security')->assertNotFound();
    }

    public function test_idempotency_key_replays_one_finance_mutation(): void
    {
        $admin = $this->activeAdmin();
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

    public function test_single_admin_can_complete_high_value_payout_with_proof_and_database_locking(): void
    {
        Storage::fake('local');
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'active']);
        TeacherProfile::create([
            'user_id' => $teacher->id,
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'account_name' => 'Tutor Besar',
        ]);
        $scheduledStart = now()->subHours(2);
        $scheduledEnd = now()->subHour();
        $bookingRequest = BookingRequest::create([
            'student_id' => $student->id,
            'matched_teacher_id' => $teacher->id,
            'subject_name' => 'Matematika',
            'education_level' => 'SMA',
            'grade' => 'Kelas 12',
            'learning_mode' => 'online',
            'class_type' => 'private',
            'scheduled_date' => $scheduledStart->toDateString(),
            'start_time' => $scheduledStart->format('H:i:s'),
            'end_time' => $scheduledEnd->format('H:i:s'),
            'duration_hours' => 1,
            'status' => 'confirmed',
            'hourly_rate' => 7500000,
            'total_amount' => 7500000,
        ]);
        $booking = Booking::create([
            'booking_request_id' => $bookingRequest->id,
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'start_at' => $scheduledStart,
            'end_at' => $scheduledEnd,
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

        $bookingRequest->update(['booking_id' => $booking->id]);

        Sanctum::actingAs($this->activeAdmin());
        $this->post('/api/admin/payout', [
            'teacher_id' => $teacher->id,
            'booking_ids' => [$booking->id],
            'proof_file' => UploadedFile::fake()->image('transfer.jpg'),
        ], [
            'Accept' => 'application/json',
            'Idempotency-Key' => 'single-admin-large-payout-0001',
        ])->assertOk();

        $this->assertDatabaseHas('payouts', [
            'user_id' => $teacher->id,
            'amount' => 6000000,
            'status' => 'completed',
        ]);
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'payout_status' => 'paid',
        ]);
    }

    private function activeAdmin(): User
    {
        return User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'admin_type' => 'single_admin',
            'admin_permissions' => null,
        ]);
    }
}
