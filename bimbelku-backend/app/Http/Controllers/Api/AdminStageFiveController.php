<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DynamicBanner;
use App\Models\LearningTimeSlot;
use App\Models\PackagePlan;
use App\Models\Promotion;
use App\Models\Tutorial;
use App\Models\TutorialStep;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminStageFiveController extends Controller
{
    private const INTERNAL_DESTINATIONS = [
        '/student/dashboard',
        '/student/packages',
        '/student/packages/new',
        '/student/vouchers',
        '/student/offers',
        '/student/my-classes',
        '/student/history',
        '/student/profile',
        '/student/help',
        '/guru',
        '/guru/permintaan',
        '/guru/kelas',
        '/guru/jadwal',
        '/admin',
        '/admin/stage-five',
    ];

    public function plans()
    {
        return response()->json(PackagePlan::query()->orderBy('sort_order')->orderBy('session_count')->get());
    }

    public function storePlan(Request $request)
    {
        $plan = PackagePlan::create($this->validatePlan($request));
        return response()->json(['message' => 'Paket berhasil ditambahkan.', 'data' => $plan], 201);
    }

    public function updatePlan(Request $request, PackagePlan $packagePlan)
    {
        $packagePlan->update($this->validatePlan($request, $packagePlan));
        return response()->json(['message' => 'Paket berhasil diperbarui.', 'data' => $packagePlan->fresh()]);
    }

    public function deletePlan(PackagePlan $packagePlan)
    {
        if ($packagePlan->packages()->exists()) {
            $packagePlan->update(['is_active' => false]);
            return response()->json(['message' => 'Paket dinonaktifkan karena sudah memiliki riwayat transaksi.']);
        }
        $packagePlan->delete();
        return response()->json(['message' => 'Paket berhasil dihapus.']);
    }

    public function timeSlots()
    {
        return response()->json(
            LearningTimeSlot::query()->orderBy('sort_order')->orderBy('start_time')->get()
        );
    }

    public function storeTimeSlot(Request $request)
    {
        $slot = LearningTimeSlot::create($this->validateTimeSlot($request));
        return response()->json(['message' => 'Slot jadwal berhasil ditambahkan.', 'data' => $slot], 201);
    }

    public function updateTimeSlot(Request $request, LearningTimeSlot $learningTimeSlot)
    {
        $learningTimeSlot->update($this->validateTimeSlot($request, $learningTimeSlot));
        return response()->json(['message' => 'Slot jadwal berhasil diperbarui.', 'data' => $learningTimeSlot->fresh()]);
    }

    public function deleteTimeSlot(LearningTimeSlot $learningTimeSlot)
    {
        $learningTimeSlot->delete();
        return response()->json(['message' => 'Slot jadwal berhasil dihapus.']);
    }

    public function promotions()
    {
        return response()->json(
            Promotion::query()
                ->withCount(['claims as used_quota' => fn ($query) => $query->whereIn('status', ['available', 'reserved', 'used'])])
                ->latest()
                ->get()
        );
    }

    public function storePromotion(Request $request)
    {
        $promotion = Promotion::create($this->validatePromotion($request));
        return response()->json(['message' => 'Promo berhasil ditambahkan.', 'data' => $promotion], 201);
    }

    public function updatePromotion(Request $request, Promotion $promotion)
    {
        $promotion->update($this->validatePromotion($request, $promotion));
        return response()->json(['message' => 'Promo berhasil diperbarui.', 'data' => $promotion->fresh()]);
    }

    public function deletePromotion(Promotion $promotion)
    {
        $bannerDestination = "/student/offers/{$promotion->id}";
        $hasClaims = $promotion->claims()->exists();

        DB::transaction(function () use ($promotion, $bannerDestination, $hasClaims) {
            DynamicBanner::query()
                ->where('destination_kind', 'internal')
                ->where('destination_url', $bannerDestination)
                ->update(['is_active' => false]);

            if ($hasClaims) {
                $promotion->update(['is_active' => false]);
                return;
            }

            $promotion->delete();
        });

        return response()->json([
            'message' => $hasClaims
                ? 'Promo dan banner terkait dinonaktifkan karena promo sudah pernah diklaim.'
                : 'Promo berhasil dihapus. Banner terkait telah dinonaktifkan.',
        ]);
    }

    public function banners()
    {
        return response()->json(DynamicBanner::query()->orderBy('sort_order')->latest()->get());
    }

    public function storeBanner(Request $request)
    {
        $data = $this->validateBanner($request);
        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('stage-five/banners', 'public');
        }
        $banner = DynamicBanner::create($data);
        return response()->json(['message' => 'Banner berhasil ditambahkan.', 'data' => $banner], 201);
    }

    public function updateBanner(Request $request, DynamicBanner $dynamicBanner)
    {
        $data = $this->validateBanner($request, true);
        if ($request->hasFile('image')) {
            $oldPath = $dynamicBanner->image_path;
            $data['image_path'] = $request->file('image')->store('stage-five/banners', 'public');
            if ($oldPath && !str_starts_with($oldPath, 'http')) Storage::disk('public')->delete($oldPath);
        }
        $dynamicBanner->update($data);
        return response()->json(['message' => 'Banner berhasil diperbarui.', 'data' => $dynamicBanner->fresh()]);
    }

    public function deleteBanner(DynamicBanner $dynamicBanner)
    {
        if ($dynamicBanner->image_path && !str_starts_with($dynamicBanner->image_path, 'http')) {
            Storage::disk('public')->delete($dynamicBanner->image_path);
        }
        $dynamicBanner->delete();
        return response()->json(['message' => 'Banner berhasil dihapus.']);
    }

    public function tutorials()
    {
        return response()->json(Tutorial::query()->with('steps')->orderBy('role')->orderBy('sort_order')->get());
    }

    public function storeTutorial(Request $request)
    {
        [$tutorialData, $steps] = $this->validateTutorial($request);
        $tutorial = DB::transaction(function () use ($tutorialData, $steps) {
            $tutorial = Tutorial::create($tutorialData);
            $this->syncSteps($tutorial, $steps);
            return $tutorial;
        });
        return response()->json(['message' => 'Tutorial berhasil ditambahkan.', 'data' => $tutorial->load('steps')], 201);
    }

    public function updateTutorial(Request $request, Tutorial $tutorial)
    {
        [$tutorialData, $steps] = $this->validateTutorial($request);
        DB::transaction(function () use ($tutorial, $tutorialData, $steps) {
            $tutorial->update($tutorialData);
            $this->syncSteps($tutorial, $steps);
        });
        return response()->json(['message' => 'Tutorial berhasil diperbarui.', 'data' => $tutorial->fresh('steps')]);
    }

    public function deleteTutorial(Tutorial $tutorial)
    {
        $tutorial->steps->each(function (TutorialStep $step) {
            if ($step->image_path && !str_starts_with($step->image_path, 'http')) {
                Storage::disk('public')->delete($step->image_path);
            }
        });
        $tutorial->delete();
        return response()->json(['message' => 'Tutorial berhasil dihapus.']);
    }

    public function uploadTutorialStepImage(Request $request, TutorialStep $tutorialStep)
    {
        $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        $oldPath = $tutorialStep->image_path;
        $tutorialStep->update([
            'image_path' => $request->file('image')->store('stage-five/tutorials', 'public'),
        ]);
        if ($oldPath && !str_starts_with($oldPath, 'http')) Storage::disk('public')->delete($oldPath);

        return response()->json(['message' => 'Gambar langkah berhasil diperbarui.', 'data' => $tutorialStep->fresh()]);
    }

    private function validatePlan(Request $request, ?PackagePlan $plan = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'string', 'max:100', Rule::unique('package_plans', 'slug')->ignore($plan?->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'session_count' => ['required', 'integer', 'min:1', 'max:100'],
            'validity_days' => ['required', 'integer', 'min:1', 'max:365'],
            'maximum_subjects' => ['required', 'integer', 'min:1', 'max:5'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ]);
        abort_if(
            (int) $data['maximum_subjects'] > (int) $data['session_count'],
            422,
            'Jumlah maksimal mapel tidak boleh melebihi jumlah sesi.'
        );

        return $data;
    }

    private function validateTimeSlot(Request $request, ?LearningTimeSlot $slot = null): array
    {
        $data = $request->validate([
            'start_time' => [
                'required',
                'date_format:H:i',
                Rule::unique('learning_time_slots', 'start_time')->ignore($slot?->id),
            ],
            'label' => ['nullable', 'string', 'max:80'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ]);

        if (substr($data['start_time'], 3, 2) !== '00') {
            throw ValidationException::withMessages([
                'start_time' => 'Pilihan jam hanya boleh menggunakan menit 00.',
            ]);
        }
        if ($data['start_time'] >= '23:00') {
            throw ValidationException::withMessages([
                'start_time' => 'Jam mulai paling lambat 22.00 agar sesi selesai pada hari yang sama.',
            ]);
        }

        return $data;
    }

    private function validatePromotion(Request $request, ?Promotion $promotion = null): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'code' => ['nullable', 'string', 'max:60', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('promotions', 'code')->ignore($promotion?->id)],
            'description' => ['nullable', 'string', 'max:3000'],
            'discount_type' => ['required', Rule::in(['percentage', 'fixed'])],
            'discount_value' => ['required', 'numeric', 'min:1'],
            'maximum_discount' => ['nullable', 'numeric', 'min:0'],
            'minimum_purchase' => ['nullable', 'numeric', 'min:0'],
            'total_quota' => ['nullable', 'integer', 'min:1'],
            'per_user_limit' => ['required', 'integer', 'min:1', 'max:20'],
            'target_plan_ids' => ['nullable', 'array'],
            'target_plan_ids.*' => ['integer', 'exists:package_plans,id'],
            'target_levels' => ['nullable', 'array'],
            'target_levels.*' => [Rule::in(['SD', 'SMP', 'SMA', 'Umum'])],
            'target_subjects' => ['nullable', 'array'],
            'target_subjects.*' => ['string', 'max:120'],
            'target_modes' => ['nullable', 'array'],
            'target_modes.*' => [Rule::in(['online', 'offline'])],
            'new_students_only' => ['required', 'boolean'],
            'claim_required' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
        ]);
        if (($data['discount_type'] ?? null) === 'percentage' && (float) $data['discount_value'] > 100) {
            abort(422, 'Diskon persentase tidak boleh melebihi 100%.');
        }
        if (filled($data['starts_at'] ?? null) && filled($data['ends_at'] ?? null)) {
            abort_unless(
                \Carbon\Carbon::parse($data['ends_at'])->gt(\Carbon\Carbon::parse($data['starts_at'])),
                422,
                'Waktu selesai promo harus setelah waktu mulai.'
            );
        }
        $data['code'] = filled($data['code'] ?? null) ? mb_strtoupper($data['code']) : null;
        return $data;
    }

    private function validateBanner(Request $request, bool $updating = false): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:300'],
            'button_text' => ['nullable', 'string', 'max:60'],
            'image' => [$updating ? 'nullable' : 'required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'audience' => ['required', Rule::in(['all', 'student', 'teacher', 'admin'])],
            'destination_kind' => ['required', Rule::in(['internal', 'external'])],
            'destination_url' => ['required', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
        ]);
        unset($data['image']);
        if (filled($data['starts_at'] ?? null) && filled($data['ends_at'] ?? null)) {
            abort_unless(
                \Carbon\Carbon::parse($data['ends_at'])->gt(\Carbon\Carbon::parse($data['starts_at'])),
                422,
                'Waktu selesai banner harus setelah waktu mulai.'
            );
        }

        if ($data['destination_kind'] === 'internal') {
            $isPromotionDestination = preg_match(
                '#^/student/offers/([1-9][0-9]*)$#',
                $data['destination_url'],
                $promotionMatch
            ) === 1;
            $allowed = in_array($data['destination_url'], self::INTERNAL_DESTINATIONS, true)
                || $isPromotionDestination;
            if (!$allowed) {
                throw ValidationException::withMessages([
                    'destination_url' => 'Tujuan internal tidak diizinkan.',
                ]);
            }

            if ($isPromotionDestination) {
                $promotionExists = Promotion::query()
                    ->whereKey((int) $promotionMatch[1])
                    ->where('is_active', true)
                    ->exists();
                if (!$promotionExists) {
                    throw ValidationException::withMessages([
                        'destination_url' => 'Promo tujuan banner tidak ditemukan atau sudah dinonaktifkan.',
                    ]);
                }
            }
        } else {
            if (!filter_var($data['destination_url'], FILTER_VALIDATE_URL)) {
                throw ValidationException::withMessages([
                    'destination_url' => 'Tautan luar tidak valid.',
                ]);
            }
            if (!str_starts_with($data['destination_url'], 'https://')) {
                throw ValidationException::withMessages([
                    'destination_url' => 'Tautan luar wajib memakai HTTPS.',
                ]);
            }
        }
        return $data;
    }

    private function validateTutorial(Request $request): array
    {
        $data = $request->validate([
            'role' => ['required', Rule::in(['student', 'teacher', 'admin'])],
            'context' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'steps' => ['required', 'array', 'min:1', 'max:20'],
            'steps.*.id' => ['nullable', 'integer'],
            'steps.*.title' => ['required', 'string', 'max:160'],
            'steps.*.body' => ['required', 'string', 'max:3000'],
            'steps.*.image_path' => ['nullable', 'string', 'max:500'],
            'steps.*.callout' => ['nullable', 'array'],
            'steps.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $steps = $data['steps'];
        unset($data['steps']);
        return [$data, $steps];
    }

    private function syncSteps(Tutorial $tutorial, array $steps): void
    {
        $keptIds = [];
        foreach ($steps as $index => $stepData) {
            $step = !empty($stepData['id'])
                ? $tutorial->steps()->find($stepData['id'])
                : null;
            $payload = [
                'title' => $stepData['title'],
                'body' => $stepData['body'],
                'image_path' => $stepData['image_path'] ?? $step?->image_path,
                'callout' => $stepData['callout'] ?? null,
                'sort_order' => $stepData['sort_order'] ?? $index,
            ];
            if ($step) $step->update($payload);
            else $step = $tutorial->steps()->create($payload);
            $keptIds[] = $step->id;
        }
        $tutorial->steps()->whereNotIn('id', $keptIds)->get()->each(function (TutorialStep $step) {
            if ($step->image_path && !str_starts_with($step->image_path, 'http')) {
                Storage::disk('public')->delete($step->image_path);
            }
            $step->delete();
        });
    }
}
