<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\BookingRequest;
use App\Models\Notification;
use App\Models\Order;
use App\Models\PackageRenewal;
use App\Models\Refund;
use App\Models\Setting;
use App\Models\TeacherOffer;
use App\Services\GroupClassService;
use App\Services\TeacherMatchingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpireBookingWorkflow extends Command
{
    protected $signature = 'bookings:expire';

    protected $description = 'Menjaga tenggat pencarian, pembayaran, grup, sesi, dan keberatan BimbelKu';

    public function handle(
        TeacherMatchingService $matchingService,
        GroupClassService $groupService
    ): int {
        $stats = [
            'groups' => $groupService->markExpiredPools(),
            'offers' => $this->expireOffers($matchingService),
            'matching' => $this->resumeMatching($matchingService),
            'profile_decisions' => $this->expireProfileDecisions($groupService),
            'package_payments' => $this->expirePackagePayments(),
            'payments' => $this->expirePayments($groupService),
            'started' => $this->startDueBookings(),
            'reviews' => $this->queueCompletionReviews(),
        ];

        $this->info(collect($stats)->map(fn ($value, $key) => "{$key}: {$value}")->implode('; '));

        return self::SUCCESS;
    }

    private function expireOffers(TeacherMatchingService $matchingService): int
    {
        $count = 0;
        TeacherOffer::query()
            ->where('status', 'pending')
            ->where('expires_at', '<=', now())
            ->with('bookingRequest')
            ->chunkById(100, function ($offers) use ($matchingService, &$count) {
                foreach ($offers as $offer) {
                    $matchingService->expireOfferAndContinue($offer);
                    $this->syncPackageMatchingStatus($offer->bookingRequest?->fresh());
                    $count++;
                }
            });

        return $count;
    }

    private function resumeMatching(TeacherMatchingService $matchingService): int
    {
        $count = 0;
        BookingRequest::query()
            ->where('status', 'matching')
            ->whereDoesntHave('offers', fn ($query) => $query
                ->where('status', 'pending')
                ->where('expires_at', '>', now()))
            ->orderBy('id')
                ->chunkById(100, function ($requests) use ($matchingService, &$count) {
                foreach ($requests as $bookingRequest) {
                    $offer = $matchingService->dispatchNextOffer($bookingRequest);
                    $this->syncPackageMatchingStatus($bookingRequest->fresh());
                    if ($offer?->wasRecentlyCreated) {
                        $count++;
                    }
                }
            });

        return $count;
    }

    private function expireProfileDecisions(GroupClassService $groupService): int
    {
        $count = 0;
        BookingRequest::query()
            ->where('status', 'teacher_selected')
            ->whereNotNull('teacher_decision_deadline')
            ->where('teacher_decision_deadline', '<=', now())
            ->with(['booking.participants.order', 'matchedTeacher'])
            ->chunkById(100, function ($requests) use (&$count, $groupService) {
                foreach ($requests as $request) {
                    DB::transaction(function () use ($request, &$count, $groupService) {
                        $locked = BookingRequest::query()->lockForUpdate()->find($request->id);
                        if (!$locked || $locked->status !== 'teacher_selected') {
                            return;
                        }

                        $participant = $locked->participant;
                        $participant?->order?->update(['status' => 'expired']);
                        $participant?->update(['status' => 'expired']);
                        $locked->update(['status' => 'expired']);

                        $booking = $locked->booking;
                        if ($booking && $booking->class_type === 'private') {
                            $locked->offers()
                                ->where('status', 'accepted')
                                ->update(['status' => 'expired']);
                            $booking->update(['status' => 'expired']);
                        } elseif ($booking) {
                            $groupService->leave($locked);
                            $groupService->settleAfterProfileDecision(
                                $booking,
                                'Peserta tidak memberikan keputusan profil dalam batas waktu'
                            );
                        }

                        if ($locked->matched_teacher_id) {
                            Notification::create([
                                'user_id' => $locked->matched_teacher_id,
                                'title' => 'Pencocokan berakhir',
                                'message' => 'Murid tidak memberikan keputusan profil dalam batas waktu.',
                                'type' => 'info',
                                'target_url' => '/guru/permintaan',
                            ]);
                        }
                        $count++;
                    });
                }
            });

        return $count;
    }

    private function expirePackagePayments(): int
    {
        $count = 0;
        Order::query()
            ->whereNotNull('learning_package_id')
            ->whereIn('status', ['pending', 'rejected'])
            ->whereHas('learningPackage', fn ($query) => $query
                ->whereNotNull('payment_due_at')
                ->where('payment_due_at', '<=', now()))
            ->with(['learningPackage.subjects.sessions.booking.bookingRequest', 'learningPackage.promotionClaims'])
            ->chunkById(100, function ($orders) use (&$count) {
                foreach ($orders as $order) {
                    DB::transaction(function () use ($order, &$count) {
                        $lockedOrder = Order::query()->lockForUpdate()->find($order->id);
                        if (!$lockedOrder || !in_array($lockedOrder->status, ['pending', 'rejected'], true)) {
                            return;
                        }
                        $package = $lockedOrder->learningPackage()
                            ->with(['subjects.sessions.booking.bookingRequest', 'promotionClaims'])
                            ->lockForUpdate()
                            ->first();
                        if (!$package || !$package->payment_due_at?->lte(now())) {
                            return;
                        }

                        $lockedOrder->update(['status' => 'expired']);
                        $package->update(['status' => 'payment_expired', 'payment_due_at' => null]);
                        foreach ($package->subjects as $subject) {
                            $subject->update(['status' => 'payment_expired']);
                            foreach ($subject->sessions as $session) {
                                $session->update(['status' => 'payment_expired']);
                                $booking = $session->booking;
                                $booking?->update(['status' => 'payment_expired', 'payout_status' => 'cancelled']);
                                $booking?->participants()->update(['status' => 'payment_expired']);
                                $bookingRequest = $booking?->bookingRequest;
                                $bookingRequest?->update(['status' => 'payment_expired']);
                                if ($bookingRequest) {
                                    $bookingRequest->offers()
                                        ->whereIn('status', ['pending', 'accepted'])
                                        ->update(['status' => 'cancelled', 'responded_at' => now()]);
                                }
                            }
                        }
                        $package->promotionClaims()
                            ->where('status', 'reserved')
                            ->update([
                                'status' => 'available',
                                'released_at' => now(),
                                'learning_package_id' => null,
                            ]);
                        PackageRenewal::query()
                            ->where('new_package_id', $package->id)
                            ->whereIn('status', ['requested', 'tutor_accepted'])
                            ->update(['status' => 'cancelled']);

                        Notification::create([
                            'user_id' => $lockedOrder->user_id,
                            'title' => 'Batas pembayaran paket berakhir',
                            'message' => 'Slot tutor dilepas karena pembayaran paket tidak diselesaikan dalam 48 jam.',
                            'type' => 'warning',
                            'target_url' => '/student/history',
                        ]);
                        $count++;
                    }, 3);
                }
            });

        return $count;
    }

    private function expirePayments(GroupClassService $groupService): int
    {
        $count = 0;
        Order::query()
            ->whereNull('learning_package_id')
            ->whereIn('status', ['pending', 'rejected'])
            ->whereHas('booking', fn ($query) => $query
                ->whereNotNull('payment_due_at')
                ->where('payment_due_at', '<=', now()))
            ->with(['booking.groupPool', 'participant.bookingRequest'])
            ->chunkById(100, function ($orders) use (&$count, $groupService) {
                foreach ($orders as $order) {
                    DB::transaction(function () use ($order, &$count, $groupService) {
                        $locked = Order::query()->lockForUpdate()->find($order->id);
                        if (!$locked || !in_array($locked->status, ['pending', 'rejected'], true)) {
                            return;
                        }

                        $participant = $locked->participant()->lockForUpdate()->first();
                        $bookingRequest = $participant?->bookingRequest()->lockForUpdate()->first();
                        $booking = $locked->booking()->lockForUpdate()->first();

                        $locked->update(['status' => 'expired']);
                        $participant?->update(['status' => 'payment_expired']);
                        $bookingRequest?->update(['status' => 'payment_expired']);
                        if ($booking?->class_type === 'private') {
                            $bookingRequest?->offers()
                                ->where('status', 'accepted')
                                ->update(['status' => 'cancelled']);
                            $booking->update([
                                'status' => 'payment_expired',
                                'payout_status' => 'cancelled',
                            ]);
                        } elseif ($booking && $bookingRequest) {
                            $groupService->leave($bookingRequest);
                            $groupService->settleAfterProfileDecision(
                                $booking,
                                'Peserta tidak menyelesaikan pembayaran kelas kelompok'
                            );
                        }
                        Notification::create([
                            'user_id' => $locked->user_id,
                            'title' => 'Batas pembayaran berakhir',
                            'message' => 'Tagihan dibatalkan karena bukti transfer belum diterima.',
                            'type' => 'warning',
                            'target_url' => '/student/history',
                        ]);
                        $count++;
                    });
                }
            });

        Booking::query()
            ->where('class_type', 'group')
            ->whereIn('status', ['awaiting_payment', 'payment_collecting', 'payment_submitted'])
            ->whereNotNull('payment_due_at')
            ->where('payment_due_at', '<=', now())
            ->with(['participants.order', 'groupPool'])
            ->chunkById(100, function ($bookings) {
                foreach ($bookings as $booking) {
                    DB::transaction(function () use ($booking) {
                        $locked = Booking::query()->lockForUpdate()->find($booking->id);
                        if (!$locked) {
                            return;
                        }

                        $paid = $locked->participants()
                            ->where('status', 'paid')
                            ->with('order')
                            ->lockForUpdate()
                            ->get();
                        $submittedCount = $locked->participants()
                            ->whereHas('order', fn ($query) => $query->where('status', 'submitted'))
                            ->count();
                        $minimum = (int) ($locked->groupPool?->minimum_participants ?? 2);
                        if ($paid->count() >= $minimum) {
                            $locked->update(['status' => 'confirmed']);
                            return;
                        }
                        if ($submittedCount > 0 && now()->lt($locked->start_at)) {
                            $locked->update(['status' => 'payment_submitted']);
                            return;
                        }

                        foreach ($paid as $participant) {
                            if (!$participant->order) {
                                continue;
                            }
                            Refund::firstOrCreate(
                                ['order_id' => $participant->order->id],
                                [
                                    'user_id' => $participant->student_id,
                                    'booking_id' => $locked->id,
                                    'amount' => $participant->order->amount,
                                    'reason' => 'Pembayaran anggota kelompok tidak memenuhi jumlah minimum',
                                    'status' => 'pending',
                                ]
                            );
                            $participant->order->update(['status' => 'refund_pending']);
                            $participant->update(['status' => 'refund_pending']);
                            $participant->bookingRequest?->update(['status' => 'refund_pending']);
                            Notification::create([
                                'user_id' => $participant->student_id,
                                'title' => 'Kelompok tidak terpenuhi',
                                'message' => 'Jumlah pembayaran minimum tidak terpenuhi. Refund penuh masuk antrean admin.',
                                'type' => 'warning',
                                'target_url' => '/student/history',
                            ]);
                        }

                        $locked->update([
                            'status' => $paid->isNotEmpty() ? 'refund_pending' : 'payment_expired',
                            'gross_amount' => 0,
                            'teacher_net_amount' => 0,
                            'payout_status' => 'cancelled',
                        ]);
                        $requestIds = $locked->participants()
                            ->whereNotNull('booking_request_id')
                            ->pluck('booking_request_id');
                        TeacherOffer::query()
                            ->whereIn('booking_request_id', $requestIds)
                            ->whereIn('status', ['pending', 'accepted'])
                            ->update([
                                'status' => 'cancelled',
                                'responded_at' => now(),
                            ]);
                        $locked->groupPool?->update(['status' => 'cancelled']);
                    });
                }
            });

        return $count;
    }

    private function syncPackageMatchingStatus(?BookingRequest $bookingRequest): void
    {
        if (!$bookingRequest?->package_subject_id) {
            return;
        }
        $subject = $bookingRequest->packageSubject()
            ->with('package.subjects')
            ->first();
        if (!$subject || !in_array($subject->package?->status, ['matching', 'teacher_pending', 'no_teacher'], true)) {
            return;
        }

        if (in_array($bookingRequest->status, ['matching', 'teacher_pending', 'no_teacher'], true)) {
            $subject->update(['status' => $bookingRequest->status]);
        }
        $subjects = $subject->package->subjects()->get();
        $packageStatus = $subjects->contains('status', 'no_teacher')
            ? 'no_teacher'
            : ($subjects->contains('status', 'accepted') || $subjects->contains('status', 'teacher_pending')
                ? 'teacher_pending'
                : 'matching');
        $subject->package->update(['status' => $packageStatus]);
    }

    private function startDueBookings(): int
    {
        $completionGraceMinutes = max(
            15,
            (int) (Setting::where('key', 'completion_upload_grace_minutes')->value('value') ?? 120)
        );
        $completionCutoff = now()->subMinutes($completionGraceMinutes);
        $count = Booking::query()
            ->where('status', 'confirmed')
            ->where('start_at', '<=', now())
            ->where('end_at', '>', now())
            ->update(['status' => 'in_progress']);

        Booking::query()
            ->where('status', 'in_progress')
            ->where('end_at', '<=', $completionCutoff)
            ->whereNull('completion_submitted_at')
            ->with(['participants.bookingRequest'])
            ->chunkById(100, function ($bookings) {
                foreach ($bookings as $booking) {
                    $this->markForAdminReview($booking, ['in_progress']);
                }
            });

        // Jika scheduler sempat mati sepanjang durasi sesi, booking dapat tetap
        // berstatus confirmed meski waktu selesai sudah lewat.
        Booking::query()
            ->where('status', 'confirmed')
            ->where('end_at', '<=', $completionCutoff)
            ->whereNull('completion_submitted_at')
            ->with(['participants.bookingRequest'])
            ->chunkById(100, function ($bookings) {
                foreach ($bookings as $booking) {
                    $this->markForAdminReview($booking, ['confirmed']);
                }
            });

        return $count;
    }

    private function queueCompletionReviews(): int
    {
        $count = 0;
        Booking::query()
            ->where('status', 'awaiting_student_approval')
            ->whereNotNull('objection_deadline')
            ->where('objection_deadline', '<=', now())
            ->with(['participants.bookingRequest'])
            ->chunkById(100, function ($bookings) use (&$count) {
                foreach ($bookings as $booking) {
                    if ($this->markForAdminReview($booking, ['awaiting_student_approval'])) {
                        $count++;
                    }
                }
            });

        return $count;
    }

    private function markForAdminReview(Booking $booking, array $allowedStatuses): bool
    {
        return DB::transaction(function () use ($booking, $allowedStatuses) {
            $locked = Booking::query()
                ->with(['participants.bookingRequest'])
                ->lockForUpdate()
                ->find($booking->id);

            if (!$locked || !in_array($locked->status, $allowedStatuses, true)) {
                return false;
            }

            $locked->update([
                'status' => 'admin_review_required',
                'admin_review_required_at' => now(),
            ]);

            $locked->participants
                ->whereIn('status', ['paid', 'awaiting_student_approval'])
                ->each(function ($participant) {
                    $participant->update(['status' => 'admin_review_required']);
                    $participant->bookingRequest?->update(['status' => 'admin_review_required']);
                });

            return true;
        });
    }
}
