<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
        if (!Hash::check($validated['current_password'], (string) $user->password)) {
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
}