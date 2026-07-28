<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherAvailability;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\TeacherMatchingService;
use App\Services\TeacherOfferReleaseService;

class TeacherScheduleController extends Controller
{
    private const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    public function index(Request $request)
    {
        $schedules = TeacherAvailability::query()
            ->where('user_id', Auth::id())
            ->get()
            ->keyBy('day');

        return response()->json(collect(self::DAYS)->map(function (string $day) use ($schedules) {
            $item = $schedules->get($day);
            return [
                'day' => $day,
                'is_active' => (bool) ($item?->is_active ?? false),
                'start_time' => $item?->start_time ? substr((string) $item->getRawOriginal('start_time'), 0, 5) : '',
                'end_time' => $item?->end_time ? substr((string) $item->getRawOriginal('end_time'), 0, 5) : '',
            ];
        }));
    }

    public function update(
        Request $request,
        TeacherOfferReleaseService $offerReleaseService,
        TeacherMatchingService $matchingService
    )
    {
        $validated = $request->validate([
            'schedules' => ['required', 'array', 'size:7'],
            'schedules.*.day' => ['required', 'string', 'distinct', 'in:'.implode(',', self::DAYS)],
            'schedules.*.is_active' => ['required', 'boolean'],
            'schedules.*.start_time' => ['nullable', 'date_format:H:i'],
            'schedules.*.end_time' => ['nullable', 'date_format:H:i'],
        ]);

        foreach ($validated['schedules'] as $item) {
            if ($item['is_active']) {
                if (empty($item['start_time']) || empty($item['end_time'])) {
                    return response()->json(['message' => "Jam mulai dan selesai {$item['day']} wajib diisi."], 422);
                }
                if ($item['end_time'] <= $item['start_time']) {
                    return response()->json(['message' => "Jam selesai {$item['day']} harus lebih besar dari jam mulai."], 422);
                }
            }

        }

        $scheduleChanged = false;
        DB::transaction(function () use ($validated, &$scheduleChanged) {
            \App\Models\User::query()
                ->lockForUpdate()
                ->findOrFail(Auth::id());
            $current = TeacherAvailability::query()
                ->where('user_id', Auth::id())
                ->lockForUpdate()
                ->get()
                ->keyBy('day');

            foreach ($validated['schedules'] as $item) {
                $existing = $current->get($item['day']);
                $startTime = $item['is_active'] ? $item['start_time'] : null;
                $endTime = $item['is_active'] ? $item['end_time'] : null;
                $existingStart = $existing?->start_time
                    ? substr((string) $existing->getRawOriginal('start_time'), 0, 5)
                    : null;
                $existingEnd = $existing?->end_time
                    ? substr((string) $existing->getRawOriginal('end_time'), 0, 5)
                    : null;
                $scheduleChanged = $scheduleChanged
                    || !$existing
                    || (bool) $existing->is_active !== (bool) $item['is_active']
                    || $existingStart !== $startTime
                    || $existingEnd !== $endTime;

                TeacherAvailability::updateOrCreate(
                    ['user_id' => Auth::id(), 'day' => $item['day']],
                    [
                        'is_active' => $item['is_active'],
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'slots' => null,
                    ]
                );
            }
        }, 3);

        if ($scheduleChanged) {
            $offerReleaseService
                ->releaseForTeacher(Auth::id(), 'Jadwal ketersediaan tutor berubah')
                ->each(fn ($bookingRequest) => $matchingService->dispatchNextOffer($bookingRequest));
        }

        return response()->json(['message' => 'Rentang jadwal mengajar berhasil disimpan.']);
    }

}
