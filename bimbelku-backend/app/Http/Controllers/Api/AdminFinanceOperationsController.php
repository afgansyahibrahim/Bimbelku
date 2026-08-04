<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerWallet;
use App\Models\Order;
use App\Models\Refund;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminFinanceOperationsController extends Controller
{
    public function payments(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['all', 'pending', 'paid', 'rejected', 'refund_pending', 'refunded', 'cancelled'])],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $status = trim((string) ($validated['status'] ?? ''));

        $query = Order::query()
            ->where(function (Builder $orders) {
                $orders
                    ->whereNotNull('payment_proof')
                    ->orWhereIn('status', ['paid', 'rejected', 'refund_pending', 'refunded']);
            })
            ->with([
                'user:id,name,email',
                'verifier:id,name',
                'refund:id,order_id,status,amount,reason,destination_method,processed_at',
                'learningPackage.plan:id,name',
            ]);

        if ($status !== '' && $status !== 'all') {
            if ($status === 'pending') {
                $query->where('status', 'submitted')->whereNotNull('payment_proof');
            } else {
                $query->where('status', $status);
            }
        }
        if ($search !== '') {
            $query->where(function (Builder $orders) use ($search) {
                $orders
                    ->where('order_id', 'like', "%{$search}%")
                    ->orWhere('sender_name', 'like', "%{$search}%")
                    ->orWhere('bank_name', 'like', "%{$search}%")
                    ->orWhereHas('user', fn (Builder $users) => $users
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        $orders = $query->latest('updated_at')->limit(300)->get();
        $pending = $orders
            ->filter(fn (Order $order) => $order->status === 'submitted' && filled($order->payment_proof))
            ->map(fn (Order $order) => $this->paymentPayload($order))
            ->values();
        $history = $orders
            ->reject(fn (Order $order) => $order->status === 'submitted')
            ->map(fn (Order $order) => $this->paymentPayload($order))
            ->values();

        return response()->json([
            'summary' => [
                'pending_count' => Order::query()
                    ->where('status', 'submitted')
                    ->whereNotNull('payment_proof')
                    ->count(),
                'pending_amount' => round((float) Order::query()
                    ->where('status', 'submitted')
                    ->whereNotNull('payment_proof')
                    ->sum('amount'), 2),
                'accepted_30_days' => round((float) Order::query()
                    ->whereIn('status', ['paid', 'refund_pending', 'refunded'])
                    ->where('verified_at', '>=', now()->subDays(30))
                    ->sum('amount'), 2),
                'rejected_30_days' => Order::query()
                    ->where('status', 'rejected')
                    ->where('updated_at', '>=', now()->subDays(30))
                    ->count(),
                'refund_pending_count' => Order::query()->where('status', 'refund_pending')->count(),
            ],
            'pending' => $pending,
            'history' => $history,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    public function refunds(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['all', 'pending', 'paid'])],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $status = trim((string) ($validated['status'] ?? ''));

        $query = Refund::query()->with([
            'user:id,name,email',
            'order:id,order_id,user_id,amount,status,bank_name,sender_name,sender_account_number',
            'booking.bookingRequest:id,subject_name',
            'processor:id,name',
            'walletTransaction:id,refund_id,balance_after',
        ]);
        if ($status !== '' && $status !== 'all') {
            $query->where('status', $status);
        }
        if ($search !== '') {
            $query->where(function (Builder $refunds) use ($search) {
                $refunds
                    ->where('reason', 'like', "%{$search}%")
                    ->orWhereHas('order', fn (Builder $orders) => $orders->where('order_id', 'like', "%{$search}%"))
                    ->orWhereHas('user', fn (Builder $users) => $users
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        $refunds = $query->latest()->limit(300)->get()->map(function (Refund $refund) {
            $bankName = $refund->destination_bank_name ?: $refund->order?->bank_name;
            $accountName = $refund->destination_account_name ?: $refund->order?->sender_name;
            $accountNumber = $refund->destination_account_number ?: $refund->order?->sender_account_number;

            return [
                'id' => $refund->id,
                'order_id' => $refund->order?->order_id,
                'student' => $refund->user ? [
                    'id' => $refund->user->id,
                    'name' => $refund->user->name,
                    'email' => $refund->user->email,
                ] : null,
                'subject' => $refund->booking?->bookingRequest?->subject_name,
                'amount' => (float) $refund->amount,
                'reason' => $refund->reason,
                'status' => $refund->status,
                'destination_method' => $refund->destination_method,
                'bank_destination' => [
                    'bank_name' => $bankName,
                    'account_name' => $accountName,
                    'account_number' => $accountNumber,
                    'is_complete' => filled($bankName) && filled($accountName) && filled($accountNumber),
                ],
                'wallet_balance_after' => $refund->walletTransaction
                    ? (float) $refund->walletTransaction->balance_after
                    : null,
                'proof_url' => $refund->proof_url,
                'notes' => $refund->notes,
                'processor' => $refund->processor ? [
                    'id' => $refund->processor->id,
                    'name' => $refund->processor->name,
                ] : null,
                'processed_at' => $refund->processed_at,
                'created_at' => $refund->created_at,
            ];
        })->values();

        return response()->json([
            'summary' => [
                'pending_count' => Refund::query()->where('status', 'pending')->count(),
                'pending_amount' => round((float) Refund::query()->where('status', 'pending')->sum('amount'), 2),
                'bank_paid_30_days' => round((float) Refund::query()
                    ->where('status', 'paid')
                    ->where('destination_method', 'bank_transfer')
                    ->where('processed_at', '>=', now()->subDays(30))
                    ->sum('amount'), 2),
                'wallet_credited_30_days' => round((float) Refund::query()
                    ->where('status', 'paid')
                    ->where('destination_method', 'bimbelku_balance')
                    ->where('processed_at', '>=', now()->subDays(30))
                    ->sum('amount'), 2),
                'wallet_liability' => round((float) CustomerWallet::query()->sum('current_balance'), 2),
            ],
            'pending' => $refunds->where('status', 'pending')->values(),
            'history' => $refunds->where('status', '!=', 'pending')->values(),
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    private function paymentPayload(Order $order): array
    {
        $details = is_array($order->class_details_snapshot) ? $order->class_details_snapshot : [];
        $subject = $details['subject'] ?? $details['subject_name'] ?? $order->learningPackage?->plan?->name ?? 'Pesanan belajar';
        $teacher = $details['teacher_name'] ?? null;

        return [
            'id' => $order->id,
            'order_id' => $order->order_id,
            'student' => $order->user ? [
                'id' => $order->user->id,
                'name' => $order->user->name,
                'email' => $order->user->email,
            ] : null,
            'title' => collect([$subject, $teacher])->filter()->join(' · '),
            'amount' => (float) $order->amount,
            'status' => $order->status,
            'payment_proof' => $order->payment_proof_url,
            'bank_name' => $order->bank_name,
            'sender_name' => $order->sender_name,
            'sender_account_number' => $order->sender_account_number,
            'payment_rejection_reason' => $order->payment_rejection_reason
                ?? ($details['payment_rejection_reason'] ?? null),
            'payment_submitted_at' => $order->payment_submitted_at,
            'verified_at' => $order->verified_at,
            'verifier' => $order->verifier ? [
                'id' => $order->verifier->id,
                'name' => $order->verifier->name,
            ] : null,
            'refund' => $order->refund ? [
                'id' => $order->refund->id,
                'status' => $order->refund->status,
                'amount' => (float) $order->refund->amount,
                'reason' => $order->refund->reason,
                'destination_method' => $order->refund->destination_method,
                'processed_at' => $order->refund->processed_at,
            ] : null,
            'updated_at' => $order->updated_at,
        ];
    }
}
