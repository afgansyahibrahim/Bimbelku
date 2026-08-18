import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const expect = (condition, message) => {
  if (!condition) throw new Error(`Checkpoint 1 gagal: ${message}`);
};

const routes = read("bimbelku-backend/routes/api.php");
const auth = read("bimbelku-backend/app/Http/Controllers/Api/AuthController.php");
const bootstrap = read("bimbelku-backend/bootstrap/app.php");
const activeMiddleware = read("bimbelku-backend/app/Http/Middleware/EnsureActiveAccount.php");
const roleMiddleware = read("bimbelku-backend/app/Http/Middleware/EnsureUserHasRole.php");
const permissionMiddleware = read("bimbelku-backend/app/Http/Middleware/EnsureAdminPermission.php");
const user = read("bimbelku-backend/app/Models/User.php");
const seeder = read("bimbelku-backend/database/seeders/AdminSeeder.php");
const frontendPermissions = read("src/lib/adminPermissions.ts");
const app = read("src/App.tsx");
const gitignore = read(".gitignore");
const backendGitignore = read("bimbelku-backend/.gitignore");
const envExample = read("bimbelku-backend/.env.example");

for (const obsolete of [
  "src/pages/admin/AdminAccessControl.tsx",
  "src/pages/admin/FinanceSecurity.tsx",
  "bimbelku-backend/app/Http/Controllers/Api/FinanceApprovalController.php",
  "bimbelku-backend/app/Http/Controllers/Api/FinanceSecurityController.php",
  "bimbelku-backend/app/Http/Middleware/RequireFinanceAuthorization.php",
  "bimbelku-backend/app/Models/FinanceAuthorization.php",
  "bimbelku-backend/app/Services/FinanceAuthorizationService.php",
  "bimbelku-backend/app/Services/FinanceTotpService.php",
]) {
  expect(!exists(obsolete), `${obsolete} seharusnya sudah dihapus`);
}

expect(routes.includes("Route::post('/register'"), "route pendaftaran hilang");
expect(routes.includes("Route::post('/login'"), "route login hilang");
expect(routes.includes("Route::post('/forgot-password'"), "route lupa password hilang");
expect(routes.includes("Route::post('/reset-password'"), "route reset password hilang");
expect(routes.includes("['auth:sanctum', 'active.account']"), "route autentikasi belum memeriksa status akun aktif");
expect(routes.includes("Route::middleware('role:student')"), "grup route murid tidak dilindungi role");
expect(routes.includes("Route::prefix('teacher')->middleware('role:teacher')"), "grup route tutor tidak dilindungi role");
expect(
  routes.includes("Route::prefix('admin')->middleware(['role:admin', 'admin.audit', 'admin.permission'])"),
  "grup route admin belum memakai role, audit, dan permission",
);

for (const forbidden of ["finance-security", "payout-approvals", "finance.2fa"]) {
  expect(!routes.includes(forbidden), `route lama ${forbidden} masih aktif`);
}

expect(auth.includes("'role'     => 'required|in:student,teacher'"), "pendaftaran publik masih dapat membuat admin");
expect(auth.includes("before_or_equal:today"), "tanggal lahir masa depan belum ditolak");
expect(auth.includes("$user->role === 'admin' && !$user->isPrimaryAdmin()"), "login admin kedua belum ditolak");
expect(bootstrap.includes("'active.account' =>"), "alias middleware akun aktif belum terdaftar");
expect(activeMiddleware.includes("$user->status !== 'active'"), "middleware akun aktif tidak memeriksa status");
expect(activeMiddleware.includes("$user->role === 'admin' && !$user->isPrimaryAdmin()"), "token admin kedua belum ditolak");
expect(roleMiddleware.includes("in_array($user->role, $roles, true)"), "middleware role tidak memakai perbandingan ketat");
expect(permissionMiddleware.includes("AdminPermissionCatalog::permissionFor"), "route admin belum dipetakan ke kebijakan akses");
expect(user.includes("private ?bool $primaryAdminCache = null"), "query admin utama belum diberi cache request-scoped");
expect(user.includes("return $this->isPrimaryAdmin();"), "hak admin tunggal belum dipusatkan pada admin utama");
expect(seeder.includes("'admin_type' => 'legacy_disabled'"), "admin lama belum dinonaktifkan oleh seeder");
expect(seeder.includes("$legacyAdmin->tokens()->delete()"), "token admin lama belum dicabut oleh seeder");

expect(app.includes('path="/admin/finance-security" element={<Navigate to="/admin/pembayaran" replace />}'), "redirect route autentikator lama hilang atau tidak aman");
expect(app.includes('path="/admin/access-control" element={<Navigate to="/admin" replace />}'), "redirect route pengelolaan admin lama hilang");
expect(frontendPermissions.includes("/^finance-security"), "redirect autentikator lama terblokir sebelum Navigate");
expect(frontendPermissions.includes("/^access-control"), "redirect kontrol akses lama terblokir sebelum Navigate");

expect(/(^|\n)\.env(\n|$)/.test(gitignore), ".env frontend belum diabaikan Git");
expect(/(^|\n)\.env(\n|$)/.test(backendGitignore), ".env backend belum diabaikan Git");
expect(envExample.includes("APP_TIMEZONE=Asia/Jakarta"), "zona waktu contoh environment bukan Asia/Jakarta");
expect(envExample.includes("PRIMARY_ADMIN_EMAIL="), "email admin utama belum didokumentasikan");
expect(!envExample.includes("FINANCE_2FA"), "konfigurasi autentikator lama masih didokumentasikan");

const migrationDir = path.join(root, "bimbelku-backend/database/migrations");
const migrations = fs.readdirSync(migrationDir).filter((name) => name.endsWith(".php")).sort();
const prefixes = new Map();
for (const name of migrations) {
  const prefix = name.match(/^\d{4}_\d{2}_\d{2}_\d{6}/)?.[0];
  if (!prefix) continue;
  const names = prefixes.get(prefix) || [];
  names.push(name);
  prefixes.set(prefix, names);
}
const duplicatePrefixes = [...prefixes.values()].filter((names) => names.length > 1);

console.log(`Checkpoint 1 lulus: ${migrations.length} migration, fondasi route/login/role/middleware/admin tunggal konsisten.`);
if (duplicatePrefixes.length) {
  console.log("Catatan migration historis dengan timestamp sama (dipertahankan agar riwayat production tidak rusak):");
  duplicatePrefixes.forEach((names) => console.log(`- ${names.join(", ")}`));
}
