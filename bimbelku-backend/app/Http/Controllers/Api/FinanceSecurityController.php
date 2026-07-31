<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinanceAuthorization;
use App\Models\FinancialAuditLog;
use App\Models\FinancialJournal;
use App\Services\FinanceAuthorizationService;
use App\Services\FinanceTotpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class FinanceSecurityController extends Controller
{
    public function auditIndex()
    {
        return response()->json([
            'audit' => FinancialAuditLog::query()
                ->latest('id')
                ->limit(200)
                ->get()
                ->map(fn (FinancialAuditLog $log) => [
                    'id' => $log->id,
                    'actor_id' => $log->actor_id,
                    'action' => $log->action,
                    'route_name' => $log->route_name,
                    'method' => $log->method,
                    'response_status' => $log->response_status,
                    'target_type' => $log->target_type,
                    'target_id' => $log->target_id,
                    'created_at' => $log->created_at,
                    'entry_hash' => $log->entry_hash,
                ]),
            'journals' => FinancialJournal::query()
                ->with('entries')
                ->latest('id')
                ->limit(200)
                ->get(),
        ]);
    }

    public function status(
        Request $request,
        FinanceAuthorizationService $authorizations
    ) {
        $authorization = $authorizations->active($request->user(), $request);

        return response()->json([
            'enabled' => (bool) (
                $request->user()->finance_totp_secret
                && $request->user()->finance_totp_confirmed_at
            ),
            'confirmed_at' => $request->user()->finance_totp_confirmed_at,
            'authorized_until' => $authorization?->expires_at,
        ]);
    }

    public function setup(Request $request, FinanceTotpService $totp)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string', 'max:200'],
            'current_code' => ['nullable', 'string', 'size:6'],
        ]);
        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'Kata sandi akun tidak sesuai.'], 422);
        }
        if (
            $user->finance_totp_confirmed_at
            && !$totp->verify(
                (string) $user->finance_totp_secret,
                (string) ($validated['current_code'] ?? '')
            )
        ) {
            return response()->json([
                'message' => 'Kode autentikator lama diperlukan untuk mengganti pengaturan.',
            ], 422);
        }

        $secret = $totp->generateSecret();
        DB::transaction(function () use ($user, $secret) {
            $lockedUser = $user->newQuery()->lockForUpdate()->findOrFail($user->id);
            $lockedUser->forceFill([
                'finance_totp_secret' => $secret,
                'finance_totp_confirmed_at' => null,
            ])->save();
            FinanceAuthorization::query()->where('user_id', $user->id)->delete();
        }, 3);

        return response()->json([
            'message' => 'Kunci autentikator dibuat. Masukkan ke aplikasi autentikator lalu konfirmasi kode.',
            'secret' => $secret,
            'provisioning_uri' => $totp->provisioningUri($secret, $user->email),
        ]);
    }

    public function confirm(
        Request $request,
        FinanceTotpService $totp,
        FinanceAuthorizationService $authorizations
    ) {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);
        $user = $request->user();
        if (
            !$user->finance_totp_secret
            || !$totp->verify((string) $user->finance_totp_secret, $validated['code'])
        ) {
            return response()->json(['message' => 'Kode autentikator tidak valid.'], 422);
        }

        $user->forceFill(['finance_totp_confirmed_at' => now()])->save();
        $authorization = $authorizations->grant($user, $request);

        return response()->json([
            'message' => 'Verifikasi dua langkah keuangan telah aktif.',
            'authorized_until' => $authorization->expires_at,
        ]);
    }

    public function authorize(
        Request $request,
        FinanceTotpService $totp,
        FinanceAuthorizationService $authorizations
    ) {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);
        $user = $request->user();

        if (
            !$user->finance_totp_secret
            || !$user->finance_totp_confirmed_at
            || !$totp->verify((string) $user->finance_totp_secret, $validated['code'])
        ) {
            return response()->json(['message' => 'Kode autentikator tidak valid.'], 422);
        }

        $authorization = $authorizations->grant($user, $request);

        return response()->json([
            'message' => 'Tindakan keuangan dibuka sementara.',
            'authorized_until' => $authorization->expires_at,
        ]);
    }
}
