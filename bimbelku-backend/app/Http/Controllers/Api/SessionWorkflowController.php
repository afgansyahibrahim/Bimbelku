<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingDispute;
use App\Models\BookingParticipant;
use App\Models\Notification;
use App\Models\Refund;
use App\Models\SessionReport;
use App\Models\Setting;
use App\Services\TeacherPointService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SessionWorkflowController extends Controller
{
    public function teacherComplete(Request $request, Booking $booking)
    {
        $this->authorizeTeacher($request, $booking);
        $validated = $request->validate([
            'evidence' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'notes' => ['required', 'string', 'min:20', 'max:2000'],
        ]);

        if (!in_array($booking->status, ['confirmed', 'in_progress'], true)) {
            return response()->json(['message' => 'Bukti belum dapat dikirim pada status sesi ini.'], 422);
        }
        if (now()->lt($booking->end_at->copy()->subMinutes(15))) {
            return response()->json(['message' => 'Bukti baru dapat dikirim pada 15 menit terakhir sesi.'], 422);
        }
        if (now()->gt($this->completionUploadDeadline($booking))) {
            return response()->json([
                'message' => 'Masa unggah bukti telah berakhir. Sesi harus diperiksa admin.',
            ], 422);
        }

        $path = $request->file('evidence')->store('session_evidence', 'local');
        $objectionHours = max(1, (int) (Setting::where('key', 'student_objection_hours')->value('value') ?? 48));

        try {
            DB::transaction(function () use ($booking, $validated, $path, $objectionHours) {
                $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);
                if (!in_array($lockedBooking->status, ['confirmed', 'in_progress'], true)) {
                    abort(422, 'Bukti sesi ini sudah diproses atau statusnya telah berubah.');
                }
                if (now()->lt($lockedBooking->end_at->copy()->subMinutes(15))) {
                    abort(422, 'Bukti baru dapat dikirim pada 15 menit terakhir sesi.');
                }
                if (now()->gt($this->completionUploadDeadline($lockedBooking))) {
                    abort(422, 'Masa unggah bukti telah berakhir. Sesi harus diperiksa admin.');
                }

                $lockedBooking->update([
                    'status' => 'awaiting_student_approval',
                    'completion_evidence' => $path,
                    'completion_notes' => $validated['notes'],
                    'completion_submitted_at' => now(),
                    'objection_deadline' => now()->addHours($objectionHours),
                ]);

                $lockedBooking->participants()->where('status', 'paid')->with('bookingRequest')->get()
                    ->each(function (BookingParticipant $participant) {
                        $participant->update(['status' => 'awaiting_student_approval']);
                        $participant->bookingRequest?->update(['status' => 'awaiting_student_approval']);

                        Notification::create([
                            'user_id' => $participant->student_id,
                            'title' => 'Bukti sesi telah dikirim',
                            'message' => 'Periksa bukti pelaksanaan. Persetujuan atau keberatan dapat diberikan dalam dua hari.',
                            'type' => 'info',
                        ]);
                    });
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Bukti sesi berhasil dikirim. Masa tanggapan murid berlangsung selama dua hari.',
        ]);
    }

    public function reportStudentAbsence(Request $request, Booking $booking)
    {
        $this->authorizeTeacher($request, $booking);
        $validated = $request->validate([
            'student_id' => ['nullable', 'integer', 'exists:users,id'],
            'chronology' => ['required', 'string', 'min:30', 'max:2500'],
            'evidence' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        if (!in_array($booking->status, ['confirmed', 'in_progress'], true)) {
            return response()->json(['message' => 'Ketidakhadiran tidak dapat dilaporkan pada status ini.'], 422);
        }
        if (now()->lt($booking->start_at->copy()->addMinutes(15))) {
            return response()->json([
                'message' => 'Laporan dapat dibuat setelah murid terlambat lebih dari 15 menit.',
            ], 422);
        }

        $participant = $this->reportedParticipant($booking, $validated['student_id'] ?? null);
        $path = $request->file('evidence')->store('absence_evidence', 'local');

        try {
            $report = DB::transaction(function () use ($request, $booking, $participant, $validated, $path) {
                $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);
                if (!in_array($lockedBooking->status, ['confirmed', 'in_progress'], true)) {
                    abort(422, 'Ketidakhadiran tidak dapat dilaporkan pada status ini.');
                }
                if (now()->lt($lockedBooking->start_at->copy()->addMinutes(15))) {
                    abort(422, 'Laporan dapat dibuat setelah murid terlambat lebih dari 15 menit.');
                }

                $lockedParticipant = $lockedBooking->participants()
                    ->where('id', $participant->id)
                    ->where('status', 'paid')
                    ->lockForUpdate()
                    ->firstOrFail();
                if ($lockedBooking->reports()
                    ->where('type', 'student_absence')
                    ->where('reported_student_id', $lockedParticipant->student_id)
                    ->where('status', 'pending')
                    ->exists()) {
                    abort(422, 'Laporan murid ini sedang diperiksa admin.');
                }

                $report = SessionReport::create([
                    'booking_id' => $lockedBooking->id,
                    'teacher_id' => $request->user()->id,
                    'reported_by' => $request->user()->id,
                    'reported_student_id' => $lockedParticipant->student_id,
                    'type' => 'student_absence',
                    'chronology' => $validated['chronology'],
                    'incident_at' => now(),
                    'evidence' => $path,
                    'status' => 'pending',
                ]);

                $lockedParticipant->update(['status' => 'absence_review']);
                $lockedParticipant->bookingRequest?->update(['status' => 'absence_review']);
                if ($lockedBooking->class_type === 'private') {
                    $lockedBooking->update(['status' => 'absence_review']);
                }

                Notification::create([
                    'user_id' => $lockedParticipant->student_id,
                    'title' => 'Ketidakhadiran dilaporkan',
                    'message' => 'Tutor melaporkan ketidakhadiran Anda. Admin akan memeriksa kronologi dan bukti.',
                    'type' => 'warning',
                ]);

                return $report;
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Laporan ketidakhadiran berhasil dikirim untuk pemeriksaan admin.',
            'data' => $report,
        ], 201);
    }

    public function reportEmergency(Request $request, Booking $booking)
    {
        $this->authorizeTeacher($request, $booking);
        $validated = $request->validate([
            'incident_type' => ['required', 'string', 'max:120'],
            'chronology' => ['required', 'string', 'min:50', 'max:3000'],
            'incident_at' => ['required', 'date', 'before_or_equal:now'],
            'incident_location' => ['required', 'string', 'max:500'],
            'impact' => ['required', 'string', 'min:20', 'max:1500'],
            'evidence' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        if (in_array($booking->status, [
            'completed', 'refunded', 'cancelled', 'emergency_refund_pending',
            'refund_pending', 'partially_refunded', 'payment_expired',
        ], true)) {
            return response()->json(['message' => 'Sesi ini sudah ditutup.'], 422);
        }
        if ($booking->reports()->where('type', 'teacher_emergency')->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'Laporan keadaan darurat sesi ini sedang diperiksa.'], 422);
        }

        $path = $request->file('evidence')->store('emergency_evidence', 'local');

        try {
            $report = DB::transaction(function () use ($request, $booking, $validated, $path) {
                $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);
                if (in_array($lockedBooking->status, [
                    'completed', 'refunded', 'cancelled', 'emergency_refund_pending',
                    'refund_pending', 'partially_refunded', 'payment_expired',
                ], true)) {
                    abort(422, 'Sesi ini sudah ditutup.');
                }
                if ($lockedBooking->reports()
                    ->where('type', 'teacher_emergency')
                    ->where('status', 'pending')
                    ->exists()) {
                    abort(422, 'Laporan keadaan darurat sesi ini sedang diperiksa.');
                }

                $report = SessionReport::create([
                    'booking_id' => $lockedBooking->id,
                    'teacher_id' => $request->user()->id,
                    'reported_by' => $request->user()->id,
                    'type' => 'teacher_emergency',
                    'incident_type' => $validated['incident_type'],
                    'chronology' => $validated['chronology'],
                    'incident_at' => $validated['incident_at'],
                    'incident_location' => $validated['incident_location'],
                    'impact' => $validated['impact'],
                    'evidence' => $path,
                    'status' => 'pending',
                ]);

                $lockedBooking->update([
                    'status' => 'emergency_refund_pending',
                    'payout_status' => 'cancelled',
                ]);

                $lockedBooking->participants()
                    ->with(['order', 'bookingRequest'])
                    ->lockForUpdate()
                    ->get()
                    ->each(function (BookingParticipant $participant) use ($lockedBooking) {
                        if ($participant->order?->status === 'paid') {
                            $this->queueRefund(
                                $participant,
                                $lockedBooking,
                                'Keadaan darurat tutor'
                            );
                        } else {
                            $participant->order?->update(['status' => 'cancelled']);
                            $participant->update(['status' => 'cancelled']);
                            $participant->bookingRequest?->update(['status' => 'cancelled']);
                        }

                        Notification::create([
                            'user_id' => $participant->student_id,
                            'title' => 'Sesi dibatalkan karena keadaan darurat',
                            'message' => $participant->order?->status === 'refund_pending'
                                ? 'Refund penuh sedang diproses admin.'
                                : 'Tagihan dibatalkan dan tidak perlu dibayar.',
                            'type' => 'warning',
                        ]);
                    });

                return $report;
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Keadaan darurat tercatat. Refund penuh murid langsung masuk antrean admin.',
            'data' => $report,
        ], 201);
    }

    public function studentApprove(Request $request, Booking $booking)
    {
        $participant = $this->studentParticipant($request, $booking);

        if ($participant->approved_at || $participant->status === 'approved') {
            return response()->json(['message' => 'Penyelesaian sesi sudah disetujui.'], 422);
        }
        if ($participant->status !== 'awaiting_student_approval') {
            return response()->json(['message' => 'Peserta ini tidak sedang menunggu keputusan penyelesaian.'], 422);
        }
        if ($booking->status !== 'awaiting_student_approval') {
            return response()->json(['message' => 'Sesi belum menunggu persetujuan Anda.'], 422);
        }
        if ($booking->objection_deadline?->isPast()) {
            return response()->json([
                'message' => 'Masa keputusan sudah berakhir dan bukti akan diperiksa admin.',
            ], 422);
        }

        DB::transaction(function () use ($request, $booking) {
            $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);
            $lockedParticipant = $lockedBooking->participants()
                ->where('student_id', $request->user()->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $lockedBooking->status !== 'awaiting_student_approval'
                || $lockedParticipant->status !== 'awaiting_student_approval'
                || $lockedParticipant->approved_at
            ) {
                abort(422, 'Penyelesaian sesi ini sudah diproses atau statusnya telah berubah.');
            }
            if ($lockedBooking->objection_deadline?->isPast()) {
                abort(422, 'Masa keputusan sudah berakhir dan bukti akan diperiksa admin.');
            }

            $lockedParticipant->update(['status' => 'approved', 'approved_at' => now()]);
            $lockedParticipant->bookingRequest?->update(['status' => 'completed']);
            $this->finalizeBookingIfSettled($lockedBooking);
        });

        return response()->json([
            'message' => 'Sesi disetujui dan tidak dapat diajukan keberatan kembali.',
        ]);
    }

    public function studentDispute(Request $request, Booking $booking)
    {
        $participant = $this->studentParticipant($request, $booking);
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:30', 'max:3000'],
            'evidence' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        if ($participant->approved_at) {
            return response()->json([
                'message' => 'Keberatan tidak dapat diajukan setelah penyelesaian disetujui.',
            ], 422);
        }
        if ($participant->status !== 'awaiting_student_approval') {
            return response()->json(['message' => 'Peserta ini tidak sedang menunggu keputusan penyelesaian.'], 422);
        }
        if ($booking->status !== 'awaiting_student_approval') {
            return response()->json(['message' => 'Sesi belum dapat diajukan keberatan.'], 422);
        }
        if ($booking->objection_deadline?->isPast()) {
            return response()->json(['message' => 'Masa pengajuan keberatan sudah berakhir.'], 422);
        }

        $path = $request->hasFile('evidence')
            ? $request->file('evidence')->store('dispute_evidence', 'local')
            : null;

        try {
            $dispute = DB::transaction(function () use ($request, $booking, $validated, $path) {
                $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);
                $lockedParticipant = $lockedBooking->participants()
                    ->where('student_id', $request->user()->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if (
                    $lockedBooking->status !== 'awaiting_student_approval'
                    || $lockedParticipant->status !== 'awaiting_student_approval'
                    || $lockedParticipant->approved_at
                ) {
                    abort(422, 'Keberatan tidak dapat dibuat karena status sesi telah berubah.');
                }
                if ($lockedBooking->objection_deadline?->isPast()) {
                    abort(422, 'Masa pengajuan keberatan sudah berakhir.');
                }
                if (BookingDispute::query()
                    ->where('booking_id', $lockedBooking->id)
                    ->where('student_id', $request->user()->id)
                    ->exists()) {
                    abort(422, 'Keberatan untuk sesi ini sudah pernah dikirim.');
                }

                $dispute = BookingDispute::create([
                    'booking_id' => $lockedBooking->id,
                    'student_id' => $request->user()->id,
                    'reason' => $validated['reason'],
                    'evidence' => $path,
                    'status' => 'pending',
                ]);
                $lockedParticipant->update(['status' => 'disputed']);
                $lockedParticipant->bookingRequest?->update(['status' => 'disputed']);
                $lockedBooking->update(['status' => 'disputed', 'payout_status' => 'locked']);

                Notification::create([
                    'user_id' => $lockedBooking->teacher_id,
                    'title' => 'Murid mengajukan keberatan',
                    'message' => 'Pencairan ditahan sampai admin menyelesaikan pemeriksaan.',
                    'type' => 'warning',
                ]);

                return $dispute;
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return response()->json([
            'message' => 'Keberatan berhasil dikirim. Dana tutor ditahan selama pemeriksaan.',
            'data' => $dispute,
        ], 201);
    }

    public function reportTeacherAbsence(Request $request, Booking $booking)
    {
        $participant = $this->studentParticipant($request, $booking);
        $validated = $request->validate([
            'chronology' => ['required', 'string', 'min:30', 'max:2500'],
            'evidence' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        if (!in_array($booking->status, ['confirmed', 'in_progress'], true)) {
            return response()->json(['message' => 'Ketidakhadiran tutor tidak dapat dilaporkan pada status ini.'], 422);
        }
        if (now()->lt($booking->start_at->copy()->addMinutes(15))) {
            return response()->json([
                'message' => 'Laporan dapat dibuat setelah tutor terlambat lebih dari 15 menit.',
            ], 422);
        }
        if ($booking->reports()->where('type', 'teacher_absence')->where('reported_by', $request->user()->id)->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'Laporan Anda sedang diperiksa admin.'], 422);
        }

        $path = $request->file('evidence')->store('teacher_absence_evidence', 'local');
        try {
            $report = DB::transaction(function () use ($request, $booking, $participant, $validated, $path) {
                $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);
                if (!in_array($lockedBooking->status, ['confirmed', 'in_progress'], true)) {
                    abort(422, 'Ketidakhadiran tutor tidak dapat dilaporkan pada status ini.');
                }
                if (now()->lt($lockedBooking->start_at->copy()->addMinutes(15))) {
                    abort(422, 'Laporan dapat dibuat setelah tutor terlambat lebih dari 15 menit.');
                }
                if ($lockedBooking->reports()
                    ->where('type', 'teacher_absence')
                    ->where('reported_by', $request->user()->id)
                    ->where('status', 'pending')
                    ->exists()) {
                    abort(422, 'Laporan Anda sedang diperiksa admin.');
                }

                $lockedParticipant = $lockedBooking->participants()
                    ->where('id', $participant->id)
                    ->lockForUpdate()
                    ->firstOrFail();
                $report = SessionReport::create([
                    'booking_id' => $lockedBooking->id,
                    'teacher_id' => $lockedBooking->teacher_id,
                    'reported_by' => $request->user()->id,
                    'type' => 'teacher_absence',
                    'chronology' => $validated['chronology'],
                    'incident_at' => now(),
                    'evidence' => $path,
                    'status' => 'pending',
                ]);
                $lockedParticipant->update(['status' => 'teacher_absence_review']);
                $lockedParticipant->bookingRequest?->update(['status' => 'teacher_absence_review']);
                $lockedBooking->update([
                    'status' => 'absence_review',
                    'payout_status' => 'locked',
                ]);

                Notification::create([
                    'user_id' => $lockedBooking->teacher_id,
                    'title' => 'Ketidakhadiran Anda dilaporkan',
                    'message' => 'Murid mengirim kronologi dan bukti. Admin akan memeriksa laporan sebelum memutus refund dan sanksi.',
                    'type' => 'warning',
                ]);

                return $report;
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Laporan ketidakhadiran tutor berhasil dikirim untuk pemeriksaan admin.',
            'data' => $report,
        ], 201);
    }

    public function adminCases()
    {
        return response()->json([
            'session_reports' => SessionReport::query()
                ->where('status', 'pending')
                ->with(['booking.teacher', 'reportedStudent', 'reporter', 'teacher'])
                ->latest()
                ->limit(200)
                ->get(),
            'disputes' => BookingDispute::query()
                ->where('status', 'pending')
                ->with(['booking.teacher', 'student'])
                ->latest()
                ->limit(200)
                ->get(),
            'completion_reviews' => Booking::query()
                ->where('status', 'admin_review_required')
                ->with(['teacher', 'participants.student'])
                ->latest('admin_review_required_at')
                ->limit(200)
                ->get(),
            'refunds' => Refund::query()
                ->where('status', 'pending')
                ->with(['user', 'booking.teacher', 'order'])
                ->latest()
                ->limit(200)
                ->get(),
        ]);
    }

    public function resolveDispute(
        Request $request,
        BookingDispute $bookingDispute,
        TeacherPointService $pointService
    ) {
        $validated = $request->validate([
            'resolution' => ['required', Rule::in(['student_refund', 'teacher_paid'])],
            'notes' => ['required', 'string', 'min:20', 'max:2000'],
            'penalty_points' => ['nullable', Rule::in([5, 10, 15, 20, 30])],
        ]);

        if ($bookingDispute->status !== 'pending') {
            return response()->json(['message' => 'Keberatan ini sudah diputuskan.'], 422);
        }

        DB::transaction(function () use ($request, $bookingDispute, $validated, $pointService) {
            $lockedDispute = BookingDispute::query()
                ->lockForUpdate()
                ->findOrFail($bookingDispute->id);
            if ($lockedDispute->status !== 'pending') {
                abort(422, 'Keberatan ini sudah diputuskan.');
            }

            $booking = $lockedDispute->booking()->lockForUpdate()->firstOrFail();
            $participant = $booking->participants()
                ->where('student_id', $lockedDispute->student_id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedDispute->update([
                'status' => 'resolved',
                'resolution' => $validated['resolution'],
                'resolution_notes' => $validated['notes'],
                'resolved_by' => $request->user()->id,
                'resolved_at' => now(),
            ]);

            if ($validated['resolution'] === 'student_refund') {
                $this->queueRefund($participant, $booking, 'Keberatan murid disetujui');
                $booking->update([
                    'status' => $booking->class_type === 'private'
                        ? 'refund_pending'
                        : 'awaiting_student_approval',
                    'payout_status' => 'locked',
                ]);
                $pointService->change(
                    $booking->teacher_id,
                    -((int) ($validated['penalty_points'] ?? 10)),
                    'Keberatan murid disetujui',
                    $booking,
                    $request->user(),
                    $validated['notes']
                );
            } else {
                $participant->update(['status' => 'approved', 'approved_at' => now()]);
                $participant->bookingRequest?->update(['status' => 'completed']);
                $this->finalizeBookingIfSettled($booking);
            }

            Notification::create([
                'user_id' => $lockedDispute->student_id,
                'title' => 'Keberatan telah diputuskan',
                'message' => $validated['resolution'] === 'student_refund'
                    ? 'Keberatan disetujui. Refund penuh masuk antrean transfer.'
                    : 'Bukti tutor dinyatakan memadai dan pembayaran diteruskan.',
                'type' => 'info',
            ]);
        });

        return response()->json(['message' => 'Keputusan keberatan berhasil disimpan.']);
    }

    public function resolveReport(
        Request $request,
        SessionReport $sessionReport,
        TeacherPointService $pointService
    ) {
        $validated = $request->validate([
            'decision' => ['required', Rule::in(['accepted', 'rejected'])],
            'notes' => ['required', 'string', 'min:20', 'max:2000'],
            'penalty_points' => ['nullable', Rule::in([5, 10, 15, 20, 30])],
        ]);

        if ($sessionReport->status !== 'pending') {
            return response()->json(['message' => 'Laporan ini sudah diperiksa.'], 422);
        }

        DB::transaction(function () use ($request, $sessionReport, $validated, $pointService) {
            $lockedReport = SessionReport::query()
                ->lockForUpdate()
                ->findOrFail($sessionReport->id);
            if ($lockedReport->status !== 'pending') {
                abort(422, 'Laporan ini sudah diperiksa.');
            }

            $booking = $lockedReport->booking()->lockForUpdate()->firstOrFail();
            $accepted = $validated['decision'] === 'accepted';
            $lockedReport->update([
                'status' => $validated['decision'],
                'reviewed_by' => $request->user()->id,
                'review_notes' => $validated['notes'],
                'reviewed_at' => now(),
            ]);

            if ($lockedReport->type === 'teacher_emergency') {
                if (!$accepted) {
                    $pointService->change(
                        $booking->teacher_id,
                        -((int) ($validated['penalty_points'] ?? 20)),
                        'Laporan keadaan darurat ditolak',
                        $booking,
                        $request->user(),
                        $validated['notes']
                    );
                }
                Notification::create([
                    'user_id' => $booking->teacher_id,
                    'title' => 'Laporan keadaan darurat diperiksa',
                    'message' => $accepted
                        ? 'Laporan keadaan darurat diterima. Refund peserta tetap diproses.'
                        : 'Laporan keadaan darurat ditolak. Refund peserta tetap diproses dan sanksi poin diterapkan.',
                    'type' => $accepted ? 'info' : 'warning',
                ]);
                return;
            }

            if ($lockedReport->type === 'teacher_absence') {
                $participant = $booking->participants()
                    ->where('student_id', $lockedReport->reported_by)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($accepted) {
                    // Satu kejadian dapat dilaporkan beberapa murid kelompok.
                    // Semua laporan sejawat ditutup bersama agar refund dan
                    // sanksi tutor hanya diproses satu kali.
                    SessionReport::query()
                        ->where('booking_id', $booking->id)
                        ->where('type', 'teacher_absence')
                        ->where('status', 'pending')
                        ->lockForUpdate()
                        ->get()
                        ->each->update([
                            'status' => 'accepted',
                            'reviewed_by' => $request->user()->id,
                            'review_notes' => 'Diselesaikan bersama laporan #'.$lockedReport->id
                                .': '.$validated['notes'],
                            'reviewed_at' => now(),
                        ]);

                    $booking->participants()
                        ->with(['order', 'bookingRequest'])
                        ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
                        ->get()
                        ->each(function (BookingParticipant $affected) use ($booking) {
                            $this->queueRefund($affected, $booking, 'Tutor tidak hadir');
                            Notification::create([
                                'user_id' => $affected->student_id,
                                'title' => 'Refund ketidakhadiran tutor',
                                'message' => 'Laporan diterima. Refund penuh masuk antrean transfer admin.',
                                'type' => 'success',
                            ]);
                        });
                    $booking->update([
                        'status' => 'refund_pending',
                        'payout_status' => 'cancelled',
                    ]);
                    $pointService->change(
                        $booking->teacher_id,
                        -((int) ($validated['penalty_points'] ?? 20)),
                        'Tutor tidak hadir',
                        $booking,
                        $request->user(),
                        $validated['notes']
                    );
                } else {
                    $restoredStatus = $this->restoredStatusAfterReport($booking);
                    $otherPendingReports = SessionReport::query()
                        ->where('booking_id', $booking->id)
                        ->where('type', 'teacher_absence')
                        ->where('status', 'pending')
                        ->lockForUpdate()
                        ->get()
                        ->isNotEmpty();
                    $participantStatus = $booking->completion_evidence
                        ? 'awaiting_student_approval'
                        : 'paid';
                    $participant->update(['status' => $participantStatus]);
                    $participant->bookingRequest?->update(['status' => $restoredStatus]);
                    $booking->update([
                        'status' => $otherPendingReports ? 'absence_review' : $restoredStatus,
                        'payout_status' => $otherPendingReports
                            ? 'locked'
                            : $booking->payout_status,
                        'admin_review_required_at' => !$otherPendingReports
                            && $restoredStatus === 'admin_review_required'
                            ? now()
                            : null,
                    ]);
                }

                if (!$accepted) {
                    Notification::create([
                        'user_id' => $lockedReport->reported_by,
                        'title' => 'Laporan ketidakhadiran tutor diputuskan',
                        'message' => $otherPendingReports
                            ? 'Laporan Anda belum terbukti. Laporan peserta lain pada sesi yang sama masih diperiksa.'
                            : 'Laporan belum terbukti. Sesi dikembalikan ke proses pelaksanaan.',
                        'type' => 'info',
                    ]);
                }
                return;
            }

            $participant = $booking->participants()
                ->where('student_id', $lockedReport->reported_student_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($accepted) {
                $participant->update(['status' => 'no_show_confirmed', 'approved_at' => now()]);
                $participant->bookingRequest?->update(['status' => 'completed']);
                $otherParticipantsStillActive = $booking->participants()
                    ->where('id', '!=', $participant->id)
                    ->whereIn('status', ['paid', 'awaiting_student_approval', 'admin_review_required'])
                    ->exists();

                if ($booking->class_type === 'group' && $otherParticipantsStillActive) {
                    $restoredStatus = $this->restoredStatusAfterReport($booking);
                    $booking->update([
                        'status' => $restoredStatus,
                        'admin_review_required_at' => $restoredStatus === 'admin_review_required'
                            ? now()
                            : null,
                    ]);
                } else {
                    $this->finalizeBookingIfSettled($booking);
                }
            } else {
                $restoredStatus = $this->restoredStatusAfterReport($booking);
                $participant->update([
                    'status' => $booking->completion_evidence
                        ? 'awaiting_student_approval'
                        : 'paid',
                ]);
                $participant->bookingRequest?->update(['status' => $restoredStatus]);
                $booking->update([
                    'status' => $restoredStatus,
                    'admin_review_required_at' => $restoredStatus === 'admin_review_required'
                        ? now()
                        : null,
                ]);
                $pointService->change(
                    $booking->teacher_id,
                    -((int) ($validated['penalty_points'] ?? 5)),
                    'Laporan ketidakhadiran tidak terbukti',
                    $booking,
                    $request->user(),
                    $validated['notes']
                );
            }

            Notification::create([
                'user_id' => $participant->student_id,
                'title' => 'Laporan ketidakhadiran murid diputuskan',
                'message' => $accepted
                    ? 'Laporan diterima. Pembayaran sesi dinyatakan hangus sesuai kebijakan.'
                    : 'Laporan ditolak. Status keikutsertaan Anda dikembalikan.',
                'type' => $accepted ? 'warning' : 'info',
            ]);
            Notification::create([
                'user_id' => $booking->teacher_id,
                'title' => 'Laporan ketidakhadiran murid diputuskan',
                'message' => $accepted
                    ? 'Laporan diterima dan pembayaran murid dihitung sebagai pendapatan sesi.'
                    : 'Laporan ditolak dan sanksi poin diterapkan.',
                'type' => $accepted ? 'success' : 'warning',
            ]);
        });

        return response()->json(['message' => 'Hasil pemeriksaan laporan berhasil disimpan.']);
    }

    public function resolveCompletionReview(Request $request, Booking $booking)
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'refund'])],
            'notes' => ['required', 'string', 'min:20', 'max:2000'],
        ]);

        if ($booking->status !== 'admin_review_required') {
            return response()->json(['message' => 'Sesi ini tidak menunggu pemeriksaan admin.'], 422);
        }

        DB::transaction(function () use ($booking, $validated) {
            $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);
            if ($lockedBooking->status !== 'admin_review_required') {
                abort(422, 'Sesi ini tidak menunggu pemeriksaan admin.');
            }

            $lockedBooking->participants()->whereIn('status', [
                'paid',
                'awaiting_student_approval',
                'admin_review_required',
            ])
                ->with(['bookingRequest', 'order'])
                ->lockForUpdate()
                ->get()
                ->each(function (BookingParticipant $participant) use ($lockedBooking, $validated) {
                    if ($validated['action'] === 'approve') {
                        $participant->update(['status' => 'approved', 'approved_at' => now()]);
                        $participant->bookingRequest?->update(['status' => 'completed']);
                    } else {
                        $this->queueRefund(
                            $participant,
                            $lockedBooking,
                            'Pemeriksaan bukti oleh admin'
                        );
                    }
                });

            if ($validated['action'] === 'approve') {
                $this->finalizeBookingIfSettled($lockedBooking);
            } else {
                $lockedBooking->update([
                    'status' => 'refund_pending',
                    'payout_status' => 'cancelled',
                ]);
            }
        });

        return response()->json(['message' => 'Pemeriksaan bukti sesi berhasil diselesaikan.']);
    }

    public function completeRefund(Request $request, Refund $refund)
    {
        $validated = $request->validate([
            'proof' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $refund->loadMissing('order');
        if (
            blank($refund->order?->bank_name)
            || blank($refund->order?->sender_name)
            || blank($refund->order?->sender_account_number)
        ) {
            return response()->json([
                'message' => 'Tujuan refund belum lengkap. Hubungi murid untuk memastikan bank, nama pemilik, dan nomor rekening/e-wallet.',
            ], 422);
        }

        $path = $request->file('proof')->store('refund_proofs', 'local');

        try {
            DB::transaction(function () use ($request, $refund, $validated, $path) {
                $lockedRefund = Refund::query()
                    ->with(['order.participant.bookingRequest', 'booking'])
                    ->lockForUpdate()
                    ->findOrFail($refund->id);

                if ($lockedRefund->status !== 'pending') {
                    abort(422, 'Refund ini sudah diproses.');
                }

                $lockedRefund->update([
                    'status' => 'paid',
                    'proof' => $path,
                    'processed_by' => $request->user()->id,
                    'processed_at' => now(),
                    'notes' => $validated['notes'] ?? null,
                ]);
                $lockedRefund->order->update(['status' => 'refunded']);
                $participant = $lockedRefund->order->participant;
                $participant?->update(['status' => 'refunded']);
                $participant?->bookingRequest?->update(['status' => 'refunded']);

                $remainingRefunds = $lockedRefund->booking?->refunds()->where('status', 'pending')->count() ?? 0;
                if ($lockedRefund->booking && $remainingRefunds === 0) {
                    $settledStatuses = [
                        'approved', 'no_show_confirmed', 'refunded', 'cancelled', 'teacher_rejected',
                    ];
                    $unsettled = $lockedRefund->booking->participants()
                        ->whereNotIn('status', $settledStatuses)
                        ->exists();
                    $earningParticipants = $lockedRefund->booking->participants()
                        ->whereIn('status', ['approved', 'no_show_confirmed'])
                        ->count();
                    $gross = $earningParticipants * (float) $lockedRefund->booking->total_amount;
                    $net = round(
                        $gross * (100 - (float) $lockedRefund->booking->commission_percent) / 100
                    );

                    $lockedRefund->booking->update([
                        'status' => $unsettled
                            ? 'partially_refunded'
                            : ($earningParticipants > 0 ? 'completed' : 'refunded'),
                        'gross_amount' => $gross,
                        'teacher_net_amount' => $net,
                        'payout_status' => $unsettled
                            ? 'locked'
                            : ($earningParticipants > 0 ? 'ready' : 'cancelled'),
                    ]);
                }

                Notification::create([
                    'user_id' => $lockedRefund->user_id,
                    'title' => 'Refund telah ditransfer',
                    'message' => 'Refund penuh telah dikirim oleh admin. Bukti transfer tersedia pada riwayat transaksi.',
                    'type' => 'success',
                ]);
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json(['message' => 'Refund ditandai telah ditransfer.']);
    }

    private function authorizeTeacher(Request $request, Booking $booking): void
    {
        abort_unless((int) $booking->teacher_id === (int) $request->user()->id, 403);
    }

    private function studentParticipant(Request $request, Booking $booking): BookingParticipant
    {
        return $booking->participants()
            ->where('student_id', $request->user()->id)
            ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
            ->firstOrFail();
    }

    private function reportedParticipant(Booking $booking, ?int $studentId): BookingParticipant
    {
        if ($booking->class_type === 'group' && !$studentId) {
            abort(422, 'Murid yang tidak hadir wajib dipilih.');
        }

        return $booking->participants()
            ->where('student_id', $studentId ?? $booking->student_id)
            ->where('status', 'paid')
            ->firstOrFail();
    }

    private function queueRefund(
        BookingParticipant $participant,
        Booking $booking,
        string $reason
    ): ?Refund {
        $order = $participant->order;
        if (!$order || $order->status !== 'paid') {
            return null;
        }

        $refund = Refund::firstOrCreate(
            ['order_id' => $order->id],
            [
                'user_id' => $participant->student_id,
                'booking_id' => $booking->id,
                'amount' => $order->amount,
                'reason' => $reason,
                'status' => 'pending',
            ]
        );
        $order->update(['status' => 'refund_pending']);
        $participant->update(['status' => 'refund_pending']);
        $participant->bookingRequest?->update(['status' => 'refund_pending']);
        $this->refreshBookingAmounts($booking);

        return $refund;
    }

    private function refreshBookingAmounts(Booking $booking): void
    {
        $gross = (float) $booking->participants()
            ->whereHas('order', fn ($query) => $query->where('status', 'paid'))
            ->sum('amount');
        $net = round($gross * (100 - (float) $booking->commission_percent) / 100);

        $booking->update([
            'gross_amount' => $gross,
            'teacher_net_amount' => $net,
        ]);
    }

    private function finalizeBookingIfSettled(Booking $booking): void
    {
        $booking->refresh();
        $unsettled = $booking->participants()
            ->whereNotIn('status', [
                'approved', 'no_show_confirmed', 'refunded', 'cancelled', 'teacher_rejected',
            ])
            ->exists();

        if ($unsettled) {
            $booking->update(['status' => 'awaiting_student_approval']);
            return;
        }

        $earningParticipants = $booking->participants()
            ->whereIn('status', ['approved', 'no_show_confirmed'])
            ->count();
        $gross = $earningParticipants * (float) $booking->total_amount;
        $net = round($gross * (100 - (float) $booking->commission_percent) / 100);

        $booking->update([
            'status' => $earningParticipants > 0 ? 'completed' : 'refunded',
            'completed_at' => now(),
            'student_approved_at' => now(),
            'gross_amount' => $gross,
            'teacher_net_amount' => $net,
            'payout_status' => $earningParticipants > 0 ? 'ready' : 'cancelled',
        ]);
        $booking->order?->classroom?->sessions()->update(['is_completed' => true]);

        Notification::create([
            'user_id' => $booking->teacher_id,
            'title' => 'Sesi selesai',
            'message' => $earningParticipants > 0
                ? 'Penyelesaian disahkan. Pendapatan siap masuk proses pencairan admin.'
                : 'Sesi ditutup tanpa pendapatan tutor.',
            'type' => 'success',
        ]);
    }

    private function restoredStatusAfterReport(Booking $booking): string
    {
        if ($booking->completion_evidence) {
            return 'awaiting_student_approval';
        }

        if (now()->lt($booking->start_at)) {
            return 'confirmed';
        }

        if (now()->lt($booking->end_at)) {
            return 'in_progress';
        }

        $completionGraceMinutes = max(
            15,
            (int) (Setting::where('key', 'completion_upload_grace_minutes')->value('value') ?? 120)
        );

        return now()->lte($booking->end_at->copy()->addMinutes($completionGraceMinutes))
            ? 'confirmed'
            : 'admin_review_required';
    }

    private function completionUploadDeadline(Booking $booking): Carbon
    {
        $completionGraceMinutes = max(
            15,
            (int) (Setting::where('key', 'completion_upload_grace_minutes')->value('value') ?? 120)
        );

        return $booking->end_at->copy()->addMinutes($completionGraceMinutes);
    }
}
