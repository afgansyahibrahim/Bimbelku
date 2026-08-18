<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PublicMediaController extends Controller
{
    public function __invoke(string $path): BinaryFileResponse
    {
        $path = ltrim(str_replace('\\', '/', rawurldecode($path)), '/');
        abort_if(
            $path === ''
                || str_contains($path, '..')
                || preg_match('#^[A-Za-z0-9][A-Za-z0-9._/-]*$#', $path) !== 1,
            404
        );

        $disk = Storage::disk('public');
        abort_unless($disk->exists($path), 404, 'File gambar tidak ditemukan.');

        return response()->file($disk->path($path), [
            'Content-Type' => $disk->mimeType($path) ?: 'application/octet-stream',
            'Cache-Control' => 'public, max-age=86400, stale-while-revalidate=604800',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
