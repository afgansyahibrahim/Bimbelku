import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(`Kontrak Tahap 6C-C gagal: ${message}`);
};

const routes = read("bimbelku-backend/routes/api.php");
const controller = read("bimbelku-backend/app/Http/Controllers/Api/AdminFinanceOperationsController.php");
const workflow = read("bimbelku-backend/app/Http/Controllers/Api/SessionWorkflowController.php");
const walletService = read("bimbelku-backend/app/Services/CustomerWalletService.php");
const ledger = read("bimbelku-backend/app/Services/FinancialLedgerService.php");
const migration = read("bimbelku-backend/database/migrations/2026_08_01_000500_build_stage_six_c_finance_operations.php");
const paymentPage = read("src/pages/admin/PaymentVerification.tsx");
const payoutPage = read("src/pages/admin/FinanceReport.tsx");
const refundPage = read("src/pages/admin/RefundManagement.tsx");
const studentHistory = read("src/pages/students/TransactionHistory.tsx");
const test = read("bimbelku-backend/tests/Feature/StageSixCFinanceOperationsTest.php");

for (const endpoint of [
  "Route::get('/finance/payments'",
  "Route::get('/finance/refunds'",
  "Route::get('/student/wallet'",
]) expect(routes.includes(endpoint), `endpoint ${endpoint} tersedia`);

expect(controller.includes("pending_amount") && controller.includes("accepted_30_days"), "monitoring pembayaran memiliki ringkasan khusus uang masuk");
expect(controller.includes("wallet_liability") && controller.includes("wallet_credited_30_days"), "monitoring refund memiliki ringkasan saldo");
expect(paymentPage.includes("Pembayaran murid") && paymentPage.includes("refund dan pencairan tutor"), "halaman pembayaran dipisahkan secara eksplisit");
expect(payoutPage.includes("Pencairan tutor") && payoutPage.includes("ready_amount") && payoutPage.includes("requested_amount"), "halaman pencairan hanya memakai metrik pencairan");
expect(refundPage.includes("Transfer ke rekening asal") && refundPage.includes("Masuk Saldo BimbelKu"), "admin dapat memilih dua tujuan refund");
expect(refundPage.includes("Bukti transfer refund wajib diunggah"), "refund bank mewajibkan bukti");

expect(migration.includes("customer_wallets") && migration.includes("customer_wallet_transactions"), "migrasi saldo dan mutasi tersedia");
expect(migration.includes("event_key") && migration.includes("refund_id") && migration.includes("balance_after"), "mutasi memiliki idempotensi dan saldo sesudah");
expect(walletService.includes("lockForUpdate") && walletService.includes("refund:{$refund->id}:wallet_credit"), "kredit saldo transaksional dan idempoten");
expect(workflow.includes("required_if:destination_method,bank_transfer") && workflow.includes("bimbelku_balance"), "alur refund memvalidasi tujuan dan bukti");
expect(ledger.includes("customer_wallet_liability") && ledger.includes("recordRefundCreditedToWallet"), "jurnal saldo memakai akun kewajiban pelanggan");
expect(studentHistory.includes("Saldo BimbelKu") && studentHistory.includes("/student/wallet"), "murid melihat saldo dan mutasi refund");

for (const scenario of [
  "test_payment_monitoring_separates_pending_and_history",
  "test_refund_can_be_credited_to_bimbelku_balance_once",
  "test_bank_refund_requires_proof_and_keeps_destination_snapshot",
  "test_paid_refund_cannot_be_processed_again_with_a_different_key",
]) expect(test.includes(scenario), `tes backend memuat ${scenario}`);

console.log("Kontrak Tahap 6C-C lulus (pemisahan keuangan, refund, dan Saldo BimbelKu).");
