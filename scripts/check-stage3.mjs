import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const checks = [
  {
    file: "src/lib/educationCatalog.ts",
    patterns: [
      /EDUCATION_LEVELS\s*=\s*\[\s*"SD",\s*"SMP",\s*"SMA",\s*"Umum",?\s*\]/,
    ],
    forbidden: [/Perguruan Tinggi/, /Semester 14/],
  },
  {
    file: "bimbelku-backend/app/Support/EducationCatalog.php",
    patterns: [
      /public const LEVELS\s*=\s*\[\s*'SD',\s*'SMP',\s*'SMA',\s*'Umum',?\s*\]/,
    ],
    forbidden: [/Semester 14/],
  },
  {
    file: "bimbelku-backend/database/migrations/2026_07_29_000200_remove_higher_education_level.php",
    patterns: [
      /deactivateRows/,
      /removeLevelFromJsonColumn/,
      /Perguruan Tinggi/,
    ],
  },
  {
    file: "bimbelku-backend/database/migrations/2026_07_29_000300_harden_stage_three_finance.php",
    patterns: [
      /financial_journals/,
      /financial_ledger_entries/,
      /financial_audit_logs/,
      /idempotency_records/,
      /finance_authorizations/,
      /payout_approvals/,
      /finance_ledger_chain_lock/,
      /finance_audit_chain_lock/,
    ],
  },
  {
    file: "bimbelku-backend/app/Services/FinancialLedgerService.php",
    patterns: [
      /Jurnal keuangan harus seimbang/,
      /finance_ledger_chain_lock/,
      /event_key/,
      /previous_hash/,
    ],
  },
  {
    file: "bimbelku-backend/app/Services/FinanceTotpService.php",
    patterns: [
      /hash_hmac\('sha1'/,
      /otpauth:\/\/totp/,
      /hash_equals/,
    ],
  },
  {
    file: "bimbelku-backend/app/Http/Middleware/EnforceIdempotency.php",
    patterns: [
      /Idempotency-Key/,
      /request_hash/,
      /Kunci transaksi sudah digunakan untuk data berbeda/,
    ],
  },
  {
    file: "src/lib/http.ts",
    patterns: [
      /financialMutationKeys/,
      /Idempotency-Key/,
      /5 \* 60_000/,
    ],
  },
  {
    file: "bimbelku-backend/app/Http/Middleware/RequireFinanceAuthorization.php",
    patterns: [
      /FINANCE_2FA_SETUP_REQUIRED/,
      /FINANCE_2FA_REQUIRED/,
    ],
  },
  {
    file: "bimbelku-backend/app/Http/Controllers/Api/TeacherController.php",
    patterns: [
      /current_password/,
      /payout_hold_until/,
      /bank_account_fingerprint/,
    ],
  },
  {
    file: "bimbelku-backend/app/Http/Controllers/Api/AdminController.php",
    patterns: [
      /high_value_payout_threshold/,
      /approval_id/,
      /Pencairan ditahan sampai/,
      /harus disetujui admin kedua/,
    ],
  },
  {
    file: "bimbelku-backend/routes/api.php",
    patterns: [
      /finance-security\/authorize/,
      /finance\.2fa/,
      /idempotency/,
      /finance\.audit/,
      /payout-approvals/,
    ],
  },
  {
    file: "src/pages/admin/FinanceSecurity.tsx",
    patterns: [
      /Verifikasi dua langkah keuangan/,
      /Buat kunci autentikator/,
      /Buka tindakan keuangan/,
      /Audit tindakan terakhir/,
    ],
  },
  {
    file: "src/pages/admin/FinanceReport.tsx",
    patterns: [
      /Ajukan persetujuan/,
      /Periksa & setujui/,
      /approval_id/,
      /payoutHoldUntil/,
    ],
  },
  {
    file: "bimbelku-backend/tests/Feature/StageThreeFinanceSecurityTest.php",
    patterns: [
      /test_higher_education_is_removed/,
      /test_idempotency_key_replays/,
      /test_paid_order_creates_balanced_immutable_journal/,
      /test_high_value_payout_needs_a_different_admin_approval/,
    ],
  },
];

const failures = [];

for (const check of checks) {
  const source = read(check.file);
  for (const pattern of check.patterns) {
    if (!pattern.test(source)) {
      failures.push(`${check.file}: pola wajib ${pattern} tidak ditemukan`);
    }
  }
  for (const pattern of check.forbidden || []) {
    if (pattern.test(source)) {
      failures.push(`${check.file}: pola terlarang ${pattern} ditemukan`);
    }
  }
}

if (failures.length) {
  console.error("Kontrak Tahap 3 gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "Kontrak Tahap 3 lulus: jenjang PT dinonaktifkan, jurnal berpasangan, "
    + "idempotensi, 2FA, audit, penahanan rekening, dan persetujuan ganda tersedia.",
);
