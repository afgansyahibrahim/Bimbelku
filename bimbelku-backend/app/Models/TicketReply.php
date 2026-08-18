<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketReply extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'user_id',
        'message',
        'attachment'
    ];

    protected $appends = ['attachment_url'];
    protected $hidden = ['attachment'];

    // Relasi ke User (Siapa yang kirim chat ini?)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    public function getAttachmentUrlAttribute()
    {
        return $this->attachment ? "ticket-replies/{$this->id}/attachment" : null;
    }
}
