<?php

namespace Tests\Unit;

use App\Services\TeacherPointService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class TeacherPointServiceTest extends TestCase
{
    public static function pointBands(): array
    {
        return [
            'above maximum is priority' => [250, 'priority', 5],
            'maximum is priority' => [200, 'priority', 5],
            'priority lower boundary' => [151, 'priority', 5],
            'normal upper boundary' => [150, 'normal', 10],
            'normal lower boundary' => [121, 'normal', 10],
            'reduced upper boundary' => [120, 'reduced', 25],
            'reduced lower boundary' => [81, 'reduced', 25],
            'restricted upper boundary' => [80, 'restricted', 50],
            'restricted lower boundary' => [41, 'restricted', 50],
            'lowest upper boundary' => [40, 'lowest', 100],
            'lowest lower boundary' => [1, 'lowest', 100],
            'zero disables matching' => [0, 'disabled', 1000],
            'negative disables matching' => [-10, 'disabled', 1000],
        ];
    }

    #[DataProvider('pointBands')]
    public function test_recommendation_boundaries(
        int $points,
        string $expectedBand,
        int $expectedWeight
    ): void {
        $service = new TeacherPointService();

        $this->assertSame($expectedBand, $service->recommendationBand($points));
        $this->assertSame($expectedWeight, $service->recommendationWeight($points));
    }
}
