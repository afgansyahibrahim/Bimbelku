<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinanceAuthorization extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'verified_at' => 'datetime',
        'expires_at' => 'datetime',
    ];
}
