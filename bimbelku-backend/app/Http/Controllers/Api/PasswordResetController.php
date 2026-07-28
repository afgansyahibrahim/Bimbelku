<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\User;
use Carbon\Carbon;

class PasswordResetController extends Controller
{
    // 1. KIRIM LINK RESET (Forgot Password)
    public function sendResetLink(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $email = mb_strtolower(trim((string) $request->email));
        $genericMessage = 'Jika email terdaftar, link reset akan dikirim.';

        $user = User::where('email', $email)->first();

        // Keamanan: Jangan kasih tau kalau email gak ketemu
        if (!$user) {
            return response()->json(['message' => $genericMessage], 200);
        }

        // Buat Token
        $token = Str::random(60);

        // Simpan ke DB (Update jika sudah ada, Insert jika belum)
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            [
                'token' => Hash::make($token),
                'created_at' => Carbon::now()
            ]
        );

        $url = rtrim((string) config('app.frontend_url', 'http://localhost:8080'), '/')
            .'/reset-password?'.http_build_query(['token' => $token, 'email' => $email]);

        // Kirim Email
        try {
            Mail::send('emails.reset_password', ['url' => $url], function ($message) use ($email) {
                $message->to($email);
                $message->subject('Reset Password BimbelKu');
            });
        } catch (\Throwable $exception) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            report($exception);
        }

        return response()->json(['message' => $genericMessage]);
    }

    // 2. PROSES UBAH PASSWORD (Reset Password)
    public function reset(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed', // butuh field password_confirmation di frontend
        ]);

        $email = mb_strtolower(trim((string) $request->email));
        $record = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        if (!$record || !Hash::check((string) $request->token, (string) $record->token)) {
            return response()->json(['message' => 'Token tidak valid atau email salah.'], 400);
        }

        // Cek Expired (60 menit)
        if (Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return response()->json(['message' => 'Token sudah kadaluarsa.'], 400);
        }

        // Update Password User
        $user = User::where('email', $email)->first();
        if ($user) {
            $user->password = Hash::make($request->password);
            $user->password_updated_at = now();
            $user->save();
            $user->tokens()->delete();
        }

        // Hapus Token setelah dipakai
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return response()->json(['message' => 'Password berhasil diubah. Silakan login.']);
    }
}
