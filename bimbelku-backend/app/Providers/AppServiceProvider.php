<?php

namespace App\Providers;

use App\Models\Booking;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Refund;
use App\Observers\BookingObserver;
use App\Observers\OrderObserver;
use App\Observers\PayoutObserver;
use App\Observers\RefundObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $actorKey = static fn (Request $request): string => (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());

        RateLimiter::for('student-package-quote', function (Request $request) use ($actorKey) {
            return Limit::perMinute(20)
                ->by('student-package-quote:'.$actorKey($request))
                ->response(function (Request $request, array $headers) {
                    $retryAfter = max(1, (int) ($headers['Retry-After'] ?? 60));

                    return response()->json([
                        'message' => "Harga paket terlalu sering dihitung. Tunggu {$retryAfter} detik lalu coba lagi.",
                        'error_code' => 'package_quote_rate_limited',
                        'retry_after_seconds' => $retryAfter,
                    ], 429, $headers);
                });
        });

        RateLimiter::for('student-package-create', function (Request $request) use ($actorKey) {
            return Limit::perMinute(5)
                ->by('student-package-create:'.$actorKey($request))
                ->response(function (Request $request, array $headers) {
                    $retryAfter = max(1, (int) ($headers['Retry-After'] ?? 60));

                    return response()->json([
                        'message' => "Pembuatan paket dilakukan terlalu sering. Tunggu {$retryAfter} detik lalu coba lagi.",
                        'error_code' => 'package_create_rate_limited',
                        'retry_after_seconds' => $retryAfter,
                    ], 429, $headers);
                });
        });

        RateLimiter::for('student-payment-submit', function (Request $request) use ($actorKey) {
            $orderId = (string) ($request->route('id') ?? 'unknown');

            return Limit::perMinute(5)
                ->by('student-payment-submit:'.$actorKey($request).':'.$orderId)
                ->response(function (Request $request, array $headers) {
                    $retryAfter = max(1, (int) ($headers['Retry-After'] ?? 60));

                    return response()->json([
                        'message' => "Bukti pembayaran dikirim terlalu sering. Tunggu {$retryAfter} detik lalu coba lagi. Tagihanmu tetap aktif.",
                        'error_code' => 'payment_rate_limited',
                        'retry_after_seconds' => $retryAfter,
                    ], 429, $headers);
                });
        });

        Order::observe(OrderObserver::class);
        Booking::observe(BookingObserver::class);
        Refund::observe(RefundObserver::class);
        Payout::observe(PayoutObserver::class);
    }
}
