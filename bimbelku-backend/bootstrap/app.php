<?php

use App\Models\Promotion;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\App\Http\Middleware\ApplySecurityHeaders::class);

        $middleware->alias([
            'active.account' => \App\Http\Middleware\EnsureActiveAccount::class,
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
            'idempotency' => \App\Http\Middleware\EnforceIdempotency::class,
            'finance.audit' => \App\Http\Middleware\AuditFinancialAction::class,
            'admin.permission' => \App\Http\Middleware\EnsureAdminPermission::class,
            'admin.audit' => \App\Http\Middleware\AuditAdminAction::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, \Throwable $exception): bool =>
                $request->is('api/*') || $request->expectsJson()
        );

        $exceptions->render(function (ModelNotFoundException $exception, Request $request) {
            if ($request->is('api/*') && $exception->getModel() === Promotion::class) {
                return response()->json([
                    'message' => 'Promo tidak ditemukan atau sudah dihapus.',
                ], 404);
            }

            return null;
        });
    })->create();
