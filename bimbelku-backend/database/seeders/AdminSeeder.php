<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = mb_strtolower(trim((string) env(
            'PRIMARY_ADMIN_EMAIL',
            env('SEED_ADMIN_EMAIL', '')
        )));
        $password = (string) env('SEED_ADMIN_PASSWORD');

        if ($email === '' || mb_strlen($password) < 12) {
            $this->command?->warn(
                'Admin tidak dibuat. Isi PRIMARY_ADMIN_EMAIL atau SEED_ADMIN_EMAIL, serta SEED_ADMIN_PASSWORD minimal 12 karakter.'
            );
            return;
        }

        $existing = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if ($existing && $existing->role !== 'admin') {
            $this->command?->error(
                'Admin tidak dibuat karena email tersebut sudah dipakai akun murid atau tutor.'
            );
            return;
        }

        [$admin, $disabledCount] = DB::transaction(function () use ($email, $password): array {
            $admin = User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'name' => 'Admin Utama',
                    'password' => Hash::make($password),
                    'password_updated_at' => now(),
                    'role' => 'admin',
                    'admin_type' => 'single_admin',
                    'admin_permissions' => null,
                    'admin_permissions_updated_by' => null,
                    'admin_permissions_updated_at' => now(),
                    'status' => 'active',
                    'email_verified_at' => now(),
                    'terms_accepted_at' => now(),
                    'privacy_accepted_at' => now(),
                    'policy_version' => config('app.policy_version'),
                ]
            );

            $legacyAdmins = User::query()
                ->where('role', 'admin')
                ->where('id', '!=', $admin->id)
                ->get();

            foreach ($legacyAdmins as $legacyAdmin) {
                $legacyAdmin->forceFill([
                    'status' => 'banned',
                    'admin_type' => 'legacy_disabled',
                    'admin_permissions' => null,
                    'admin_permissions_updated_by' => $admin->id,
                    'admin_permissions_updated_at' => now(),
                ])->save();
                $legacyAdmin->tokens()->delete();
            }

            return [$admin, $legacyAdmins->count()];
        }, 3);

        $this->command?->info("Admin utama aktif: {$admin->email}");
        if ($disabledCount > 0) {
            $this->command?->warn(
                "{$disabledCount} akun admin lama dinonaktifkan dan seluruh tokennya dicabut."
            );
        }
    }
}
