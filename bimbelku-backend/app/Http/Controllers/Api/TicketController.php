<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\TicketReply;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TicketController extends Controller
{
    public function myTickets(Request $request)
    {
        return response()->json(
            Ticket::query()
                ->where('user_id', $request->user()->id)
                ->with('latestReply')
                ->latest('updated_at')
                ->limit(100)
                ->get()
        );
    }

    public function index(Request $request)
    {
        abort_unless($request->user()->role === 'admin', 403);

        return response()->json(
            Ticket::query()
                ->with(['user:id,name,role', 'latestReply'])
                ->orderByRaw("CASE WHEN status = 'open' THEN 0 ELSE 1 END")
                ->latest('updated_at')
                ->limit(300)
                ->get()
        );
    }

    public function show(Request $request, int $id)
    {
        $ticket = Ticket::with('user:id,name,role')->findOrFail($id);
        $this->authorizeTicket($request->user(), $ticket);

        $ticket->setRelation(
            'replies',
            $ticket->replies()
                ->with('user:id,name,role')
                ->latest('id')
                ->limit(500)
                ->get()
                ->sortBy('id')
                ->values()
        );

        return response()->json($ticket);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:180'],
            'message' => ['nullable', 'required_without:image', 'string', 'max:5000'],
            'image' => ['nullable', 'required_without:message', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $path = $request->hasFile('image')
            ? $request->file('image')->store('ticket_attachments', 'local')
            : null;

        try {
            $ticket = DB::transaction(function () use ($request, $validated, $path) {
                $ticket = Ticket::create([
                    'user_id' => $request->user()->id,
                    'subject' => trim($validated['subject']),
                    'status' => 'open',
                ]);
                TicketReply::create([
                    'ticket_id' => $ticket->id,
                    'user_id' => $request->user()->id,
                    'message' => trim((string) ($validated['message'] ?? '')) ?: 'Lampiran gambar',
                    'attachment' => $path,
                ]);
                $this->notifyPrimaryAdmin(
                    "support-ticket-opened:{$ticket->id}",
                    'Tiket bantuan baru',
                    Str::limit($ticket->subject, 140),
                );

                return $ticket;
            }, 3);
        } catch (\Throwable $exception) {
            if ($path) Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json(['message' => 'Tiket berhasil dibuat!', 'data' => $ticket], 201);
    }

    public function reply(Request $request, int $id)
    {
        $validated = $request->validate([
            'message' => ['nullable', 'required_without:image', 'string', 'max:5000'],
            'image' => ['nullable', 'required_without:message', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $ticket = Ticket::findOrFail($id);
        $this->authorizeTicket($request->user(), $ticket);
        $path = $request->hasFile('image')
            ? $request->file('image')->store('ticket_attachments', 'local')
            : null;

        try {
            DB::transaction(function () use ($request, $validated, $id, $path) {
                $ticket = Ticket::query()->lockForUpdate()->findOrFail($id);
                $this->authorizeTicket($request->user(), $ticket);
                abort_if($ticket->status === 'closed', 422, 'Tiket ini sudah ditutup.');

                $reply = TicketReply::create([
                    'ticket_id' => $ticket->id,
                    'user_id' => $request->user()->id,
                    'message' => trim((string) ($validated['message'] ?? '')) ?: 'Lampiran gambar',
                    'attachment' => $path,
                ]);
                $ticket->touch();

                if ($request->user()->role === 'admin') {
                    Notification::updateOrCreate(
                        ['unique_key' => "support-ticket-reply:{$reply->id}:{$ticket->user_id}"],
                        [
                            'user_id' => $ticket->user_id,
                            'title' => 'Balasan baru dari admin',
                            'message' => Str::limit($reply->message, 160),
                            'type' => 'info',
                            'target_url' => $this->ownerTargetUrl($ticket),
                            'is_read' => false,
                        ]
                    );
                } else {
                    $this->notifyPrimaryAdmin(
                        "support-ticket-reply:{$reply->id}:admin",
                        'Balasan tiket bantuan',
                        Str::limit($reply->message, 160),
                    );
                }
            }, 3);
        } catch (\Throwable $exception) {
            if ($path) Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json(['message' => 'Pesan terkirim']);
    }

    public function close(Request $request, int $id)
    {
        $ticket = Ticket::findOrFail($id);
        $this->authorizeTicket($request->user(), $ticket);

        DB::transaction(function () use ($request, $id) {
            $ticket = Ticket::query()->lockForUpdate()->findOrFail($id);
            $this->authorizeTicket($request->user(), $ticket);
            if ($ticket->status === 'closed') return;

            $ticket->update(['status' => 'closed']);
            if ($request->user()->role === 'admin') {
                Notification::updateOrCreate(
                    ['unique_key' => "support-ticket-closed:{$ticket->id}:{$ticket->user_id}"],
                    [
                        'user_id' => $ticket->user_id,
                        'title' => 'Tiket bantuan diselesaikan',
                        'message' => 'Percakapan bantuan ditutup oleh admin. Buat tiket baru bila masih memerlukan bantuan.',
                        'type' => 'success',
                        'target_url' => $this->ownerTargetUrl($ticket),
                        'is_read' => false,
                    ]
                );
            }
        }, 3);

        return response()->json(['message' => 'Sesi chat selesai.']);
    }

    private function authorizeTicket(User $user, Ticket $ticket): void
    {
        abort_unless(
            $user->role === 'admin' || (int) $ticket->user_id === (int) $user->id,
            403,
            'Anda tidak memiliki akses ke tiket ini.'
        );
    }

    private function notifyPrimaryAdmin(string $key, string $title, string $message): void
    {
        $admin = User::query()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->get()
            ->first(fn (User $user) => $user->isPrimaryAdmin());
        if (!$admin) return;

        Notification::updateOrCreate(
            ['unique_key' => $key],
            [
                'user_id' => $admin->id,
                'title' => $title,
                'message' => $message,
                'type' => 'info',
                'target_url' => '/admin/pesan',
                'is_read' => false,
            ]
        );
    }

    private function ownerTargetUrl(Ticket $ticket): string
    {
        $ticket->loadMissing('user:id,role');

        return $ticket->user?->role === 'teacher' ? '/guru/bantuan' : '/student/help';
    }
}
