<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = trim((string) env('SEED_ADMIN_EMAIL'));
        $password = (string) env('SEED_ADMIN_PASSWORD');

        if ($email === '' || mb_strlen($password) < 12) {
            $this->command?->warn(
                'Admin tidak dibuat. Isi SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD (minimal 12 karakter), lalu jalankan db:seed lagi.'
            );
            return;
        }

        User::updateOrCreate(
            ['email' => mb_strtolower($email)],
            [
                'name' => 'Admin Utama',
                'password' => Hash::make($password),
                'password_updated_at' => now(),
                'role' => 'admin',
                'status' => 'active',
                'email_verified_at' => now(),
                'terms_accepted_at' => now(),
                'privacy_accepted_at' => now(),
                'policy_version' => config('app.policy_version'),
            ]
        );
    }
}
