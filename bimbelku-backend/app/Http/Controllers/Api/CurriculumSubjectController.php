<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CurriculumSubject;
use App\Support\EducationCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CurriculumSubjectController extends Controller
{
    public function index(Request $request)
    {
        $query = CurriculumSubject::query()
            ->withCount(['chapters' => fn ($chapters) => $chapters->where('is_active', true)])
            ->orderBy('group_name')
            ->orderBy('name');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }
        if ($request->filled('search')) {
            $search = '%'.trim((string) $request->input('search')).'%';
            $query->where('name', 'like', $search);
        }

        return response()->json(
            $request->boolean('all') ? $query->get() : $query->paginate(100)
        );
    }

    public function store(Request $request)
    {
        $validated = $this->validateSubject($request);
        $normalized = $this->normalize($validated['name']);
        $existing = CurriculumSubject::query()
            ->where('normalized_name', $normalized)
            ->first();

        if ($existing) {
            if (!$existing->is_active) {
                $existing->update(['is_active' => true]);
            }

            return response()->json([
                'message' => 'Mata pelajaran sudah tersedia dan langsung dipilih.',
                'data' => $existing->fresh(),
                'created' => false,
            ]);
        }

        $levels = $validated['education_levels'] ?? EducationCatalog::LEVELS;
        $subject = CurriculumSubject::create([
            ...$validated,
            'name' => $this->displayName($validated['name']),
            'normalized_name' => $normalized,
            'education_levels' => $levels,
            'grades' => $validated['grades'] ?? $this->gradesForLevels($levels),
            'source_url' => $validated['source_url'] ?? 'https://buku.kemendikdasmen.go.id/',
        ]);
        Cache::forget('learning_catalog.payload');

        return response()->json([
            'message' => 'Mata pelajaran baru berhasil ditambahkan.',
            'data' => $subject,
            'created' => true,
        ], 201);
    }

    public function update(Request $request, CurriculumSubject $curriculumSubject)
    {
        $validated = $this->validateSubject($request, $curriculumSubject);
        $name = $this->displayName($validated['name']);
        $curriculumSubject->update([
            ...$validated,
            'name' => $name,
            'normalized_name' => $this->normalize($name),
        ]);
        Cache::forget('learning_catalog.payload');

        return response()->json([
            'message' => 'Mata pelajaran berhasil diperbarui.',
            'data' => $curriculumSubject->fresh()->loadCount('chapters'),
        ]);
    }

    public function destroy(CurriculumSubject $curriculumSubject)
    {
        $used = $curriculumSubject->chapters()->exists()
            || \App\Models\HourlyRate::query()->whereRaw('LOWER(subject_name) = ?', [$curriculumSubject->normalized_name])->exists()
            || \App\Models\TeacherSubject::query()->whereRaw('LOWER(name) = ?', [$curriculumSubject->normalized_name])->exists()
            || \App\Models\BookingRequest::query()->whereRaw('LOWER(subject_name) = ?', [$curriculumSubject->normalized_name])->exists();

        if ($used) {
            $curriculumSubject->update(['is_active' => false]);
            Cache::forget('learning_catalog.payload');

            return response()->json([
                'message' => 'Mapel sudah digunakan, sehingga dinonaktifkan tanpa menghapus riwayat.',
                'deactivated' => true,
            ]);
        }

        $curriculumSubject->delete();
        Cache::forget('learning_catalog.payload');

        return response()->json([
            'message' => 'Mata pelajaran berhasil dihapus.',
            'deactivated' => false,
        ]);
    }

    private function validateSubject(
        Request $request,
        ?CurriculumSubject $current = null
    ): array {
        $request->merge(['name' => trim((string) $request->input('name'))]);
        $normalized = $this->normalize((string) $request->input('name'));
        $request->merge(['normalized_name' => $normalized]);
        $rules = [
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'group_name' => ['sometimes', 'string', 'max:80'],
            'education_levels' => ['sometimes', 'array', 'min:1'],
            'education_levels.*' => ['required', Rule::in(EducationCatalog::LEVELS)],
            'grades' => ['sometimes', 'array', 'min:1'],
            'grades.*' => ['required', 'string', 'max:50'],
            'is_elective' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'curriculum_name' => ['sometimes', 'string', 'max:100'],
            'edition' => ['nullable', 'string', 'max:80'],
            'source_url' => ['nullable', 'url:http,https', 'max:500'],
        ];

        // Store menangani nama ganda dengan mengembalikan mapel lama.
        // Update tetap harus menolak perubahan nama ke mapel lain yang sudah ada.
        if ($current) {
            $rules['normalized_name'] = [
                Rule::unique('curriculum_subjects', 'normalized_name')->ignore($current->id),
            ];
        }

        return $request->validate($rules) + ['normalized_name' => $normalized];
    }

    private function normalize(string $value): string
    {
        return Str::lower(preg_replace('/\s+/u', ' ', trim($value)) ?? trim($value));
    }

    private function displayName(string $value): string
    {
        $trimmed = preg_replace('/\s+/u', ' ', trim($value)) ?? trim($value);
        if (mb_strlen($trimmed) <= 6 && mb_strtoupper($trimmed, 'UTF-8') === $trimmed) {
            return $trimmed;
        }

        return mb_convert_case($trimmed, MB_CASE_TITLE, 'UTF-8');
    }

    private function gradesForLevels(array $levels): array
    {
        return EducationCatalog::gradesForLevels($levels);
    }
}
