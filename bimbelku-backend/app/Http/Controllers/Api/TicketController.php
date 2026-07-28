<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Models\Ticket;
use App\Models\TicketReply;

class TicketController extends Controller
{
    // ==========================================
    // 1. DATA TIKET
    // ==========================================

    // Get Tiket Saya (Guru/Murid)
    public function myTickets()
    {
        $tickets = Ticket::where('user_id', Auth::id())
                    ->with(['replies' => function($q) {
                        $q->latest()->limit(1); // Ambil chat terakhir untuk preview
                    }])
                    ->orderBy('created_at', 'desc')
                    ->limit(100)
                    ->get();
        return response()->json($tickets);
    }

    // Get Semua Tiket (Admin)
    public function index()
    {
        $tickets = Ticket::with(['user', 'replies' => function($q) {
                        $q->latest()->limit(1);
                    }])
                    ->orderByRaw("FIELD(status, 'open', 'closed')") // Open duluan
                    ->orderBy('updated_at', 'desc')
                    ->limit(300)
                    ->get();
        return response()->json($tickets);
    }

    // Get Detail Chat (Isi Percakapan)
    public function show($id)
    {
        $ticket = Ticket::with('user')->findOrFail($id);
        
        // Security: Jika bukan admin, pastikan tiket ini punya dia
        $user = Auth::user();
        if ($user->role !== 'admin' && (int) $ticket->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $ticket->setRelation(
            'replies',
            $ticket->replies()
                ->with('user')
                ->latest('id')
                ->limit(500)
                ->get()
                ->sortBy('id')
                ->values()
        );

        return response()->json($ticket);
    }

    // ==========================================
    // 2. AKSI (KIRIM, BALAS, TUTUP)
    // ==========================================

    // Buat Tiket Baru (Start Chat)
    public function store(Request $request)
    {
        $request->validate([
            'subject' => 'required|string|max:180',
            'message' => 'nullable|required_without:image|string|max:5000',
            'image'   => 'nullable|required_without:message|image|mimes:jpg,jpeg,png,webp|max:5120'
        ]);

        $path = $request->hasFile('image')
            ? $request->file('image')->store('ticket_attachments', 'local')
            : null;

        try {
            DB::transaction(function () use ($request, $path) {
                $ticket = Ticket::create([
                    'user_id' => Auth::id(),
                    'subject' => trim((string) $request->subject),
                    'status' => 'open',
                ]);

                TicketReply::create([
                    'ticket_id' => $ticket->id,
                    'user_id' => Auth::id(),
                    'message' => trim((string) $request->message) ?: 'Lampiran gambar',
                    'attachment' => $path,
                ]);
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return response()->json(['message' => 'Tiket berhasil dibuat!']);
    }

    // Kirim Balasan (Reply Chat)
    public function reply(Request $request, $id)
    {
        $request->validate([
            'message' => 'nullable|required_without:image|string|max:5000',
            'image'   => 'nullable|required_without:message|image|mimes:jpg,jpeg,png,webp|max:5120'
        ]);

        $ticket = Ticket::findOrFail($id);
        $user = Auth::user();
        if ($user->role !== 'admin' && (int) $ticket->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Anda tidak memiliki akses ke tiket ini.'], 403);
        }

        $path = $request->hasFile('image')
            ? $request->file('image')->store('ticket_attachments', 'local')
            : null;

        try {
            DB::transaction(function () use ($request, $id, $user, $path) {
                $lockedTicket = Ticket::query()->lockForUpdate()->findOrFail($id);
                if ($user->role !== 'admin' && (int) $lockedTicket->user_id !== (int) $user->id) {
                    abort(403, 'Anda tidak memiliki akses ke tiket ini.');
                }
                if ($lockedTicket->status === 'closed') {
                    abort(422, 'Tiket ini sudah ditutup.');
                }

                TicketReply::create([
                    'ticket_id' => $lockedTicket->id,
                    'user_id' => $user->id,
                    'message' => trim((string) $request->message) ?: 'Lampiran gambar',
                    'attachment' => $path,
                ]);
                $lockedTicket->touch();
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return response()->json(['message' => 'Pesan terkirim']);
    }

    // Tutup Sesi (Admin Only)
    public function close($id)
    {
        $ticket = Ticket::findOrFail($id);
        $user = Auth::user();
        if ($user->role !== 'admin' && (int) $ticket->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Anda tidak memiliki akses ke tiket ini.'], 403);
        }

        DB::transaction(function () use ($id, $user) {
            $lockedTicket = Ticket::query()->lockForUpdate()->findOrFail($id);
            if ($user->role !== 'admin' && (int) $lockedTicket->user_id !== (int) $user->id) {
                abort(403, 'Anda tidak memiliki akses ke tiket ini.');
            }
            if ($lockedTicket->status !== 'closed') {
                $lockedTicket->update(['status' => 'closed']);
            }
        });

        return response()->json(['message' => 'Sesi chat selesai.']);
    }
}
