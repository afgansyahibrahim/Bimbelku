<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TutorialStep extends Model
{
    protected $guarded = ['id'];
    protected $appends = ['image_url'];

    protected $casts = [
        'callout' => 'array',
        'sort_order' => 'integer',
    ];

    public function tutorial()
    {
        return $this->belongsTo(Tutorial::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) return null;
        return str_starts_with($this->image_path, 'http')
            ? $this->image_path
            : asset('storage/'.$this->image_path);
    }
}
