<?php

namespace Tests\Feature;

use App\Models\BookingRequest;
use App\Models\TeacherAvailability;
use App\Models\TeacherOffer;
use App\Models\TeacherProfile;
use App\Models\TeacherSubject;
use App\Models\User;
use App\Services\TeacherMatchingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherOfferResponseWindowTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_online_offer_moves_on_after_thirty_minutes(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-10 08:00:00', 'Asia/Jakarta'));
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $this->makeEligibleTeacher(online: true, offline: false);
        $bookingRequest = $this->makeRequest($student, 'online');

        app(TeacherMatchingService::class)->dispatchNextOffer($bookingRequest);

        $offer = TeacherOffer::query()->firstOrFail();
        $this->assertTrue($offer->expires_at->equalTo(now()->addMinutes(30)));
        $this->assertTrue(
            $bookingRequest->fresh()->teacher_response_deadline->equalTo($offer->expires_at)
        );
    }

    public function test_expired_online_offer_is_immediately_forwarded_to_the_next_teacher(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-10 08:00:00', 'Asia/Jakarta'));
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $this->makeEligibleTeacher(online: true, offline: false);
        $this->makeEligibleTeacher(online: true, offline: false);
        $bookingRequest = $this->makeRequest($student, 'online');
        $matchingService = app(TeacherMatchingService::class);

        $firstOffer = $matchingService->dispatchNextOffer($bookingRequest);
        $this->assertNotNull($firstOffer);

        Carbon::setTestNow(now()->addMinutes(31));
        $matchingService->expireOfferAndContinue($firstOffer);

        $offers = TeacherOffer::query()->orderBy('id')->get();
        $this->assertCount(2, $offers);
        $this->assertSame('expired', $offers[0]->status);
        $this->assertSame('pending', $offers[1]->status);
        $this->assertNotSame($offers[0]->teacher_id, $offers[1]->teacher_id);
        $this->assertTrue($offers[1]->expires_at->equalTo(now()->addMinutes(30)));
    }

    public function test_offline_offer_moves_on_after_two_hours(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-10 08:00:00', 'Asia/Jakarta'));
        $student = User::factory()->create(['role' => 'student', 'status' => 'active']);
        $this->makeEligibleTeacher(online: false, offline: true);
        $bookingRequest = $this->makeRequest($student, 'offline');

        app(TeacherMatchingService::class)->dispatchNextOffer($bookingRequest);

        $offer = TeacherOffer::query()->firstOrFail();
        $this->assertTrue($offer->expires_at->equalTo(now()->addMinutes(120)));
        $this->assertTrue(
            $bookingRequest->fresh()->teacher_response_deadline->equalTo($offer->expires_at)
        );
    }

    private function makeEligibleTeacher(bool $online, bool $offline): User
    {
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'status' => 'active',
        ]);
        $profile = TeacherProfile::create([
            'user_id' => $teacher->id,
            'latitude' => -7.795580,
            'longitude' => 110.369490,
            'max_travel_km' => 12,
            'points' => 150,
            'is_accepting_requests' => true,
            'verified_at' => now()->subDay(),
        ]);
        TeacherSubject::create([
            'teacher_profile_id' => $profile->id,
            'name' => 'Matematika',
            'levels' => ['SMA'],
            'is_active' => true,
            'is_online' => $online,
            'is_offline' => $offline,
            'is_private_active' => true,
        ]);
        TeacherAvailability::create([
            'user_id' => $teacher->id,
            'day' => 'Senin',
            'slots' => [],
            'start_time' => '14:00:00',
            'end_time' => '18:00:00',
            'is_active' => true,
        ]);

        return $teacher;
    }

    private function makeRequest(User $student, string $mode): BookingRequest
    {
        return BookingRequest::create([
            'student_id' => $student->id,
            'subject_name' => 'Matematika',
            'education_level' => 'SMA',
            'grade' => 'Kelas 12',
            'learning_mode' => $mode,
            'class_type' => 'private',
            'scheduled_date' => '2026-08-17',
            'start_time' => '15:00:00',
            'end_time' => '16:00:00',
            'duration_hours' => 1,
            'address' => $mode === 'offline' ? 'Alamat uji di Yogyakarta' : null,
            'latitude' => $mode === 'offline' ? -7.795580 : null,
            'longitude' => $mode === 'offline' ? 110.369490 : null,
            'status' => 'matching',
            'search_radius_km' => $mode === 'offline' ? 3 : 12,
            'search_started_at' => now(),
            'search_expires_at' => now()->addHours(48),
        ]);
    }
}
