<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdempotencyRecord extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'response_body' => 'encrypted',
        'expires_at' => 'datetime',
    ];
}
