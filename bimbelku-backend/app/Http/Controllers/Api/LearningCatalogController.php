<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HourlyRate;
use App\Models\LearningTopic;
use App\Models\TeacherSubject;
use Illuminate\Support\Facades\Cache;

class LearningCatalogController extends Controller
{
    public function index()
    {
        $payload = Cache::remember('learning_catalog.payload', now()->addMinutes(10), function () {
            $defaults = [
                'Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS',
                'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Akuntansi',
            ];

            $subjects = TeacherSubject::query()
                ->where('is_active', true)
                ->whereNotNull('name')
                ->distinct()
                ->pluck('name')
                ->merge(HourlyRate::query()->where('is_active', true)->distinct()->pluck('subject_name'))
                ->merge(LearningTopic::query()->where('is_active', true)->distinct()->pluck('subject_name'))
                ->merge($defaults)
                ->filter()
                ->unique()
                ->sort()
                ->values();

            return [
                'subjects' => $subjects,
                'topics' => LearningTopic::query()
                    ->where('is_active', true)
                    ->orderBy('subject_name')
                    ->orderBy('education_level')
                    ->orderBy('grade')
                    ->orderBy('sort_order')
                    ->orderBy('chapter')
                    ->get(['id', 'subject_name', 'education_level', 'grade', 'chapter', 'name']),
            ];
        });

        return response()->json([
            ...$payload,
            'education_levels' => ['SD', 'SMP', 'SMA', 'Umum'],
            'grades_by_level' => [
                'SD' => ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'],
                'SMP' => ['Kelas 7', 'Kelas 8', 'Kelas 9'],
                'SMA' => ['Kelas 10', 'Kelas 11', 'Kelas 12'],
                'Umum' => ['Umum'],
            ],
            'class_types' => [
                ['value' => 'private', 'label' => 'Privat'],
                ['value' => 'group', 'label' => 'Kelompok'],
            ],
            'learning_modes' => [
                ['value' => 'online', 'label' => 'Online'],
                ['value' => 'offline', 'label' => 'Offline'],
            ],
        ]);
    }
}
