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

        $unreadQuery = Notification::query()
            ->where('user_id', $request->user()->id)
            ->where('is_read', false);
        $role = (string) $request->user()->role;

        $notifications = $query->limit((int) ($validated['per_page'] ?? 20))->get();
        $notifications->each(function (Notification $notification) use ($role) {
            if (!$notification->target_url) {
                $notification->target_url = $this->legacyTargetUrl($role, (string) $notification->title);
            }
        });

        $attentionNotifications = (clone $unreadQuery)
            ->latest('id')
            ->limit(100)
            ->get(['id', 'title', 'is_read', 'target_url'])
            ->map(function (Notification $notification) use ($role) {
                $targetUrl = $notification->target_url
                    ?: $this->legacyTargetUrl($role, (string) $notification->title);

                return [
                    'id' => $notification->id,
                    'is_read' => (bool) $notification->is_read,
                    'target_url' => $targetUrl,
                ];
            })
            ->values();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => (clone $unreadQuery)->count(),
            // Payload kecil khusus indikator navigasi. Dengan begitu marker tetap akurat
            // meski notifikasi target yang belum dibaca tidak masuk 20 item terbaru.
            'attention_notifications' => $attentionNotifications,
        ]);
    }

    private function legacyTargetUrl(string $role, string $title): ?string
    {
        // Kompatibilitas untuk notifikasi yang sudah tersimpan sebelum indikator
        // navigasi diperkenalkan. Notifikasi baru selalu menyimpan target_url langsung.
        $targets = match ($role) {
            'student' => [
                'Tutor belum ditemukan' => '/student/my-classes?tab=process',
                'Tutor paket ditemukan' => '/student/my-classes?tab=process',
                'Tutor menerima permintaan' => '/student/my-classes?tab=process',
                'Pembayaran paket ditolak' => '/student/my-classes?tab=process',
                'Tagihan paket tersedia' => '/student/my-classes?tab=process',
                'Pembayaran kelompok dibuka' => '/student/my-classes?tab=process',
                'Keputusan kelompok berakhir' => '/student/my-classes?tab=process',
                'Semua tutor ditemukan' => '/student/my-classes',
                'Bukti sesi telah dikirim' => '/student/my-classes',
                'Ketidakhadiran dilaporkan' => '/student/my-classes',
                'Keberatan telah diputuskan' => '/student/my-classes',
                'Laporan ketidakhadiran tutor diputuskan' => '/student/my-classes',
                'Laporan ketidakhadiran murid diputuskan' => '/student/my-classes',
                'Kelas dikonfirmasi' => '/student/my-classes',
                'Laporan perkembangan tersedia' => '/student/progress',
                'Pembayaran paket masuk antrean refund' => '/student/history',
                'Kelompok dibatalkan' => '/student/history',
                'Sesi dibatalkan karena keadaan darurat' => '/student/history',
                'Refund ketidakhadiran tutor' => '/student/history',
                'Pembayaran ditolak' => '/student/history',
                'Bukti pembayaran ditolak' => '/student/history',
                'Pembayaran masuk antrean refund' => '/student/history',
                'Batas pembayaran berakhir' => '/student/history',
                'Batas pembayaran paket berakhir' => '/student/history',
                'Kelompok tidak terpenuhi' => '/student/history',
                'Refund masuk ke Saldo BimbelKu' => '/student/history',
                'Refund telah ditransfer' => '/student/history',
                'Pesan kelas baru' => '/student/messages',
                'Balasan baru dari admin' => '/student/help',
                'Tiket bantuan diselesaikan' => '/student/help',
            ],
            'teacher' => [
                'Permintaan perpanjangan tutor' => '/guru/permintaan',
                'Permintaan bimbel baru' => '/guru/permintaan',
                'Penerimaan murid dibatasi' => '/guru/permintaan',
                'Pencocokan berakhir' => '/guru/permintaan',
                'Permintaan paket dibatalkan' => '/guru/permintaan',
                'Penetapan kelas oleh admin' => '/guru/kelas',
                'Profil diterima murid' => '/guru/kelas',
                'Pembayaran murid sedang diperiksa' => '/guru/kelas',
                'Pembayaran murid diterima' => '/guru/kelas',
                'Sesi dibatalkan karena pembayaran terlambat' => '/guru/kelas',
                'Sesi dikonfirmasi' => '/guru/kelas',
                'Murid mengajukan keberatan' => '/guru/kelas',
                'Kelas kelompok dibatalkan' => '/guru/kelas',
                'Pesan kelas baru' => '/guru/pesan',
                'Rekening pencairan diubah' => '/guru/rekening',
                'Pendapatan telah ditransfer' => '/guru/gaji',
                'Pencairan diajukan' => '/guru/gaji',
                'Sesi selesai' => '/guru/gaji',
                'Ketidakhadiran Anda dilaporkan' => '/guru/performa',
                'Laporan keadaan darurat diperiksa' => '/guru/performa',
                'Laporan ketidakhadiran murid diputuskan' => '/guru/performa',
                'Banding penalti disetujui' => '/guru/performa',
                'Banding penalti ditolak' => '/guru/performa',
                'Akun tutor disetujui' => '/guru/saya',
                'Verifikasi tutor ditolak' => '/guru/saya',
                'Balasan baru dari admin' => '/guru/bantuan',
                'Tiket bantuan diselesaikan' => '/guru/bantuan',
            ],
            'admin' => [
                'Pendaftaran tutor baru' => '/admin/guru',
                'Bukti pembayaran baru' => '/admin/pembayaran',
                'Bukti pembayaran paket' => '/admin/pembayaran',
                'Perubahan rekening tutor' => '/admin/finance',
                'Pengajuan pencairan tutor' => '/admin/finance',
                'Refund paket menunggu proses' => '/admin/refunds',
                'Banding penalti tutor' => '/admin/cases',
                'Tiket bantuan baru' => '/admin/pesan',
                'Balasan tiket bantuan' => '/admin/pesan',
            ],
            default => [],
        };

        return $targets[$title] ?? null;
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

    public function markManyAsRead(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $updated = Notification::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('id', $validated['ids'])
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['success' => true, 'updated' => $updated]);
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
