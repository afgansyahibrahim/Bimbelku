<?php

namespace App\Console\Commands;

use App\Services\WalletIntegrityService;
use Illuminate\Console\Command;

class VerifyCustomerWallets extends Command
{
    protected $signature = 'finance:verify-wallets';

    protected $description = 'Memeriksa saldo tersedia, saldo tertahan, mutasi wallet, dan kewajiban wallet pada ledger';

    public function handle(WalletIntegrityService $integrity): int
    {
        $errors = $integrity->errors();
        if ($errors !== []) {
            foreach ($errors as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $this->info('Saldo BimbelKu, cadangan pembayaran, riwayat mutasi, dan liability ledger konsisten.');

        return self::SUCCESS;
    }
}
