<?php

namespace App\Models\Concerns;

use LogicException;

trait ImmutableFinancialRecord
{
    public static function bootImmutableFinancialRecord(): void
    {
        static::updating(function (): void {
            throw new LogicException('Catatan keuangan permanen tidak dapat diubah.');
        });
        static::deleting(function (): void {
            throw new LogicException('Catatan keuangan permanen tidak dapat dihapus.');
        });
    }
}
