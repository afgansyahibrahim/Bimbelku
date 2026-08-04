<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CustomerWalletService;
use Illuminate\Http\Request;

class CustomerWalletController extends Controller
{
    public function show(Request $request, CustomerWalletService $wallets)
    {
        return response()->json($wallets->snapshot((int) $request->user()->id));
    }
}
