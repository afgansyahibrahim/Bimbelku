<?php

namespace App\Console\Commands;

use App\Models\CheapClass;
use App\Models\CheapClassEnrollment;
use App\Models\CheapClassSession;
use App\Models\CurriculumChapter;
use App\Models\CurriculumSubject;
use App\Models\Notification;
use App\Models\Order;
use App\Models\TeacherProfile;
use App\Models\User;
use App\Services\CheapClassService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DemoCheapClass extends Command
{
    protected $signature = 'demo:cheap-class
        {stage=setup : setup|session-ended|status|reset}';

    protected $description = 'Menyiapkan Kelas Murah lokal untuk menguji laporan tutor, revisi/verifikasi admin, progress murid, dan penyelesaian paket tanpa menunggu jadwal nyata';

    private const STUDENT_EMAIL = 'demo.student@bimbelku.local';
    private const SECOND_STUDENT_EMAIL = 'demo.student2@bimbelku.local';
    private const TEACHER_EMAIL = 'demo.tutor@bimbelku.local';
    private const DEMO_ADMIN_EMAIL = 'demo.admin@bimbelku.local';
    private const PASSWORD = 'password';
    private const PACKAGE_PREFIX = 'DEMO-KM-';

    public function handle(): int
    {
        if (!app()->environment(['local', 'testing'])) {
            $this->error('Command demo hanya boleh dijalankan pada environment local/testing.');
            return self::FAILURE;
        }

        return match ((string) $this->argument('stage')) {
            'setup' => $this->setup(),
            'session-ended' => $this->sessionEnded(),
            'status' => $this->status(),
            'reset' => $this->resetDemo(),
            default => $this->invalidStage(),
        };
    }

    private function setup(): int
    {
        [$student, $secondStudent, $teacher] = $this->ensureDemoUsers();
        [$admin, $adminPasswordIsDemo] = $this->resolveAdminForDemo();

        $class = DB::transaction(function () use ($student, $secondStudent, $teacher) {
            $this->deletePreviousDemoClasses();

            $catalogSubject = CurriculumSubject::query()->firstOrCreate(
                ['normalized_name' => 'demo-matematika-kelas-murah'],
                [
                    'name' => 'Matematika Demo Kelas Murah',
                    'group_name' => 'Demo',
                    'education_levels' => ['SMP'],
                    'grades' => ['Kelas 7'],
                    'is_elective' => false,
                    'is_active' => false,
                    'curriculum_name' => 'Kurikulum Merdeka',
                ]
            );

            $chapter = CurriculumChapter::query()->firstOrCreate(
                [
                    'curriculum_subject_id' => $catalogSubject->id,
                    'grade' => 'Kelas 7',
                    'normalized_title' => 'aljabar dasar demo kelas murah',
                ],
                [
                    'education_level' => 'SMP',
                    'title' => 'Aljabar Dasar',
                    'sort_order' => 1,
                    'is_active' => true,
                    'source_reference' => 'demo-local',
                ]
            );

            // setup menaruh satu-satunya sesi pada kondisi sedang berlangsung.
            // session-ended nanti hanya memajukan fixture lokal ke kondisi laporan wajib.
            $start = now()->subMinutes(2)->startOfMinute();
            $end = $start->copy()->addHour();
            $price = 25000;

            $class = CheapClass::create([
                'cheap_class_template_id' => null,
                'curriculum_subject_id' => $catalogSubject->id,
                'curriculum_chapter_id' => $chapter->id,
                'teacher_id' => $teacher->id,
                'package_code' => self::PACKAGE_PREFIX.now()->format('YmdHis').'-'.$student->id,
                'subject_name' => 'Matematika Demo Kelas Murah',
                'education_level' => 'SMP',
                'grade' => 'Kelas 7',
                'chapter' => 'Aljabar Dasar',
                'subjects' => [[
                    'curriculum_subject_id' => $catalogSubject->id,
                    'subject_name' => 'Matematika Demo Kelas Murah',
                    'curriculum_chapter_id' => $chapter->id,
                    'chapter' => 'Aljabar Dasar',
                    'progress_status' => 'not_started',
                    'needs_review' => false,
                    'progress_notes' => null,
                    'progress_updated_at' => null,
                ]],
                'subtopic' => 'Persamaan dan operasi aljabar dasar',
                'topic' => 'Latihan aljabar dasar dalam kelas grup online.',
                'starts_at' => $start,
                'ends_at' => $end,
                'session_count' => 1,
                'registration_opens_at' => $start->copy()->subDays(2),
                'registration_deadline' => $start->copy()->subDay(),
                'price_per_student' => $price,
                'price_per_session' => $price,
                'custom_price_per_student' => null,
                'minimum_participants' => 2,
                'maximum_participants' => 6,
                'payment_window_minutes' => 60,
                'status' => 'confirmed',
                'meeting_link' => 'https://zoom.us/j/12345678901',
                'confirmed_at' => $start->copy()->subDay(),
                'generation_source' => 'manual',
                'template_settings_version' => 1,
            ]);

            $session = CheapClassSession::create([
                'cheap_class_id' => $class->id,
                'session_number' => 1,
                'starts_at' => $start,
                'ends_at' => $end,
                'status' => 'scheduled',
            ]);

            foreach ([$student, $secondStudent] as $index => $participant) {
                $enrollment = CheapClassEnrollment::create([
                    'cheap_class_id' => $class->id,
                    'student_id' => $participant->id,
                    'amount' => $price,
                    'status' => 'confirmed',
                    'seat_expires_at' => null,
                    'payment_submitted_at' => $start->copy()->subDay(),
                    'confirmed_at' => $start->copy()->subDay(),
                ]);

                Order::create([
                    'user_id' => $participant->id,
                    'cheap_class_enrollment_id' => $enrollment->id,
                    'order_id' => 'DEMO-KM-ORD-'.now()->format('YmdHis').'-'.$index.'-'.$enrollment->id,
                    'subtotal_amount' => $price,
                    'discount_amount' => 0,
                    'amount' => $price,
                    'status' => 'paid',
                    'payment_submitted_at' => $start->copy()->subDay(),
                    'verified_at' => $start->copy()->subDay(),
                    'class_details_snapshot' => [
                        'flow_version' => 4,
                        'kind' => 'cheap_class',
                        'cheap_class_id' => $class->id,
                        'package_code' => $class->package_code,
                        'subject' => 'Matematika Demo Kelas Murah',
                        'chapter' => 'Aljabar Dasar',
                        'type' => 'Kelas Murah',
                        'method' => 'online',
                        'teacher_name' => $teacher->name,
                        'session_count' => 1,
                        'payment_scope' => 'package',
                        'payment_frequency' => 'once',
                    ],
                ]);
            }

            return $class->fresh(['teacher', 'sessions', 'enrollments.order']);
        });

        $this->newLine();
        $this->info('Demo Kelas Murah siap dan sedang berada pada waktu belajar.');
        $this->line('Murid : '.self::STUDENT_EMAIL.' / '.self::PASSWORD);
        $this->line('Tutor : '.self::TEACHER_EMAIL.' / '.self::PASSWORD);
        if ($admin) {
            $this->line('Admin : '.$admin->email.($adminPasswordIsDemo ? ' / '.self::PASSWORD : ' / gunakan password admin utama yang sudah ada'));
        } else {
            $this->warn('Admin utama tidak ditemukan. Login admin diperlukan untuk tahap verifikasi laporan.');
        }
        $this->line('Paket : '.$class->package_code);
        $this->line('Kelas ID : '.$class->id);
        $this->line('Sesi ID : '.$class->sessions->first()?->id);
        $this->line('Jadwal : '.$class->starts_at->format('d-m-Y H:i').' - '.$class->ends_at->format('H:i'));
        $this->line('Peserta terkonfirmasi : '.$class->enrollments->where('status', 'confirmed')->count());
        $this->newLine();
        $this->comment('1) Tutor: buka /guru/kelas-murah. Kelas demo sedang berlangsung dan link Zoom sudah tersedia.');
        $this->comment('2) Saat siap mengetes penutupan sesi, jalankan: php artisan demo:cheap-class session-ended');
        $this->comment('3) Tutor: isi jumlah hadir + progress Bab + catatan, lalu Kirim Laporan Sesi.');
        $this->comment('4) Admin: buka /admin/kelas-murah/jadwal -> Minta Perbaikan atau Konfirmasi Sesi.');
        $this->comment('5) Jika minta perbaikan, tutor revisi lalu kirim ulang; setelah admin konfirmasi, paket 1 sesi otomatis selesai.');
        $this->comment('6) Murid: cek /student/progress/cheap-class/'.$class->id.' dan Riwayat.');
        $this->comment('Command ini tidak mengubah aturan production dan ditolak di luar local/testing.');

        return self::SUCCESS;
    }

    private function sessionEnded(): int
    {
        $class = $this->latestDemoClass();
        if (!$class) {
            $this->error('Belum ada Kelas Murah demo. Jalankan: php artisan demo:cheap-class setup');
            return self::FAILURE;
        }

        $session = $class->sessions()->orderBy('session_number')->first();
        if (!$session) {
            $this->error('Sesi demo tidak ditemukan.');
            return self::FAILURE;
        }

        if (in_array($session->status, ['awaiting_admin_verification', 'revision_requested', 'completed'], true)) {
            $this->warn('Sesi sudah melewati tahap penutupan waktu. Tidak ada waktu yang diubah.');
            return $this->status();
        }

        DB::transaction(function () use ($class, $session) {
            $endedAt = now()->subMinute()->startOfMinute();
            $startedAt = $endedAt->copy()->subHour();

            CheapClassSession::query()->whereKey($session->id)->update([
                'starts_at' => $startedAt,
                'ends_at' => $endedAt,
                'status' => 'scheduled',
            ]);
            CheapClass::query()->whereKey($class->id)->update([
                'starts_at' => $startedAt,
                'ends_at' => $endedAt,
            ]);
        });

        app(CheapClassService::class)->refreshLifecycle(false);
        $session = $session->fresh();

        if ($session?->status !== 'report_required') {
            $this->error('Sesi belum berubah menjadi report_required. Periksa lifecycle Kelas Murah.');
            return self::FAILURE;
        }

        $this->info('Waktu sesi demo sudah dipercepat. Tutor sekarang wajib mengirim laporan sesi.');
        $this->line('Status sesi : report_required');
        $this->comment('Refresh /guru/kelas-murah lalu pilih Isi & Kirim Laporan.');

        return self::SUCCESS;
    }

    private function status(): int
    {
        $class = $this->latestDemoClass();
        if (!$class) {
            $this->warn('Belum ada Kelas Murah demo aktif.');
            return self::SUCCESS;
        }

        app(CheapClassService::class)->refreshLifecycle(false);
        $class = $class->fresh(['teacher', 'sessions', 'enrollments.order']);
        $session = $class->sessions->first();
        $subjects = app(CheapClassService::class)->classSubjects($class);
        $subject = $subjects[0] ?? null;

        $this->table(['Data', 'Nilai'], [
            ['Paket', $class->package_code ?: '-'],
            ['Status paket', $class->status],
            ['Tutor', $class->teacher?->email ?: '-'],
            ['Peserta confirmed', $class->enrollments->where('status', 'confirmed')->count()],
            ['Order paid', $class->enrollments->filter(fn ($item) => $item->order?->status === 'paid')->count()],
            ['Sesi', $session ? $session->session_number.'/'.$class->session_count : '-'],
            ['Status sesi', $session?->status ?: '-'],
            ['Mulai', $session?->starts_at?->format('d-m-Y H:i') ?: '-'],
            ['Selesai', $session?->ends_at?->format('d-m-Y H:i') ?: '-'],
            ['Jumlah hadir', $session?->attended_participants_count !== null ? (string) $session->attended_participants_count : 'belum diisi'],
            ['Laporan tutor', $session?->report_submitted_at ? 'sudah dikirim' : 'belum'],
            ['Revisi admin', $session?->status === 'revision_requested' ? ($session->admin_review_notes ?: 'diminta') : 'tidak'],
            ['Verifikasi admin', $session?->admin_reviewed_at && $session?->status === 'completed' ? 'sudah' : 'belum'],
            ['Progress resmi murid', $subject ? (($subject['chapter'] ?? '-').' = '.($subject['progress_status'] ?? 'not_started')) : '-'],
        ]);

        if ($session?->status === 'scheduled') {
            $this->comment('Berikutnya: php artisan demo:cheap-class session-ended');
        } elseif ($session?->status === 'report_required') {
            $this->comment('Berikutnya: tutor kirim laporan dari /guru/kelas-murah.');
        } elseif ($session?->status === 'awaiting_admin_verification') {
            $this->comment('Berikutnya: admin cek /admin/kelas-murah/jadwal lalu minta revisi atau konfirmasi.');
        } elseif ($session?->status === 'revision_requested') {
            $this->comment('Berikutnya: tutor perbaiki dan kirim ulang laporan.');
        } elseif ($session?->status === 'completed') {
            $this->comment('Selesai: cek Progress/Riwayat murid. Paket 1 sesi seharusnya completed.');
        }

        return self::SUCCESS;
    }

    private function resetDemo(): int
    {
        $count = $this->deletePreviousDemoClasses();
        $this->info($count > 0
            ? "{$count} Kelas Murah demo dihapus. Akun demo tetap dipertahankan."
            : 'Belum ada Kelas Murah demo. Tidak ada yang perlu direset.');
        return self::SUCCESS;
    }

    private function deletePreviousDemoClasses(): int
    {
        $classes = CheapClass::query()
            ->where('package_code', 'like', self::PACKAGE_PREFIX.'%')
            ->get();

        foreach ($classes as $class) {
            DB::transaction(function () use ($class) {
                $sessionIds = $class->sessions()->pluck('id');
                if ($sessionIds->isNotEmpty()) {
                    Notification::query()
                        ->where(function ($query) use ($sessionIds) {
                            foreach ($sessionIds as $sessionId) {
                                $query->orWhere('unique_key', 'like', "%cheap-class-session%:{$sessionId}:%");
                            }
                        })
                        ->delete();
                }

                $enrollmentIds = $class->enrollments()->pluck('id');
                if ($enrollmentIds->isNotEmpty()) {
                    Order::query()->whereIn('cheap_class_enrollment_id', $enrollmentIds)->delete();
                }

                $class->delete();
            });
        }

        return $classes->count();
    }

    private function ensureDemoUsers(): array
    {
        $student = User::query()->updateOrCreate(
            ['email' => self::STUDENT_EMAIL],
            [
                'name' => 'Demo Murid',
                'password' => self::PASSWORD,
                'role' => 'student',
                'status' => 'active',
                'email_verified_at' => now(),
                'student_education_level' => 'SMP',
                'grade' => 'Kelas 7',
                'terms_accepted_at' => now(),
                'privacy_accepted_at' => now(),
                'policy_version' => 'demo-local',
            ]
        );

        $secondStudent = User::query()->updateOrCreate(
            ['email' => self::SECOND_STUDENT_EMAIL],
            [
                'name' => 'Demo Murid Kedua',
                'password' => self::PASSWORD,
                'role' => 'student',
                'status' => 'active',
                'email_verified_at' => now(),
                'student_education_level' => 'SMP',
                'grade' => 'Kelas 7',
                'terms_accepted_at' => now(),
                'privacy_accepted_at' => now(),
                'policy_version' => 'demo-local',
            ]
        );

        $teacher = User::query()->updateOrCreate(
            ['email' => self::TEACHER_EMAIL],
            [
                'name' => 'Demo Tutor',
                'password' => self::PASSWORD,
                'role' => 'teacher',
                'status' => 'active',
                'email_verified_at' => now(),
                'terms_accepted_at' => now(),
                'privacy_accepted_at' => now(),
                'policy_version' => 'demo-local',
            ]
        );

        TeacherProfile::query()->updateOrCreate(
            ['user_id' => $teacher->id],
            [
                'expertise' => 'Matematika',
                'teaching_method' => 'Online',
                'bio' => 'Tutor demo lokal untuk pengujian Paket Belajar dan Kelas Murah.',
                'verified_at' => now(),
                'points' => 100,
                'is_accepting_requests' => true,
            ]
        );

        return [$student->fresh(), $secondStudent->fresh(), $teacher->fresh('teacherProfile')];
    }

    /** @return array{0:?User,1:bool} */
    private function resolveAdminForDemo(): array
    {
        $admin = User::query()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->orderBy('id')
            ->get()
            ->first(fn (User $user) => $user->isPrimaryAdmin());

        if ($admin) {
            return [$admin, false];
        }

        $admin = User::query()->updateOrCreate(
            ['email' => self::DEMO_ADMIN_EMAIL],
            [
                'name' => 'Demo Admin',
                'password' => self::PASSWORD,
                'role' => 'admin',
                'status' => 'active',
                'email_verified_at' => now(),
                'terms_accepted_at' => now(),
                'privacy_accepted_at' => now(),
                'policy_version' => 'demo-local',
            ]
        );

        return [$admin->fresh(), true];
    }

    private function latestDemoClass(): ?CheapClass
    {
        return CheapClass::query()
            ->where('package_code', 'like', self::PACKAGE_PREFIX.'%')
            ->latest('id')
            ->first();
    }

    private function invalidStage(): int
    {
        $this->error('Stage tidak dikenal. Gunakan: setup, session-ended, status, atau reset.');
        return self::INVALID;
    }
}
