<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingDispute;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Refund;
use App\Models\SessionReport;
use App\Models\TicketReply;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProtectedFileController extends Controller
{
    public function paymentProof(Request $request, Order $order)
    {
        $this->authorizeOrder($request, $order);

        return $this->respond($order->payment_proof);
    }

    public function completionEvidence(Request $request, Booking $booking)
    {
        $this->authorizeBooking($request, $booking);

        return $this->respond($booking->completion_evidence);
    }

    public function reportEvidence(Request $request, SessionReport $sessionReport)
    {
        $user = $request->user();
        $allowed = $user->role === 'admin'
            || (int) $sessionReport->reported_by === (int) $user->id
            || (
                $sessionReport->type === 'student_absence'
                && (
                    (int) $sessionReport->teacher_id === (int) $user->id
                    || (int) $sessionReport->reported_student_id === (int) $user->id
                )
            )
            || (
                in_array($sessionReport->type, ['teacher_absence', 'teacher_emergency'], true)
                && (int) $sessionReport->teacher_id === (int) $user->id
            );
        abort_unless($allowed, 403);

        return $this->respond($sessionReport->evidence);
    }

    public function disputeEvidence(Request $request, BookingDispute $bookingDispute)
    {
        $user = $request->user();
        $allowed = $user->role === 'admin'
            || (int) $bookingDispute->student_id === (int) $user->id
            || (int) $bookingDispute->booking?->teacher_id === (int) $user->id;
        abort_unless($allowed, 403);

        return $this->respond($bookingDispute->evidence);
    }

    public function payoutProof(Request $request, Payout $payout)
    {
        abort_unless(
            $request->user()->role === 'admin'
            || (int) $payout->user_id === (int) $request->user()->id,
            403
        );

        return $this->respond($payout->proof_url);
    }

    public function refundProof(Request $request, Refund $refund)
    {
        abort_unless(
            $request->user()->role === 'admin'
            || (int) $refund->user_id === (int) $request->user()->id,
            403
        );

        return $this->respond($refund->proof);
    }

    public function ticketAttachment(Request $request, TicketReply $ticketReply)
    {
        abort_unless(
            $request->user()->role === 'admin'
            || (int) $ticketReply->ticket?->user_id === (int) $request->user()->id,
            403
        );

        return $this->respond($ticketReply->attachment);
    }

    private function authorizeOrder(Request $request, Order $order): void
    {
        abort_unless(
            $request->user()->role === 'admin'
            || (int) $order->user_id === (int) $request->user()->id,
            403
        );
    }

    private function authorizeBooking(Request $request, ?Booking $booking): void
    {
        abort_unless($booking, 404);

        $allowed = $request->user()->role === 'admin'
            || (int) $booking->teacher_id === (int) $request->user()->id
            || $booking->participants()
                ->where('student_id', $request->user()->id)
                ->whereHas('order', fn ($query) => $query->whereIn('status', [
                    'paid',
                    'refund_pending',
                    'refunded',
                ]))
                ->exists();

        abort_unless($allowed, 403);
    }

    private function respond(?string $path)
    {
        abort_unless($path, 404);

        $headers = [
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline; filename="'.basename($path).'"',
        ];

        if (Storage::disk('local')->exists($path)) {
            return Storage::disk('local')->response($path, null, $headers);
        }

        abort(404);
    }
}
