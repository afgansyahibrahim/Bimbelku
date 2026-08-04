<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'subject',
        'status', // open, closed
    ];

    // Pemilik Tiket
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Daftar Percakapan
    public function replies()
    {
        return $this->hasMany(TicketReply::class);
    }

    public function latestReply()
    {
        return $this->hasOne(TicketReply::class)->latestOfMany();
    }
}