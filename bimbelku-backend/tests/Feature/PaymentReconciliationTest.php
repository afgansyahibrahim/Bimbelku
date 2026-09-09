<?php

namespace Tests\Feature;

use App\Models\CustomerWallet;
use App\Models\FinancialJournal;
use App\Models\Order;
use App\Models\PaymentSubmission;
use App\Models\User;
use App\Services\CustomerWalletService;
use App\Services\FinancialLedgerService;
use App\Services\PaymentReconciliationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentReconciliationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('bimbelku.primary_admin_email', '');
    }

    public function test_admin_endpoint_requires_actual_amount_and_returns_underpayment_breakdown(): void
    {
        [$admin, $order] = $this->paymentScenario(50000);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/verify-payment', [
            'order_id' => $order->id,
            'status' => 'paid',
        ], ['Idempotency-Key' => 'reconciliation-missing-amount'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('actual_received_amount');

        $this->postJson('/api/admin/verify-payment', [
            'order_id' => $order->id,
            'status' => 'paid',
            'actual_received_amount' => 30000,
        ], ['Idempotency-Key' => 'reconciliation-underpaid'])
            ->assertOk()
            ->assertJsonPath('reconciliation', 'underpaid')
            ->assertJsonPath('received_amount', 30000)
            ->assertJsonPath('outstanding_amount', 20000);
    }

    public function test_underpayment_is_kept_and_can_be_completed_by_a_second_submission(): void
    {
        [$admin, $order] = $this->paymentScenario(50000);
        $service = app(PaymentReconciliationService::class);

        $first = $service->verify($order, 30000, $admin);

        $this->assertSame('underpaid', $first['result']);
        $this->assertSame(20000.0, $first['outstanding']);
        $this->assertSame('partially_paid', $order->fresh()->status);
        $this->assertSame(30000.0, (float) $order->fresh()->external_received_amount);
        $this->assertNotNull($order->fresh()->top_up_due_at);

        $order->refresh()->update(['status' => 'submitted', 'payment_proof' => 'payment_proofs/top-up.jpg']);
        PaymentSubmission::create([
            'order_id' => $order->id,
            'sequence' => 2,
            'proof_path' => 'payment_proofs/top-up.jpg',
            'status' => 'submitted',
        ]);
        $second = $service->verify($order->fresh(), 20000, $admin);

        $this->assertSame('exact', $second['result']);
        $this->assertSame(0.0, $second['outstanding']);
        $this->assertSame(50000.0, (float) $order->fresh()->external_received_amount);
        $this->assertDatabaseCount('payment_submissions', 2);
        $this->assertDatabaseCount('financial_journals', 2);
    }

    public function test_overpayment_is_separated_from_order_value_and_credited_to_wallet(): void
    {
        [$admin, $order] = $this->paymentScenario(50000);
        $reconciliation = app(PaymentReconciliationService::class);
        $wallets = app(CustomerWalletService::class);
        $ledger = app(FinancialLedgerService::class);

        $result = $reconciliation->verify($order, 60000, $admin);
        $this->assertSame('overpaid', $result['result']);
        $this->assertSame(10000.0, $result['surplus']);

        $order->update(['status' => 'paid']);
        $wallets->creditOverpayment($order->fresh(), 10000, $admin->id);
        $ledger->recordOverpaymentCredited($order->fresh());

        $this->assertSame(10000.0, (float) CustomerWallet::query()->where('user_id', $order->user_id)->value('current_balance'));
        $this->assertDatabaseHas('customer_wallet_transactions', [
            'order_id' => $order->id,
            'type' => 'overpayment_credit',
            'amount' => 10000,
        ]);
        $this->assertNotNull(FinancialJournal::query()->where('event_key', "order:{$order->id}:payment_received")->first());
        $this->assertNotNull(FinancialJournal::query()->where('event_key', "order:{$order->id}:overpayment_wallet_credit")->first());
    }

    public function test_expired_underpayment_is_returned_to_wallet_without_becoming_revenue(): void
    {
        [$admin, $order] = $this->paymentScenario(50000);
        $service = app(PaymentReconciliationService::class);
        $service->verify($order, 30000, $admin);

        $returned = $service->returnExpiredPartialPayment($order->fresh());
        $order->fresh()->update(['status' => 'expired']);

        $this->assertTrue($returned);
        $this->assertSame('underpayment_returned', $order->fresh()->payment_reconciliation_status);
        $this->assertSame(30000.0, (float) CustomerWallet::query()->where('user_id', $order->user_id)->value('current_balance'));
        $this->assertDatabaseHas('customer_wallet_transactions', [
            'order_id' => $order->id,
            'type' => 'expired_partial_credit',
            'amount' => 30000,
        ]);
        $this->assertDatabaseHas('financial_ledger_entries', [
            'account_code' => 'customer_wallet_liability',
            'side' => 'credit',
            'amount' => 30000,
        ]);
    }

    private function paymentScenario(float $amount): array
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $order = Order::create([
            'user_id' => $student->id,
            'order_id' => 'INV-RECON-'.random_int(1000, 9999),
            'amount' => $amount,
            'status' => 'submitted',
            'payment_proof' => 'payment_proofs/initial.jpg',
        ]);
        PaymentSubmission::create([
            'order_id' => $order->id,
            'sequence' => 1,
            'proof_path' => 'payment_proofs/initial.jpg',
            'status' => 'submitted',
        ]);

        return [$admin, $order];
    }
}
