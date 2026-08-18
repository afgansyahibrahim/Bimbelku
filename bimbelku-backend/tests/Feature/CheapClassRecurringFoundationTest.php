<?php

namespace Tests\Feature;

use App\Models\CheapClassEnrollment;
use App\Models\CurriculumChapter;
use App\Models\CurriculumSubject;
use App\Models\Order;
use App\Models\Refund;
use App\Models\User;
use App\Services\CheapClassService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CheapClassRecurringFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_stage_one_creates_automatic_codes_period_key_and_template_snapshot(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-13 09:00:00', 'Asia/Jakarta'));
        [$subject, $chapter] = $this->catalog();

        $result = app(CheapClassService::class)->createPackage([
            'curriculum_subject_id' => $subject->id,
            'curriculum_chapter_id' => $chapter->id,
            'subjects' => [[
                'curriculum_subject_id' => $subject->id,
                'subject_name' => $subject->name,
                'curriculum_chapter_id' => $chapter->id,
                'chapter' => $chapter->title,
            ]],
            'subject_name' => $subject->name,
            'education_level' => 'SD',
            'grade' => 'Kelas 6',
            'chapter' => $chapter->title,
            'subtopic' => null,
            'topic' => null,
            'first_session_date' => '2026-08-24',
            'start_time' => '10:00',
            'duration_minutes' => 60,
            'session_count' => 4,
            'recurrence_days' => [1],
            'price_per_session' => 25000,
            'custom_price_per_student' => null,
            'price_per_student' => 100000,
            'minimum_participants' => 2,
            'maximum_participants' => 6,
            'registration_window_hours' => 24,
            'registration_closes_before_minutes' => 60,
            'payment_window_minutes' => 60,
        ]);

        $template = $result['template']->fresh();
        $package = $result['class']->fresh();

        $this->assertMatchesRegularExpression('/^KMT-\d{10}$/', $template->template_code);
        $this->assertFalse($template->recurrence_enabled);
        $this->assertFalse($template->is_active);
        $this->assertSame(1, $template->settings_version);
        $this->assertMatchesRegularExpression('/^KMP-\d{8}-\d{8}$/', $package->package_code);
        $this->assertSame('manual', $package->generation_source);
        $this->assertSame(1, $package->template_settings_version);
        $this->assertSame($template->template_code, $package->template_snapshot['template_code']);
        $this->assertSame('2026-08-17', $package->occurrence_week_start->toDateString());

        Carbon::setTestNow();
    }

    public function test_stage_one_creates_unique_invoice_and_refund_codes_automatically(): void
    {
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        [$subject, $chapter] = $this->catalog();
        $package = app(CheapClassService::class)->createPackage([
            'curriculum_subject_id' => $subject->id,
            'curriculum_chapter_id' => $chapter->id,
            'subjects' => [[
                'curriculum_subject_id' => $subject->id,
                'subject_name' => $subject->name,
                'curriculum_chapter_id' => $chapter->id,
                'chapter' => $chapter->title,
            ]],
            'subject_name' => $subject->name,
            'education_level' => 'SD',
            'grade' => 'Kelas 6',
            'chapter' => $chapter->title,
            'first_session_date' => now()->addWeeks(2)->startOfWeek()->toDateString(),
            'start_time' => '10:00',
            'duration_minutes' => 60,
            'session_count' => 1,
            'recurrence_days' => [now()->addWeeks(2)->startOfWeek()->dayOfWeekIso],
            'price_per_session' => 25000,
            'custom_price_per_student' => null,
            'price_per_student' => 25000,
            'minimum_participants' => 2,
            'maximum_participants' => 6,
            'registration_window_hours' => 24,
            'registration_closes_before_minutes' => 60,
            'payment_window_minutes' => 60,
        ])['class'];

        $enrollment = CheapClassEnrollment::create([
            'cheap_class_id' => $package->id,
            'student_id' => $student->id,
            'amount' => 25000,
            'status' => 'confirmed',
        ]);
        $order = Order::create([
            'user_id' => $student->id,
            'cheap_class_enrollment_id' => $enrollment->id,
            'amount' => 25000,
            'status' => 'paid',
        ])->fresh();
        $refund = Refund::create([
            'order_id' => $order->id,
            'user_id' => $student->id,
            'amount' => 25000,
            'reason' => 'Pengujian fondasi.',
            'status' => 'pending',
        ])->fresh();

        $this->assertMatchesRegularExpression('/^INV-KM-\d{8}-\d{8}$/', $order->order_id);
        $this->assertMatchesRegularExpression('/^RFD-KM-\d{8}$/', $refund->refund_code);
        $this->assertSame(1, DB::table('orders')->where('order_id', $order->order_id)->count());
        $this->assertSame(1, DB::table('refunds')->where('refund_code', $refund->refund_code)->count());
    }

    private function catalog(): array
    {
        $subject = CurriculumSubject::create([
            'name' => 'Matematika',
            'normalized_name' => 'matematika',
            'education_levels' => ['SD'],
            'grades' => ['Kelas 6'],
            'is_active' => true,
        ]);
        $chapter = CurriculumChapter::create([
            'curriculum_subject_id' => $subject->id,
            'education_level' => 'SD',
            'grade' => 'Kelas 6',
            'title' => 'Pecahan',
            'normalized_title' => 'pecahan',
            'is_active' => true,
        ]);

        return [$subject, $chapter];
    }
}
