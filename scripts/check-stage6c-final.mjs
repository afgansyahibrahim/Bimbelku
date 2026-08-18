import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));
const expect = (condition, message) => {
  if (!condition) throw new Error(`Kontrak Tahap 6C final gagal: ${message}`);
};

const app = read("src/App.tsx");
const routes = read("bimbelku-backend/routes/api.php");
const adminController = read("bimbelku-backend/app/Http/Controllers/Api/AdminController.php");
const userModel = read("bimbelku-backend/app/Models/User.php");
const authController = read("bimbelku-backend/app/Http/Controllers/Api/AuthController.php");
const caseCenter = read("src/pages/admin/CaseCenter.tsx");
const test = read("bimbelku-backend/tests/Feature/StageSixCFinalRegressionTest.php");
const packageJson = JSON.parse(read("package.json"));
const checkpoint = read("CHECKPOINT_TAHAP_6C_ADMIN_OPERASIONAL_DAN_REGRESI_AKHIR_2026-08-01.md");

expect(app.includes('<Route path="/admin/finance-security" element={<Navigate to="/admin/pembayaran" replace />} />'), "URL frontend lama dialihkan");
expect(app.includes('<Route path="/admin/access-control" element={<Navigate to="/admin" replace />} />'), "URL pengelolaan admin lama dialihkan");
expect(!app.includes('import("./pages/admin/FinanceSecurity")'), "halaman autentikator tidak dimuat");
expect(!app.includes('import("./pages/admin/AdminAccessControl")'), "halaman admin tambahan tidak dimuat");
expect(!exists("src/pages/admin/FinanceSecurity.tsx"), "file autentikator lama sudah dihapus");
expect(!exists("src/pages/admin/AdminAccessControl.tsx"), "file pengelolaan admin lama sudah dihapus");
expect(!routes.includes("finance-security"), "API autentikator dihapus");
expect(!routes.includes("finance.2fa"), "middleware autentikator tidak dipakai");
expect(!routes.includes("payout-approvals"), "alur admin kedua tidak dipakai");
expect(!adminController.includes("harus disetujui admin kedua"), "pencairan tidak meminta admin kedua");
expect(adminController.includes("lockForUpdate()") && adminController.includes("proof_file"), "pencairan tetap memakai lock dan bukti");
expect(userModel.includes("return $this->isPrimaryAdmin();"), "kompatibilitas superadmin menunjuk admin utama");
expect(authController.includes("Project ini hanya menggunakan satu akun admin utama."), "login admin kedua ditolak");
expect(caseCenter.includes("</SelectContent></Select></div>}"), "perbaikan syntax pusat kasus tetap terpasang");

for (const scenario of [
  "test_single_admin_finance_has_no_authenticator_route",
  "test_single_admin_has_all_modules_even_with_legacy_permission_data",
  "test_admin_management_and_second_approval_routes_remain_disabled",
  "test_second_admin_cannot_login_when_primary_admin_exists",
  "test_student_teacher_and_admin_routes_remain_isolated",
]) expect(test.includes(scenario), `tes regresi memuat ${scenario}`);

expect(packageJson.scripts["check:stage6c-final"] === "node scripts/check-stage6c-final.mjs", "script final terdaftar");
expect(packageJson.scripts.check.includes("check:stage6c-final"), "pemeriksaan utama menjalankan regresi final");
expect(checkpoint.includes("digantikan oleh Audit Checkpoint 1"), "checkpoint historis menunjuk audit terbaru");

console.log("Kontrak Tahap 6C final lulus (admin tunggal, tanpa autentikator/admin kedua, audit dan isolasi role tetap aktif).");
