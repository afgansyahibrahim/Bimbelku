<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminSettingController extends Controller
{
    // 1. UPDATE SAMPUL (Hanya Admin)
    public function updateTeacherCover(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $extension = $request->file('image')->extension();
        $path = $request->file('image')->storeAs(
            'settings',
            'global_teacher_cover_'.Str::uuid().".{$extension}",
            'public'
        );
        $oldPath = null;

        try {
            Setting::firstOrCreate(['key' => 'teacher_cover_path'], ['value' => null]);
            DB::transaction(function () use ($path, &$oldPath) {
                $setting = Setting::query()
                    ->where('key', 'teacher_cover_path')
                    ->lockForUpdate()
                    ->firstOrFail();
                $oldPath = $setting->value;
                $setting->update(['value' => $path]);
            }, 3);
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);
            throw $exception;
        }

        if ($oldPath && $oldPath !== $path) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json([
            'message' => 'Sampul tutor berhasil diperbarui.',
            'url' => asset('storage/' . $path) . '?t=' . time(),
        ]);
    }

    // 2. GET SAMPUL (Public / Siapa saja)
    public function getTeacherCover()
    {
        $path = Setting::where('key', 'teacher_cover_path')->value('value');
        if (!$path || !Storage::disk('public')->exists($path)) {
            $path = collect(Storage::disk('public')->files('settings'))
                ->filter(fn (string $candidate) => $this->isTeacherCover($candidate))
                ->sortByDesc(fn (string $candidate) => Storage::disk('public')->lastModified($candidate))
                ->first();
        }

        if ($path) {
            return response()->json(['url' => asset('storage/' . $path)]);
        }

        return response()->json(['url' => null]);
    }

    private function isTeacherCover(string $path): bool
    {
        $name = basename($path);

        return str_starts_with($name, 'global_teacher_cover.')
            || str_starts_with($name, 'global_teacher_cover_');
    }
}
