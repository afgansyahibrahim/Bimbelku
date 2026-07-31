<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CurriculumChapter;
use App\Models\CurriculumSubject;
use App\Models\HourlyRate;
use App\Models\LearningTopic;
use App\Models\TeacherSubject;
use App\Support\EducationCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LearningCatalogController extends Controller
{
    public function index(Request $request)
    {
        $basePayload = Cache::remember('learning_catalog.payload', now()->addMinutes(10), function () {
            $defaults = [
                'Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS',
                'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Akuntansi',
            ];

            $catalogSubjects = CurriculumSubject::query()
                ->where('is_active', true)
                ->orderBy('group_name')
                ->orderBy('name')
                ->get([
                    'id', 'name', 'group_name', 'education_levels', 'grades',
                    'is_elective', 'curriculum_name', 'edition',
                ]);

            $subjects = $catalogSubjects
                ->pluck('name')
                ->merge(TeacherSubject::query()
                ->where('is_active', true)
                ->whereNotNull('name')
                ->distinct()
                ->pluck('name'))
                ->merge(HourlyRate::query()->where('is_active', true)->distinct()->pluck('subject_name'))
                ->merge(LearningTopic::query()->where('is_active', true)->distinct()->pluck('subject_name'))
                ->merge($defaults)
                ->filter()
                ->unique()
                ->sort()
                ->values();

            return [
                'subjects' => $subjects,
                'subject_options' => $catalogSubjects,
            ];
        });

        // Cache lama mungkin masih berisi detail lengkap. Hanya dua bagian
        // dasar yang dipakai agar respons compact tetap kecil setelah deploy.
        $basePayload = [
            'subjects' => $basePayload['subjects'],
            'subject_options' => $basePayload['subject_options'],
        ];
        $chapters = collect();
        $topics = collect();

        if (!$request->boolean('compact')) {
            $subjectName = trim((string) $request->query('subject_name', ''));
            $educationLevel = trim((string) $request->query('education_level', ''));
            $grade = trim((string) $request->query('grade', ''));

            $chapterQuery = CurriculumChapter::query()
                ->where('is_active', true)
                ->whereHas('subject', function ($subjects) use ($subjectName) {
                    $subjects->where('is_active', true);
                    if ($subjectName !== '') {
                        $subjects->where('name', $subjectName);
                    }
                })
                ->with('subject:id,name')
                ->when(
                    $educationLevel !== '',
                    fn ($query) => $query->where('education_level', $educationLevel)
                )
                ->when($grade !== '', fn ($query) => $query->where('grade', $grade))
                ->orderBy('education_level')
                ->orderBy('grade')
                ->orderBy('sort_order');

            $topicQuery = LearningTopic::query()
                ->where('is_active', true)
                ->when(
                    $subjectName !== '',
                    fn ($query) => $query->where('subject_name', $subjectName)
                )
                ->when(
                    $educationLevel !== '',
                    fn ($query) => $query->where('education_level', $educationLevel)
                )
                ->when($grade !== '', fn ($query) => $query->where('grade', $grade))
                ->orderBy('subject_name')
                ->orderBy('education_level')
                ->orderBy('grade')
                ->orderBy('sort_order')
                ->orderBy('chapter');

            $chapters = $chapterQuery->get()->map(fn (CurriculumChapter $chapter) => [
                'id' => $chapter->id,
                'subject_id' => $chapter->curriculum_subject_id,
                'subject_name' => $chapter->subject->name,
                'education_level' => $chapter->education_level,
                'grade' => $chapter->grade,
                'title' => $chapter->title,
                'sort_order' => $chapter->sort_order,
            ]);
            $topics = $topicQuery->get([
                'id', 'subject_name', 'education_level', 'grade', 'chapter', 'name',
            ]);
        }

        $payload = [
            ...$basePayload,
            'chapters' => $chapters,
            'topics' => $topics,
            'education_levels' => EducationCatalog::LEVELS,
            'grades_by_level' => EducationCatalog::GRADES_BY_LEVEL,
            'class_types' => [
                ['value' => 'private', 'label' => 'Privat'],
                ['value' => 'group', 'label' => 'Kelompok'],
            ],
            'learning_modes' => [
                ['value' => 'online', 'label' => 'Online'],
                ['value' => 'offline', 'label' => 'Offline'],
            ],
        ];
        $response = response()->json($payload);
        $response->setEtag(sha1((string) json_encode($payload)));
        $response->setPublic();
        $response->setMaxAge(300);
        $response->headers->addCacheControlDirective('stale-while-revalidate', '60');
        $response->isNotModified($request);

        return $response;
    }
}
