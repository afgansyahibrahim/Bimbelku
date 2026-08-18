<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\CustomerWalletService;
use Illuminate\Http\Request;

class CustomerWalletController extends Controller
{
    public function show(Request $request, CustomerWalletService $wallets)
    {
        return response()->json($wallets->snapshot((int) $request->user()->id));
    }

    public function quote(Request $request, Order $order, CustomerWalletService $wallets)
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id, 404);

        return response()->json($wallets->quoteForOrder($order, (int) $request->user()->id));
    }
}
