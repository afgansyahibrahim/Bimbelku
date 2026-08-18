<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Refund;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StudentRefundController extends Controller
{
    public function selectDestination(Request $request, Refund $refund)
    {
        abort_unless((int) $refund->user_id === (int) $request->user()->id, 403);

        $validated = $request->validate([
            'destination_method' => ['required', Rule::in(['bank_transfer', 'bimbelku_balance'])],
            'bank_name' => ['nullable', 'required_if:destination_method,bank_transfer', 'string', 'max:100', 'regex:/\pL/u'],
            'account_name' => ['nullable', 'required_if:destination_method,bank_transfer', 'string', 'max:150', 'regex:/\pL/u', 'not_regex:/\d/u'],
            'account_number' => ['nullable', 'required_if:destination_method,bank_transfer', 'string', 'min:8', 'max:20', 'regex:/^[0-9]+$/'],
        ], [
            'bank_name.regex' => 'Nama bank atau e-wallet wajib mengandung huruf.',
            'account_name.regex' => 'Nama pemilik rekening wajib mengandung huruf.',
            'account_name.not_regex' => 'Nama pemilik rekening tidak boleh memuat angka.',
            'account_number.min' => 'Nomor rekening atau e-wallet minimal 8 digit.',
            'account_number.max' => 'Nomor rekening atau e-wallet maksimal 20 digit.',
            'account_number.regex' => 'Nomor rekening atau e-wallet hanya boleh berisi angka.',
        ]);

        $selected = DB::transaction(function () use ($refund, $request, $validated) {
            $locked = Refund::query()->lockForUpdate()->findOrFail($refund->id);
            abort_unless((int) $locked->user_id === (int) $request->user()->id, 403);
            abort_unless($locked->status === 'pending', 422, 'Refund ini sudah diproses dan tujuan tidak dapat diubah.');

            $locked->loadMissing('order');
            $breakdown = $locked->tenderBreakdown();
            if ($validated['destination_method'] === 'bank_transfer' && $breakdown['external_funded_amount'] <= 0.009) {
                abort(422, 'Pembayaran ini seluruhnya berasal dari Saldo BimbelKu. Refund harus kembali ke Saldo BimbelKu dan tidak dapat ditarik ke rekening/e-wallet.');
            }

            $wallet = $validated['destination_method'] === 'bimbelku_balance';
            $locked->update([
                'destination_method' => $validated['destination_method'],
                'destination_bank_name' => $wallet ? null : $validated['bank_name'],
                'destination_account_name' => $wallet ? null : $validated['account_name'],
                'destination_account_number' => $wallet ? null : $validated['account_number'],
                'destination_selected_at' => now(),
                'destination_selection_version' => ((int) $locked->destination_selection_version) + 1,
            ]);

            return $locked->fresh();
        }, 3);

        $selected->loadMissing('order');
        $breakdown = $selected->tenderBreakdown();

        return response()->json([
            'message' => $selected->destination_method === 'bimbelku_balance'
                ? 'Refund akan dimasukkan ke Saldo BimbelKu.'
                : 'Tujuan refund rekening/e-wallet berhasil disimpan.',
            'refund' => [
                'id' => $selected->id,
                'status' => $selected->status,
                'destination_method' => $selected->destination_method,
                'destination_bank_name' => $selected->destination_bank_name,
                'destination_account_name' => $selected->destination_account_name,
                'destination_account_number' => $selected->destination_account_number,
                'destination_selected_at' => $selected->destination_selected_at,
                'destination_selection_version' => (int) $selected->destination_selection_version,
                'wallet_funded_amount' => $breakdown['wallet_funded_amount'],
                'external_funded_amount' => $breakdown['external_funded_amount'],
            ],
        ]);
    }
}
