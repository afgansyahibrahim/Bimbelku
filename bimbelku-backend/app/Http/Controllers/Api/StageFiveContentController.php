<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DynamicBanner;
use App\Models\PackagePlan;
use App\Models\Promotion;
use App\Models\Tutorial;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StageFiveContentController extends Controller
{
    public function banners(Request $request)
    {
        $validated = $request->validate([
            'audience' => ['nullable', Rule::in(['all', 'student', 'teacher', 'admin'])],
        ]);
        $audience = $validated['audience'] ?? 'all';
        $now = now(config('app.timezone'));

        // Cache singkat mengurangi round-trip dashboard tanpa menahan perubahan
        // terjadwal atau pembaruan admin terlalu lama.
        $banners = DynamicBanner::query()
            ->where('is_active', true)
            ->whereIn('audience', $audience === 'all' ? ['all'] : ['all', $audience])
            ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
            ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', $now))
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        return response()
            ->json($banners)
            ->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }

    public function tutorials(Request $request)
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(['student', 'teacher', 'admin'])],
            'context' => ['nullable', 'string', 'max:100'],
        ]);

        return response()->json(
            Tutorial::query()
                ->where('role', $validated['role'])
                ->where('is_active', true)
                ->when(
                    filled($validated['context'] ?? null),
                    fn ($query) => $query->whereIn('context', [$validated['context'], 'all'])
                )
                ->with('steps')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
        );
    }

    public function promotions()
    {
        $now = now(config('app.timezone'));

        return response()->json(
            Promotion::query()
                ->where('is_active', true)
                ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
                ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', $now))
                ->withCount(['claims as used_quota' => fn ($query) => $query->whereIn('status', ['available', 'reserved', 'used'])])
                ->latest()
                ->get()
        )->header('Cache-Control', 'no-store, max-age=0, must-revalidate');
    }

    public function promotion(Promotion $promotion)
    {
        abort_unless($promotion->isAvailable(), 404);
        $promotion->loadCount(['claims as used_quota' => fn ($query) => $query->whereIn('status', ['available', 'reserved', 'used'])]);
        $promotion->setAttribute(
            'target_plans',
            PackagePlan::query()
                ->whereIn('id', $promotion->target_plan_ids ?? [])
                ->orderBy('sort_order')
                ->pluck('name')
                ->values()
        );

        return response()
            ->json($promotion)
            ->header('Cache-Control', 'no-store, max-age=0, must-revalidate');
    }
}
