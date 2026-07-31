<?php

namespace App\Services;

use App\Models\FinanceAuthorization;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;

class FinanceAuthorizationService
{
    public function fingerprint(Request $request): string
    {
        $token = (string) ($request->bearerToken() ?? '');

        return hash('sha256', $token !== '' ? $token : 'no-bearer-token');
    }

    public function grant(User $user, Request $request): FinanceAuthorization
    {
        $minutes = min(
            30,
            max(3, (int) (Setting::where('key', 'finance_2fa_window_minutes')->value('value') ?? 10))
        );

        return FinanceAuthorization::updateOrCreate(
            [
                'user_id' => $user->id,
                'token_fingerprint' => $this->fingerprint($request),
            ],
            [
                'verified_at' => now(),
                'expires_at' => now()->addMinutes($minutes),
            ]
        );
    }

    public function active(User $user, Request $request): ?FinanceAuthorization
    {
        return FinanceAuthorization::query()
            ->where('user_id', $user->id)
            ->where('token_fingerprint', $this->fingerprint($request))
            ->where('expires_at', '>', now())
            ->first();
    }
}
