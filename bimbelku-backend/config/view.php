<?php

return [
    'paths' => [
        resource_path('views'),
    ],

    // Jangan memakai realpath() di sini. Pada pemasangan baru, folder views
    // mungkin belum dibuat sehingga realpath() mengembalikan false dan
    // `php artisan optimize:clear` gagal dengan "View path not found".
    'compiled' => env(
        'VIEW_COMPILED_PATH',
        storage_path('framework/views')
    ),
];
