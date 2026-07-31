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
        Order::observe(OrderObserver::class);
        Booking::observe(BookingObserver::class);
        Refund::observe(RefundObserver::class);
        Payout::observe(PayoutObserver::class);
    }
}
