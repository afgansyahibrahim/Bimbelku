<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;

trait HasAutomaticPublicCode
{
    public static function bootHasAutomaticPublicCode(): void
    {
        static::created(function (Model $model): void {
            $column = $model->automaticPublicCodeColumn();
            if ($model->getAttribute($column)) {
                return;
            }

            $model->forceFill([
                $column => $model->buildAutomaticPublicCode(),
            ])->saveQuietly();
        });
    }

    abstract protected function automaticPublicCodeColumn(): string;

    abstract protected function buildAutomaticPublicCode(): string;

    protected function paddedPublicId(int $length = 8): string
    {
        return str_pad((string) $this->getKey(), $length, '0', STR_PAD_LEFT);
    }
}
