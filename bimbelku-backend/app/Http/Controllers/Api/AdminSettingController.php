<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
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
        Cache::forget('public.teacher_cover_path.v1');

        return response()->json([
            'message' => 'Sampul tutor berhasil diperbarui.',
            'url' => \App\Support\PublicMedia::url($path) . '?t=' . time(),
        ]);
    }

    // 2. GET SAMPUL (Public / Siapa saja)
    public function getTeacherCover(Request $request)
    {
        $path = Cache::remember('public.teacher_cover_path.v1', now()->addMinutes(10), function () {
            $configured = Setting::where('key', 'teacher_cover_path')->value('value');
            if ($configured && Storage::disk('public')->exists($configured)) {
                return $configured;
            }

            return collect(Storage::disk('public')->files('settings'))
                ->filter(fn (string $candidate) => $this->isTeacherCover($candidate))
                ->sortByDesc(fn (string $candidate) => Storage::disk('public')->lastModified($candidate))
                ->first();
        });
        $payload = ['url' => \App\Support\PublicMedia::url($path)];
        $response = response()->json($payload);
        $response->setEtag(sha1((string) json_encode($payload)));
        $response->setPublic();
        $response->setMaxAge(300);
        $response->headers->addCacheControlDirective('stale-while-revalidate', '60');
        $response->isNotModified($request);

        return $response;
    }

    private function isTeacherCover(string $path): bool
    {
        $name = basename($path);

        return str_starts_with($name, 'global_teacher_cover.')
            || str_starts_with($name, 'global_teacher_cover_');
    }
}
