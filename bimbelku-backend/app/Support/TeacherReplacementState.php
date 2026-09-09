<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

final class TeacherReplacementState
{
    public const PENDING_REVIEW = 'pending_review';

    public const APPROVED = 'approved';

    public const MATCHING = 'matching';

    public const TEACHER_PENDING = 'teacher_pending';

    public const NO_TEACHER = 'no_teacher';

    public const COMPLETED = 'completed';

    public const REJECTED = 'rejected';

    public const CANCELLED = 'cancelled';

    public const REFUND_PENDING = 'refund_pending';

    public const REFUNDED = 'refunded';

    public const OPEN = [
        self::PENDING_REVIEW,
        self::APPROVED,
        self::MATCHING,
        self::TEACHER_PENDING,
        self::NO_TEACHER,
        self::REFUND_PENDING,
    ];

    private const TRANSITIONS = [
        self::PENDING_REVIEW => [self::APPROVED, self::MATCHING, self::NO_TEACHER, self::REJECTED, self::CANCELLED],
        self::APPROVED => [self::MATCHING, self::NO_TEACHER, self::CANCELLED],
        self::MATCHING => [self::TEACHER_PENDING, self::NO_TEACHER, self::COMPLETED, self::CANCELLED],
        self::TEACHER_PENDING => [self::MATCHING, self::NO_TEACHER, self::COMPLETED, self::CANCELLED],
        self::NO_TEACHER => [self::MATCHING, self::TEACHER_PENDING, self::COMPLETED, self::REFUND_PENDING, self::CANCELLED],
        self::REFUND_PENDING => [self::REFUNDED],
        self::COMPLETED => [],
        self::REJECTED => [],
        self::CANCELLED => [],
        self::REFUNDED => [],
    ];

    public static function assertCanTransition(string $from, string $to): void
    {
        if ($from === $to || in_array($to, self::TRANSITIONS[$from] ?? [], true)) {
            return;
        }

        throw ValidationException::withMessages([
            'status' => "Perubahan status penggantian guru dari {$from} ke {$to} tidak diizinkan.",
        ]);
    }

    public static function sourcesFor(string $target): array
    {
        return array_keys(array_filter(
            self::TRANSITIONS,
            fn (array $targets, string $source) => $source === $target || in_array($target, $targets, true),
            ARRAY_FILTER_USE_BOTH,
        ));
    }
}
