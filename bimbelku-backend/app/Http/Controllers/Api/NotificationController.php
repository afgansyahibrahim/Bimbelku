<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    // [ADMIN] Kirim Notifikasi
    public function send(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:180',
            'message' => 'required|string|max:2000',
            'type' => 'nullable|in:info,success,warning,error'
        ]);

        $notif = Notification::create([
            'user_id' => $request->user_id,
            'title'   => $request->title,
            'message' => $request->message,
            'type'    => $request->type ?? 'info',
            'is_read' => false
        ]);

        return response()->json(['message' => 'Notifikasi berhasil dikirim!', 'data' => $notif]);
    }

    // [USER] Ambil Notifikasi Saya
    public function index()
    {
        $user = Auth::user();
        $notifications = Notification::where('user_id', $user->id)
                            ->orderBy('created_at', 'desc')
                            ->take(20) // Ambil 20 terakhir
                            ->get();
        
        $unreadCount = Notification::where('user_id', $user->id)->where('is_read', false)->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount
        ]);
    }

    // [USER] Tandai Sudah Dibaca
    public function markAsRead($id)
    {
        $notif = Notification::where('user_id', Auth::id())->find($id);
        if ($notif) {
            $notif->is_read = true;
            $notif->save();
        }
        return response()->json(['success' => true]);
    }
    
    // [USER] Tandai Semua Dibaca
    public function markAllRead()
    {
        Notification::where('user_id', Auth::id())->update(['is_read' => true]);
        return response()->json(['success' => true]);
    }
}
