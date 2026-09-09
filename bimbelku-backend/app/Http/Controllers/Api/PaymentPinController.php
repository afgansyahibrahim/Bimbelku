<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OneTimeCodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PaymentPinController extends Controller
{
    public function status(Request $request)
    {
        return response()->json([
            'configured' => filled($request->user()->payment_pin_hash),
        ]);
    }

    public function set(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'pin' => ['required', 'digits:6', 'confirmed'],
        ], [
            'pin.digits' => 'PIN pembayaran harus terdiri dari 6 angka.',
            'pin.confirmed' => 'Ulangi PIN pembayaran belum sama.',
        ]);

        $user = $request->user();
        if (! Hash::check($validated['current_password'], (string) $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'Kata sandi akun tidak sesuai.',
            ]);
        }

        $user->forceFill([
            'payment_pin_hash' => Hash::make($validated['pin']),
        ])->save();

        return response()->json([
            'message' => 'PIN pembayaran berhasil disimpan.',
            'configured' => true,
        ]);
    }

    public function requestReset(Request $request, OneTimeCodeService $codes)
    {
        $user = $request->user();
        if (! filled($user->payment_pin_hash)) {
            return response()->json(['message' => 'PIN pembayaran belum dibuat.'], 422);
        }
        try {
            $codes->send($user, OneTimeCodeService::PAYMENT_PIN_RESET);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Kode reset PIN belum dapat dikirim. Silakan coba lagi sekarang.',
                'error_code' => 'email_delivery_failed',
                'resend_after_seconds' => 0,
            ], 503);
        }

        return response()->json([
            'message' => 'Kode OTP reset PIN telah dikirim ke email akun Anda.',
            'resend_after_seconds' => OneTimeCodeService::RESEND_SECONDS,
        ]);
    }

    public function reset(Request $request, OneTimeCodeService $codes)
    {
        $data = $request->validate([
            'code' => ['required', 'digits:6'],
            'pin' => ['required', 'digits:6', 'confirmed'],
        ]);
        $user = $request->user();
        $codes->verify($user, OneTimeCodeService::PAYMENT_PIN_RESET, $data['code']);
        $user->forceFill(['payment_pin_hash' => Hash::make($data['pin'])])->save();

        return response()->json([
            'message' => 'PIN pembayaran berhasil diatur ulang.',
            'configured' => true,
        ]);
    }
}
