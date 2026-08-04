import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(projectRoot, relativePath));

const checks = [
  {
    file: "src/lib/educationCatalog.ts",
    patterns: [/EDUCATION_LEVELS\s*=\s*\[\s*"SD",\s*"SMP",\s*"SMA",\s*"Umum",?\s*\]/],
    forbidden: [/Perguruan Tinggi/, /Semester 14/],
  },
  {
    file: "bimbelku-backend/app/Support/EducationCatalog.php",
    patterns: [/public const LEVELS\s*=\s*\[\s*'SD',\s*'SMP',\s*'SMA',\s*'Umum',?\s*\]/],
    forbidden: [/Semester 14/],
  },
  {
    file: "bimbelku-backend/database/migrations/2026_07_29_000300_harden_stage_three_finance.php",
    patterns: [
      /financial_journals/,
      /financial_ledger_entries/,
      /financial_audit_logs/,
      /idempotency_records/,
      /finance_ledger_chain_lock/,
      /finance_audit_chain_lock/,
    ],
  },
  {
    file: "bimbelku-backend/app/Services/FinancialLedgerService.php",
    patterns: [/Jurnal keuangan harus seimbang/, /finance_ledger_chain_lock/, /event_key/, /previous_hash/],
  },
  {
    file: "bimbelku-backend/app/Http/Middleware/EnforceIdempotency.php",
    patterns: [/Idempotency-Key/, /request_hash/, /Kunci transaksi sudah digunakan untuk data berbeda/],
  },
  {
    file: "src/lib/http.ts",
    patterns: [/financialMutationKeys/, /Idempotency-Key/, /5 \* 60_000/],
  },
  {
    file: "bimbelku-backend/app/Http/Controllers/Api/TeacherController.php",
    patterns: [/current_password/, /payout_hold_until/, /bank_account_fingerprint/],
  },
  {
    file: "bimbelku-backend/app/Http/Controllers/Api/AdminController.php",
    patterns: [/Pencairan ditahan sampai/, /lockForUpdate\(\)/, /proof_file/, /payout_status' => 'paid'/],
    forbidden: [/harus disetujui admin kedua/, /approval_id/, /requiresSecondApproval/],
  },
  {
    file: "bimbelku-backend/routes/api.php",
    patterns: [/idempotency/, /finance\.audit/, /Route::post\('\/payout'/],
    forbidden: [/finance-security/, /finance\.2fa/, /payout-approvals/],
  },
  {
    file: "src/pages/admin/FinanceReport.tsx",
    patterns: [/Catat pencairan tutor/, /payoutHoldUntil/, /proof_file/],
    forbidden: [/Ajukan persetujuan admin kedua/, /payout-approvals/, /approval_id/, /finance-security/],
  },
  {
    file: "bimbelku-backend/tests/Feature/StageThreeFinanceSecurityTest.php",
    patterns: [
      /test_single_admin_can_use_finance_without_authenticator/,
      /test_idempotency_key_replays_one_finance_mutation/,
      /test_paid_order_creates_balanced_immutable_journal/,
      /test_single_admin_can_complete_high_value_payout_with_proof_and_database_locking/,
    ],
  },
];

const failures = [];
for (const check of checks) {
  if (!exists(check.file)) {
    failures.push(`${check.file}: file wajib tidak ditemukan`);
    continue;
  }
  const source = read(check.file);
  for (const pattern of check.patterns) {
    if (!pattern.test(source)) failures.push(`${check.file}: pola wajib ${pattern} tidak ditemukan`);
  }
  for (const pattern of check.forbidden || []) {
    if (pattern.test(source)) failures.push(`${check.file}: pola terlarang ${pattern} ditemukan`);
  }
}

for (const removed of [
  "src/pages/admin/FinanceSecurity.tsx",
  "src/pages/admin/AdminAccessControl.tsx",
]) {
  if (exists(removed)) failures.push(`${removed}: halaman lama seharusnya sudah dihapus`);
}

if (failures.length) {
  console.error("Kontrak Tahap 3 gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Kontrak Tahap 3 lulus: jurnal berpasangan, idempotensi, audit, penahanan rekening, dan pencairan admin tunggal tersedia tanpa autentikator.");
