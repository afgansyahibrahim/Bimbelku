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

        foreach (range(8, 22) as $hour) {
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
            [
                'title' => 'Mulai dari Cari Les',
                'body' => 'Pilih paket, mata pelajaran, pembagian sesi, dan pola jadwal dari satu alur.',
                'callout' => ['selector' => '[data-tour="student-cari-les"]'],
            ],
            [
                'title' => 'Periksa sebelum membayar',
                'body' => 'Ringkasan pesanan muncul di tengah layar agar seluruh rincian dapat diperiksa sebelum konfirmasi.',
                'callout' => ['selector' => '[data-tour="student-cari-les"]'],
            ],
            [
                'title' => 'Pantau di Kelas Saya',
                'body' => 'Setelah pembayaran diterima, sistem mencari tutor dan statusnya dapat dipantau di Kelas Saya.',
                'callout' => ['selector' => '[data-tour="student-kelas"]'],
            ],
            [
                'title' => 'Kelola dari halaman Saya',
                'body' => 'Profil, voucher, transaksi, bantuan, dan tutorial tersedia di halaman Saya.',
                'callout' => ['selector' => '[data-tour="student-saya"]'],
            ],
        ]);

        $multiSubjectTutorial = Tutorial::updateOrCreate(
            ['role' => 'student', 'context' => 'package-builder'],
            [
                'title' => 'Memesan dua atau lebih mata pelajaran',
                'description' => 'Satu paket dapat dibagi ke beberapa mapel tanpa menambah jumlah sesi.',
                'sort_order' => 5,
                'is_active' => true,
            ]
        );
        $this->syncSteps($multiSubjectTutorial, [
            [
                'title' => 'Pilih paket multi-mapel',
                'body' => 'Pilih paket yang mendukung dua atau tiga mata pelajaran. Batas mapel terlihat pada setiap kartu paket.',
                'callout' => ['selector' => '[data-tour="package-plan-picker"]'],
            ],
            [
                'title' => 'Tentukan durasi pertemuan',
                'body' => 'Pilih 1, 2, atau 3 jam. Durasi yang sama digunakan pada seluruh pertemuan dalam paket.',
                'callout' => ['selector' => '[data-tour="package-duration-picker"]'],
            ],
            [
                'title' => 'Tambahkan mata pelajaran',
                'body' => 'Tekan Tambah Mapel. Sistem langsung membagi seluruh sesi secara merata tanpa mengubah total paket.',
                'callout' => ['selector' => '[data-tour="package-add-subject"]'],
            ],
            [
                'title' => 'Atur pembagian sesi',
                'body' => 'Gunakan tombol kurang dan tambah untuk memindahkan satu sesi. Tombol Bagi merata dapat mengembalikan pembagian seimbang.',
                'callout' => ['selector' => '[data-tour="package-allocation"]'],
            ],
            [
                'title' => 'Periksa jadwal dan pesanan',
                'body' => 'Pastikan jam setiap mapel tidak bertumpang tindih. Buka ringkasan sebelum mengonfirmasi pembayaran.',
                'callout' => ['selector' => '[data-tour="package-review-order"]'],
            ],
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
            ['title' => 'Paket sudah dibayar', 'body' => 'Penawaran baru dikirim setelah pembayaran murid diterima. Jadwal aktif setelah seluruh tutor menerima.'],
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
