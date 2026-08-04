<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('bookings:expire')
    ->everyMinute()
    ->withoutOverlapping(5);

Schedule::command('finance:verify-ledger')
    ->dailyAt('02:00')
    ->withoutOverlapping(30);
Schedule::command('sanctum:prune-expired --hours=24')
    ->dailyAt('03:00')
    ->withoutOverlapping(30);

