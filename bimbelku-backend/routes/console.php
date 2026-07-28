<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('bookings:expire')
    ->everyMinute()
    ->withoutOverlapping(5);
