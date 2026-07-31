<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\PayoutApproval;
use App\Models\Setting;
use App\Models\TeacherProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceApprovalController extends Controller
{
    public function index(Request $request)
    {
        $this->expireOldApprovals();

        return response()->json([
            'current_admin_id' => $request->user()->id,
            'threshold' => $this->threshold(),
            'data' => PayoutApproval::query()
                ->whereIn('status', ['pending', 'approved'])
                ->whereNull('consumed_at')
                ->with([
                    'teacher:id,name',
                    'requester:id,name',
                    'approver:id,name',
                ])
                ->latest()
                ->limit(100)
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'teacher_id' => ['required', 'integer', 'exists:users,id'],
            'booking_ids' => ['required', 'array', 'min:1', 'max:200'],
            'booking_ids.*' => ['integer', 'distinct', 'exists:bookings,id'],
        ]);

        $teacher = User::query()
            ->where('role', 'teacher')
            ->with('teacherProfile')
            ->findOrFail($validated['teacher_id']);
        if ($teacher->teacherProfile?->payout_hold_until?->isFuture()) {
            return response()->json([
                'message' => 'Pencairan ditahan sampai '.$teacher->teacherProfile->payout_hold_until
                    ->translatedFormat('d M Y, H:i').' WIB setelah perubahan rekening.',
            ], 422);
        }

        $approval = DB::transaction(function () use ($request, $validated) {
            $profile = TeacherProfile::query()
                ->where('user_id', $validated['teacher_id'])
                ->lockForUpdate()
                ->first();
            if (
                !$profile
                || blank($profile->bank_name)
                || blank($profile->account_number)
                || blank($profile->account_name)
            ) {
                abort(422, 'Rekening tutor belum lengkap.');
            }
            if ($profile->payout_hold_until?->isFuture()) {
                abort(422, 'Pencairan masih ditahan setelah perubahan rekening.');
            }

            $bookings = Booking::query()
                ->where('teacher_id', $validated['teacher_id'])
                ->whereIn('id', $validated['booking_ids'])
                ->where('status', 'completed')
                ->where('payout_status', 'ready')
                ->lockForUpdate()
                ->get();
            if ($bookings->count() !== count(array_unique($validated['booking_ids']))) {
                abort(422, 'Sebagian sesi sudah dicairkan atau belum siap dicairkan.');
            }

            $bookingIds = $bookings->pluck('id')->sort()->values()->all();
            $amount = (float) $bookings->sum('teacher_net_amount');
            if ($amount < $this->threshold()) {
                abort(422, 'Nominal ini tidak memerlukan persetujuan admin kedua.');
            }

            $fingerprint = $this->fingerprint(
                (int) $validated['teacher_id'],
                $bookingIds,
                $amount,
                (int) $profile->bank_details_version,
                $profile->bank_account_fingerprint
            );
            PayoutApproval::query()
                ->where('fingerprint', $fingerprint)
                ->where('status', 'pending')
                ->where('expires_at', '<=', now())
                ->update(['status' => 'expired']);

            $existing = PayoutApproval::query()
                ->where('fingerprint', $fingerprint)
                ->whereIn('status', ['pending', 'approved'])
                ->whereNull('consumed_at')
                ->where('expires_at', '>', now())
                ->first();
            if ($existing) {
                return $existing;
            }

            return PayoutApproval::create([
                'teacher_id' => $validated['teacher_id'],
                'booking_ids' => $bookingIds,
                'amount' => $amount,
                'fingerprint' => $fingerprint,
                'status' => 'pending',
                'requested_by' => $request->user()->id,
                'expires_at' => now()->addDay(),
            ]);
        }, 3);

        User::query()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->whereKeyNot($request->user()->id)
            ->pluck('id')
            ->each(fn ($adminId) => Notification::create([
                'user_id' => $adminId,
                'title' => 'Persetujuan pencairan diperlukan',
                'message' => 'Pencairan bernilai besar menunggu pemeriksaan admin kedua.',
                'type' => 'warning',
            ]));

        return response()->json([
            'message' => 'Permintaan persetujuan dikirim kepada admin lain.',
            'data' => $approval->fresh(['teacher:id,name', 'requester:id,name']),
        ], 202);
    }

    public function approve(Request $request, PayoutApproval $payoutApproval)
    {
        $approval = DB::transaction(function () use ($request, $payoutApproval) {
            $locked = PayoutApproval::query()
                ->lockForUpdate()
                ->findOrFail($payoutApproval->id);
            if ($locked->status !== 'pending' || $locked->consumed_at) {
                abort(422, 'Permintaan ini sudah diproses.');
            }
            if ($locked->expires_at->isPast()) {
                $locked->update(['status' => 'expired']);
                abort(422, 'Masa berlaku persetujuan telah berakhir.');
            }
            if ((int) $locked->requested_by === (int) $request->user()->id) {
                abort(422, 'Pembuat permintaan tidak dapat menyetujui pencairannya sendiri.');
            }

            $locked->update([
                'status' => 'approved',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);

            return $locked;
        }, 3);

        Notification::create([
            'user_id' => $approval->requested_by,
            'title' => 'Pencairan disetujui',
            'message' => 'Admin kedua telah menyetujui pencairan. Transfer dapat diselesaikan.',
            'type' => 'success',
        ]);

        return response()->json([
            'message' => 'Pencairan disetujui. Bukti transfer dapat dicatat.',
            'data' => $approval->fresh(['approver:id,name']),
        ]);
    }

    public static function fingerprint(
        int $teacherId,
        array $bookingIds,
        float $amount,
        int $bankVersion = 0,
        ?string $bankFingerprint = null
    ): string {
        sort($bookingIds);

        return hash('sha256', json_encode([
            'teacher_id' => $teacherId,
            'booking_ids' => array_values($bookingIds),
            'amount' => round($amount, 2),
            'bank_version' => $bankVersion,
            'bank_fingerprint' => $bankFingerprint,
        ], JSON_PRESERVE_ZERO_FRACTION));
    }

    private function threshold(): float
    {
        return max(
            100000,
            (float) (Setting::where('key', 'high_value_payout_threshold')->value('value') ?? 5000000)
        );
    }

    private function expireOldApprovals(): void
    {
        PayoutApproval::query()
            ->whereIn('status', ['pending', 'approved'])
            ->whereNull('consumed_at')
            ->where('expires_at', '<=', now())
            ->update(['status' => 'expired']);
    }
}
