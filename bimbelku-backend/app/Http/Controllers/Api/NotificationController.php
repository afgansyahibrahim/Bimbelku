<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function send(Request $request)
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'title' => ['required', 'string', 'max:180'],
            'message' => ['required', 'string', 'max:2000'],
            'type' => ['nullable', 'in:info,success,warning,error'],
            'target_url' => ['nullable', 'string', 'max:500', 'regex:/^\/(?!\/)[A-Za-z0-9_\-\/?=&.]*$/'],
        ]);

        $notification = Notification::create([
            ...$validated,
            'type' => $validated['type'] ?? 'info',
            'is_read' => false,
        ]);

        return response()->json(['message' => 'Notifikasi berhasil dikirim!', 'data' => $notification]);
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:all,read,unread'],
            'type' => ['nullable', 'in:info,success,warning,error'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);
        $query = Notification::query()
            ->where('user_id', $request->user()->id)
            ->when(($validated['status'] ?? 'all') === 'unread', fn ($item) => $item->where('is_read', false))
            ->when(($validated['status'] ?? 'all') === 'read', fn ($item) => $item->where('is_read', true))
            ->when(!empty($validated['type']), fn ($item) => $item->where('type', $validated['type']))
            ->latest();

        return response()->json([
            'notifications' => $query->limit((int) ($validated['per_page'] ?? 20))->get(),
            'unread_count' => Notification::query()
                ->where('user_id', $request->user()->id)
                ->where('is_read', false)
                ->count(),
        ]);
    }

    public function markAsRead(Request $request, int $id)
    {
        $notification = Notification::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);
        if (!$notification->is_read) {
            $notification->update(['is_read' => true]);
        }

        return response()->json(['success' => true, 'data' => $notification->fresh()]);
    }

    public function markAllRead(Request $request)
    {
        Notification::query()
            ->where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['success' => true]);
    }
}
