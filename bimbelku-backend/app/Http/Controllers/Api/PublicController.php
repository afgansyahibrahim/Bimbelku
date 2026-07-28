<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;

class PublicController extends Controller
{
    public function getFooterSettings()
    {
        $settings = Setting::query()
            ->whereIn('key', [
                'footer_address',
                'footer_phone',
                'footer_email',
                'footer_ig',
                'footer_tiktok',
            ])
            ->pluck('value', 'key');

        return response()->json($settings);
    }
}
