<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OneTimeCodeService;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    public function resend(Request $request, OneTimeCodeService $codes)
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $email = mb_strtolower(trim((string) $data['email']));
        $user = User::query()->where('email', $email)->first();
        if ($user && $user->email_verification_required_at && ! $user->email_verified_at) {
            try {
                $codes->send($user, OneTimeCodeService::EMAIL_VERIFICATION);
            } catch (\Throwable $exception) {
                report($exception);

                return response()->json([
                    'message' => 'Kode verifikasi belum dapat dikirim. Silakan coba lagi sekarang.',
                    'error_code' => 'email_delivery_failed',
                    'resend_after_seconds' => 0,
                ], 503);
            }
        }

        return response()->json([
            'message' => 'Jika email terdaftar dan belum diverifikasi, kode OTP telah dikirim.',
            'resend_after_seconds' => OneTimeCodeService::RESEND_SECONDS,
        ]);
    }

    public function verify(Request $request, OneTimeCodeService $codes)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'digits:6'],
        ]);
        $email = mb_strtolower(trim((string) $data['email']));
        $user = User::query()->where('email', $email)->first();
        if (! $user || ! $user->email_verification_required_at) {
            return response()->json(['message' => 'Permintaan verifikasi tidak valid.'], 422);
        }
        if (! $user->email_verified_at) {
            $codes->verify($user, OneTimeCodeService::EMAIL_VERIFICATION, $data['code']);
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        return response()->json([
            'message' => $user->role === 'teacher'
                ? 'Email berhasil diverifikasi. Selanjutnya tunggu persetujuan admin untuk akun tutor.'
                : 'Email berhasil diverifikasi. Silakan masuk ke akun Anda.',
            'role' => $user->role,
        ]);
    }
}
