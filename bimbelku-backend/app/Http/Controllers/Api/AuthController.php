<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use App\Models\TeacherProfile;
use App\Models\TeacherSubject;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    // --- FITUR REGISTER ---
    public function register(Request $request)
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'email' => mb_strtolower(trim((string) $request->input('email'))),
            'phone' => trim((string) $request->input('phone')),
            'expertise' => $request->filled('expertise')
                ? trim((string) $request->input('expertise'))
                : null,
        ]);
        $validator = Validator::make($request->all(), [
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|max:255|unique:users',
            'phone'    => ['required', 'string', 'max:30', 'regex:/^[0-9+() .-]+$/'],
            'password' => 'required|string|min:8|confirmed',
            'role'     => 'required|in:student,teacher',
            'terms_accepted' => 'accepted',
            'privacy_accepted' => 'accepted',
            'school_name' => 'nullable|string|max:255',
            'grade' => 'nullable|string|max:50',
            'address'  => 'nullable|string|max:1500',
            'maps_link'=> 'nullable|string|url:http,https|max:500',
            'cv_file'  => 'nullable|file|mimes:pdf|max:5120',
            'expertise' => 'required_if:role,teacher|nullable|string|max:120',
            'levels' => 'required_if:role,teacher|nullable|array|min:1',
            'levels.*' => 'in:SD,SMP,SMA,Umum',
            'teaching_method' => 'required_if:role,teacher|nullable|in:online,offline,hybrid',
            'linkedin' => 'nullable|url:http,https|max:500',
            'identity_document' => 'required_if:role,teacher|nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
            'live_selfie' => 'required_if:role,teacher|nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'qualification_document' => 'required_if:role,teacher|nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
            'certification_document' => 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $status = $request->role === 'teacher' ? 'pending' : 'active';
        $storedFiles = [];

        try {
            if ($request->role === 'teacher') {
                foreach ([
                    'cv_file' => 'cv_files',
                    'identity_document' => 'teacher_identity',
                    'live_selfie' => 'teacher_selfies',
                    'qualification_document' => 'teacher_qualifications',
                    'certification_document' => 'teacher_certifications',
                ] as $field => $directory) {
                    if ($request->hasFile($field)) {
                        $storedFiles[$field] = $request->file($field)->store($directory, 'local');
                    }
                }
            }

            $user = DB::transaction(function () use ($request, $status, $storedFiles) {
                $user = User::create([
                    'name' => $request->name,
                    'email' => mb_strtolower($request->email),
                    'phone' => trim((string) $request->phone),
                    'password' => Hash::make($request->password),
                    'password_updated_at' => now(),
                    'role' => $request->role,
                    'status' => $status,
                    'school_name' => $request->school_name ?? null,
                    'grade' => $request->grade ?? null,
                    'address' => $request->address ?? null,
                    'maps_link' => $request->maps_link ?? null,
                    'terms_accepted_at' => now(),
                    'privacy_accepted_at' => now(),
                    'policy_version' => config('app.policy_version'),
                    'consent_ip' => $request->ip(),
                    'consent_user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
                ]);

                if ($request->role !== 'teacher') {
                    return $user;
                }

                $profile = TeacherProfile::create([
                    'user_id' => $user->id,
                    'expertise' => $request->expertise,
                    'linkedin' => $request->linkedin,
                    'teaching_method' => $request->teaching_method,
                    'whatsapp_number' => trim((string) $request->phone),
                    'cv_file' => $storedFiles['cv_file'] ?? null,
                    'identity_document' => $storedFiles['identity_document'] ?? null,
                    'live_selfie' => $storedFiles['live_selfie'] ?? null,
                    'qualification_document' => $storedFiles['qualification_document'] ?? null,
                    'certification_document' => $storedFiles['certification_document'] ?? null,
                    'points' => 150,
                    'is_accepting_requests' => false,
                ]);

                TeacherSubject::create([
                    'teacher_profile_id' => $profile->id,
                    'name' => $request->expertise,
                    'levels' => array_values(array_unique($request->input('levels', []))),
                    'is_active' => true,
                    'is_online' => in_array($request->teaching_method, ['online', 'hybrid'], true),
                    'is_offline' => in_array($request->teaching_method, ['offline', 'hybrid'], true),
                    'is_private_active' => true,
                    'is_group_active' => true,
                ]);

                return $user;
            });
        } catch (\Throwable $exception) {
            foreach ($storedFiles as $path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return response()->json([
            'message' => $user->role === 'teacher'
                ? 'Akun tutor berhasil dibuat. Mohon tunggu verifikasi admin sebelum login.'
                : 'Akun murid berhasil dibuat dan dapat langsung digunakan.',
            'user'    => $user
        ], 201);
    }

    // --- FITUR LOGIN ---
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', mb_strtolower(trim((string) $request->email)))->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Email atau password salah.'], 401);
        }

        // Cek Status
        if ($user->status === 'banned') {
            return response()->json(['message' => 'Akun Anda telah DIBLOKIR oleh Admin.'], 403);
        }

        if ($user->role === 'student' && $user->status === 'pending') {
            $user->update(['status' => 'active']);
        }

        if ($user->role === 'teacher' && $user->status === 'pending') {
            return response()->json([
                'message' => 'Akun tutor Anda sedang menunggu verifikasi admin.'
            ], 403);
        }

        if ($user->role === 'teacher' && !$user->teacherProfile?->verified_at) {
            $user->update(['status' => 'pending']);
            $user->tokens()->delete();

            return response()->json([
                'message' => 'Verifikasi tutor belum berlaku. Mohon tunggu pemeriksaan admin.',
            ], 403);
        }

        if ($user->status === 'rejected') {
            return response()->json(['message' => 'Maaf, akun Anda ditolak atau dinonaktifkan.'], 403);
        }
        if (
            $user->role === 'teacher'
            && (int) ($user->teacherProfile?->points ?? 0) <= 0
        ) {
            $user->update(['status' => 'banned']);
            $user->tokens()->delete();

            return response()->json([
                'message' => 'Akun tutor dinonaktifkan karena poin telah mencapai nol.',
            ], 403);
        }
        if ($user->status !== 'active') {
            return response()->json(['message' => 'Akun Anda sedang tidak aktif.'], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Sesi berhasil ditutup.']);
    }
}
