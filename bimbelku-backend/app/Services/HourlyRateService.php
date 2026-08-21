<?php

namespace App\Services;

use App\Models\HourlyRate;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class HourlyRateService
{
    private ?int $cacheVersion = null;

    public function resolve(string $subjectName, string $educationLevel, string $classType, string $learningMode): int
    {
        $version = $this->cacheVersion ??= (int) Cache::get('hourly_rate.cache_version', 1);
        $cacheKey = 'hourly_rate.'.$version.'.'.sha1(
            mb_strtolower($subjectName).'|'.$educationLevel.'|'.$classType.'|'.$learningMode
        );

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($subjectName, $educationLevel, $classType, $learningMode) {
            $rate = HourlyRate::query()
                ->where('is_active', true)
                ->where('subject_name', $subjectName)
                ->where('class_type', $classType)
                ->where(function ($query) use ($learningMode) {
                    $query->where('learning_mode', $learningMode)
                        ->orWhereNull('learning_mode');
                })
                ->where(function ($query) use ($educationLevel) {
                    $query->where('education_level', $educationLevel)
                        ->orWhereNull('education_level');
                })
                ->orderByRaw('CASE WHEN education_level = ? THEN 0 ELSE 1 END', [$educationLevel])
                ->orderByRaw('CASE WHEN learning_mode = ? THEN 0 ELSE 1 END', [$learningMode])
                ->value('amount');

            if ($rate !== null) {
                return (int) round((float) $rate);
            }

            $key = "default_{$classType}_{$learningMode}_rate";
            $legacyKey = 'default_private_hourly_rate';

            return (int) (
                Setting::where('key', $key)->value('value')
                ?? Setting::where('key', $legacyKey)->value('value')
                ?? 40000
            );
        });
    }

    public function clearCache(): void
    {
        $nextVersion = ($this->cacheVersion ?? (int) Cache::get('hourly_rate.cache_version', 1)) + 1;
        Cache::forever('hourly_rate.cache_version', $nextVersion);
        $this->cacheVersion = $nextVersion;
    }
}
