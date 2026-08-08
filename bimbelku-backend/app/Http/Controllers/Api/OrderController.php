<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\Order;
use App\Models\LearningPackage;
use App\Models\PackageSession;
use App\Models\PackageRenewal;
use App\Models\PaymentSetting;
use App\Models\User;
use App\Services\GroupClassService;
use App\Services\PackageCheckoutService;
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
            return $this->paymentError(
                'Metode pembayaran belum siap. Admin perlu melengkapi rekening tujuan sebelum bukti dapat dikirim.',
                503,
                'payment_settings_unavailable'
            );
        }

        $validated = $request->validate([
            'file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'sender_name' => ['required', 'string', 'max:150', 'regex:/\pL/u', 'not_regex:/\d/u'],
            'bank_name' => ['required', 'string', 'max:100', 'regex:/\pL/u'],
            'sender_account_number' => ['required', 'string', 'min:8', 'max:20', 'regex:/^[0-9]+$/'],
        ], [
            'sender_name.regex' => 'Nama pemilik rekening wajib mengandung huruf.',
            'sender_name.not_regex' => 'Nama pemilik rekening tidak boleh memuat angka.',
            'bank_name.regex' => 'Nama bank atau e-wallet wajib mengandung huruf.',
            'sender_account_number.min' => 'Nomor rekening atau e-wallet minimal 8 digit.',
            'sender_account_number.max' => 'Nomor rekening atau e-wallet maksimal 20 digit.',
            'sender_account_number.regex' => 'Nomor rekening atau e-wallet hanya boleh berisi angka.',
        ]);

        $order = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['booking', 'participant.bookingRequest', 'learningPackage.subjects.sessions.booking'])
            ->findOrFail($id);

        if (!in_array($order->status, ['pending', 'rejected'], true)) {
            return $this->paymentError('Tagihan ini sudah tidak dapat dibayar. Periksa status tagihan sebelum mencoba lagi.', 422, 'invoice_not_payable');
        }

        if ($order->learning_package_id) {
            return $this->payPackage($request, $order, $validated);
        }

        $booking = $order->booking;
        if (!$booking || !$this->bookingAcceptsPayment($booking)) {
            return $this->paymentError('Kelas pada tagihan ini sudah tidak aktif. Periksa Kelas Saya sebelum mengirim bukti pembayaran.', 422, 'session_inactive');
        }

        if ($booking->payment_due_at?->isPast()) {
            $this->expireUnpaidOrder($order, $groupService);
            return $this->paymentError('Batas pembayaran sudah berakhir. Tagihan tidak lagi menerima bukti transfer.', 422, 'payment_expired');
        }

        if ($conflict = $this->findBookingPaymentConflict($booking)) {
            return $this->scheduleConflictResponse($conflict);
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
                User::query()->lockForUpdate()->findOrFail($lockedOrder->user_id);
                if (!$this->bookingAcceptsPayment($lockedBooking)) {
                    abort(422, 'Kelas pada tagihan ini sudah tidak aktif. Periksa Kelas Saya sebelum mengirim bukti pembayaran.');
                }
                if ($lockedBooking->payment_due_at?->isPast()) {
                    abort(422, 'Batas pembayaran sudah berakhir. Tagihan tidak lagi menerima bukti transfer.');
                }
                if ($conflict = $this->findBookingPaymentConflict($lockedBooking)) {
                    abort(422, $conflict['message']);
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

        User::query()->where('role', 'admin')->pluck('id')->each(function ($adminId) use ($order) {
            Notification::create([
                'user_id' => $adminId,
                'title' => 'Bukti pembayaran baru',
                'message' => "Tagihan {$order->order_id} sudah diunggah murid dan menunggu pemeriksaan.",
                'type' => 'info',
                'target_url' => '/admin/pembayaran',
            ]);
        });
        if ($order->booking?->teacher_id) {
            Notification::create([
                'user_id' => $order->booking->teacher_id,
                'title' => 'Pembayaran murid sedang diperiksa',
                'message' => "Bukti untuk tagihan {$order->order_id} sudah masuk ke admin. Jadwal tetap ditahan selama pemeriksaan.",
                'type' => 'info',
                'target_url' => '/guru/kelas',
            ]);
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
            ->with(['booking.teacher.teacherProfile', 'participant.bookingRequest', 'learningPackage.plan'])
            ->latest()
            ->first();

        if (!$order) {
            return response()->json(null);
        }
        if ($order->learning_package_id) {
            if ($order->learningPackage?->payment_due_at?->isPast()) {
                $this->expirePackageOrder($order);
                return response()->json(null);
            }
            if (!in_array($order->learningPackage?->status, ['awaiting_payment', 'payment_rejected'], true)) {
                return response()->json(null);
            }
        } elseif (!$order->booking) {
            return response()->json(null);
        } elseif ($order->booking->payment_due_at?->isPast()) {
            $this->expireUnpaidOrder($order, $groupService);
            return response()->json(null);
        } elseif (!$this->bookingAcceptsPayment($order->booking)) {
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
            'payment_due_at' => $order->learningPackage?->payment_due_at ?? $order->booking?->payment_due_at,
            'subject' => $details['subject'] ?? 'Kelas',
            'type' => ($details['method'] ?? 'online').' - '.($details['type'] ?? 'Privat'),
            'tutor_name' => $details['teacher_name'] ?? 'Tutor',
            'scheduled_at' => $details['start_at'] ?? null,
            'subtotal_amount' => $order->subtotal_amount,
            'discount_amount' => $order->discount_amount,
            'package_name' => $details['package_name'] ?? null,
            'duration_hours' => (int) ($details['duration_hours'] ?? $order->learningPackage?->duration_hours ?? 1),
            'total_learning_hours' => (int) ($details['total_learning_hours'] ?? 0),
        ]);
    }

    public function cancelOrder(Request $request, int $id, GroupClassService $groupService)
    {
        $order = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['booking.participants', 'participant.bookingRequest', 'learningPackage'])
            ->findOrFail($id);

        if (!in_array($order->status, ['pending', 'rejected'], true)) {
            return response()->json([
                'message' => 'Tagihan tidak dapat dibatalkan saat pembayaran sedang diperiksa.',
            ], 422);
        }

        if ($order->learning_package_id) {
            $this->cancelPackageOrder($order);
            return response()->json(['message' => 'Tagihan paket berhasil dibatalkan.']);
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

    public function index(Request $request, GroupClassService $groupService)
    {
        Order::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('status', ['pending', 'rejected'])
            ->whereNotNull('learning_package_id')
            ->whereHas('learningPackage', fn ($packages) => $packages
                ->whereNotNull('payment_due_at')
                ->where('payment_due_at', '<=', now()))
            ->with('learningPackage')
            ->get()
            ->each(fn (Order $order) => $this->expirePackageOrder($order));

        Order::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('status', ['pending', 'rejected'])
            ->whereHas('booking', fn ($bookings) => $bookings
                ->whereNotNull('payment_due_at')
                ->where('payment_due_at', '<=', now()))
            ->with(['booking', 'participant.bookingRequest'])
            ->get()
            ->each(fn (Order $order) => $this->expireUnpaidOrder($order, $groupService));

        $orders = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['booking.teacher', 'refund', 'learningPackage.plan'])
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
                'payment_due_at' => $order->learningPackage?->payment_due_at ?? $order->booking?->payment_due_at,
                'booking_id' => $order->booking_id,
                'learning_package_id' => $order->learning_package_id,
                'package_name' => $order->learningPackage?->plan?->name,
                'duration_hours' => (int) ($details['duration_hours'] ?? $order->learningPackage?->duration_hours ?? 1),
                'total_learning_hours' => (int) ($details['total_learning_hours'] ?? 0),
                'subtotal_amount' => $order->subtotal_amount,
                'discount_amount' => $order->discount_amount,
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
                'target_url' => '/student/history',
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

    private function payPackage(Request $request, Order $order, array $validated)
    {
        $package = $order->learningPackage;
        if (
            !$package
            || !in_array($package->status, ['awaiting_payment', 'payment_rejected'], true)
        ) {
            return $this->paymentError('Paket tidak lagi menunggu pembayaran. Periksa status paket sebelum mencoba lagi.', 422, 'package_not_payable');
        }
        if ($package->payment_due_at?->isPast()) {
            $this->expirePackageOrder($order);
            return $this->paymentError('Batas pembayaran paket sudah berakhir. Buat tagihan baru sebelum membayar.', 422, 'payment_expired');
        }

        if ($conflict = $this->findPackagePaymentConflict($package)) {
            return $this->scheduleConflictResponse($conflict);
        }

        $path = $request->file('file')->store('payment_proofs', 'local');
        $previousProof = null;
        try {
            DB::transaction(function () use ($order, $path, $validated, &$previousProof) {
                $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
                User::query()->lockForUpdate()->findOrFail($lockedOrder->user_id);
                $package = $lockedOrder->learningPackage()->lockForUpdate()->firstOrFail();
                abort_unless(
                    in_array($lockedOrder->status, ['pending', 'rejected'], true)
                        && in_array($package->status, ['awaiting_payment', 'payment_rejected'], true),
                    422,
                    'Tagihan paket sudah tidak dapat dibayar.'
                );
                abort_if($package->payment_due_at?->isPast(), 422, 'Batas pembayaran paket sudah berakhir. Tagihan tidak lagi menerima bukti transfer.');
                if ($conflict = $this->findPackagePaymentConflict($package)) {
                    abort(422, $conflict['message']);
                }

                $previousProof = $lockedOrder->payment_proof;
                $lockedOrder->update([
                    'status' => 'submitted',
                    'payment_proof' => $path,
                    'sender_name' => $validated['sender_name'],
                    'bank_name' => $validated['bank_name'],
                    'sender_account_number' => $validated['sender_account_number'],
                    'payment_rejection_reason' => null,
                    'payment_submitted_at' => now(),
                ]);
                $package->update(['status' => 'payment_submitted']);
                $package->subjects()
                    ->with(['sessions.booking', 'bookingRequest'])
                    ->get()
                    ->each(function ($subject) {
                        $subject->update(['status' => 'payment_submitted']);
                        $subject->bookingRequest?->update(['status' => 'payment_submitted']);
                        $subject->sessions->each(function ($session) {
                            $session->update(['status' => 'payment_submitted']);
                            $session->booking?->update(['status' => 'payment_submitted']);
                            $session->booking?->participants()->update(['status' => 'payment_submitted']);
                        });
                    });
            }, 3);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        if ($previousProof && $previousProof !== $path) {
            Storage::disk('local')->delete($previousProof);
            Storage::disk('public')->delete($previousProof);
        }

        User::query()->where('role', 'admin')->pluck('id')->each(
            fn (int $adminId) => Notification::create([
                'user_id' => $adminId,
                'title' => 'Bukti pembayaran paket',
                'message' => "Tagihan {$order->order_id} menunggu pemeriksaan.",
                'type' => 'info',
                'target_url' => '/admin/pembayaran',
            ])
        );

        return response()->json(['message' => 'Bukti transfer paket berhasil dikirim.']);
    }

    private function paymentError(string $message, int $status, string $code, array $extra = [])
    {
        return response()->json([
            'message' => $message,
            'error_code' => $code,
            ...$extra,
        ], $status);
    }

    private function scheduleConflictResponse(array $conflict)
    {
        return $this->paymentError(
            $conflict['message'],
            422,
            'schedule_conflict',
            ['conflict' => $conflict['conflict']]
        );
    }

    private function findBookingPaymentConflict(Booking $booking): ?array
    {
        if (!$booking->start_at || !$booking->end_at) {
            return null;
        }

        $hasConflict = Booking::query()
            ->where('student_id', $booking->student_id)
            ->where('id', '!=', $booking->id)
            ->whereIn('status', [
                'awaiting_payment', 'payment_submitted', 'confirmed', 'in_progress',
                'awaiting_student_approval', 'disputed', 'admin_review_required',
            ])
            ->where('start_at', '<', $booking->end_at)
            ->where('end_at', '>', $booking->start_at)
            ->exists();

        if (!$hasConflict) {
            return null;
        }

        return $this->scheduleConflictPayload(
            'Kelas',
            $booking->start_at,
            $booking->end_at
        );
    }

    private function findPackagePaymentConflict(LearningPackage $package): ?array
    {
        $package->loadMissing('subjects.sessions');

        foreach ($package->subjects as $subject) {
            foreach ($subject->sessions as $session) {
                if (!$session->scheduled_start_at || !$session->scheduled_end_at) {
                    continue;
                }

                $bookingConflict = Booking::query()
                    ->where('student_id', $package->student_id)
                    ->whereIn('status', [
                        'awaiting_payment', 'payment_submitted', 'confirmed', 'in_progress',
                        'awaiting_student_approval', 'disputed', 'admin_review_required',
                    ])
                    ->where('start_at', '<', $session->scheduled_end_at)
                    ->where('end_at', '>', $session->scheduled_start_at)
                    ->whereDoesntHave('bookingRequest.packageSubject', fn ($query) => $query
                        ->where('learning_package_id', $package->id))
                    ->exists();

                $packageConflict = PackageSession::query()
                    ->where('id', '!=', $session->id)
                    ->whereHas('subject.package', fn ($query) => $query
                        ->where('student_id', $package->student_id)
                        ->where('id', '!=', $package->id)
                        ->whereNotIn('status', ['cancelled', 'payment_expired', 'completed']))
                    ->where('scheduled_start_at', '<', $session->scheduled_end_at)
                    ->where('scheduled_end_at', '>', $session->scheduled_start_at)
                    ->exists();

                if ($bookingConflict || $packageConflict) {
                    return $this->scheduleConflictPayload(
                        $subject->subject_name ?: 'Sesi paket',
                        $session->scheduled_start_at,
                        $session->scheduled_end_at
                    );
                }
            }
        }

        return null;
    }

    private function scheduleConflictPayload(string $subject, $start, $end): array
    {
        $timezone = config('app.timezone', 'Asia/Jakarta');
        $localStart = $start->copy()->timezone($timezone);
        $localEnd = $end->copy()->timezone($timezone);
        $startLabel = $localStart->format('d/m/Y H.i');
        $endLabel = $localEnd->format('H.i');

        return [
            'message' => "Jadwal {$subject} pada {$startLabel}–{$endLabel} bertabrakan dengan kelas atau paket lain yang masih aktif. Jika belum transfer, jangan lanjutkan pembayaran dan atur ulang jadwal. Jika sudah transfer, jangan membayar ulang; hubungi admin melalui Bantuan agar pembayaran dapat ditindaklanjuti.",
            'conflict' => [
                'subject' => $subject,
                'start_at' => $localStart->toIso8601String(),
                'end_at' => $localEnd->toIso8601String(),
            ],
        ];
    }

    private function expirePackageOrder(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()->lockForUpdate()->find($order->id);
            if (!$lockedOrder || !in_array($lockedOrder->status, ['pending', 'rejected'], true)) {
                return;
            }
            $package = $lockedOrder->learningPackage()->lockForUpdate()->first();
            $lockedOrder->update(['status' => 'expired']);
            if (!$package) return;

            $package->update(['status' => 'payment_expired', 'payment_due_at' => null]);
            $package->subjects()->with(['sessions.booking.bookingRequest', 'bookingRequest.offers'])->get()->each(
                function ($subject) {
                    $subject->update(['status' => 'payment_expired']);
                    $subject->bookingRequest?->update(['status' => 'payment_expired']);
                    $subject->bookingRequest?->offers()
                        ->whereIn('status', ['pending', 'accepted'])
                        ->update(['status' => 'cancelled', 'responded_at' => now()]);
                    $subject->sessions->each(function ($session) {
                        $session->update(['status' => 'payment_expired']);
                        $session->booking?->update(['status' => 'payment_expired', 'payout_status' => 'cancelled']);
                        $session->booking?->participants()->update(['status' => 'payment_expired']);
                        $bookingRequest = $session->booking?->bookingRequest;
                        $bookingRequest?->update(['status' => 'payment_expired']);
                        if ($bookingRequest) {
                            $bookingRequest->offers()
                                ->whereIn('status', ['pending', 'accepted'])
                                ->update(['status' => 'cancelled', 'responded_at' => now()]);
                        }
                    });
                }
            );
            $package->promotionClaims()
                ->where('status', 'reserved')
                ->update(['status' => 'available', 'released_at' => now(), 'learning_package_id' => null]);
            PackageRenewal::query()
                ->where('new_package_id', $package->id)
                ->whereIn('status', ['requested', 'tutor_accepted'])
                ->update(['status' => 'cancelled']);
            Notification::create([
                'user_id' => $lockedOrder->user_id,
                'title' => 'Batas pembayaran paket berakhir',
                'message' => 'Tagihan dibatalkan karena pembayaran tidak diselesaikan dalam 48 jam.',
                'type' => 'warning',
                'target_url' => '/student/history',
            ]);
        }, 3);
    }

    private function cancelPackageOrder(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            abort_unless(in_array($lockedOrder->status, ['pending', 'rejected'], true), 422);
            $package = $lockedOrder->learningPackage()->lockForUpdate()->firstOrFail();
            $lockedOrder->update(['status' => 'cancelled']);
            $package->update(['status' => 'cancelled', 'payment_due_at' => null]);
            $package->subjects()->with(['sessions.booking.bookingRequest', 'bookingRequest.offers'])->get()->each(
                function ($subject) {
                    $subject->update(['status' => 'cancelled']);
                    $subject->bookingRequest?->update(['status' => 'cancelled']);
                    $subject->bookingRequest?->offers()
                        ->whereIn('status', ['pending', 'accepted'])
                        ->update(['status' => 'cancelled', 'responded_at' => now()]);
                    $subject->sessions->each(function ($session) {
                        $session->update(['status' => 'cancelled']);
                        $session->booking?->update(['status' => 'cancelled', 'payout_status' => 'cancelled']);
                        $session->booking?->participants()->update(['status' => 'cancelled']);
                        $bookingRequest = $session->booking?->bookingRequest;
                        $bookingRequest?->update(['status' => 'cancelled']);
                        if ($bookingRequest) {
                            $bookingRequest->offers()
                                ->whereIn('status', ['pending', 'accepted'])
                                ->update(['status' => 'cancelled', 'responded_at' => now()]);
                        }
                    });
                }
            );
            $package->promotionClaims()
                ->where('status', 'reserved')
                ->update(['status' => 'available', 'released_at' => now(), 'learning_package_id' => null]);
            PackageRenewal::query()
                ->where('new_package_id', $package->id)
                ->whereIn('status', ['requested', 'tutor_accepted'])
                ->update(['status' => 'cancelled']);
        }, 3);
    }
}
