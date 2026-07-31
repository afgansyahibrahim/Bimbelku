<?php

namespace App\Support;

final class EducationCatalog
{
    public const LEVELS = [
        'SD',
        'SMP',
        'SMA',
        'Umum',
    ];

    public const GRADES_BY_LEVEL = [
        'SD' => [
            'Kelas 1',
            'Kelas 2',
            'Kelas 3',
            'Kelas 4',
            'Kelas 5',
            'Kelas 6',
        ],
        'SMP' => [
            'Kelas 7',
            'Kelas 8',
            'Kelas 9',
        ],
        'SMA' => [
            'Kelas 10',
            'Kelas 11',
            'Kelas 12',
        ],
        'Umum' => [
            'Semua tingkat',
            'Pemula',
            'Menengah',
            'Lanjutan',
        ],
    ];

    public static function supports(string $level, string $grade): bool
    {
        return in_array($grade, self::GRADES_BY_LEVEL[$level] ?? [], true);
    }

    public static function gradesForLevels(array $levels): array
    {
        $grades = [];
        foreach ($levels as $level) {
            $grades = [
                ...$grades,
                ...(self::GRADES_BY_LEVEL[$level] ?? []),
            ];
        }

        return array_values(array_unique($grades));
    }
}
