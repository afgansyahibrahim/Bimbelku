<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TeacherDocumentController extends Controller
{
    private const DOCUMENT_FIELDS = [
        'cv_file',
        'identity_document',
        'live_selfie',
        'qualification_document',
        'certification_document',
    ];

    public function show(Request $request, User $teacher, string $document)
    {
        abort_unless($teacher->role === 'teacher', 404);
        abort_unless(
            $request->user()->role === 'admin'
            || (int) $request->user()->id === (int) $teacher->id,
            403
        );
        abort_unless(in_array($document, self::DOCUMENT_FIELDS, true), 404);

        $path = $teacher->teacherProfile?->{$document};
        abort_unless($path, 404);

        $headers = [
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline; filename="'.basename($path).'"',
        ];

        if (Storage::disk('local')->exists($path)) {
            return Storage::disk('local')->response($path, null, $headers);
        }

        abort(404);
    }
}
