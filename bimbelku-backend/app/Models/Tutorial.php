<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tutorial extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function steps()
    {
        return $this->hasMany(TutorialStep::class)->orderBy('sort_order')->orderBy('id');
    }
}
