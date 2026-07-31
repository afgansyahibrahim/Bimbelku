<?php

namespace Database\Seeders;

use App\Models\DynamicBanner;
use App\Models\LearningTimeSlot;
use App\Models\PackagePlan;
use App\Models\Promotion;
use App\Models\Tutorial;
use Illuminate\Database\Seeder;

class StageFiveExperienceSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            [
                'name' => 'Coba Belajar',
                'slug' => 'coba-belajar',
                'description' => 'Satu sesi untuk mencoba alur belajar BimbelKu.',
                'session_count' => 1,
                'validity_days' => 7,
                'maximum_subjects' => 1,
                'sort_order' => 10,
            ],
            [
                'name' => 'Bulanan Dasar',
                'slug' => 'bulanan-dasar',
                'description' => 'Empat sesi selama 30 hari untuk fokus pada satu mapel.',
                'session_count' => 4,
                'validity_days' => 30,
                'maximum_subjects' => 1,
                'sort_order' => 20,
            ],
            [
                'name' => 'Bulanan Reguler',
                'slug' => 'bulanan-reguler',
                'description' => 'Delapan sesi selama 30 hari untuk maksimal dua mapel.',
                'session_count' => 8,
                'validity_days' => 30,
                'maximum_subjects' => 2,
                'sort_order' => 30,
            ],
            [
                'name' => 'Bulanan Intensif',
                'slug' => 'bulanan-intensif',
                'description' => 'Dua belas sesi selama 30 hari untuk maksimal tiga mapel.',
                'session_count' => 12,
                'validity_days' => 30,
                'maximum_subjects' => 3,
                'sort_order' => 40,
            ],
        ] as $plan) {
            PackagePlan::updateOrCreate(
                ['slug' => $plan['slug']],
                [...$plan, 'is_active' => true]
            );
        }

        foreach (range(8, 20) as $hour) {
            $time = str_pad((string) $hour, 2, '0', STR_PAD_LEFT).':00:00';
            LearningTimeSlot::updateOrCreate(
                ['start_time' => $time],
                [
                    'label' => str_pad((string) $hour, 2, '0', STR_PAD_LEFT).'.00 WIB',
                    'sort_order' => $hour,
                    'is_active' => true,
                ]
            );
        }

        Promotion::updateOrCreate(
            ['code' => 'MURIDBARU20'],
            [
                'title' => 'Diskon Murid Baru 20%',
                'description' => 'Contoh promo siap diaktifkan admin untuk pengguna baru.',
                'discount_type' => 'percentage',
                'discount_value' => 20,
                'maximum_discount' => 100000,
                'minimum_purchase' => 40000,
                'total_quota' => 100,
                'per_user_limit' => 1,
                'new_students_only' => true,
                'claim_required' => false,
                'is_active' => false,
            ]
        );

        DynamicBanner::updateOrCreate(
            ['title' => 'Cara Memesan Tutor'],
            [
                'description' => 'Pilih paket, bagi sesi, tentukan jadwal, lalu biarkan radar mencari tutor.',
                'button_text' => 'Lihat Tutorial',
                'audience' => 'student',
                'destination_kind' => 'internal',
                'destination_url' => '/student/dashboard',
                'sort_order' => 10,
                'is_active' => true,
            ]
        );
        DynamicBanner::updateOrCreate(
            ['title' => 'Pilih Paket Belajar'],
            [
                'description' => 'Gunakan 1, 4, 8, atau 12 sesi sesuai target belajarmu.',
                'button_text' => 'Lihat Paket',
                'audience' => 'student',
                'destination_kind' => 'internal',
                'destination_url' => '/student/packages/new',
                'sort_order' => 20,
                'is_active' => true,
            ]
        );

        $studentTutorial = Tutorial::updateOrCreate(
            ['role' => 'student', 'context' => 'dashboard'],
            [
                'title' => 'Mulai belajar di BimbelKu',
                'description' => 'Satu paket dapat memuat beberapa mata pelajaran dan tutor.',
                'sort_order' => 10,
                'is_active' => true,
            ]
        );
        $this->syncSteps($studentTutorial, [
            ['title' => 'Pilih paket', 'body' => 'Tentukan 1, 4, 8, atau 12 sesi sesuai target belajar.'],
            ['title' => 'Bagi sesi', 'body' => 'Bagikan jumlah sesi kepada maksimal tiga mata pelajaran sesuai paket.'],
            ['title' => 'Tentukan jadwal', 'body' => 'Pilih slot satu jam yang disediakan aplikasi untuk setiap sesi.'],
            ['title' => 'Tunggu tutor', 'body' => 'Radar mencari tutor yang menguasai mapel dan tersedia pada seluruh jadwal.'],
            ['title' => 'Bayar dan belajar', 'body' => 'Tagihan dibuka setelah semua tutor menerima. Paket masuk ke Kelas Saya setelah diverifikasi.'],
        ]);

        $teacherTutorial = Tutorial::updateOrCreate(
            ['role' => 'teacher', 'context' => 'dashboard'],
            [
                'title' => 'Menangani paket murid',
                'description' => 'Satu penawaran paket dapat memuat beberapa jadwal pada mapel yang sama.',
                'sort_order' => 10,
                'is_active' => true,
            ]
        );
        $this->syncSteps($teacherTutorial, [
            ['title' => 'Periksa semua jadwal', 'body' => 'Penerimaan paket berlaku untuk seluruh sesi pada mata pelajaran tersebut.'],
            ['title' => 'Terima jika tersedia', 'body' => 'Sistem memeriksa ulang benturan sebelum keputusan disimpan.'],
            ['title' => 'Tunggu pembayaran', 'body' => 'Seluruh jadwal aktif setelah pembayaran paket diperiksa admin.'],
        ]);

        $adminTutorial = Tutorial::updateOrCreate(
            ['role' => 'admin', 'context' => 'stage-five'],
            [
                'title' => 'Kelola pengalaman Tahap 5',
                'description' => 'Paket, promo, banner, dan tutorial dikelola dari satu halaman.',
                'sort_order' => 10,
                'is_active' => true,
            ]
        );
        $this->syncSteps($adminTutorial, [
            ['title' => 'Atur paket', 'body' => 'Tentukan jumlah sesi, masa aktif, dan batas mata pelajaran.'],
            ['title' => 'Atur promo', 'body' => 'Batasi periode, kuota, nilai potongan, serta sasaran promo.'],
            ['title' => 'Atur banner', 'body' => 'Unggah gambar dan pilih tujuan internal yang aman.'],
            ['title' => 'Atur tutorial', 'body' => 'Susun langkah singkat untuk setiap peran pengguna.'],
        ]);
    }

    private function syncSteps(Tutorial $tutorial, array $steps): void
    {
        $tutorial->steps()->delete();
        foreach ($steps as $index => $step) {
            $tutorial->steps()->create([...$step, 'sort_order' => $index]);
        }
    }
}
