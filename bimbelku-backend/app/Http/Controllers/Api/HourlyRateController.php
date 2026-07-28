<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HourlyRate;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Services\HourlyRateService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HourlyRateController extends Controller
{
    public function index()
    {
        return response()->json([
            'rates' => HourlyRate::query()->orderBy('subject_name')->orderBy('education_level')->get(),
            'defaults' => [
                'private_online' => (int) (Setting::where('key', 'default_private_online_rate')->value('value') ?? 40000),
                'private_offline' => (int) (Setting::where('key', 'default_private_offline_rate')->value('value') ?? 40000),
                'group_online' => (int) (Setting::where('key', 'default_group_online_rate')->value('value') ?? 40000),
                'group_offline' => (int) (Setting::where('key', 'default_group_offline_rate')->value('value') ?? 40000),
            ],
            'group_settings' => [
                'minimum' => (int) (Setting::where('key', 'group_min_participants')->value('value') ?? 2),
                'maximum' => (int) (Setting::where('key', 'group_max_participants')->value('value') ?? 5),
                'wait_hours' => (int) (Setting::where('key', 'group_wait_hours')->value('value') ?? 24),
            ],
        ]);
    }

    public function store(Request $request, HourlyRateService $rateService)
    {
        $request->merge([
            'subject_name' => trim((string) $request->input('subject_name')),
        ]);
        $validated = $request->validate([
            'subject_name' => ['required', 'string', 'max:120'],
            'education_level' => ['nullable', Rule::in(['SD', 'SMP', 'SMA', 'Umum'])],
            'class_type' => ['required', Rule::in(['private', 'group'])],
            'learning_mode' => ['required', Rule::in(['online', 'offline'])],
            'amount' => ['required', 'integer', 'min:1000', 'max:10000000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        Setting::firstOrCreate(['key' => 'admin_fee'], ['value' => '20']);
        $rate = DB::transaction(function () use ($validated) {
            Setting::query()
                ->where('key', 'admin_fee')
                ->lockForUpdate()
                ->firstOrFail();

            return HourlyRate::updateOrCreate(
                [
                    'subject_name' => $validated['subject_name'],
                    'education_level' => $validated['education_level'] ?? null,
                    'class_type' => $validated['class_type'],
                    'learning_mode' => $validated['learning_mode'],
                ],
                [
                    'amount' => $validated['amount'],
                    'is_active' => $validated['is_active'] ?? true,
                ]
            );
        }, 3);

        $rateService->clearCache();
        Cache::forget('learning_catalog.payload');

        return response()->json(['message' => 'Tarif per jam berhasil disimpan.', 'data' => $rate]);
    }

    public function updateDefaults(Request $request, HourlyRateService $rateService)
    {
        $validated = $request->validate([
            'private_online' => ['required', 'integer', 'min:1000', 'max:10000000'],
            'private_offline' => ['required', 'integer', 'min:1000', 'max:10000000'],
            'group_online' => ['required', 'integer', 'min:1000', 'max:10000000'],
            'group_offline' => ['required', 'integer', 'min:1000', 'max:10000000'],
        ]);

        Setting::firstOrCreate(['key' => 'admin_fee'], ['value' => '20']);
        DB::transaction(function () use ($validated) {
            Setting::query()
                ->where('key', 'admin_fee')
                ->lockForUpdate()
                ->firstOrFail();
            foreach ($validated as $key => $value) {
                Setting::updateOrCreate(['key' => "default_{$key}_rate"], ['value' => $value]);
            }
        }, 3);

        $rateService->clearCache();

        return response()->json(['message' => 'Tarif bawaan berhasil diperbarui.']);
    }

    public function updateGroupSettings(Request $request)
    {
        $validated = $request->validate([
            'minimum' => ['required', 'integer', 'min:2', 'max:20'],
            'maximum' => ['required', 'integer', 'min:2', 'max:30', 'gte:minimum'],
            'wait_hours' => ['required', 'integer', 'min:1', 'max:168'],
        ]);

        Setting::firstOrCreate(['key' => 'group_min_participants'], ['value' => '2']);
        DB::transaction(function () use ($validated) {
            Setting::query()
                ->where('key', 'group_min_participants')
                ->lockForUpdate()
                ->firstOrFail();
            Setting::updateOrCreate(
                ['key' => 'group_min_participants'],
                ['value' => $validated['minimum']]
            );
            Setting::updateOrCreate(
                ['key' => 'group_max_participants'],
                ['value' => $validated['maximum']]
            );
            Setting::updateOrCreate(
                ['key' => 'group_wait_hours'],
                ['value' => $validated['wait_hours']]
            );
        }, 3);

        return response()->json(['message' => 'Kapasitas dan waktu tunggu kelas kelompok berhasil disimpan.']);
    }

    public function destroy(HourlyRate $hourlyRate, HourlyRateService $rateService)
    {
        $hourlyRate->delete();
        $rateService->clearCache();
        Cache::forget('learning_catalog.payload');

        return response()->json(['message' => 'Tarif berhasil dihapus.']);
    }
}
