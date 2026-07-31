<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DynamicBanner extends Model
{
    protected $guarded = ['id'];
    protected $appends = ['image_url'];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) return null;
        return str_starts_with($this->image_path, 'http')
            ? $this->image_path
            : asset('storage/'.$this->image_path);
    }
}
