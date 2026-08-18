<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    protected $fillable = [
        'merchant_name',
        'bank_name',
        'account_number',
        'account_name',
        'qris_image',
        'singleton_key',
    ];
}
