<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use App\Services\AdminAuditService;
use App\Support\AdminPermissionCatalog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminAccessController extends Controller
{
    /**
     * Riwayat perubahan tetap tersedia walaupun project memakai satu admin utama.
     * Endpoint pengelolaan akun admin sengaja tidak disediakan.
     */
    public function audit(Request $request, AdminAuditService $auditService)
    {
        $validated = $request->validate([
            'actor_id' => ['nullable', 'integer', 'exists:users,id'],
            'category' => ['nullable', 'string', 'max:60'],
            'permission' => ['nullable', 'string', Rule::in(AdminPermissionCatalog::allCodes())],
            'status' => ['nullable', Rule::in(['success', 'failed'])],
            'search' => ['nullable', 'string', 'max:100'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = AdminAuditLog::query()->with('actor:id,name,email');
        if (!empty($validated['actor_id'])) {
            $query->where('actor_id', $validated['actor_id']);
        }
        if (!empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }
        if (!empty($validated['permission'])) {
            $query->where('permission_code', $validated['permission']);
        }
        if (($validated['status'] ?? null) === 'success') {
            $query->whereBetween('response_status', [200, 399]);
        } elseif (($validated['status'] ?? null) === 'failed') {
            $query->where('response_status', '>=', 400);
        }
        if (!empty($validated['search'])) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], trim($validated['search'])).'%';
            $query->where(function ($builder) use ($term) {
                $builder->where('action', 'like', $term)
                    ->orWhere('actor_name', 'like', $term)
                    ->orWhere('actor_email', 'like', $term)
                    ->orWhere('target_type', 'like', $term)
                    ->orWhere('target_id', 'like', $term)
                    ->orWhere('reason', 'like', $term);
            });
        }
        if (!empty($validated['date_from'])) {
            $query->where('created_at', '>=', Carbon::parse($validated['date_from'])->startOfDay());
        }
        if (!empty($validated['date_to'])) {
            $query->where('created_at', '<=', Carbon::parse($validated['date_to'])->endOfDay());
        }

        $page = $query->latest('id')->paginate(50);
        $chain = $auditService->verifyChain(AdminAuditLog::query()->oldest('id')->get());

        return response()->json([
            'data' => collect($page->items())->map(fn (AdminAuditLog $log) => $this->formatAudit($log)),
            'pagination' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
            'chain' => $chain,
            'filters' => [
                'permission_groups' => AdminPermissionCatalog::groups(),
                'actors' => User::query()
                    ->where('role', 'admin')
                    ->orderBy('name')
                    ->get(['id', 'name', 'email']),
            ],
        ]);
    }

    private function formatAudit(AdminAuditLog $log): array
    {
        return [
            'id' => $log->id,
            'request_id' => $log->request_id,
            'actor' => [
                'id' => $log->actor_id,
                'name' => $log->actor?->name ?? $log->actor_name ?? 'Admin terhapus',
                'email' => $log->actor?->email ?? $log->actor_email,
            ],
            'action' => $log->action,
            'category' => $log->category,
            'permission_code' => $log->permission_code,
            'route_name' => $log->route_name,
            'method' => $log->method,
            'response_status' => (int) $log->response_status,
            'target_type' => $log->target_type,
            'target_id' => $log->target_id,
            'reason' => $log->reason,
            'request_payload' => $log->request_payload,
            'before_state' => $log->before_state,
            'after_state' => $log->after_state,
            'metadata' => $log->metadata,
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'entry_hash' => $log->entry_hash,
            'previous_hash' => $log->previous_hash,
            'created_at' => $log->created_at?->toIso8601String(),
        ];
    }
}
