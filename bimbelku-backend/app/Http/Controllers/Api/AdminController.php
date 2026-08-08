<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\PaymentSetting;
use App\Models\Order;
use App\Models\Classroom;
use App\Models\Payout; 
use App\Models\SocialMedia;
use App\Models\Booking;
use App\Models\TeacherAppeal;
use App\Models\BookingDispute;
use App\Models\SessionReport;
use App\Models\BookingRequest;
use App\Models\Notification;
use App\Models\Refund;
use App\Models\TeacherProfile;
use App\Models\TeacherPayoutRequest;
use App\Services\GroupClassService;
use App\Services\TeacherMatchingService;
use App\Services\TeacherOfferReleaseService;
use App\Services\PackageCheckoutService;
use App\Support\AdminPermissionCatalog;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB; 
use Carbon\Carbon;

class AdminController extends Controller
{
    // =========================================================================
    // 1. MANAJEMEN GURU (VERIFIKASI & HISTORY)
    // =========================================================================

    public function getPendingTeachers()
    {
        $teachers = User::where('role', 'teacher')
                        ->where('status', 'pending')
                        ->with(['teacherProfile', 'subjects']) 
                        ->orderBy('created_at', 'desc')
                        ->limit(300)
                        ->get();

        return response()->json($teachers->map(fn (User $teacher) => $this->formatTeacherVerification($teacher)));
    }

    public function getHistoryTeachers()
    {
        $teachers = User::where('role', 'teacher')
                        ->whereIn('status', ['active', 'rejected', 'banned']) // Tambahkan banned jika ada
                        ->with(['teacherProfile', 'subjects']) 
                        ->orderBy('updated_at', 'desc')
                        ->limit(500)
                        ->get();

        return response()->json($teachers->map(fn (User $teacher) => $this->formatTeacherVerification($teacher)));
    }

    public function verifyTeacher(
        Request $request,
        TeacherOfferReleaseService $offerReleaseService,
        TeacherMatchingService $matchingService
    )
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'status'  => 'required|in:active,rejected',
            'notes' => 'nullable|string|max:2000',
        ]);

        if (
            $validated['status'] === 'rejected'
            && mb_strlen(trim((string) ($validated['notes'] ?? ''))) < 10
        ) {
            return response()->json(['message' => 'Alasan penolakan wajib diisi dengan jelas.'], 422);
        }

        DB::transaction(function () use ($request, $validated) {
            $user = User::query()
                ->where('role', 'teacher')
                ->lockForUpdate()
                ->findOrFail($validated['user_id']);
            $profile = TeacherProfile::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();
            if (!$profile) {
                abort(422, 'Profil tutor tidak ditemukan.');
            }

            $user->load('subjects');
            if ($validated['status'] === 'active') {
                $requiredDocuments = [
                    $profile->identity_document,
                    $profile->live_selfie,
                    $profile->qualification_document,
                ];
                $subject = $user->subjects->first();
                $documentsIncomplete = collect($requiredDocuments)->contains(
                    fn ($path) => blank($path) || !Storage::disk('local')->exists($path)
                );
                $subjectIncomplete = $user->subjects->count() !== 1
                    || !$subject?->is_active
                    || !is_array($subject?->levels)
                    || count($subject->levels) === 0
                    || (!$subject->is_online && !$subject->is_offline);
                if ($documentsIncomplete || $subjectIncomplete || (int) $profile->points <= 0) {
                    abort(
                        422,
                        'Dokumen yang dapat dibuka, satu mata pelajaran aktif, jenjang, mode mengajar, dan poin di atas nol wajib terpenuhi.'
                    );
                }
            }

            $alreadyApplied = $user->status === $validated['status']
                && (
                    $validated['status'] !== 'active'
                    || $profile->verified_at !== null
                );
            if ($alreadyApplied) {
                abort(422, 'Keputusan verifikasi ini sudah tersimpan.');
            }

            $user->update(['status' => $validated['status']]);
            $profile->update([
                'verification_notes' => trim((string) ($validated['notes'] ?? '')) ?: null,
                'verified_at' => $validated['status'] === 'active' ? now() : null,
                'verified_by' => $request->user()->id,
                'is_accepting_requests' => $validated['status'] === 'active',
            ]);

            if ($validated['status'] === 'rejected') {
                $user->tokens()->delete();
            }

            Notification::create([
                'user_id' => $user->id,
                'title' => $validated['status'] === 'active' ? 'Akun tutor disetujui' : 'Verifikasi tutor ditolak',
                'message' => $validated['status'] === 'active'
                    ? 'Akun Anda telah diverifikasi dan dapat menerima permintaan belajar.'
                    : 'Verifikasi belum disetujui. Alasan: '.trim((string) ($validated['notes'] ?? '')),
                'type' => $validated['status'] === 'active' ? 'success' : 'warning',
                'target_url' => '/guru/saya',
            ]);
        }, 3);

        if ($validated['status'] === 'rejected') {
            $offerReleaseService
                ->releaseForTeacher(
                    (int) $validated['user_id'],
                    'Verifikasi tutor ditolak admin'
                )
                ->each(fn ($bookingRequest) => $matchingService->dispatchNextOffer($bookingRequest));
        }
        
        return response()->json(['message' => 'Status tutor berhasil diperbarui.']);
    }

    private function formatTeacherVerification(User $teacher): array
    {
        $profile = $teacher->teacherProfile;
        $documentUrl = static fn (?string $path, string $field) => $path
            ? "/teachers/{$teacher->id}/documents/{$field}"
            : null;

        return [
            'id' => $teacher->id,
            'name' => $teacher->name,
            'email' => $teacher->email,
            'status' => $teacher->status,
            'created_at' => $teacher->created_at,
            'updated_at' => $teacher->updated_at,
            'subject' => $teacher->subjects->first()?->name,
            'levels' => $teacher->subjects->first()?->levels ?? [],
            'teaching_method' => $profile?->teaching_method,
            'about' => $profile?->bio,
            'phone' => $profile?->phone ?? $profile?->whatsapp_number,
            'points' => $profile?->points ?? 150,
            'verification_notes' => $profile?->verification_notes,
            'photo_url' => $profile?->photo ? asset('storage/'.$profile->photo) : null,
            'identity_document_url' => $documentUrl($profile?->identity_document, 'identity_document'),
            'live_selfie_url' => $documentUrl($profile?->live_selfie, 'live_selfie'),
            'qualification_document_url' => $documentUrl($profile?->qualification_document, 'qualification_document'),
            'certification_document_url' => $documentUrl($profile?->certification_document, 'certification_document'),
        ];
    }

    // =========================================================================
    // 2. MANAJEMEN USER (SISWA / GURU)
    // =========================================================================

    public function getUsers(Request $request)
    {
        $validated = $request->validate([
            'role' => 'nullable|in:student,teacher',
        ]);
        $role = $validated['role'] ?? 'student';

        // [FIX UTAMA] Hapus 'rejected' dari exclusion list.
        // Sekarang hanya menyembunyikan yang 'pending'.
        // Jadi user yang statusnya 'active', 'rejected', atau 'banned' akan TAMPIL.
        $users = User::where('role', $role)
                    ->where('status', '!=', 'pending') 
                    ->with('teacherProfile') 
                    ->orderBy('created_at', 'desc')
                    ->limit(500)
                    ->get();

        $users->transform(function($u) {
            if ($u->role === 'student') {
                $u->setAttribute(
                    'student_birth_date',
                    $u->date_of_birth?->toDateString()
                );
                $u->setAttribute(
                    'guardian',
                    $u->guardian_consent_at ? [
                        'name' => $u->guardian_name,
                        'phone' => $u->guardian_phone,
                        'relationship' => $u->guardian_relationship,
                        'consent_at' => $u->guardian_consent_at?->toIso8601String(),
                    ] : null
                );
            }
            if ($u->role === 'teacher' && $u->teacherProfile) {
                $u->photo_url = $u->teacherProfile->photo ? asset('storage/' . $u->teacherProfile->photo) : null;
                $u->teacherProfile->setAttribute(
                    'cv_url',
                    $u->teacherProfile->cv_file
                        ? "/teachers/{$u->id}/documents/cv_file"
                        : null
                );
            }
            // Normalisasi status untuk frontend (opsional)
            // Jika di DB 'rejected', frontend akan membacanya sebagai user terblokir
            return $u;
        });

        return response()->json($users);
    }

    public function updateUserStatus(
        Request $request,
        TeacherOfferReleaseService $offerReleaseService,
        TeacherMatchingService $matchingService
    )
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'status' => 'required|in:active,banned',
        ]);

        $affectedRole = null;
        DB::transaction(function () use ($request, &$affectedRole) {
            $user = User::query()
                ->lockForUpdate()
                ->findOrFail($request->user_id);
            $profile = $user->role === 'teacher'
                ? TeacherProfile::query()
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first()
                : null;

            if ($user->role === 'admin') {
                abort(403, 'Akun admin tidak dapat diblokir dari menu pengguna.');
            }
            $affectedRole = $user->role;
            if (
                $request->status === 'active'
                && $user->role === 'teacher'
                && (!$profile?->verified_at || (int) $profile->points <= 0)
            ) {
                abort(422, 'Tutor hanya dapat diaktifkan jika verifikasi masih berlaku dan poinnya di atas nol.');
            }
            if ($user->status === $request->status) {
                abort(422, 'Status akun tersebut sudah tersimpan.');
            }

            $user->update(['status' => $request->status]);
            if ($profile) {
                $profile->update([
                    'is_accepting_requests' => $request->status === 'active',
                ]);
            }

            if ($request->status === 'banned') {
                $user->tokens()->delete();
            }
        }, 3);

        if ($request->status === 'banned' && $affectedRole === 'teacher') {
            $offerReleaseService
                ->releaseForTeacher((int) $request->user_id, 'Akun tutor diblokir admin')
                ->each(fn ($bookingRequest) => $matchingService->dispatchNextOffer($bookingRequest));
        }

        return response()->json([
            'message' => $request->status === 'active'
                ? 'Akun berhasil diaktifkan kembali.'
                : 'Akun berhasil diblokir dan seluruh sesi loginnya ditutup.',
            'new_status' => $request->status,
        ]);
    }

    // =========================================================================
    // 3. MANAJEMEN PEMBAYARAN MURID (ORDER)
    // =========================================================================

    public function getOrders()
    {
        $orders = Order::with(['user', 'classroom', 'booking.teacher', 'refund'])
                    ->orderBy('created_at', 'desc')
                    ->limit(200)
                    ->get();
                    
        return response()->json($orders);
    }

    public function getPendingPayments() 
    {
        $orders = Order::where('status', 'submitted')
                    ->whereNotNull('payment_proof')
                    ->where('payment_proof', '!=', '')
                    ->with('user')
                    ->orderBy('updated_at', 'desc')
                    ->limit(100)
                    ->get();

        $formatted = $orders->map(function($order) {
            $details = $this->orderDetails($order);
            
            $subject = $details['subject'] ?? 'Kelas';
            $teacher = $details['teacher_name'] ?? 'Tutor';
            $student = $details['student_name'] ?? $order->user->name ?? 'Murid';
            
            $title = "";
            if (($details['type'] ?? '') === 'Privat') {
                $title = "{$subject} - {$teacher} ({$student})";
            } else {
                $title = "{$subject} - {$teacher} (Grup)";
            }

            return [
                'id' => $order->id,
                'order_id' => $order->order_id,
                'user_name' => $order->user->name ?? 'Unknown',
                'amount' => $order->amount,
                'payment_proof' => $order->payment_proof_url,
                'bank_name' => $order->bank_name,
                'sender_name' => $order->sender_name,
                'sender_account_number' => $order->sender_account_number,
                'status' => 'Menunggu Verifikasi',
                'created_at' => $order->created_at,
                'scheduled_at' => $details['start_at'] ?? null,
                'subject' => $subject,
                'teacher_name' => $teacher,
                'type' => $details['type'] ?? 'Privat',
                'title' => $title, 
                'classroom' => [
                    'title' => $title,
                    'subject' => $subject
                ]
            ];
        });

        return response()->json($formatted);
    }

    // --- [VERIFIKASI PEMBAYARAN (JADWAL KOMPLEKS)] ---
    public function verifyPayment(
        Request $request,
        GroupClassService $groupService,
        PackageCheckoutService $packageCheckoutService
    )
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'status' => 'required|in:paid,rejected',
            'reason' => 'nullable|string|max:500',
        ]);

        $order = Order::findOrFail($validated['order_id']);
        if ($order->status !== 'submitted') {
            $message = match ($order->status) {
                'cancelled' => 'Tagihan ini sudah dibatalkan murid. Tidak ada bukti aktif yang perlu diproses lagi.',
                'rejected' => 'Bukti pembayaran ini sudah pernah ditolak. Muat ulang daftar pembayaran untuk melihat status terbaru.',
                'paid' => 'Pembayaran ini sudah diterima dan tidak dapat diproses ulang.',
                'refund_pending' => 'Pembayaran ini sudah masuk proses refund dan tidak dapat diverifikasi ulang.',
                'refunded' => 'Pembayaran ini sudah direfund dan tidak dapat diverifikasi ulang.',
                'expired' => 'Tagihan ini sudah kedaluwarsa dan tidak dapat diproses.',
                'pending' => 'Tagihan ini belum memiliki bukti pembayaran yang sedang menunggu pemeriksaan.',
                default => 'Status pembayaran sudah berubah. Muat ulang daftar pembayaran sebelum melanjutkan.',
            };

            return response()->json([
                'message' => $message,
                'current_status' => $order->status,
            ], 409);
        }

        if (!$order->payment_proof) {
            return response()->json(['message' => 'Bukti pembayaran belum diunggah.'], 422);
        }

        $details = $this->orderDetails($order);
        $reason = trim((string) ($validated['reason'] ?? ''));
        if ($validated['status'] === 'rejected' && $reason === '') {
            return response()->json([
                'message' => 'Alasan penolakan pembayaran wajib diisi.',
            ], 422);
        }

        if ($order->learning_package_id) {
            if ($validated['status'] === 'rejected') {
                $packageCheckoutService->rejectPackagePayment($order, $reason, $request->user());
                return response()->json(['message' => 'Pembayaran paket ditolak.']);
            }
            $result = $packageCheckoutService->activatePaidPackage($order, $request->user());
            return response()->json([
                'message' => $result === 'refund_pending'
                    ? 'Pembayaran tercatat, tetapi sesi pertama sudah dimulai. Refund penuh masuk antrean admin.'
                    : ($result === 'no_teacher'
                        ? 'Pembayaran diterima, tetapi belum ada tutor yang tersedia.'
                        : 'Pembayaran diterima dan pencarian tutor dimulai.'),
            ]);
        }

        if (($details['flow_version'] ?? 0) >= 3) {
            return $this->verifyLatestBookingPayment(
                $request,
                $order,
                $validated['status'],
                $details,
                $reason,
                $groupService
            );
        }

        if (($details['flow_version'] ?? null) === 2) {
            return $this->verifyHourlyBookingPayment($order, $validated['status'], $details, $reason);
        }

        return response()->json([
            'message' => 'Format pesanan lama tidak dapat diverifikasi lewat alur sesi terbaru. Tutup atau migrasikan pesanan ini terlebih dahulu.',
        ], 422);
    }

    private function verifyHourlyBookingPayment(Order $order, string $status, array $details, string $reason = '')
    {
        return DB::transaction(function () use ($order, $status, $details, $reason) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            if ($lockedOrder->status !== 'submitted') {
                return response()->json(['message' => 'Pembayaran ini sudah diproses.'], 422);
            }

            $booking = Booking::query()->lockForUpdate()->find($details['booking_id'] ?? null);
            if (!$booking) {
                return response()->json(['message' => 'Data booking tidak ditemukan.'], 404);
            }

            if ($status === 'rejected') {
                if ($reason !== '') {
                    $details['payment_rejection_reason'] = $reason;
                }

                $lockedOrder->update([
                    'status' => 'rejected',
                    'class_details_snapshot' => $details,
                ]);
                $booking->update(['status' => 'payment_rejected']);
                $booking->bookingRequest->update(['status' => 'payment_rejected']);

                Notification::create([
                    'user_id' => $booking->student_id,
                    'title' => 'Pembayaran ditolak',
                    'message' => $reason !== ''
                        ? 'Bukti pembayaran ditolak: '.$reason
                        : 'Bukti pembayaran ditolak. Silakan hubungi admin melalui pusat bantuan.',
                    'type' => 'warning',
                    'target_url' => '/student/history',
                ]);

                return response()->json(['message' => 'Pembayaran ditolak.', 'data' => $lockedOrder->fresh()]);
            }

            $student = User::find($booking->student_id);
            $teacher = User::find($booking->teacher_id);
            $subject = $details['subject'] ?? $booking->bookingRequest->subject_name;
            $typeLabel = $booking->class_type === 'group' ? 'Grup' : 'Privat';
            $title = "{$subject} - {$student->name} ({$typeLabel})";
            $theme = $booking->learning_mode === 'offline'
                ? 'from-emerald-600 to-teal-800'
                : 'from-blue-600 to-indigo-700';

            $classroom = $lockedOrder->classroom_id ? Classroom::find($lockedOrder->classroom_id) : null;
            if (!$classroom) {
                $dayNames = [1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu', 7 => 'Minggu'];
                $classroom = Classroom::create([
                    'user_id' => $booking->teacher_id,
                    'title' => $title,
                    'subject' => $subject,
                    'type' => $typeLabel,
                    'status' => 'Open',
                    'method' => $booking->learning_mode,
                    'location_id' => null,
                    'theme' => $theme,
                    'day' => $dayNames[$booking->start_at->dayOfWeekIso],
                    'time' => $booking->start_at->format('H:i:s'),
                ]);

                $classroom->sessions()->create([
                    'title' => 'Pertemuan 1',
                    'content' => $details['topic'] ?? null,
                    'date' => $booking->start_at->toDateString(),
                    'time' => $booking->start_at->format('H:i:s'),
                    'start_time' => $booking->start_at,
                    'is_completed' => false,
                ]);
                $lockedOrder->classroom_id = $classroom->id;
            }

            $classroom->students()->syncWithoutDetaching([$booking->student_id]);
            $lockedOrder->status = 'paid';
            $lockedOrder->save();
            $booking->update(['status' => 'confirmed']);
            $booking->bookingRequest->update(['status' => 'confirmed']);
            $teacher->teacherProfile()->update([
                'assignment_count' => DB::raw('assignment_count + 1'),
                'last_assigned_at' => now(),
            ]);

            Notification::create([
                'user_id' => $booking->student_id,
                'title' => 'Kelas dikonfirmasi',
                'message' => "Pembayaran diterima. Kelas bersama {$teacher->name} sudah aktif.",
                'type' => 'success',
                'target_url' => '/student/my-classes',
            ]);
            Notification::create([
                'user_id' => $booking->teacher_id,
                'title' => 'Pembayaran murid diterima',
                'message' => "Kelas {$subject} pada {$booking->start_at->format('d/m/Y H:i')} WIB sudah dikonfirmasi.",
                'type' => 'success',
                'target_url' => '/guru/kelas',
            ]);

            return response()->json(['message' => 'Pembayaran diverifikasi dan kelas dikonfirmasi.', 'data' => $lockedOrder->fresh()]);
        });
    }

    private function verifyLatestBookingPayment(
        Request $request,
        Order $order,
        string $status,
        array $details,
        string $reason,
        GroupClassService $groupService
    ) {
        if ($status === 'rejected' && $reason === '') {
            return response()->json(['message' => 'Alasan penolakan pembayaran wajib diisi.'], 422);
        }

        return DB::transaction(function () use (
            $request,
            $order,
            $status,
            $details,
            $reason,
            $groupService
        ) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            $booking = Booking::query()->lockForUpdate()->find($lockedOrder->booking_id);
            $participant = $lockedOrder->participant()->lockForUpdate()->first();

            if (!$booking || !$participant) {
                return response()->json(['message' => 'Data booking atau peserta tidak ditemukan.'], 404);
            }
            if ($lockedOrder->status !== 'submitted') {
                return response()->json(['message' => 'Pembayaran ini sudah diproses.'], 422);
            }

            if ($status === 'rejected') {
                $details['payment_rejection_reason'] = $reason;
                $lockedOrder->update([
                    'status' => 'rejected',
                    'payment_rejection_reason' => $reason,
                    'class_details_snapshot' => $details,
                    'verified_at' => now(),
                    'verified_by' => $request->user()->id,
                ]);
                $participant->update(['status' => 'awaiting_payment']);
                $participant->bookingRequest?->update(['status' => 'payment_rejected']);

                $activeGroupStatuses = [
                    'confirmed',
                    'in_progress',
                    'awaiting_student_approval',
                    'disputed',
                    'absence_review',
                    'admin_review_required',
                    'completed',
                ];
                $keepActiveGroup = $booking->class_type === 'group'
                    && in_array($booking->status, $activeGroupStatuses, true);
                $booking->update([
                    'status' => $keepActiveGroup
                        ? $booking->status
                        : ($booking->class_type === 'group'
                            ? 'payment_collecting'
                            : 'awaiting_payment'),
                ]);

                Notification::create([
                    'user_id' => $lockedOrder->user_id,
                    'title' => 'Bukti pembayaran ditolak',
                    'message' => 'Bukti perlu dikirim ulang: '.$reason,
                    'type' => 'warning',
                    'target_url' => '/student/history',
                ]);

                return response()->json([
                    'message' => 'Pembayaran ditolak. Murid dapat mengirim bukti pengganti sebelum batas waktu.',
                    'data' => $lockedOrder->fresh(),
                ]);
            }

            if (now()->greaterThanOrEqualTo($booking->start_at)) {
                unset($details['payment_rejection_reason']);
                $lockedOrder->update([
                    'status' => 'refund_pending',
                    'payment_rejection_reason' => null,
                    'class_details_snapshot' => $details,
                    'verified_at' => now(),
                    'verified_by' => $request->user()->id,
                ]);
                $participant->update(['status' => 'refund_pending']);
                $participant->bookingRequest?->update(['status' => 'refund_pending']);
                Refund::firstOrCreate(
                    ['order_id' => $lockedOrder->id],
                    [
                        'user_id' => $lockedOrder->user_id,
                        'booking_id' => $booking->id,
                        'amount' => $lockedOrder->amount,
                        'reason' => 'Pembayaran terverifikasi setelah sesi dimulai',
                        'status' => 'pending',
                    ]
                );

                if ($booking->class_type === 'private') {
                    $booking->update([
                        'status' => 'refund_pending',
                        'gross_amount' => 0,
                        'teacher_net_amount' => 0,
                        'payout_status' => 'cancelled',
                    ]);
                    Notification::create([
                        'user_id' => $booking->teacher_id,
                        'title' => 'Sesi dibatalkan karena pembayaran terlambat',
                        'message' => 'Pembayaran baru terverifikasi setelah sesi dimulai. Dana murid masuk antrean refund dan sesi tidak menghasilkan pendapatan.',
                        'type' => 'warning',
                        'target_url' => '/guru/kelas',
                    ]);
                } else {
                    if ($participant->bookingRequest) {
                        $groupService->leave($participant->bookingRequest);
                    }
                    $groupService->settleAfterProfileDecision(
                        $booking,
                        'Pembayaran peserta kelompok baru terverifikasi setelah sesi dimulai'
                    );
                    $booking->refresh();

                    $paidParticipants = $booking->participants()
                        ->where('status', 'paid')
                        ->with(['order', 'bookingRequest'])
                        ->lockForUpdate()
                        ->get();
                    if (!in_array($booking->status, [
                        'cancelled',
                        'refund_pending',
                        'refunded',
                        'payment_expired',
                    ], true)) {
                        $grossAmount = $paidParticipants->sum('amount');
                        $booking->update([
                            'status' => in_array($booking->status, [
                                'confirmed',
                                'in_progress',
                                'awaiting_student_approval',
                                'disputed',
                                'absence_review',
                                'admin_review_required',
                                'completed',
                            ], true)
                                ? $booking->status
                                : (now()->lt($booking->end_at)
                                    ? 'in_progress'
                                    : 'admin_review_required'),
                            'gross_amount' => $grossAmount,
                            'teacher_net_amount' => round(
                                (float) $grossAmount
                                * (100 - (float) $booking->commission_percent)
                                / 100
                            ),
                        ]);
                    }
                }

                Notification::create([
                    'user_id' => $lockedOrder->user_id,
                    'title' => 'Pembayaran masuk antrean refund',
                    'message' => 'Bukti diterima setelah sesi dimulai sehingga dana dikembalikan penuh melalui proses transfer admin.',
                    'type' => 'warning',
                    'target_url' => '/student/history',
                ]);

                return response()->json([
                    'message' => 'Pembayaran tercatat, tetapi sesi sudah dimulai. Refund penuh masuk antrean transfer.',
                    'data' => $lockedOrder->fresh(),
                ]);
            }

            $wasConfirmed = in_array($booking->status, [
                'confirmed', 'in_progress', 'awaiting_student_approval', 'completed',
            ], true);
            unset($details['payment_rejection_reason']);
            $lockedOrder->update([
                'status' => 'paid',
                'payment_rejection_reason' => null,
                'class_details_snapshot' => $details,
                'verified_at' => now(),
                'verified_by' => $request->user()->id,
            ]);
            $participant->update(['status' => 'paid']);
            $participant->bookingRequest?->update(['status' => 'payment_verified']);

            $teacher = User::findOrFail($booking->teacher_id);
            $student = User::findOrFail($participant->student_id);
            $typeLabel = $booking->class_type === 'group' ? 'Kelompok' : 'Privat';
            $subject = $details['subject'] ?? $booking->bookingRequest->subject_name;
            $title = "{$subject} - {$typeLabel}";
            $theme = $booking->learning_mode === 'offline'
                ? 'from-emerald-600 to-teal-800'
                : 'from-blue-600 to-indigo-700';

            $classroom = $lockedOrder->classroom_id
                ? Classroom::find($lockedOrder->classroom_id)
                : Classroom::query()
                    ->whereHas('orders', fn ($query) => $query->where('booking_id', $booking->id))
                    ->first();

            if (!$classroom) {
                $dayNames = [1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu', 7 => 'Minggu'];
                $classroom = Classroom::create([
                    'user_id' => $booking->teacher_id,
                    'title' => $title,
                    'subject' => $subject,
                    'type' => $typeLabel,
                    'status' => 'Open',
                    'method' => $booking->learning_mode,
                    'location_id' => null,
                    'theme' => $theme,
                    'day' => $dayNames[$booking->start_at->dayOfWeekIso],
                    'time' => $booking->start_at->format('H:i:s'),
                ]);
                $classroom->sessions()->create([
                    'title' => 'Sesi bimbingan',
                    'content' => $details['topic'] ?? $details['subtopic'] ?? null,
                    'date' => $booking->start_at->toDateString(),
                    'time' => $booking->start_at->format('H:i:s'),
                    'start_time' => $booking->start_at,
                    'is_completed' => false,
                ]);
                Order::query()->where('booking_id', $booking->id)->update(['classroom_id' => $classroom->id]);
            }

            $classroom->students()->syncWithoutDetaching([$student->id]);
            $paidCount = $booking->participants()->where('status', 'paid')->count();
            $grossAmount = $booking->participants()->where('status', 'paid')->sum('amount');
            $teacherNetAmount = round(
                (float) $grossAmount * (100 - (float) $booking->commission_percent) / 100
            );
            $minimumParticipants = $booking->class_type === 'group'
                ? (int) ($booking->groupPool?->minimum_participants ?? 2)
                : 1;

            if ($paidCount >= $minimumParticipants) {
                $booking->update([
                    'status' => 'confirmed',
                    'gross_amount' => $grossAmount,
                    'teacher_net_amount' => $teacherNetAmount,
                ]);
                $booking->participants()->where('status', 'paid')->with('bookingRequest')->get()
                    ->each(fn ($paidParticipant) => $paidParticipant->bookingRequest?->update(['status' => 'confirmed']));
                $booking->groupPool?->update(['status' => 'confirmed']);

                if (!$wasConfirmed) {
                    $teacher->teacherProfile()->update([
                        'assignment_count' => DB::raw('assignment_count + 1'),
                        'last_assigned_at' => now(),
                    ]);
                    Notification::create([
                        'user_id' => $teacher->id,
                        'title' => 'Sesi dikonfirmasi',
                        'message' => "Pembayaran minimum terpenuhi. Sesi {$subject} sudah aktif.",
                        'type' => 'success',
                        'target_url' => '/guru/kelas',
                    ]);
                }
            } else {
                $booking->update([
                    'status' => 'payment_collecting',
                    'gross_amount' => $grossAmount,
                    'teacher_net_amount' => $teacherNetAmount,
                ]);
            }

            Notification::create([
                'user_id' => $student->id,
                'title' => 'Pembayaran diterima',
                'message' => $paidCount >= $minimumParticipants
                    ? "Sesi bersama {$teacher->name} sudah dikonfirmasi."
                    : 'Pembayaran diterima. Kelas kelompok menunggu pembayaran anggota minimum.',
                'type' => 'success',
                'target_url' => $paidCount >= $minimumParticipants ? '/student/my-classes' : '/student/packages',
            ]);

            return response()->json([
                'message' => $paidCount >= $minimumParticipants
                    ? 'Pembayaran diverifikasi dan sesi dikonfirmasi.'
                    : 'Pembayaran diverifikasi. Kelompok masih menunggu anggota minimum.',
                'data' => $lockedOrder->fresh(),
            ]);
        });
    }

    // =========================================================================
    // 4. PENGATURAN REKENING ADMIN (QRIS)
    // =========================================================================

    public function getPaymentSettings()
    {
        $settings = PaymentSetting::firstOrCreate(['singleton_key' => 1], [
            'merchant_name' => 'BimbelKu Official',
            'bank_name' => '',
            'account_number' => '',
            'account_name' => '',
        ]);

        return response()->json($this->paymentSettingsPayload($settings));
    }

    public function qrisImage()
    {
        $settings = PaymentSetting::query()->where('singleton_key', 1)->first();
        $path = $settings?->qris_image;

        abort_if(
            blank($path) || !Storage::disk('public')->exists($path),
            404,
            'QRIS pembayaran belum tersedia.'
        );

        $contents = Storage::disk('public')->get($path);
        $mimeType = Storage::disk('public')->mimeType($path) ?: 'image/png';

        return response($contents, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="qris-bimbelku.' . pathinfo($path, PATHINFO_EXTENSION) . '"',
            'Cache-Control' => 'private, max-age=300',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function updatePaymentSettings(Request $request)
    {
        $request->validate([
            'merchant_name'  => ['required', 'string', 'max:100', 'regex:/\pL/u'],
            'bank_name'      => ['required', 'string', 'max:100', 'regex:/\pL/u'],
            'account_number' => ['required', 'string', 'max:50', 'regex:/^[0-9]{6,50}$/'],
            'account_name'   => ['required', 'string', 'max:150', 'regex:/\pL/u', 'not_regex:/\d/u'],
            'qris_image'     => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048'
        ], [
            'merchant_name.regex' => 'Nama merchant wajib mengandung huruf.',
            'bank_name.regex' => 'Nama bank atau e-wallet wajib mengandung huruf.',
            'account_number.regex' => 'Nomor rekening harus berisi 6–50 angka.',
            'account_name.regex' => 'Nama pemilik rekening wajib mengandung huruf.',
            'account_name.not_regex' => 'Nama pemilik rekening tidak boleh memuat angka.',
        ]);

        $settings = PaymentSetting::firstOrCreate(['singleton_key' => 1], [
            'merchant_name' => 'BimbelKu Official',
            'bank_name' => '',
            'account_number' => '',
            'account_name' => '',
        ]);
        $newQrisImage = $request->hasFile('qris_image')
            ? $request->file('qris_image')->store('payment_settings', 'public')
            : null;
        $oldQrisImage = null;

        try {
            DB::transaction(function () use (
                $request,
                $settings,
                $newQrisImage,
                &$oldQrisImage
            ) {
                $lockedSettings = PaymentSetting::query()
                    ->lockForUpdate()
                    ->findOrFail($settings->id);
                $paymentDestinationIsConfigured = filled($lockedSettings->bank_name)
                    && filled($lockedSettings->account_number)
                    && filled($lockedSettings->account_name);
                $bankDestinationChanged = $paymentDestinationIsConfigured && (
                    $lockedSettings->merchant_name !== $request->merchant_name
                    || $lockedSettings->bank_name !== $request->bank_name
                    || $lockedSettings->account_number !== $request->account_number
                    || $lockedSettings->account_name !== $request->account_name
                );
                $hasOpenPayments = Order::query()
                    ->where(function ($query) {
                        $query->where('status', 'submitted')
                            ->orWhere(function ($open) {
                                $open->whereIn('status', ['pending', 'rejected'])
                                    ->where(function ($sources) {
                                        $sources
                                            ->whereHas('booking', fn ($booking) => $booking
                                                ->whereNotNull('payment_due_at')
                                                ->where('payment_due_at', '>', now()))
                                            ->orWhereHas('learningPackage', fn ($package) => $package
                                                ->whereNotNull('payment_due_at')
                                                ->where('payment_due_at', '>', now()));
                                    });
                            });
                    })
                    ->exists();

                if ($bankDestinationChanged && $hasOpenPayments) {
                    abort(422, 'Rekening tidak dapat diubah saat masih ada tagihan aktif atau bukti pembayaran yang belum diperiksa. QRIS tetap dapat diunggah tanpa mengubah data rekening.');
                }

                $oldQrisImage = $lockedSettings->qris_image;
                $lockedSettings->merchant_name = $request->merchant_name;
                $lockedSettings->bank_name = $request->bank_name;
                $lockedSettings->account_number = $request->account_number;
                $lockedSettings->account_name = $request->account_name;
                if ($newQrisImage) {
                    $lockedSettings->qris_image = $newQrisImage;
                }
                $lockedSettings->save();
            }, 3);
        } catch (\Throwable $exception) {
            if ($newQrisImage) {
                Storage::disk('public')->delete($newQrisImage);
            }
            throw $exception;
        }

        if ($newQrisImage && $oldQrisImage && $oldQrisImage !== $newQrisImage) {
            Storage::disk('public')->delete($oldQrisImage);
        }

        $settings = $settings->fresh();

        return response()->json([
            'message' => 'Pengaturan pembayaran berhasil disimpan.',
            'data' => $this->paymentSettingsPayload($settings),
        ]);
    }

    private function paymentSettingsPayload(PaymentSetting $settings): array
    {
        $qrisAvailable = filled($settings->qris_image)
            && Storage::disk('public')->exists($settings->qris_image);

        return [
            'id' => $settings->id,
            'merchant_name' => $settings->merchant_name,
            'bank_name' => $settings->bank_name,
            'account_number' => $settings->account_number,
            'account_name' => $settings->account_name,
            'qris_available' => $qrisAvailable,
            'qris_endpoint' => $qrisAvailable
                ? '/payment-settings/qris?v=' . optional($settings->updated_at)->timestamp
                : null,
            'updated_at' => $settings->updated_at,
        ];
    }

    // =========================================================================
    // 5. MANAJEMEN KEUANGAN & GAJI GURU (DINAMIS % FEE)
    // =========================================================================

    public function getCommissionSetting()
    {
        $fee = \App\Models\Setting::where('key', 'admin_fee')->value('value') ?? 20;
        return response()->json(['admin_fee' => (int)$fee]);
    }

    public function updateCommissionSetting(Request $request)
    {
        $request->validate([
            'admin_fee' => 'required|numeric|min:0|max:100', 
        ]);

        \App\Models\Setting::firstOrCreate(['key' => 'admin_fee'], ['value' => '20']);
        DB::transaction(function () use ($request) {
            $setting = \App\Models\Setting::query()
                ->where('key', 'admin_fee')
                ->lockForUpdate()
                ->firstOrFail();
            $setting->update(['value' => $request->admin_fee]);
        }, 3);

        return response()->json(['message' => 'Persentase diperbarui. Akan berlaku untuk transaksi MENDATANG.']);
    }

    public function getFinanceData(Request $request)
    {
        Carbon::setLocale('id');
        $currentGlobalFee = (float) (\App\Models\Setting::where('key', 'admin_fee')->value('value') ?? 20);
        $history = Payout::with('user')->latest()->limit(200)->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'name' => $p->user?->name ?? 'Tutor',
                'period' => $p->period,
                'grossAmount' => (float) ($p->gross_amount ?? 0),
                'commissionAmount' => (float) ($p->commission_amount ?? 0),
                'netAmount' => (float) $p->amount,
                'transferDate' => ($p->processed_at ?? $p->created_at)->format('d M Y H:i'),
                'proof_url' => $p->proof_url ? "payouts/{$p->id}/proof" : null,
                'bookingIds' => $p->booking_ids ?? ($p->booking_id ? [$p->booking_id] : []),
                'status' => 'Berhasil',
            ];
        });

        $readyBookings = Booking::query()
            ->whereIn('payout_status', ['ready', 'requested'])
            ->where('status', 'completed')
            ->with(['teacher.teacherProfile', 'participants', 'payoutRequest'])
            ->orderBy('completed_at')
            ->get();

        $pending = $readyBookings
            ->groupBy(fn ($booking) => $booking->payout_request_id
                ? 'request:'.$booking->payout_request_id
                : 'teacher:'.$booking->teacher_id)
            ->map(function ($bookings) {
                $first = $bookings->first();
                $teacher = $first->teacher;
                $profile = $teacher?->teacherProfile;
                $bookingIds = $bookings->pluck('id')->sort()->values()->all();
                $netAmount = (float) $bookings->sum('teacher_net_amount');
                return [
                    'queueKey' => $first->payout_request_id
                        ? 'request:'.$first->payout_request_id
                        : 'teacher:'.$first->teacher_id,
                    'teacherId' => $first->teacher_id,
                    'bookingIds' => $bookingIds,
                    'name' => $teacher?->name ?? 'Tutor',
                    'period' => 'Saldo sampai '.now()->translatedFormat('d M Y'),
                    'totalClasses' => $bookings->count(),
                    'totalStudents' => $bookings->sum(fn ($booking) => max(1, $booking->participants->count())),
                    'grossAmount' => (float) $bookings->sum('gross_amount'),
                    'commissionAmount' => (float) $bookings->sum(
                        fn ($booking) => (float) $booking->gross_amount - (float) $booking->teacher_net_amount
                    ),
                    'netAmount' => $netAmount,
                    'payoutHoldUntil' => $profile?->payout_hold_until,
                    'payoutBlocked' => (bool) $profile?->payout_hold_until?->isFuture(),
                    'request' => optional($bookings->pluck('payoutRequest')->filter()->sortByDesc('requested_at')->first(), fn ($item) => [
                        'id' => $item->id,
                        'status' => $item->status,
                        'requestedAt' => $item->requested_at,
                    ]),
                    'bankDetails' => [
                        'bank' => $profile?->bank_name ?: 'Belum diatur',
                        'number' => $profile?->account_number ?: '-',
                        'name' => $profile?->account_name ?: ($teacher?->name ?? '-'),
                    ],
                ];
            })
            ->values();

        $sevenDaysAgo = Carbon::now()->subDays(7);
        $paidPayouts7Days = Payout::query()
            ->where('status', 'completed')
            ->where('processed_at', '>=', $sevenDaysAgo);
        $readyAmount = (float) Booking::query()
            ->where('status', 'completed')
            ->where('payout_status', 'ready')
            ->sum('teacher_net_amount');
        $requestedAmount = (float) Booking::query()
            ->where('status', 'completed')
            ->where('payout_status', 'requested')
            ->sum('teacher_net_amount');

        return response()->json([
            'pending' => $pending,
            'history' => $history,
            'stats' => [
                'ready_amount' => round($readyAmount, 2),
                'requested_amount' => round($requestedAmount, 2),
                'paid_7days' => round((float) (clone $paidPayouts7Days)->sum('amount'), 2),
                'paid_count_7days' => (clone $paidPayouts7Days)->count(),
                'admin_fee_percent' => $currentGlobalFee,
            ],
        ]);
    }

    public function processPayout(Request $request)
    {
        $validated = $request->validate([
            'teacher_id' => 'required|exists:users,id',
            'booking_ids' => 'required|array|min:1|max:200',
            'booking_ids.*' => 'integer|distinct|exists:bookings,id',
            'proof_file' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $teacher = User::query()
            ->where('role', 'teacher')
            ->with('teacherProfile')
            ->find($validated['teacher_id']);
        if (
            !$teacher
            || blank($teacher->teacherProfile?->bank_name)
            || blank($teacher->teacherProfile?->account_number)
            || blank($teacher->teacherProfile?->account_name)
        ) {
            return response()->json([
                'message' => 'Rekening tutor belum lengkap. Minta tutor memperbarui data rekening sebelum pencairan.',
            ], 422);
        }
        if ($teacher->teacherProfile?->payout_hold_until?->isFuture()) {
            return response()->json([
                'message' => 'Pencairan ditahan sampai '.$teacher->teacherProfile->payout_hold_until
                    ->translatedFormat('d M Y, H:i').' WIB setelah perubahan rekening.',
            ], 422);
        }

        $path = $request->file('proof_file')->store('payout_proofs', 'local');
        try {
            $payout = DB::transaction(function () use (
                $request,
                $validated,
                $path
            ) {
                $profile = TeacherProfile::query()
                    ->where('user_id', $validated['teacher_id'])
                    ->lockForUpdate()
                    ->first();
                if (
                    !$profile
                    || blank($profile->bank_name)
                    || blank($profile->account_number)
                    || blank($profile->account_name)
                ) {
                    abort(422, 'Rekening tutor belum lengkap atau berubah. Muat ulang data sebelum mencairkan.');
                }
                if ($profile->payout_hold_until?->isFuture()) {
                    abort(
                        422,
                        'Pencairan masih ditahan sampai '
                        .$profile->payout_hold_until->translatedFormat('d M Y, H:i')
                        .' WIB.'
                    );
                }

                $bookings = Booking::query()
                    ->where('teacher_id', $validated['teacher_id'])
                    ->whereIn('id', $validated['booking_ids'])
                    ->where('status', 'completed')
                    ->whereIn('payout_status', ['ready', 'requested'])
                    ->lockForUpdate()
                    ->get();

                if ($bookings->count() !== count(array_unique($validated['booking_ids']))) {
                    abort(422, 'Sebagian sesi sudah dicairkan atau belum siap dicairkan.');
                }

                $gross = (float) $bookings->sum('gross_amount');
                $net = (float) $bookings->sum('teacher_net_amount');
                $commission = $gross - $net;
                $bookingIds = $bookings->pluck('id')->sort()->values()->all();
                $payoutRequestIds = $bookings->pluck('payout_request_id')->filter()->unique()->values();
                if ($payoutRequestIds->count() > 1) {
                    abort(422, 'Sesi berasal dari beberapa pengajuan pencairan. Proses setiap pengajuan secara terpisah.');
                }
                $teacherPayoutRequest = $payoutRequestIds->isNotEmpty()
                    ? TeacherPayoutRequest::query()->lockForUpdate()->findOrFail($payoutRequestIds->first())
                    : null;
                if ($teacherPayoutRequest) {
                    $requestBookingIds = collect($teacherPayoutRequest->booking_ids)->map(fn ($id) => (int) $id)->sort()->values()->all();
                    if (
                        $teacherPayoutRequest->status !== 'pending'
                        || (int) $teacherPayoutRequest->teacher_id !== (int) $validated['teacher_id']
                        || $requestBookingIds !== array_map('intval', $bookingIds)
                    ) {
                        abort(422, 'Data pengajuan pencairan telah berubah. Muat ulang halaman keuangan.');
                    }
                }
                $record = Payout::create([
                    'user_id' => $validated['teacher_id'],
                    'amount' => $net,
                    'period' => $bookings->min('completed_at')?->format('d M Y').' - '.now()->format('d M Y'),
                    'total_classes' => $bookings->count(),
                    'proof_url' => $path,
                    'status' => 'completed',
                    'gross_amount' => $gross,
                    'commission_amount' => $commission,
                    'processed_by' => $request->user()->id,
                    'processed_at' => now(),
                    'booking_ids' => $bookingIds,
                    'bank_name' => $profile->bank_name,
                    'account_number' => $profile->account_number,
                    'account_name' => $profile->account_name,
                ]);

                $bookings->each->update([
                    'payout_status' => 'paid',
                ]);
                $teacherPayoutRequest?->update([
                    'status' => 'completed',
                    'payout_id' => $record->id,
                    'processed_at' => now(),
                ]);

                Notification::create([
                    'user_id' => $validated['teacher_id'],
                    'title' => 'Pendapatan telah ditransfer',
                    'message' => 'Admin mencatat pencairan sebesar Rp'.number_format($net, 0, ',', '.').'.',
                    'type' => 'success',
                    'target_url' => '/guru/gaji',
                    'unique_key' => "payout-completed:{$record->id}",
                ]);

                return $record;
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        $payload = $payout->toArray();
        $payload['proof_url'] = "payouts/{$payout->id}/proof";

        return response()->json(['message' => 'Gaji berhasil dicairkan!', 'data' => $payload]);
    }

    public function getDashboardStats(Request $request)
    {
        $admin = $request->user();
        $can = fn (string $permission): bool => $admin->hasAdminPermission($permission);
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();
        $startOfYear = Carbon::now()->startOfYear();

        $canPayments = $can(AdminPermissionCatalog::FINANCE_PAYMENTS);
        $canMatching = $can(AdminPermissionCatalog::MATCHING_MANAGE);
        $canCases = $can(AdminPermissionCatalog::CASES_MANAGE);
        $canRefunds = $can(AdminPermissionCatalog::FINANCE_REFUNDS);
        $canPayouts = $can(AdminPermissionCatalog::FINANCE_PAYOUTS);
        $canTeachers = $can(AdminPermissionCatalog::TEACHERS_MANAGE);
        $canUsers = $can(AdminPermissionCatalog::USERS_MANAGE);

        $revenueToday = $canPayments
            ? Order::where('status', 'paid')->whereDate('verified_at', $today)->sum('amount')
            : 0;
        $revenueMonth = $canPayments
            ? Order::where('status', 'paid')->where('verified_at', '>=', $startOfMonth)->sum('amount')
            : 0;
        $revenueYear = $canPayments
            ? Order::where('status', 'paid')->where('verified_at', '>=', $startOfYear)->sum('amount')
            : 0;

        $pendingTeachers = $canTeachers
            ? User::where('role', 'teacher')->where('status', 'pending')->count()
            : 0;
        $pendingOrders = $canPayments
            ? Order::where('status', 'submitted')->whereNotNull('payment_proof')->count()
            : 0;
        $totalUsers = $canUsers ? User::where('status', 'active')->count() : 0;
        $activeMatching = $canMatching
            ? BookingRequest::query()
                ->whereIn('status', ['matching', 'teacher_pending'])
                ->matchingAnchors()
                ->count()
            : 0;
        $matchingNeedsAttention = $canMatching
            ? BookingRequest::query()
                ->matchingAnchors()
                ->where(function ($query) {
                    $query
                        ->where(function ($noTeacher) {
                            $noTeacher
                                ->where('status', 'no_teacher')
                                ->whereDate('scheduled_date', '>=', today());
                        })
                        ->orWhere(function ($expired) {
                            $expired
                                ->where('status', 'expired')
                                ->whereDate('scheduled_date', '>=', today());
                        })
                        ->orWhere(function ($pending) {
                            $pending
                                ->where('status', 'teacher_pending')
                                ->whereNotNull('teacher_response_deadline')
                                ->where('teacher_response_deadline', '<=', now());
                        })
                        ->orWhere(function ($expiring) {
                            $expiring
                                ->whereIn('status', ['matching', 'teacher_pending'])
                                ->whereNotNull('search_expires_at')
                                ->whereBetween('search_expires_at', [now(), now()->addHours(6)]);
                        });
                })
                ->count()
            : 0;
        $pendingCases = $canCases
            ? SessionReport::where('status', 'pending')->count()
                + BookingDispute::where('status', 'pending')->count()
                + Booking::where('status', 'admin_review_required')->count()
                + TeacherAppeal::where('status', 'pending')->count()
            : 0;
        $pendingRefunds = $canRefunds ? Refund::where('status', 'pending')->count() : 0;
        $pendingPayouts = $canPayouts ? TeacherPayoutRequest::where('status', 'pending')->count() : 0;

        $matchingPreview = $canMatching
            ? BookingRequest::query()
                ->whereIn('status', ['matching', 'teacher_pending', 'no_teacher'])
                ->matchingAnchors()
                ->whereDate('scheduled_date', '>=', $today)
                ->with(['student:id,name', 'matchedTeacher:id,name'])
                ->orderByRaw("CASE status WHEN 'no_teacher' THEN 0 WHEN 'teacher_pending' THEN 1 ELSE 2 END")
                ->orderByRaw('CASE WHEN teacher_response_deadline IS NOT NULL AND teacher_response_deadline <= ? THEN 0 ELSE 1 END', [now()])
                ->orderBy('search_started_at')
                ->limit(5)
                ->get()
                ->map(function (BookingRequest $bookingRequest) {
                    $isOverdue = $bookingRequest->status === 'teacher_pending'
                        && $bookingRequest->teacher_response_deadline?->isPast();
                    $needsAttention = $bookingRequest->status === 'no_teacher' || $isOverdue;

                    return [
                        'id' => $bookingRequest->id,
                        'student_name' => $bookingRequest->student?->name ?? 'Murid',
                        'subject_name' => $bookingRequest->subject_name,
                        'status' => $bookingRequest->status,
                        'status_label' => match ($bookingRequest->status) {
                            'matching' => 'Mencari tutor',
                            'teacher_pending' => $isOverdue ? 'Jawaban tutor terlambat' : 'Menunggu tutor',
                            'no_teacher' => 'Tutor belum ditemukan',
                            default => $bookingRequest->status,
                        },
                        'teacher_name' => $bookingRequest->matchedTeacher?->name,
                        'search_radius_km' => (int) $bookingRequest->search_radius_km,
                        'scheduled_at' => Carbon::parse(
                            $bookingRequest->scheduled_date->format('Y-m-d').' '.$bookingRequest->start_time,
                            config('app.timezone', 'Asia/Jakarta')
                        )->toIso8601String(),
                        'needs_attention' => $needsAttention,
                    ];
                })
                ->values()
            : collect();

        $workQueue = collect([
            $canPayments ? [
                'key' => 'payments',
                'label' => 'Pembayaran murid',
                'description' => 'Bukti pembayaran menunggu pemeriksaan.',
                'count' => $pendingOrders,
                'href' => '/admin/pembayaran',
                'tone' => $pendingOrders > 0 ? 'urgent' : 'normal',
            ] : null,
            $canMatching ? [
                'key' => 'matching',
                'label' => 'Pencarian tutor',
                'description' => 'Permintaan yang perlu dipantau atau disinkronkan.',
                'count' => $matchingNeedsAttention,
                'href' => '/admin/tutor-searches?status=attention',
                'tone' => $matchingNeedsAttention > 0 ? 'urgent' : 'normal',
            ] : null,
            $canCases ? [
                'key' => 'cases',
                'label' => 'Kasus dan keberatan',
                'description' => 'Kasus operasional menunggu keputusan admin.',
                'count' => $pendingCases,
                'href' => '/admin/cases',
                'tone' => $pendingCases > 0 ? 'warning' : 'normal',
            ] : null,
            $canRefunds ? [
                'key' => 'refunds',
                'label' => 'Refund',
                'description' => 'Pengembalian dana menunggu penyelesaian.',
                'count' => $pendingRefunds,
                'href' => '/admin/refunds',
                'tone' => $pendingRefunds > 0 ? 'warning' : 'normal',
            ] : null,
            $canPayouts ? [
                'key' => 'payouts',
                'label' => 'Pencairan tutor',
                'description' => 'Pengajuan tutor menunggu transfer admin.',
                'count' => $pendingPayouts,
                'href' => '/admin/finance',
                'tone' => $pendingPayouts > 0 ? 'warning' : 'normal',
            ] : null,
            $canTeachers ? [
                'key' => 'teachers',
                'label' => 'Verifikasi tutor',
                'description' => 'Akun tutor baru menunggu pemeriksaan.',
                'count' => $pendingTeachers,
                'href' => '/admin/guru',
                'tone' => $pendingTeachers > 0 ? 'warning' : 'normal',
            ] : null,
        ])->filter()
            ->sortByDesc(fn (array $item) => ($item['tone'] === 'urgent' ? 2000 : ($item['tone'] === 'warning' ? 1000 : 0)) + $item['count'])
            ->values();

        return response()->json([
            'revenue' => [
                'today' => (float) $revenueToday,
                'month' => (float) $revenueMonth,
                'year' => (float) $revenueYear,
            ],
            'counts' => [
                'teachers' => $pendingTeachers,
                'orders' => $pendingOrders,
                'users' => $totalUsers,
                'matching_active' => $activeMatching,
                'matching_attention' => $matchingNeedsAttention,
                'cases' => $pendingCases,
                'refunds' => $pendingRefunds,
                'payouts' => $pendingPayouts,
            ],
            'visible_sections' => [
                'payments' => $canPayments,
                'matching' => $canMatching,
                'cases' => $canCases,
                'refunds' => $canRefunds,
                'payouts' => $canPayouts,
                'teachers' => $canTeachers,
                'users' => $canUsers,
            ],
            'work_queue' => $workQueue,
            'matching_preview' => $matchingPreview,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    // =========================================================================
    // 6. FOOTER SETTINGS (ALAMAT & KONTAK SAJA)
    // =========================================================================
    
    public function updateFooterSettings(Request $request)
    {
        $data = $request->validate([
            'footer_address' => 'required|string|max:1000',
            'footer_phone' => ['required', 'string', 'max:16', 'regex:/^\+?[0-9]{8,15}$/'],
            'footer_email' => 'required|email|max:255',
        ], [
            'footer_phone.regex' => 'Nomor telepon atau WhatsApp harus berisi 8–15 angka.',
        ]);

        DB::transaction(function () use ($data) {
            \App\Models\Setting::query()
                ->whereIn('key', array_keys($data))
                ->orderBy('key')
                ->lockForUpdate()
                ->get();
            foreach ($data as $key => $value) {
                \App\Models\Setting::updateOrCreate(
                    ['key' => $key],
                    ['value' => $value]
                );
            }
        }, 3);

        return response()->json(['message' => 'Pengaturan footer berhasil disimpan.']);
    }

    // =========================================================================
    // 7. SOCIAL MEDIA (TABEL TERPISAH)
    // =========================================================================

    public function getSocials()
    {
        $socials = SocialMedia::all()->map(function($item) {
            return [
                'id' => $item->id,
                'name' => $item->name,
                'link' => $item->link,
                'icon_url' => asset('storage/' . $item->icon) 
            ];
        });
        return response()->json($socials);
    }

    public function storeSocial(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'link' => ['required', 'url:http,https', 'max:1000'],
            'icon' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $path = null;
        if ($request->hasFile('icon')) {
            $path = $request->file('icon')->store('social_icons', 'public');
        }

        try {
            $social = SocialMedia::create([
                'name' => trim((string) $request->name),
                'link' => $request->link,
                'icon' => $path,
            ]);
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('public')->delete($path);
            }
            throw $exception;
        }

        return response()->json(['message' => 'Sosmed berhasil ditambah!', 'data' => $social]);
    }

    public function deleteSocial($id)
    {
        $social = SocialMedia::find($id);
        if ($social) {
            $icon = $social->icon;
            $social->delete();
            if ($icon) {
                Storage::disk('public')->delete($icon);
            }
        }
        return response()->json(['message' => 'Sosmed dihapus.']);
    }

    private function orderDetails(Order $order): array
    {
        if (is_array($order->class_details_snapshot)) {
            return $order->class_details_snapshot;
        }

        if (!$order->class_details_snapshot) {
            return [];
        }

        return json_decode((string) $order->class_details_snapshot, true) ?: [];
    }
}
