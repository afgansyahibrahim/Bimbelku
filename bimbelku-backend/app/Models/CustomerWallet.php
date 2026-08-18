<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerWallet extends Model
{
    /**
     * Saldo adalah data keuangan turunan. Mutasi hanya boleh lewat
     * CustomerWalletService agar row lock, idempotensi, dan jejak mutasi
     * selalu terbentuk bersama-sama.
     */
    protected $guarded = ['*'];

    protected $casts = [
        'current_balance' => 'decimal:2',
        'reserved_balance' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transactions()
    {
        return $this->hasMany(CustomerWalletTransaction::class);
    }
}
