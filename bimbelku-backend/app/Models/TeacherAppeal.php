<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherAppeal extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['evidence_path'];

    protected $casts = ['reviewed_at' => 'datetime'];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function pointEntry()
    {
        return $this->belongsTo(TeacherPointLedger::class, 'teacher_point_ledger_id');
    }
}
