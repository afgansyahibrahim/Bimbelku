<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CurriculumSubject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB; 
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use App\Models\TeacherSubject;
use App\Models\TeacherProfile;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\Setting;
use App\Models\User;
use App\Services\TeacherMatchingService;
use App\Support\EducationCatalog;
use App\Services\TeacherOfferReleaseService;
use Carbon\Carbon;

class TeacherController extends Controller
{
    // ==========================================
    // 1. DATA PROFIL GURU (DASHBOARD)
    // ==========================================
    public function getProfile(Request $request)
    {
        $user = Auth::user();
        
        $profile = $user->teacherProfile;

        if (!$profile) {
            $profile = TeacherProfile::firstOrCreate(['user_id' => $user->id]);
        }

        $profile->load('subjects');

        $profileData = $profile->toArray();
        $profileData['whatsapp_number'] = $profile->whatsapp_number;
        $profileData['latitude'] = $profile->latitude;
        $profileData['longitude'] = $profile->longitude;
        $profileData['bank_name'] = $profile->bank_name;
        $profileData['account_number'] = $profile->account_number;
        $profileData['account_name'] = $profile->account_name;
        $profileData['bank_account_changed_at'] = $profile->bank_account_changed_at;
        $profileData['payout_hold_until'] = $profile->payout_hold_until;
        $profileData['photo_url'] = $profile->photo ? asset('storage/' . $profile->photo) : null;
        $profileData['cv_url'] = $profile->cv_file ? "/teachers/{$user->id}/documents/cv_file" : null;
        $profileData['identity_document_url'] = $profile->identity_document ? "/teachers/{$user->id}/documents/identity_document" : null;
        $profileData['live_selfie_url'] = $profile->live_selfie ? "/teachers/{$user->id}/documents/live_selfie" : null;
        $profileData['qualification_document_url'] = $profile->qualification_document ? "/teachers/{$user->id}/documents/qualification_document" : null;
        $profileData['certification_document_url'] = $profile->certification_document ? "/teachers/{$user->id}/documents/certification_document" : null;
        $profileData['profile_cover_url'] = $user->profile_cover
            ? asset('storage/' . $user->profile_cover)
            : null;

        $user->subjects = $profile->subjects;

        return response()->json([
            'user' => $user,
            'profile' => $profileData
        ]);
    }

    public function updateProfile(
        Request $request,
        TeacherOfferReleaseService $offerReleaseService,
        TeacherMatchingService $matchingService
    )
    {
        $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:150'],
            'location' => ['nullable', 'string', 'max:255'],
            'experience' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:3000'],
            'whatsapp_number' => ['required', 'string', 'max:30', 'regex:/^[0-9+() .-]+$/'],
            'latitude' => ['nullable', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'required_with:latitude', 'numeric', 'between:-180,180'],
            'max_travel_km' => ['nullable', 'integer', 'min:1', 'max:12'],
            'is_accepting_requests' => ['nullable', 'boolean'],
            'photo' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'profile_cover' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'cv_file' => ['nullable', 'file', 'mimes:pdf', 'max:5120'],
            'identity_document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            'live_selfie' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'qualification_document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            'certification_document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        $user = Auth::user();
        $profile = $user->teacherProfile;

        if (!$profile) {
            $profile = new TeacherProfile();
            $profile->user_id = $user->id;
        }

        $requestedLatitude = $request->filled('latitude') ? (float) $request->latitude : null;
        $requestedLongitude = $request->filled('longitude') ? (float) $request->longitude : null;
        $matchingProfileChanged = false;
        $reverificationRequired = false;

        $profile->title = $request->title;
        $profile->location = $request->location;
        $profile->experience = $request->experience;
        $profile->bio = $request->bio;
        $profile->whatsapp_number = $request->whatsapp_number;
        if ($request->has('latitude')) $profile->latitude = $request->filled('latitude') ? $request->latitude : null;
        if ($request->has('longitude')) $profile->longitude = $request->filled('longitude') ? $request->longitude : null;
        if ($request->has('max_travel_km')) $profile->max_travel_km = max(1, min(12, (int) $request->max_travel_km));
        if ($request->has('is_accepting_requests')) $profile->is_accepting_requests = filter_var($request->is_accepting_requests, FILTER_VALIDATE_BOOLEAN);

        $verificationDocuments = [
            'identity_document' => 'teacher_identity',
            'live_selfie' => 'teacher_selfies',
            'qualification_document' => 'teacher_qualifications',
            'certification_document' => 'teacher_certifications',
        ];
        $oldFiles = [];
        $newFiles = [];

        try {
            if ($request->hasFile('photo')) {
                $oldFiles['photo'] = ['public', $profile->photo];
                $newFiles['photo'] = ['public', $request->file('photo')->store('photos', 'public')];
                $profile->photo = $newFiles['photo'][1];
            }
            if ($request->hasFile('profile_cover')) {
                $oldFiles['profile_cover'] = ['public', $user->profile_cover];
                $newFiles['profile_cover'] = [
                    'public',
                    $request->file('profile_cover')->store('profile_covers', 'public'),
                ];
            }
            if ($request->hasFile('cv_file')) {
                $oldFiles['cv_file'] = ['local', $profile->cv_file];
                $newFiles['cv_file'] = ['local', $request->file('cv_file')->store('cvs', 'local')];
                $profile->cv_file = $newFiles['cv_file'][1];
            }
            foreach ($verificationDocuments as $field => $directory) {
                if (!$request->hasFile($field)) {
                    continue;
                }

                $oldFiles[$field] = ['local', $profile->{$field}];
                $newFiles[$field] = ['local', $request->file($field)->store($directory, 'local')];
                $profile->{$field} = $newFiles[$field][1];
            }

            $verificationChanged = collect($verificationDocuments)
                ->keys()
                ->contains(fn (string $field) => array_key_exists($field, $newFiles))
                || array_key_exists('cv_file', $newFiles);
            DB::transaction(function () use (
                $request,
                &$user,
                &$profile,
                $verificationChanged,
                $requestedLatitude,
                $requestedLongitude,
                $newFiles,
                &$reverificationRequired,
                &$matchingProfileChanged
            ) {
                $lockedUser = \App\Models\User::query()
                    ->lockForUpdate()
                    ->findOrFail($user->id);
                $lockedProfile = TeacherProfile::query()
                    ->where('user_id', $lockedUser->id)
                    ->lockForUpdate()
                    ->first() ?? new TeacherProfile(['user_id' => $lockedUser->id]);

                $identityChanged = $request->filled('name')
                    && trim((string) $request->name) !== trim((string) $lockedUser->name);
                $reverificationRequired = ($verificationChanged || $identityChanged)
                    && $lockedUser->status === 'active';
                $matchingProfileChanged = (
                    $request->has('latitude')
                    && $requestedLatitude !== $lockedProfile->latitude
                ) || (
                    $request->has('longitude')
                    && $requestedLongitude !== $lockedProfile->longitude
                ) || (
                    $request->has('max_travel_km')
                    && (int) $request->max_travel_km !== (int) $lockedProfile->max_travel_km
                ) || (
                    $request->has('is_accepting_requests')
                    && filter_var($request->is_accepting_requests, FILTER_VALIDATE_BOOLEAN)
                        !== (bool) $lockedProfile->is_accepting_requests
                );

                $lockedProfile->forceFill($profile->getDirty());
                if ($reverificationRequired) {
                    $lockedProfile->verified_at = null;
                    $lockedProfile->verified_by = null;
                    $lockedProfile->is_accepting_requests = false;
                    $lockedUser->status = 'pending';
                }

                $lockedProfile->save();
                if ($request->filled('name')) {
                    $lockedUser->name = $request->name;
                }
                $lockedUser->phone = trim((string) $request->whatsapp_number);
                if (isset($newFiles['profile_cover'])) {
                    $lockedUser->profile_cover = $newFiles['profile_cover'][1];
                }
                $lockedUser->save();

                if ($reverificationRequired) {
                    $lockedUser->tokens()->delete();
                }

                $user = $lockedUser;
                $profile = $lockedProfile;
            }, 3);
        } catch (\Throwable $exception) {
            foreach ($newFiles as [$disk, $path]) {
                Storage::disk($disk)->delete($path);
            }
            throw $exception;
        }

        foreach ($oldFiles as [$disk, $path]) {
            if (!$path) {
                continue;
            }
            Storage::disk($disk)->delete($path);
            if ($disk === 'local') {
                Storage::disk('public')->delete($path);
            }
        }

        if ($reverificationRequired || $matchingProfileChanged) {
            $offerReleaseService
                ->releaseForTeacher(
                    (int) $user->id,
                    $reverificationRequired
                        ? 'Profil tutor masuk pemeriksaan ulang'
                        : 'Kelayakan lokasi atau penerimaan tutor berubah'
                )
                ->each(fn ($bookingRequest) => $matchingService->dispatchNextOffer($bookingRequest));
        }

        return response()->json([
            'message' => $reverificationRequired
                ? 'Identitas atau dokumen diperbarui. Akun masuk pemeriksaan ulang dan sesi login ditutup.'
                : 'Profil berhasil disimpan.',
            'data' => $profile,
            'reverification_required' => $reverificationRequired,
        ]);
    }

    public function syncSubjects(
        Request $request,
        TeacherOfferReleaseService $offerReleaseService,
        TeacherMatchingService $matchingService
    )
    {
        $validated = $request->validate([
            'subjects' => 'required|array|size:1',
            'subjects.0.name' => 'required|string|max:120',
            'subjects.0.levels' => 'required|array|min:1',
            'subjects.0.levels.*' => ['required', \Illuminate\Validation\Rule::in(EducationCatalog::LEVELS)],
            'subjects.0.is_online' => 'required|boolean',
            'subjects.0.is_offline' => 'required|boolean',
        ]);

        $user = Auth::user();
        $profile = $user->teacherProfile ?: TeacherProfile::firstOrCreate(['user_id' => $user->id]);
        $subject = $validated['subjects'][0];
        $subject['name'] = trim($subject['name']);
        $subject['levels'] = array_values(array_unique($subject['levels']));
        sort($subject['levels']);
        if (!$subject['is_online'] && !$subject['is_offline']) {
            return response()->json([
                'message' => 'Sedikitnya satu mode mengajar harus diaktifkan.',
            ], 422);
        }
        $catalogSubject = CurriculumSubject::query()
            ->where('is_active', true)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($subject['name'])])
            ->first();
        if (!$catalogSubject) {
            return response()->json([
                'message' => 'Pilih mata pelajaran dari katalog aktif.',
            ], 422);
        }
        if (array_diff($subject['levels'], $catalogSubject->education_levels ?? [])) {
            return response()->json([
                'message' => 'Jenjang yang dipilih tidak tersedia pada mata pelajaran tersebut.',
            ], 422);
        }
        $subject['name'] = $catalogSubject->name;
        $subject['curriculum_subject_id'] = $catalogSubject->id;

        $reverificationRequired = false;
        $matchingEligibilityChanged = false;
        DB::transaction(function () use (
            $user,
            $profile,
            $subject,
            &$reverificationRequired,
            &$matchingEligibilityChanged
        ) {
            $lockedUser = \App\Models\User::query()
                ->lockForUpdate()
                ->findOrFail($user->id);
            $lockedProfile = TeacherProfile::query()
                ->lockForUpdate()
                ->findOrFail($profile->id);
            $existing = $lockedProfile->subjects()
                ->lockForUpdate()
                ->first();
            $existingLevels = $existing?->levels ?? [];
            sort($existingLevels);
            $competencyChanged = !$existing
                || mb_strtolower(trim((string) $existing->name)) !== mb_strtolower($subject['name'])
                || $existingLevels !== $subject['levels'];
            $matchingEligibilityChanged = $competencyChanged
                || (bool) $existing?->is_online !== (bool) $subject['is_online']
                || (bool) $existing?->is_offline !== (bool) $subject['is_offline'];
            $reverificationRequired = $lockedUser->status === 'active' && $competencyChanged;

            TeacherSubject::where('teacher_profile_id', $lockedProfile->id)->delete();

            TeacherSubject::create([
                'teacher_profile_id' => $lockedProfile->id,
                'name' => $subject['name'],
                'curriculum_subject_id' => $subject['curriculum_subject_id'],
                'levels' => array_values(array_unique($subject['levels'])),
                'is_active' => true,
                'is_online' => $subject['is_online'],
                'is_offline' => $subject['is_offline'],
                'is_private_active' => true,
                'is_group_active' => true,
            ]);

            $lockedProfile->update([
                'expertise' => $subject['name'],
                'is_accepting_requests' => $reverificationRequired
                    ? false
                    : $lockedProfile->is_accepting_requests,
                'verified_at' => $reverificationRequired ? null : $lockedProfile->verified_at,
                'verified_by' => $reverificationRequired ? null : $lockedProfile->verified_by,
            ]);

            if ($reverificationRequired) {
                $lockedUser->update(['status' => 'pending']);
                $lockedUser->tokens()->delete();
            }
        }, 3);

        Cache::forget('learning_catalog.payload');

        if ($matchingEligibilityChanged) {
            $offerReleaseService
                ->releaseForTeacher(
                    (int) $user->id,
                    'Kompetensi atau mode mengajar tutor berubah'
                )
                ->each(fn ($bookingRequest) => $matchingService->dispatchNextOffer($bookingRequest));
        }

        return response()->json([
            'message' => $reverificationRequired
                ? 'Kompetensi utama diperbarui. Akun masuk pemeriksaan ulang dan sesi login ditutup.'
                : 'Mata pelajaran utama dan jenjang berhasil disimpan. Harga ditentukan oleh admin.',
            'reverification_required' => $reverificationRequired,
        ]);
    }

    public function updateBank(Request $request) {
        $validated = $request->validate([
            'bank_name' => ['required', 'string', 'max:100'],
            'account_number' => ['required', 'string', 'max:50', 'regex:/^[0-9 .-]+$/'],
            'account_name' => ['required', 'string', 'max:150'],
            'current_password' => ['required', 'string', 'max:200'],
        ]);

        $user = Auth::user();
        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'Kata sandi akun tidak sesuai.'], 422);
        }

        $holdHours = min(
            72,
            max(1, (int) (Setting::where('key', 'bank_change_hold_hours')->value('value') ?? 24))
        );
        $normalizedAccount = preg_replace('/\D+/', '', $validated['account_number']) ?? '';
        $holdUntil = now()->addHours($holdHours);

        $result = DB::transaction(function () use (
            $user,
            $validated,
            $normalizedAccount,
            $holdUntil
        ) {
            $lockedUser = $user->newQuery()->lockForUpdate()->findOrFail($user->id);
            if (!Hash::check($validated['current_password'], $lockedUser->password)) {
                abort(422, 'Kata sandi akun tidak sesuai.');
            }

            $profile = TeacherProfile::query()
                ->firstOrCreate(['user_id' => $lockedUser->id]);
            $lockedProfile = TeacherProfile::query()->lockForUpdate()->findOrFail($profile->id);
            $fingerprint = hash_hmac('sha256', implode('|', [
                mb_strtolower(trim($validated['bank_name'])),
                $normalizedAccount,
                mb_strtolower(trim($validated['account_name'])),
            ]), (string) config('app.key'));
            $changed = !hash_equals(
                (string) ($lockedProfile->bank_account_fingerprint ?? ''),
                $fingerprint
            );

            if ($changed) {
                $lockedProfile->forceFill([
                    'bank_name' => trim($validated['bank_name']),
                    'account_number' => trim($validated['account_number']),
                    'account_name' => trim($validated['account_name']),
                    'bank_account_fingerprint' => $fingerprint,
                    'bank_account_changed_at' => now(),
                    'payout_hold_until' => $holdUntil,
                    'bank_details_version' => (int) $lockedProfile->bank_details_version + 1,
                ])->save();
            }

            return [
                'changed' => $changed,
                'payout_hold_until' => $changed
                    ? $holdUntil
                    : $lockedProfile->payout_hold_until,
            ];
        }, 3);

        if ($result['changed']) {
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Rekening pencairan diubah',
                'message' => 'Pencairan ditahan sementara untuk melindungi saldo setelah perubahan rekening.',
                'type' => 'warning',
            ]);
            User::query()
                ->where('role', 'admin')
                ->where('status', 'active')
                ->pluck('id')
                ->each(fn ($adminId) => Notification::create([
                    'user_id' => $adminId,
                    'title' => 'Perubahan rekening tutor',
                    'message' => "Rekening pencairan {$user->name} berubah. Pencairan ditahan sementara.",
                    'type' => 'warning',
                ]));
        }

        return response()->json([
            'message' => $result['changed']
                ? 'Rekening disimpan. Pencairan ditahan sementara demi keamanan.'
                : 'Data rekening tidak berubah.',
            'payout_hold_until' => $result['payout_hold_until'],
        ]);
    }

    // ==========================================
    // 3. KEUANGAN & GAJI
    // ==========================================
    public function getSalaryData(Request $request) {
        $user = $request->user();
        Carbon::setLocale('id');
        $currentAdminFee = \App\Models\Setting::where('key', 'admin_fee')->value('value') ?? 20;

        $readyBookingsQuery = Booking::query()
            ->where('teacher_id', $user->id)
            ->where('payout_status', 'ready');
        $paidPayouts = Payout::query()
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->latest()
            ->limit(100)
            ->get();
        $totalIncomeNetto = Booking::query()
            ->where('teacher_id', $user->id)
            ->whereIn('payout_status', ['ready', 'paid'])
            ->sum('teacher_net_amount');
        $totalWithdrawn = Payout::query()
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->sum('amount');
        $currentBalance = (clone $readyBookingsQuery)->sum('teacher_net_amount');
        $readySessionCount = (clone $readyBookingsQuery)->count();
        $newStudentsWeek = Booking::query()
            ->where('teacher_id', $user->id)
            ->where('start_at', '>=', now()->startOfWeek())
            ->withCount('participants')
            ->get()
            ->sum('participants_count');
        $totalStudents = DB::table('booking_participants')
            ->join('bookings', 'booking_participants.booking_id', '=', 'bookings.id')
            ->where('bookings.teacher_id', $user->id)
            ->whereIn('booking_participants.status', ['paid', 'approved', 'no_show_confirmed'])
            ->distinct('booking_participants.student_id')
            ->count('booking_participants.student_id');

        $formattedHistory = $paidPayouts->map(fn ($payout) => [
            'id' => $payout->id,
            'period' => $payout->period,
            'amount' => $payout->amount,
            'transfer_date' => $payout->created_at->translatedFormat('d M Y'),
            'total_students' => $payout->total_classes,
            'status' => 'Lunas',
            'proof_url' => $payout->proof_url ? "payouts/{$payout->id}/proof" : null,
        ]);

        return response()->json([
            'current_period' => Carbon::now()->translatedFormat('F Y'),
            'balance' => round($currentBalance),          
            'pending_amount' => round($currentBalance),
            'new_students_week' => $newStudentsWeek,
            'student_count_week' => $newStudentsWeek, 
            'total_students' => $totalStudents,
            'total_income' => round($totalIncomeNetto),
            'total_withdrawn' => round($totalWithdrawn),
            'history' => $formattedHistory,
            'share_percent' => 100 - $currentAdminFee,
            'ready_sessions' => $readySessionCount,
        ]);
    }
}
