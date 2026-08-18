<?php

namespace App\Support;

final class PublicMedia
{
    public static function url(?string $path): ?string
    {
        if (blank($path)) {
            return null;
        }

        $path = trim((string) $path);
        if (preg_match('#^https?://#i', $path) === 1) {
            return $path;
        }

        $path = ltrim(str_replace('\\', '/', $path), '/');
        $path = preg_replace('#^(?:storage/|api/public-media/)#', '', $path) ?? $path;
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', $path)));

        // Host diambil dari request yang sedang aktif. URL media tidak lagi
        // bergantung pada APP_URL yang sering berbeda dengan alamat Laragon.
        return request()->getSchemeAndHttpHost().'/api/public-media/'.$encodedPath;
    }
}
