<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\TeacherPointLedger;
use App\Models\TeacherProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TeacherPointService
{
    public function __construct(
        private readonly ?TeacherOfferReleaseService $offerReleaseService = null
    ) {
    }

    public function change(
        int $teacherId,
        int $change,
        string $reason,
        ?Booking $booking = null,
        ?User $actor = null,
        ?string $notes = null
    ): int {
        $result = DB::transaction(function () use ($teacherId, $change, $reason, $booking, $actor, $notes) {
            $teacher = User::query()
                ->lockForUpdate()
                ->findOrFail($teacherId);
            $profile = TeacherProfile::query()
                ->where('user_id', $teacherId)
                ->lockForUpdate()
                ->firstOrFail();

            $nextBalance = max(0, min(200, (int) $profile->points + $change));
            $actualChange = $nextBalance - (int) $profile->points;

            if ($actualChange === 0) {
                return ['balance' => $nextBalance, 'disabled' => false];
            }

            $profile->update(['points' => $nextBalance]);

            TeacherPointLedger::create([
                'teacher_id' => $teacherId,
                'booking_id' => $booking?->id,
                'actor_id' => $actor?->id,
                'change' => $actualChange,
                'balance_after' => $nextBalance,
                'reason' => $reason,
                'notes' => $notes,
            ]);

            if ($nextBalance === 0) {
                $teacher->update(['status' => 'banned']);
                $teacher->tokens()->delete();
                $profile->update(['is_accepting_requests' => false]);
            }

            return ['balance' => $nextBalance, 'disabled' => $nextBalance === 0];
        });

        if ($result['disabled']) {
            ($this->offerReleaseService ?? app(TeacherOfferReleaseService::class))
                ->releaseForTeacher($teacherId, 'Akun tutor dinonaktifkan karena poin mencapai nol');
        }

        return $result['balance'];
    }

    public function recommendationBand(int $points): string
    {
        return match (true) {
            $points >= 151 => 'priority',
            $points >= 121 => 'normal',
            $points >= 81 => 'reduced',
            $points >= 41 => 'restricted',
            $points >= 1 => 'lowest',
            default => 'disabled',
        };
    }

    public function recommendationWeight(int $points): int
    {
        return match ($this->recommendationBand($points)) {
            'priority' => 5,
            'normal' => 10,
            'reduced' => 25,
            'restricted' => 50,
            'lowest' => 100,
            default => 1000,
        };
    }
}
