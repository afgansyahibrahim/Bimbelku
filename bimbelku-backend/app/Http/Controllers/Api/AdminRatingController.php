<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rating;
use App\Models\TeacherPointLedger;
use App\Services\TeacherPointService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminRatingController extends Controller
{
    // 1. Ambil Semua Rating (Terbaru dulu)
    public function index()
    {
        // Load relasi student (pemberi) dan teacher (penerima)
        $ratings = Rating::with(['student', 'teacher'])
                         ->orderBy('created_at', 'desc')
                         ->limit(300)
                         ->get();

        return response()->json([
            'status' => 'success',
            'data' => $ratings->map(function($r) {
                return [
                    'id' => $r->id,
                    'rating' => $r->rating,
                    'review' => $r->review,
                    'created_at' => $r->created_at->format('d M Y, H:i'),
                    'student_name' => $r->student ? $r->student->name : 'User Terhapus',
                    'student_email' => $r->student ? $r->student->email : '-',
                    'teacher_name' => $r->teacher ? $r->teacher->name : 'User Terhapus',
                ];
            })
        ]);
    }

    // 2. Hapus Rating (Moderasi)
    public function destroy(Request $request, int $id, TeacherPointService $pointService)
    {
        DB::transaction(function () use ($request, $id, $pointService) {
            $rating = Rating::query()->lockForUpdate()->find($id);
            if (!$rating) {
                abort(404, 'Data ulasan tidak ditemukan.');
            }

            $pointEntry = TeacherPointLedger::query()
                ->where('teacher_id', $rating->teacher_id)
                ->where('booking_id', $rating->booking_id)
                ->where('actor_id', $rating->student_id)
                ->where('reason', 'rating_'.$rating->rating)
                ->latest('id')
                ->first();

            if ($pointEntry && $pointEntry->change !== 0) {
                $pointService->change(
                    teacherId: $rating->teacher_id,
                    change: -((int) $pointEntry->change),
                    reason: 'Ulasan dihapus admin',
                    booking: $rating->booking,
                    actor: $request->user(),
                    notes: 'Dampak poin dari ulasan #'.$rating->id.' dibatalkan.',
                );
            }

            $rating->delete();
        });

        return response()->json([
            'message' => 'Ulasan dihapus dan perubahan poin terkait telah dibatalkan.',
        ]);
    }
}
