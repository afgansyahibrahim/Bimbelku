<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\SocialMedia;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StageSixCAccessAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('bimbelku.primary_admin_email', '');
    }

    public function test_active_single_admin_can_access_all_admin_modules(): void
    {
        $admin = $this->activeAdmin([
            'admin_type' => 'standard_admin',
            'admin_permissions' => [],
        ]);
        User::factory()->create(['role' => 'student', 'status' => 'active']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/dashboard-stats')->assertOk();
        $this->getJson('/api/admin/users?role=student')->assertOk();
        $this->getJson('/api/admin/tutor-searches')->assertOk();
        $this->getJson('/api/admin/audit-log')->assertOk();
    }

    public function test_admin_management_endpoints_are_not_available(): void
    {
        Sanctum::actingAs($this->activeAdmin());

        $this->getJson('/api/admin/access-control')->assertNotFound();
        $this->postJson('/api/admin/access-control', [])->assertNotFound();
        $this->putJson('/api/admin/access-control/1', [])->assertNotFound();
    }

    public function test_hidden_social_media_remains_manageable_and_can_be_shown_again(): void
    {
        $admin = $this->activeAdmin();
        $social = SocialMedia::create([
            'name' => 'X',
            'link' => 'https://x.com/bimbelku',
            'icon' => 'catalog:twitter',
            'is_active' => false,
            'sort_order' => 0,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/socials')
            ->assertOk()
            ->assertJsonMissing(['id' => $social->id]);

        $this->getJson('/api/admin/admin-socials')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $social->id,
                'is_active' => false,
                'icon_key' => 'x',
                'icon_url' => 'https://cdn.simpleicons.org/x/000000',
            ]);

        $this->putJson('/api/admin/socials/'.$social->id, [
            'name' => $social->name,
            'link' => $social->link,
            'is_active' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->getJson('/api/socials')
            ->assertOk()
            ->assertJsonFragment(['id' => $social->id]);
    }

    public function test_inactive_admin_cannot_use_admin_modules(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'rejected',
            'admin_type' => 'single_admin',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/dashboard-stats')->assertForbidden();
    }

    public function test_admin_mutation_is_recorded_and_hash_chain_is_valid(): void
    {
        $admin = $this->activeAdmin();
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/notes', [
            'title' => 'Catatan audit admin tunggal',
            'content' => 'Memastikan mutasi admin tetap tercatat setelah penyederhanaan akses.',
            'color' => 'indigo',
            'is_pinned' => false,
        ])->assertOk();

        $log = AdminAuditLog::query()->latest('id')->firstOrFail();
        $this->assertSame($admin->id, $log->actor_id);
        $this->assertSame(200, $log->response_status);
        $this->assertNotEmpty($log->entry_hash);

        $this->getJson('/api/admin/audit-log/integrity')
            ->assertOk()
            ->assertJsonPath('valid', true);

        $list = $this->getJson('/api/admin/audit-log?per_page=20')
            ->assertOk()
            ->assertJsonPath('pagination.per_page', 20);
        $this->assertArrayNotHasKey('before_state', $list->json('data.0'));
        $this->assertArrayNotHasKey('after_state', $list->json('data.0'));

        $this->getJson('/api/admin/audit-log/'.$log->id)
            ->assertOk()
            ->assertJsonPath('id', $log->id)
            ->assertJsonPath('request_payload.title', 'Catatan audit admin tunggal');
    }

    public function test_hash_chain_reports_direct_database_tampering(): void
    {
        $admin = $this->activeAdmin();
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/notes', [
            'title' => 'Data uji integritas',
            'content' => 'Catatan ini dipakai untuk menguji perubahan langsung pada hash audit.',
        ])->assertOk();

        $log = AdminAuditLog::query()->latest('id')->firstOrFail();
        DB::table('admin_audit_logs')->where('id', $log->id)->update([
            'entry_hash' => str_repeat('0', 64),
        ]);

        $this->getJson('/api/admin/audit-log/integrity')
            ->assertOk()
            ->assertJsonPath('valid', false);
    }

    private function activeAdmin(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'role' => 'admin',
            'status' => 'active',
            'admin_type' => 'single_admin',
            'admin_permissions' => null,
        ], $overrides));
    }
}
