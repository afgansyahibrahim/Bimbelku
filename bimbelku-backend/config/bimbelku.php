<?php

return [
    // Gunakan variabel khusus untuk identitas admin utama. SEED_ADMIN_EMAIL
    // dipertahankan sebagai fallback agar instalasi lama tetap kompatibel.
    'primary_admin_email' => mb_strtolower(trim((string) env(
        'PRIMARY_ADMIN_EMAIL',
        env('SEED_ADMIN_EMAIL', '')
    ))),
];
