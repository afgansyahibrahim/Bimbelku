<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Services\GroupClassService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class OrderController extends Controller
{
    public function pay(Request $request, int $id, GroupClassService $groupService)
    {
        $paymentSettings = PaymentSetting::query()->first();
        if (
            !$paymentSettings
            || blank($paymentSettings->bank_name)
            || blank($paymentSettings->account_number)
            || blank($paymentSettings->account_name)
        ) {
            return response()->json([
                'message' => 'Rekening pembayaran belum dikonfigurasi admin.',
            ], 503);
        }

        $validated = $request->validate([
            'file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'sender_name' => ['required', 'string', 'max:150'],
            'bank_name' => ['required', 'string', 'max:100'],
            'sender_account_number' => ['required', 'string', 'max:80', 'regex:/^[0-9 .+-]+$/'],
        ]);

        $order = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['booking', 'participant.bookingRequest'])
            ->findOrFail($id);

        if (!in_array($order->status, ['pending', 'rejected'], true)) {
            return response()->json(['message' => 'Tagihan ini sudah tidak dapat dibayar.'], 422);
        }

        $booking = $order->booking;
        if (!$booking || !$this->bookingAcceptsPayment($booking)) {
            return response()->json(['message' => 'Data sesi pada tagihan tidak lagi aktif.'], 422);
        }

        if ($booking->payment_due_at?->isPast()) {
            $this->expireUnpaidOrder($order, $groupService);
            return response()->json(['message' => 'Batas pembayaran sudah berakhir.'], 422);
        }

        $path = $request->file('file')->store('payment_proofs', 'local');
        $previousProof = null;

        try {
            DB::transaction(function () use ($order, $path, $validated, &$previousProof) {
                $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
                if (!in_array($lockedOrder->status, ['pending', 'rejected'], true)) {
                    abort(422, 'Tagihan ini sudah tidak dapat dibayar.');
                }

                $lockedBooking = $lockedOrder->booking()->lockForUpdate()->firstOrFail();
                if (!$this->bookingAcceptsPayment($lockedBooking)) {
                    abort(422, 'Data sesi pada tagihan tidak lagi aktif.');
                }
                if ($lockedBooking->payment_due_at?->isPast()) {
                    abort(422, 'Batas pembayaran sudah berakhir.');
                }

                $previousProof = $lockedOrder->payment_proof;
                $details = $lockedOrder->class_details_snapshot ?? [];
                unset($details['payment_rejection_reason']);
                $lockedOrder->update([
                    'status' => 'submitted',
                    'payment_proof' => $path,
                    'sender_name' => $validated['sender_name'],
                    'bank_name' => $validated['bank_name'],
                    'sender_account_number' => $validated['sender_account_number'],
                    'payment_rejection_reason' => null,
                    'class_details_snapshot' => $details,
                    'payment_submitted_at' => now(),
                ]);

                $participant = $lockedOrder->participant()->lockForUpdate()->first();
                $participant?->update(['status' => 'payment_submitted']);
                $participant?->bookingRequest?->update(['status' => 'payment_submitted']);

                $keepConfirmedGroup = $lockedBooking->class_type === 'group'
                    && $lockedBooking->status === 'confirmed';
                $lockedBooking->update([
                    'status' => $keepConfirmedGroup
                        ? 'confirmed'
                        : ($lockedBooking->class_type === 'group'
                            ? 'payment_collecting'
                            : 'payment_submitted'),
                ]);
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        if ($previousProof && $previousProof !== $path) {
            Storage::disk('local')->delete($previousProof);
            Storage::disk('public')->delete($previousProof);
        }

        return response()->json([
            'message' => 'Bukti transfer berhasil dikirim. Admin akan memeriksanya.',
        ]);
    }

    public function getActiveOrder(Request $request, GroupClassService $groupService)
    {
        $order = Order::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('status', ['pending', 'rejected'])
            ->with(['booking.teacher.teacherProfile', 'participant.bookingRequest'])
            ->latest()
            ->first();

        if (!$order) {
            return response()->json(null);
        }
        if (!$order->booking) {
            return response()->json(null);
        }

        if ($order->booking->payment_due_at?->isPast()) {
            $this->expireUnpaidOrder($order, $groupService);
            return response()->json(null);
        }
        if (!$this->bookingAcceptsPayment($order->booking)) {
            return response()->json(null);
        }

        $details = is_array($order->class_details_snapshot)
            ? $order->class_details_snapshot
            : json_decode((string) $order->class_details_snapshot, true);

        return response()->json([
            'order_id' => $order->id,
            'order_number' => $order->order_id,
            'amount' => $order->amount,
            'status' => $order->status,
            'rejection_reason' => $order->payment_rejection_reason,
            'created_at' => $order->created_at,
            'payment_due_at' => $order->booking?->payment_due_at,
            'subject' => $details['subject'] ?? 'Kelas',
            'type' => ($details['method'] ?? 'online').' - '.($details['type'] ?? 'Privat'),
            'tutor_name' => $details['teacher_name'] ?? 'Tutor',
            'scheduled_at' => $details['start_at'] ?? null,
        ]);
    }

    public function cancelOrder(Request $request, int $id, GroupClassService $groupService)
    {
        $order = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['booking.participants', 'participant.bookingRequest'])
            ->findOrFail($id);

        if (!in_array($order->status, ['pending', 'rejected'], true)) {
            return response()->json([
                'message' => 'Tagihan tidak dapat dibatalkan saat pembayaran sedang diperiksa.',
            ], 422);
        }

        $attachmentToDelete = null;
        DB::transaction(function () use ($order, $groupService, &$attachmentToDelete) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            if (!in_array($lockedOrder->status, ['pending', 'rejected'], true)) {
                abort(422, 'Tagihan tidak dapat dibatalkan saat pembayaran sedang diperiksa.');
            }

            $participant = $lockedOrder->participant()->lockForUpdate()->first();
            $bookingRequest = $participant?->bookingRequest()->lockForUpdate()->first();
            $booking = $lockedOrder->booking()->lockForUpdate()->first();

            $lockedOrder->update(['status' => 'cancelled']);
            $participant?->update(['status' => 'cancelled']);
            if ($bookingRequest) {
                $attachmentToDelete = $bookingRequest->attachment;
                $bookingRequest->update([
                    'status' => 'cancelled',
                    'attachment' => null,
                ]);
            }

            if (!$booking) {
                return;
            }

            if ($booking->class_type === 'private') {
                $bookingRequest?->offers()
                    ->where('status', 'accepted')
                    ->update(['status' => 'cancelled']);
                $booking->update(['status' => 'cancelled', 'payout_status' => 'cancelled']);
                return;
            }

            if ($bookingRequest) {
                $groupService->leave($bookingRequest);
            }
            $groupService->settleAfterProfileDecision(
                $booking,
                'Peserta membatalkan pembayaran kelas kelompok'
            );
        });

        if ($attachmentToDelete) {
            Storage::disk('local')->delete($attachmentToDelete);
            Storage::disk('public')->delete($attachmentToDelete);
        }

        return response()->json(['message' => 'Tagihan berhasil dibatalkan.']);
    }

    public function index(Request $request)
    {
        $orders = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['booking.teacher', 'refund'])
            ->latest()
            ->paginate(20);

        $orders->getCollection()->transform(function (Order $order) {
            $details = is_array($order->class_details_snapshot)
                ? $order->class_details_snapshot
                : json_decode((string) $order->class_details_snapshot, true);

            return [
                'id' => $order->id,
                'order_id' => $order->order_id,
                'amount' => $order->amount,
                'status' => $order->status,
                'created_at' => $order->created_at,
                'verified_at' => $order->verified_at,
                'payment_proof_url' => $order->payment_proof_url,
                'subject' => $details['subject'] ?? '-',
                'tutor_name' => $details['teacher_name'] ?? '-',
                'type' => ($details['method'] ?? '').' - '.($details['type'] ?? '-'),
                'schedule' => $details['start_at'] ?? null,
                'refund' => $order->refund,
                'payment_rejection_reason' => $order->payment_rejection_reason,
            ];
        });

        return response()->json($orders);
    }

    private function expireUnpaidOrder(Order $order, GroupClassService $groupService): void
    {
        DB::transaction(function () use ($order, $groupService) {
            $lockedOrder = Order::query()->lockForUpdate()->find($order->id);
            if (!$lockedOrder || !in_array($lockedOrder->status, ['pending', 'rejected'], true)) {
                return;
            }

            $lockedOrder->update(['status' => 'expired']);
            $lockedOrder->participant?->update(['status' => 'payment_expired']);
            $bookingRequest = $lockedOrder->participant?->bookingRequest;
            $bookingRequest?->update(['status' => 'payment_expired']);

            $booking = $lockedOrder->booking;
            if (!$booking) {
                return;
            }

            if ($booking->class_type === 'private') {
                $bookingRequest?->offers()
                    ->where('status', 'accepted')
                    ->update(['status' => 'cancelled']);
                $booking->update([
                    'status' => 'payment_expired',
                    'payout_status' => 'cancelled',
                ]);
            } else {
                $groupService->settleAfterProfileDecision(
                    $booking,
                    'Peserta tidak menyelesaikan pembayaran kelas kelompok'
                );
            }

            Notification::create([
                'user_id' => $lockedOrder->user_id,
                'title' => 'Batas pembayaran berakhir',
                'message' => 'Tagihan dibatalkan karena bukti transfer tidak dikirim tepat waktu.',
                'type' => 'warning',
            ]);
        });
    }

    private function bookingAcceptsPayment(Booking $booking): bool
    {
        if (in_array($booking->status, [
            'teacher_selected', 'awaiting_payment', 'payment_collecting', 'payment_submitted',
        ], true)) {
            return true;
        }

        return $booking->class_type === 'group'
            && $booking->status === 'confirmed'
            && $booking->payment_due_at?->isFuture();
    }
}
