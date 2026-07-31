<?php

namespace App\Http\Middleware;

use App\Services\FinanceAuthorizationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireFinanceAuthorization
{
    public function __construct(
        private readonly FinanceAuthorizationService $authorizations
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Akses keuangan hanya tersedia untuk admin.'], 403);
        }
        if (!$user->finance_totp_secret || !$user->finance_totp_confirmed_at) {
            return response()->json([
                'message' => 'Aktifkan verifikasi dua langkah keuangan sebelum melanjutkan.',
                'code' => 'FINANCE_2FA_SETUP_REQUIRED',
            ], 423);
        }
        if (!$this->authorizations->active($user, $request)) {
            return response()->json([
                'message' => 'Masukkan kode autentikator untuk membuka tindakan keuangan selama beberapa menit.',
                'code' => 'FINANCE_2FA_REQUIRED',
            ], 423);
        }

        return $next($request);
    }
}
