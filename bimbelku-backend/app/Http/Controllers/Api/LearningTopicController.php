<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningTopic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class LearningTopicController extends Controller
{
    public function index(Request $request)
    {
        $query = LearningTopic::query()->orderBy('subject_name')->orderBy('education_level')
            ->orderBy('grade')->orderBy('sort_order')->orderBy('chapter')->orderBy('name');

        if ($request->filled('subject_name')) {
            $query->where('subject_name', $request->string('subject_name'));
        }

        return response()->json($query->paginate(50));
    }

    public function store(Request $request)
    {
        $validated = $this->validateTopic($request);
        $topic = LearningTopic::create($validated);
        Cache::forget('learning_catalog.payload');

        return response()->json([
            'message' => 'Materi kurikulum berhasil ditambahkan.',
            'data' => $topic,
        ], 201);
    }

    public function update(Request $request, LearningTopic $learningTopic)
    {
        $learningTopic->update($this->validateTopic($request, $learningTopic));
        Cache::forget('learning_catalog.payload');

        return response()->json([
            'message' => 'Materi kurikulum berhasil diperbarui.',
            'data' => $learningTopic->fresh(),
        ]);
    }

    public function destroy(LearningTopic $learningTopic)
    {
        $learningTopic->delete();
        Cache::forget('learning_catalog.payload');

        return response()->json(['message' => 'Materi kurikulum berhasil dihapus.']);
    }

    private function validateTopic(Request $request, ?LearningTopic $current = null): array
    {
        $request->merge([
            'subject_name' => trim((string) $request->input('subject_name')),
            'chapter' => trim((string) $request->input('chapter')),
            'name' => trim((string) $request->input('name')),
        ]);
        $uniqueName = Rule::unique('learning_topics', 'name')
            ->where(fn ($query) => $query
                ->where('subject_name', trim((string) $request->input('subject_name')))
                ->where('education_level', $request->input('education_level'))
                ->where('grade', $request->input('grade'))
                ->where('chapter', trim((string) $request->input('chapter'))));
        if ($current) {
            $uniqueName->ignore($current->id);
        }

        $validated = $request->validate([
            'subject_name' => ['required', 'string', 'max:120'],
            'education_level' => ['required', Rule::in(['SD', 'SMP', 'SMA', 'Umum'])],
            'grade' => ['required', 'string', 'max:50'],
            'chapter' => ['required', 'string', 'max:180'],
            'name' => ['required', 'string', 'max:220', $uniqueName],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $gradesByLevel = [
            'SD' => ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'],
            'SMP' => ['Kelas 7', 'Kelas 8', 'Kelas 9'],
            'SMA' => ['Kelas 10', 'Kelas 11', 'Kelas 12'],
            'Umum' => ['Umum'],
        ];
        if (!in_array($validated['grade'], $gradesByLevel[$validated['education_level']], true)) {
            abort(422, 'Kelas materi tidak sesuai dengan jenjang yang dipilih.');
        }

        $validated['subject_name'] = trim($validated['subject_name']);
        $validated['chapter'] = trim($validated['chapter']);
        $validated['name'] = trim($validated['name']);

        return $validated;
    }
}
