<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingParticipant;
use App\Models\BookingRequest;
use App\Models\GroupMember;
use App\Models\GroupPool;
use App\Models\Notification;
use App\Models\Refund;
use App\Models\Setting;
use App\Models\TeacherOffer;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class GroupClassService
{
    public function joinOrCreate(BookingRequest $request): GroupPool
    {
        return DB::transaction(function () use ($request) {
            // Baris pengaturan ini menjadi mutex ringan agar dua murid yang
            // masuk bersamaan tidak membentuk dua pool identik.
            $groupSettingsLock = Setting::query()
                ->where('key', 'group_min_participants')
                ->lockForUpdate()
                ->first();
            $minimum = (int) ($groupSettingsLock?->value ?? 2);
            $maximum = (int) (Setting::where('key', 'group_max_participants')->value('value') ?? 5);
            $waitHours = (int) (Setting::where('key', 'group_wait_hours')->value('value') ?? 24);

            $candidatePools = GroupPool::query()
                ->whereIn('status', ['forming', 'matching'])
                ->where('subject_name', $request->subject_name)
                ->where('education_level', $request->education_level)
                ->where('grade', $request->grade)
                ->where('chapter', $request->chapter)
                ->where('subtopic', $request->subtopic)
                ->where('learning_mode', $request->learning_mode)
                ->where('scheduled_date', $request->scheduled_date->format('Y-m-d'))
                ->where('start_time', $request->start_time)
                ->where('end_time', $request->end_time)
                ->where('join_deadline', '>', now())
                ->withCount(['members as active_members_count' => fn ($query) => $query->whereIn('status', ['waiting', 'joined'])])
                ->lockForUpdate()
                ->get();

            $pool = $candidatePools->first(function (GroupPool $candidate) use ($request) {
                if ((int) $candidate->active_members_count >= (int) $candidate->maximum_participants) {
                    return false;
                }

                if ($request->learning_mode !== 'offline') {
                    return true;
                }

                if (
                    $request->latitude === null
                    || $request->longitude === null
                    || $candidate->latitude === null
                    || $candidate->longitude === null
                ) {
                    return false;
                }

                return $this->distanceKm(
                    (float) $request->latitude,
                    (float) $request->longitude,
                    (float) $candidate->latitude,
                    (float) $candidate->longitude
                ) <= 3;
            });

            if (!$pool) {
                $joinDeadline = now()->addHours($waitHours);
                $classCutoff = $request->scheduled_date
                    ->copy()
                    ->setTimeFromTimeString($request->start_time);

                if ($joinDeadline->greaterThan($classCutoff)) {
                    $joinDeadline = $classCutoff;
                }

                $pool = GroupPool::create([
                    'created_by' => $request->student_id,
                    'subject_name' => $request->subject_name,
                    'education_level' => $request->education_level,
                    'grade' => $request->grade,
                    'chapter' => $request->chapter,
                    'subtopic' => $request->subtopic,
                    'topic' => $request->topic,
                    'learning_mode' => $request->learning_mode,
                    'scheduled_date' => $request->scheduled_date,
                    'start_time' => $request->start_time,
                    'end_time' => $request->end_time,
                    'duration_hours' => $request->duration_hours,
                    'address' => $request->address,
                    'maps_link' => $request->maps_link,
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                    'minimum_participants' => $minimum,
                    'maximum_participants' => $maximum,
                    'status' => 'forming',
                    'join_deadline' => $joinDeadline,
                ]);
            }

            GroupMember::updateOrCreate(
                ['booking_request_id' => $request->id],
                [
                    'group_pool_id' => $pool->id,
                    'student_id' => $request->student_id,
                    'status' => $pool->status === 'forming' ? 'waiting' : 'joined',
                ]
            );

            $request->update([
                'group_pool_id' => $pool->id,
                'status' => $pool->status === 'forming' ? 'group_forming' : 'matching',
            ]);

            $activeMemberCount = $pool->members()->whereIn('status', ['waiting', 'joined'])->count();
            if ($activeMemberCount >= $pool->minimum_participants) {
                $pool->update(['status' => 'matching']);
                $pool->members()->where('status', 'waiting')->update(['status' => 'joined']);
                BookingRequest::query()
                    ->whereIn('id', $pool->members()->pluck('booking_request_id'))
                    ->update(['status' => 'matching']);
            }

            return $pool->fresh('members');
        });
    }

    public function markExpiredPools(): int
    {
        $count = 0;

        GroupPool::query()
            ->where('status', 'forming')
            ->where('join_deadline', '<=', now())
            ->with('members')
            ->chunkById(100, function ($pools) use (&$count) {
                foreach ($pools as $pool) {
                    DB::transaction(function () use ($pool, &$count) {
                        $locked = GroupPool::query()->lockForUpdate()->find($pool->id);
                        if (!$locked || $locked->status !== 'forming') {
                            return;
                        }

                        $privateSearchCutoff = $locked->scheduled_date
                            ->copy()
                            ->setTimeFromTimeString($locked->start_time);
                        $locked->update([
                            'status' => 'decision_required',
                            'decision_deadline' => now()->addHours(12)->min($privateSearchCutoff),
                        ]);

                        $activeRequestIds = $locked->members()
                            ->whereIn('status', ['waiting', 'joined'])
                            ->pluck('booking_request_id');
                        BookingRequest::query()
                            ->whereIn('id', $activeRequestIds)
                            ->update(['status' => 'group_decision_required']);

                        $count++;
                    });
                }
            });

        GroupPool::query()
            ->where('status', 'decision_required')
            ->where('decision_deadline', '<=', now())
            ->with('members.bookingRequest')
            ->chunkById(100, function ($pools) use (&$count) {
                foreach ($pools as $pool) {
                    DB::transaction(function () use ($pool, &$count) {
                        $locked = GroupPool::query()->lockForUpdate()->find($pool->id);
                        if (!$locked || $locked->status !== 'decision_required') {
                            return;
                        }

                        $members = $locked->members()
                            ->whereIn('status', ['waiting', 'joined'])
                            ->with('bookingRequest')
                            ->lockForUpdate()
                            ->get();
                        foreach ($members as $member) {
                            $member->update(['status' => 'cancelled']);
                            $attachment = $member->bookingRequest?->attachment;
                            $member->bookingRequest?->update([
                                'status' => 'cancelled',
                                'attachment' => null,
                            ]);
                            if ($attachment) {
                                Storage::disk('local')->delete($attachment);
                                Storage::disk('public')->delete($attachment);
                            }
                            Notification::create([
                                'user_id' => $member->student_id,
                                'title' => 'Keputusan kelompok berakhir',
                                'message' => 'Permintaan dibatalkan tanpa tagihan karena pilihan privat atau batal tidak diberikan sampai tenggat.',
                                'type' => 'warning',
                            ]);
                        }

                        $locked->update(['status' => 'cancelled']);
                        $count++;
                    });
                }
            });

        return $count;
    }

    public function leave(BookingRequest $request): void
    {
        DB::transaction(function () use ($request) {
            $member = $request->groupMember()->lockForUpdate()->first();
            if (!$member) {
                return;
            }

            $pool = GroupPool::query()->lockForUpdate()->find($member->group_pool_id);
            $member->update(['status' => 'cancelled']);

            if (!$pool) {
                return;
            }

            $remaining = $pool->members()
                ->whereIn('status', ['waiting', 'joined'])
                ->with('bookingRequest')
                ->get();
            if ($remaining->isEmpty()) {
                $pool->update(['status' => 'cancelled']);
                return;
            }

            $leavingHost = (int) $pool->created_by === (int) $request->student_id;
            $selectedBooking = $pool->booking()->lockForUpdate()->first();
            if ($pool->learning_mode === 'offline' && $leavingHost && $selectedBooking) {
                $activeParticipants = $selectedBooking->participants()
                    ->whereNotIn('status', [
                        'cancelled',
                        'teacher_rejected',
                        'expired',
                        'payment_expired',
                        'refund_pending',
                        'refunded',
                    ])
                    ->with(['order', 'bookingRequest'])
                    ->lockForUpdate()
                    ->get();
                $this->closeSelectedGroup(
                    $selectedBooking,
                    $activeParticipants,
                    'Lokasi host kelas kelompok offline tidak lagi tersedia'
                );
                return;
            }

            if ($leavingHost) {
                $nextHost = $remaining->first();
                $nextRequest = $nextHost->bookingRequest;
                $pool->update([
                    'created_by' => $nextHost->student_id,
                    'address' => $nextRequest?->address,
                    'maps_link' => $nextRequest?->maps_link,
                    'latitude' => $nextRequest?->latitude,
                    'longitude' => $nextRequest?->longitude,
                ]);
            }

            if ($pool->status === 'matching') {
                $requestIds = $pool->members()->pluck('booking_request_id');
                TeacherOffer::query()
                    ->whereIn('booking_request_id', $requestIds)
                    ->where('status', 'pending')
                    ->update(['status' => 'cancelled', 'responded_at' => now()]);

                if ($remaining->count() < $pool->minimum_participants) {
                    $pool->update(['status' => 'forming']);
                    $remaining->each->update(['status' => 'waiting']);
                    BookingRequest::query()
                        ->whereIn('id', $remaining->pluck('booking_request_id'))
                        ->update([
                            'status' => 'group_forming',
                            'matched_teacher_id' => null,
                            'teacher_response_deadline' => null,
                        ]);
                } else {
                    BookingRequest::query()
                        ->whereIn('id', $remaining->pluck('booking_request_id'))
                        ->update([
                            'status' => 'matching',
                            'matched_teacher_id' => null,
                            'teacher_response_deadline' => null,
                        ]);
                }
            }
        });
    }

    /**
     * Menjaga kelayakan kelompok setelah satu peserta menolak, membatalkan,
     * atau melewati tenggat keputusan profil. Pembayaran baru dibuka setelah
     * semua peserta aktif menyetujui tutor.
     *
     * @return array{state: string, payment_due_at: ?Carbon}
     */
    public function settleAfterProfileDecision(Booking $booking, string $reason = 'Jumlah peserta kelompok berkurang'): array
    {
        $booking->refresh();
        if ($booking->class_type !== 'group') {
            return ['state' => 'not_group', 'payment_due_at' => null];
        }
        if (in_array($booking->status, [
            'cancelled',
            'refund_pending',
            'refunded',
            'payment_expired',
        ], true)) {
            return ['state' => 'closed', 'payment_due_at' => null];
        }

        $minimum = (int) ($booking->groupPool?->minimum_participants ?? 2);
        $participants = $booking->participants()
            ->whereNotIn('status', [
                'cancelled',
                'teacher_rejected',
                'expired',
                'payment_expired',
                'refund_pending',
                'refunded',
            ])
            ->with(['order', 'bookingRequest'])
            ->get();

        if ($participants->count() < $minimum) {
            $this->closeSelectedGroup($booking, $participants, $reason);
            return ['state' => 'closed', 'payment_due_at' => null];
        }

        if ($booking->status !== 'teacher_selected') {
            return ['state' => 'unchanged', 'payment_due_at' => $booking->payment_due_at];
        }

        if ($participants->contains(fn (BookingParticipant $participant) => $participant->status === 'teacher_decision')) {
            return ['state' => 'waiting_decisions', 'payment_due_at' => null];
        }

        $paymentWindow = max(
            15,
            (int) (Setting::where('key', 'payment_window_minutes')->value('value') ?? 60)
        );
        $paymentDueAt = now()->addMinutes($paymentWindow)
            ->min($booking->start_at->copy()->subMinutes(30));

        foreach ($participants as $participant) {
            $participant->update(['status' => 'awaiting_payment']);
            $participant->order?->update(['status' => 'pending']);
            $participant->bookingRequest?->update([
                'status' => 'awaiting_payment',
                'payment_due_at' => $paymentDueAt,
            ]);

            Notification::create([
                'user_id' => $participant->student_id,
                'title' => 'Pembayaran kelompok dibuka',
                'message' => 'Semua anggota aktif telah menyetujui tutor. Selesaikan transfer sebelum batas waktu.',
                'type' => 'info',
            ]);
        }

        $booking->update([
            'status' => 'awaiting_payment',
            'payment_due_at' => $paymentDueAt,
        ]);
        $booking->groupPool?->update(['status' => 'awaiting_payment']);

        return ['state' => 'payment_open', 'payment_due_at' => $paymentDueAt];
    }

    private function closeSelectedGroup(Booking $booking, $participants, string $reason): void
    {
        $hasRefund = false;
        $requestIds = $booking->participants()
            ->whereNotNull('booking_request_id')
            ->pluck('booking_request_id');

        TeacherOffer::query()
            ->whereIn('booking_request_id', $requestIds)
            ->whereIn('status', ['pending', 'accepted'])
            ->update([
                'status' => 'cancelled',
                'responded_at' => now(),
            ]);

        foreach ($participants as $participant) {
            $order = $participant->order;
            if ($order?->status === 'paid') {
                Refund::firstOrCreate(
                    ['order_id' => $order->id],
                    [
                        'user_id' => $participant->student_id,
                        'booking_id' => $booking->id,
                        'amount' => $order->amount,
                        'reason' => $reason,
                        'status' => 'pending',
                    ]
                );
                $order->update(['status' => 'refund_pending']);
                $participant->update(['status' => 'refund_pending']);
                $participant->bookingRequest?->update(['status' => 'refund_pending']);
                $hasRefund = true;

                Notification::create([
                    'user_id' => $participant->student_id,
                    'title' => 'Kelompok dibatalkan',
                    'message' => 'Jumlah peserta turun di bawah minimum. Refund penuh masuk antrean transfer admin.',
                    'type' => 'warning',
                ]);
                continue;
            }

            $order?->update(['status' => 'cancelled']);
            $participant->update(['status' => 'cancelled']);
            $participant->bookingRequest?->update(['status' => 'cancelled']);

            Notification::create([
                'user_id' => $participant->student_id,
                'title' => 'Kelompok dibatalkan',
                'message' => 'Jumlah peserta turun di bawah minimum sehingga tagihan dibatalkan.',
                'type' => 'warning',
            ]);
        }

        $booking->update([
            'status' => $hasRefund ? 'refund_pending' : 'cancelled',
            'gross_amount' => 0,
            'teacher_net_amount' => 0,
            'payout_status' => 'cancelled',
        ]);
        $booking->groupPool?->update(['status' => 'cancelled']);

        if ($booking->teacher_id) {
            Notification::create([
                'user_id' => $booking->teacher_id,
                'title' => 'Kelas kelompok dibatalkan',
                'message' => $reason.'. Slot jadwal kembali tersedia setelah status diperbarui.',
                'type' => 'warning',
            ]);
        }
    }

    private function distanceKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371;
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);
        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lonDelta / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
