<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('bookings:expire')
    ->everyMinute()
    ->withoutOverlapping(5);

Schedule::command('finance:verify-ledger')
    ->dailyAt('02:00')
    ->withoutOverlapping(30);
